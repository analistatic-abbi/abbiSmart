import { CumpleIndicador } from '../enums/cumple-indicador.enum';
import { ReglaCumplimiento } from '../enums/regla-cumplimiento.enum';

const DEFAULT_MARGEN_PCT = 5;

export function resolveMargenCasiPct(valorConfig: string | undefined): number {
  const parsed = Number(valorConfig);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_MARGEN_PCT;
  }
  return parsed;
}

export function evaluarResultadoIndicador(
  valorRequerido: number,
  valorParametro: number,
  regla: ReglaCumplimiento,
  margenPct: number = DEFAULT_MARGEN_PCT,
): CumpleIndicador {
  if (valorParametro <= 0) {
    const cumple =
      regla === ReglaCumplimiento.MAYOR_O_IGUAL
        ? valorRequerido >= valorParametro
        : valorRequerido <= valorParametro;
    return cumple ? CumpleIndicador.APROBADO : CumpleIndicador.NO_APROBADO;
  }

  const diffPct = ((valorRequerido - valorParametro) / valorParametro) * 100;
  const margen = Math.max(0, margenPct);

  if (regla === ReglaCumplimiento.MAYOR_O_IGUAL) {
    if (diffPct >= 0) return CumpleIndicador.APROBADO;
    if (diffPct >= -margen) return CumpleIndicador.CASI_APROBADO;
    if (diffPct >= -2 * margen) return CumpleIndicador.CASI_DESAPROBADO;
    return CumpleIndicador.NO_APROBADO;
  }

  if (diffPct <= 0) return CumpleIndicador.APROBADO;
  if (diffPct <= margen) return CumpleIndicador.CASI_APROBADO;
  if (diffPct <= 2 * margen) return CumpleIndicador.CASI_DESAPROBADO;
  return CumpleIndicador.NO_APROBADO;
}
