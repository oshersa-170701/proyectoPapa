import { Injectable } from '@angular/core';
import { ANAasisConnect, CastDeviceInfo } from 'anaasis-connect-plugin';

export type CastDevice = CastDeviceInfo;

@Injectable({
  providedIn: 'root'
})
export class Anaconnect {

  /** Escanea ~4s la red WiFi local buscando bocinas Google Home/Nest (Cast) */
  async discoverDevices(): Promise<CastDevice[]> {
    try {
      const res = await ANAasisConnect.discoverDevices();
      return res?.devices || [];
    } catch (error) {
      console.error('[AnaConnect] Error buscando bocinas Cast:', error);
      return [];
    }
  }

  /** Le pide a una bocina Cast que reproduzca un mp3 por URL */
  async speak(deviceId: string, audioUrl: string): Promise<void> {
    await ANAasisConnect.speak({ deviceId, audioUrl });
  }

  /**
   * Programa un recordatorio que habla por el teléfono (y por la bocina Google Home si
   * hay una emparejada) usando una alarma nativa — sigue sonando aunque la app esté
   * cerrada, no solo minimizada. Es "best effort": si falla, no rompe el flujo de la
   * notificación local que ya se programó por separado.
   */
  async programarAnuncioSegundoPlano(opciones: {
    requestCode: number;
    texto: string;
    castId: string | null;
    hour: number;
    minute: number;
    intervalMinutes?: number;
  }): Promise<void> {
    try {
      await ANAasisConnect.scheduleBackgroundReminder(opciones);
    } catch (error) {
      console.error('[AnaConnect] Error programando recordatorio en segundo plano:', error);
    }
  }

  async cancelarAnuncioSegundoPlano(requestCode: number): Promise<void> {
    try {
      await ANAasisConnect.cancelBackgroundReminder({ requestCode });
    } catch (error) {
      console.error('[AnaConnect] Error cancelando recordatorio en segundo plano:', error);
    }
  }
}
