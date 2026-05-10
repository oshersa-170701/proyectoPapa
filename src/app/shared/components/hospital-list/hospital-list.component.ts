import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonSearchbar } from '@ionic/angular/standalone'; // 📍 Importamos IonSearchbar
import { addIcons } from 'ionicons';
import { locationOutline, callOutline, businessOutline, chevronForward, business, searchOutline, navigateCircleOutline, chevronForwardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-hospital-list',
  templateUrl: './hospital-list.component.html',
  styleUrls: ['./hospital-list.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon, IonSearchbar] //  Agregamos IonSearchbar a los imports
})
export class HospitalListComponent implements OnInit, OnChanges {
  @Input() hospitals: any[] = [];
  //  Nueva entrada obligatoria para tu ubicación
  @Input() userLocation: { lat: number, lng: number } | null = null;
  //  Arreglo para mostrar los resultados filtrados
  filteredHospitals: any[] = [];

  constructor() {
    addIcons({business,navigateCircleOutline,chevronForwardOutline,searchOutline,locationOutline,chevronForward,businessOutline,callOutline});
  }

  ngOnInit() {
    // Inicializamos el filtro con todos los hospitales al cargar
    this.filteredHospitals = this.hospitals;
    this.updateDistancesAndFilter();

  }

  // Detectamos cambios en el Input de hospitales
  // 📍 Asegúrate de que los paréntesis NO estén vacíos
  ngOnChanges(changes: any) {
    this.filteredHospitals = this.hospitals;

    // Ahora "changes" ya existe y el error TS2304 desaparecerá
    if (changes['hospitals'] || changes['userLocation']) {
      this.updateDistancesAndFilter();
    }
  }

  // Función de filtrado
  handleSearch(event: any) {
    const query = event.target.value.toLowerCase();

    if (!query) {
      this.filteredHospitals = this.hospitals;
      return;
    }

    this.filteredHospitals = this.hospitals.filter(h =>
      h.name.toLowerCase().includes(query)
    );
  }

  goToHospital(hospital: any) {
    //  URL Limpia para navegación directa
    const url = `https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`;
    window.open(url, '_system');
  }
 private updateDistancesAndFilter() {
  // 📍 Validamos que existan datos antes de procesar
  if (!this.hospitals || this.hospitals.length === 0) {
    this.filteredHospitals = [];
    return;
  }

  // Si no hay ubicación aún, mostramos la lista normal
  if (!this.userLocation) {
    this.filteredHospitals = [...this.hospitals];
    return;
  }

  // 📍 Calculamos distancias
  const withDistance = this.hospitals.map(h => {
    const dist = this.calculateDistance(
      this.userLocation!.lat, 
      this.userLocation!.lng, 
      h.lat, 
      h.lng
    );
    return { 
      ...h, 
      distanceKM: dist, 
      distanceText: this.formatDistance(dist) 
    };
  });

  // Ordenamos: El más cercano arriba
  this.filteredHospitals = withDistance.sort((a, b) => a.distanceKM - b.distanceKM);
}

  // 📍 Fórmula Haversine para distancia exacta
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en km
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // 📍 Formatea la distancia: "a 1.2 km" o "a 350 m"
  private formatDistance(distanceKM: number): string {
    if (distanceKM < 1) {
      return `a ${Math.round(distanceKM * 1000)} m`; // En metros si es menos de 1km
    } else {
      return `a ${distanceKM.toFixed(1)} km`; // En km con un decimal
    }
  }
}