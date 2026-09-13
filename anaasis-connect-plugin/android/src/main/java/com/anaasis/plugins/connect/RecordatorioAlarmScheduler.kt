package com.anaasis.plugins.connect

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

data class RecordatorioProgramado(
    val requestCode: Int,
    val texto: String,
    val castId: String?,
    val hour: Int,
    val minute: Int,
    // Si es > 0, el recordatorio se repite cada N minutos desde ahora (modo de prueba)
    // en vez de diariamente a hour:minute (modo normal, cuando vale 0).
    val intervaloMinutos: Int = 0
)

// 📍 Programa recordatorios que hablan por el teléfono (y castean a la bocina Google
// Home si hay una emparejada) usando AlarmManager directamente, sin depender de que
// el proceso de la app/webview siga vivo. Persistimos la lista en SharedPreferences
// para poder re-armar todas las alarmas si el teléfono se reinicia (AlarmManager las
// borra en cada reinicio).
object RecordatorioAlarmScheduler {
    private const val PREFS = "anaasis_recordatorios_bg"
    private const val KEY_LISTA = "lista"

    fun programar(context: Context, recordatorio: RecordatorioProgramado) {
        guardarEnPrefs(context, recordatorio)
        armarAlarma(context, recordatorio)
        actualizarServicioBocina(context)
    }

    fun cancelar(context: Context, requestCode: Int) {
        quitarDePrefs(context, requestCode)
        val pendingIntent = crearPendingIntent(context, RecordatorioProgramado(requestCode, "", null, 0, 0))
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(pendingIntent)
        actualizarServicioBocina(context)
    }

    fun reprogramarTodosDespuesDeReinicio(context: Context) {
        for (r in leerDePrefs(context)) {
            armarAlarma(context, r)
        }
        actualizarServicioBocina(context)
    }

    // 📍 El servicio en primer plano que mantiene la bocina conectada solo debe existir
    // mientras de verdad haya algún recordatorio activo que la use — si no, es batería
    // desperdiciada y una notificación fija sin ningún propósito.
    private fun actualizarServicioBocina(context: Context) {
        val castId = leerDePrefs(context).firstOrNull { !it.castId.isNullOrEmpty() }?.castId
        if (castId != null) {
            BocinaForegroundService.iniciar(context, castId)
        } else {
            BocinaForegroundService.detener(context)
        }
    }

    fun armarAlarma(context: Context, r: RecordatorioProgramado) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pendingIntent = crearPendingIntent(context, r)
        val triggerAtMillis = if (r.intervaloMinutos > 0) {
            System.currentTimeMillis() + r.intervaloMinutos * 60_000L
        } else {
            proximaOcurrencia(r.hour, r.minute)
        }

        // setAndAllowWhileIdle (no exact): suficiente precisión para recordatorios de
        // medicamentos y no requiere el permiso especial SCHEDULE_EXACT_ALARM en Android 13+.
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
    }

    private fun proximaOcurrencia(hour: Int, minute: Int): Long {
        val ahora = Calendar.getInstance()
        val objetivo = Calendar.getInstance()
        objetivo.set(Calendar.HOUR_OF_DAY, hour)
        objetivo.set(Calendar.MINUTE, minute)
        objetivo.set(Calendar.SECOND, 0)
        objetivo.set(Calendar.MILLISECOND, 0)
        if (objetivo.timeInMillis <= ahora.timeInMillis) {
            objetivo.add(Calendar.DAY_OF_YEAR, 1)
        }
        return objetivo.timeInMillis
    }

    private fun crearPendingIntent(context: Context, r: RecordatorioProgramado): PendingIntent {
        val intent = Intent(context, RecordatorioBroadcastReceiver::class.java).apply {
            putExtra("requestCode", r.requestCode)
            putExtra("texto", r.texto)
            putExtra("castId", r.castId)
            putExtra("hour", r.hour)
            putExtra("minute", r.minute)
            putExtra("intervaloMinutos", r.intervaloMinutos)
        }
        return PendingIntent.getBroadcast(
            context, r.requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun leerDePrefs(context: Context): List<RecordatorioProgramado> {
        val json = prefs(context).getString(KEY_LISTA, "[]") ?: "[]"
        val arr = JSONArray(json)
        val lista = mutableListOf<RecordatorioProgramado>()
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            lista.add(
                RecordatorioProgramado(
                    requestCode = o.getInt("requestCode"),
                    texto = o.getString("texto"),
                    castId = if (o.isNull("castId")) null else o.getString("castId"),
                    hour = o.getInt("hour"),
                    minute = o.getInt("minute"),
                    intervaloMinutos = o.optInt("intervaloMinutos", 0)
                )
            )
        }
        return lista
    }

    private fun guardarEnPrefs(context: Context, r: RecordatorioProgramado) {
        val lista = leerDePrefs(context).filter { it.requestCode != r.requestCode }.toMutableList()
        lista.add(r)
        escribirPrefs(context, lista)
    }

    private fun quitarDePrefs(context: Context, requestCode: Int) {
        val lista = leerDePrefs(context).filter { it.requestCode != requestCode }
        escribirPrefs(context, lista)
    }

    private fun escribirPrefs(context: Context, lista: List<RecordatorioProgramado>) {
        val arr = JSONArray()
        for (r in lista) {
            val o = JSONObject()
            o.put("requestCode", r.requestCode)
            o.put("texto", r.texto)
            o.put("castId", r.castId)
            o.put("hour", r.hour)
            o.put("minute", r.minute)
            o.put("intervaloMinutos", r.intervaloMinutos)
            arr.put(o)
        }
        prefs(context).edit().putString(KEY_LISTA, arr.toString()).apply()
    }
}
