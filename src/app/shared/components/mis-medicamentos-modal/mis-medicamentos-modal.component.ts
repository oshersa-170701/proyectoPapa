import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 📍 necesario para [(ngModel)] del ion-select
import { firstValueFrom } from 'rxjs';
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
import { Anaconnect } from 'src/app/core/services/anaconnect';
import { formatearFrecuencia } from 'src/app/core/utils/frecuencia.util';
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

  bocinaConectada: { device_name: string; cast_id?: string } | null = null;
  cargandoBocina = true;
  verificandoBocina = false;

  readonly opcionesFrecuencia = [
    { value: 5 / 60, label: 'Cada 5 minutos (prueba)' },
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
  private readonly anaconnectService = inject(Anaconnect);

  constructor() {
    addIcons({closeOutline,alertCircleOutline,syncOutline,medicalOutline,alarmOutline,homeOutline});
  }

  ngOnInit() {
    this.cargarMedicamentos();
    this.cargarBocinaConectada();
  }

  private cargarBocinaConectada() {
    const phone = this.userService.getProfile()?.phone;
    if (!phone) {
      this.cargandoBocina = false;
      return;
    }

    this.cargandoBocina = true;
    this.medicalService.getGoogleHomeDevice(phone).subscribe({
      next: async (res: any) => {
        this.cargandoBocina = false;
        const bocina = res?.success && res.data?.cast_id ? res.data : null;

        if (!bocina) {
          this.bocinaConectada = null;
          return;
        }

        // Mostramos "conectada" de inmediato con el dato del servidor (para no hacer
        // esperar al paciente ~4s solo para abrir la lista de medicamentos) y, en
        // paralelo y en silencio, confirmamos que de verdad sea detectable ahora en la
        // red — si no lo es, se corrige solo a rojo sin necesidad de tocar nada.
        this.bocinaConectada = bocina;
        const detectada = await this.escanearBocina(bocina);
        this.bocinaConectada = detectada ? bocina : null;
      },
      error: () => {
        this.cargandoBocina = false;
        this.bocinaConectada = null;
      }
    });
  }

  // 📍 Botón "Reintentar" del indicador rojo: vuelve a preguntarle al servidor cuál
  // bocina está emparejada y, si hay una, confirma con un escaneo Cast ACTIVO y fresco
  // (discoverDevices) que de verdad esté prendida y respondiendo ahora mismo.
  //
  // Esto es distinto del bug de "No se encontró esa bocina" que arreglamos antes en
  // ANAasisConnectPlugin.speak(): aquel fallaba porque reproducía audio usando una lista
  // de rutas (router.routes) que Android ya había vaciado por quedarse varios segundos
  // sin escanear activamente — es decir, fallaba por NO volver a escanear. Aquí sí
  // hacemos un escaneo activo nuevo cada vez (4s, con CALLBACK_FLAG_PERFORM_ACTIVE_SCAN),
  // así que un resultado negativo es confiable: si no aparece, es porque de verdad está
  // apagada o fuera de la red, no por caché vencido.
  async reintentarConexionBocina() {
    if (this.verificandoBocina) return;
    this.verificandoBocina = true;

    const phone = this.userService.getProfile()?.phone;
    if (!phone) {
      this.verificandoBocina = false;
      await this.presentToastBocinaDesconectada();
      return;
    }

    try {
      const res: any = await firstValueFrom(this.medicalService.getGoogleHomeDevice(phone));
      const bocina = res?.success && res.data?.cast_id ? res.data : null;

      if (!bocina) {
        this.bocinaConectada = null;
        await this.presentToastBocinaDesconectada();
        return;
      }

      const detectada = await this.escanearBocina(bocina);
      this.bocinaConectada = detectada ? bocina : null;
      if (!detectada) await this.presentToastBocinaDesconectada();
    } catch (e) {
      console.error('[MisMedicamentos] Error reintentando conexión de bocina:', e);
      this.bocinaConectada = null;
      await this.presentToastBocinaDesconectada();
    } finally {
      this.verificandoBocina = false;
    }
  }

  // 📍 El plugin nativo (ANAasisConnectPlugin.discoverDevices) usa un único mapa
  // compartido para acumular las rutas Cast encontradas y lo limpia al arrancar cada
  // escaneo. Si esta pantalla dispara DOS escaneos a la vez (la verificación silenciosa
  // al abrir el modal + el botón "Reintentar" tocado casi al instante), el segundo
  // escaneo borra a medio camino los resultados del primero y viceversa — por eso el
  // botón a veces "sí conectaba" en la bocina pero la pantalla se quedaba cargando/roja,
  // como si hubiera fallado. Aquí forzamos que ambos caminos compartan la MISMA promesa
  // de escaneo en curso en vez de lanzar una segunda llamada nativa en paralelo.
  private escaneoEnCurso: Promise<boolean> | null = null;

  private escanearBocina(bocina: { device_name: string; cast_id?: string }): Promise<boolean> {
    if (this.escaneoEnCurso) return this.escaneoEnCurso;

    this.escaneoEnCurso = (async () => {
      try {
        const dispositivos = await this.anaconnectService.discoverDevices();
        return dispositivos.some(d => d.id === bocina.cast_id);
      } catch (e) {
        console.error('[MisMedicamentos] Error escaneando la red buscando la bocina:', e);
        return false;
      } finally {
        this.escaneoEnCurso = null;
      }
    })();

    return this.escaneoEnCurso;
  }

  private async presentToastBocinaDesconectada() {
    const toast = await this.toastController.create({
      message: 'La bocina se encuentra desconectada y no fue posible volver a conectarla. Asegúrate de que esté encendida y en la misma red WiFi que tu teléfono.',
      duration: 4000,
      position: 'top',
      cssClass: 'custom-toast-error'
    });
    await toast.present();
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

        // 📍 Diagnóstico: si el switch/hora se ven apagados tras guardar, esto muestra
        // exactamente qué valores de reminder_active/reminder_frequency_hours está
        // devolviendo el servidor recién recargado (para saber si el problema es que no
        // se guardó, o que sí se guardó pero no se está leyendo bien aquí).
        console.log('[MisMedicamentos] getPrescriptions crudo:', JSON.stringify(res.data));

        const consulta = (res.data?.consultation || []).map((p: any) => ({
          source_table: 'prescriptions' as const,
          source_id: p.id,
          nombre: p.nombre_comercial || p.nombre_generico || p.item || 'Medicamento',
          detalle: p.dosage || p.notes || '',
          reminder_active: !!p.reminder_active,
          reminder_frequency_hours: this.normalizarFrecuencia(p.reminder_frequency_hours),
          saving: false
        }));

        const hospital = (res.data?.hospitalization || []).map((h: any) => ({
          source_table: 'hospital_medication_orders' as const,
          source_id: h.id,
          nombre: h.nombre_comercial || h.nombre_generico || 'Medicamento',
          detalle: h.frequency || h.dose || '',
          reminder_active: !!h.reminder_active,
          reminder_frequency_hours: this.normalizarFrecuencia(h.reminder_frequency_hours),
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

  // 📍 El servidor guarda reminder_frequency_hours en una columna DECIMAL(6,4), así que
  // "Cada 5 minutos" (5/60 = 0.08333333333333333... en JS) vuelve de la base de datos
  // redondeado a "0.0833". Comparar esos dos números con === (como hacía el binding del
  // <ion-select>) nunca es verdadero, así que el select se veía "sin hora seleccionada"
  // aunque sí estuviera guardado. Aquí "enganchamos" el valor recibido a la opción
  // conocida más cercana para que el select siempre encuentre su selección.
  private normalizarFrecuencia(raw: any): number | null {
    if (raw === null || raw === undefined || raw === '') return null;
    const valor = Number(raw);
    if (!Number.isFinite(valor)) return null;

    const opcionCercana = this.opcionesFrecuencia.find(op => Math.abs(op.value - valor) < 0.01);
    return opcionCercana ? opcionCercana.value : valor;
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
            `${med.nombre} — cada ${formatearFrecuencia(med.reminder_frequency_hours)}.`
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
    // 📍 Al cerrar (haya emparejado, desvinculado o solo mirado), refrescamos el
    // indicador de bocina conectada para que nunca quede desactualizado.
    await modal.onDidDismiss();
    this.cargarBocinaConectada();
  }
}