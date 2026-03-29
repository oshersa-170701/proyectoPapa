import { Component, Input, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { locationOutline, callOutline, businessOutline, chevronForward, business } from 'ionicons/icons';
import * as L from 'leaflet'; // Recuerda instalar: npm install leaflet @types/leaflet

@Component({
  selector: 'app-hospital-list',
  templateUrl: './hospital-list.component.html',
  styleUrls: ['./hospital-list.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class HospitalListComponent implements OnInit, AfterViewInit {
  @Input() hospitals: any[] = []; //  Esperando datos de la BD
  map!: L.Map;

  constructor() {
    addIcons({business,locationOutline,chevronForward,businessOutline,callOutline});
  }

  ngOnInit() {}

  ngAfterViewInit() {
    
  }

  //  AQUÍ ESTÁ LA FUNCIÓN QUE FALTABA
goToHospital(hospital: any) {
  // Creamos un enlace dinámico a Google Maps usando las coordenadas del hospital
  const url = `https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`;
  
  // Abrimos en una pestaña nueva o en la app de mapas del cel
  window.open(url, '_system');
}
}