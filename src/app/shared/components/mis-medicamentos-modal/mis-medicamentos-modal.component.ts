import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 📍 necesario para [(ngModel)] del ion-select
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonSpinner, IonList, IonItem, IonLabel, IonToggle, IonSelect, IonSelectOption, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, medicalOutline, alarmOutline } from 'ionicons/icons';
import { MedicalService } from 'src/app/core/services/medical';
import { User } from 'src/app/core/services/user';

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

  constructor() {
    addIcons({ closeOutline, medicalOutline, alarmOutline });
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

    this.medicalService.setMedicationReminder({
      source_table: med.source_table,
      source_id: med.source_id,
      active: med.reminder_active ? 1 : 0,
      frequency_hours: med.reminder_frequency_hours
    }).subscribe({
      next: (res: any) => {
        med.saving = false;
        if (!res?.success) {
          this.errorMsg = res?.error || 'No se pudo guardar el recordatorio.';
        }
      },
      error: () => {
        med.saving = false;
        this.errorMsg = 'Error de conexión al guardar el recordatorio.';
      }
    });
  }
}