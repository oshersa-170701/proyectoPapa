import { WebPlugin } from '@capacitor/core';
export class ANAasisConnectWeb extends WebPlugin {
    async discoverDevices() {
        console.warn('[ANAasisConnect] Google Cast solo está disponible en Android nativo.');
        return { devices: [] };
    }
    async speak(_options) {
        throw this.unimplemented('Google Cast no está disponible en la web.');
    }
}
//# sourceMappingURL=web.js.map