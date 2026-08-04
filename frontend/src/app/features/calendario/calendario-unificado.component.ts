import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CalendarioEvento,
  CalendarioEventoTipo,
  CalendarioService,
} from '../../core/services/calendario.service';
import { parseIsoDateLocal } from '../../core/utils/date.util';
import { formatCurrencyFull } from '../../core/utils/currency.util';
import { YearSelectorComponent } from '../../shared/components/year-selector/year-selector.component';
import { ThemeService } from '../../core/services/theme.service';
import {
  getEventoCalendarioStyle,
  rutaEventoCalendario,
} from './calendario-evento.styles';

interface MesCalendario {
  mesIndex: number;
  nombre: string;
  items: CalendarioEvento[];
}

@Component({
  selector: 'app-calendario-unificado',
  standalone: true,
  imports: [YearSelectorComponent],
  templateUrl: './calendario-unificado.component.html',
  styleUrl: './calendario-unificado.component.scss',
})
export class CalendarioUnificadoComponent implements OnInit {
  private readonly calendario = inject(CalendarioService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  protected readonly items = signal<CalendarioEvento[]>([]);
  protected readonly loading = signal(true);
  protected readonly anio = signal(new Date().getFullYear());

  protected readonly filtroProyecciones = signal(true);
  protected readonly filtroProcesos = signal(true);
  protected readonly filtroRelacionamientos = signal(true);

  protected readonly meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  protected readonly mesesAgrupados = computed<MesCalendario[]>(() => {
    const anio = this.anio();
    const buckets: CalendarioEvento[][] = Array.from({ length: 12 }, () => []);

    for (const evento of this.items()) {
      const fecha = parseIsoDateLocal(evento.fecha);
      if (fecha.getFullYear() !== anio) continue;
      buckets[fecha.getMonth()].push(evento);
    }

    return this.meses.map((nombre, mesIndex) => ({
      mesIndex,
      nombre,
      items: buckets[mesIndex].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    }));
  });

  protected eventoStyle(tipo: CalendarioEventoTipo, estado: string) {
    this.themeService.theme();
    return getEventoCalendarioStyle(tipo, estado);
  }

  protected readonly formatValor = formatCurrencyFull;

  ngOnInit(): void {
    this.syncAnioFromRoute();
    this.load();

    this.route.queryParamMap.subscribe((params) => {
      const anioParam = params.get('anio');
      if (!anioParam) return;
      const parsed = Number(anioParam);
      if (!Number.isNaN(parsed) && parsed !== this.anio()) {
        this.anio.set(parsed);
        this.load();
      }
    });
  }

  protected toggleFiltro(tipo: CalendarioEventoTipo): void {
    if (tipo === 'proyeccion') this.filtroProyecciones.update((v) => !v);
    if (tipo === 'proceso') this.filtroProcesos.update((v) => !v);
    if (tipo === 'relacionamiento') this.filtroRelacionamientos.update((v) => !v);
    this.load();
  }

  protected anioAnterior(): void {
    this.setAnio(this.anio() - 1);
  }

  protected anioSiguiente(): void {
    this.setAnio(this.anio() + 1);
  }

  protected navigateToEvento(evento: CalendarioEvento): void {
    void this.router.navigate(rutaEventoCalendario(evento.tipo, evento.id));
  }

  private tiposActivos(): CalendarioEventoTipo[] {
    const tipos: CalendarioEventoTipo[] = [];
    if (this.filtroProyecciones()) tipos.push('proyeccion');
    if (this.filtroProcesos()) tipos.push('proceso');
    if (this.filtroRelacionamientos()) tipos.push('relacionamiento');
    return tipos;
  }

  private setAnio(value: number): void {
    this.anio.set(value);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { anio: value },
      queryParamsHandling: 'merge',
    });
    this.load();
  }

  private syncAnioFromRoute(): void {
    const anioParam = this.route.snapshot.queryParamMap.get('anio');
    if (!anioParam) return;
    const parsed = Number(anioParam);
    if (!Number.isNaN(parsed)) {
      this.anio.set(parsed);
    }
  }

  private load(): void {
    const tipos = this.tiposActivos();
    if (tipos.length === 0) {
      this.items.set([]);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.calendario.getEventos(this.anio(), tipos).subscribe({
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
