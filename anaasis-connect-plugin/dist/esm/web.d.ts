import { WebPlugin } from '@capacitor/core';
import type { ANAasisConnectPlugin, DiscoverDevicesResult, SpeakOptions } from './definitions';
export declare class ANAasisConnectWeb extends WebPlugin implements ANAasisConnectPlugin {
    discoverDevices(): Promise<DiscoverDevicesResult>;
    speak(_options: SpeakOptions): Promise<void>;
}
