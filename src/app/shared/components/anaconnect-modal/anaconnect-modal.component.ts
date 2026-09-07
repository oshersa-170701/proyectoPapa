import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonSpinner, IonList, IonItem, IonLabel, ModalController
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { addIcons } from 'ionicons';
import { closeOutline, homeOutline, wifiOutline, checkmarkCircle, volumeHighOutline, trashOutline } from 'ionicons/icons';
import { MedicalService } from 'src/app/core/services/medical';
import { Anaconnect, CastDevice } from 'src/app/core/services/anaconnect';
import { User } from 'src/app/core/services/user';

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
  errorMsg = '';

  private readonly medicalService = inject(MedicalService);
  private readonly anaconnectService = inject(Anaconnect);
  private readonly userService = inject(User);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastController = inject(ToastController);

  constructor() {
    addIcons({ closeOutline, homeOutline, wifiOutline, checkmarkCircle, volumeHighOutline, trashOutline });
  }

  ngOnInit() {
    this.cargarBocinaActual();
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  private get phone(): string | null {
    return this.userService.getProfile()?.phone || null;
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
      await this.presentToast('No se encontró ninguna bocina cercana.');
      TextToSpeech.speak({
        text: 'No se encontró ninguna bocina cercana.',
        lang: 'es-MX',
        rate: 1.0,
        volume: 1.0,
        category: 'ambient'
      }).catch(() => { });
    }
  }

  emparejar(device: CastDevice) {
    if (!this.phone) return;

    this.medicalService.saveGoogleHomeDevice(this.phone, device.name, device.id).subscribe({
      next: async (res: any) => {
        if (res?.success) {
          this.bocinaEmparejada = { device_name: device.name, cast_id: device.id };
          await this.presentToast(`Bocina "${device.name}" emparejada correctamente.`);
        } else {
          await this.presentToast('No se pudo emparejar la bocina.');
        }
      },
      error: async () => {
        await this.presentToast('Error de conexión al emparejar la bocina.');
      }
    });
  }

  olvidarBocina() {
    if (!this.phone) return;

    this.medicalService.saveGoogleHomeDevice(this.phone, null, null).subscribe({
      next: async () => {
        this.bocinaEmparejada = null;
        await this.presentToast('Bocina desvinculada.');
      },
      error: async () => {
        await this.presentToast('Error de conexión al desvincular la bocina.');
      }
    });
  }

  async probarBocina() {
    if (!this.bocinaEmparejada) return;
    this.probando = true;

    this.medicalService.generateTts('Hola, esta es una prueba de ANAasis Connect').subscribe({
      next: async (res: any) => {
        try {
          if (res?.success && res.audio_url) {
            await this.anaconnectService.speak(this.bocinaEmparejada!.cast_id, res.audio_url);
          } else {
            await this.presentToast('No se pudo generar el audio de prueba.');
          }
        } catch (e) {
          await this.presentToast('No se pudo reproducir en la bocina. ¿Sigue en la misma red WiFi?');
        } finally {
          this.probando = false;
        }
      },
      error: async () => {
        this.probando = false;
        await this.presentToast('Error de conexión al generar el audio de prueba.');
      }
    });
  }

  private async presentToast(mensaje: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2500,
      position: 'bottom',
      color: 'dark'
    });
    await toast.present();
  }
}
