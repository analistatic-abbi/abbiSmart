export type FiltroEliminados = 'activos' | 'todos' | 'solo_eliminados';

export const FILTRO_ELIMINADOS_OPCIONES: Array<{
  value: FiltroEliminados;
  label: string;
}> = [
  { value: 'activos', label: 'Solo activos' },
  { value: 'todos', label: 'Activos y eliminados' },
  { value: 'solo_eliminados', label: 'Solo eliminados' },
];
