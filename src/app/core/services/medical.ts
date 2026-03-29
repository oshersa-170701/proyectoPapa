import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MedicalService {
  // 📍 Esta es la URL correcta según lo que te pasaron por WhatsApp
  private readonly API_URL = 'https://angelesmedic.com.mx/crm/api'; 

  constructor(private http: HttpClient) {}

  /** 🤖 Chat con ANAasis */
  sendMessage(message: string): Observable<any> {
    return this.http.post(`${this.API_URL}/chat.php`, { message });
  }

  /** 👨‍⚕️ Lista de Doctores */
  getDoctors(): Observable<any> {
    return this.http.get(`${this.API_URL}/doctors.php`);
  }

  /** 🏥 Hospitales cercanos */
  getNearbyHospitals(lat: number, lng: number): Observable<any> {
    // Usamos los nombres de parámetros que Daniel puso: lat y lng
    return this.http.get(`${this.API_URL}/places.php?lat=${lat}&lng=${lng}`);
  }
}