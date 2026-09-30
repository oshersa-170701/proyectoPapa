import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MedicalService {
  private readonly API_URL = environment.apiUrl;

  constructor(private readonly http: HttpClient) { }

  /** Chat con ANAasis — F-06: api_key inyectada por interceptor */
  sendMessage(message: string): Observable<any> {
    return this.http.post(`${this.API_URL}/chat.php`, { message });
  }

  /** Lista de Doctores */
  getDoctors(): Observable<any> {
    return this.http.get(`${this.API_URL}/doctors.php`);
  }

  /** Hospitales cercanos */
  getNearbyHospitals(lat: number, lng: number): Observable<any> {
    return this.http.get(`${this.API_URL}/places.php?lat=${lat}&lng=${lng}`);
  }

  getNearbyDoctors(lat: number, lng: number): Observable<any> {
    return this.http.post(`${this.API_URL}/anaasis.php`, {
      action: 'get_doctors_nearby',
      lat,
      lng
    });
  }

  getAvailability(doctorId: number, date: string): Observable<any> {
    return this.http.post(`${this.API_URL}/anaasis.php`, {
      action: 'get_slots',
      doctor_id: doctorId,
      date
    });
  }

  createAppointment(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}/anaasis.php`, {
      ...data,
      action: 'create_appointment'
    });
  }

  enviarAlertaAmbulancia(lat: number, lng: number, detalle: string, phone: string): Observable<any> {
    return this.http.post(`${this.API_URL}/sos_proxy.php`, {
      latitud: lat,
      longitud: lng,
      paciente: detalle,
      telefono: phone
    });
  }

  getUserAppointments(phone: string): Observable<any> {
    return this.http.post(`${this.API_URL}/anaasis.php`, {
      action: 'get_user_appointments',
      phone
    });
  }

  cancelAppointment(appointmentId: number): Observable<any> {
    return this.http.post(`${this.API_URL}/anaasis.php`, {
      action: 'cancel_appointment',
      appointment_id: appointmentId
    });
  }

  saveVitals(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}/anaasis.php`, {
      action: 'save_vitals',
      phone: data.phone,
      name: data.name,
      heart_rate: data.heart_rate || 0,
      spo2: data.spo2 || 0,
      sleep_hours: data.sleep_hours || 0,
      temperature: data.temperature || 0,
      steps: data.steps || 0,
      calories: data.calories || 0.0,
      latitude: data.latitude || null,
      longitude: data.longitude || null
    });
  }

  getLatestVitals(phone: string): Observable<any> {
    return this.http.post(`${this.API_URL}/anaasis.php`, {
      action: 'get_vitals',
      phone
    });
  }

  getEmergencyTracking(phone: string): Observable<any> {
    return this.http.post(`${this.API_URL}/anaasis.php`, {
      action: 'get_emergency_tracking',
      phone
    });
  }

  getPrescriptions(patientId: number): Observable<any> {
    return this.http.post(`${this.API_URL}/anaasis_v2.php`, {
      action: 'get_prescriptions',
      patient_id: patientId
    });
  }

  setMedicationReminder(data: {
    source_table: 'prescriptions' | 'hospital_medication_orders';
    source_id: number;
    active: 0 | 1;
    frequency_hours: number | null;
  }): Observable<any> {
    return this.http.post(`${this.API_URL}/anaasis.php`, {
      action: 'set_medication_reminder',
      ...data
    });
  }

  saveGoogleHomeDevice(phone: string, deviceName: string | null, castId: string | null): Observable<any> {
    return this.http.post(`${this.API_URL}/anaasis.php`, {
      action: 'save_google_home_device',
      phone,
      device_name: deviceName,
      cast_id: castId
    });
  }

  getGoogleHomeDevice(phone: string): Observable<any> {
    return this.http.post(`${this.API_URL}/anaasis.php`, {
      action: 'get_google_home_device',
      phone
    });
  }

  generateTts(text: string): Observable<any> {
    return this.http.post(`${this.API_URL}/anaasis.php`, {
      action: 'generate_tts',
      text
    });
  }
}
