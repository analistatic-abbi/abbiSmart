import { parseIsoDateLocal } from '../../../core/utils/date.util';
import type {
  AgendaGroup,
  CalendarEventLike,
  CalendarRange,
  DayCell,
  DayEventMarker,
  MesCalendario,
} from './calendar.types';
import { MESES_NOMBRES } from './calendar.types';

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfWeekMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function endOfWeekSunday(date: Date): Date {
  const start = startOfWeekMonday(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

export function filterByRange<T extends CalendarEventLike>(
  items: T[],
  rango: CalendarRange,
  ancla: Date,
): T[] {
  if (rango === 'todo') return items;

  if (rango === 'semana') {
    const inicio = startOfWeekMonday(ancla);
    const fin = endOfWeekSunday(ancla);
    return items.filter((item) => {
      const fecha = parseIsoDateLocal(item.fecha);
      return fecha >= inicio && fecha <= fin;
    });
  }

  const inicio = new Date(ancla);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 6);
  return items.filter((item) => {
    const fecha = parseIsoDateLocal(item.fecha);
    return fecha >= inicio && fecha <= fin;
  });
}

export function groupByMonth<T extends CalendarEventLike>(
  items: T[],
  anio: number,
): MesCalendario<T>[] {
  const buckets: T[][] = Array.from({ length: 12 }, () => []);

  for (const item of items) {
    const fecha = parseIsoDateLocal(item.fecha);
    if (fecha.getFullYear() !== anio) continue;
    buckets[fecha.getMonth()].push(item);
  }

  return MESES_NOMBRES.map((nombre, mesIndex) => ({
    mesIndex,
    nombre,
    items: buckets[mesIndex].sort((a, b) => a.fecha.localeCompare(b.fecha)),
  }));
}

export function countByDay<T extends CalendarEventLike>(items: T[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const iso = item.fecha.split('T')[0];
    counts.set(iso, (counts.get(iso) ?? 0) + 1);
  }
  return counts;
}

const DEFAULT_ICONS: Record<string, string> = {
  proyeccion: 'monitoring',
  proceso: 'gavel',
  relacionamiento: 'handshake',
  kam: 'groups',
  reunion_aclaratoria: 'forum',
};

function markerForItem(item: CalendarEventLike): DayEventMarker {
  const tipo = item.tipo ?? 'evento';
  return {
    tipo,
    icono: item.icono ?? DEFAULT_ICONS[tipo] ?? 'event',
  };
}

export function markersByDay<T extends CalendarEventLike>(
  items: T[],
  maxPerDay = 3,
): Map<string, DayEventMarker[]> {
  const map = new Map<string, DayEventMarker[]>();

  for (const item of items) {
    const iso = item.fecha.split('T')[0];
    const markers = map.get(iso) ?? [];
    if (markers.length < maxPerDay) {
      markers.push(markerForItem(item));
    }
    map.set(iso, markers);
  }

  return map;
}

export function buildMonthGrid(
  anio: number,
  mesIndex: number,
  items: CalendarEventLike[],
  selectedIso: string | null,
): DayCell[] {
  const counts = countByDay(items);
  const markersMap = markersByDay(items);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const first = new Date(anio, mesIndex, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(anio, mesIndex, 1 - startOffset);
  const cells: DayCell[] = [];

  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    const iso = toIsoDate(date);
    cells.push({
      date,
      iso,
      inMonth: date.getMonth() === mesIndex,
      isToday: isSameDay(date, today),
      isSelected: selectedIso === iso,
      count: counts.get(iso) ?? 0,
      markers: markersMap.get(iso) ?? [],
    });
  }

  return cells;
}

export function buildAgendaGroups<T extends CalendarEventLike>(items: T[]): AgendaGroup<T>[] {
  const sorted = [...items].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const groups: AgendaGroup<T>[] = [];
  let currentIso = '';

  for (const item of sorted) {
    const iso = item.fecha.split('T')[0];
    if (iso !== currentIso) {
      currentIso = iso;
      const date = parseIsoDateLocal(iso);
      groups.push({
        iso,
        label: date.toLocaleDateString('es-CO', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        items: [],
      });
    }
    groups[groups.length - 1].items.push(item);
  }

  return groups;
}
