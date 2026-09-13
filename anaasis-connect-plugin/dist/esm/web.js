import { WebPlugin } from '@capacitor/core';
export class ANAasisConnectWeb extends WebPlugin {
    async discoverDevices() {
        console.warn('[ANAasisConnect] Google Cast solo está disponible en Android nativo.');
        return { devices: [] };
    }
    async speak(_options) {
        throw this.unimplemented('Google Cast no está disponible en la web.');
    }
    async scheduleBackgroundReminder(_options) {
        console.warn('[ANAasisConnect] Los recordatorios en segundo plano solo están disponibles en Android nativo.');
    }
    async cancelBackgroundReminder(_options) {
        console.warn('[ANAasisConnect] Los recordatorios en segundo plano solo están disponibles en Android nativo.');
    }
}
//# sourceMappingURL=web.js.map