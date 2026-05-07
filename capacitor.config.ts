import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.anaasis.vitals.daniel',
  appName: 'proyecto-papa',
  webDir: 'www',
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      // 📍 LA CLAVE: Desactivamos el auto-ocultado
      launchAutoHide: false, 
      
      // Opcional: Un tiempo de seguridad por si algo falla (10 segundos)
      launchShowDuration: 10000, 
      backgroundColor: "#FFFFFF", // El color oscuro de tu splash
      androidScaleType: "CENTER_CROP"
    },
  },
};

export default config;
