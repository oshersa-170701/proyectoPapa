import { Injectable } from '@angular/core';
import { NativeBiometric } from 'capacitor-native-biometric';

const SERVER_KEY = 'com.anaasis.vitals';

@Injectable({ providedIn: 'root' })
export class BiometricService {

  async isAvailable(): Promise<boolean> {
    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch {
      return false;
    }
  }

  async hasCredentials(): Promise<boolean> {
    try {
      await NativeBiometric.getCredentials({ server: SERVER_KEY });
      return true;
    } catch {
      return false;
    }
  }

  async savePhone(phone: string): Promise<void> {
    await NativeBiometric.setCredentials({
      username: phone,
      password: 'anaasis_bio',
      server: SERVER_KEY
    });
  }

  // Shows the OS biometric prompt; resolves to phone or null on failure/cancel.
  async authenticateAndGetPhone(): Promise<string | null> {
    try {
      await NativeBiometric.verifyIdentity({
        reason: 'Para confirmar tu identidad',
        title: 'ANAasis Vitals',
        subtitle: 'Usa tu huella digital',
        description: 'Toca el sensor de huella para entrar'
      });
      const credentials = await NativeBiometric.getCredentials({ server: SERVER_KEY });
      return credentials.username;
    } catch {
      return null;
    }
  }

  async deleteCredentials(): Promise<void> {
    try {
      await NativeBiometric.deleteCredentials({ server: SERVER_KEY });
    } catch { /* no credentials stored, ignore */ }
  }
}
