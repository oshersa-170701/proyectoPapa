import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonInput, IonButton, IonButtons, IonIcon, 
  ModalController, ToastController, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, callOutline, lockClosedOutline, mailOutline, keyOutline } from 'ionicons/icons';
import { User } from '../../../core/services/user';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
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
export class LoginModalComponent  {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(User);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);

  loginForm: FormGroup = this.fb.group({
  phone: ['', [Validators.required, Validators.minLength(10)]] // 📍 Email eliminado
});

  constructor() {
    addIcons({closeOutline,callOutline,keyOutline,mailOutline,lockClosedOutline});
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  //  Función para saltar al registro
  goToRegister() {
    this.modalCtrl.dismiss({ redirectToRegister: true });
  }

 // En login-modal.component.ts
onLogin() {
  if (this.loginForm.valid) {
    this.userService.loginUser(this.loginForm.value).subscribe({
      next: async (res) => {
        if (res.success) {
          // 🔊 ANAasis da la bienvenida personalizada
          const nombre = res.name || 'de nuevo';
          const mensajeBienvenida = `¡Qué alegría volver a verte, ${nombre}! He recuperado tu historial médico y tus citas. Estoy lista para seguir cuidándote.`;

          await TextToSpeech.speak({
            text: mensajeBienvenida,
            lang: 'es-MX',
            rate: 0.9, // Un poco más lento para que sea claro
            category: 'ambient'
          });

          await this.presentToast(`¡Bienvenido, ${res.name}! `, 'success');
          
          // Esperamos un momento para que termine de hablar antes de recargar
          setTimeout(() => {
            this.modalCtrl.dismiss({ success: true });
          }, 2000);
          
        } else {
          this.presentToast('Lo siento, no encontré esos datos. Por favor, revisa tu teléfono y correo.', 'danger');
        }
      }
    });
  }
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