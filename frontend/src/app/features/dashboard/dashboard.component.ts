import { DecimalPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  DashboardProceso,
  DashboardProyecciones,
  DashboardResumen,
  DashboardService,
  ReporteGenerado,
} from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { formatCurrencyAbbreviated, formatCurrencyFull } from '../../core/utils/currency.util';
import { formatFechaHora } from '../../core/utils/date.util';
import { claseBadgeEstadoProyeccion } from '../../core/utils/proyeccion-ui.util';

const DASHBOARD_PROCESOS_FILTERS_KEY = 'abbi.dashboard.procesos.filters';

interface DashboardProcesosFiltersState {
  search: string;
  fechaCierreDesde: string;
  fechaCierreHasta: string;
}

const DASHBOARD_PROCESOS_FILTER_QUERY_KEYS = [
  'search',
  'fechaCierreDesde',
  'fechaCierreHasta',
] as const;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly dashboard = inject(DashboardService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly resumen = signal<DashboardResumen | null>(null);
  protected readonly procesos = signal<DashboardProceso[]>([]);
  protected readonly proyecciones = signal<DashboardProyecciones | null>(null);
  protected readonly reportes = signal<ReporteGenerado[]>([]);
  protected readonly loading = signal(true);
  protected readonly exportando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly sinPermiso = signal(false);
  protected readonly anioProyecciones = signal(new Date().getFullYear());
  protected readonly searchProcesos = signal('');
  protected readonly fechaCierreDesde = signal('');
  protected readonly fechaCierreHasta = signal('');
  protected readonly buscandoProcesos = signal(false);
  protected readonly procesosBuscados = signal(false);
  protected readonly errorProcesos = signal<string | null>(null);
  protected readonly exportError = signal<string | null>(null);
  protected readonly formatMoney = formatCurrencyAbbreviated;
  protected readonly formatFecha = formatFechaHora;
  protected readonly badgeClass = (estado: string) => claseBadgeEstadoProyeccion(estado);
  protected readonly puedeVerReportes = () => this.auth.puedeCerrarProyeccion();

  protected moneyTitle(value: string | number | null | undefined): string {
    return formatCurrencyFull(value, 2);
  }

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('sinPermiso') === '1') {
      this.sinPermiso.set(true);
      void this.router.navigate([], {
        queryParams: { sinPermiso: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
    this.syncProcesosFiltersFromRoute();
    this.loadAll();
  }

  protected cerrarSinPermiso(): void {
    this.sinPermiso.set(false);
  }

  protected onAnioChange(): void {
    this.dashboard.getProyecciones(this.anioProyecciones()).subscribe({
      next: (r) => this.proyecciones.set(r.data),
      error: () => this.proyecciones.set(null),
    });
  }

  protected buscarProcesos(): void {
    const term = this.searchProcesos().trim();
    this.errorProcesos.set(null);
    void this.persistProcesosFiltersInUrl();

    if (!term) {
      this.procesos.set([]);
      this.procesosBuscados.set(false);
      return;
    }

    this.buscandoProcesos.set(true);
    this.procesosBuscados.set(true);
    this.dashboard.getProcesos(
      term,
      this.fechaCierreDesde() || undefined,
      this.fechaCierreHasta() || undefined,
    ).subscribe({
      next: (r) => {
        this.procesos.set(r.data ?? []);
        this.buscandoProcesos.set(false);
      },
      error: () => {
        this.procesos.set([]);
        this.buscandoProcesos.set(false);
        this.errorProcesos.set('No fue posible buscar procesos. Intente de nuevo.');
      },
    });
  }

  protected estadoEntries(resumen: DashboardResumen): Array<{ estado: string; total: number }> {
    return resumen.porEstado ?? [];
  }

  protected segmentoEntries(resumen: DashboardResumen): Array<{ label: string; total: number }> {
    return (resumen.porSegmento ?? []).map((item) => ({
      label: item.segmento,
      total: item.total,
    }));
  }

  protected exportarDashboard(): void {
    this.exportando.set(true);
    this.exportError.set(null);
    this.dashboard.exportar(
      this.searchProcesos(),
      this.anioProyecciones(),
      this.fechaCierreDesde() || undefined,
      this.fechaCierreHasta() || undefined,
      (message) => {
        this.exportError.set(message);
        this.exportando.set(false);
      },
    );
    setTimeout(() => this.exportando.set(false), 1500);
  }

  protected descargarReporte(reporte: ReporteGenerado): void {
    this.exportError.set(null);
    this.dashboard.descargarReporte(reporte.id, reporte.nombreArchivo, (message) => {
      this.exportError.set(message);
    });
  }

  private loadAll(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dashboard.getResumen().subscribe({
      next: (r) => this.resumen.set(r.resumen),
      error: () => this.error.set('No fue posible cargar el resumen del dashboard.'),
    });

    const searchTerm = this.searchProcesos().trim();
    if (!searchTerm) {
      this.procesos.set([]);
    }

    this.dashboard.getProyecciones(this.anioProyecciones()).subscribe({
      next: (r) => {
        this.proyecciones.set(r.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });

    if (this.puedeVerReportes()) {
      this.dashboard.getReportes().subscribe({
        next: (r) => this.reportes.set(r.data ?? []),
        error: () => this.reportes.set([]),
      });
    }

    if (searchTerm) {
      this.buscarProcesos();
    }
  }

  private syncProcesosFiltersFromRoute(): void {
    const params = this.route.snapshot.queryParamMap;
    const hasUrlFilters = DASHBOARD_PROCESOS_FILTER_QUERY_KEYS.some((key) => params.has(key));

    if (hasUrlFilters) {
      this.applyProcesosFiltersState(this.readProcesosFiltersFromQueryParams(params));
      this.saveProcesosFiltersToSession();
      return;
    }

    const stored = this.readProcesosFiltersFromSession();
    if (stored) {
      this.applyProcesosFiltersState(stored);
      void this.persistProcesosFiltersInUrl();
    }
  }

  private applyProcesosFiltersState(state: DashboardProcesosFiltersState): void {
    this.searchProcesos.set(state.search);
    this.fechaCierreDesde.set(state.fechaCierreDesde);
    this.fechaCierreHasta.set(state.fechaCierreHasta);
  }

  private readProcesosFiltersFromQueryParams(
    params: { get: (key: string) => string | null },
  ): DashboardProcesosFiltersState {
    return {
      search: params.get('search') ?? '',
      fechaCierreDesde: params.get('fechaCierreDesde') ?? '',
      fechaCierreHasta: params.get('fechaCierreHasta') ?? '',
    };
  }

  private readProcesosFiltersFromSession(): DashboardProcesosFiltersState | null {
    try {
      const raw = sessionStorage.getItem(DASHBOARD_PROCESOS_FILTERS_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as DashboardProcesosFiltersState;
    } catch {
      return null;
    }
  }

  private saveProcesosFiltersToSession(): void {
    sessionStorage.setItem(
      DASHBOARD_PROCESOS_FILTERS_KEY,
      JSON.stringify(this.currentProcesosFiltersState()),
    );
  }

  private currentProcesosFiltersState(): DashboardProcesosFiltersState {
    return {
      search: this.searchProcesos(),
      fechaCierreDesde: this.fechaCierreDesde(),
      fechaCierreHasta: this.fechaCierreHasta(),
    };
  }

  private persistProcesosFiltersInUrl(): Promise<boolean> {
    this.saveProcesosFiltersToSession();
    const term = this.searchProcesos().trim();
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: term || null,
        fechaCierreDesde: this.fechaCierreDesde() || null,
        fechaCierreHasta: this.fechaCierreHasta() || null,
      },
      queryParamsHandling: 'merge',
    });
  }
}
