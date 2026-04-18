import { ChangeDetectorRef, Component, ElementRef, inject, NgZone, ViewChild } from '@angular/core'; // Usaremos inject para más limpieza
import {
  IonContent, IonFooter, IonGrid, IonRow, IonCol, IonIcon, IonSpinner
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { medical, chatbubbleEllipses, mic, star, business, locationOutline, personOutline, chevronForward, call, closeCircle, arrowBackOutline } from 'ionicons/icons';

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
import { ToastController } from '@ionic/angular'; //  Importa ToastController
import { App } from '@capacitor/app';
import { Overpass } from '../core/services/overpass';
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
  constructor(private medicalService: MedicalService, private cdr: ChangeDetectorRef, private zone: NgZone,
    private toastController: ToastController,
    private overpassService: Overpass,
  ) {
    // Añadí los iconos que usan tus listas para que no den error
    addIcons({ call, closeCircle, arrowBackOutline, mic, medical, chatbubbleEllipses, star, business, locationOutline, personOutline, chevronForward });
    this.initSpeechRecognition();
    this.setupBackButton(); // 📍 Llamamos a la configuración
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
    //console.log(" Intentando abrir micrófono...");

    //  LA CLAVE: Silenciamos al bot inmediatamente al tocar el micro
    try {
      //  No esperes al stop, lánzalo y sigue
      TextToSpeech.stop().catch(() => { });
    } catch (e) {
     // console.warn("Nada que detener en TTS");
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
          //console.log(" Texto capturado directamente:", textoDetectado);

          this.cdr.markForCheck();
          this.sendMessageToAI(textoDetectado);
          this.cdr.detectChanges();
        }

        this.isRecording = false;
      }
    } catch (e) {
      // console.error(" Error en SpeechRecognition:", e);
      this.isRecording = false;
    }
  }
sendMessageToAI(text: string) {
  const userText = text.toLowerCase();
  this.isLoading = true;
  this.showChatOptions = false;
  this.chatMessages.push({ role: 'user', text: text });
  this.cdr.detectChanges();

  // 🚨 1. DETECCIÓN LOCAL DE EMERGENCIA (Para respuesta instantánea)
  const esEmergenciaLocal = userText.includes('emergencia') || userText.includes('ayuda') || userText.includes('auxilio') || userText.includes('sos');
  
  if (esEmergenciaLocal) {
    this.isEmergencyActive = true; 
    this.chatMessages.push({ role: 'bot', text: '⚠️ ¡EMERGENCIA DETECTADA! Activando protocolos y localizando hospitales cercanos...' });
    this.handleOptionSelected('hospitals'); 
    this.speak("He detectado una emergencia. Localizando ayuda inmediata.", true);
    this.isLoading = false;
    this.cdr.detectChanges();
    return; // Detenemos aquí para modo rescate
  }

// 🏥 2. DETECCIÓN LOCAL DE HOSPITALES
  if (userText.includes('hospital') || userText.includes('clínica')) {
    const txtHospital = '¡Entendido! Buscando hospitales cercanos... ';
    this.chatMessages.push({ role: 'bot', text: txtHospital });
    
    // 🔊 AGREGAR ESTA LÍNEA:
    this.speak(txtHospital, true); 
    
    this.handleOptionSelected('hospitals');
    return;
  }

  // 👨‍⚕️ 3. DETECCIÓN LOCAL DE MÉDICOS
  if (userText.includes('médico') || userText.includes('doctor') || userText.includes('especialista')) {
    const txtDoctor = 'Claro, localizando médicos disponibles cerca de ti... ';
    this.chatMessages.push({ role: 'bot', text: txtDoctor });
    
    // 🔊 AGREGAR ESTA LÍNEA:
    this.speak(txtDoctor, true);
    
    this.handleOptionSelected('doctors');
    return;
  }

  //  4. FLUJO PARA CUALQUIER OTRO SÍNTOMA (OpenAI)
  // Aquí es donde entrará "dolor de panza", "dolor de pie", etc.
this.medicalService.sendMessage(text).subscribe({
  next: (res: any) => {
    this.zone.run(async () => {
      this.isLoading = false;

      //  1. Validación de seguridad total
      if (!res || typeof res.reply === 'undefined') {
        this.chatMessages.push({ 
          role: 'bot', 
          text: 'ANAasis está descansando.' 
        });
        this.cdr.detectChanges();
        return;
      }

      const botReply = res.reply;
      this.chatMessages.push({ role: 'bot', text: botReply });

      // 🚨 2. Manejo de Emergencia
   if (res.urgent) {
        this.isEmergencyActive = true;
        await this.speak("Atención, esto parece serio. Localizando ayuda.", true);
        this.handleOptionSelected('hospitals');
      } else {
        // ✅ AQUÍ ESTÁ EL AJUSTE:
        await this.speak(botReply); // Primero dice la orientación médica
        
        setTimeout(async () => {
          const sugerencia = "¿Te gustaría consultar hospitales o médicos cercanos?";
          
          // 1. Agregamos el texto al chat para que no salgan los botones solos
          this.chatMessages.push({ role: 'bot', text: sugerencia });
          
          // 2. Activamos los botones visuales
          this.showChatOptions = true;
          
          // 3. Hacemos que ANAasis lo diga por voz
          await this.speak(sugerencia);
          
          this.cdr.detectChanges();
        }, 2000); // Espera 2 segundos después de la respuesta larga
      }
      
      this.cdr.detectChanges();
    });
  },
  error: (err) => {
    this.zone.run(() => {
      this.isLoading = false;
      this.chatMessages.push({ 
        role: 'bot', 
        text: "Error de red. ¿Tienes internet en el celular? 📶" 
      });
      this.cdr.detectChanges();
    });
  }
});
}
 async handleOptionSelected(type: string) {
  this.showHospitals = false;
  this.showDoctors = false;
  this.isLoading = true;
  this.cdr.detectChanges(); //  Mostramos el spinner de inmediato

  // 1. Valores por defecto (Oaxaca Centro - Ajustado a tus coordenadas de BD)
  let lat = 17.0796; 
  let lng = -96.7535;

  try {
    const coordinates = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false, //  Más rápido para Android
      timeout: 10000,
      maximumAge: 3000
    });

    this.miUbicacionActual = {
      lat: coordinates.coords.latitude,
      lng: coordinates.coords.longitude
    };

    lat = this.miUbicacionActual.lat;
    lng = this.miUbicacionActual.lng;
  } catch (e) {
  //  console.warn("No se pudo obtener GPS, usando respaldo de San Jacinto.");
  }

  if (type === 'hospitals') {
    this.buscarHospitalesReales(lat, lng);
  }

  if (type === 'doctors') {
    this.medicalService.getNearbyDoctors(lat, lng).subscribe({
      next: (res: any) => {
        //  LA CLAVE PARA ANDROID: Ejecutar dentro de zone.run
        this.zone.run(async () => {
          this.isLoading = false;
         // console.log("Respuesta Médicos:", res);

          if (res.success && res.data && res.data.length > 0) {
            //alert('Médicos recibidos: ' + res.data.length);
            this.listadoDoctores = res.data;
            this.showDoctors = true;
          } else {
            this.showDoctors = false;
            await this.presentToast('No se encontraron médicos cerca de ti.');
            await this.speak('Lo siento, no pude encontrar médicos cerca de ti.');
          }
          this.cdr.detectChanges(); //  Forzamos renderizado de la lista
        });
      },
      error: async (err) => {
        this.zone.run(() => {
          this.isLoading = false;
          this.presentToast('Error de conexión con el servidor de médicos.');
          this.cdr.detectChanges();
        });
      }
    });
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
        //console.error(err);
      }
    });
  }
  async speak(text: string, isManual: boolean = false) {
    // REGLA: Si está silenciado Y NO es un clic manual, no hables.
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
      // console.error("Error en TTS:", error);
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
  showExitPop = false; //  Controla el mensaje pop
  lastBackPress = 0;
  timeLimit = 2000;
  setupBackButton() {
    App.addListener('backButton', () => {
      this.zone.run(() => {
        const currentTime = new Date().getTime();

        if (currentTime - this.lastBackPress < this.timeLimit) {
          App.exitApp(); // 🚪 Sale al segundo toque
        } else {
          this.lastBackPress = currentTime;
          this.triggerExitPop(); //  Muestra el mensajito
        }
      });
    });
  }
  triggerExitPop() {
    this.showExitPop = true;

    // Lo quitamos solito después de 2 segundos
    setTimeout(() => {
      this.zone.run(() => {
        this.showExitPop = false;
        this.cdr.detectChanges();
      });
    }, 2000);

    this.cdr.detectChanges();
  }
  buscarHospitalesReales(lat: number, lng: number) {
    this.overpassService.getNearbyHospitals(lat, lng).subscribe({
      next: (hospitales) => {
        this.zone.run(() => {
          //  ORDENACIÓN POR DISTANCIA (Pitágoras)
          this.listadoHospitales = hospitales.sort((a: any, b: any) => {
            const distA = Math.sqrt(Math.pow(a.lat - lat, 2) + Math.pow(a.lng - lng, 2));
            const distB = Math.sqrt(Math.pow(b.lat - lat, 2) + Math.pow(b.lng - lng, 2));
            return distA - distB; // El más pequeño (cercano) va primero
          });

          this.isLoading = false;
          this.showHospitals = true;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
  // Función auxiliar para el Toast
  async presentToast(mensaje: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      position: 'bottom',
      color: 'dark',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }
}
