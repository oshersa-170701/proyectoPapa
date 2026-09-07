import { registerPlugin } from '@capacitor/core';
const ANAasisConnect = registerPlugin('ANAasisConnect', {
    web: () => import('./web').then((m) => new m.ANAasisConnectWeb()),
});
export * from './definitions';
export { ANAasisConnect };
//# sourceMappingURL=index.js.map