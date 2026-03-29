import { ChangeDetectorRef, Component, ElementRef, inject, NgZone, ViewChild } from '@angular/core'; // Usaremos inject para más limpieza
import {
  IonContent, IonFooter, IonGrid, IonRow, IonCol, IonIcon, IonSpinner
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { medical, chatbubbleEllipses, mic, star, business, locationOutline, personOutline, chevronForward, call, closeCircle } from 'ionicons/icons';

// Importación del Servicio y HttpClient

// Componentes
import { UserMessageComponent } from '../shared/components/user-message/user-message.component';
import { BotMessageComponent } from '../shared/components/bot-message/bot-message.component';
import { ChatOptionsComponent } from "../shared/components/chat-options/chat-options.component";
import { DoctorListComponent } from "../shared/components/doctor-list/doctor-list.component";
import { HospitalListComponent } from "../shared/components/hospital-list/hospital-list.component";
import { MedicalMapComponent } from "../shared/components/medical-map/medical-map.component";
import { MedicalService } from '../core/services/medical';
import { Geolocation } from '@capacitor/geolocation';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonSpinner,
    CommonModule, IonContent, IonFooter, IonGrid, IonRow, IonCol, IonIcon,
    UserMessageComponent, BotMessageComponent, ChatOptionsComponent,
    DoctorListComponent, HospitalListComponent, MedicalMapComponent
  ],
})
export class HomePage {
  showHospitals = false;
  showDoctors = false;
  
  isLoading = false; // Nueva variable de control
  // Arreglos que se llenarán con la API
  listadoHospitales: any[] = [];
  listadoDoctores: any[] = [];
  isRecording = false;
  recognition: any;
  showChatOptions = false;
  miUbicacionActual: any = null;
  // Arreglo para manejar el historial del chat
  chatMessages: { role: 'user' | 'bot', text: string }[] = [
    {
      role: 'bot',
      text: 'Hola, soy tu asistente virtual ANAasis. ¿En qué puedo ayudarte hoy?'
    }
  ];
  constructor(private medicalService: MedicalService, private cdr: ChangeDetectorRef, private zone: NgZone) {
    // Añadí los iconos que usan tus listas para que no den error
    addIcons({closeCircle,call,medical,mic,chatbubbleEllipses,star,business,locationOutline,personOutline,chevronForward});
    this.initSpeechRecognition();
  }
  async initSpeechRecognition() {
    // Verificamos si el plugin está disponible
    const available = await SpeechRecognition.available();
    if (available) {
      // Opcional: Pedir permisos explícitamente al iniciar
      await SpeechRecognition.requestPermissions();
    }
  }
  async startListening() {
    console.log("🟢 Intentando abrir micrófono...");

    // 📍 LA CLAVE: Silenciamos al bot inmediatamente al tocar el micro
    try {
      await TextToSpeech.stop();
    } catch (e) {
      console.warn("Nada que detener en TTS");
    }

    try {
      const status: any = await SpeechRecognition.requestPermissions();

      if (status.speechRecognition === 'granted' || status.speech === 'granted') {
        this.isRecording = true;

        const result = await SpeechRecognition.start({
          language: 'es-MX',
          partialResults: false,
          popup: true,
        });

        if (result.matches && result.matches.length > 0) {
          const textoDetectado = result.matches[0];
          console.log("🎙️ Texto capturado directamente:", textoDetectado);

          this.cdr.markForCheck();
          this.sendMessageToAI(textoDetectado);
          this.cdr.detectChanges();
        }

        this.isRecording = false;
      }
    } catch (e) {
      console.error("❌ Error en SpeechRecognition:", e);
      this.isRecording = false;
    }
  }
sendMessageToAI(text: string) {
  // 📍 1. LIMPIEZA TOTAL DE CONSULTAS ANTERIORES
  this.showHospitals = false;
  this.showDoctors = false;
  this.listadoHospitales = [];
  this.listadoDoctores = [];
  this.showChatOptions = false; // Ocultamos botones hasta que el bot sugiera usarlos
  
  // Agregamos el mensaje del usuario al chat
  this.chatMessages.push({ role: 'user', text: text });
  this.isLoading = true;

  this.medicalService.sendMessage(text).subscribe({
    next: (res) => {
      this.zone.run(async () => {
        this.chatMessages.push({ role: 'bot', text: res.reply });
        this.isLoading = false;

        if (res.urgent) {
          this.isEmergencyActive = true;
          await this.speak("He detectado una posible emergencia...", true);
        } else {
          this.isEmergencyActive = false;
          await this.speak(res.reply);
        }

        // --- SEGUNDA RESPUESTA AUTOMÁTICA ---
        setTimeout(async () => {
          const sugerencia = "También puedes consultar hospitales o médicos cercanos para una mejor atención. ¿Te gustaría verlos?";
          
          this.chatMessages.push({ role: 'bot', text: sugerencia });
          this.showChatOptions = true; // Solo aquí se vuelven a activar los botones
          
          await this.speak(sugerencia);
          this.cdr.detectChanges();
        }, 1500);

        this.cdr.detectChanges();
      });
    },
    error: () => { this.isLoading = false; }
  });
}
  async handleOptionSelected(type: string) {
    // 1. Limpiamos lo anterior y prendemos el loading
    this.showHospitals = false;
    this.showDoctors = false;
    this.isLoading = true;

    if (type === 'hospitals') {
      try {
        const coordinates = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true
        });
        this.fetchHospitals(coordinates.coords.latitude, coordinates.coords.longitude);
      } catch (error) {
        this.cargarHospitalesDefault();
      }
    }

    if (type === 'doctors') {
      this.medicalService.getDoctors().subscribe({
        next: (res) => {
          this.listadoDoctores = res.doctors;
          this.isLoading = false; //  Apagamos al recibir datos
          this.showDoctors = true;
        },
        error: (err) => {
          this.isLoading = false;
          console.error(err);
        }
      });
    }
    if (type === 'hospitals') {
      try {
        const coordinates = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        // 📍 Guardamos la ubicación para el mapa
        this.miUbicacionActual = {
          lat: coordinates.coords.latitude,
          lng: coordinates.coords.longitude
        };
        this.fetchHospitals(coordinates.coords.latitude, coordinates.coords.longitude);
      } catch (error) {
        this.cargarHospitalesDefault();
      }
    }
  }
  //  Función que faltaba: Respaldo para Oaxaca Centro
  cargarHospitalesDefault() {
    const oaxacaLat = 17.0732;
    const oaxacaLng = -96.7266;
    this.fetchHospitals(oaxacaLat, oaxacaLng);
  }

  //  Función auxiliar para evitar repetir el .subscribe
  fetchHospitals(lat: number, lng: number) {
    this.medicalService.getNearbyHospitals(lat, lng).subscribe({
      next: (res) => {
        this.listadoHospitales = res.results;
        this.isLoading = false; //  Apagamos al recibir datos
        this.showHospitals = true;
      },
      error: (err) => {
        this.isLoading = false;
        console.error(err);
      }
    });
  }
  async speak(text: string, isManual: boolean = false) {
    // 📍 REGLA: Si está silenciado Y NO es un clic manual, no hables.
    // Pero si es manual (isManual = true), ¡HABLA aunque esté en silencio!
    if (this.isMutedGlobal && !isManual) {
      return;
    }

    try {
      await TextToSpeech.stop();
      await TextToSpeech.speak({
        text: text,
        lang: 'es-MX',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        category: 'ambient',
      });
    } catch (error) {
      console.error("Error en TTS:", error);
    }
  }
  async ionViewDidEnter() {
    // Esperamos un momento a que el motor nativo esté listo
    setTimeout(async () => {
      await this.speak('Hola, soy tu asistente virtual ANAasis. ¿En qué puedo ayudarte hoy?');
    }, 1000);
  }
  isMutedGlobal = false;
  toggleAppMute() {
    this.isMutedGlobal = !this.isMutedGlobal;
    if (this.isMutedGlobal) {
      TextToSpeech.stop(); // Si silenciamos, callamos todo
    }
  }
  // 1. Agrega la variable en tu clase HomePage
  isEmergencyActive = false;
}