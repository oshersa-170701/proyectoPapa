import { Component, Input } from '@angular/core'; // 📍 Añade Input
import { IonicModule } from "@ionic/angular";
import { addIcons } from 'ionicons';
import { chatbubbleEllipses, volumeHighOutline, personCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-user-message',
  templateUrl: './user-message.component.html',
  styleUrls: ['./user-message.component.scss'],
  standalone: true,
  imports: [IonicModule],
})
export class UserMessageComponent {
  @Input() messageText: string = ''; //  Creamos la entrada de texto

  constructor() { 
    addIcons({ 
      'chatbubble-ellipses': chatbubbleEllipses, 
      'volume-high-outline': volumeHighOutline,
      'person-circle-outline': personCircleOutline 
    });
  }
}