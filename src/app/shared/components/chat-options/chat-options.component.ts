import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { IonRow, IonCol } from "@ionic/angular/standalone";
import { IonicModule } from "@ionic/angular";
import { addIcons } from 'ionicons';
import { businessOutline, medkitOutline } from 'ionicons/icons';

@Component({
  selector: 'app-chat-options',
  templateUrl: './chat-options.component.html',
  styleUrls: ['./chat-options.component.scss'],
  standalone: true,
  imports: [IonicModule],
})
export class ChatOptionsComponent  {

 @Output() optionSelected = new EventEmitter<string>();

  constructor() {
    addIcons({ 'business-outline': businessOutline, 'medkit-outline': medkitOutline });
  }

  onSelect(type: string) {
    this.optionSelected.emit(type);
  }

}
