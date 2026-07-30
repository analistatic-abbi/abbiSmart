import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ContactosService } from '../../../../core/services/contactos.service';
import { ClientesService } from '../../../../core/services/clientes.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ClienteListItem, Contacto } from '../../../../core/models/crm.model';
import { CrmTabsComponent } from '../../shared/crm-tabs.component';

type FiltroGenerico = '' | 'true' | 'false';

@Component({
  selector: 'app-contactos-list',
  standalone: true,
  imports: [FormsModule, RouterLink, CrmTabsComponent],
  templateUrl: './contactos-list.component.html',
  styleUrl: './contactos-list.component.scss',
})
export class ContactosListComponent implements OnInit {
  private readonly contactos = inject(ContactosService);
  private readonly clientes = inject(ClientesService);
  private readonly auth = inject(AuthService);

  protected readonly puedeEscribir = () => this.auth.puedeEscribir();

  protected readonly items = signal<Contacto[]>([]);
  protected readonly clientesOptions = signal<ClienteListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly search = signal('');
  protected readonly clienteId = signal<number | ''>('');
  protected readonly esGenerico = signal<FiltroGenerico>('');
  protected readonly total = signal(0);

  protected readonly tieneFiltrosActivos = computed(
    () => !!this.search().trim() || !!this.clienteId() || !!this.esGenerico(),
  );

  ngOnInit(): void {
    this.clientes.list({ limit: 500 }).subscribe({
      next: (r) => this.clientesOptions.set(r.data ?? []),
      error: () => this.clientesOptions.set([]),
    });
    this.load();
  }

  protected onFilter(): void {
    this.load();
  }

  protected limpiarFiltros(): void {
    this.search.set('');
    this.clienteId.set('');
    this.esGenerico.set('');
    this.load();
  }

  protected empresaContacto(contacto: Contacto): string {
    const cliente = this.clientesOptions().find((item) => item.id === contacto.clienteId);
    return cliente?.empresa ?? '—';
  }

  private load(): void {
    this.loading.set(true);
    this.contactos
      .list({
        search: this.search().trim() || undefined,
        clienteId: this.clienteId() ? Number(this.clienteId()) : undefined,
        esGenerico: this.parseGenerico(this.esGenerico()),
        limit: 500,
      })
      .subscribe({
        next: (r) => {
          this.items.set(r.data);
          this.total.set(r.total ?? r.data.length);
          this.loading.set(false);
        },
        error: () => {
          this.items.set([]);
          this.total.set(0);
          this.loading.set(false);
        },
      });
  }

  private parseGenerico(value: FiltroGenerico): boolean | undefined {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }
}
