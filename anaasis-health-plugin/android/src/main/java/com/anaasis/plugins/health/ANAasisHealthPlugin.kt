package com.anaasis.plugins.health

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord // 👈 🚀 CAMBIO: Importamos Calorías Activas
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.runBlocking
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.temporal.ChronoUnit

@CapacitorPlugin(name = "ANAasisHealth")
class ANAasisHealthPlugin : Plugin() {

    @PluginMethod
    fun obtenerMediciones(call: PluginCall) {
        val client = HealthConnectClient.getOrCreate(context)
        val response = JSObject()

        runBlocking {
            try {
                // 🕒 Rango 1: Ventana de 48 horas (Excelente para Pulso, Oxígeno y Sueño)
                val startTime48h = Instant.now().minus(48, ChronoUnit.HOURS)
                val endTime = Instant.now()
                val timeRange48h = TimeRangeFilter.between(startTime48h, endTime)

                // 🕒 Rango 2: Filtro estricto del DÍA DE HOY (Desde las 00:00:00 de hoy)
                // Usamos la zona horaria del dispositivo para reiniciar los pasos limpiamente a la medianoche
                val zonaLocal = ZoneId.systemDefault()
                val hoyInicio = ZonedDateTime.now(zonaLocal).toLocalDate().atStartOfDay(zonaLocal).toInstant()
                val timeRangeHoy = TimeRangeFilter.between(hoyInicio, endTime)

                // 1. Pulso (48h)
                val pRes = client.readRecords(ReadRecordsRequest(HeartRateRecord::class, timeRange48h))
                if (pRes.records.isNotEmpty()) {
                    val lastRecord = pRes.records.last()
                    if (lastRecord.samples.isNotEmpty()) {
                        response.put("pulso", lastRecord.samples.last().beatsPerMinute)
                    }
                }

                // 2. Oxígeno (48h)
                val oRes = client.readRecords(ReadRecordsRequest(OxygenSaturationRecord::class, timeRange48h))
                if (oRes.records.isNotEmpty()) {
                    response.put("oxigeno", oRes.records.last().percentage.value)
                }

                // 3. Sueño (48h)
                val sRes = client.readRecords(ReadRecordsRequest(SleepSessionRecord::class, timeRange48h))
                if (sRes.records.isNotEmpty()) {
                    val s = sRes.records.last()
                    val mins = ChronoUnit.MINUTES.between(s.startTime, s.endTime)
                    response.put("horasSueno", mins.toDouble() / 60.0)
                }

                // 4. Pasos (Filtro del día de hoy: inicia en 0 a la medianoche)
                val stepsRes = client.readRecords(ReadRecordsRequest(StepsRecord::class, timeRangeHoy))
                if (stepsRes.records.isNotEmpty()) {
                    val totalSteps = stepsRes.records.sumOf { it.count }
                    response.put("pasos", totalSteps.toInt())
                }

                // 5. Calorías Activas Quemadas (Filtro del día de hoy: mapeado con Nothing X / Google Fit)
                val caloriesRes = client.readRecords(ReadRecordsRequest(ActiveCaloriesBurnedRecord::class, timeRangeHoy))
                if (caloriesRes.records.isNotEmpty()) {
                    val totalCalories = caloriesRes.records.sumOf { it.energy.inKilocalories }
                    response.put("calorias", totalCalories)
                }

                // Fallbacks explícitos si no se detectan datos
                if (!response.has("pulso")) response.put("pulso", 0)
                if (!response.has("oxigeno")) response.put("oxigeno", 0)
                if (!response.has("horasSueno")) response.put("horasSueno", 0.0)
                if (!response.has("pasos")) response.put("pasos", 0)
                if (!response.has("calorias")) response.put("calorias", 0.0)

                call.resolve(response)
            } catch (e: Exception) {
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