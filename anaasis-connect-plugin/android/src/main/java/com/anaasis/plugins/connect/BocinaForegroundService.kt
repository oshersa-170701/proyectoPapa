package com.anaasis.plugins.connect

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.mediarouter.media.MediaRouteSelector
import androidx.mediarouter.media.MediaRouter
import com.google.android.gms.cast.CastMediaControlIntent
import com.google.android.gms.cast.framework.CastContext
import com.google.android.gms.cast.framework.CastSession
import com.google.android.gms.cast.framework.SessionManager
import com.google.android.gms.cast.framework.SessionManagerListener

private const val TAG = "BocinaForegroundService"
private const val CANAL_ID = "anaasis_bocina_conectada"
private const val NOTIF_ID = 5501
private const val INTERVALO_REINTENTO_MS = 15_000L

// 📍 El paciente pidió que la bocina NO se desconecte en segundo plano: sin esto, cada
// vez que sonaba un recordatorio con el celular varios minutos en segundo plano, Android
// ya había dejado morir la sesión Cast y RecordatorioCastWorker tenía que reconectar
// desde cero (escanear ~4s + iniciar sesión), lo que se oía como "la bocina suena unos
// segundos después que el teléfono". Este servicio en primer plano (con su notificación
// fija, aceptada a propósito para lograr esto) mantiene un escaneo Cast activo y la
// sesión seleccionada mientras haya recordatorios con bocina programados, así casi
// siempre ya está conectada cuando el recordatorio dispara.
class BocinaForegroundService : Service() {

    private var castId: String? = null
    private var mediaRouter: MediaRouter? = null
    private var sessionManager: SessionManager? = null
    private val handler = Handler(Looper.getMainLooper())
    private var vigilando = false

    private val routerCallback = object : MediaRouter.Callback() {}

    private val sessionListener = object : SessionManagerListener<CastSession> {
        override fun onSessionEnded(session: CastSession, error: Int) {
            Log.w(TAG, "Sesión terminada (error=$error), reintentando conectar")
            intentarConectar()
        }
        override fun onSessionStartFailed(session: CastSession, error: Int) {
            Log.w(TAG, "Falló el inicio de sesión (error=$error), reintentando conectar")
            intentarConectar()
        }
        override fun onSessionResumeFailed(session: CastSession, error: Int) {
            Log.w(TAG, "Falló resumir sesión (error=$error), reintentando conectar")
            intentarConectar()
        }
        override fun onSessionStarted(session: CastSession, sessionId: String) {
            Log.i(TAG, "Sesión conectada correctamente (sessionId=$sessionId)")
        }
        override fun onSessionResumed(session: CastSession, wasSuspended: Boolean) {}
        override fun onSessionSuspended(session: CastSession, reason: Int) {
            Log.w(TAG, "Sesión suspendida (reason=$reason)")
        }
        override fun onSessionStarting(session: CastSession) {}
        override fun onSessionEnding(session: CastSession) {}
        override fun onSessionResuming(session: CastSession, sessionId: String) {}
    }

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIF_ID, construirNotificacion())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val nuevoCastId = intent?.getStringExtra("castId")
        if (!nuevoCastId.isNullOrEmpty()) {
            val cambioDeBocina = castId != null && castId != nuevoCastId
            castId = nuevoCastId
            if (cambioDeBocina) {
                sessionManager?.currentCastSession?.let { sessionManager?.endCurrentSession(false) }
            }
            iniciarVigilancia()
        }
        return START_STICKY
    }

    private fun iniciarVigilancia() {
        if (vigilando) {
            intentarConectar()
            return
        }
        vigilando = true

        try {
            CastContext.getSharedInstance(applicationContext)
            sessionManager = CastContext.getSharedInstance(applicationContext).sessionManager
            sessionManager?.addSessionManagerListener(sessionListener, CastSession::class.java)

            mediaRouter = MediaRouter.getInstance(applicationContext)
            val selector = MediaRouteSelector.Builder()
                .addControlCategory(CastMediaControlIntent.categoryForCast(CastMediaControlIntent.DEFAULT_MEDIA_RECEIVER_APPLICATION_ID))
                .build()
            // CALLBACK_FLAG_PERFORM_ACTIVE_SCAN mantenido todo el tiempo que viva el
            // servicio: es justo lo que evita que router.routes se vacíe (esa fue la
            // causa del bug "No se encontró esa bocina" en otras partes del plugin).
            mediaRouter?.addCallback(selector, routerCallback, MediaRouter.CALLBACK_FLAG_PERFORM_ACTIVE_SCAN)
        } catch (e: Exception) {
            Log.e(TAG, "Error iniciando vigilancia de bocina: ${e.message}")
        }

        intentarConectar()
    }

    private fun intentarConectar() {
        val id = castId ?: return
        handler.removeCallbacksAndMessages(null)

        val sesionActual = sessionManager?.currentCastSession
        if (sesionActual != null) {
            if (sesionActual.isConnected) {
                Log.i(TAG, "intentarConectar: ya conectada, no hago nada")
                return // Ya conectada, nada que hacer hasta que se caiga (onSessionEnded)
            }
            // 📍 BUG que encontramos: antes, aunque ya hubiera una sesión en proceso de
            // conectar (seleccionada pero sin terminar el handshake todavía), volvíamos a
            // llamar ruta.select() cada 15s de todos modos — eso reinicia el intento de
            // conexión en curso una y otra vez, sin dejarlo terminar nunca. Por eso tardaba
            // tanto en hablar aunque estuviera en la misma red: nunca se le daba tiempo de
            // completar la conexión. Ahora, si ya hay una sesión en curso, solo esperamos.
            Log.i(TAG, "intentarConectar: hay una sesión en curso conectando, espero sin re-seleccionar")
            handler.postDelayed({ intentarConectar() }, INTERVALO_REINTENTO_MS)
            return
        }

        val ruta = mediaRouter?.routes?.firstOrNull { it.id == id }
        if (ruta != null) {
            Log.i(TAG, "intentarConectar: ruta encontrada, seleccionando (${ruta.name})")
            try {
                ruta.select()
            } catch (e: Exception) {
                Log.w(TAG, "No se pudo seleccionar la ruta de la bocina: ${e.message}")
            }
        } else {
            Log.w(TAG, "intentarConectar: la bocina no aparece todavía en router.routes (${mediaRouter?.routes?.size ?: 0} rutas visibles)")
        }

        // La bocina puede tardar en aparecer en la red (o seguir sin estarlo): reintentamos
        // periódicamente mientras el servicio siga vivo, en vez de darnos por vencidos.
        handler.postDelayed({ intentarConectar() }, INTERVALO_REINTENTO_MS)
    }

    private fun construirNotificacion(): Notification {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (nm.getNotificationChannel(CANAL_ID) == null) {
                val canal = NotificationChannel(CANAL_ID, "Bocina conectada", NotificationManager.IMPORTANCE_MIN)
                canal.setShowBadge(false)
                nm.createNotificationChannel(canal)
            }
        }

        val smallIconRes = resources.getIdentifier("ic_stat_anaasis", "drawable", packageName)

        return NotificationCompat.Builder(this, CANAL_ID)
            .setContentTitle("ANAasis")
            .setContentText("Manteniendo tu bocina conectada para tus recordatorios de medicamento.")
            .setSmallIcon(if (smallIconRes != 0) smallIconRes else applicationInfo.icon)
            .setColor(android.graphics.Color.parseColor("#00A0AB"))
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .build()
    }

    override fun onDestroy() {
        try {
            mediaRouter?.removeCallback(routerCallback)
            sessionManager?.removeSessionManagerListener(sessionListener, CastSession::class.java)
        } catch (e: Exception) {
            Log.w(TAG, "Error limpiando al detener el servicio: ${e.message}")
        }
        handler.removeCallbacksAndMessages(null)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        fun iniciar(context: Context, castId: String) {
            val intent = Intent(context, BocinaForegroundService::class.java).putExtra("castId", castId)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "No se pudo iniciar el servicio de bocina: ${e.message}")
            }
        }

        fun detener(context: Context) {
            try {
                context.stopService(Intent(context, BocinaForegroundService::class.java))
            } catch (e: Exception) {
                Log.w(TAG, "Error deteniendo el servicio de bocina: ${e.message}")
            }
        }
    }
}
