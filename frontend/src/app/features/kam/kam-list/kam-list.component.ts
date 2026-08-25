import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { KamService } from '../../../core/services/kam.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { EstadoKamRonda, KamListItem } from '../../../core/models/kam.model';
import { claseBadgeEstadoKamRonda } from '../../../core/utils/kam-ui.util';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../shared/components/searchable-select/searchable-select.component';
import { KamVistaToggleComponent } from '../kam-vista-toggle/kam-vista-toggle.component';
import { TablePaginationComponent } from '../../../shared/components/table-pagination/table-pagination.component';

@Component({
  selector: 'app-kam-list',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    SearchableSelectComponent,
    KamVistaToggleComponent,
    TablePaginationComponent,
  ],
  templateUrl: './kam-list.component.html',
  styleUrl: './kam-list.component.scss',
})
export class KamListComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly kamService = inject(KamService);
  private readonly clientesService = inject(ClientesService);

  protected readonly items = signal<KamListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly exportando = signal(false);
  protected readonly exportError = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly estados = Object.values(EstadoKamRonda);
  protected readonly estado = signal<EstadoKamRonda | ''>('');
  protected readonly empresaClienteId = signal<number | null>(null);
  protected readonly clientes = signal<Array<{ id: number; empresa: string }>>([]);
  protected readonly sinReunionAgendada = signal(false);
  protected readonly page = signal(1);
  protected readonly limit = signal(20);
  protected readonly total = signal(0);
  protected readonly alertaCount = signal(0);
  protected readonly badgeClass = (estado: string | null) => claseBadgeEstadoKamRonda(estado);

  protected readonly clienteOptions = computed<SearchableSelectOption<number>[]>(() =>
    this.clientes().map((cliente) => ({
      value: cliente.id,
      label: cliente.empresa,
    })),
  );

  protected readonly tieneFiltrosActivos = computed(
    () =>
      !!this.search().trim() ||
      this.empresaClienteId() != null ||
      !!this.estado() ||
      this.sinReunionAgendada(),
  );

  ngOnInit(): void {
    const empresaClienteId = Number(
      this.route.snapshot.queryParamMap.get('empresaClienteId'),
    );
    if (Number.isInteger(empresaClienteId) && empresaClienteId > 0) {
      this.empresaClienteId.set(empresaClienteId);
    }

    this.clientesService.list({ limit: 500 }).subscribe({
      next: (r) =>
        this.clientes.set(r.data.map((c) => ({ id: c.id, empresa: c.empresa }))),
    });
    this.loadAlertaCount();
    this.load();
  }

  protected onFilter(): void {
    this.page.set(1);
    this.load();
  }

  protected onEmpresaChange(value: number | null): void {
    this.empresaClienteId.set(value);
    this.onFilter();
  }

  protected limpiarFiltros(): void {
    this.search.set('');
    this.empresaClienteId.set(null);
    this.estado.set('');
    this.sinReunionAgendada.set(false);
    this.page.set(1);
    this.load();
  }

  protected toggleAlerta(): void {
    this.sinReunionAgendada.update((v) => !v);
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

  protected exportar(): void {
    this.exportando.set(true);
    this.exportError.set(null);
    this.kamService.exportar(
      {
        search: this.search().trim() || undefined,
        empresaClienteId: this.empresaClienteId() ?? undefined,
        estadoRonda: this.estado() || undefined,
        sinReunionAgendada: this.sinReunionAgendada() || undefined,
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
    this.kamService
      .list({
        search: this.search() || undefined,
        empresaClienteId: this.empresaClienteId() ?? undefined,
        estadoRonda: this.estado() || undefined,
        sinReunionAgendada: this.sinReunionAgendada() || undefined,
        page: this.page(),
        limit: this.limit(),
      })
      .subscribe({
        next: (r) => {
          this.items.set(r.data);
          this.total.set(r.total);
          this.loading.set(false);
          if (this.sinReunionAgendada()) {
            this.alertaCount.set(r.total);
          }
        },
        error: () => {
          this.items.set([]);
          this.total.set(0);
          this.loading.set(false);
        },
      });
  }

  private loadAlertaCount(): void {
    this.kamService.list({ sinReunionAgendada: true, page: 1, limit: 1 }).subscribe({
      next: (r) => this.alertaCount.set(r.total),
      error: () => this.alertaCount.set(0),
    });
  }
}
