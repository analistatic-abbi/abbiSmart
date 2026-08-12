import { NgTemplateOutlet } from '@angular/common';
import { Component, input, TemplateRef } from '@angular/core';
import type { CalendarEventLike, MesCalendario } from './calendar.types';

@Component({
  selector: 'app-calendar-year-board',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './calendar-year-board.component.html',
  styleUrl: './calendar-year-board.component.scss',
})
export class CalendarYearBoardComponent<T extends CalendarEventLike> {
  readonly meses = input.required<MesCalendario<T>[]>();
  readonly ocultarVacios = input(false);
  readonly emptyLabel = input('Sin eventos');
  readonly itemTemplate = input<TemplateRef<{ $implicit: T }>>();
  readonly trackBy = input<(item: T) => string | number>((item) => item.id);
}
