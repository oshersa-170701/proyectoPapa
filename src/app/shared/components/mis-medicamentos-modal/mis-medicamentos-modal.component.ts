import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 📍 necesario para [(ngModel)] del ion-select
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonSpinner, IonList, IonItem, IonLabel, IonToggle, IonSelect, IonSelectOption, ModalController
} from '@ionic/angular/standalone';
import { ToastController, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, medicalOutline, alarmOutline, alertCircleOutline, syncOutline, homeOutline } from 'ionicons/icons';
import { MedicalService } from 'src/app/core/services/medical';
import { User } from 'src/app/core/services/user';
import { ReminderScheduler } from 'src/app/core/services/reminder-scheduler';
import { AnaconnectModalComponent } from 'src/app/shared/components/anaconnect-modal/anaconnect-modal.component';

interface MedicamentoUI {
  source_table: 'prescriptions' | 'hospital_medication_orders';
  source_id: number;
  nombre: string;
  detalle: string;
  reminder_active: boolean;
  reminder_frequency_hours: number | null;
  saving: boolean;
}

@Component({
  selector: 'app-mis-medicamentos-modal',
  templateUrl: './mis-medicamentos-modal.component.html',
  styleUrls: ['./mis-medicamentos-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
    IonIcon, IonSpinner, IonList, IonItem, IonLabel, IonToggle, IonSelect, IonSelectOption
  ]
})
export class MisMedicamentosModalComponent implements OnInit {

  medicamentos: MedicamentoUI[] = [];
  isLoading = true;
  errorMsg = '';

  readonly opcionesFrecuencia = [
    { value: 6, label: 'Cada 6 horas' },
    { value: 8, label: 'Cada 8 horas' },
    { value: 12, label: 'Cada 12 horas' },
    { value: 24, label: 'Cada 24 horas' },
  ];

  private readonly medicalService = inject(MedicalService);
  private readonly userService = inject(User);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);
  private readonly reminderScheduler = inject(ReminderScheduler);

  constructor() {
    addIcons({closeOutline,alertCircleOutline,syncOutline,medicalOutline,alarmOutline,homeOutline});
  }

  ngOnInit() {
    this.cargarMedicamentos();
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
cargarMedicamentos() {
    const profile = this.userService.getProfile();
    if (!profile?.patient_id) {
      this.errorMsg = 'No encontré tu expediente de paciente.';
      this.isLoading = false;
      return;
    }

    // 🚀 Activamos el indicador de carga y limpiamos el error anterior
    this.isLoading = true;
    this.errorMsg = '';

    this.medicalService.getPrescriptions(profile.patient_id).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (!res?.success) {
          this.errorMsg = 'No se pudieron cargar tus medicamentos.';
          return;
        }

        const consulta = (res.data?.consultation || []).map((p: any) => ({
          source_table: 'prescriptions' as const,
          source_id: p.id,
          nombre: p.nombre_comercial || p.nombre_generico || p.item || 'Medicamento',
          detalle: p.dosage || p.notes || '',
          reminder_active: !!p.reminder_active,
          reminder_frequency_hours: p.reminder_frequency_hours ? Number(p.reminder_frequency_hours) : null,
          saving: false
        }));

        const hospital = (res.data?.hospitalization || []).map((h: any) => ({
          source_table: 'hospital_medication_orders' as const,
          source_id: h.id,
          nombre: h.nombre_comercial || h.nombre_generico || 'Medicamento',
          detalle: h.frequency || h.dose || '',
          reminder_active: !!h.reminder_active,
          reminder_frequency_hours: h.reminder_frequency_hours ? Number(h.reminder_frequency_hours) : null,
          saving: false
        }));

        this.medicamentos = [...consulta, ...hospital];
      },
      error: () => {
        this.isLoading = false;
        this.errorMsg = 'Error de conexión al consultar tus medicamentos.';
      }
    });
  }

  onToggleChange(med: MedicamentoUI, activo: boolean) {
    med.reminder_active = activo;

    if (activo && !med.reminder_frequency_hours) {
      med.reminder_frequency_hours = 8; // valor por defecto razonable
    }

    this.guardar(med);
  }

  onFrecuenciaChange(med: MedicamentoUI) {
    if (med.reminder_active) {
      this.guardar(med);
    }
  }

  private guardar(med: MedicamentoUI) {
    med.saving = true;
    console.log('[MisMedicamentos] Guardando recordatorio:', med.source_table, med.source_id, 'active=', med.reminder_active, 'freq=', med.reminder_frequency_hours);

    this.medicalService.setMedicationReminder({
      source_table: med.source_table,
      source_id: med.source_id,
      active: med.reminder_active ? 1 : 0,
      frequency_hours: med.reminder_frequency_hours
    }).subscribe({
      next: async (res: any) => {
        med.saving = false;
        console.log('[MisMedicamentos] Respuesta del servidor a set_medication_reminder:', JSON.stringify(res));

        if (!res?.success) {
          this.errorMsg = res?.error || 'No se pudo guardar el recordatorio.';
          await this.presentAlerta('Error', this.errorMsg);
          return;
        }

        if (med.reminder_active) {
          await this.reminderScheduler.programarRecordatorio({
            source_table: med.source_table,
            source_id: med.source_id,
            nombre: med.nombre,
            frequency_hours: med.reminder_frequency_hours
          });
          await this.presentAlerta(
            'Recordatorio activado',
            `${med.nombre} — cada ${med.reminder_frequency_hours} horas.\n\nEsto queda guardado en el servidor: si al volver a abrir "Mis medicamentos" el switch aparece apagado de nuevo, avísame porque significa que el guardado en el servidor no se está reflejando.`
          );
        } else {
          await this.reminderScheduler.cancelarRecordatorio(med);
          await this.presentAlerta('Recordatorio desactivado', `${med.nombre} ya no te recordará.`);
        }
      },
      error: (err) => {
        med.saving = false;
        console.error('[MisMedicamentos] Error de conexión guardando recordatorio:', JSON.stringify(err));
        this.errorMsg = 'Error de conexión al guardar el recordatorio.';
      }
    });
  }

  private async presentAlerta(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  private async presentToast(mensaje: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2500,
      position: 'top', // 'bottom' quedaba tapado por la hoja del modal (breakpoints 0.7/0.9)
      color: 'dark'
    });
    await toast.present();
  }

  async abrirAnaConnect() {
    const modal = await this.modalCtrl.create({
      component: AnaconnectModalComponent,
      mode: 'ios',
      backdropDismiss: true,
      breakpoints: [0, 0.6, 0.9],
      initialBreakpoint: 0.6,
      handle: false
    });
    await modal.present();
  }
}