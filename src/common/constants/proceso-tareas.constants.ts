import { TareaCodigo } from '../enums/tarea-codigo.enum';
import { TipoInstrumento } from '../enums/tipo-instrumento.enum';

export const TAREAS_SEGUIMIENTO_ORDEN: TareaCodigo[] = [
  TareaCodigo.CREACION_CARPETA,
  TareaCodigo.MANIFESTACION_INTERES,
  TareaCodigo.ADQUISICION_DERECHO,
  TareaCodigo.PREPARAR_DOC_JURIDICA,
  TareaCodigo.PREPARAR_DOC_TECNICA,
  TareaCodigo.PREPARAR_DOC_FINANCIERA,
  TareaCodigo.ESTRUCTURACION_ADMIN,
  TareaCodigo.SOLICITUD_PAGO_POLIZA,
  TareaCodigo.PAGO_POLIZA,
  TareaCodigo.ELABORACION_PROPUESTA,
  TareaCodigo.VALIDACION_AREA_TECNICA,
  TareaCodigo.ENVIO_PROPUESTA,
];

const TAREAS_NO_APLICAN_RFI = new Set<TareaCodigo>([
  TareaCodigo.SOLICITUD_PAGO_POLIZA,
  TareaCodigo.PAGO_POLIZA,
]);

export function tareaAplicaParaInstrumento(
  tareaCodigo: TareaCodigo,
  tipoInstrumento: TipoInstrumento,
): boolean {
  if (tipoInstrumento === TipoInstrumento.RFI) {
    return !TAREAS_NO_APLICAN_RFI.has(tareaCodigo);
  }

  return true;
}

export function tareaAplicaParaProceso(
  tareaCodigo: TareaCodigo,
  tipoInstrumento: TipoInstrumento,
  fechaAdquisicionDerecho?: string | null,
): boolean {
  if (!tareaAplicaParaInstrumento(tareaCodigo, tipoInstrumento)) {
    return false;
  }

  if (tareaCodigo === TareaCodigo.ADQUISICION_DERECHO) {
    return Boolean(fechaAdquisicionDerecho);
  }

  return true;
}
