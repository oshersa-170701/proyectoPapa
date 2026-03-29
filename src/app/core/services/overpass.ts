import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
@Injectable({
  providedIn: 'root',
})
export class Overpass {
  
constructor(private http: HttpClient) {}

getNearbyHospitals(lat: number, lng: number, radius: number = 5000) {
  // 📍 Query ultra simple: solo busca nodos de hospitales en 8km
  const query = `[out:json][timeout:15];node["amenity"="hospital"](around:${radius},${lat},${lng});out body;`;
  
  // Servidor oficial francés (muy estable)
  const url = `https://overpass.openstreetmap.fr/api/interpreter?data=${encodeURIComponent(query)}`;

  return this.http.get<any>(url).pipe(
    map(res => {
      if (!res.elements || res.elements.length === 0) return [];
      return res.elements.map((e: any) => ({
        name: e.tags.name || "Hospital",
        lat: e.lat,
        lng: e.lon,
        address: e.tags['addr:street'] || 'Oaxaca, México'
      }));
    })
  );
}
}