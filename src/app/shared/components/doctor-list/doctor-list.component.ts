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
import { AlertController, ToastController, ModalController } from '@ionic/angular'; 
// 2. Importa el componente del modal
import { RegisterModalComponent } from '../register-modal/register-modal.component';
import { User } from 'src/app/core/services/user';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
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

private confirmarCita(slot: string, doctor: any) {
  // 📍 1. Obtenemos el perfil real del storage
  const profile = this.userService.getProfile(); 
  const hoy = new Date().toISOString().split('T')[0];
  
  if (!profile) {
    this.showToast('Error: No se encontró tu perfil.');
    return;
  }

  const datosCita = {
    action: 'create_appointment',
    doctor_id: doctor.id,
    // 🚀 CLAVE: Usamos los datos del perfil, no del formulario manual
    name: profile.name, 
    phone: profile.phone,
    patient_id: profile.patient_id, // 📍 Enviamos el ID real que devolvió el registro
    date: hoy,
    time: slot,
    api_key: 'ANAASIS_2026'
  };

  this.medicalService.createAppointment(datosCita).subscribe({
    next: (res: any) => {
      this.zone.run(() => {
        if (res.success) {
          this.showToast('✅ Cita agendada con éxito.');
          doctor.showSchedule = false;
          this.viewSchedule(doctor); 
        } else {
          this.showToast('Error: ' + res.message);
        }
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
          this.showToast('Datos inválidos. ');
          return false;
        }
        this.confirmarCita(this.selectedSlotTime, this.selectedDoctor, );
        return true;
      }
    }
  ];

selectSlot(slot: string, doctor: any) {
  this.zone.run(async () => {
    // 📍 Usamos la misma llave que definiste en tu User Service: 'anaasis_user_data'
    const userJson = localStorage.getItem('anaasis_user_data'); 
    
    if (!userJson) {
      this.selectedDoctor = doctor;
      const mensaje = `Lo siento, aún no estas registrado. Para poder agendar una cita con el doctor ${doctor.name}, primero necesito que te registres. ¿Te gustaría hacerlo ahora?`;
      
      await TextToSpeech.speak({
        text: mensaje,
        lang: 'es-MX',
        rate: 1.0,
        category: 'ambient'
      });

      this.invitarARegistro();
      return; 
    }

    // 🚀 SI YA ESTÁ REGISTRADO: Confirmamos directo sin pedir datos
    const confirm = await this.alertController.create({
      header: 'Confirmar Cita',
      message: `¿Deseas agendar tu cita con el Dr. ${doctor.name} a las ${slot}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Agendar', 
          handler: () => {
            this.confirmarCita(slot, doctor); // Llama a la función actualizada
          }
        }
      ]
    });
    await confirm.present();
  });
}

private async invitarARegistro() {
  const alert = await this.alertController.create({
    header: 'Registro Necesario',
    message: 'Para agendar citas y llevar tu historial médico, necesito crear tu perfil. ¿Deseas registrarte?',
    buttons: [
      { text: 'Después', role: 'cancel' },
      { 
        text: 'Registrarme', 
        handler: () => {
          // 🚀 CAMBIO CLAVE: Activamos el modal directamente con el booleano
          this.zone.run(() => {
            this.isRegisterModalOpen = true;
            this.cdr.detectChanges();
          });
        }
      }
    ]
  });
  await alert.present();
}
// Nueva función para disparar el modal en Android
private async abrirModalRegistro() {
  this.zone.run(async () => {
    // 📍 Pequeña espera para que Android limpie el Alert anterior
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const modal = await this.modalCtrl.create({
        component: RegisterModalComponent,
        mode: 'md', 
        breakpoints: [0, 0.9],
        initialBreakpoint: 0.9,
        handle: true,
        backdropDismiss: false // Evita que se cierre por error al tocar afuera
      });

      await modal.present();

      const { data } = await modal.onDidDismiss();
      if (data && data.success) {
        this.showToast('¡Perfil creado! Ya puedes agendar tu cita.');
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error("Error abriendo modal:", error);
      this.showToast("No se pudo abrir el registro. Intenta de nuevo.");
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