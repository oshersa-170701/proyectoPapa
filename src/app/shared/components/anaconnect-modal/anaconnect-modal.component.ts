import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonSpinner, IonList, IonItem, IonLabel, ModalController
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { addIcons } from 'ionicons';
import { closeOutline, homeOutline, wifiOutline, checkmarkCircle, volumeHighOutline, trashOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { MedicalService } from 'src/app/core/services/medical';
import { Anaconnect, CastDevice } from 'src/app/core/services/anaconnect';
import { User } from 'src/app/core/services/user';
import { Voice } from 'src/app/core/services/voice';
import { ReminderScheduler } from 'src/app/core/services/reminder-scheduler';

interface BocinaEmparejada {
  device_name: string;
  cast_id: string;
}

@Component({
  selector: 'app-anaconnect-modal',
  templateUrl: './anaconnect-modal.component.html',
  styleUrls: ['./anaconnect-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
    IonIcon, IonSpinner, IonList, IonItem, IonLabel
  ]
})
export class AnaconnectModalComponent implements OnInit {

  dispositivos: CastDevice[] = [];
  bocinaEmparejada: BocinaEmparejada | null = null;
  buscando = false;
  probando = false;
  emparejando = false;
  errorMsg = '';

  private readonly medicalService = inject(MedicalService);
  private readonly anaconnectService = inject(Anaconnect);
  private readonly userService = inject(User);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastController = inject(ToastController);
  private readonly voice = inject(Voice);
  private readonly reminderScheduler = inject(ReminderScheduler);

  constructor() {
    addIcons({ closeOutline, homeOutline, wifiOutline, checkmarkCircle, volumeHighOutline, trashOutline, checkmarkCircleOutline });
  }

  ngOnInit() {
    this.cargarBocinaActual();
  }

  dismiss() {
    this.voice.detener().catch(() => { });
    this.modalCtrl.dismiss();
  }

  private get phone(): string | null {
    return this.userService.getProfile()?.phone || null;
  }

  private get patientId(): number | null {
    return this.userService.getProfile()?.patient_id || null;
  }

  // 📍 Sin esto, un recordatorio activado ANTES de emparejar/cambiar de bocina se
  // quedaba apuntando a la bocina vieja (o a ninguna) hasta que el paciente volvía a
  // tocar el switch de "Mis medicamentos". Lo hacemos "best effort" en segundo plano:
  // si falla, no debe interrumpir el flujo de emparejado/desvinculado.
  private resincronizarRecordatorios() {
    const patientId = this.patientId;
    if (!patientId) return;
    this.reminderScheduler.resincronizarBocinaEnTodosLosRecordatorios(patientId)
      .catch(e => console.error('[AnaConnect] Error re-sincronizando recordatorios:', e));
  }

  cargarBocinaActual() {
    if (!this.phone) return;

    this.medicalService.getGoogleHomeDevice(this.phone).subscribe({
      next: (res: any) => {
        if (res?.success && res.data?.cast_id) {
          this.bocinaEmparejada = res.data;
        }
      },
      error: () => { }
    });
  }

  async buscarBocinas() {
    this.buscando = true;
    this.errorMsg = '';

    this.dispositivos = await this.anaconnectService.discoverDevices();
    this.buscando = false;

    if (this.dispositivos.length === 0) {
      this.errorMsg = 'No se encontraron bocinas Google Home en tu red WiFi.';

      try {
        await this.presentToast('No se encontró ninguna bocina cercana.');
      } catch (e) {
        console.error('[AnaConnect] Error mostrando el toast de "sin bocinas":', e);
      }

      try {
        await this.voice.hablar('No se encontró ninguna bocina cercana.');
      } catch (e) {
        console.error('[AnaConnect] Error hablando "sin bocinas":', e);
      }
    }
  }

  emparejar(device: CastDevice) {
    if (!this.phone || this.emparejando) return;
    this.emparejando = true;
    console.log('[AnaConnect] Emparejando bocina:', JSON.stringify(device));

    this.medicalService.saveGoogleHomeDevice(this.phone, device.name, device.id).subscribe({
      next: async (res: any) => {
        this.emparejando = false;
        console.log('[AnaConnect] Respuesta de save_google_home_device:', JSON.stringify(res));

        if (res?.success) {
          this.bocinaEmparejada = { device_name: device.name, cast_id: device.id };

          // Confirmamos con sonido en la bocina ANTES de cerrar, para que el paciente
          // sepa de oído que sí quedó conectada (best-effort: si falla el audio, igual avisamos).
          await this.confirmarEmparejamientoConSonido(device);
          await this.presentToastExito(`"${device.name}" quedó conectada correctamente.`);
          this.resincronizarRecordatorios();

          this.voice.detener().catch(() => { });
          this.modalCtrl.dismiss({ bocinaEmparejada: this.bocinaEmparejada });
        } else {
          await this.presentToast('No se pudo emparejar la bocina.');
        }
      },
      error: async (err) => {
        this.emparejando = false;
        console.error('[AnaConnect] Error de conexión emparejando:', JSON.stringify(err));
        await this.presentToast('Error de conexión al emparejar la bocina.');
      }
    });
  }

  // 🔊 Le pide a la bocina recién emparejada que hable, para que el paciente
  // confirme de oído que quedó bien conectada (sin esto, no había forma de saberlo).
  private async confirmarEmparejamientoConSonido(device: CastDevice): Promise<void> {
    try {
      const res: any = await firstValueFrom(this.medicalService.generateTts(`Hola, quedé conectada a ${device.name}.`));
      console.log('[AnaConnect] Respuesta de generate_tts (confirmación de emparejado):', JSON.stringify(res));

      if (!res?.success || !res.audio_url) {
        console.warn('[AnaConnect] generate_tts no devolvió audio_url — revisa GOOGLE_TTS_API_KEY en el .env del servidor.');
        return;
      }

      await this.anaconnectService.speak(device.id, res.audio_url);
      console.log('[AnaConnect] Cast speak() confirmó sin lanzar error.');
    } catch (e) {
      console.error('[AnaConnect] La bocina se emparejó pero no se pudo confirmar con sonido:', JSON.stringify(e));
    }
  }

  olvidarBocina() {
    if (!this.phone) return;

    this.medicalService.saveGoogleHomeDevice(this.phone, null, null).subscribe({
      next: async () => {
        this.bocinaEmparejada = null;
        await this.presentToast('Bocina desvinculada.');
        this.resincronizarRecordatorios();
      },
      error: async () => {
        await this.presentToast('Error de conexión al desvincular la bocina.');
      }
    });
  }

  async probarBocina() {
    if (!this.bocinaEmparejada) return;
    this.probando = true;
    console.log('[AnaConnect] Probando bocina:', JSON.stringify(this.bocinaEmparejada));

    this.medicalService.generateTts('Hola, esta es una prueba de ANAasis Connect').subscribe({
      next: async (res: any) => {
        console.log('[AnaConnect] Respuesta de generate_tts (prueba):', JSON.stringify(res));
        try {
          if (res?.success && res.audio_url) {
            await this.anaconnectService.speak(this.bocinaEmparejada!.cast_id, res.audio_url);
            console.log('[AnaConnect] Cast speak() de prueba confirmó sin lanzar error.');
          } else {
            console.warn('[AnaConnect] generate_tts no devolvió audio_url — revisa GOOGLE_TTS_API_KEY en el .env del servidor.');
            await this.presentToast('No se pudo generar el audio de prueba. Revisa la GOOGLE_TTS_API_KEY del servidor.');
          }
        } catch (e) {
          console.error('[AnaConnect] Error de Cast reproduciendo la prueba:', JSON.stringify(e));
          await this.presentToast('No se pudo reproducir en la bocina. ¿Sigue en la misma red WiFi?');
        } finally {
          this.probando = false;
        }
      },
      error: async (err) => {
        this.probando = false;
        console.error('[AnaConnect] Error de conexión generando audio de prueba:', JSON.stringify(err));
        await this.presentToast('Error de conexión al generar el audio de prueba.');
      }
    });
  }

  private async presentToast(mensaje: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2500,
      position: 'top', // 'bottom' quedaba tapado por la hoja del modal (breakpoints 0.6/0.9)
      color: 'dark'
    });
    await toast.present();
  }

  private async presentToastExito(mensaje: string) {
    const toast = await this.toastController.create({
      header: 'Bocina emparejada',
      message: mensaje,
      icon: 'checkmark-circle-outline',
      duration: 3000,
      position: 'top',
      cssClass: 'toast-exito-anaconnect'
    });
    await toast.present();
  }
}
