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
export interface ANAasisConnectPlugin {
    /** Escanea ~4s la red WiFi local buscando bocinas Google Home/Nest (Cast) */
    discoverDevices(): Promise<DiscoverDevicesResult>;
    /** Le pide a una bocina Cast ya descubierta que reproduzca un mp3 por URL */
    speak(options: SpeakOptions): Promise<void>;
}
