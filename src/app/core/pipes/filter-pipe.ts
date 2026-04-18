import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filter',
  standalone: true
})
export class FilterPipe implements PipeTransform {
  transform(doctors: any[], text: string): any[] {
    if (!doctors) return []; 
    if (!text || text === '') return doctors;
    
    const search = text.toLowerCase();

    return doctors.filter(doctor => {
      // Usamos encadenamiento opcional (?.) para evitar errores de undefined
      const name = doctor.name ? doctor.name.toLowerCase() : '';
      const specialty = doctor.specialty ? doctor.specialty.toLowerCase() : '';
      
      return name.includes(search) || specialty.includes(search);
    });
  }
}