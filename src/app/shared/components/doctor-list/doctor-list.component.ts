import { ChangeDetectorRef, Component, Input, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonButton, IonGrid, IonRow, IonCol, IonSearchbar, IonSpinner, IonChip, IonLabel, IonAlert } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { star, chevronForward, personOutline, business, callOutline, logoWhatsapp, medalOutline, businessOutline, readerOutline, searchOutline, locationOutline, calendarOutline, chevronDown } from 'ionicons/icons';
import { FormsModule } from '@angular/forms';
import { FilterPipe } from 'src/app/core/pipes/filter-pipe';
import { MedicalService } from 'src/app/core/services/medical';
import { AlertController, ToastController } from '@ionic/angular'; // Importa estos dos
@Component({
  selector: 'app-doctor-list',
  templateUrl: './doctor-list.component.html',
  styleUrls: ['./doctor-list.component.scss'],
  standalone: true,
  imports: [IonAlert, IonLabel, IonChip, IonSpinner, IonCol, IonRow, IonGrid, IonButton, CommonModule, IonIcon, FilterPipe, FormsModule, IonSearchbar]
})
export class DoctorListComponent {
  @Input() doctors: any[] = []; //  Esperando datos de la BD
  searchText: string = ''; //  Variable para el buscador
  constructor(private readonly medicalService: MedicalService, private readonly alertController: AlertController,
    private readonly toastController: ToastController, private readonly zone: NgZone, private readonly cdr: ChangeDetectorRef) {
   addIcons({
  personOutline, 
  readerOutline, 
  locationOutline, 
  callOutline,
  logoWhatsapp, 
  businessOutline, 
  medalOutline, 
  star,
  chevronForward, 
  business, 
  searchOutline, 
  calendarOutline,
  chevronDown // 👈 Asegúrate que esté así
});
  }
  toggleContact(doctor: any) {
    // Si no existe la propiedad, la crea. Si existe, la voltea (true/false)
    doctor.showContact = !doctor.showContact;
  }
  // 2. Añade esta función para obtener los horarios
viewSchedule(doctor: any) {
  if (doctor.showSchedule) {
    doctor.showSchedule = false;
    return;
  }

  const hoy = new Date().toISOString().split('T')[0];
  doctor.isLoadingSlots = true;

  this.medicalService.getAvailability(doctor.id, hoy).subscribe({
    next: (res: any) => {
      this.zone.run(() => {
        doctor.isLoadingSlots = false;
        //  PROTECCIÓN: Verificamos que 'res' y 'res.data' existan
        if (res && res.data) {
          doctor.slots = res.data;
          doctor.showSchedule = true;
        } else {
          this.showToast('No hay horarios disponibles para hoy. ');
        }
        this.cdr.detectChanges();
      });
    },
    error: () => {
      this.zone.run(() => {
        doctor.isLoadingSlots = false;
        this.showToast('Error al cargar la agenda. ');
      });
    }
  });
}

private confirmarCita(slot: string, doctor: any, userData: any) {
  const hoy = new Date().toISOString().split('T')[0];
  
  const datosCita = {
    action: 'create_appointment',
    doctor_id: doctor.id,
    name: userData.userName,
    phone: userData.userPhone,
    date: hoy,
    time: slot, // Ejemplo: "10:00"
    api_key: 'ANAASIS_2026'
  };

  this.medicalService.createAppointment(datosCita).subscribe({
    next: (res: any) => {
      this.zone.run(() => {
        if (res.success) {
          this.showToast(res.message); // Usamos el mensaje que viene del PHP
          doctor.showSchedule = false;
          // Opcional: Recargar slots para que el que acabas de agendar desaparezca
          this.viewSchedule(doctor); 
        } else {
          this.showToast('Error: ' + res.message);
        }
      });
    },
    error: () => {
      this.zone.run(() => {
        this.showToast('Error de conexión con el servidor 📶');
      });
    }
  });
}

async showToast(msg: string) {
  const toast = await this.toastController.create({
    message: msg,
    duration: 2500,
    position: 'bottom',
    color: 'dark'
  });
  await toast.present();
}
// Variables para controlar el alert manual
  isAlertOpen = false;
  selectedSlotTime = '';
  selectedDoctor: any = null;

  // Configuración del Alert
  public alertInputs = [
    { name: 'userName', type: 'text', placeholder: 'Nombre del paciente' },
    { name: 'userPhone', type: 'tel', placeholder: 'Teléfono (10 dígitos)', attributes: { maxlength: 10 } }
  ];

  public alertButtons = [
    { text: 'Cancelar', role: 'cancel' },
    { 
      text: 'Agendar', 
      handler: (data: any) => {
        if (!data.userName || !data.userPhone || data.userPhone.length < 10) {
          this.showToast('Datos inválidos. 🌸');
          return false;
        }
        this.confirmarCita(this.selectedSlotTime, this.selectedDoctor, data);
        return true;
      }
    }
  ];

  // Cambia la función selectSlot por esta:
  selectSlot(slot: string, doctor: any) {
    this.zone.run(() => {
      this.selectedSlotTime = slot;
      this.selectedDoctor = doctor;
      this.isAlertOpen = true; // 🚀 Esto abre el alert visualmente
      this.cdr.detectChanges();
    });
  }
}