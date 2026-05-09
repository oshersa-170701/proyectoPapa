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
      // 1. Obtener datos del sensor real (Plugin Java)
      const data = await ANAasisHealth.obtenerMediciones();
      
      // 2. Formatear para el servidor (anaasis.php)
      const vitalsData = {
        phone: phone,
        name: name,
        heart_rate: data.pulso,
        spo2: data.oxigeno,
        sleep_hours: data.horasSueno
      };

      // 3. Enviar a la API de ángelesmedic
      const response = await firstValueFrom(this.medicalService.saveVitals(vitalsData));
      
      return {
        success: true,
        data: data,
        server: response
      };
    } catch (error) {
      console.error('Error sincronizando salud:', error);
      throw error;
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