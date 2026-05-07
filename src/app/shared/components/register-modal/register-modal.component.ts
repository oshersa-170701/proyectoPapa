import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonItem, 
  IonLabel, IonInput, IonButton, IonButtons, IonIcon, 
  ModalController, ToastController // 📍 Agregamos ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, personOutline, callOutline, mailOutline } from 'ionicons/icons';
import { User } from '../../../core/services/user';

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
  private toastCtrl = inject(ToastController); // 📍 Inyectamos el controlador de Toast

  registerForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    //email: ['', [Validators.required, Validators.email]]
  });

  constructor() {
    addIcons({ closeOutline, personOutline, callOutline, mailOutline });
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.userService.registerUser(this.registerForm.value).subscribe({
        next: async (res) => { // 📍 Agregamos async para el toast
          if (res.success) {
            await this.presentSuccessToast(); // 1. Mostramos el Toast
            this.modalCtrl.dismiss(res);     // 2. Cerramos el modal automáticamente
          }
        },
        error: (err) => {
          console.error('Error en registro:', err);
          // Opcional: mostrar un toast de error si la conexión falla
        }
      });
    }
  }
  // 📍 Función para mostrar el Toast de éxito
  async presentSuccessToast() {
    const toast = await this.toastCtrl.create({
      message: '¡Perfil creado con éxito!',
      duration: 2000,
      position: 'bottom',
      color: 'success',
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    await toast.present();
  }
  async goToLogin() {
  // Cerramos el modal de registro y mandamos una señal
  await this.modalCtrl.dismiss({ redirectToLogin: true });
}
}