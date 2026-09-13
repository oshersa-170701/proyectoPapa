package com.anaasis.plugins.connect

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// 📍 AlarmManager borra todas las alarmas al reiniciar el teléfono. Este receiver
// vuelve a armar los recordatorios en segundo plano que estaban guardados.
class RecordatorioBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            RecordatorioAlarmScheduler.reprogramarTodosDespuesDeReinicio(context.applicationContext)
        }
    }
}
