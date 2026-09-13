// 📍 reminder_frequency_hours viaja siempre en horas (para que "cada 5 minutos" quepa
// en la misma columna que "cada 24 horas"), pero decírselo así al paciente tal cual
// ("cada 0.0833 horas") no tiene sentido — esto lo convierte a minutos/horas naturales.
export function formatearFrecuencia(horas: number | null | undefined): string {
  if (!horas || horas <= 0) return '';

  if (horas < 1) {
    const minutos = Math.max(1, Math.round(horas * 60));
    return `${minutos} minuto${minutos === 1 ? '' : 's'}`;
  }

  const horasRedondeadas = Math.round(horas);
  return `${horasRedondeadas} hora${horasRedondeadas === 1 ? '' : 's'}`;
}
