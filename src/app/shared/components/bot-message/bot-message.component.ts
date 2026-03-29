import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { IonIcon, IonBadge } from "@ionic/angular/standalone";
import { addIcons } from 'ionicons';
import {  chatbubbleEllipses, personCircleOutline, volumeHigh, volumeMute} from 'ionicons/icons';
import { IonicModule } from "@ionic/angular";
@Component({
  selector: 'app-bot-message',
  templateUrl: './bot-message.component.html',
  styleUrls: ['./bot-message.component.scss'],
  standalone: true,
  imports: [IonicModule],
})
export class BotMessageComponent  {
@Input() isMuted: boolean = false;
  @Input() fullText: string = ''; // 📍 Recibimos el texto que debe leer
  @Output() toggleMute = new EventEmitter<void>();
  @Output() requestSpeak = new EventEmitter<string>(); // 📍 Avisamos que queremos hablar

  constructor() { 
    addIcons({ 
      'person-circle-outline': personCircleOutline, 
      'chatbubble-ellipses': chatbubbleEllipses, 
      'volume-high': volumeHigh,
      'volume-mute': volumeMute // 📍 Icono de silencio
    });
  }

 onMuteClick() {
  // Si ACTUALMENTE está silenciado y le doy clic, significa que se va a ACTIVAR
  if (this.isMuted) {
    this.requestSpeak.emit(this.fullText); // 📍 Mandamos el texto ANTES de cambiar el estado
  }
  this.toggleMute.emit();
}
}
