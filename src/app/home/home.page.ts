import { ChangeDetectorRef, Component, Input, NgZone } from '@angular/core'; // Usaremos inject para más limpieza
import {
  IonContent, IonFooter, IonGrid, IonRow, IonCol, IonIcon, IonSpinner, ModalController
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { medical, chatbubbleEllipses, mic, star, business, locationOutline, personOutline, chevronForward, call, closeCircle, arrowBackOutline, navigateCircle } from 'ionicons/icons';
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
import { UserProfileComponent } from '../shared/components/user-profile/user-profile.component';
import { UserAppointmentsComponent } from '../shared/components/user-appointments/user-appointments.component';
import { RegisterModalComponent } from '../shared/components/register-modal/register-modal.component';
import { LoginModalComponent } from '../shared/components/login-modal/login-modal.component';
import { VitalsModalComponent } from '../shared/components/vitals-modal/vitals-modal.component';
import { User } from '../core/services/user';
import { HealthConnect } from 'capacitor-health-connect';
import { NativeSettings, AndroidSettings } from 'capacitor-native-settings';
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
    private modalCtrl: ModalController,
    private userService: User,
  ) {
    // Añadí los iconos que usan tus listas para que no den error
    addIcons({ navigateCircle, arrowBackOutline, mic, call, closeCircle, medical, chatbubbleEllipses, star, business, locationOutline, personOutline, chevronForward });
    this.initSpeechRecognition();
    this.setupBackButton(); // 📍 Llamamos a la configuración
  }
  async initSpeechRecognition() {
    const available = await SpeechRecognition.available();
    // Eliminamos la línea de requestPermissions de aquí para que no choque
    console.log("Micrófono listo:", available);
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
    // 8. DETECCIÓN DE SIGNOS VITALES POR VOZ (Para mostrar el modal de signos con datos reales)
    if (userText.includes('signos') || userText.includes('presión') || userText.includes('ritmo cardiaco') || userText.includes('cómo estoy')) {
      const profile = this.userService.getProfile();

      if (!profile) {
        const msg = "Para ver tus signos, necesito que primero inicies sesión.";
        this.chatMessages.push({ role: 'bot', text: msg });
        this.speak(msg, true);
        return;
      }

      const txtBot = 'Claro, estoy consultando tu última información médica...';
      this.chatMessages.push({ role: 'bot', text: txtBot });
      this.speak(txtBot, true);

      this.openVitalsModal(profile.phone);
      this.isLoading = false;
      return;
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
  async solicitarAmbulancia() {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      const lat = coordinates.coords.latitude;
      const lng = coordinates.coords.longitude;
      const infoPaciente = "Alerta SOS desde App ANAasis - Paciente crítico";

      this.medicalService.enviarAlertaAmbulancia(lat, lng, infoPaciente).subscribe({
        next: async (res: any) => {
          this.isLoading = false;
          if (res.status === 'ok') {
            this.sosEnviado = true; // ✅ Cambia el botón a verde/check
            this.datosAmbulancia = res.ambulancia; // 🚑 Guardamos ubicación de la ambulancia

            const mensajeExito = `¡Confirmado! La ${res.ambulancia.codigo} ya viene hacia ti. Está a ${res.distancia_km} km.`;
            this.chatMessages.push({ role: 'bot', text: mensajeExito });

            await this.speak(mensajeExito, true);
            this.cdr.detectChanges();
          }
        },
        error: () => {
          this.isLoading = false;
          this.presentToast("Error al solicitar auxilio. Intenta de nuevo.");
        }
      });
    } catch (e) {
      this.isLoading = false;
      this.presentToast("Activa tu GPS para enviar la alerta.");
    }
  }
  sosEnviado = false; // Controla si el botón cambia a verde
  datosAmbulancia: any = null; // Guarda la info que re
  cancelarEmergencia() {
    this.isEmergencyActive = false; // Cierra el bloque de emergencia
    this.sosEnviado = false;        // Resetea el botón de auxilio
    this.datosAmbulancia = null;    // Oculta el mapa de seguimiento

    // ✅ El cambio clave: Ocultamos el mapa de hospitales al cancelar
    this.showHospitals = false;

    // Añadimos un mensaje de cierre al chat
    const mensajeCierre = "Entendido, he cancelado la alerta. ¿Puedo ayudarte con alguna otra consulta médica? ";
    this.chatMessages.push({ role: 'bot', text: mensajeCierre });
    this.speak(mensajeCierre);

    this.cdr.detectChanges();
  }
  async openProfile() {
    this.zone.run(async () => {
      const modal = await this.modalCtrl.create({
        component: UserProfileComponent,
        breakpoints: [0, 0.6, 0.9],
        initialBreakpoint: 0.6,
        handle: true
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
        breakpoints: [0, 0.7, 0.9],
        initialBreakpoint: 0.7,
        handle: true
      });
      await modal.present();
    });
  }
  // 2. Crea la función para abrir el modal de registro
  async openRegister() {
    this.zone.run(async () => {
      const modal = await this.modalCtrl.create({
        component: RegisterModalComponent,
        breakpoints: [0, 0.8], // El que ya usábamos para registro
        initialBreakpoint: 0.8,
        handle: true
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
        breakpoints: [0, 0.6],
        initialBreakpoint: 0.6,
        handle: true
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
        componentProps: { phone: phone }
      });
      await modal.present();
    });
  }
  async ionViewDidEnter() {
    try { await (HealthConnect as any).SplashScreen.hide(); } catch (e) { }
    await this.verificarPermisosHealth();

    // 📍 MOTOR DE ALTA VELOCIDAD: CADA 15 SEGUNDOS
    setInterval(() => {
      this.motorDeMonitoreoRealTime();
    }, 15000);

    this.motorDeMonitoreoRealTime();
  }
  // 📍 Declarar al inicio de la clase HomePage
lastSavedHeartRate = 0;
lastSavedTimestamp = 0;

async motorDeMonitoreoRealTime() {
  const profile = this.userService.getProfile();
  if (!profile) return;

  try {
    const ahoraMs = Date.now();
    const hace10MinMs = ahoraMs - (10 * 60 * 1000);

    const config = {
      timeRangeFilter: {
        type: 'between',
        startTime: new Date(hace10MinMs).toISOString(),
        endTime: new Date(ahoraMs).toISOString()
      }
    };

    // Lectura de Health Connect
    const rP = await (HealthConnect as any).readRecords({ ...config, type: 'HeartRateSeries' });
    const rO = await (HealthConnect as any).readRecords({ ...config, type: 'OxygenSaturation' });

    let pulsoActual = 0;
    let oxigenoActual = 0;

    // Extracción de Pulso
    if (rP.records && rP.records.length > 0) {
      const muestras = rP.records[rP.records.length - 1].samples;
      if (muestras?.length > 0) {
        pulsoActual = Math.round(muestras[muestras.length - 1].beatsPerMinute || 0);
      }
    }

    // Extracción de Oxígeno
    if (rO.records && rO.records.length > 0) {
      const registro = rO.records[rO.records.length - 1];
      let val = registro.percentage || registro.value || 0;
      if (typeof val === 'object') val = val.value;
      oxigenoActual = Math.round(val <= 1 && val > 0 ? val * 100 : val);
    }

    // 📍 LÓGICA DE EFICIENCIA PROFESIONAL
    // Solo guardamos en la base de datos si:
    // 1. Hay un cambio significativo (>= 3 latidos) para capturar arritmias o actividad.
    // 2. O si han pasado más de 5 minutos (300,000 ms) para mantener el registro constante.
    const diferenciaPulso = Math.abs(pulsoActual - this.lastSavedHeartRate);
    const tiempoTranscurrido = ahoraMs - this.lastSavedTimestamp;

    if (pulsoActual > 30 && (diferenciaPulso >= 3 || tiempoTranscurrido > 300000)) {
      
      // Actualizamos marcas de tiempo y valor
      this.lastSavedHeartRate = pulsoActual;
      this.lastSavedTimestamp = ahoraMs;

      this.medicalService.saveVitals({
        phone: profile.phone,
        name: profile.name,
        heart_rate: pulsoActual,
        spo2: oxigenoActual
      }).subscribe();
      
      console.log(`ANAasis: Cambio detectado (${pulsoActual} LPM). Registro guardado.`);
    }

  } catch (e) {
    console.error("Error en motor de monitoreo:", e);
  }
}
  // 🧹 Limpieza: Si el usuario cierra la app, detenemos el reloj
  ngOnDestroy() {
    //    if (this.monitoringTimer) {
    //  clearInterval(this.monitoringTimer);
    //   }
  }
  async verificarPermisosHealth() {
    try {
      console.log("ANAasis: Iniciando petición de permisos limpia...");

      // 📍 QUITAMOS 'HeartRate' PORQUE CAUSA EL CRASH
      // Solo dejamos el que el plugin sí entiende.
      const status = await (HealthConnect as any).requestHealthPermissions({
        read: ['HeartRateSeries', 'OxygenSaturation'],
        write: []
      });

      console.log("ANAasis: Respuesta de permisos ->", status);

      if (status.hasAllPermissions) {
        //  this.sincronizarPulseraReal();
      }
    } catch (error) {
      // 🛡️ Esto evita que la app se cierre si Android rechaza la petición
      console.error("ANAasis: Error controlado en salud:", error);
    }
  }
  async abrirPermisosADerecha() {
    try {
      // 📍 Intento 1: Forzar la ventana de permisos interna
      await (HealthConnect as any).requestHealthPermissions({
        read: ['HeartRateSeries'],
        write: []
      });
    } catch (e) {
      // 📍 Intento 2: Si falla, forzar la apertura del panel específico de ANAasis
      // Esto obliga al sistema a registrar la App en la lista de salud
      await NativeSettings.openAndroid({
        option: AndroidSettings.ApplicationDetails,
      });
    }
  }


}
