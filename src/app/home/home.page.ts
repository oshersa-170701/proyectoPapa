import { ChangeDetectorRef, Component, Input, NgZone, EnvironmentInjector } from '@angular/core';
import {
  IonContent, IonFooter, IonGrid, IonRow, IonCol, IonIcon, IonSpinner, ModalController, IonButton
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import {
  medical, chatbubbleEllipses, mic, star, business, locationOutline, personOutline,
  chevronForward, call, closeCircle, arrowBackOutline, navigateCircle, informationCircleOutline,
  sparkles, closeOutline,
  checkmarkCircle
} from 'ionicons/icons';
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
import { App } from '@capacitor/app';
import { Overpass } from '../core/services/overpass';
import { UserProfileComponent } from '../shared/components/user-profile/user-profile.component';
import { UserAppointmentsComponent } from '../shared/components/user-appointments/user-appointments.component';
import { RegisterModalComponent } from '../shared/components/register-modal/register-modal.component';
import { LoginModalComponent } from '../shared/components/login-modal/login-modal.component';
import { VitalsModalComponent } from '../shared/components/vitals-modal/vitals-modal.component';
import { User } from '../core/services/user';
import { HealthConnect } from 'capacitor-health-connect';
import { NativeSettings, AndroidSettings } from 'capacitor-native-settings';
import { Health } from '../core/services/health';
import { RegistrarTemperaturaComponent } from '../shared/components/registrar-temperatura/registrar-temperatura.component';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonButton, IonSpinner,
    CommonModule, IonContent, IonFooter, IonGrid, IonRow, IonCol, IonIcon,
    UserMessageComponent, BotMessageComponent, ChatOptionsComponent,
    DoctorListComponent, HospitalListComponent, MedicalMapComponent, RegistrarTemperaturaComponent
  ],
})

export class HomePage {
  showHospitals = false;
  showDoctors = false;
  showGuideModal = false;
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
    private modalCtrl: ModalController,
    private userService: User,
    private healthService: Health,
    public environmentInjector: EnvironmentInjector
  ) {
    // Añadí los iconos que usan tus listas para que no den error
    addIcons({
      call, closeCircle, arrowBackOutline, sparkles, closeOutline, mic,
      informationCircleOutline, navigateCircle, medical, chatbubbleEllipses, star, business,
      locationOutline, personOutline, chevronForward, checkmarkCircle
    });
    this.initSpeechRecognition();
    this.setupBackButton(); // 📍 Llamamos a la configuración
  }
  async initSpeechRecognition() {
    const available = await SpeechRecognition.available();
    console.log("Micrófono listo:", available);

    // 📍 AGREGA ESTO: Solo para avisarle a Android que usaremos el teléfono
    // Esto ayuda a que el sistema no bloquee el window.location posterior
    if (window.navigator && (window.navigator as any).permissions) {
      (window.navigator as any).permissions.query({ name: 'telephony' }).catch(() => { });
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

    // 2. EVITAR DUPLICIDAD (Silenciamos cualquier proceso de voz anterior)
    TextToSpeech.stop().catch(() => { });
    this.limpiarPantalla(); // 👈 Esto asegura que mapas y listas se borren de inmediato
    this.chatMessages.push({ role: 'user', text: text });
    this.isLoading = true;
    this.showChatOptions = false;
    this.cdr.detectChanges();
    // 🚀 Lógica de Ayuda / Guía mejorada
    if (userText.includes('guía') || userText.includes('guíame') || userText.includes('comandos')) {
      this.limpiarPantalla(); // Limpiamos rastro de mapas/listas
      this.showGuideModal = true; // 🚀 ACTIVAMOS LA VENTANITA

      const comandosVoz = `Claro , he abierto mi guía de funciones en tu pantalla. Puedes consultar médicos, hospitales, tus signos o incluso preguntarme sobre alguna enfermedad.`;
      this.speak(comandosVoz, true);

      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    // 🧹 Limpiamos antes de procesar nueva búsqueda de médicos/hospitales
    if (userText.includes('médico') || userText.includes('hospital') || userText.includes('doctor')) {
      this.limpiarPantalla();
    }


    // 🚨 1. DETECCIÓN LOCAL DE EMERGENCIA (Para respuesta instantánea)
    const esEmergenciaLocal = userText.includes('emergencia') || userText.includes('ayuda') || userText.includes('auxilio') || userText.includes('sos');

    if (esEmergenciaLocal) {
      this.zone.run(async () => {
        this.isEmergencyActive = true; // 🔴 ACTIVA EL PANEL DE EMERGENCIA DEL HTML
        this.showHospitals = true;     // 🗺️ Activa la bandera para renderizar el mapa
        this.showDoctors = false;
        this.showChatOptions = false;
        this.isLoading = true;

        this.chatMessages.push({ role: 'bot', text: '⚠️ ¡EMERGENCIA DETECTADA! Activando protocolos de auxilio y localizando hospitales cercanos...' });
        this.speak("He detectado una emergencia. Localizando ayuda inmediata.", true);
        this.cdr.detectChanges();

        // Localizamos coordenadas rápidas de respaldo
        let lat = 17.0796;
        let lng = -96.7535;

        // Recuperamos el perfil dinámico real del usuario activo
        const profile = this.userService.getProfile();
        const phone = profile ? profile.phone : null;
        const name = profile ? profile.name : 'Usuario Anónimo';

        try {
          const coordinates = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true, // Mayor precisión obligatoria para almacenar coordenadas reales
            timeout: 7000
          });
          this.miUbicacionActual = {
            lat: coordinates.coords.latitude,
            lng: coordinates.coords.longitude
          };
          lat = this.miUbicacionActual.lat;
          lng = this.miUbicacionActual.lng;
        } catch (e) {
          console.warn("Usando respaldo de ubicación para renderizar mapa de emergencia");
        }

        // 🚀 DISPARADOR AUTOMÁTICO SOS: Si el usuario está logueado, mandamos las coordenadas vivas a la BD
        if (phone) {
          const emergencyPayload = {
            phone: phone,
            name: name,
            heart_rate: this.ultimoPulsoGuardado || 0,
            spo2: this.ultimoOxigenoGuardado || 0,
            sleep_hours: this.ultimaHoraSueno || 0,
            latitude: lat,
            longitude: lng
          };

          // Registramos de forma atómica en app_vitals_direct
          this.medicalService.saveVitals(emergencyPayload).subscribe({
            next: (res) => console.log("[Disparador SOS] Coordenadas de emergencia almacenadas con éxito en la BD"),
            error: (err) => console.error("[Disparador SOS] Error al registrar coordenadas automáticas", err)
          });
        } else {
          console.warn("[Disparador SOS] No se enviaron coordenadas a la BD porque no hay un perfil activo.");
        }

        // Ejecuta directo la búsqueda de hospitales reales al mapa sin limpiar las banderas de SOS
        this.overpassService.getNearbyHospitals(lat, lng).subscribe({
          next: (hospitales) => {
            this.zone.run(() => {
              this.listadoHospitales = hospitales.sort((a: any, b: any) => {
                const distA = Math.sqrt(Math.pow(a.lat - lat, 2) + Math.pow(a.lng - lng, 2));
                const distB = Math.sqrt(Math.pow(b.lat - lat, 2) + Math.pow(b.lng - lng, 2));
                return distA - distB;
              });
              this.isLoading = false;
              this.cdr.detectChanges();
            });
          },
          error: () => {
            this.zone.run(() => { this.isLoading = false; });
          }
        });
      });
      return; // Detiene el flujo de forma exitosa
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
    // 4. 👤 DETECCIÓN DE PERFIL POR VOZ
    if (userText.includes('perfil') || userText.includes('mis datos') || userText.includes('quién soy')) {
      const txtPerfil = 'Claro, abriendo tu perfil personal...';
      this.chatMessages.push({ role: 'bot', text: txtPerfil });

      this.speak(txtPerfil, true);
      this.isLoading = false;

      // 🚀 Abrimos el modal automáticamente
      this.openProfile();
      this.cdr.detectChanges();
      return; // Detenemos para que no vaya a la IA
    }
    //5. 📅 DETECCIÓN DE CITAS POR VOZ
    if (userText.includes('cita') || userText.includes('agenda') || userText.includes('mis consultas')) {
      const userJson = localStorage.getItem('anaasis_user_data');
      let txtBot = '';

      if (!userJson) {
        txtBot = 'No cuento con citas registradas a tu nombre. Debes registrarte o iniciar sesión primero para solicitar una cita con algún médico.';
      } else {
        txtBot = 'Claro, revisando tu agenda médica ahora mismo...';
      }

      this.chatMessages.push({ role: 'bot', text: txtBot });
      this.speak(txtBot, true);
      this.isLoading = false;

      // 🚀 Lanzamos el modal de citas
      this.openAppointments();
      this.cdr.detectChanges();
      return;
    }
    // 📝 6. DETECCIÓN DE REGISTRO POR VOZ
    if (userText.includes('registrarme') || userText.includes('crear perfil') || userText.includes('mi cuenta') || userText.includes('darme de alta') || userText.includes('regístrame')) {
      const userJson = localStorage.getItem('anaasis_user_data');

      if (userJson) {
        const yaRegistrado = "Ya cuento con tus datos en mi sistema. ¿Deseas ver tu perfil?";
        this.chatMessages.push({ role: 'bot', text: yaRegistrado });
        this.speak(yaRegistrado, true);
      } else {
        const txtRegistro = '¡Excelente idea! Vamos a crear tu perfil para que pueda cuidarte mejor. Abre el formulario que aparece en pantalla.';
        this.chatMessages.push({ role: 'bot', text: txtRegistro });
        this.speak(txtRegistro, true);
        this.openRegister(); // 🚀 Lanza el modal de registro
      }

      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }
    //7. Cancelar cita por voz
    // En sendMessageToAI(text: string)
    if (userText.includes('cancelar cita') || userText.includes('quitar cita') || userText.includes('borrar mi cita')) {
      const txtCancel = 'Entiendo. Abriendo tu agenda para que selecciones la cita que deseas cancelar.';
      this.chatMessages.push({ role: 'bot', text: txtCancel });
      this.speak(txtCancel, true);

      this.openAppointments(); // 🚀 Reutilizamos la función que ya tienes
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }
    // 🔑 9. DETECCIÓN DE INICIO DE SESIÓN POR VOZ
    if (userText.includes('Iniciar sesión') || userText.includes('entrar a mi cuenta') || userText.includes('ya tengo cuenta') || userText.includes('loguearme') || userText.includes('sesión')) {
      const userJson = localStorage.getItem('anaasis_user_data');

      if (userJson) {
        const yaLogueado = "Ya te encuentras dentro de tu cuenta. ¿Deseas revisar tu agenda o tu perfil?";
        this.chatMessages.push({ role: 'bot', text: yaLogueado });
        this.speak(yaLogueado, true);
      } else {
        const txtLogin = '¡Qué alegría verte de nuevo! Por favor, ingresa tus datos en el formulario para que pueda recuperar tu historial.';
        this.chatMessages.push({ role: 'bot', text: txtLogin });
        this.speak(txtLogin, true);
        this.openLogin(); // 🚀 Función que lanzará el nuevo modal
      }

      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }
   // 8. DETECCIÓN DE SIGNOS VITALES POR VOZ
    if (userText.includes('signos') || userText.includes('presión') || userText.includes('ritmo cardiaco') || userText.includes('cómo estoy')) {
      const profile = this.userService.getProfile();

      if (!profile) {
        const msg = "Necesitas iniciar sesión para ver tus signos.";
        this.chatMessages.push({ role: 'bot', text: msg });
        this.speak(msg, true);
        this.isLoading = false;
        return;
      }

      const txtBot = 'Claro un momento, estoy consultando tu pulsera ahora mismo...';
      this.chatMessages.push({ role: 'bot', text: txtBot });

      // 🔊 Hablamos la bienvenida e inmediatamente abrimos el modal para delegar la lectura
      this.speak(txtBot, true).then(() => {
        setTimeout(() => {
          this.zone.run(() => {
            // Abrimos el modal. El modal iniciará su forzarSincronizacionManual() o cargarSignos()
            this.openVitalsModal(profile.phone);
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        }, 300);
      });

      return;
    }
    // 🌡️ 10. DETECCIÓN DE REGISTRO DE TEMPERATURA POR VOZ
    if (userText.includes('registrar mi temperatura') || userText.includes('temperatura') || userText.includes('registrar temperatura')) {
      const profile = this.userService.getProfile();

      if (!profile) {
        const msg = "Necesitas iniciar sesión para poder registrar tu temperatura en el sistema.";
        this.chatMessages.push({ role: 'bot', text: msg });
        this.speak(msg, true);
        this.isLoading = false;
        return;
      }

      const txtTemperatura = 'Claro, abriendo el registro de tu temperatura corporal anteriormente registrada...';
      this.chatMessages.push({ role: 'bot', text: txtTemperatura });
      this.speak(txtTemperatura, true);
      this.isLoading = false;

      // 🚀 Abrimos el modal automáticamente
      this.openTemperaturaModal();
      this.cdr.detectChanges();
      return; // Detenemos el flujo para que no se envíe a la IA externa
    }
    // 8. DETECCIÓN DE SÍNTOMAS POR VOZ (Para respuestas médicas rápidas sin esperar a la IA)
    // FLUJO PARA CUALQUIER OTRO SÍNTOMA (OpenAI)
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
            text: "Error de red. ¿Tienes internet en el celular? "
          });
          this.cdr.detectChanges();
        });
      }
    });
  }
  async handleOptionSelected(type: string) {
    this.showHospitals = false;
    this.showDoctors = false;
    this.limpiarPantalla(); // 👈 Limpieza obligatoria antes de mostrar nuevos resultados
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
 async speak(text: string, isManual: boolean = false): Promise<void> {
    if (this.isMutedGlobal && !isManual) return Promise.resolve();

    try {
      await TextToSpeech.stop();

      // 🚀 Paso 1: Escanear las voces instaladas en el celular de forma nativa
      const { voices } = await TextToSpeech.getSupportedVoices();
      
      // 🚀 Paso 2: Buscar el ÍNDICE de una voz premium de México
      // Recorremos con findIndex para obtener la posición numérica exacta en el arreglo
      let indiceVoz = voices.findIndex(v => 
        v.lang === 'es-MX' && (v.voiceURI?.toLowerCase().includes('network') || v.name?.toLowerCase().includes('network'))
      );

      // Si no encuentra una neuronal por internet, buscamos el índice de cualquier voz en español de México
      if (indiceVoz === -1) {
        indiceVoz = voices.findIndex(v => v.lang === 'es-MX');
      }

      // 🚀 Paso 3: Construir las opciones respetando el tipado estricto de TTSOptions
      const opcionesConfig: any = {
        text: text,
        lang: 'es-MX',
        rate: 1.05,  // Velocidad óptima para fluidez humana 💫
        pitch: 1.1, // Tono amable y suave para ANAasis 🌸
        volume: 1.0,
        category: 'ambient'
      };

      // Si localizamos un índice válido (mayor o igual a 0), se lo asignamos numéricamente
      if (indiceVoz !== -1) {
        opcionesConfig.voice = indiceVoz; // Ahora sí pasamos un 'number', TypeScript estará feliz
      }

      return await TextToSpeech.speak(opcionesConfig);
    } catch (error) {
      console.error("[ANAasis Voice] Error en el tipado o hardware de voz:", error);
      return Promise.resolve();
    }
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
  private trackingInterval: any = null;

  async solicitarAmbulancia() {
    // 🛡️ PASO 1: Validación estricta de Identidad en Producción
    const profile = this.userService.getProfile();

    if (!profile || !profile.phone) {
      this.presentToast("Necesitas iniciar sesión para que la central de ambulancias pueda identificar tu llamada.");
      const msgError = "No he podido localizar tu perfil de usuario en el teléfono. Por favor, inicia sesión para poder solicitar una ambulancia real.";
      this.chatMessages.push({ role: 'bot', text: msgError });
      await this.speak(msgError, true);
      this.cdr.detectChanges();
      return; // Detiene el flujo de inmediato antes de activar el GPS o gastar datos
    }

    // Si pasamos la validación, extraemos el teléfono dinámico real del usuario
    const phone = profile.phone;

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      // 🛰️ PASO 2: Obtención de Coordenadas de GPS Reales
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      const latUsuario = coordinates.coords.latitude;
      const lngUsuario = coordinates.coords.longitude;
      this.miUbicacionActual = { lat: latUsuario, lng: lngUsuario };

      const infoPaciente = `Alerta SOS desde App ANAasis - Paciente crítico (${profile.name || 'Usuario'})`;

      // 🚨 PASO 3: Envío del reporte al proxy con datos reales de producción
      this.medicalService.enviarAlertaAmbulancia(latUsuario, lngUsuario, infoPaciente).subscribe({
        next: async (res: any) => {
          this.isLoading = false;
          this.sosEnviado = true; // Cambia el botón a enviado en la interfaz

          const mensajeEspera = `¡Alerta enviada a la central médica! Mantén la calma, ${profile.name || 'Usuario'}. Estoy esperando a que el despachador asigne una unidad a tu posición.`;
          this.chatMessages.push({ role: 'bot', text: mensajeEspera });
          await this.speak(mensajeEspera, true);
          this.cdr.detectChanges();

          // 🚨 PASO 4: MOTOR DE ESCUCHA GPS EN TIEMPO REAL (Short Polling Dinámico)
          if (this.trackingInterval) clearInterval(this.trackingInterval);

          this.trackingInterval = setInterval(() => {
            // Usamos el teléfono verídico del usuario logueado en la iteración
            this.medicalService.getEmergencyTracking(phone).subscribe({
              next: (trackRes: any) => {
                if (trackRes && trackRes.success && trackRes.assigned) {
                  this.zone.run(() => {
                    // Si es el primer segundo en que se detecta la ambulancia enlazada en la BD
                    if (!this.datosAmbulancia) {
                      this.speak(`¡Unidad localizada! La ambulancia ${trackRes.ambulancia.codigo} va en camino hacia ti.`);
                    }

                    // Inyectamos las coordenadas vivas de la ambulancia al mapa
                    this.datosAmbulancia = {
                      codigo: trackRes.ambulancia.codigo,
                      latitud: Number(trackRes.ambulancia.latitud),
                      longitud: Number(trackRes.ambulancia.longitud)
                    };

                    console.log(`[RealTime GPS] Ubicación verídica de la unidad ${trackRes.ambulancia.codigo}:`, this.datosAmbulancia);
                    this.cdr.detectChanges(); // Repinta el marcador en tiempo real en la pantalla
                  });
                }
              },
              error: (err) => {
                console.error("[RealTime GPS] Fallo en HTTP Polling:", JSON.stringify(err));
                // Si viene un mensaje o estatus detallado lo expondrá en el LogCat
                if (err.status) {
                  console.error(`[RealTime GPS] Código de Estado del servidor: ${err.status}`);
                }
              }
            });
          }, 4000); // Consulta dinámicamente cada 4 segundos
        },
        error: (err) => {
          this.isLoading = false;
          this.presentToast("Error de red al conectar con el servidor SOS.");
          this.cdr.detectChanges();
        }
      });
    } catch (e) {
      this.isLoading = false;
      this.presentToast("Activa tu GPS para enviar la alerta.");
      this.cdr.detectChanges();
    }
  }
  sosEnviado = false; // Controla si el botón cambia a verde
  datosAmbulancia: any = null; // Guarda la info que re
  cancelarEmergencia() {
    // Apagamos las llamadas al servidor de inmediato
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    this.isEmergencyActive = false;
    this.sosEnviado = false;
    this.datosAmbulancia = null;
    this.showHospitals = false;

    const mensajeCierre = "Entendido, he cancelado la emergencia y cerrado el canal de rastreo GPS.";
    this.chatMessages.push({ role: 'bot', text: mensajeCierre });
    this.speak(mensajeCierre);
    this.cdr.detectChanges();
  }
  async openProfile() {
    this.zone.run(async () => {
      const modal = await this.modalCtrl.create({
        component: UserProfileComponent,
        mode: 'ios',
        backdropDismiss: true,
        breakpoints: [0, 0.6, 0.9],
        initialBreakpoint: 0.6,
        handle: false // 👈 Quitamos el "tirador" que causa el movimiento
      });
      await modal.present();

      // Si el usuario cierra sesión desde el perfil, el reload ya lo manejas allá
      const { data } = await modal.onDidDismiss();
      if (data?.logout) {
        console.log('Sesión cerrada desde el perfil');
      }
    });
  }
  // Función auxiliar para abrir el modal
  async openAppointments() {
    const userJson = localStorage.getItem('anaasis_user_data');

    // 🛡️ Si no hay registro, ANAasis lo detecta antes de abrir el modal
    if (!userJson) {
      const mensaje = "No puedo mostrarte una agenda si aún no te has registrado. ¿Te gustaría hacerlo ahora?";
      this.chatMessages.push({ role: 'bot', text: mensaje });
      this.speak(mensaje, true);
      return;
    }

    this.zone.run(async () => {
      const modal = await this.modalCtrl.create({
        component: UserAppointmentsComponent,
        mode: 'ios',
        backdropDismiss: true,
        breakpoints: [0, 0.7, 0.9],
        initialBreakpoint: 0.7,
        handle: false // 👈 Quitamos el "tirador" que causa el movimiento
      });
      await modal.present();
    });
  }
  // 2. Crea la función para abrir el modal de registro
  async openRegister() {
    this.zone.run(async () => {
      const modal = await this.modalCtrl.create({
        component: RegisterModalComponent,
        mode: 'ios',
        backdropDismiss: true,
        breakpoints: [0, 0.8], // El que ya usábamos para registro
        initialBreakpoint: 0.8,
        handle: false // 👈 Quitamos el "tirador" que causa el movimiento
      });
      await modal.present();

      const { data } = await modal.onDidDismiss();
      if (data && data.success) {
        const mensajeExito = `¡Perfecto! Ya he guardado tus datos. Ahora puedo ayudarte a agendar citas.`;
        this.chatMessages.push({ role: 'bot', text: mensajeExito });
        this.speak(mensajeExito, true);
        this.cdr.detectChanges();
      }
    });
  }


  // 🔑 Nueva función para abrir el Login
  async openLogin() {
    this.zone.run(async () => {
      const modal = await this.modalCtrl.create({
        component: LoginModalComponent, // Necesitas crear este componente
        mode: 'ios',
        backdropDismiss: true,
        breakpoints: [0, 0.6],
        initialBreakpoint: 0.6,
        handle: false
      });
      await modal.present();

      const { data } = await modal.onDidDismiss();
      if (data?.success) {
        this.speak("¡Bienvenido de nuevo! He recuperado tu historial con éxito.", true);
        window.location.reload(); // Recargamos para refrescar todo el estado
      }
    });
  }
  async openVitalsModal(phone: string) {
    this.zone.run(async () => {
      const modal = await this.modalCtrl.create({
        component: VitalsModalComponent,
        mode: 'ios',
        componentProps: { phone: phone }
      });
      await modal.present();
    });
  }
  async ionViewDidEnter() {
    // 🎙️ Bienvenida por voz con pequeño retraso para asegurar inicialización
    setTimeout(() => {
      const bienvenida = 'Hola, soy tu asistente virtual ANAasis. ¿En qué puedo ayudarte hoy?';
      this.speak(bienvenida);
    }, 1000); // 1 segundo de cortesía para el hardware

    try { await (HealthConnect as any).SplashScreen.hide(); } catch (e) { }
    await this.verificarPermisosHealth();
    this.motorDeMonitoreoRealTime();
  }

  ultimoPulsoGuardado: number = 0;
  ultimoOxigenoGuardado: number = 0;
  ultimaHoraSueno: number = 0; // 👈 Asegúrate que diga : number
  async motorDeMonitoreoRealTime() {
    const profile = this.userService.getProfile();
    if (!profile) return;

    try {
      // 🚀 LLAMADA AL HARDWARE REAL (Tu Kotlin Plugin)
      const res = await this.healthService.sincronizarConHealthConnect(profile.phone, profile.name);

      if (res.success) {
        const data = res.data;

        if (data.pulso !== this.ultimoPulsoGuardado || data.oxigeno !== this.ultimoOxigenoGuardado) {
          this.ultimoPulsoGuardado = Number(data.pulso);
          this.ultimoOxigenoGuardado = Number(data.oxigeno);
          this.ultimaHoraSueno = Number(data.horasSueno);

          // Imprimimos la analítica completa en el LogCat incluyendo pasos y calorías
          console.log(`[ANAasis Nativo] Sincronizado: ${data.pulso} BPM | ${data.oxigeno}% SpO2 | ${data.horasSueno}h Sueño | ${data.steps} Pasos | ${data.calories} Kcal`);
        }
      }
    } catch (e) {
      console.error("Fallo en el monitoreo nativo:", e);
    }
  }
  async verificarPermisosHealth() {
    try {
      // 🚀 CAMBIO CRÍTICO: Cambiamos 'TotalCaloriesBurned' por 'ActiveCaloriesBurned'
      await (HealthConnect as any).requestHealthPermissions({
        read: ['HeartRateSeries', 'OxygenSaturation', 'SleepSession', 'Steps', 'ActiveCaloriesBurned'],
        write: []
      });
    } catch (e) {
      console.error("Error pidiendo permisos iniciales:", e);
    }
  }
  async abrirPermisosADerecha() {
    try {
      // 🚀 Cambiamos también aquí para mantener la consistencia
      await (HealthConnect as any).requestHealthPermissions({
        read: ['HeartRateSeries', 'OxygenSaturation', 'SleepSession', 'Steps', 'ActiveCaloriesBurned'],
        write: []
      });
    } catch (e) {
      await NativeSettings.openAndroid({
        option: AndroidSettings.ApplicationDetails,
      });
    }
  }
  limpiarPantalla() {
    this.zone.run(() => {
      this.showHospitals = false;
      this.showDoctors = false;
      this.showChatOptions = false;
      this.listadoHospitales = [];
      this.listadoDoctores = [];
      this.isEmergencyActive = false;
      this.cdr.detectChanges(); // 👈 Vital para que el mapa desaparezca
    });
  }
 async openTemperaturaModal() {
    this.zone.run(async () => {
      const modal = await this.modalCtrl.create({
        component: RegistrarTemperaturaComponent,
        mode: 'ios',
        backdropDismiss: true,
        // 🚀 Ajustado: Subimos de 0.5 a 0.65 para dar más espacio vertical
        breakpoints: [0, 0.65],
        initialBreakpoint: 0.65,
        handle: true
      });

      (modal as any).environmentInjector = this.environmentInjector;
      await modal.present();
    });
  }
}
