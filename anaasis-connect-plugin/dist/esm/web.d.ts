import { WebPlugin } from '@capacitor/core';
import type { ANAasisConnectPlugin, DiscoverDevicesResult, SpeakOptions, ScheduleBackgroundReminderOptions, CancelBackgroundReminderOptions } from './definitions';
export declare class ANAasisConnectWeb extends WebPlugin implements ANAasisConnectPlugin {
    discoverDevices(): Promise<DiscoverDevicesResult>;
    speak(_options: SpeakOptions): Promise<void>;
    scheduleBackgroundReminder(_options: ScheduleBackgroundReminderOptions): Promise<void>;
    cancelBackgroundReminder(_options: CancelBackgroundReminderOptions): Promise<void>;
}
