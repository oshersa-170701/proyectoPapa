import { Injectable, inject } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { firstValueFrom } from 'rxjs';
import { Anaconnect } from './anaconnect';
import { MedicalService } from './medical';
import { User } from './user';

export interface MedicamentoParaRecordatorio {
  source_table: 'prescriptions' | 'hospital_medication_orders';
  source_id: number;
  nombre: string;
  frequency_hours: number | null;
}

const TABLE_CODE: Record<string, number> = {
  prescriptions: 1,
  hospital_medication_orders: 2
};

// 24 / 6 = 4 tomas al día es el caso más frecuente que soportamos
const MAX_SLOTS = 4;
const HORA_PRIMERA_TOMA = 8; // 8:00 a.m.

// Slot reservado (no colisiona con los 0-3 de arriba) para la opción de prueba
// "cada 5 minutos", que no se reparte en horarios fijos del día.
const SLOT_PRUEBA = 9;

@Injectable({
  providedIn: 'root'
})
export class ReminderScheduler {

  private readonly anaconnectService = inject(Anaconnect);
  private readonly medicalService = inject(MedicalService);
  private readonly userService = inject(User);

  // IDs deterministas por medicamento+slot para poder cancelarlos sin recordar el estado anterior
  private idsDelMedicamento(med: { source_table: string; source_id: number }): number[] {
    const tableCode = TABLE_CODE[med.source_table] ?? 9;
    const ids: number[] = [];
    for (let slot = 0; slot < MAX_SLOTS; slot++) {
      ids.push(med.source_id * 100 + tableCode * 10 + slot);
    }
    return ids;
  }

  private idDePrueba(med: { source_table: string; source_id: number }): number {
    const tableCode = TABLE_CODE[med.source_table] ?? 9;
    return med.source_id * 100 + tableCode * 10 + SLOT_PRUEBA;
  }

  async solicitarPermisos(): Promise<boolean> {
    const actual = await LocalNotifications.checkPermissions();
    if (actual.display === 'granted') return true;

    const solicitado = await LocalNotifications.requestPermissions();
    return solicitado.display === 'granted';
  }

  async cancelarRecordatorio(med: { source_table: 'prescriptions' | 'hospital_medication_orders'; source_id: number }): Promise<void> {
    const ids = this.idsDelMedicamento(med);
    const notifications = ids.map(id => ({ id }));
    try {
      await LocalNotifications.cancel({ notifications });
    } catch (error) {
      console.error('[ReminderScheduler] Error cancelando notificaciones locales:', error);
    }

    // 📍 También cancelamos el anuncio nativo en segundo plano (voz + bocina) de cada slot,
    // incluyendo el slot reservado para la opción de prueba "cada 5 minutos".
    await Promise.all([
      ...ids.map(id => this.anaconnectService.cancelarAnuncioSegundoPlano(id)),
      this.anaconnectService.cancelarAnuncioSegundoPlano(this.idDePrueba(med))
    ]);
  }

  async programarRecordatorio(med: MedicamentoParaRecordatorio): Promise<void> {
    // Siempre limpiamos primero para no dejar huérfanas si el paciente cambió la frecuencia
    await this.cancelarRecordatorio(med);

    if (!med.frequency_hours || med.frequency_hours <= 0) return;

    const tienePermiso = await this.solicitarPermisos();
    if (!tienePermiso) {
      console.warn('[ReminderScheduler] Permiso de notificaciones no concedido, no se programó nada.');
      return;
    }

    const frecuencia = med.frequency_hours;
    const texto = `Es momento de tomar: ${med.nombre}`;

    if (frecuencia < 1) {
      // 🧪 Opción de prueba (menos de 1 hora, ej. "cada 5 minutos"): se repite desde
      // ahora, no se reparte en horarios fijos del día. Solo va por la alarma nativa
      // (voz + bocina + su propia notificación), @capacitor/local-notifications no
      // soporta repetir en intervalos menores a una hora.
      const minutos = Math.max(1, Math.round(frecuencia * 60));
      const castId = await this.obtenerCastIdEmparejado();
      await this.anaconnectService.programarAnuncioSegundoPlano({
        requestCode: this.idDePrueba(med),
        texto: `[PRUEBA] ${texto}`,
        castId,
        hour: 0,
        minute: 0,
        intervalMinutes: minutos
      });
      return;
    }

    const slots = 24 / frecuencia;
    const ids = this.idsDelMedicamento(med);

    const notifications = Array.from({ length: slots }, (_, slot) => {
      const hora = (HORA_PRIMERA_TOMA + slot * frecuencia) % 24;
      return {
        id: ids[slot],
        title: 'Hora de tu medicamento',
        body: texto,
        schedule: { on: { hour: hora, minute: 0 }, allowWhileIdle: true },
        smallIcon: 'ic_stat_anaasis',
        largeIcon: 'ic_notification_large',
        iconColor: '#00A0AB',
        extra: {
          medicamento: med.nombre,
          source_table: med.source_table,
          source_id: med.source_id
        }
      };
    });

    try {
      await LocalNotifications.schedule({ notifications });
    } catch (error) {
      console.error('[ReminderScheduler] Error programando notificaciones locales:', error);
    }

    // 📍 Además de la notificación visual, programamos que ANAasis hable el recordatorio
    // (y lo anuncie en la bocina Google Home, si hay una emparejada) con una alarma
    // nativa que funciona aunque la app esté cerrada, no solo minimizada.
    const castId = await this.obtenerCastIdEmparejado();
    await Promise.all(
      Array.from({ length: slots }, (_, slot) => {
        const hora = (HORA_PRIMERA_TOMA + slot * frecuencia) % 24;
        return this.anaconnectService.programarAnuncioSegundoPlano({
          requestCode: ids[slot],
          texto,
          castId,
          hour: hora,
          minute: 0
        });
      })
    );
  }

  /**
   * Re-programa todos los recordatorios activos del paciente para que apunten a la
   * bocina recién emparejada (o dejen de castear si se desvinculó). Sin esto, un
   * recordatorio activado ANTES de emparejar/cambiar de bocina se quedaba apuntando
   * a la bocina vieja (o a ninguna) hasta que el paciente volvía a tocar el switch.
   */
  async resincronizarBocinaEnTodosLosRecordatorios(patientId: number): Promise<void> {
    try {
      const res: any = await firstValueFrom(this.medicalService.getPrescriptions(patientId));
      if (!res?.success) return;

      const consulta = (res.data?.consultation || [])
        .filter((p: any) => !!p.reminder_active)
        .map((p: any) => ({
          source_table: 'prescriptions' as const,
          source_id: p.id,
          nombre: p.nombre_comercial || p.nombre_generico || p.item || 'Medicamento',
          frequency_hours: p.reminder_frequency_hours ? Number(p.reminder_frequency_hours) : null
        }));

      const hospital = (res.data?.hospitalization || [])
        .filter((h: any) => !!h.reminder_active)
        .map((h: any) => ({
          source_table: 'hospital_medication_orders' as const,
          source_id: h.id,
          nombre: h.nombre_comercial || h.nombre_generico || 'Medicamento',
          frequency_hours: h.reminder_frequency_hours ? Number(h.reminder_frequency_hours) : null
        }));

      const activos: MedicamentoParaRecordatorio[] = [...consulta, ...hospital];
      for (const med of activos) {
        await this.programarRecordatorio(med);
      }
    } catch (error) {
      console.error('[ReminderScheduler] Error re-sincronizando recordatorios con la nueva bocina:', error);
    }
  }

  private async obtenerCastIdEmparejado(): Promise<string | null> {
    const phone = this.userService.getProfile()?.phone;
    if (!phone) return null;

    try {
      const res: any = await firstValueFrom(this.medicalService.getGoogleHomeDevice(phone));
      return res?.success && res.data?.cast_id ? res.data.cast_id : null;
    } catch (error) {
      console.warn('[ReminderScheduler] No se pudo consultar la bocina emparejada:', error);
      return null;
    }
  }
}
