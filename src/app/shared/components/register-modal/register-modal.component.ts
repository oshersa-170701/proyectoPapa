import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonItem,
  IonLabel, IonInput, IonButton, IonButtons, IonIcon,
  ModalController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, personOutline, callOutline, mailOutline, chevronForwardOutline } from 'ionicons/icons';
import { User } from '../../../core/services/user';
import { BiometricService } from '../../../core/services/biometric';

@Component({
  selector: 'app-register-modal',
  templateUrl: './register-modal.component.html',
  styleUrls: ['./register-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, IonHeader, IonToolbar, IonTitle,
    IonContent, IonItem, IonLabel, IonInput, IonButton, IonButtons, IonIcon
  ]
})
export class RegisterModalComponent {
  private fb = inject(FormBuilder);
  private userService = inject(User);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private biometric = inject(BiometricService);

  registerForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
  });

  constructor() {
    addIcons({ closeOutline, personOutline, callOutline, chevronForwardOutline, mailOutline });
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.userService.registerUser(this.registerForm.value).subscribe({
        next: async (res) => {
          if (res.success) {
            // Try to save biometric credentials silently — no error if device doesn't support it
            const phone = this.registerForm.value.phone;
            const available = await this.biometric.isAvailable();
            if (available) {
              try {
                await this.biometric.savePhone(phone);
              } catch { /* not critical, continue */ }
            }

            await this.presentSuccessToast();
            this.modalCtrl.dismiss(res);
          }
        },
        error: (err) => {
          console.error('Error en registro:', err);
        }
      });
    }
  }

  async presentSuccessToast() {
    const toast = await this.toastCtrl.create({
      message: '¡Perfil creado con éxito! La próxima vez puedes entrar con tu huella.',
      duration: 3000,
      position: 'bottom',
      color: 'success',
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    await toast.present();
  }

  async goToLogin() {
    await this.modalCtrl.dismiss({ redirectToLogin: true });
  }
}
