import { BandejaUrgencia } from '../enums/bandeja-urgencia.enum';
import { normalizarFechaDesdeBd } from './proceso-fechas.util';

export function diasHastaFecha(fecha: string | Date | null | undefined): number | null {
  if (!fecha) return null;

  const fechaIso =
    fecha instanceof Date
      ? fecha.toISOString().slice(0, 10)
      : normalizarFechaDesdeBd(fecha).fecha;

  const target = new Date(`${fechaIso}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - hoy.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function calcularUrgenciaBandeja(
  diasRestantes: number | null,
): BandejaUrgencia {
  if (diasRestantes === null) return BandejaUrgencia.SIN_FECHA;
  if (diasRestantes <= 7) return BandejaUrgencia.ALTA;
  if (diasRestantes <= 30) return BandejaUrgencia.MEDIA;
  return BandejaUrgencia.BAJA;
}

export const BANDEJA_URGENCIA_ORDEN: Record<BandejaUrgencia, number> = {
  [BandejaUrgencia.ALTA]: 0,
  [BandejaUrgencia.MEDIA]: 1,
  [BandejaUrgencia.BAJA]: 2,
  [BandejaUrgencia.SIN_FECHA]: 3,
};
