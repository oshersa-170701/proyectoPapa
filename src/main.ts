import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular/standalone'; // 📍 Asegúrate de esta línea
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({ mode: 'md' }), // 📍 Esto ya configura los controladores internamente
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(),
    // ToastController // 💡 Nota: provideIonicAngular ya incluye los controladores, puedes quitar esta línea si gustas
  ],
});