import { Component, input, output } from '@angular/core';
import type { CalendarView } from './calendar.types';

@Component({
  selector: 'app-calendar-toolbar',
  standalone: true,
  templateUrl: './calendar-toolbar.component.html',
  styleUrl: './calendar-toolbar.component.scss',
})
export class CalendarToolbarComponent {
  readonly vista = input.required<CalendarView>();
  readonly ocultarVacios = input(false);
  readonly showOcultarVacios = input(true);

  readonly vistaChange = output<CalendarView>();
  readonly hoyClick = output<void>();
  readonly ocultarVaciosChange = output<boolean>();
}
