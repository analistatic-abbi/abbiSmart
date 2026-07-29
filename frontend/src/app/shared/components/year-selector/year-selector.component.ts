import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-year-selector',
  standalone: true,
  templateUrl: './year-selector.component.html',
  styleUrl: './year-selector.component.scss',
})
export class YearSelectorComponent {
  readonly anio = input.required<number>();
  readonly anterior = output<void>();
  readonly siguiente = output<void>();
}
