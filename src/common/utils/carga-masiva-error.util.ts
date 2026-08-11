import { ErrorCode } from '../exceptions/error-codes.enum';

export interface CargaMasivaFilaError {
  fila: number;
  error: string;
  sugerencia?: string;
}

export function formatUbicacionCargaMasivaError(
  departamento: string,
  municipio: string,
): { error: string; sugerencia: string } {
  const dep = departamento.trim() || '(vacío)';
  const mun = municipio.trim() || '(vacío)';

  if (!departamento.trim() && municipio.trim()) {
    return {
      error: `No se encontró el municipio "${mun}" en el catálogo del país de sesión.`,
      sugerencia:
        'Revise la ortografía del municipio o indique también el departamento en la columna departamento.',
    };
  }

  return {
    error: `Ubicación no encontrada: departamento "${dep}" y municipio "${mun}".`,
    sugerencia:
      'Los valores deben coincidir con el catálogo de ubicaciones del país. Para Bogotá use departamento "Cundinamarca" y municipio "Bogotá".',
  };
}

export function sugerenciaPorCodigoError(errorCode: string): string | undefined {
  switch (errorCode) {
    case ErrorCode.PAIS_SESION_INVALIDO:
      return 'La columna pais debe coincidir con su país de sesión activo, o déjela vacía para usar el país de sesión.';
    case ErrorCode.PAIS_NO_ENCONTRADO:
      return 'Use el nombre exacto del país registrado en el sistema (ej. Colombia, Perú, Ecuador).';
    case ErrorCode.SEGMENTO_OTRO_REQUERIDO:
      return 'Cuando segmento es "Otro", complete la columna segmento_otro con el valor descriptivo.';
    case ErrorCode.CARGA_MASIVA_FORMATO_INVALIDO:
      return 'Revise que la primera fila tenga los encabezados indicados en la guía de columnas.';
    case ErrorCode.CLIENTE_NO_ENCONTRADO:
      return 'La empresa debe existir previamente como cliente en el país de sesión.';
    case ErrorCode.PROCESO_EMPRESA_INVALIDA:
      return 'Indique solo empresa (cliente registrado) o solo empresa_otro, no ambos.';
    default:
      return undefined;
  }
}
