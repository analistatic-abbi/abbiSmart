import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-kam-vista-toggle',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './kam-vista-toggle.component.html',
  styleUrl: './kam-vista-toggle.component.scss',
})
export class KamVistaToggleComponent {
  readonly vistaActual = input.required<'tabla' | 'calendario'>();
  readonly anio = input<number | null>(null);
}
