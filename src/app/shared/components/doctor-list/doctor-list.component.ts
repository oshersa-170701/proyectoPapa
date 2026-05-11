/* The DoctorListComponent class in TypeScript is responsible for displaying a list of doctors,
allowing users to view schedules, book appointments, and contact doctors via phone or WhatsApp. */
import { ChangeDetectorRef, Component, Input, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonButton, IonGrid, IonRow, IonCol, IonSearchbar, IonSpinner, IonChip, IonLabel, IonAlert, IonModal } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { star, chevronForward, personOutline, business, callOutline, logoWhatsapp, medalOutline, businessOutline, readerOutline, searchOutline, locationOutline, calendarOutline, chevronDown } from 'ionicons/icons';
import { FormsModule } from '@angular/forms';
import { FilterPipe } from 'src/app/core/pipes/filter-pipe';
import { MedicalService } from 'src/app/core/services/medical';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
// 1. Agrega ModalController a los imports de @ionic/angular/standalone si no está
import { AlertController, ToastController, ModalController,ActionSheetController } from '@ionic/angular/standalone';
// 2. Importa el componente del modal
import { RegisterModalComponent } from '../register-modal/register-modal.component';
import { User } from 'src/app/core/services/user';
import { Browser } from '@capacitor/browser';
@Component({
  selector: 'app-doctor-list',
  templateUrl: './doctor-list.component.html',
  styleUrls: ['./doctor-list.component.scss'],
  standalone: true,
  imports: [IonModal, IonAlert, IonLabel, IonChip, IonSpinner, IonCol, IonRow, IonGrid, IonButton, 
    CommonModule, IonIcon, FilterPipe, FormsModule, IonSearchbar,RegisterModalComponent
  ]
})
export class DoctorListComponent {
  @Input() doctors: any[] = []; //  Esperando datos de la BD
  searchText: string = ''; //  Variable para el buscador
  constructor(private readonly medicalService: MedicalService, private readonly alertController: AlertController,
    private readonly toastController: ToastController, private readonly zone: NgZone,
     private readonly cdr: ChangeDetectorRef, private readonly modalCtrl: ModalController,
    private readonly userService: User,
    private actionSheetCtrl: ActionSheetController,
    ) {
   addIcons({
  personOutline, 
  readerOutline, 
  locationOutline, 
  callOutline,
  logoWhatsapp, 
  businessOutline, 
  medalOutline, 
  star,
  close: 'close', // Icono de cierre para el ActionSheet
  chevronForward, 
  business, 
  searchOutline, 
  calendarOutline,
  chevronDown //  Asegúrate que esté así
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
const dateObj = new Date();
const hoy = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
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
private confirmarCita(slot: string, doctor: any) {
  const profile = this.userService.getProfile(); 
  const dateObj = new Date();
  const hoy = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
  
  if (!profile) return;

  const datosCita = {
    action: 'create_appointment',
    api_key: 'ANAASIS_2026',
    doctor_id: doctor.id,
    patient_id: profile.patient_id,
    name: profile.name, 
    phone: profile.phone,
    date: hoy,
    time: slot
  };

  this.medicalService.createAppointment(datosCita).subscribe({
    next: (res: any) => {
      // 🚀 FORZAR INTERFAZ
      this.zone.run(() => {
        if (res.success) {
          // 🟢 ESTE ES EL TOAST QUE NO VEÍAS
          this.showToast('✅ Cita agendada con éxito.', 'success'); 
          doctor.showSchedule = false; 
          this.viewSchedule(doctor);
        } else {
          this.showToast('Error: ' + (res.error || 'Horario no disponible.'), 'warning');
        }
      });
    },
    error: () => this.showToast('Error de red al agendar.', 'danger')
  });
}
async showToast(msg: string, color: string = 'dark') {
  const toast = await this.toastController.create({
    message: msg,
    duration: 2500,
    position: 'bottom',
    color: color, // 'success' para verde, 'danger' para rojo
    cssClass: color === 'danger' ? 'custom-toast-error' : ''
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
          this.showToast('Datos inválidos. ');
          return false;
        }
        this.confirmarCita(this.selectedSlotTime, this.selectedDoctor, );
        return true;
      }
    }
  ];
async selectSlot(slot: string, doctor: any) {
  const profile = this.userService.getProfile();
  if (!profile || !profile.phone) {
    this.invitarARegistro();
    return;
  }

  this.medicalService.getUserAppointments(profile.phone).subscribe({
    next: async (res: any) => {
      const response = res || { success: false, data: [] };
      const citas = response.data || [];

      const citaDuplicada = citas.find((c: any) => 
        c.doctor_id == doctor.id && (c.status === 'scheduled' || c.status === 'programada')
      );

      if (citaDuplicada) {
        const aviso = `Parece que ya tienes una cita programada con el doctor ${doctor.name}.Primero debes cancelarla la cita programada antes de agendar una nueva.`;
        this.zone.run(() => {
          TextToSpeech.speak({ text: aviso, lang: 'es-MX', rate: 1.0, category: 'ambient' });
          this.showToast2(aviso, 'danger'); 
        });
        return; 
      }

      // ✅ Unificamos en una sola función limpia
      this.abrirActionSheetConfirmacion(slot, doctor);
    },
    error: () => this.abrirActionSheetConfirmacion(slot, doctor)
  });
}

private async abrirActionSheetConfirmacion(slot: string, doctor: any) {
  const actionSheet = await this.actionSheetCtrl.create({
    header: `Confirmar Cita`,
    subHeader: `Dr. ${doctor.name} - ${slot} hrs`,
    mode: 'md',
    cssClass: 'confirm-appointment-sheet',
    buttons: [
      {
        text: 'AGENDAR CITA AHORA',
        role: 'confirm',
        handler: () => { 
          // 🚀 Ejecutamos la confirmación real
          this.confirmarCita(slot, doctor); 
        }
      },
      {
        text: 'Cancelar',
        role: 'cancel',
        cssClass: 'action-sheet-cancel-red'
      }
    ]
  });
  await actionSheet.present();
}
async showToast2(msg: string, color: string = 'dark') {
  const toast = await this.toastController.create({
    message: msg,
    duration: 3000,
    position: 'bottom',
    color: color, // 👈 Ahora usa el color que le mandemos
    cssClass: 'custom-toast-error' // 👈 Una clase para forzar el diseño
  });
  await toast.present();
}

private async invitarARegistro() {
  const alert = await this.alertController.create({
    header: 'Atención',
    subHeader: 'Registro Necesario',
    message: 'Para poder agendar tu cita con el especialista, primero necesitamos crear tu expediente médico. ¿Deseas hacerlo ahora?',
    mode: 'md',
    buttons: [
      {
        text: 'Después',
        role: 'cancel',
        cssClass: 'secondary'
      },
      {
        text: 'Registrarme',
        handler: () => {
          // 🚀 Ejecutamos tu función de modal profesional
          this.abrirModalRegistro();
        }
      }
    ]
  });

  await alert.present();
}
// Nueva función para disparar el modal en Android
private async abrirModalRegistro() {
  this.zone.run(async () => {
    try {
      // 📍 Cerramos cualquier modal previo por si acaso
      await this.modalCtrl.dismiss().catch(() => {});

      const modal = await this.modalCtrl.create({
        component: RegisterModalComponent,
        mode: 'md', // Modo Android
        cssClass: 'medical-modal-standard', // 👈 Usaremos esta clase en el global
        backdropDismiss: false 
      });

      await modal.present();

      const { data } = await modal.onDidDismiss();
      if (data && data.success) {
        this.showToast('¡Perfil creado! Ya puedes agendar tu cita.');
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error("Error al abrir modal:", error);
    }
  });
}

  // 📍 1. Agrega esta variable para controlar el modal
  isRegisterModalOpen = false;
async llamarDoctor(phone: any, event: Event) {
  event.stopPropagation();
  
  // 📍 1. Diagnóstico: Si el número no sale, imprimimos qué está llegando
  console.log("Dato recibido del doctor:", phone);

  if (!phone || phone === 'NULL' || phone === '') {
    this.showToast('Este médico no tiene un teléfono registrado en la base de datos.');
    return;
  }

  // 📍 2. Limpieza total de espacios y caracteres basura
  const cleanPhone = phone.toString().replace(/[^0-9+]/g, '');

  // 📍 3. Salida directa al sistema (Bypass total de seguridad)
  // Usamos window.open con _system porque es lo que Capacitor entiende mejor
  window.open(`tel:${cleanPhone}`, '_system');
}
async abrirWhatsApp(whatsapp: any, event: Event) {
  event.stopPropagation(); // Para que no se cierre la tarjeta del doctor
  
  if (!whatsapp || whatsapp === 'NULL' || whatsapp === '') {
    this.showToast('Este médico no tiene WhatsApp registrado.');
    return;
  }

  // 1. Limpieza profunda: Solo números (esto quita el +, espacios o guiones)
  const soloNumeros = whatsapp.toString().replace(/[^0-9]/g, '');
  
  // 2. Formatear con código de país (México = 52)
  // Si el número ya empieza con 52, lo dejamos. Si no, se lo ponemos.
  const numeroFinal = soloNumeros.startsWith('52') ? soloNumeros : `52${soloNumeros}`;

  try {
    // 🚀 Usamos Browser.open con windowName: '_system' 
    // Esto es lo que fuerza a Android a abrir la App de WhatsApp y no el navegador
    await Browser.open({ 
      url: `https://wa.me/${numeroFinal}`,
      windowName: '_system' 
    });
  } catch (error) {
    // Fallback por si el plugin de Browser falla
    window.open(`https://wa.me/${numeroFinal}`, '_system');
  }
}
}