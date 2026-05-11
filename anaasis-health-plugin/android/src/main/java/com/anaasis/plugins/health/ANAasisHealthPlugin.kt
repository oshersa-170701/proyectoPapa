package com.anaasis.plugins.health

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.runBlocking
import java.time.Instant
import java.time.temporal.ChronoUnit

@CapacitorPlugin(name = "ANAasisHealth")
class ANAasisHealthPlugin : Plugin() {

    @PluginMethod
    fun obtenerMediciones(call: PluginCall) {
        val client = HealthConnectClient.getOrCreate(context)
        val startTime = Instant.now().minus(24, ChronoUnit.HOURS)
        val endTime = Instant.now()
        val timeRange = TimeRangeFilter.between(startTime, endTime)

        val response = JSObject()

        // runBlocking permite ejecutar la lectura de forma síncrona para el plugin
      runBlocking {
    try {
        // Aumentamos el rango a 48 horas para asegurar que siempre pesquemos algo
        val startTime = Instant.now().minus(48, ChronoUnit.HOURS)
        val endTime = Instant.now()
        val timeRange = TimeRangeFilter.between(startTime, endTime)

        // 1. Pulso (Mejoramos la extracción)
        val pRes = client.readRecords(ReadRecordsRequest(HeartRateRecord::class, timeRange))
        if (pRes.records.isNotEmpty()) {
            val lastRecord = pRes.records.last()
            if (lastRecord.samples.isNotEmpty()) {
                response.put("pulso", lastRecord.samples.last().beatsPerMinute)
            }
        }

        // 2. Oxígeno
        val oRes = client.readRecords(ReadRecordsRequest(OxygenSaturationRecord::class, timeRange))
        if (oRes.records.isNotEmpty()) {
            response.put("oxigeno", oRes.records.last().percentage.value)
        }

        // 3. Sueño
        val sRes = client.readRecords(ReadRecordsRequest(SleepSessionRecord::class, timeRange))
        if (sRes.records.isNotEmpty()) {
            val s = sRes.records.last() // Usamos el último registro de sueño
            val mins = ChronoUnit.MINUTES.between(s.startTime, s.endTime)
            response.put("horasSueno", mins.toDouble() / 60.0)
        }

        // Si después de todo sigue vacío, ponemos ceros explícitos para que el TS no reciba null
        if (!response.has("pulso")) response.put("pulso", 0)
        if (!response.has("oxigeno")) response.put("oxigeno", 0)
        if (!response.has("horasSueno")) response.put("horasSueno", 0)

        call.resolve(response)
    } catch (e: Exception) {
        // Log para depuración en Android Studio
        android.util.Log.e("HEALTH_PLUGIN", "Error: ${e.message}")
        call.reject(e.message)
    }
}
    }

    @PluginMethod
    fun solicitarPermisos(call: PluginCall) {
        val ret = JSObject()
        ret.put("resultado", "ok")
        call.resolve(ret)
    }
}