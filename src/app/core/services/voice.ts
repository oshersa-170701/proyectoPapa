import { Injectable, inject } from '@angular/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { firstValueFrom } from 'rxjs';
import { MedicalService } from './medical';

interface HablarOpciones {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

// 📍 Voz de la app mientras está ABIERTA: usamos la voz de Google Cloud TTS (la misma
// que suena en la bocina Google Home) para que ANAasis no suene disparejo entre el
// teléfono y la bocina. Si no hay internet o Google TTS falla, caemos a la voz nativa
// del teléfono para que nunca se quede muda.
//
// 🚫 NO se usa para los recordatorios en segundo plano (app cerrada): esos hablan
// directo con voz nativa de Android desde RecordatorioBroadcastReceiver.kt, porque
// necesitan responder al instante sin depender de una llamada de red que podría
// fallar justo cuando el paciente más necesita escuchar el aviso.
@Injectable({ providedIn: 'root' })
export class Voice {
  private readonly medicalService = inject(MedicalService);
  private audioActual: HTMLAudioElement | null = null;
  private resolverAudioActual: (() => void) | null = null;

  async hablar(texto: string, opciones: HablarOpciones = {}): Promise<void> {
    const textoLimpio = texto?.trim();
    if (!textoLimpio) return;

    try {
      const res: any = await firstValueFrom(this.medicalService.generateTts(textoLimpio));
      if (res?.success && res.audio_url) {
        await this.reproducirAudio(res.audio_url);
        return;
      }
      console.warn('[Voice] generate_tts no devolvió audio_url, uso voz nativa de respaldo.');
    } catch (e) {
      console.warn('[Voice] Google TTS no disponible (¿sin internet?), uso voz nativa de respaldo:', e);
    }

    await TextToSpeech.speak({
      text: textoLimpio,
      lang: opciones.lang ?? 'es-MX',
      rate: opciones.rate ?? 1.05,
      pitch: opciones.pitch ?? 1.1,
      volume: opciones.volume ?? 1.0,
      category: 'ambient'
    });
  }

  private reproducirAudio(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.detenerAudioLocal();
      const audio = new Audio(url);
      this.audioActual = audio;
      this.resolverAudioActual = resolve;
      audio.onended = () => { this.resolverAudioActual = null; resolve(); };
      audio.onerror = (e) => { this.resolverAudioActual = null; reject(e); };
      audio.play().catch(reject);
    });
  }

  private detenerAudioLocal() {
    if (this.audioActual) {
      this.audioActual.pause();
      this.audioActual = null;
    }
    // 📍 Si alguien interrumpe la reproducción a la mitad (detener(), o una frase nueva
    // que reemplaza a esta), hay que resolver la promesa pendiente de la frase anterior
    // aquí mismo — si no, home.page.ts encadena cada speak() al anterior para que no se
    // hablen encimadas, y una promesa que nunca resuelve dejaría muda a la app para
    // siempre (todo lo que se intente decir después se quedaría esperando en la cola).
    if (this.resolverAudioActual) {
      const resolver = this.resolverAudioActual;
      this.resolverAudioActual = null;
      resolver();
    }
  }

  async detener(): Promise<void> {
    this.detenerAudioLocal();
    try {
      await TextToSpeech.stop();
    } catch { }
  }
}
