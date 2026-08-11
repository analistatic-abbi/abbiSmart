import { CargaMasivaFilaError } from '../models/carga-masiva.model';

export function tituloAvisoCargaMasiva(
  filasExitosas: number,
  filasRechazadas: number,
): string {
  if (filasRechazadas === 0) {
    return 'Carga completada correctamente';
  }

  if (filasExitosas === 0) {
    return 'No se importó ninguna fila';
  }

  return 'Carga completada con filas rechazadas';
}

export function mensajeResumenCargaMasiva(
  filasExitosas: number,
  filasRechazadas: number,
): string {
  return `${filasExitosas} fila(s) importada(s), ${filasRechazadas} fila(s) rechazada(s). Revise los avisos siguientes para corregir el archivo.`;
}

export function sugerenciaLocalCargaMasiva(error: CargaMasivaFilaError): string | null {
  if (error.sugerencia?.trim()) {
    return error.sugerencia.trim();
  }

  const text = error.error.toLowerCase();

  if (text.includes('bogot')) {
    return 'Para Bogotá use departamento "Cundinamarca" y municipio "Bogotá".';
  }

  if (text.includes('ubicaci') && text.includes('no encontr')) {
    return 'Los valores de departamento y municipio deben coincidir exactamente con el catálogo del país.';
  }

  if (text.includes('segmento') && text.includes('otro')) {
    return 'Complete la columna segmento_otro cuando el segmento sea "Otro".';
  }

  if (text.includes('empresa') && text.includes('no encontr')) {
    return 'Registre primero el cliente o verifique que el nombre coincida exactamente.';
  }

  return null;
}
