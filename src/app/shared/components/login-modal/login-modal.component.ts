import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonInput, IonButton, IonButtons, IonIcon,
  ModalController, ToastController, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, callOutline, lockClosedOutline, mailOutline, keyOutline, fingerPrintOutline } from 'ionicons/icons';
import { User } from '../../../core/services/user';
import { Voice } from '../../../core/services/voice';
import { BiometricService } from '../../../core/services/biometric';

@Component({
  selector: 'app-login-modal',
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.scss'],
  standalone: true,
  imports: [IonLabel,
    CommonModule, ReactiveFormsModule, IonHeader, IonToolbar, IonTitle,
    IonContent, IonItem, IonInput, IonButton, IonButtons, IonIcon
  ]
})
export class LoginModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(User);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly voice = inject(Voice);
  private readonly biometric = inject(BiometricService);

  loginForm: FormGroup = this.fb.group({
    phone: ['', [Validators.required, Validators.minLength(10)]]
  });

  canUseBiometric = false;

  constructor() {
    addIcons({ closeOutline, callOutline, keyOutline, mailOutline, lockClosedOutline, fingerPrintOutline });
  }

  async ngOnInit() {
    const available = await this.biometric.isAvailable();
    const hasCredentials = available && await this.biometric.hasCredentials();
    this.canUseBiometric = hasCredentials;

    // If fingerprint is set up, trigger it automatically right when the modal opens
    if (this.canUseBiometric) {
      this.loginWithFingerprint();
    }
  }

  dismiss() {
    this.voice.detener().catch(() => { });
    this.modalCtrl.dismiss();
  }

  goToRegister() {
    this.voice.detener().catch(() => { });
    this.modalCtrl.dismiss({ redirectToRegister: true });
  }

  async loginWithFingerprint() {
    const phone = await this.biometric.authenticateAndGetPhone();
    if (!phone) return; // User cancelled or failed — let them use the form

    this.userService.loginUser({ phone }).subscribe({
      next: async (res) => {
        if (res.success) {
          const nombre = res.name || 'de nuevo';
          const msg = `¡Qué alegría volver a verte, ${nombre}! He recuperado tu historial médico. Estoy lista para seguir cuidándote.`;
          await this.voice.hablar(msg, { rate: 0.9 });
          await this.presentToast(`¡Bienvenido, ${res.name}!`, 'success');
          setTimeout(() => this.modalCtrl.dismiss({ success: true }), 2000);
        } else {
          this.presentToast('No encontré tu número. Intenta con el formulario.', 'danger');
        }
      }
    });
  }

  onLogin() {
    if (this.loginForm.valid) {
      this.userService.loginUser(this.loginForm.value).subscribe({
        next: async (res) => {
          if (res.success) {
            const nombre = res.name || 'de nuevo';
            const mensajeBienvenida = `¡Qué alegría volver a verte, ${nombre}! He recuperado tu historial médico y tus citas. Estoy lista para seguir cuidándote.`;
            await this.voice.hablar(mensajeBienvenida, { rate: 0.9 });
            await this.presentToast(`¡Bienvenido, ${res.name}!`, 'success');

            // After a manual login, offer biometric for next time
            await this.offerBiometricSetup(this.loginForm.value.phone);

            setTimeout(() => this.modalCtrl.dismiss({ success: true }), 2000);
          } else {
            this.presentToast('Lo siento, no encontré esos datos. Por favor, revisa tu teléfono.', 'danger');
          }
        }
      });
    }
  }

  private async offerBiometricSetup(phone: string) {
    const available = await this.biometric.isAvailable();
    if (!available) return;
    const alreadySet = await this.biometric.hasCredentials();
    if (alreadySet) return;

    try {
      await this.biometric.savePhone(phone);
    } catch { /* device may not support secure storage, skip silently */ }
  }

  async presentToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }
}
