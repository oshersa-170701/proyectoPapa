'use strict';

var core = require('@capacitor/core');

const ANAasisConnect = core.registerPlugin('ANAasisConnect', {
    web: () => Promise.resolve().then(function () { return web; }).then((m) => new m.ANAasisConnectWeb()),
});

class ANAasisConnectWeb extends core.WebPlugin {
    async discoverDevices() {
        console.warn('[ANAasisConnect] Google Cast solo está disponible en Android nativo.');
        return { devices: [] };
    }
    async speak(_options) {
        throw this.unimplemented('Google Cast no está disponible en la web.');
    }
}

var web = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ANAasisConnectWeb: ANAasisConnectWeb
});

exports.ANAasisConnect = ANAasisConnect;
//# sourceMappingURL=plugin.cjs.js.map
