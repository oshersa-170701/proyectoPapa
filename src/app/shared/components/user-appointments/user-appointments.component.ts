import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, 
  IonLabel, IonIcon, IonButton, IonButtons, IonBadge, ModalController, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, calendarOutline, timeOutline, personOutline, locationOutline, trashOutline } from 'ionicons/icons';
import { MedicalService } from 'src/app/core/services/medical';
import { User } from 'src/app/core/services/user';
import { AlertController } from '@ionic/angular';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
@Component({
  selector: 'app-user-appointments',
  templateUrl: './user-appointments.component.html',
  styleUrls: ['./user-appointments.component.scss'],
  standalone: true,
  imports: [IonSpinner, 
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, 
    IonList, IonItem, IonLabel, IonIcon, IonButton, IonButtons, IonBadge
  ]
})
export class UserAppointmentsComponent implements OnInit {
  appointments: any[] = [];
  isLoading = true;
  private readonly modalCtrl = inject(ModalController);
  private readonly userService = inject(User);
  private readonly medicalService = inject(MedicalService);
  private readonly cdr = inject(ChangeDetectorRef); // 📍 Inyectamos
  private readonly zone = inject(NgZone); // 📍 Inyectamos
  private readonly alertCtrl = inject(AlertController);
  constructor() {
    addIcons({closeOutline,calendarOutline,personOutline,timeOutline,trashOutline,locationOutline});
  }
ngOnInit() {
    this.cargarCitas();
  }
  dismiss() {
    this.modalCtrl.dismiss();
  }
cargarCitas() {
    const profile = this.userService.getProfile();
    if (!profile || !profile.phone) {
      this.isLoading = false;
      return;
    }

    this.medicalService.getUserAppointments(profile.phone).subscribe({
      next: (res: any) => {
        // 🚀 LA CLAVE: Ejecutamos dentro de la zona de Angular
        this.zone.run(() => {
          if (res.success) {
            this.appointments = res.data;
            console.log('Citas recibidas:', this.appointments.length);
          }
          this.isLoading = false;
          this.cdr.detectChanges(); // 📢 ¡Avisamos a la pantalla que hay datos!
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.isLoading = false;
          console.error('Error al cargar citas:', err);
          this.cdr.detectChanges();
        });
      }
    });
  }
// 1. Función para mostrar alerta de confirmación
 async confirmarCancelacion(cita: any) {
  const alert = await this.alertCtrl.create({
    header: '¿Confirmas la cancelación?',
    message: `Hola, ¿estás seguro de cancelar tu cita con el Dr. ${cita.doctor}? Este horario se liberará para otros pacientes.`,
    buttons: [
      { text: 'No, mantener cita', role: 'cancel' },
      {
        text: 'Sí, cancelar',
        cssClass: 'danger-button',
        handler: () => {
          this.ejecutarCancelacion(cita.id);
        }
      }
    ]
  });
  await alert.present();
}

  // 2. Llamada real al servicio
  private ejecutarCancelacion(appointmentId: number) {
  this.isLoading = true;
  this.cdr.detectChanges();

  this.medicalService.cancelAppointment(appointmentId).subscribe({
    next: (res: any) => {
      this.zone.run(() => {
        if (res.success) {
          // 🔊 ANAasis confirma por voz
          this.speak("He cancelado tu cita con éxito. El horario ha sido liberado.");
          
          // Recargamos la lista real del servidor
          this.cargarCitas();
        } else {
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    },
    error: (err) => {
      this.zone.run(() => {
        console.error("Error al cancelar:", err);
        this.isLoading = false;
        this.cdr.detectChanges();
      });
    }
  });
}
// Función auxiliar para voz
async speak(mensaje: string) {
  try {
    await TextToSpeech.speak({
      text: mensaje,
      lang: 'es-MX',
      rate: 1.0,
      category: 'ambient'
    });
  } catch (e) {
    console.warn("TTS no disponible");
  }
}

}