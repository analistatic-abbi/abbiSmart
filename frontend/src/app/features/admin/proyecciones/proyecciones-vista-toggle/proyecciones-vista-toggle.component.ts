import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-proyecciones-vista-toggle',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './proyecciones-vista-toggle.component.html',
  styleUrl: './proyecciones-vista-toggle.component.scss',
})
export class ProyeccionesVistaToggleComponent {
  readonly vistaActual = input.required<'tabla' | 'calendario'>();
  readonly anio = input<number | null>(null);
}
