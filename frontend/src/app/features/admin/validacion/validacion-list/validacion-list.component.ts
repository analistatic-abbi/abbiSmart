import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ValidacionService } from '../../../../core/services/validacion.service';
import { ClientesService } from '../../../../core/services/clientes.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ValidacionPendiente } from '../../../../core/models/admin.model';
import { Rol } from '../../../../core/models/rol.enum';
import { claseBadgeEstadoProceso } from '../../../../core/utils/proceso-ui.util';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-validacion-list',
  standalone: true,
  imports: [FormsModule, RouterLink, SearchableSelectComponent],
  templateUrl: './validacion-list.component.html',
  styleUrl: './validacion-list.component.scss',
})
export class ValidacionListComponent implements OnInit {
  private readonly validacion = inject(ValidacionService);
  private readonly clientesService = inject(ClientesService);
  private readonly auth = inject(AuthService);

  protected readonly items = signal<ValidacionPendiente[]>([]);
  protected readonly loading = signal(true);
  protected readonly search = signal('');
  protected readonly empresaClienteId = signal<number | null>(null);
  protected readonly clientes = signal<Array<{ id: number; empresa: string }>>([]);
  protected readonly esVistaSupervision = computed(() => {
    const rol = this.auth.rol();
    return rol === Rol.Administrador || rol === Rol.SupervisorSistema;
  });

  protected readonly clienteOptions = computed<SearchableSelectOption<number>[]>(() =>
    this.clientes().map((cliente) => ({
      value: cliente.id,
      label: cliente.empresa,
    })),
  );

  protected readonly tieneFiltrosActivos = computed(
    () => !!this.search().trim() || this.empresaClienteId() != null,
  );

  protected readonly badgeClass = (estado: string) => claseBadgeEstadoProceso(estado);

  ngOnInit(): void {
    this.clientesService.list({ limit: 500 }).subscribe({
      next: (r) =>
        this.clientes.set(r.data.map((c) => ({ id: c.id, empresa: c.empresa }))),
    });
    this.load();
  }

  protected onFilter(): void {
    this.load();
  }

  protected onEmpresaChange(value: number | null): void {
    this.empresaClienteId.set(value);
    this.onFilter();
  }

  protected limpiarFiltros(): void {
    this.search.set('');
    this.empresaClienteId.set(null);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.validacion
      .listPendientes(this.search() || undefined, this.empresaClienteId() ?? undefined)
      .subscribe({
        next: (r) => {
          this.items.set(r.data);
          this.loading.set(false);
        },
        error: () => {
          this.items.set([]);
          this.loading.set(false);
        },
      });
  }
}
