import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MedicalService {
  //  Esta es la URL correcta según lo que te pasaron por WhatsApp
  private readonly API_URL = 'https://angelesmedic.com.mx/crm/api';

  constructor(private readonly http: HttpClient) { }

  /**  Chat con ANAasis */
  sendMessage(message: string): Observable<any> {
    return this.http.post(`${this.API_URL}/chat.php`, { message });
  }

  /**  Lista de Doctores */
  getDoctors(): Observable<any> {
    return this.http.get(`${this.API_URL}/doctors.php`);
  }

  /**  Hospitales cercanos */
  getNearbyHospitals(lat: number, lng: number): Observable<any> {
    // Usamos los nombres de parámetros que Daniel puso: lat y lng
    return this.http.get(`${this.API_URL}/places.php?lat=${lat}&lng=${lng}`);
  }
  // Añade este método a tu clase MedicalService
  // En src/app/core/services/medical.ts
  //ESTA ES LA FUNCION PARA OBTENER DOCTORES CERCANOS, APUNTA AL ENDPOINT CORRECTO Y USA LOS PARAMETROS QUE TE PASARON POR WHATSAPP
  getNearbyDoctors(lat: number, lng: number): Observable<any> {
    const body = {
      action: "get_doctors_nearby",
      api_key: "ANAASIS_2026", //  Agregamos la llave por si Daniel la pide
      lat: lat,
      lng: lng
    };
    return this.http.post(`${this.API_URL}/anaasis.php`, body); //  Usamos el endpoint correcto para obtener doctores cercanos
  }
  /** Obtener horarios disponibles desde agenda_service.php */
  getAvailability(doctorId: number, date: string): Observable<any> {
    const body = {
      action: "get_slots", // La acción que definimos en el PHP
      doctor_id: doctorId,
      date: date, // Formato YYYY-MM-DD
      api_key: "ANAASIS_2026"
    };
    // Apuntamos al nuevo archivo de agenda
    return this.http.post(`${this.API_URL}/agenda_service.php`, body);
  }
  createAppointment(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}/agenda_service.php`, data);
  }
  enviarAlertaAmbulancia(lat: number, lng: number, detalle: string): Observable<any> {
    // Ahora apuntamos a tu proxy
    const url = `${this.API_URL}/sos_proxy.php`;
    const body = {
      latitud: lat,
      longitud: lng,
      paciente: detalle
    };
    return this.http.post(url, body);
  }
  /** Obtener el historial de citas del usuario por su teléfono */
getUserAppointments(phone: string): Observable<any> {
  const body = {
    action: "get_user_appointments",
    api_key: "ANAASIS_2026",
    phone: phone
  };
  return this.http.post(`${this.API_URL}/anaasis.php`, body);
}
/** Cancelar una cita médica */
cancelAppointment(appointmentId: number): Observable<any> {
  const body = {
    action: "cancel_appointment",
    api_key: "ANAASIS_2026",
    appointment_id: appointmentId
  };
  return this.http.post(`${this.API_URL}/anaasis.php`, body);
}
/** Guardar signos (vienen de la pulsera o manual) */
saveVitals(vitalsData: any): Observable<any> {
  return this.http.post(`${this.API_URL}/anaasis.php`, {
    action: "save_vitals",
    api_key: "ANAASIS_2026",
    phone: vitalsData.phone,
    name: vitalsData.name,
    heart_rate: vitalsData.heart_rate, // Aseguramos que el nombre coincida con el PHP
    glucose: vitalsData.glucose || 0,
    pressure_sys: vitalsData.pressure_sys || 0,
    pressure_dia: vitalsData.pressure_dia || 0,
    temperature: vitalsData.temperature || 0,
    spo2: vitalsData.spo2 || 0
  });
}

/** Obtener los últimos signos para mostrar en el modal */
getLatestVitals(phone: string): Observable<any> {
  return this.http.post(`${this.API_URL}/anaasis.php`, {
    action: "get_vitals",
    api_key: "ANAASIS_2026",
    phone: phone
  });
}
}