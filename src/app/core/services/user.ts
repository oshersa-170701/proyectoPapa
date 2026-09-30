import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { environment } from '../../../environments/environment';

const USER_KEY = 'anaasis_user_data';
export const SESSION_TOKEN_KEY = 'anaasis_session_token';

@Injectable({
  providedIn: 'root',
})
export class User {
  private readonly API_URL = environment.apiUrl;

  // Cache en memoria para que getProfile() e isLoggedIn() sean síncronos.
  // Preferences (EncryptedSharedPreferences en Android) es la fuente de verdad
  // persistente; el cache se hidrata una sola vez al arrancar la app.
  private profileCache: any = null;

  constructor(private readonly http: HttpClient) {
    this.loadCacheFromStorage();
  }

  private async loadCacheFromStorage(): Promise<void> {
    const { value } = await Preferences.get({ key: USER_KEY });
    if (value) {
      this.profileCache = JSON.parse(value);
      if (this.profileCache?.phone) {
        this.profileCache.phone = this.profileCache.phone.replace(/\D/g, '');
      }
    }
  }

  registerUser(userData: any): Observable<any> {
    const body = { action: 'register_user', ...userData };
    return this.http.post(`${this.API_URL}/anaasis.php`, body).pipe(
      tap((res: any) => {
        if (res.success) {
          this.saveProfile({
            id: res.user_id,
            patient_id: res.patient_id,
            name: userData.name,
            phone: userData.phone,
          });
          // Save session token when PHP returns it (after server update)
          if (res.token) {
            Preferences.set({ key: SESSION_TOKEN_KEY, value: res.token });
          }
        }
      })
    );
  }

  saveProfile(profile: any): void {
    this.profileCache = profile;
    Preferences.set({ key: USER_KEY, value: JSON.stringify(profile) });
  }

  getProfile(): any {
    return this.profileCache;
  }

  deleteProfile(): void {
    this.profileCache = null;
    Preferences.remove({ key: USER_KEY });
    Preferences.remove({ key: SESSION_TOKEN_KEY });
  }

  isLoggedIn(): boolean {
    return !!this.profileCache;
  }

  loginUser(credentials: any): Observable<any> {
    const body = { action: 'login_user', phone: credentials.phone };
    return this.http.post(`${this.API_URL}/anaasis.php`, body).pipe(
      tap((res: any) => {
        if (res.success) {
          this.saveProfile(res);
          // Save session token when PHP returns it (after server update)
          if (res.token) {
            Preferences.set({ key: SESSION_TOKEN_KEY, value: res.token });
          }
        }
      })
    );
  }
}
