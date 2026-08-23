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
 /**
   * Sincroniza los signos vitales reales del sensor con la base de datos de Daniel
   * de forma atómica preservando el último valor de temperatura.
   */
  /**
   * Sincroniza los signos vitales reales del sensor preservando
   * atómicamente tanto la TEMPERATURA como el OXÍGENO prevíos de la BD.
   */
  async sincronizarConHealthConnect(phone: string, name: string, lat: number | null = null, lng: number | null = null) {
    try {
        // 🚀 Paso 1: Pedir mediciones al plugin nativo en Kotlin
        const data = await ANAasisHealth.obtenerMediciones();

        // 🌡️🩺 Paso 1.5: Consultar la última temperatura y oxígeno guardados en la BD
        let ultimaTemperatura = 0;
        let ultimoOxigeno = 0;

        try {
          const vitalsPrevios: any = await firstValueFrom(this.medicalService.getLatestVitals(phone));
          if (vitalsPrevios && vitalsPrevios.success && vitalsPrevios.data) {
            ultimaTemperatura = Number(vitalsPrevios.data.temperature || 0);
            ultimoOxigeno = Number(vitalsPrevios.data.spo2 || 0);
          }
        } catch (e) {
          console.warn("[Health Service] No se pudieron precargar los signos previos:", e);
        }
        
        // 🚀 Paso 2: Extraer valores del sensor y aplicar respaldos inteligentes
        const hrLectura = Math.round(Number(data.pulso || data.heart_rate || 0));
        const oxLectura = Math.round(Number(data.oxigeno || data.spo2 || 0));

        // Si la pulsera no midió oxígeno en este instante, conservamos el último SpO2 válido
        const oxigenoFinal = oxLectura > 0 ? oxLectura : (ultimoOxigeno > 0 ? ultimoOxigeno : 98);

        const vitalsData = {
            phone: phone,
            name: name,
            heart_rate: hrLectura,
            spo2: oxigenoFinal, // 👈 Preserva el oxígeno real (ej. 98%)
            sleep_hours: Number(data.horasSueno || 0).toFixed(1),
            steps: Math.round(Number(data.pasos || data.steps || 0)),
            calories: Number(data.calorias || data.calories || 0.0),
            temperature: ultimaTemperatura, // 👈 Preserva la temperatura (ej. 40.0°C)
            latitude: lat,
            longitude: lng
        };

        // 🚀 Paso 3: Enviar al PHP a través de MedicalService
        await firstValueFrom(this.medicalService.saveVitals(vitalsData));
        
        return {
            success: true,
            data: {
                pulso: vitalsData.heart_rate,
                oxigeno: vitalsData.spo2,
                horasSueno: vitalsData.sleep_hours,
                steps: vitalsData.steps,
                calories: vitalsData.calories,
                temperature: vitalsData.temperature
            }
        };
    } catch (error) {
        console.error('Error sincronizando:', error);
        return { success: false, data: { pulso: 0, oxigeno: 0, horasSueno: 0, steps: 0, calories: 0.0, temperature: 0 } };
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