import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
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
import { CatalogosService } from '../../core/services/catalogos.service';
import { ClientesService } from '../../core/services/clientes.service';
import {
  FILTRO_ELIMINADOS_OPCIONES,
  FiltroEliminados,
} from '../../core/models/filtro-eliminados.model';
import { PORTAL_ORIGEN_OPCIONES } from '../../core/models/portal-origen.model';
import { CatalogoPaisItem } from '../../core/models/pais-config.model';
import {
  EstadoProceso,
  TipoInstrumento,
  TipoProceso,
} from '../../core/models/proceso.model';
import { formatCurrencyAbbreviated, formatCurrencyFull } from '../../core/utils/currency.util';
import { formatFechaHora } from '../../core/utils/date.util';
import { claseBadgeEstadoProceso } from '../../core/utils/proceso-ui.util';
import { claseBadgeEstadoProyeccion } from '../../core/utils/proyeccion-ui.util';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../shared/components/searchable-select/searchable-select.component';

const DASHBOARD_PROCESOS_FILTERS_KEY = 'abbi.dashboard.procesos.filters';

interface DashboardProcesosFiltersState {
  search: string;
  estado: string;
  segmento: string;
  tipoProceso: string;
  tipoInstrumento: string;
  portalOrigen: string;
  empresaClienteId: number | null;
  fechaCierreDesde: string;
  fechaCierreHasta: string;
  filtroEliminados: FiltroEliminados;
}

const DASHBOARD_PROCESOS_FILTER_QUERY_KEYS = [
  'search',
  'estado',
  'segmento',
  'tipoProceso',
  'tipoInstrumento',
  'portalOrigen',
  'empresaClienteId',
  'fechaCierreDesde',
  'fechaCierreHasta',
  'filtroEliminados',
] as const;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe, SearchableSelectComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly dashboard = inject(DashboardService);
  private readonly auth = inject(AuthService);
  private readonly catalogos = inject(CatalogosService);
  private readonly clientesService = inject(ClientesService);
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
  protected readonly estado = signal<EstadoProceso | ''>('');
  protected readonly segmento = signal('');
  protected readonly tipoProceso = signal<TipoProceso | ''>('');
  protected readonly tipoInstrumento = signal<TipoInstrumento | ''>('');
  protected readonly portalOrigen = signal('');
  protected readonly empresaClienteId = signal<number | null>(null);
  protected readonly fechaCierreDesde = signal('');
  protected readonly fechaCierreHasta = signal('');
  protected readonly filtroEliminados = signal<FiltroEliminados>('activos');

  protected readonly estados = Object.values(EstadoProceso);
  protected readonly segmentos = signal<CatalogoPaisItem[]>([]);
  protected readonly tiposProceso = Object.values(TipoProceso);
  protected readonly tiposInstrumento = Object.values(TipoInstrumento);
  protected readonly portalesOrigen = PORTAL_ORIGEN_OPCIONES;
  protected readonly filtrosEliminados = FILTRO_ELIMINADOS_OPCIONES;
  protected readonly clientes = signal<Array<{ id: number; empresa: string }>>([]);

  protected readonly clienteOptions = computed<SearchableSelectOption<number>[]>(() =>
    this.clientes().map((cliente) => ({
      value: cliente.id,
      label: cliente.empresa,
    })),
  );

  protected readonly buscandoProcesos = signal(false);
  protected readonly procesosBuscados = signal(false);
  protected readonly errorProcesos = signal<string | null>(null);
  protected readonly exportError = signal<string | null>(null);
  protected readonly formatMoney = formatCurrencyAbbreviated;
  protected readonly formatFecha = formatFechaHora;
  protected readonly badgeClass = (estado: string) => claseBadgeEstadoProyeccion(estado);
  protected readonly procesoBadgeClass = (estado: string) => claseBadgeEstadoProceso(estado);
  protected readonly puedeVerReportes = () => this.auth.puedeCerrarProyeccion();
  protected readonly puedeVerEliminados = () => this.auth.puedeVerEliminados();

  protected readonly tieneFiltrosActivos = computed(
    () =>
      !!this.searchProcesos().trim() ||
      !!this.estado() ||
      !!this.segmento() ||
      !!this.tipoProceso() ||
      !!this.tipoInstrumento() ||
      !!this.portalOrigen() ||
      this.empresaClienteId() != null ||
      !!this.fechaCierreDesde() ||
      !!this.fechaCierreHasta() ||
      this.filtroEliminados() !== 'activos',
  );

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

    this.catalogos.getCatalogoSesion('segmento_proceso', false).subscribe((r) =>
      this.segmentos.set(r.data),
    );
    this.clientesService.list({ limit: 500 }).subscribe({
      next: (r) =>
        this.clientes.set(r.data.map((c) => ({ id: c.id, empresa: c.empresa }))),
    });

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

  protected onEmpresaChange(value: number | null): void {
    this.empresaClienteId.set(value);
    this.buscarProcesos();
  }

  protected buscarProcesos(): void {
    this.errorProcesos.set(null);
    void this.persistProcesosFiltersInUrl();

    if (!this.tieneFiltrosActivos()) {
      this.procesos.set([]);
      this.procesosBuscados.set(false);
      return;
    }

    this.buscandoProcesos.set(true);
    this.procesosBuscados.set(true);
    this.dashboard.getProcesos(this.currentProcesosApiFilters()).subscribe({
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

  protected limpiarFiltrosProcesos(): void {
    this.searchProcesos.set('');
    this.estado.set('');
    this.segmento.set('');
    this.tipoProceso.set('');
    this.tipoInstrumento.set('');
    this.portalOrigen.set('');
    this.empresaClienteId.set(null);
    this.fechaCierreDesde.set('');
    this.fechaCierreHasta.set('');
    this.filtroEliminados.set('activos');
    this.procesos.set([]);
    this.procesosBuscados.set(false);
    this.errorProcesos.set(null);
    sessionStorage.removeItem(DASHBOARD_PROCESOS_FILTERS_KEY);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: null,
        estado: null,
        segmento: null,
        tipoProceso: null,
        tipoInstrumento: null,
        portalOrigen: null,
        empresaClienteId: null,
        fechaCierreDesde: null,
        fechaCierreHasta: null,
        filtroEliminados: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  protected estadoEntries(resumen: DashboardResumen): Array<{ estado: string; total: number }> {
    return resumen.porEstado ?? [];
  }

  protected porcentajeEstado(total: number, parte: number): string {
    if (!total || total <= 0) return '0%';
    return `${Math.round((parte / total) * 100)}%`;
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
      this.currentProcesosApiFilters(),
      this.anioProyecciones(),
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

    if (!this.tieneFiltrosActivos()) {
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

    if (this.tieneFiltrosActivos()) {
      this.buscarProcesos();
    }
  }

  private currentProcesosApiFilters() {
    return {
      search: this.searchProcesos().trim() || undefined,
      estado: this.estado() || undefined,
      segmento: this.segmento() || undefined,
      tipoProceso: this.tipoProceso() || undefined,
      tipoInstrumento: this.tipoInstrumento() || undefined,
      portalOrigen: this.portalOrigen() || undefined,
      empresaClienteId: this.empresaClienteId() ?? undefined,
      fechaCierreDesde: this.fechaCierreDesde() || undefined,
      fechaCierreHasta: this.fechaCierreHasta() || undefined,
      filtroEliminados: this.filtroEliminados(),
    };
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
    this.estado.set((state.estado as EstadoProceso | '') || '');
    this.segmento.set(state.segmento);
    this.tipoProceso.set((state.tipoProceso as TipoProceso | '') || '');
    this.tipoInstrumento.set((state.tipoInstrumento as TipoInstrumento | '') || '');
    this.portalOrigen.set(state.portalOrigen);
    this.empresaClienteId.set(state.empresaClienteId);
    this.fechaCierreDesde.set(state.fechaCierreDesde);
    this.fechaCierreHasta.set(state.fechaCierreHasta);
    this.filtroEliminados.set(state.filtroEliminados || 'activos');
  }

  private readProcesosFiltersFromQueryParams(
    params: { get: (key: string) => string | null },
  ): DashboardProcesosFiltersState {
    const empresaRaw = params.get('empresaClienteId');
    const empresaClienteId =
      empresaRaw && !Number.isNaN(Number(empresaRaw)) ? Number(empresaRaw) : null;

    return {
      search: params.get('search') ?? '',
      estado: params.get('estado') ?? '',
      segmento: params.get('segmento') ?? '',
      tipoProceso: params.get('tipoProceso') ?? '',
      tipoInstrumento: params.get('tipoInstrumento') ?? '',
      portalOrigen: params.get('portalOrigen') ?? '',
      empresaClienteId,
      fechaCierreDesde: params.get('fechaCierreDesde') ?? '',
      fechaCierreHasta: params.get('fechaCierreHasta') ?? '',
      filtroEliminados: (params.get('filtroEliminados') as FiltroEliminados) || 'activos',
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
      estado: this.estado(),
      segmento: this.segmento(),
      tipoProceso: this.tipoProceso(),
      tipoInstrumento: this.tipoInstrumento(),
      portalOrigen: this.portalOrigen(),
      empresaClienteId: this.empresaClienteId(),
      fechaCierreDesde: this.fechaCierreDesde(),
      fechaCierreHasta: this.fechaCierreHasta(),
      filtroEliminados: this.filtroEliminados(),
    };
  }

  private persistProcesosFiltersInUrl(): Promise<boolean> {
    this.saveProcesosFiltersToSession();
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: this.searchProcesos().trim() || null,
        estado: this.estado() || null,
        segmento: this.segmento() || null,
        tipoProceso: this.tipoProceso() || null,
        tipoInstrumento: this.tipoInstrumento() || null,
        portalOrigen: this.portalOrigen() || null,
        empresaClienteId: this.empresaClienteId(),
        fechaCierreDesde: this.fechaCierreDesde() || null,
        fechaCierreHasta: this.fechaCierreHasta() || null,
        filtroEliminados:
          this.filtroEliminados() !== 'activos' ? this.filtroEliminados() : null,
      },
      queryParamsHandling: 'merge',
    });
  }
}
