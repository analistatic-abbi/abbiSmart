import { Component, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClientesService } from '../../../../core/services/clientes.service';

export interface ClienteHistorialItem {
  tipo: 'proceso' | 'relacionamiento';
  entidadId: number;
  fecha: string;
  titulo: string;
  subtitulo?: string | null;
  estado?: string | null;
  contactoNombre?: string | null;
}

@Component({
  selector: 'app-cliente-historial',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cliente-historial.component.html',
  styleUrl: './cliente-historial.component.scss',
})
export class ClienteHistorialComponent implements OnInit {
  private readonly clientes = inject(ClientesService);

  readonly clienteId = input.required<number>();

  protected readonly items = signal<ClienteHistorialItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = 50;

  ngOnInit(): void {
    this.load(1, false);
  }

  protected cargarMas(): void {
    if (this.items().length >= this.total()) return;
    this.load(this.page() + 1, true);
  }

  protected puedeCargarMas(): boolean {
    return this.items().length < this.total();
  }

  protected ruta(item: ClienteHistorialItem): string[] {
    return item.tipo === 'proceso'
      ? ['/procesos', String(item.entidadId)]
      : ['/crm/relacionamientos', String(item.entidadId)];
  }

  private load(page: number, append: boolean): void {
    if (append) {
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
    }

    this.clientes.getHistorial(this.clienteId(), page, this.limit).subscribe({
      next: (r) => {
        this.total.set(r.total);
        this.page.set(page);
        this.items.update((current) => (append ? [...current, ...r.data] : r.data));
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: () => {
        this.items.set([]);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
  }
}
