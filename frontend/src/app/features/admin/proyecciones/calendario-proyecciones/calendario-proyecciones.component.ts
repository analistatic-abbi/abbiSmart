import { Component, computed, inject, OnInit, signal, TemplateRef, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProyeccionesService } from '../../../../core/services/proyecciones.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Proyeccion } from '../../../../core/models/admin.model';
import { formatMonedaAbreviada, tituloMonedaCompleta } from '../../../../core/utils/currency.util';
import { formatFechaCorta, parseIsoDateLocal } from '../../../../core/utils/date.util';
import { getEstadoCalendarioStyle } from './estado-calendario.styles';
import { ProyeccionesVistaToggleComponent } from '../proyecciones-vista-toggle/proyecciones-vista-toggle.component';
import { ThemeService } from '../../../../core/services/theme.service';
import { CalendarToolbarComponent } from '../../../../shared/components/calendar/calendar-toolbar.component';
import { CalendarPeriodNavComponent } from '../../../../shared/components/calendar/calendar-period-nav.component';
import { CalendarYearBoardComponent } from '../../../../shared/components/calendar/calendar-year-board.component';
import { CalendarMonthGridComponent } from '../../../../shared/components/calendar/calendar-month-grid.component';
import { CalendarAgendaListComponent } from '../../../../shared/components/calendar/calendar-agenda-list.component';
import type { CalendarEventLike, CalendarView } from '../../../../shared/components/calendar/calendar.types';
import { groupByMonth, toIsoDate } from '../../../../shared/components/calendar/calendar.utils';

type ProyeccionCalendario = Proyeccion & CalendarEventLike;

@Component({
  selector: 'app-calendario-proyecciones',
  standalone: true,
  imports: [
    RouterLink,
    ProyeccionesVistaToggleComponent,
    CalendarToolbarComponent,
    CalendarPeriodNavComponent,
    CalendarYearBoardComponent,
    CalendarMonthGridComponent,
    CalendarAgendaListComponent,
  ],
  templateUrl: './calendario-proyecciones.component.html',
  styleUrl: './calendario-proyecciones.component.scss',
})
export class CalendarioProyeccionesComponent implements OnInit {
  private readonly proyecciones = inject(ProyeccionesService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  protected readonly eventoCardTpl = viewChild<TemplateRef<{ $implicit: ProyeccionCalendario }>>('eventoCardTemplate');

  protected readonly items = signal<Proyeccion[]>([]);
  protected readonly loading = signal(true);
  protected readonly anio = signal(new Date().getFullYear());
  protected readonly mes = signal(new Date().getMonth());
  protected readonly vista = signal<CalendarView>('anio');
  protected readonly ocultarVacios = signal(false);
  protected readonly diaSeleccionado = signal<string | null>(null);

  protected readonly itemsCalendario = computed<ProyeccionCalendario[]>(() =>
    this.items().map((p) => ({
      ...p,
      fecha: p.fechaEstimadaPublicacion,
      icono: 'monitoring',
      tipo: 'proyeccion',
    })),
  );

  protected readonly itemsFiltrados = computed(() => {
    if (this.vista() !== 'mes') return this.itemsCalendario();
    return this.itemsCalendario().filter((item) => {
      const fecha = parseIsoDateLocal(item.fecha);
      return fecha.getFullYear() === this.anio() && fecha.getMonth() === this.mes();
    });
  });

  protected readonly mesesAgrupados = computed(() =>
    groupByMonth(this.itemsFiltrados(), this.anio()),
  );

  protected readonly puedeAsignarMercado = () => this.auth.puedeAsignarMercadoProyeccion();
  protected readonly puedeEscribir = () => this.auth.puedeEscribir();

  protected readonly formatValor = formatMonedaAbreviada;
  protected readonly tituloValor = tituloMonedaCompleta;
  protected readonly formatFechaCorta = formatFechaCorta;

  protected estadoStyle(estado: string) {
    this.themeService.theme();
    return getEstadoCalendarioStyle(estado);
  }

  protected readonly trackEventoFn = (p: ProyeccionCalendario): number => p.id;

  ngOnInit(): void {
    this.syncFromRoute();
    this.load();
    this.route.queryParamMap.subscribe(() => {
      this.syncFromRoute(false);
      this.load();
    });
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
  }

  protected onOcultarVaciosChange(value: boolean): void {
    this.ocultarVacios.set(value);
    this.persistQueryParams();
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

  protected empresaLabel(p: Proyeccion): string {
    return p.empresa ?? p.procesoCodigo ?? 'Proyección manual';
  }

  protected navigateToDetail(id: number): void {
    void this.router.navigate(['/proyecciones', id]);
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
    }

    this.ocultarVacios.set(params.get('ocultarVacios') === 'true');
  }

  private persistQueryParams(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        anio: this.anio(),
        mes: this.vista() === 'mes' ? this.mes() + 1 : null,
        vista: this.vista(),
        ocultarVacios: this.ocultarVacios() || null,
      },
      queryParamsHandling: 'merge',
    });
  }

  private load(): void {
    this.loading.set(true);
    this.proyecciones
      .list({ anioProyectado: this.anio(), limit: 500 })
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
