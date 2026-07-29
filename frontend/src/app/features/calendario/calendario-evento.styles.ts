import { CalendarioEventoTipo } from '../../core/services/calendario.service';
import { getEstadoCalendarioStyle } from '../admin/proyecciones/calendario-proyecciones/estado-calendario.styles';

export interface CalendarioEventoStyle {
  bg: string;
  border: string;
  text: string;
  label: string;
}

const TIPO_STYLES: Record<CalendarioEventoTipo, CalendarioEventoStyle> = {
  proyeccion: { bg: '#eef6fb', border: '#b6d4e8', text: '#0e3b65', label: 'Proyección' },
  proceso: { bg: '#f3f0ff', border: '#c9b8f5', text: '#4a2f91', label: 'Proceso' },
  relacionamiento: { bg: '#fff8ee', border: '#e8c9a0', text: '#6b4a12', label: 'Relacionamiento' },
};

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

  const base = TIPO_STYLES[tipo];
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
