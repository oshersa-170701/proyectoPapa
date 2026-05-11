import { Injectable } from '@angular/core';
import { registerPlugin } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
import { MedicalService } from './medical';

// Registramos el plugin que hiciste en Java
const ANAasisHealth = registerPlugin<any>('ANAasisHealth');

@Injectable({
  providedIn: 'root'
})
export class Health {

  constructor(private medicalService: MedicalService) { }

  /**
   * Sincroniza los signos vitales reales del sensor con la base de datos de Daniel
   */
  async sincronizarConHealthConnect(phone: string, name: string) {
    try {
        // 🚀 Paso 1: Pedir mediciones (El Java ahora busca 48h atrás)
        const data = await ANAasisHealth.obtenerMediciones();
        
        // 🚀 Paso 2: Asegurar valores numéricos (Limpieza total)
        const vitalsData = {
            phone: phone,
            name: name,
            heart_rate: Math.round(Number(data.pulso || 0)),
            spo2: Math.round(Number(data.oxigeno || 0)),
            sleep_hours: Number(data.horasSueno || 0).toFixed(1) // 1 decimal para sueño
        };

        // 🚀 Paso 3: Enviar al PHP
        await firstValueFrom(this.medicalService.saveVitals(vitalsData));
        
        return {
            success: true,
            data: {
                pulso: vitalsData.heart_rate,
                oxigeno: vitalsData.spo2,
                horasSueno: vitalsData.sleep_hours
            }
        };
    } catch (error) {
        console.error('Error sincronizando:', error);
        return { success: false, data: { pulso: 0, oxigeno: 0, horasSueno: 0 } };
    }
}
  async solicitarPermisosNativos() {
    try {
      return await ANAasisHealth.solicitarPermisos();
    } catch (error) {
      console.error("Error al solicitar permisos de salud:", error);
      throw error;
    }
  }
}