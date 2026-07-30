import { CalendarioEventoTipo } from '../../core/services/calendario.service';
import { cssThemeVar } from '../../core/utils/theme-css.util';
import { getEstadoCalendarioStyle } from '../admin/proyecciones/calendario-proyecciones/estado-calendario.styles';

export interface CalendarioEventoStyle {
  bg: string;
  border: string;
  text: string;
  label: string;
}

const TIPO_LABELS: Record<CalendarioEventoTipo, string> = {
  proyeccion: 'Proyección',
  proceso: 'Proceso',
  relacionamiento: 'Relacionamiento',
};

function tipoStyle(tipo: Exclude<CalendarioEventoTipo, 'proyeccion'>): CalendarioEventoStyle {
  return {
    bg: cssThemeVar(`--cal-${tipo}-bg`),
    border: cssThemeVar(`--cal-${tipo}-border`),
    text: cssThemeVar(`--cal-${tipo}-text`),
    label: TIPO_LABELS[tipo],
  };
}

export function getEventoCalendarioStyle(
  tipo: CalendarioEventoTipo,
  estado: string,
): CalendarioEventoStyle {
  if (tipo === 'proyeccion') {
    const proyeccionStyle = getEstadoCalendarioStyle(estado);
    return {
      bg: proyeccionStyle.bg,
      border: proyeccionStyle.border,
      text: proyeccionStyle.text,
      label: proyeccionStyle.label,
    };
  }

  const base = tipoStyle(tipo);
  return {
    ...base,
    label: estado || base.label,
  };
}

export function rutaEventoCalendario(tipo: CalendarioEventoTipo, id: number): string[] {
  switch (tipo) {
    case 'proyeccion':
      return ['/proyecciones', String(id)];
    case 'proceso':
      return ['/procesos', String(id)];
    case 'relacionamiento':
      return ['/crm/relacionamientos', String(id)];
    default:
      return ['/calendario'];
  }
}
