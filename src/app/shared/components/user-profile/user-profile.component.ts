import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, 
  IonLabel, IonIcon, IonButton, IonButtons, ModalController, IonText } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, personCircle, callOutline, mailOutline, logOutOutline, personOutline, shieldCheckmarkOutline, chatbubblesOutline } from 'ionicons/icons';
import { User } from '../../../core/services/user';
import { Voice } from '../../../core/services/voice';
@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
  standalone: true,
  imports: [IonText, 
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, 
    IonList, IonItem, IonLabel, IonIcon, IonButton, IonButtons
  ]
})
export class UserProfileComponent implements OnInit {
  private readonly modalCtrl = inject(ModalController);
  private readonly userService = inject(User);
  private readonly voice = inject(Voice);

  userProfile: any;

  constructor() {
    addIcons({closeOutline,personOutline,callOutline,shieldCheckmarkOutline,logOutOutline,chatbubblesOutline,personCircle,mailOutline});
  }

  ngOnInit() {
  this.userProfile = this.userService.getProfile();

  if (!this.userProfile) {
    // 🔊 ANAasis explica la situación por voz si no hay perfil
    this.speakStatus();
  }
}

  dismiss() {
    this.voice.detener().catch(() => { });
    this.modalCtrl.dismiss();
  }

  async logout() {
  const nombre = this.userProfile?.name || 'paciente';
  const mensajeDespedida = `Entendido ${nombre}, he cerrado tu sesión de forma segura. ¡Cuídate mucho!`;

  try {
    // 🔊 ANAasis se despide formalmente
    await this.voice.hablar(mensajeDespedida);
  } catch (e) {
    console.warn("TTS no disponible");
  }

  // 1. Borramos los datos físicos del Storage
  this.userService.deleteProfile(); 
  
  // 2. Cerramos el modal avisando que hubo un logout
  this.modalCtrl.dismiss({ logout: true });

  // 3. 🚀 RECARGA TOTAL: Esto vacía todas las variables de memoria de la App
  // Es la forma más segura de que "Mis Citas" y "Mi Perfil" aparezcan vacíos de inmediato.
  setTimeout(() => {
    window.location.reload(); 
  }, 1000);
}
async speakStatus() {
  try {
    await this.voice.hablar("Aún no estás registrado. Por favor, solicítame el registro para poder ayudarte a agendar una cita.");
  } catch (e) {
    console.warn("TTS no disponible");
  }
}
}