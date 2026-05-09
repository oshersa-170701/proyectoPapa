import { registerPlugin } from '@capacitor/core';

import type { ANAasisHealthPlugin } from './definitions';

const ANAasisHealth = registerPlugin<ANAasisHealthPlugin>('ANAasisHealth', {
  web: () => import('./web').then((m) => new m.ANAasisHealthWeb()),
});

export * from './definitions';
export { ANAasisHealth };
