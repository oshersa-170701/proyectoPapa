import { registerPlugin } from '@capacitor/core';

import type { ANAasisConnectPlugin } from './definitions';

const ANAasisConnect = registerPlugin<ANAasisConnectPlugin>('ANAasisConnect', {
  web: () => import('./web').then((m) => new m.ANAasisConnectWeb()),
});

export * from './definitions';
export { ANAasisConnect };
