import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output, TemplateRef } from '@angular/core';
import { parseIsoDateLocal } from '../../../core/utils/date.util';
import { buildMonthGrid } from './calendar.utils';
import type { CalendarEventLike, DayCell } from './calendar.types';
import { DIAS_SEMANA } from './calendar.types';

@Component({
  selector: 'app-calendar-month-grid',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './calendar-month-grid.component.html',
  styleUrl: './calendar-month-grid.component.scss',
})
export class CalendarMonthGridComponent<T extends CalendarEventLike> {
  readonly items = input.required<T[]>();
  readonly anio = input.required<number>();
  readonly mes = input.required<number>();
  readonly selectedDay = input<string | null>(null);

  readonly daySelect = output<string>();

  protected readonly diasSemana = DIAS_SEMANA;

  protected readonly cells = computed<DayCell[]>(() =>
    buildMonthGrid(this.anio(), this.mes(), this.items(), this.selectedDay()),
  );

  protected readonly selectedDayItems = computed(() => {
    const iso = this.selectedDay();
    if (!iso) return [];
    return this.items().filter((item) => item.fecha.split('T')[0] === iso);
  });

  protected readonly selectedDayLabel = computed(() => {
    const iso = this.selectedDay();
    if (!iso) return '';
    return parseIsoDateLocal(iso).toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  });

  readonly itemTemplate = input<TemplateRef<{ $implicit: T }>>();
  readonly trackBy = input<(item: T) => string | number>((item) => item.id);

  protected markerLabel(tipo: string): string {
    const labels: Record<string, string> = {
      proyeccion: 'Proyección',
      proceso: 'Proceso',
      relacionamiento: 'Relacionamiento',
      kam: 'Reunión KAM',
      reunion_aclaratoria: 'Reunión aclaratoria',
      evento: 'Evento',
    };
    return labels[tipo] ?? 'Evento';
  }
}
