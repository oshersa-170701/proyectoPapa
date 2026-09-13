export interface CastDeviceInfo {
    id: string;
    name: string;
}
export interface DiscoverDevicesResult {
    devices: CastDeviceInfo[];
}
export interface SpeakOptions {
    /** El id de la ruta (route) devuelto por discoverDevices() */
    deviceId: string;
    /** URL pública de un mp3 (por ejemplo, generado por generate_tts) */
    audioUrl: string;
}
export interface ScheduleBackgroundReminderOptions {
    /** Identificador único del recordatorio (mismo esquema de IDs que las notificaciones locales) */
    requestCode: number;
    /** Frase que ANAasis dirá por el teléfono (y en la bocina, si hay una emparejada) */
    texto: string;
    /** cast_id de la bocina emparejada, o null si el paciente no tiene ninguna */
    castId: string | null;
    /** Hora del día (0-23) en que debe sonar */
    hour: number;
    /** Minuto (0-59) en que debe sonar */
    minute: number;
    /**
     * Si es mayor a 0, el recordatorio se repite cada N minutos desde ahora en vez de
     * diariamente a hour:minute (usado por la opción de prueba "cada 5 minutos").
     */
    intervalMinutes?: number;
}
export interface CancelBackgroundReminderOptions {
    requestCode: number;
}
export interface ANAasisConnectPlugin {
    /** Escanea ~4s la red WiFi local buscando bocinas Google Home/Nest (Cast) */
    discoverDevices(): Promise<DiscoverDevicesResult>;
    /** Le pide a una bocina Cast ya descubierta que reproduzca un mp3 por URL */
    speak(options: SpeakOptions): Promise<void>;
    /**
     * Programa un recordatorio que habla por el teléfono (y por la bocina Google Home si
     * hay una emparejada) usando una alarma nativa de Android — sigue funcionando aunque
     * la app esté cerrada, no solo minimizada.
     */
    scheduleBackgroundReminder(options: ScheduleBackgroundReminderOptions): Promise<void>;
    /** Cancela un recordatorio en segundo plano programado con scheduleBackgroundReminder */
    cancelBackgroundReminder(options: CancelBackgroundReminderOptions): Promise<void>;
}
