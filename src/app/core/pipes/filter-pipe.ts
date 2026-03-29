import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filter',
  standalone: true
})
export class FilterPipe implements PipeTransform {

  transform(doctors: any[], text: string): any[] {
    if (!doctors) return []; //  Agregamos esta validación por seguridad
    if (!text || text === '') return doctors;
    
    const search = text.toLowerCase();

    return doctors.filter(doctor => 
      doctor.name?.toLowerCase().includes(search) || 
      doctor.specialty?.toLowerCase().includes(search)
    );
  }

}
