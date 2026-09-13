package com.anaasis.plugins.connect

import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.mediarouter.media.MediaRouteSelector
import androidx.mediarouter.media.MediaRouter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.android.gms.cast.CastMediaControlIntent
import com.google.android.gms.cast.MediaInfo
import com.google.android.gms.cast.MediaLoadRequestData
import com.google.android.gms.cast.MediaMetadata
import com.google.android.gms.cast.framework.CastContext
import com.google.android.gms.cast.framework.CastSession
import com.google.android.gms.cast.framework.SessionManagerListener

private const val TAG = "ANAasisConnect"
private const val DURACION_ESCANEO_MS = 4000L
private const val DURACION_REESCANEO_MS = 2500L

@CapacitorPlugin(name = "ANAasisConnect")
class ANAasisConnectPlugin : Plugin() {

    private var mediaRouter: MediaRouter? = null

    // Rutas Cast encontradas en el escaneo más reciente, indexadas por su routeId
    private val rutasEncontradas = LinkedHashMap<String, MediaRouter.RouteInfo>()

    private fun getSelector(): MediaRouteSelector {
        return MediaRouteSelector.Builder()
            .addControlCategory(
                CastMediaControlIntent.categoryForCast(CastMediaControlIntent.DEFAULT_MEDIA_RECEIVER_APPLICATION_ID)
            )
            .build()
    }

    private val routerCallback = object : MediaRouter.Callback() {
        override fun onRouteAdded(router: MediaRouter, route: MediaRouter.RouteInfo) {
            rutasEncontradas[route.id] = route
        }

        override fun onRouteChanged(router: MediaRouter, route: MediaRouter.RouteInfo) {
            rutasEncontradas[route.id] = route
        }

        override fun onRouteRemoved(router: MediaRouter, route: MediaRouter.RouteInfo) {
            rutasEncontradas.remove(route.id)
        }
    }

    @PluginMethod
    fun discoverDevices(call: PluginCall) {
        activity.runOnUiThread {
            try {
                // Inicializa el Cast SDK de forma perezosa la primera vez que se usa
                CastContext.getSharedInstance(context)

                val router = MediaRouter.getInstance(context)
                mediaRouter = router

                // Si venía de un escaneo anterior, quitamos el callback previo antes de re-registrar
                router.removeCallback(routerCallback)
                rutasEncontradas.clear()
                router.addCallback(getSelector(), routerCallback, MediaRouter.CALLBACK_FLAG_PERFORM_ACTIVE_SCAN)

                Handler(Looper.getMainLooper()).postDelayed({
                    // 🛠️ IMPORTANTE: NO quitamos el callback por completo, solo bajamos de
                    // escaneo activo a pasivo. Si lo quitáramos del todo, MediaRouter deja de
                    // reportar estas rutas en router.routes y speak()/emparejar() ya no las
                    // encuentra después (por eso fallaba "No se encontró esa bocina").
                    router.removeCallback(routerCallback)
                    router.addCallback(getSelector(), routerCallback, 0)

                    val devices = JSArray()
                    for (route in rutasEncontradas.values) {
                        val device = JSObject()
                        device.put("id", route.id)
                        device.put("name", route.name)
                        devices.put(device)
                    }

                    val response = JSObject()
                    response.put("devices", devices)
                    call.resolve(response)
                }, DURACION_ESCANEO_MS)
            } catch (e: Exception) {
                Log.e(TAG, "Error buscando bocinas Cast: ${e.message}")
                call.reject("No se pudo buscar bocinas (¿Google Play Services está disponible?): ${e.message}")
            }
        }
    }

    @PluginMethod
    fun speak(call: PluginCall) {
        val deviceId = call.getString("deviceId")
        val audioUrl = call.getString("audioUrl")

        if (deviceId.isNullOrEmpty() || audioUrl.isNullOrEmpty()) {
            call.reject("deviceId y audioUrl son requeridos")
            return
        }

        activity.runOnUiThread {
            try {
                val sessionManager = CastContext.getSharedInstance(context).sessionManager
                val sesionActual = sessionManager.currentCastSession

                if (sesionActual != null && sesionActual.isConnected) {
                    reproducirEnSesion(sesionActual, audioUrl, call)
                    return@runOnUiThread
                }

                val router = mediaRouter ?: MediaRouter.getInstance(context)
                mediaRouter = router

                // 📍 router.routes se vacía a los pocos segundos de terminar el escaneo activo
                // (Android deja de reportar rutas Cast para ahorrar batería). Por eso "Probar
                // bocina" fallaba con "No se encontró esa bocina" aunque discoverDevices() sí
                // la había encontrado minutos antes. Usamos primero nuestro propio caché
                // (rutasEncontradas, alimentado por el callback que dejamos siempre registrado);
                // si tampoco la tiene, hacemos un mini-reescaneo activo antes de rendirnos.
                val rutaConocida = rutasEncontradas[deviceId] ?: router.routes.firstOrNull { it.id == deviceId }

                if (rutaConocida != null) {
                    seleccionarYReproducir(rutaConocida, sessionManager, audioUrl, call)
                    return@runOnUiThread
                }

                CastContext.getSharedInstance(context)
                router.removeCallback(routerCallback)
                router.addCallback(getSelector(), routerCallback, MediaRouter.CALLBACK_FLAG_PERFORM_ACTIVE_SCAN)

                Handler(Looper.getMainLooper()).postDelayed({
                    router.removeCallback(routerCallback)
                    router.addCallback(getSelector(), routerCallback, 0)

                    val ruta = rutasEncontradas[deviceId] ?: router.routes.firstOrNull { it.id == deviceId }
                    if (ruta == null) {
                        call.reject("No se encontró esa bocina, vuelve a buscarla desde la misma red WiFi")
                    } else {
                        seleccionarYReproducir(ruta, sessionManager, audioUrl, call)
                    }
                }, DURACION_REESCANEO_MS)
            } catch (e: Exception) {
                Log.e(TAG, "Error reproduciendo en la bocina: ${e.message}")
                call.reject("Error reproduciendo en la bocina: ${e.message}")
            }
        }
    }

    private fun seleccionarYReproducir(
        ruta: MediaRouter.RouteInfo,
        sessionManager: com.google.android.gms.cast.framework.SessionManager,
        audioUrl: String,
        call: PluginCall
    ) {
        val listener = object : SessionManagerListener<CastSession> {
            override fun onSessionStarted(session: CastSession, sessionId: String) {
                sessionManager.removeSessionManagerListener(this, CastSession::class.java)
                reproducirEnSesion(session, audioUrl, call)
            }

            override fun onSessionStartFailed(session: CastSession, error: Int) {
                sessionManager.removeSessionManagerListener(this, CastSession::class.java)
                call.reject("No se pudo conectar a la bocina (código $error)")
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
    }

    private fun reproducirEnSesion(session: CastSession, audioUrl: String, call: PluginCall) {
        try {
            val mediaInfo = MediaInfo.Builder(audioUrl)
                .setStreamType(MediaInfo.STREAM_TYPE_BUFFERED)
                .setContentType("audio/mp3")
                .setMetadata(MediaMetadata(MediaMetadata.MEDIA_TYPE_MUSIC_TRACK))
                .build()

            val request = MediaLoadRequestData.Builder()
                .setMediaInfo(mediaInfo)
                .setAutoplay(true)
                .build()

            session.remoteMediaClient?.load(request)
            call.resolve()
        } catch (e: Exception) {
            Log.e(TAG, "Error cargando audio en la sesión Cast: ${e.message}")
            call.reject("Error reproduciendo en la bocina: ${e.message}")
        }
    }

    // 📍 Recordatorios en segundo plano: programa una alarma nativa (AlarmManager) que
    // dispara aunque la app esté cerrada. Habla por el teléfono y, si castId no es nulo,
    // también anuncia en la bocina Google Home (ver RecordatorioBroadcastReceiver).
    @PluginMethod
    fun scheduleBackgroundReminder(call: PluginCall) {
        val requestCode = call.getInt("requestCode")
        val texto = call.getString("texto")
        val castId = call.getString("castId")
        val hour = call.getInt("hour") ?: 8
        val minute = call.getInt("minute") ?: 0
        val intervalMinutes = call.getInt("intervalMinutes") ?: 0

        if (requestCode == null || texto.isNullOrEmpty()) {
            call.reject("requestCode y texto son requeridos")
            return
        }

        try {
            RecordatorioAlarmScheduler.programar(
                context,
                RecordatorioProgramado(requestCode, texto, castId, hour, minute, intervalMinutes)
            )
            call.resolve()
        } catch (e: Exception) {
            Log.e(TAG, "Error programando recordatorio en segundo plano: ${e.message}")
            call.reject("No se pudo programar el recordatorio en segundo plano: ${e.message}")
        }
    }

    @PluginMethod
    fun cancelBackgroundReminder(call: PluginCall) {
        val requestCode = call.getInt("requestCode")
        if (requestCode == null) {
            call.reject("requestCode es requerido")
            return
        }

        try {
            RecordatorioAlarmScheduler.cancelar(context, requestCode)
            call.resolve()
        } catch (e: Exception) {
            Log.e(TAG, "Error cancelando recordatorio en segundo plano: ${e.message}")
            call.reject("No se pudo cancelar el recordatorio en segundo plano: ${e.message}")
        }
    }
}
