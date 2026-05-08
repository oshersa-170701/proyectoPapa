import { Component, OnInit, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonButton, IonIcon, IonSpinner, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, heartOutline, thermometerOutline, speedometerOutline, syncOutline, medical, water, waterOutline, medicalOutline } from 'ionicons/icons';
import { MedicalService } from 'src/app/core/services/medical';
import { HealthConnect } from 'capacitor-health-connect';
import { User } from 'src/app/core/services/user';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
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
export class VitalsModalComponent implements OnInit {

  @Input() phone!: string; // Recibe el teléfono del usuario

  vitals: any = null; // 👈 Esto quita el error de 'vitals'
  isLoading = true;   // 👈 Esto quita el error de 'isLoading'

  private readonly medicalService = inject(MedicalService);
  private readonly modalCtrl = inject(ModalController);
  private updateTimer: any;
  private readonly userService = inject(User); // 📍 Inyectamos User
  constructor() {
    addIcons({syncOutline,closeOutline,heartOutline,speedometerOutline,medicalOutline,waterOutline,medical,water,thermometerOutline});
  }

ngOnInit() {
  this.cargarSignos();
  // 📍 RE-CARGAR CADA 3 SEGUNDOS PARA VER LA TABLA EN VIVO
  this.updateTimer = setInterval(() => {
    this.cargarSignos();
  }, 3000); 
}
  ngOnDestroy() {
    if (this.updateTimer) clearInterval(this.updateTimer);
  }

  dismiss() { // 👈 Esto quita el error de 'dismiss()'
    this.modalCtrl.dismiss();
  }

  cargarSignos() {
  this.medicalService.getLatestVitals(this.phone).subscribe({
    next: (res: any) => {
      // 📍 BLINDAJE: Si 'res' es null o 'res.success' no existe, evitamos el crash
      if (res && res.success && res.data) {
        this.vitals = res.data;
      } else {
        // Si no hay datos, nos aseguramos de que vitals sea null para mostrar el estado vacío
        this.vitals = null;
      }
      this.isLoading = false; // Detenemos el spinner sí o sí
    },
    error: (err) => {
      console.error("Error al consultar BD:", err);
      this.vitals = null;
      this.isLoading = false;
    }
  });
}
async forzarSincronizacionManual() {
  this.isLoading = true;
  const profile = this.userService.getProfile();
  if (!profile) return;

  try {
    const ahoraMs = Date.now();
    const hace24hMs = ahoraMs - (24 * 60 * 60 * 1000); 

    const config = {
      timeRangeFilter: {
        type: 'between',
        startTime: new Date(hace24hMs).toISOString(),
        endTime: new Date(ahoraMs).toISOString()
      }
    };

    // 📍 LECTURA SIMULTÁNEA
    const [rP, rO] = await Promise.all([
      (HealthConnect as any).readRecords({ ...config, type: 'HeartRateSeries' }),
      (HealthConnect as any).readRecords({ ...config, type: 'OxygenSaturation' })
    ]);

    let hrFinal = 0;
    let oxFinal = 0;

    // 🎯 PULSO: Buscamos el latido con el timestamp más reciente de TODA la base de datos
    if (rP.records?.length > 0) {
      const todasMuestras = rP.records.flatMap((r: any) => r.samples || []);
      if (todasMuestras.length > 0) {
        const masReciente = todasMuestras.reduce((prev: any, curr: any) => 
          new Date(curr.time).getTime() > new Date(prev.time).getTime() ? curr : prev
        );
        hrFinal = Math.round(masReciente.beatsPerMinute);
      }
    }

    // 🎯 OXÍGENO: Buscamos la saturación más reciente
    if (rO.records?.length > 0) {
      const ultimoReg = rO.records[rO.records.length - 1];
      let val = ultimoReg.percentage || ultimoReg.value || 0;
      if (typeof val === 'object') val = val.value;
      oxFinal = Math.round(val <= 1 && val > 0 ? val * 100 : val);
    }

    // 📍 LÓGICA ANTI-CERO Y ANTI-SIMULACIÓN:
    // Si Google no nos dio oxígeno ahorita (oxFinal es 0), 
    // usamos el que ya tenemos en la pantalla (this.vitals.spo2).
    const oxigenoParaGuardar = (oxFinal > 0) ? oxFinal : (this.vitals?.spo2 || 0);

    // Solo guardamos si el pulso es verídico (>30)
    if (hrFinal > 30) {
      this.medicalService.saveVitals({
        phone: profile.phone,
        name: profile.name,
        heart_rate: hrFinal,
        spo2: oxigenoParaGuardar // 👈 Ya no hay "|| 98"
      }).subscribe({
        next: () => {
          this.cargarSignos();
          this.speak(`Sincronización verídica. Pulso ${hrFinal} y oxígeno ${oxigenoParaGuardar}.`);
        },
        error: () => this.isLoading = false
      });
    } else {
      this.isLoading = false;
      this.speak("No se detectan datos nuevos en Health Connect.");
    }

  } catch (e) {
    this.isLoading = false;
    console.error("Fallo técnico en HealthConnect:", e);
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