import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { SplashScreen } from '@capacitor/splash-screen';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true, // Tu componente es standalone
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {}
 async ngOnInit() {
    // 📍 Solo intentamos ocultarlo si estamos en un dispositivo
    try {
      setTimeout(async () => {
        await SplashScreen.hide(); 
        console.log('Splash oculto con éxito 🚀');
      }, 1500); // Subimos a 1.5s para asegurar que el chat ya se ve atrás
    } catch (e) {
      console.warn('El Splash no está disponible o ya se ocultó');
    }
  }
}
