import { CalendarioEvento, CalendarioEventoTipo } from '../../core/services/calendario.service';
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
  relacionamiento: 'Reunión CRM',
  kam: 'Reunión KAM',
  reunion_aclaratoria: 'Reunión aclaratoria',
};

const MEETING_TIPOS = new Set<CalendarioEventoTipo>([
  'relacionamiento',
  'kam',
  'reunion_aclaratoria',
]);

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
  if (MEETING_TIPOS.has(tipo)) {
    return {
      ...base,
      label: TIPO_LABELS[tipo],
    };
  }

  return {
    ...base,
    label: estado || base.label,
  };
}

export function rutaEventoCalendario(evento: Pick<CalendarioEvento, 'tipo' | 'id' | 'kamId'>): string[] {
  switch (evento.tipo) {
    case 'proyeccion':
      return ['/proyecciones', String(evento.id)];
    case 'proceso':
    case 'reunion_aclaratoria':
      return ['/procesos', String(evento.id)];
    case 'relacionamiento':
      return ['/crm/relacionamientos', String(evento.id)];
    case 'kam':
      return ['/kam', String(evento.kamId ?? evento.id)];
    default:
      return ['/calendario'];
  }
}
