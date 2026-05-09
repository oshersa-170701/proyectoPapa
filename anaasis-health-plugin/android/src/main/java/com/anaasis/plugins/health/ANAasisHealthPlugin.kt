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
                // 1. Pulso
                val pRes = client.readRecords(
                    ReadRecordsRequest(HeartRateRecord::class, timeRange)
                )
                if (pRes.records.isNotEmpty()) {
                    response.put("pulso", pRes.records.last().samples[0].beatsPerMinute)
                }

                // 2. Oxígeno
                val oRes = client.readRecords(
                    ReadRecordsRequest(OxygenSaturationRecord::class, timeRange)
                )
                if (oRes.records.isNotEmpty()) {
                    response.put("oxigeno", oRes.records.last().percentage.value)
                }

                // 3. Sueño
                val sRes = client.readRecords(
                    ReadRecordsRequest(SleepSessionRecord::class, timeRange)
                )
                if (sRes.records.isNotEmpty()) {
                    val s = sRes.records[0]
                    val mins = ChronoUnit.MINUTES.between(s.startTime, s.endTime)
                    response.put("horasSueno", mins.toDouble() / 60.0)
                }

                call.resolve(response)
            } catch (e: Exception) {
                call.reject("Error de hardware real: ${e.message}")
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