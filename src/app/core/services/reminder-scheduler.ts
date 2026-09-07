import { Injectable } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';

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

@Injectable({
  providedIn: 'root'
})
export class ReminderScheduler {

  // IDs deterministas por medicamento+slot para poder cancelarlos sin recordar el estado anterior
  private idsDelMedicamento(med: { source_table: string; source_id: number }): number[] {
    const tableCode = TABLE_CODE[med.source_table] ?? 9;
    const ids: number[] = [];
    for (let slot = 0; slot < MAX_SLOTS; slot++) {
      ids.push(med.source_id * 100 + tableCode * 10 + slot);
    }
    return ids;
  }

  async solicitarPermisos(): Promise<boolean> {
    const actual = await LocalNotifications.checkPermissions();
    if (actual.display === 'granted') return true;

    const solicitado = await LocalNotifications.requestPermissions();
    return solicitado.display === 'granted';
  }

  async cancelarRecordatorio(med: { source_table: 'prescriptions' | 'hospital_medication_orders'; source_id: number }): Promise<void> {
    const notifications = this.idsDelMedicamento(med).map(id => ({ id }));
    try {
      await LocalNotifications.cancel({ notifications });
    } catch (error) {
      console.error('[ReminderScheduler] Error cancelando notificaciones locales:', error);
    }
  }

  async programarRecordatorio(med: MedicamentoParaRecordatorio): Promise<void> {
    // Siempre limpiamos primero para no dejar huérfanas si el paciente cambió la frecuencia
    await this.cancelarRecordatorio(med);

    if (!med.frequency_hours) return;

    const tienePermiso = await this.solicitarPermisos();
    if (!tienePermiso) {
      console.warn('[ReminderScheduler] Permiso de notificaciones no concedido, no se programó nada.');
      return;
    }

    const frecuencia = med.frequency_hours;
    const slots = 24 / frecuencia;
    const ids = this.idsDelMedicamento(med);

    const notifications = Array.from({ length: slots }, (_, slot) => {
      const hora = (HORA_PRIMERA_TOMA + slot * frecuencia) % 24;
      return {
        id: ids[slot],
        title: 'Hora de tu medicamento',
        body: `Es momento de tomar: ${med.nombre}`,
        schedule: { on: { hour: hora, minute: 0 }, allowWhileIdle: true },
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
  }
}
