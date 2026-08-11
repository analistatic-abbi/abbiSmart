import { EstadoKamRonda } from '../../core/models/kam.model';
import { cssThemeVar } from '../../core/utils/theme-css.util';

export interface EstadoKamCalendarioStyle {
  bg: string;
  border: string;
  text: string;
  label: string;
}

const ESTADO_SUFFIX: Record<EstadoKamRonda, string> = {
  [EstadoKamRonda.Pendiente]: 'lejano',
  [EstadoKamRonda.Ejecutado]: 'proximo',
  [EstadoKamRonda.Socializado]: 'publicado',
};

function badgeStyle(suffix: string, label: string): EstadoKamCalendarioStyle {
  return {
    bg: cssThemeVar(`--badge-${suffix}-bg`),
    border: cssThemeVar(`--badge-${suffix}-border`),
    text: cssThemeVar(`--badge-${suffix}-text`),
    label,
  };
}

export function getEstadoKamCalendarioStyle(estado: EstadoKamRonda | string): EstadoKamCalendarioStyle {
  const key = estado as EstadoKamRonda;
  const suffix = ESTADO_SUFFIX[key] ?? 'lejano';
  return badgeStyle(suffix, key ?? '—');
}

export function labelDiasRestantes(dias: number): string {
  if (dias < 0) return 'Vencida';
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Falta 1 día';
  return `Faltan ${dias} días`;
}

export function claseUrgenciaDias(dias: number): string {
  if (dias < 0) return 'calendar-card__urgencia calendar-card__urgencia--vencida';
  if (dias <= 3) return 'calendar-card__urgencia calendar-card__urgencia--proxima';
  return 'calendar-card__urgencia';
}
