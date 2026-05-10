import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.anaasis.vitals.daniel',
  appName: 'proyecto-papa',
  webDir: 'www',
  bundledWebRuntime: false,
  // 🚀 AGREGA ESTE BLOQUE SERVER PARA DESBLOQUEAR LA LLAMADA:
  server: {
    allowNavigation: ['tel:*']
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false, 
      launchShowDuration: 10000, 
      backgroundColor: "#FFFFFF",
      androidScaleType: "CENTER_CROP"
    },
  },
};

export default config;