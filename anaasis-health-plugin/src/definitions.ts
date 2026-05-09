export interface SignosVitales {
  pulso: number;
  oxigeno: number;
  horasSueno: number;
}

export interface ANAasisHealthPlugin {
  /**
   * Obtiene las mediciones de salud desde los sensores del dispositivo
   */
  obtenerMediciones(): Promise<SignosVitales>;
  solicitarPermisos(): Promise<{ resultado: string }>;
}