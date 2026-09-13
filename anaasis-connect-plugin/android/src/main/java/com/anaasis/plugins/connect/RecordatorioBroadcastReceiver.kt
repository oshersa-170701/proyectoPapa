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
        var tts: TextToSpeech? = null
        tts = TextToSpeech(appContext) { status ->
            if (status == TextToSpeech.SUCCESS) {
                tts?.language = Locale("es", "MX")
                tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {}
                    override fun onDone(utteranceId: String?) {
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

        if (!castId.isNullOrEmpty()) {
            val datos = Data.Builder()
                .putString("texto", texto)
                .putString("castId", castId)
                .build()
            // ⏱️ Retrasamos el anuncio en la bocina para que no se empalme con la voz
            // nativa del teléfono, que empieza a hablar de inmediato (arriba).
            val solicitud = OneTimeWorkRequestBuilder<RecordatorioCastWorker>()
                .setInputData(datos)
                .setInitialDelay(RETRASO_ANUNCIO_BOCINA_SEGUNDOS, TimeUnit.SECONDS)
                .build()
            WorkManager.getInstance(appContext).enqueue(solicitud)
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

    private fun mostrarNotificacionNativa(context: Context, requestCode: Int, texto: String) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val canalExistente = nm.getNotificationChannel(CANAL_PRUEBA_ID)
            if (canalExistente == null) {
                val canal = NotificationChannel(
                    CANAL_PRUEBA_ID,
                    "Recordatorios de prueba",
                    NotificationManager.IMPORTANCE_HIGH
                )
                nm.createNotificationChannel(canal)
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
            .setPriority(NotificationCompat.PRIORITY_HIGH)

        if (largeIconRes != 0) {
            builder.setLargeIcon(android.graphics.BitmapFactory.decodeResource(context.resources, largeIconRes))
        }

        val notificacion = builder.build()

        try {
            nm.notify(requestCode, notificacion)
        } catch (e: SecurityException) {
            Log.w(TAG, "Sin permiso de notificaciones, no se pudo mostrar la de prueba: ${e.message}")
        }
    }
}
