import { EstadoProyeccion } from '../../../../core/models/admin.model';

export interface EstadoCalendarioStyle {
  bg: string;
  border: string;
  text: string;
  label: string;
}

const ESTADO_CALENDARIO: Record<EstadoProyeccion, EstadoCalendarioStyle> = {
  [EstadoProyeccion.Lejano]: {
    bg: '#F3F4F6',
    border: '#D1D5DB',
    text: '#43474F',
    label: 'Lejano',
  },
  [EstadoProyeccion.Proximo]: {
    bg: '#FEF3C7',
    border: '#FCD34D',
    text: '#92400E',
    label: 'Próximo',
  },
  [EstadoProyeccion.SaleEsteMes]: {
    bg: '#FFEDD5',
    border: '#FDBA74',
    text: '#BE5535',
    label: 'Sale este mes',
  },
  [EstadoProyeccion.Publicado]: {
    bg: '#DCFCE7',
    border: '#86EFAC',
    text: '#166534',
    label: 'Publicado',
  },
  [EstadoProyeccion.Cerrado]: {
    bg: '#DBEAFE',
    border: '#2E8EC2',
    text: '#1E40AF',
    label: 'Cerrado',
  },
};

const FALLBACK: EstadoCalendarioStyle = {
  bg: '#F3F4F6',
  border: '#D1D5DB',
  text: '#43474F',
  label: '—',
};

export function getEstadoCalendarioStyle(estado: EstadoProyeccion | string): EstadoCalendarioStyle {
  return ESTADO_CALENDARIO[estado as EstadoProyeccion] ?? FALLBACK;
}
