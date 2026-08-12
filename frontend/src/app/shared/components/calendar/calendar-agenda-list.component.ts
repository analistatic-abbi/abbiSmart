import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, TemplateRef } from '@angular/core';
import { buildAgendaGroups } from './calendar.utils';
import type { AgendaGroup, CalendarEventLike } from './calendar.types';

@Component({
  selector: 'app-calendar-agenda-list',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './calendar-agenda-list.component.html',
  styleUrl: './calendar-agenda-list.component.scss',
})
export class CalendarAgendaListComponent<T extends CalendarEventLike> {
  readonly items = input.required<T[]>();
  readonly emptyLabel = input('Sin eventos en el periodo seleccionado');

  readonly itemTemplate = input<TemplateRef<{ $implicit: T }>>();
  readonly trackBy = input<(item: T) => string | number>((item) => item.id);

  protected readonly groups = computed<AgendaGroup<T>[]>(() =>
    buildAgendaGroups(this.items()),
  );
}
