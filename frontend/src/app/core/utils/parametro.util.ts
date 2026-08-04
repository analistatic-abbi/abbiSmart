import { IndicadorCodigo } from '../models/proceso.model';

export type IndicadorUnidad = 'millones' | 'porcentaje' | 'ratio';

const INDICADOR_UNIDAD: Record<IndicadorCodigo, IndicadorUnidad> = {
  [IndicadorCodigo.KTNO]: 'millones',
  [IndicadorCodigo.PN]: 'millones',
  [IndicadorCodigo.ROE]: 'porcentaje',
  [IndicadorCodigo.ROA]: 'porcentaje',
  [IndicadorCodigo.MDN]: 'porcentaje',
  [IndicadorCodigo.IL]: 'ratio',
  [IndicadorCodigo.E]: 'porcentaje',
  [IndicadorCodigo.RCI]: 'ratio',
};

export function indicadorUnidad(codigo: IndicadorCodigo): IndicadorUnidad {
  return INDICADOR_UNIDAD[codigo];
}

export function indicadorValorHint(codigo: IndicadorCodigo): string {
  switch (indicadorUnidad(codigo)) {
    case 'millones':
      return 'En millones de pesos (ej. 1,5 = $1,5 millones de pesos)';
    case 'porcentaje':
      return 'Valor en porcentaje (ej. 10.5 = 10,5%)';
    case 'ratio':
      return 'Valor numérico (ej. 1.5)';
  }
}

function formatNumero(value: number, maxDecimals = 4): string {
  return Math.abs(value).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

/** Valores en millones de pesos; tolera snapshots antiguos guardados en pesos completos. */
export function normalizarMillonesPesos(value: string | number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return NaN;
  }

  if (Math.abs(n) >= 1_000_000) {
    return n / 1_000_000;
  }

  return n;
}

export function formatMillonesPesos(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const millones = normalizarMillonesPesos(value);
  if (!Number.isFinite(millones)) {
    return String(value);
  }

  const sign = millones < 0 ? '-' : '';
  return `${sign}$${formatNumero(millones)} millones de pesos`;
}

export function formatMillonesPesosEquivalente(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const millones = normalizarMillonesPesos(value);
  if (!Number.isFinite(millones)) {
    return '';
  }

  const sign = millones < 0 ? '-' : '';
  const total = Math.abs(millones) * 1_000_000;
  return `Equivale a ${sign}$${total.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatParametroValor(
  indicador: IndicadorCodigo,
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const n = Number(value);
  if (!Number.isFinite(n)) {
    return String(value);
  }

  const sign = n < 0 ? '-' : '';
  const formatted = formatNumero(n);

  switch (indicadorUnidad(indicador)) {
    case 'millones':
      return formatMillonesPesos(n);
    case 'porcentaje':
      return `${sign}${formatted}%`;
    case 'ratio':
      return `${sign}${formatted}`;
  }
}

export function formatRangoIndicador(
  indicador: IndicadorCodigo,
  min: string | null,
  max: string | null,
): string {
  const hasMin = min !== null && min !== '';
  const hasMax = max !== null && max !== '';

  if (!hasMin && hasMax) {
    return `< ${formatParametroValor(indicador, max)}`;
  }
  if (hasMin && !hasMax) {
    return `≥ ${formatParametroValor(indicador, min)}`;
  }
  if (hasMin && hasMax) {
    return `${formatParametroValor(indicador, min)} ≤ x < ${formatParametroValor(indicador, max)}`;
  }
  return '—';
}

export function parametroValorTitle(
  indicador: IndicadorCodigo,
  value: string | number | null | undefined,
): string {
  if (indicadorUnidad(indicador) === 'millones') {
    return formatMillonesPesosEquivalente(value);
  }
  return '';
}
