export interface CargaMasivaFilaError {
  fila: number;
  error: string;
  sugerencia?: string;
}

export interface CargaMasivaDetalleCreado {
  fila: number;
  entidadId: number;
  etiqueta: string;
  clienteId?: number;
}

export interface CargaMasivaLog {
  id: number;
  entidadTipo: string;
  archivoNombre: string;
  filasExitosas: number;
  filasRechazadas: number;
  fechaCarga: string;
  detalleErrores?: CargaMasivaFilaError[] | null;
  detalleCreados?: CargaMasivaDetalleCreado[] | null;
  revertida?: boolean;
  fechaReversion?: string | null;
}

export interface CargaMasivaResult {
  filasExitosas: number;
  filasRechazadas: number;
  detalleErrores?: CargaMasivaFilaError[] | null;
  detalleCreados?: CargaMasivaDetalleCreado[] | null;
  logId?: number;
}

export interface CargaMasivaRevertResult {
  eliminados: number;
  omitidos: number;
  detalleOmitidos: Array<{
    entidadId: number;
    etiqueta: string;
    motivo: string;
  }>;
}

export type AvisoCargaMasivaTipo = 'success' | 'warning' | 'error';

export type LogPanelExpandido = 'errores' | 'creados';
