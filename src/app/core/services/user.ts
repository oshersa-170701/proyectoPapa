import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class User {
  
// URL base que ya manejas en tus otros servicios
  private readonly API_URL = 'https://angelesmedic.com.mx/crm/api';
  private readonly USER_KEY = 'anaasis_user_data';

  constructor(private readonly http: HttpClient) {}

  /** * 📝 Registro de Usuario y Paciente
   * Consume el archivo register_user.php que creaste
   */
  registerUser(userData: any): Observable<any> {
  const body = {
    action: "register_user",
    api_key: "ANAASIS_2026", // 🔑 Agregamos la llave de seguridad
    password: "password_provisional_2026", // 🔐 Enviamos una clave (el PHP la exige)
    ...userData
  };

  // 📍 IMPORTANTE: Apunta a anaasis.php, que es donde tienes la lógica nueva
  return this.http.post(`${this.API_URL}/anaasis.php`, body).pipe(
    tap((res: any) => {
      if (res.success) {
        this.saveProfile({
          id: res.user_id,
          patient_id: res.patient_id,
          name: userData.name,
          phone: userData.phone,
          //email: userData.email
        });
      }
    })
  );
}

  /** 💾 Persistencia Local (Storage) */
  saveProfile(profile: any): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(profile));
  }

  getProfile(): any {
  const data = localStorage.getItem(this.USER_KEY);
  if (!data) return null;
  const profile = JSON.parse(data);
  // 🛡️ Aseguramos que el teléfono no tenga espacios ni basura
  if (profile.phone) {
    profile.phone = profile.phone.replace(/\D/g, '');
  }
  return profile;
}

  deleteProfile(): void {
  // 🧹 Borramos la identidad del usuario del disco
  localStorage.removeItem(this.USER_KEY);
}

  /** ✅ Verificación rápida */
  isLoggedIn(): boolean {
    return !!this.getProfile();
  }
  /** 🔑 Inicio de Sesión de Usuario */
loginUser(credentials: any): Observable<any> {
  const body = {
    action: "login_user",
    api_key: "ANAASIS_2026",
   phone: credentials.phone // 📍 Solo enviamos el teléfono
   
  };

  return this.http.post(`${this.API_URL}/anaasis.php`, body).pipe(
    tap((res: any) => {
      if (res.success) {
        this.saveProfile(res); // Guardamos la sesión activa
      }
    })
  );
}

}