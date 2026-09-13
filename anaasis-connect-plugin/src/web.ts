import { WebPlugin } from '@capacitor/core';

import type {
  ANAasisConnectPlugin,
  DiscoverDevicesResult,
  SpeakOptions,
  ScheduleBackgroundReminderOptions,
  CancelBackgroundReminderOptions
} from './definitions';

export class ANAasisConnectWeb extends WebPlugin implements ANAasisConnectPlugin {
  async discoverDevices(): Promise<DiscoverDevicesResult> {
    console.warn('[ANAasisConnect] Google Cast solo está disponible en Android nativo.');
    return { devices: [] };
  }

  async speak(_options: SpeakOptions): Promise<void> {
    throw this.unimplemented('Google Cast no está disponible en la web.');
  }

  async scheduleBackgroundReminder(_options: ScheduleBackgroundReminderOptions): Promise<void> {
    console.warn('[ANAasisConnect] Los recordatorios en segundo plano solo están disponibles en Android nativo.');
  }

  async cancelBackgroundReminder(_options: CancelBackgroundReminderOptions): Promise<void> {
    console.warn('[ANAasisConnect] Los recordatorios en segundo plano solo están disponibles en Android nativo.');
  }
}
