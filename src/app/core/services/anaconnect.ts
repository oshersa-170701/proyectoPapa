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
}
