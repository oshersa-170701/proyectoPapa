import { Component, OnInit, OnDestroy, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonButton, IonIcon, IonSpinner, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  closeOutline, heartOutline, thermometerOutline, speedometerOutline, 
  syncOutline, medical, water, waterOutline, medicalOutline, moonOutline, alertCircleOutline } from 'ionicons/icons';
import { MedicalService } from 'src/app/core/services/medical';
import { User } from 'src/app/core/services/user';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Health } from 'src/app/core/services/health';

@Component({
  selector: 'app-vitals-modal',
  templateUrl: './vitals-modal.component.html',
  styleUrls: ['./vitals-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonButton, IonIcon, IonSpinner
  ]
})
export class VitalsModalComponent implements OnInit, OnDestroy {

  @Input() phone!: string;

  vitals: any = null;
  isLoading = true;

  private readonly medicalService = inject(MedicalService);
  private readonly healthService = inject(Health); // 👈 Inyectamos el puente nativo
  private readonly modalCtrl = inject(ModalController);
  private readonly userService = inject(User);
  private updateTimer: any;

  constructor() {
    addIcons({syncOutline,closeOutline,heartOutline,waterOutline,moonOutline,alertCircleOutline,medicalOutline,speedometerOutline,medical,water,thermometerOutline});
  }

  ngOnInit() {
    this.cargarSignos();
    // Refrescamos cada 5 segundos para ver los cambios del motor del Home
    this.updateTimer = setInterval(() => {
      this.cargarSignos();
    }, 5000);
  }

  ngOnDestroy() {
    if (this.updateTimer) clearInterval(this.updateTimer);
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  /**
   * Carga los datos que ya están en la BD de Daniel
   */
  cargarSignos() {
    this.medicalService.getLatestVitals(this.phone).subscribe({
      next: (res: any) => {
        if (res && res.success && res.data) {
          this.vitals = res.data; // Aquí ya viene heart_rate, spo2 y sleep_hours
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  /**
   * 🚀 ACCIÓN NATIVA: Fuerza al sensor a leer AHORA MISMO
   */
 async forzarSincronizacionManual() {
  this.isLoading = true;
  const profile = this.userService.getProfile();
  if (!profile) return;

  try {
    await this.healthService.solicitarPermisosNativos();
    const res = await this.healthService.sincronizarConHealthConnect(profile.phone, profile.name);

    if (res.success) {  
      const hr = res.data.pulso || 0;
      const ox = res.data.oxigeno || 0;
      const sh = res.data.horasSueno || 0;

      this.vitals = {
        heart_rate: hr,
        spo2: ox,
        sleep_hours: sh
      };

      // 🎙️ Construimos el mensaje de voz amigable e inteligente
      let mensajeVoz = "Sincronización completada. ";
      
      // Pulso y Oxígeno
      mensajeVoz += hr > 0 ? `Tu pulso es de ${hr} latidos. ` : "No detecté tu pulso. ";
      mensajeVoz += ox > 0 ? `Tu oxígeno está al ${ox} por ciento. ` : "No detecté tu oxígeno. ";
      
      // 💤 Lógica de Sueño (Nueva)
      if (Number(sh) > 0) {
        mensajeVoz += `Y has dormido ${sh} horas.`;
      } else {
        mensajeVoz += "Aún no cuento con registros de sueño recientes para mostrar; asegúrate de haber usado tu pulsera al dormir.";
      }

      this.speak(mensajeVoz);
      this.cargarSignos(); 
    }
    this.isLoading = false;
  } catch (e) {
    this.isLoading = false;
    this.speak("Disculpa, no pude conectar con tu pulsera. Asegúrate de tenerla bien ajustada.");
  }
}
  async speak(text: string) {
    try {
      await TextToSpeech.stop();
      await TextToSpeech.speak({
        text: text,
        lang: 'es-MX',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        category: 'ambient',
      });
    } catch (error) {
      console.error("Error en voz del modal:", error);
    }
  }
}