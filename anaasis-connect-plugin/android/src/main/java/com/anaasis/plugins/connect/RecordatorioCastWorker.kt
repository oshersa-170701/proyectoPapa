package com.anaasis.plugins.connect

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.mediarouter.media.MediaRouteSelector
import androidx.mediarouter.media.MediaRouter
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.google.android.gms.cast.CastMediaControlIntent
import com.google.android.gms.cast.MediaInfo
import com.google.android.gms.cast.MediaLoadRequestData
import com.google.android.gms.cast.MediaMetadata
import com.google.android.gms.cast.framework.CastContext
import com.google.android.gms.cast.framework.CastSession
import com.google.android.gms.cast.framework.SessionManagerListener
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

private const val TAG = "RecordatorioCastWorker"
private const val ENDPOINT = "https://angelesmedic.com.mx/crm/api/anaasis.php"
private const val API_KEY = "ANAASIS_2026"
private const val DURACION_ESCANEO_MS = 4000L
private const val TIMEOUT_REPRODUCCION_S = 15L

// 📍 Si por reintentos de red (Result.retry) un anuncio queda pendiente más de esto,
// mejor lo descartamos que reproducirlo tarde: un recordatorio de "hace rato" solo
// confundiría al paciente y, peor, se empalmaría con el siguiente que ya sea vigente.
private const val VIGENCIA_MAXIMA_MS = 3 * 60 * 1000L

// 📍 Corre en segundo plano (WorkManager, no depende de la app/webview) para anunciar
// el recordatorio en la bocina Google Home: pide el mp3 a generate_tts y lo castea.
// Si algo falla por red, se reintenta solo (Result.retry) con el backoff de WorkManager.
class RecordatorioCastWorker(context: Context, params: WorkerParameters) : Worker(context, params) {

    override fun doWork(): Result {
        val texto = inputData.getString("texto") ?: return Result.failure()
        val castId = inputData.getString("castId") ?: return Result.failure()

        val horaDisparo = inputData.getLong("horaDisparo", 0L)
        if (horaDisparo > 0L && System.currentTimeMillis() - horaDisparo > VIGENCIA_MAXIMA_MS) {
            Log.w(TAG, "Anuncio descartado por estar vencido (reintentos acumulados): $texto")
            return Result.success()
        }

        val audioUrl = try {
            pedirAudioTts(texto)
        } catch (e: Exception) {
            Log.e(TAG, "Error pidiendo audio TTS: ${e.message}")
            return Result.retry()
        }

        if (audioUrl == null) {
            Log.w(TAG, "generate_tts no devolvió audio_url")
            return Result.failure()
        }

        val exito = reproducirEnBocina(castId, audioUrl)
        return if (exito) Result.success() else Result.retry()
    }

    private fun pedirAudioTts(texto: String): String? {
        val url = URL(ENDPOINT)
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
        conn.doOutput = true
        conn.connectTimeout = 15000
        conn.readTimeout = 20000

        val body = JSONObject().apply {
            put("action", "generate_tts")
            put("api_key", API_KEY)
            put("text", texto)
        }

        OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { it.write(body.toString()) }

        val code = conn.responseCode
        val stream = if (code in 200..299) conn.inputStream else conn.errorStream
        val respuesta = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
        conn.disconnect()

        if (respuesta.isBlank()) return null
        val json = JSONObject(respuesta)
        if (!json.optBoolean("success", false)) return null
        return json.optString("audio_url").takeIf { it.isNotBlank() }
    }

    private fun reproducirEnBocina(castId: String, audioUrl: String): Boolean {
        val context = applicationContext
        val latch = CountDownLatch(1)
        var resultado = false

        Handler(Looper.getMainLooper()).post {
            try {
                CastContext.getSharedInstance(context)
                val sessionManager = CastContext.getSharedInstance(context).sessionManager
                val sesionActual = sessionManager.currentCastSession

                if (sesionActual != null && sesionActual.isConnected) {
                    resultado = cargarMedia(sesionActual, audioUrl)
                    latch.countDown()
                    return@post
                }

                val router = MediaRouter.getInstance(context)
                val selector = MediaRouteSelector.Builder()
                    .addControlCategory(CastMediaControlIntent.categoryForCast(CastMediaControlIntent.DEFAULT_MEDIA_RECEIVER_APPLICATION_ID))
                    .build()

                val callback = object : MediaRouter.Callback() {}
                router.addCallback(selector, callback, MediaRouter.CALLBACK_FLAG_PERFORM_ACTIVE_SCAN)

                Handler(Looper.getMainLooper()).postDelayed({
                    val ruta = router.routes.firstOrNull { it.id == castId }
                    router.removeCallback(callback)

                    if (ruta == null) {
                        Log.w(TAG, "No se encontró la bocina en la red (¿sigue en la misma WiFi?)")
                        latch.countDown()
                        return@postDelayed
                    }

                    val listener = object : SessionManagerListener<CastSession> {
                        override fun onSessionStarted(session: CastSession, sessionId: String) {
                            sessionManager.removeSessionManagerListener(this, CastSession::class.java)
                            resultado = cargarMedia(session, audioUrl)
                            latch.countDown()
                        }

                        override fun onSessionStartFailed(session: CastSession, error: Int) {
                            sessionManager.removeSessionManagerListener(this, CastSession::class.java)
                            latch.countDown()
                        }

                        override fun onSessionEnded(session: CastSession, error: Int) {}
                        override fun onSessionResumed(session: CastSession, wasSuspended: Boolean) {}
                        override fun onSessionResumeFailed(session: CastSession, error: Int) {}
                        override fun onSessionSuspended(session: CastSession, reason: Int) {}
                        override fun onSessionStarting(session: CastSession) {}
                        override fun onSessionEnding(session: CastSession) {}
                        override fun onSessionResuming(session: CastSession, sessionId: String) {}
                    }
                    sessionManager.addSessionManagerListener(listener, CastSession::class.java)
                    ruta.select()
                }, DURACION_ESCANEO_MS)
            } catch (e: Exception) {
                Log.e(TAG, "Error casteando en segundo plano: ${e.message}")
                latch.countDown()
            }
        }

        latch.await(TIMEOUT_REPRODUCCION_S, TimeUnit.SECONDS)
        return resultado
    }

    private fun cargarMedia(session: CastSession, audioUrl: String): Boolean {
        return try {
            val mediaInfo = MediaInfo.Builder(audioUrl)
                .setStreamType(MediaInfo.STREAM_TYPE_BUFFERED)
                .setContentType("audio/mp3")
                .setMetadata(MediaMetadata(MediaMetadata.MEDIA_TYPE_MUSIC_TRACK))
                .build()
            val request = MediaLoadRequestData.Builder().setMediaInfo(mediaInfo).setAutoplay(true).build()
            session.remoteMediaClient?.load(request)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error cargando audio en sesión Cast: ${e.message}")
            false
        }
    }
}
