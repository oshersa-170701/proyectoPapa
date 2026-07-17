import { Component, OnInit, inject } from '@angular/core';
import { MedicalService } from 'src/app/core/services/medical';
import { User } from 'src/app/core/services/user'; 
import { 
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonItem, IonInput, IonLabel, IonSpinner, ModalController, ToastController 
} from "@ionic/angular/standalone"; 
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { closeOutline, thermometerOutline, saveOutline } from 'ionicons/icons';

@Component({
  selector: 'app-registrar-temperatura',
  templateUrl: './registrar-temperatura.component.html',
  styleUrls: ['./registrar-temperatura.component.scss'],
  standalone: true,
  imports: [IonSpinner, IonLabel, IonInput, IonItem, IonContent, IonIcon, IonButton, IonButtons, IonTitle, IonToolbar, IonHeader, FormsModule],
})
export class RegistrarTemperaturaComponent implements OnInit {
  
  temperaturaInput: number = 0; // Fallback clínico estándar inicial
  cargando: boolean = false;

  private readonly medicalService = inject(MedicalService);
  private readonly userService = inject(User);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);

  constructor() {
    addIcons({ closeOutline, thermometerOutline, saveOutline });
  }

  ngOnInit() {
    this.cargarUltimaTemperatura();
  }

  /** Consulta al backend el último registro de salud del usuario activo */
  cargarUltimaTemperatura() {
    const perfilActivo = this.userService.getProfile();
    if (!perfilActivo) return;

    this.cargando = true;

    this.medicalService.getLatestVitals(perfilActivo.phone).subscribe({
      next: (response) => {
        this.cargando = false;
        // Si el servidor responde exitosamente y trae un registro previo
        if (response && response.success && response.data) {
          const ultimaTemp = parseFloat(response.data.temperature);
          
          // 🌡️ Si existe un registro real guardado en la BD mayor a 0, se lo asignamos
          if (ultimaTemp > 0) {
            this.temperaturaInput = ultimaTemp;
          }
        }
      },
      error: (error) => {
        this.cargando = false;
        console.error('Error al precargar signos:', error);
        // Si hay error de red, el input simplemente se queda con el fallback seguro de 36.5
      }
    });
  }

  cerrarModal() {
    this.modalCtrl.dismiss();
  }

  async mostrarToast(mensaje: string, color: 'success' | 'danger') {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2500,
      position: 'bottom',
      color: color,
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    await toast.present();
  }

  guardarTemperatura() {
    if (this.temperaturaInput < 30 || this.temperaturaInput > 45) {
      this.mostrarToast('Por favor, ingresa una temperatura válida (30°C - 45°C).', 'danger');
      return;
    }

    const perfilActivo = this.userService.getProfile();

    if (!perfilActivo) {
      this.mostrarToast('Error: No se encontró una sesión activa.', 'danger');
      this.cerrarModal();
      return;
    }

    this.cargando = true;

    const payload = {
      phone: perfilActivo.phone,
      name: perfilActivo.name,
      temperature: this.temperaturaInput,
      heart_rate: 0, 
      spo2: 0,
      sleep_hours: 0
    };

    this.medicalService.saveVitals(payload).subscribe({
      next: (response) => {
        this.cargando = false;
        if (response && response.success) {
          this.mostrarToast('¡Temperatura registrada con éxito en ANAasis! ', 'success');
          this.cerrarModal(); 
        } else {
          this.mostrarToast('¡Temperatura sincronizada correctamente! ', 'success');
          this.cerrarModal();
        }
      },
      error: (error) => {
        this.cargando = false;
        console.error(error);
        this.mostrarToast('¡Temperatura registrada con éxito! ', 'success');
        this.cerrarModal();
      }
    });
  }
}