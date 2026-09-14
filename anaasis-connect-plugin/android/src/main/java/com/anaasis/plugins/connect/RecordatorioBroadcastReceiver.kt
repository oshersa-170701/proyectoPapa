package com.anaasis.plugins.connect

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import java.util.Locale
import java.util.concurrent.TimeUnit

private const val CANAL_PRUEBA_ID = "anaasis_recordatorios_prueba"

private const val TAG = "RecordatorioReceiver"

// Tiempo estimado para que el teléfono termine de hablar la frase corta del
// recordatorio, antes de que empiece a sonar en la bocina (evita que se escuchen
// las dos voces encimadas).
private const val RETRASO_ANUNCIO_BOCINA_SEGUNDOS = 6L

// 📍 Se dispara desde AlarmManager aunque la app esté cerrada. Habla de inmediato con
// la voz nativa del teléfono (no depende de internet ni de que el webview esté vivo)
// y, si hay una bocina Google Home emparejada, delega el anuncio por Cast a un
// WorkManager Worker (porque necesita red para pedir el audio a generate_tts).
class RecordatorioBroadcastReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val requestCode = intent.getIntExtra("requestCode", -1)
        val texto = intent.getStringExtra("texto") ?: return
        val castId = intent.getStringExtra("castId")
        val hour = intent.getIntExtra("hour", 8)
        val minute = intent.getIntExtra("minute", 0)
        val intervaloMinutos = intent.getIntExtra("intervaloMinutos", 0)

        Log.i(TAG, "Disparando recordatorio en segundo plano: $texto (cast=$castId, intervaloMinutos=$intervaloMinutos)")

        val appContext = context.applicationContext
        val pendingResult = goAsync()
        val horaInicioVoz = System.currentTimeMillis()

        // 📍 Camino rápido: si BocinaForegroundService está corriendo (hay recordatorios
        // con bocina activos), ya tiene un motor TextToSpeech precargado y enlazado, así
        // que hablamos de inmediato sin esperar el bind. Si no está disponible (por
        // ejemplo, no hay bocina emparejada), caemos al camino de siempre.
        val usoMotorCompartido = BocinaForegroundService.hablarConTtsCompartido(
            texto,
            "anaasis_recordatorio_$requestCode"
        ) {
            Log.i(TAG, "Voz del teléfono (motor compartido) terminó en ${System.currentTimeMillis() - horaInicioVoz}ms")
            pendingResult.finish()
        }

        if (usoMotorCompartido) {
            Log.i(TAG, "Hablando con el motor TTS precargado (sin esperar bind)")
        } else {
            Log.w(TAG, "Motor TTS compartido no disponible, creando uno nuevo (esto agrega el retraso del bind)")
            var tts: TextToSpeech? = null
            tts = TextToSpeech(appContext) { status ->
                if (status == TextToSpeech.SUCCESS) {
                    tts?.language = Locale("es", "MX")
                    tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                        override fun onStart(utteranceId: String?) {}
                        override fun onDone(utteranceId: String?) {
                            Log.i(TAG, "Voz del teléfono (motor nuevo) terminó en ${System.currentTimeMillis() - horaInicioVoz}ms")
                            tts?.shutdown()
                            pendingResult.finish()
                        }

                        @Deprecated("Deprecated in Java")
                        override fun onError(utteranceId: String?) {
                            tts?.shutdown()
                            pendingResult.finish()
                        }
                    })
                    tts?.speak(texto, TextToSpeech.QUEUE_FLUSH, null, "anaasis_recordatorio_$requestCode")
                } else {
                    pendingResult.finish()
                }
            }
        }

        if (!castId.isNullOrEmpty()) {
            val datos = Data.Builder()
                .putString("texto", texto)
                .putString("castId", castId)
                .putLong("horaDisparo", System.currentTimeMillis())
                .build()
            // ⏱️ Retrasamos el anuncio en la bocina para que no se empalme con la voz
            // nativa del teléfono, que empieza a hablar de inmediato (arriba).
            val solicitud = OneTimeWorkRequestBuilder<RecordatorioCastWorker>()
                .setInputData(datos)
                .setInitialDelay(RETRASO_ANUNCIO_BOCINA_SEGUNDOS, TimeUnit.SECONDS)
                .build()
            // 📍 enqueueUniqueWork + REPLACE: si el recordatorio anterior de ESTE MISMO
            // slot (ej. cada 5 min en modo prueba) seguía reintentando por no encontrar la
            // bocina, lo cancelamos antes de programar el nuevo. Sin esto, varios intentos
            // viejos se acumulaban reintentando con el backoff de WorkManager y, cuando la
            // bocina volvía a la red, todos reproducían su audio casi al mismo tiempo —
            // eso era lo que se escuchaba como "las voces cruzadas".
            WorkManager.getInstance(appContext).enqueueUniqueWork(
                "recordatorio_bocina_$requestCode",
                ExistingWorkPolicy.REPLACE,
                solicitud
            )
        }

        // 🧪 Modo de prueba (repetición cada N minutos, ej. cada 5 min): no pasa por
        // @capacitor/local-notifications (ese plugin no soporta intervalos menores a
        // una hora), así que mostramos nosotros mismos una notificación nativa.
        if (intervaloMinutos > 0) {
            mostrarNotificacionNativa(appContext, requestCode, texto)
        }

        // Los alarmas de AlarmManager son de un solo disparo: re-programamos el siguiente
        // (mañana a la misma hora, o en N minutos si es modo de prueba) para que el
        // recordatorio siga repitiéndose.
        if (requestCode != -1) {
            RecordatorioAlarmScheduler.armarAlarma(
                appContext,
                RecordatorioProgramado(requestCode, texto, castId, hour, minute, intervaloMinutos)
            )
        }
    }

    // 📍 Instrumentado a propósito: el paciente reporta que la voz de prueba suena cada
    // vez, pero la notificación visual a veces no aparece ni siquiera en la barra — eso
    // significa que nm.notify() no se está completando (o ni se está llamando), y sin
    // logs no podemos ver por qué. Envolvemos TODO el método (no solo notify) para
    // capturar cualquier excepción, y dejamos un log de éxito explícito para confirmar
    // cuándo sí se completa.
    private fun mostrarNotificacionNativa(context: Context, requestCode: Int, texto: String) {
        try {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val notificacionesHabilitadas = androidx.core.app.NotificationManagerCompat.from(context).areNotificationsEnabled()
            Log.i(TAG, "mostrarNotificacionNativa: notificacionesHabilitadas=$notificacionesHabilitadas requestCode=$requestCode")

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val canalExistente = nm.getNotificationChannel(CANAL_PRUEBA_ID)
                if (canalExistente == null) {
                    val canal = NotificationChannel(
                        CANAL_PRUEBA_ID,
                        "Recordatorios de prueba",
                        NotificationManager.IMPORTANCE_HIGH
                    )
                    nm.createNotificationChannel(canal)
                    Log.i(TAG, "Canal '$CANAL_PRUEBA_ID' creado (no existía)")
                } else {
                    Log.i(TAG, "Canal '$CANAL_PRUEBA_ID' ya existía con importance=${canalExistente.importance}")
                }
            }

            // 📍 El ícono de launcher (adaptive, a color) se ve casi invisible en la barra de
            // estado porque Android solo toma su canal alfa. Usamos un ícono propio de
            // silueta blanca (ic_stat_anaasis) generado a partir del logo, con el ícono a
            // color (ic_notification_large) para la vista expandida.
            val smallIconRes = context.resources.getIdentifier("ic_stat_anaasis", "drawable", context.packageName)
            val largeIconRes = context.resources.getIdentifier("ic_notification_large", "drawable", context.packageName)

            val builder = NotificationCompat.Builder(context, CANAL_PRUEBA_ID)
                .setContentTitle("Prueba de recordatorio")
                .setContentText(texto)
                .setSmallIcon(if (smallIconRes != 0) smallIconRes else context.applicationInfo.icon)
                .setColor(android.graphics.Color.parseColor("#00A0AB"))
                .setAutoCancel(true)
                .setWhen(System.currentTimeMillis())
                .setShowWhen(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)

            if (largeIconRes != 0) {
                try {
                    builder.setLargeIcon(android.graphics.BitmapFactory.decodeResource(context.resources, largeIconRes))
                } catch (e: Exception) {
                    Log.w(TAG, "No se pudo decodificar el ícono grande, se omite: ${e.message}")
                }
            }

            nm.notify(requestCode, builder.build())
            Log.i(TAG, "Notificación de prueba mostrada OK, id=$requestCode")
        } catch (e: Exception) {
            Log.e(TAG, "FALLÓ mostrarNotificacionNativa (id=$requestCode): ${e.javaClass.simpleName}: ${e.message}", e)
        }
    }
}
