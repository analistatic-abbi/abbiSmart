export type CalendarView = 'anio' | 'mes' | 'agenda';
export type CalendarRange = 'todo' | 'semana' | '7d';

export interface CalendarEventLike {
  id: number | string;
  fecha: string;
  icono?: string;
  tipo?: string;
}

export interface DayEventMarker {
  icono: string;
  tipo: string;
}

export interface DayCell {
  date: Date;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  count: number;
  markers: DayEventMarker[];
}
export interface MesCalendario<T extends CalendarEventLike> {
  mesIndex: number;
  nombre: string;
  items: T[];
}

export interface AgendaGroup<T extends CalendarEventLike> {
  iso: string;
  label: string;
  items: T[];
}

export const MESES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const;

export const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;
