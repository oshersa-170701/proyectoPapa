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
// mejor lo descartamos que reproducirlo tarde: el paciente pidió explícitamente que sea
// en tiempo real — si ya pasó, que se calle y espere al siguiente disparo, no que
// reproduzca notificaciones atrasadas cuando la bocina por fin reconecta.
private const val VIGENCIA_MAXIMA_MS = 60 * 1000L

// 📍 Corre en segundo plano (WorkManager, no depende de la app/webview) para anunciar
// el recordatorio en la bocina Google Home: pide el mp3 a generate_tts y lo castea.
// Si algo falla por red, se reintenta solo (Result.retry) con el backoff de WorkManager.
class RecordatorioCastWorker(context: Context, params: WorkerParameters) : Worker(context, params) {

    override fun doWork(): Result {
        val texto = inputData.getString("texto") ?: return Result.failure()
        val castId = inputData.getString("castId") ?: return Result.failure()
        val horaDisparo = inputData.getLong("horaDisparo", 0L)

        if (estaVencido(horaDisparo)) {
            Log.w(TAG, "Anuncio descartado por estar vencido (en tiempo real ya no aplica): $texto")
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

        // 📍 Re-chequeamos justo antes de reproducir: entre que llegamos aquí y que se pidió
        // el audio pudo pasar tiempo suficiente para que ya no valga la pena, o puede haber
        // llegado un recordatorio más nuevo que reemplazó a este (isStopped).
        if (isStopped || estaVencido(horaDisparo)) {
            Log.w(TAG, "Anuncio descartado justo antes de castear (reemplazado o vencido): $texto")
            return Result.success()
        }

        val exito = reproducirEnBocina(castId, audioUrl, horaDisparo)
        if (isStopped) return Result.success() // Reemplazado por uno más nuevo mientras casteábamos
        return if (exito) Result.success() else Result.retry()
    }

    // 📍 horaDisparo<=0 significa que este trabajo se encoló ANTES de que existiera esta
    // marca de tiempo (una versión anterior de la app, ya instalada, con reintentos
    // acumulados en la cola de WorkManager) — lo tratamos como vencido también, no como
    // "sin dato": si no, ese backlog viejo se cuela sin pasar por el control de vigencia.
    private fun estaVencido(horaDisparo: Long): Boolean {
        return horaDisparo <= 0L || System.currentTimeMillis() - horaDisparo > VIGENCIA_MAXIMA_MS
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

    private fun reproducirEnBocina(castId: String, audioUrl: String, horaDisparo: Long): Boolean {
        val context = applicationContext
        val latch = CountDownLatch(1)
        var resultado = false
        val inicio = System.currentTimeMillis()

        Handler(Looper.getMainLooper()).post {
            // 📍 Si mientras esperábamos nuestro turno en el hilo principal ya nos reemplazó
            // un recordatorio más nuevo (o ya se venció), ni siquiera intentamos conectar.
            if (isStopped || estaVencido(horaDisparo)) {
                latch.countDown()
                return@post
            }

            try {
                CastContext.getSharedInstance(context)
                val sessionManager = CastContext.getSharedInstance(context).sessionManager
                val sesionActual = sessionManager.currentCastSession

                if (sesionActual != null && sesionActual.isConnected) {
                    // 📍 Camino rápido: el BocinaForegroundService ya la tenía conectada, así
                    // que reproducimos de inmediato sin escanear ni reconectar desde cero.
                    Log.i(TAG, "Sesión ya conectada (gracias al servicio en primer plano), reproduciendo directo")
                    resultado = cargarMedia(sesionActual, audioUrl)
                    latch.countDown()
                    return@post
                }

                Log.w(TAG, "Sesión NO estaba conectada al momento de anunciar — se necesita escanear/reconectar (esto agrega ~4-15s de retraso)")

                val router = MediaRouter.getInstance(context)
                val selector = MediaRouteSelector.Builder()
                    .addControlCategory(CastMediaControlIntent.categoryForCast(CastMediaControlIntent.DEFAULT_MEDIA_RECEIVER_APPLICATION_ID))
                    .build()

                val callback = object : MediaRouter.Callback() {}
                router.addCallback(selector, callback, MediaRouter.CALLBACK_FLAG_PERFORM_ACTIVE_SCAN)

                Handler(Looper.getMainLooper()).postDelayed({
                    router.removeCallback(callback)

                    // 📍 Mismo chequeo aquí: pudieron pasar varios segundos de escaneo y, en
                    // ese lapso, llegar un recordatorio más nuevo que ya nos reemplazó.
                    if (isStopped || estaVencido(horaDisparo)) {
                        Log.w(TAG, "Anuncio cancelado a media conexión (reemplazado o vencido)")
                        latch.countDown()
                        return@postDelayed
                    }

                    val ruta = router.routes.firstOrNull { it.id == castId }
                    if (ruta == null) {
                        Log.w(TAG, "No se encontró la bocina en la red (¿sigue en la misma WiFi?)")
                        latch.countDown()
                        return@postDelayed
                    }

                    val listener = object : SessionManagerListener<CastSession> {
                        override fun onSessionStarted(session: CastSession, sessionId: String) {
                            sessionManager.removeSessionManagerListener(this, CastSession::class.java)
                            resultado = if (isStopped || estaVencido(horaDisparo)) false else cargarMedia(session, audioUrl)
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

        // 📍 Esperamos en tramos cortos (en vez de un solo await largo) para poder salir en
        // cuanto WorkManager marque este trabajo como reemplazado (isStopped) — así un
        // recordatorio viejo no se queda "vivo" reproduciéndose después de que uno nuevo ya
        // lo sustituyó.
        val limite = System.currentTimeMillis() + TIMEOUT_REPRODUCCION_S * 1000
        while (System.currentTimeMillis() < limite) {
            if (isStopped) break
            if (latch.await(200, TimeUnit.MILLISECONDS)) break
        }

        Log.i(TAG, "reproducirEnBocina terminó en ${System.currentTimeMillis() - inicio}ms (éxito=$resultado, isStopped=$isStopped)")
        return resultado && !isStopped
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
