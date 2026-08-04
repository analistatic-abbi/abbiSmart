import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProcesosService } from '../../../core/services/procesos.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  FILTRO_ELIMINADOS_OPCIONES,
  FiltroEliminados,
} from '../../../core/models/filtro-eliminados.model';
import {
  EstadoProceso,
  ProcesoListItem,
  SegmentoProceso,
  TipoInstrumento,
  TipoProceso,
} from '../../../core/models/proceso.model';

const PROCESOS_LIST_FILTERS_KEY = 'abbi.procesos-list.filters';

interface ProcesosListFiltersState {
  search: string;
  estado: string;
  segmento: string;
  tipoProceso: string;
  tipoInstrumento: string;
  fechaCierreDesde: string;
  fechaCierreHasta: string;
  filtroEliminados: FiltroEliminados;
}

const PROCESOS_LIST_FILTER_QUERY_KEYS = [
  'search',
  'estado',
  'segmento',
  'tipoProceso',
  'tipoInstrumento',
  'fechaCierreDesde',
  'fechaCierreHasta',
  'filtroEliminados',
] as const;

@Component({
  selector: 'app-procesos-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './procesos-list.component.html',
  styleUrl: './procesos-list.component.scss',
})
export class ProcesosListComponent implements OnInit {
  private readonly procesos = inject(ProcesosService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly puedeEscribir = () => this.auth.puedeEscribir();
  protected readonly puedeVerEliminados = () => this.auth.puedeVerEliminados();

  protected readonly estados = Object.values(EstadoProceso);
  protected readonly segmentos = Object.values(SegmentoProceso);
  protected readonly tiposProceso = Object.values(TipoProceso);
  protected readonly tiposInstrumento = Object.values(TipoInstrumento);
  protected readonly filtrosEliminados = FILTRO_ELIMINADOS_OPCIONES;

  protected readonly items = signal<ProcesoListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly search = signal('');
  protected readonly estado = signal<EstadoProceso | ''>('');
  protected readonly segmento = signal<SegmentoProceso | ''>('');
  protected readonly tipoProceso = signal<TipoProceso | ''>('');
  protected readonly tipoInstrumento = signal<TipoInstrumento | ''>('');
  protected readonly fechaCierreDesde = signal('');
  protected readonly fechaCierreHasta = signal('');
  protected readonly filtroEliminados = signal<FiltroEliminados>('activos');
  protected readonly total = signal(0);
  protected readonly exportando = signal(false);
  protected readonly exportError = signal<string | null>(null);

  protected readonly tieneFiltrosActivos = computed(
    () =>
      !!this.search().trim() ||
      !!this.estado() ||
      !!this.segmento() ||
      !!this.tipoProceso() ||
      !!this.tipoInstrumento() ||
      !!this.fechaCierreDesde() ||
      !!this.fechaCierreHasta() ||
      this.filtroEliminados() !== 'activos',
  );

  ngOnInit(): void {
    this.syncFiltersFromRoute();
    this.load();
  }

  protected onFilter(): void {
    void this.persistFiltersInUrl();
    this.load();
  }

  protected limpiarFiltros(): void {
    this.search.set('');
    this.estado.set('');
    this.segmento.set('');
    this.tipoProceso.set('');
    this.tipoInstrumento.set('');
    this.fechaCierreDesde.set('');
    this.fechaCierreHasta.set('');
    this.filtroEliminados.set('activos');
    sessionStorage.removeItem(PROCESOS_LIST_FILTERS_KEY);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: null,
        estado: null,
        segmento: null,
        tipoProceso: null,
        tipoInstrumento: null,
        fechaCierreDesde: null,
        fechaCierreHasta: null,
        filtroEliminados: null,
      },
      queryParamsHandling: 'merge',
    });
    this.load();
  }

  protected exportar(): void {
    this.exportando.set(true);
    this.exportError.set(null);
    this.procesos.exportar(this.buildParams(), (message) => {
      this.exportError.set(message);
      this.exportando.set(false);
    });
    setTimeout(() => this.exportando.set(false), 1500);
  }

  private load(): void {
    this.loading.set(true);
    this.procesos.list(this.buildParams()).subscribe({
      next: (response) => {
        this.items.set(response.data ?? []);
        this.total.set(response.total ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.total.set(0);
        this.loading.set(false);
      },
    });
  }

  protected mostrarDevolucionValidacion(proceso: ProcesoListItem): boolean {
    return Boolean(
      proceso.devueltoValidacion && proceso.estado === EstadoProceso.EnProceso,
    );
  }

  private buildParams() {
    return {
      page: 1,
      limit: 50,
      search: this.search().trim() || undefined,
      estado: this.estado() || undefined,
      segmento: this.segmento() || undefined,
      tipoProceso: this.tipoProceso() || undefined,
      tipoInstrumento: this.tipoInstrumento() || undefined,
      fechaCierreDesde: this.fechaCierreDesde() || undefined,
      fechaCierreHasta: this.fechaCierreHasta() || undefined,
      filtroEliminados: this.filtroEliminados(),
    };
  }

  private syncFiltersFromRoute(): void {
    const params = this.route.snapshot.queryParamMap;
    const hasUrlFilters = PROCESOS_LIST_FILTER_QUERY_KEYS.some((key) => params.has(key));

    if (hasUrlFilters) {
      this.applyFiltersState(this.readFiltersFromQueryParams(params));
      this.saveFiltersToSession();
      return;
    }

    const stored = this.readFiltersFromSession();
    if (stored) {
      this.applyFiltersState(stored);
      void this.persistFiltersInUrl();
    }
  }

  private applyFiltersState(state: ProcesosListFiltersState): void {
    this.search.set(state.search);
    this.estado.set(this.readEnumParam(state.estado || null, this.estados));
    this.segmento.set(this.readEnumParam(state.segmento || null, this.segmentos));
    this.tipoProceso.set(this.readEnumParam(state.tipoProceso || null, this.tiposProceso));
    this.tipoInstrumento.set(
      this.readEnumParam(state.tipoInstrumento || null, this.tiposInstrumento),
    );
    this.fechaCierreDesde.set(state.fechaCierreDesde);
    this.fechaCierreHasta.set(state.fechaCierreHasta);
    this.filtroEliminados.set(state.filtroEliminados);
  }

  private readFiltersFromQueryParams(
    params: { get: (key: string) => string | null },
  ): ProcesosListFiltersState {
    const filtroEliminados = params.get('filtroEliminados');
    return {
      search: params.get('search') ?? '',
      estado: params.get('estado') ?? '',
      segmento: params.get('segmento') ?? '',
      tipoProceso: params.get('tipoProceso') ?? '',
      tipoInstrumento: params.get('tipoInstrumento') ?? '',
      fechaCierreDesde: params.get('fechaCierreDesde') ?? '',
      fechaCierreHasta: params.get('fechaCierreHasta') ?? '',
      filtroEliminados:
        filtroEliminados === 'activos' ||
        filtroEliminados === 'todos' ||
        filtroEliminados === 'solo_eliminados'
          ? filtroEliminados
          : 'activos',
    };
  }

  private readFiltersFromSession(): ProcesosListFiltersState | null {
    try {
      const raw = sessionStorage.getItem(PROCESOS_LIST_FILTERS_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as ProcesosListFiltersState;
    } catch {
      return null;
    }
  }

  private saveFiltersToSession(): void {
    sessionStorage.setItem(PROCESOS_LIST_FILTERS_KEY, JSON.stringify(this.currentFiltersState()));
  }

  private currentFiltersState(): ProcesosListFiltersState {
    return {
      search: this.search(),
      estado: this.estado(),
      segmento: this.segmento(),
      tipoProceso: this.tipoProceso(),
      tipoInstrumento: this.tipoInstrumento(),
      fechaCierreDesde: this.fechaCierreDesde(),
      fechaCierreHasta: this.fechaCierreHasta(),
      filtroEliminados: this.filtroEliminados(),
    };
  }

  private persistFiltersInUrl(): Promise<boolean> {
    this.saveFiltersToSession();
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: this.search().trim() || null,
        estado: this.estado() || null,
        segmento: this.segmento() || null,
        tipoProceso: this.tipoProceso() || null,
        tipoInstrumento: this.tipoInstrumento() || null,
        fechaCierreDesde: this.fechaCierreDesde() || null,
        fechaCierreHasta: this.fechaCierreHasta() || null,
        filtroEliminados:
          this.filtroEliminados() !== 'activos' ? this.filtroEliminados() : null,
      },
      queryParamsHandling: 'merge',
    });
  }

  private readEnumParam<T extends string>(value: string | null, allowed: readonly T[]): T | '' {
    if (value && allowed.includes(value as T)) {
      return value as T;
    }
    return '';
  }
}
