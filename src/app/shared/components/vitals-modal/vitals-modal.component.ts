import { Component, OnInit, OnDestroy, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonButton, IonIcon, IonSpinner, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  closeOutline, heartOutline, thermometerOutline, speedometerOutline, walkOutline, flameOutline,
  syncOutline, medical, water, waterOutline, medicalOutline, moonOutline, alertCircleOutline 
} from 'ionicons/icons';
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
  private readonly healthService = inject(Health);
  private readonly modalCtrl = inject(ModalController);
  private readonly userService = inject(User);
  private updateTimer: any;

  constructor() {
    addIcons({
      syncOutline, closeOutline, heartOutline, waterOutline, moonOutline, 
      alertCircleOutline, medicalOutline, speedometerOutline, medical, water, 
      thermometerOutline, walkOutline, flameOutline
    });
  }

  ngOnInit() {
    // Al abrir el modal por comando o clic, forzamos la sincronización completa que lee todo por bloques
    this.forzarSincronizacionManual();

    // Refrescamos cada 5 segundos de forma silenciosa para ver actualizaciones en segundo plano
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

  cargarSignos() {
    this.medicalService.getLatestVitals(this.phone).subscribe({
      next: (res: any) => {
        if (res && res.success && res.data) {
          this.vitals = res.data; // Recibe de anaasis.php todo el conjunto, incluyendo steps y calories
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
        const dataActividad = res.data as any;
        const hr = Math.round(Number(res.data.pulso || 0));
        const ox = Math.round(Number(res.data.oxigeno || 0));
        const sh = Number(res.data.horasSueno || 0);
        const st = Math.round(Number(dataActividad.steps || dataActividad.pasos || 0)); 
        const cal = Number(dataActividad.calories || dataActividad.calorias || 0.0);
        
        // 🚀 CORREGIDO: Leemos res.data.temperature directamente de la BD
        const temp = Number(res.data.temperature || this.vitals?.temperature || 0);

        this.vitals = {
          heart_rate: hr,
          spo2: ox,
          sleep_hours: sh.toFixed(1),
          steps: st,
          calories: cal,
          temperature: temp // 🌡️ Ahora preserva el 40.0°C real
        };

        // 🎙️ FRAGMENTACIÓN ESTRATÉGICA DE AUDIO
        const bloquesDeTexto: string[] = [
          "Sincronización completada con éxito.",
          hr > 0 ? `Tu frecuencia cardíaca es de ${hr} latidos por minuto.` : "No detecté pulsaciones en tu frecuencia cardíaca.",
          ox > 0 ? `Tu saturación de oxígeno está al ${ox} por ciento.` : "No localizé mediciones de oxígeno en sangre.",
          sh > 0 ? `En tu registro de sueño, capturé un descanso de ${sh.toFixed(1)} horas.` : "Aún no cuento con horas de sueño registradas hoy.",
          temp > 0 ? `Tu temperatura corporal es de ${temp} grados celsius.` : "No hay un registro de temperatura corporal reciente.",
          st > 0 ? `Hoy llevas acumulados un total de ${st} pasos diarios.` : "No detecté caminata o pasos acumulados hoy.",
          cal > 0 ? `Esto equivale a un consumo de ${Math.round(cal)} kilocalorías quemadas.` : "Tus calorías quemadas se mantienen en cero por el momento."
        ];

        console.log("[ANAasis TTS] Iniciando lectura por bloques lógicos de salud...");
        
        // 🔄 Reproducción secuencial obligatoria
        for (const frase of bloquesDeTexto) {
          await this.speak(frase);
        }

        // Refrescamos la vista local
        this.cargarSignos(); 
      }
      this.isLoading = false;
    } catch (e) {
      this.isLoading = false;
      console.error("[Vitals Modal] Fallo en sincronización manual:", e);
      await this.speak("Disculpa, no pude conectar con tu pulsera. Asegúrate de tenerla bien ajustada.");
    }
  }
  async speak(text: string) {
    try {
      await TextToSpeech.stop();
      await TextToSpeech.speak({
        text: text,
        lang: 'es-MX',
        rate: 1.0,
        pitch: 1.1, // Tono amable y suave para ANAasis 🌸
        volume: 1.0,
        category: 'ambient',
      });
    } catch (error) {
      console.error("Error en voz del modal:", error);
    }
  }
}