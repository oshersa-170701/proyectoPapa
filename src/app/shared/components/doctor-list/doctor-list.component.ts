import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonAvatar, IonButton, IonGrid, IonRow, IonCol,IonSearchbar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { star, chevronForward, personOutline, business, callOutline, logoWhatsapp, medalOutline, businessOutline, readerOutline, searchOutline } from 'ionicons/icons';
import { FormsModule } from '@angular/forms';
import { FilterPipe } from 'src/app/core/pipes/filter-pipe';

@Component({
  selector: 'app-doctor-list',
  templateUrl: './doctor-list.component.html',
  styleUrls: ['./doctor-list.component.scss'],
  standalone: true,
  imports: [IonCol, IonRow, IonGrid, IonButton, CommonModule, IonIcon, FilterPipe, FormsModule, IonSearchbar]
})
export class DoctorListComponent {
  @Input() doctors: any[] = []; //  Esperando datos de la BD
searchText: string = ''; //  Variable para el buscador
  constructor() {
    addIcons({personOutline,readerOutline,businessOutline,callOutline,logoWhatsapp,
      medalOutline,star,chevronForward,business,searchOutline});
  }
  toggleContact(doctor: any) {
  // Si no existe la propiedad, la crea. Si existe, la voltea (true/false)
  doctor.showContact = !doctor.showContact;
}
}