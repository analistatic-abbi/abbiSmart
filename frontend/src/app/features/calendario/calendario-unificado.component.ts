import { Component, computed, inject, OnInit, signal, TemplateRef, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { skip } from 'rxjs';
import {
  CalendarioEvento,
  CalendarioEventoTipo,
  CalendarioService,
} from '../../core/services/calendario.service';
import { AuthService } from '../../core/services/auth.service';
import { parseIsoDateLocal, formatFechaCorta } from '../../core/utils/date.util';
import { formatMonedaAbreviada, tituloMonedaCompleta } from '../../core/utils/currency.util';
import { ThemeService } from '../../core/services/theme.service';
import {
  getEventoCalendarioStyle,
  rutaEventoCalendario,
} from './calendario-evento.styles';
import { CalendarToolbarComponent } from '../../shared/components/calendar/calendar-toolbar.component';
import { CalendarPeriodNavComponent } from '../../shared/components/calendar/calendar-period-nav.component';
import { CalendarYearBoardComponent } from '../../shared/components/calendar/calendar-year-board.component';
import { CalendarMonthGridComponent } from '../../shared/components/calendar/calendar-month-grid.component';
import { CalendarAgendaListComponent } from '../../shared/components/calendar/calendar-agenda-list.component';
import type { CalendarView } from '../../shared/components/calendar/calendar.types';
import { groupByMonth, toIsoDate } from '../../shared/components/calendar/calendar.utils';

@Component({
  selector: 'app-calendario-unificado',
  standalone: true,
  imports: [
    CalendarToolbarComponent,
    CalendarPeriodNavComponent,
    CalendarYearBoardComponent,
    CalendarMonthGridComponent,
    CalendarAgendaListComponent,
  ],
  templateUrl: './calendario-unificado.component.html',
  styleUrl: './calendario-unificado.component.scss',
})
export class CalendarioUnificadoComponent implements OnInit {
  private readonly calendario = inject(CalendarioService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  protected readonly eventoCardTpl = viewChild<TemplateRef<{ $implicit: CalendarioEvento }>>('eventoCardTemplate');

  protected readonly items = signal<CalendarioEvento[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly anio = signal(new Date().getFullYear());
  protected readonly mes = signal(new Date().getMonth());
  protected readonly vista = signal<CalendarView>('anio');
  protected readonly ocultarVacios = signal(false);
  protected readonly soloMisValidaciones = signal(false);
  protected readonly diaSeleccionado = signal<string | null>(null);

  protected readonly filtroProyecciones = signal(true);
  protected readonly filtroProcesos = signal(true);
  protected readonly filtroRelacionamientos = signal(true);
  protected readonly filtroKam = signal(true);
  protected readonly filtroReunionAclaratoria = signal(true);

  protected readonly esValidador = () => this.auth.esValidador();

  protected readonly itemsFiltrados = computed(() => {
    if (this.vista() !== 'mes') return this.items();
    return this.items().filter((item) => {
      const fecha = parseIsoDateLocal(item.fecha);
      return fecha.getFullYear() === this.anio() && fecha.getMonth() === this.mes();
    });
  });

  protected readonly mesesAgrupados = computed(() =>
    groupByMonth(this.itemsFiltrados(), this.anio()),
  );

  protected eventoStyle(tipo: CalendarioEventoTipo, estado: string) {
    this.themeService.theme();
    return getEventoCalendarioStyle(tipo, estado);
  }

  protected readonly formatValor = formatMonedaAbreviada;
  protected readonly tituloValor = tituloMonedaCompleta;
  protected readonly formatFechaCorta = formatFechaCorta;

  protected esReunion(tipo: CalendarioEventoTipo): boolean {
    return tipo === 'relacionamiento' || tipo === 'kam' || tipo === 'reunion_aclaratoria';
  }

  protected metaEvento(evento: CalendarioEvento): string {
    const fecha = formatFechaCorta(evento.fecha);

    switch (evento.tipo) {
      case 'kam':
        return `${fecha} · Fin de ronda · ${evento.estado}`;
      case 'proceso':
        return `${fecha} · Cierre · ${evento.estado}`;
      default:
        return `${fecha} · ${evento.estado}`;
    }
  }

  protected readonly trackEventoFn = (evento: CalendarioEvento): string =>
    `${evento.tipo}-${evento.id}`;

  ngOnInit(): void {
    this.syncFromRoute();
    this.load();

    this.route.queryParamMap.pipe(skip(1)).subscribe(() => {
      this.syncFromRoute(false);
      this.load();
    });
  }

  protected toggleFiltro(tipo: CalendarioEventoTipo): void {
    if (tipo === 'proyeccion') this.filtroProyecciones.update((v) => !v);
    if (tipo === 'proceso') this.filtroProcesos.update((v) => !v);
    if (tipo === 'relacionamiento') this.filtroRelacionamientos.update((v) => !v);
    if (tipo === 'kam') this.filtroKam.update((v) => !v);
    if (tipo === 'reunion_aclaratoria') this.filtroReunionAclaratoria.update((v) => !v);
    this.load();
  }

  protected onVistaChange(vista: CalendarView): void {
    this.vista.set(vista);
    this.persistQueryParams();
    if (vista === 'mes' && !this.diaSeleccionado()) {
      const hoy = new Date();
      if (hoy.getFullYear() === this.anio() && hoy.getMonth() === this.mes()) {
        this.diaSeleccionado.set(toIsoDate(hoy));
      }
    }
    this.load();
  }

  protected onOcultarVaciosChange(value: boolean): void {
    this.ocultarVacios.set(value);
    this.persistQueryParams();
  }

  protected onSoloMisValidacionesChange(value: boolean): void {
    this.soloMisValidaciones.set(value);
    this.persistQueryParams();
    this.load();
  }

  protected onHoy(): void {
    const hoy = new Date();
    this.anio.set(hoy.getFullYear());
    this.mes.set(hoy.getMonth());
    this.diaSeleccionado.set(toIsoDate(hoy));
    this.persistQueryParams();
    this.load();
  }

  protected periodoAnterior(): void {
    if (this.vista() === 'mes') {
      if (this.mes() === 0) {
        this.mes.set(11);
        this.anio.update((a) => a - 1);
      } else {
        this.mes.update((m) => m - 1);
      }
    } else {
      this.anio.update((a) => a - 1);
    }
    this.diaSeleccionado.set(null);
    this.persistQueryParams();
    this.load();
  }

  protected periodoSiguiente(): void {
    if (this.vista() === 'mes') {
      if (this.mes() === 11) {
        this.mes.set(0);
        this.anio.update((a) => a + 1);
      } else {
        this.mes.update((m) => m + 1);
      }
    } else {
      this.anio.update((a) => a + 1);
    }
    this.diaSeleccionado.set(null);
    this.persistQueryParams();
    this.load();
  }

  protected onDaySelect(iso: string): void {
    this.diaSeleccionado.set(iso);
  }

  protected navigateToEvento(evento: CalendarioEvento): void {
    void this.router.navigate(rutaEventoCalendario(evento));
  }

  private tiposActivos(): CalendarioEventoTipo[] {
    const tipos: CalendarioEventoTipo[] = [];
    if (this.filtroProyecciones()) tipos.push('proyeccion');
    if (this.filtroProcesos()) tipos.push('proceso');
    if (this.filtroRelacionamientos()) tipos.push('relacionamiento');
    if (this.filtroKam()) tipos.push('kam');
    if (this.filtroReunionAclaratoria()) tipos.push('reunion_aclaratoria');
    return tipos;
  }

  private syncFromRoute(initial = true): void {
    const params = this.route.snapshot.queryParamMap;

    const anioParam = params.get('anio');
    if (anioParam) {
      const parsed = Number(anioParam);
      if (!Number.isNaN(parsed)) this.anio.set(parsed);
    }

    const mesParam = params.get('mes');
    if (mesParam) {
      const parsed = Number(mesParam);
      if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 12) {
        this.mes.set(parsed - 1);
      }
    } else if (initial) {
      this.mes.set(new Date().getMonth());
    }

    const vistaParam = params.get('vista') as CalendarView | null;
    if (vistaParam === 'anio' || vistaParam === 'mes' || vistaParam === 'agenda') {
      this.vista.set(vistaParam);
    } else if (initial && typeof window !== 'undefined' && window.matchMedia('(max-width: 599px)').matches) {
      this.vista.set('agenda');
    }

    this.ocultarVacios.set(params.get('ocultarVacios') === 'true');
    this.soloMisValidaciones.set(params.get('soloMisValidaciones') === 'true');
  }

  private persistQueryParams(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        anio: this.anio(),
        mes: this.vista() === 'mes' ? this.mes() + 1 : null,
        vista: this.vista(),
        ocultarVacios: this.ocultarVacios() || null,
        soloMisValidaciones: this.soloMisValidaciones() || null,
      },
      queryParamsHandling: 'merge',
    });
  }

  private load(): void {
    const tipos = this.tiposActivos();
    if (tipos.length === 0) {
      this.items.set([]);
      this.error.set(null);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const params: Parameters<CalendarioService['getEventos']>[0] = {
      anio: this.anio(),
      tipos,
      soloMisValidaciones: this.soloMisValidaciones() || undefined,
    };

    this.calendario.getEventos(params).subscribe({
      next: (r) => {
        this.items.set(r.data);
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.error.set('No se pudieron cargar los eventos. Recarga la página o contacta al administrador.');
        this.loading.set(false);
      },
    });
  }
}
