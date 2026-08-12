import { Component, computed, input, output } from '@angular/core';
import type { CalendarView } from './calendar.types';
import { MESES_NOMBRES } from './calendar.types';

@Component({
  selector: 'app-calendar-period-nav',
  standalone: true,
  templateUrl: './calendar-period-nav.component.html',
  styleUrl: './calendar-period-nav.component.scss',
})
export class CalendarPeriodNavComponent {
  readonly vista = input.required<CalendarView>();
  readonly anio = input.required<number>();
  readonly mes = input(0);

  readonly anterior = output<void>();
  readonly siguiente = output<void>();

  protected readonly label = computed(() => {
    if (this.vista() === 'mes') {
      return `${MESES_NOMBRES[this.mes()]} ${this.anio()}`;
    }
    return String(this.anio());
  });
}
