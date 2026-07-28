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
      return 'Valor en millones (ej. 1.2 = $1,2M)';
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
      return `${sign}$${formatted}M`;
    case 'porcentaje':
      return `${sign}${formatted}%`;
    case 'ratio':
      return `${sign}${formatted}`;
  }
}
