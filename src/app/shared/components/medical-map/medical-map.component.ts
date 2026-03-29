import { Component, Input, AfterViewInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-medical-map',
  templateUrl: './medical-map.component.html',
  styleUrls: ['./medical-map.component.scss'],
  standalone: true
})
export class MedicalMapComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() points: any[] = [];
  //  Nueva entrada para tu ubicación [lat, lng]
  @Input() userLocation: { lat: number, lng: number } | null = null; 

  map!: L.Map;
  markersGroup = L.layerGroup();

  //  Icono para Hospitales
  private miIconoChido = L.icon({
    iconUrl: 'assets/icon/marcador.png', 
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });

  //  Icono para TI (puedes usar un punto azul o una imagen distinta)
  private iconoUsuario = L.icon({
    iconUrl: 'assets/icon/hombre.png', // Asegúrate de tener esta imagen o usa una de Leaflet
    iconSize: [35, 35],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17]
  });

  ngOnChanges(changes: SimpleChanges) {
    // Si cambian los puntos o la ubicación, refrescamos
    if ((changes['points'] || changes['userLocation']) && this.map) {
      this.updateMarkers();
    }
  }

  ngAfterViewInit() {
    setTimeout(() => this.initMap(), 600);
  }

  private initMap() {
    if (this.map) return;

    // Iniciamos en Oaxaca por defecto
    this.map = L.map('medicalMapId', { 
      zoomControl: false,
      attributionControl: false 
    }).setView([17.0732, -96.7266], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
    this.markersGroup.addTo(this.map);

    setTimeout(() => {
      this.map.invalidateSize();
      this.updateMarkers();
    }, 400);
  }

 private updateMarkers() {
  this.markersGroup.clearLayers();
  const bounds: L.LatLngExpression[] = [];

  // 📍 1. Dibujar TU ubicación con Efecto de Pulso
  if (this.userLocation && this.userLocation.lat) {
    
    // Creamos el icono de pulso con HTML
    const pulseIcon = L.divIcon({
      className: 'user-pulse-container',
      html: '<div class="pulse-ring"></div><div class="user-dot"></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    L.marker([this.userLocation.lat, this.userLocation.lng], { 
      icon: pulseIcon 
    })
    .bindPopup('<b>Tu ubicación actual</b>')
    .addTo(this.markersGroup);
    
    bounds.push([this.userLocation.lat, this.userLocation.lng]);
  }

  // 🏥 2. Dibujar los hospitales (Tu icono original)
  if (this.points && this.points.length > 0) {
    this.points.forEach(p => {
      if (p.lat && p.lng) {
        L.marker([p.lat, p.lng], { icon: this.miIconoChido })
          .bindPopup(`<b>${p.name}</b>`)
          .addTo(this.markersGroup);
        
        bounds.push([p.lat, p.lng]);
      }
    });
  }

  if (bounds.length > 0) {
    this.map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
  }
}

  ngOnDestroy() {
    if (this.map) {
      this.map.off();
      this.map.remove();
    }
  }
}