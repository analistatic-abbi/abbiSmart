import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AUDIT_ACCION_OPTIONS,
  AUDIT_ENTIDAD_OPTIONS,
} from '../../../../core/constants/audit-filtros.const';
import { AuditService } from '../../../../core/services/audit.service';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { AuditLog, Usuario } from '../../../../core/models/admin.model';
import { formatFechaHora } from '../../../../core/utils/date.util';
import { mensajeErrorApi } from '../../../../core/utils/api-error.util';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { TablePaginationComponent } from '../../../../shared/components/table-pagination/table-pagination.component';

@Component({
  selector: 'app-auditoria-list',
  standalone: true,
  imports: [FormsModule, RouterLink, SearchableSelectComponent, TablePaginationComponent],
  templateUrl: './auditoria-list.component.html',
  styleUrl: './auditoria-list.component.scss',
})
export class AuditoriaListComponent implements OnInit {
  private readonly audit = inject(AuditService);
  private readonly usuarios = inject(UsuariosService);

  protected readonly items = signal<AuditLog[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = signal(50);
  protected readonly entidadTipo = signal('');
  protected readonly accion = signal('');
  protected readonly fechaDesde = signal('');
  protected readonly fechaHasta = signal('');
  protected readonly usuarioId = signal<number | null>(null);
  protected readonly usuariosList = signal<Usuario[]>([]);
  protected readonly accionOptions = AUDIT_ACCION_OPTIONS;
  protected readonly entidadOptions = AUDIT_ENTIDAD_OPTIONS;
  protected readonly formatFechaHora = formatFechaHora;

  protected readonly usuarioOptions = computed<SearchableSelectOption<number>[]>(() =>
    this.usuariosList().map((u) => ({
      value: u.id,
      label: `${u.nombre} (${u.correo})`,
    })),
  );

  protected readonly tieneFiltrosActivos = computed(
    () =>
      this.usuarioId() != null ||
      !!this.fechaDesde() ||
      !!this.fechaHasta() ||
      !!this.entidadTipo() ||
      !!this.accion(),
  );

  ngOnInit(): void {
    this.usuarios.list({ limit: 500 }).subscribe({
      next: (r) => this.usuariosList.set(r.data),
      error: () => this.usuariosList.set([]),
    });
    this.load();
  }

  protected onFilter(): void {
    this.page.set(1);
    this.load();
  }

  protected onUsuarioChange(value: number | null): void {
    this.usuarioId.set(value);
    this.onFilter();
  }

  protected limpiarFiltros(): void {
    this.usuarioId.set(null);
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.entidadTipo.set('');
    this.accion.set('');
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

  protected usuarioLabel(log: AuditLog): string {
    if (log.usuarioNombre) return log.usuarioNombre;
    if (log.usuarioId) return `Usuario #${log.usuarioId}`;
    return 'Sistema';
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.audit
      .list({
        usuarioId: this.usuarioId() ?? undefined,
        entidadTipo: this.entidadTipo() || undefined,
        accion: this.accion() || undefined,
        fechaDesde: this.fechaDesde() || undefined,
        fechaHasta: this.fechaHasta() || undefined,
        page: this.page(),
        limit: this.limit(),
      })
      .subscribe({
        next: (r) => {
          this.items.set(r.data);
          this.total.set(r.total ?? r.data.length);
          this.loading.set(false);
        },
        error: (err) => {
          this.items.set([]);
          this.total.set(0);
          this.error.set(mensajeErrorApi(err, 'No se pudieron cargar los registros de auditoría.'));
          this.loading.set(false);
        },
      });
  }
}
