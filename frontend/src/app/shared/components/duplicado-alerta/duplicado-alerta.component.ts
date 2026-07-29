import { DecimalPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface DuplicadoSugerencia {
  id: number;
  nombre: string;
  similitud: number;
  clienteNombre?: string | null;
}

@Component({
  selector: 'app-duplicado-alerta',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './duplicado-alerta.component.html',
  styleUrl: './duplicado-alerta.component.scss',
})
export class DuplicadoAlertaComponent {
  readonly tipo = input.required<'cliente' | 'contacto'>();
  readonly sugerencias = input<DuplicadoSugerencia[]>([]);
  readonly dismissed = output<void>();

  protected labelTipo(): string {
    return this.tipo() === 'cliente' ? 'Cliente' : 'Contacto';
  }

  protected ruta(id: number): string[] {
    return this.tipo() === 'cliente'
      ? ['/crm/clientes', String(id)]
      : ['/crm/contactos', String(id), 'editar'];
  }
}
