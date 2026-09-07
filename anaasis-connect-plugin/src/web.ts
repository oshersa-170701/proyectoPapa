import { WebPlugin } from '@capacitor/core';

import type { ANAasisConnectPlugin, DiscoverDevicesResult, SpeakOptions } from './definitions';

export class ANAasisConnectWeb extends WebPlugin implements ANAasisConnectPlugin {
  async discoverDevices(): Promise<DiscoverDevicesResult> {
    console.warn('[ANAasisConnect] Google Cast solo está disponible en Android nativo.');
    return { devices: [] };
  }

  async speak(_options: SpeakOptions): Promise<void> {
    throw this.unimplemented('Google Cast no está disponible en la web.');
  }
}
