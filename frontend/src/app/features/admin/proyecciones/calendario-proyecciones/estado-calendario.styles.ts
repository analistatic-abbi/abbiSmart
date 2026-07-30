import { EstadoProyeccion } from '../../../../core/models/admin.model';
import { cssThemeVar } from '../../../../core/utils/theme-css.util';

export interface EstadoCalendarioStyle {
  bg: string;
  border: string;
  text: string;
  label: string;
}

const ESTADO_LABELS: Record<EstadoProyeccion, string> = {
  [EstadoProyeccion.Lejano]: 'Lejano',
  [EstadoProyeccion.Proximo]: 'Próximo',
  [EstadoProyeccion.SaleEsteMes]: 'Sale este mes',
  [EstadoProyeccion.Publicado]: 'Publicado',
  [EstadoProyeccion.Cerrado]: 'Cerrado',
};

const ESTADO_SUFFIX: Record<EstadoProyeccion, string> = {
  [EstadoProyeccion.Lejano]: 'lejano',
  [EstadoProyeccion.Proximo]: 'proximo',
  [EstadoProyeccion.SaleEsteMes]: 'sale',
  [EstadoProyeccion.Publicado]: 'publicado',
  [EstadoProyeccion.Cerrado]: 'cerrado',
};

function badgeStyle(suffix: string, label: string): EstadoCalendarioStyle {
  return {
    bg: cssThemeVar(`--badge-${suffix}-bg`),
    border: cssThemeVar(`--badge-${suffix}-border`),
    text: cssThemeVar(`--badge-${suffix}-text`),
    label,
  };
}

const FALLBACK_SUFFIX = 'lejano';

export function getEstadoCalendarioStyle(estado: EstadoProyeccion | string): EstadoCalendarioStyle {
  const key = estado as EstadoProyeccion;
  const suffix = ESTADO_SUFFIX[key] ?? FALLBACK_SUFFIX;
  const label = ESTADO_LABELS[key] ?? '—';
  return badgeStyle(suffix, label);
}
