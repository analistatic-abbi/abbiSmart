import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ContactosService } from '../../../../core/services/contactos.service';
import { ClientesService } from '../../../../core/services/clientes.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ClienteListItem, Contacto } from '../../../../core/models/crm.model';
import { CrmTabsComponent } from '../../shared/crm-tabs.component';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { TablePaginationComponent } from '../../../../shared/components/table-pagination/table-pagination.component';

type FiltroGenerico = '' | 'true' | 'false';

@Component({
  selector: 'app-contactos-list',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    CrmTabsComponent,
    SearchableSelectComponent,
    TablePaginationComponent,
  ],
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
  protected readonly exportando = signal(false);
  protected readonly exportError = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly clienteId = signal<number | null>(null);
  protected readonly esGenerico = signal<FiltroGenerico>('');
  protected readonly page = signal(1);
  protected readonly limit = signal(50);
  protected readonly total = signal(0);

  protected readonly clienteSelectOptions = computed<SearchableSelectOption<number>[]>(() =>
    this.clientesOptions().map((cliente) => ({
      value: cliente.id,
      label: cliente.empresa,
    })),
  );

  protected readonly tieneFiltrosActivos = computed(
    () => !!this.search().trim() || this.clienteId() != null || !!this.esGenerico(),
  );

  ngOnInit(): void {
    this.clientes.list({ limit: 500 }).subscribe({
      next: (r) => this.clientesOptions.set(r.data ?? []),
      error: () => this.clientesOptions.set([]),
    });
    this.load();
  }

  protected onFilter(): void {
    this.page.set(1);
    this.load();
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected onLimitChange(limit: number): void {
    this.limit.set(limit);
    this.page.set(1);
    this.load();
  }

  protected onEmpresaChange(value: number | null): void {
    this.clienteId.set(value);
    this.onFilter();
  }

  protected limpiarFiltros(): void {
    this.search.set('');
    this.clienteId.set(null);
    this.esGenerico.set('');
    this.page.set(1);
    this.load();
  }

  protected empresaContacto(contacto: Contacto): string {
    const cliente = this.clientesOptions().find((item) => item.id === contacto.clienteId);
    return cliente?.empresa ?? '—';
  }

  protected exportar(): void {
    this.exportando.set(true);
    this.exportError.set(null);
    this.contactos.exportar(
      {
        search: this.search().trim() || undefined,
        clienteId: this.clienteId() ?? undefined,
        esGenerico: this.parseGenerico(this.esGenerico()),
      },
      (message) => {
        this.exportError.set(message);
        this.exportando.set(false);
      },
    );
    setTimeout(() => this.exportando.set(false), 1500);
  }

  private load(): void {
    this.loading.set(true);
    this.contactos
      .list({
        search: this.search().trim() || undefined,
        clienteId: this.clienteId() ?? undefined,
        esGenerico: this.parseGenerico(this.esGenerico()),
        page: this.page(),
        limit: this.limit(),
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
