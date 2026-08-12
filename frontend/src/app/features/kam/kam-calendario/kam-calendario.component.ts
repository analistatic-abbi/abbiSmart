import { Component, computed, inject, OnInit, signal, TemplateRef, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { KamService } from '../../../core/services/kam.service';
import { KamCalendarioEvento } from '../../../core/models/kam.model';
import { formatFechaCorta, parseIsoDateLocal } from '../../../core/utils/date.util';
import { mensajeErrorApi } from '../../../core/utils/api-error.util';
import { ThemeService } from '../../../core/services/theme.service';
import { KamVistaToggleComponent } from '../kam-vista-toggle/kam-vista-toggle.component';
import { CalendarToolbarComponent } from '../../../shared/components/calendar/calendar-toolbar.component';
import { CalendarPeriodNavComponent } from '../../../shared/components/calendar/calendar-period-nav.component';
import { CalendarYearBoardComponent } from '../../../shared/components/calendar/calendar-year-board.component';
import { CalendarMonthGridComponent } from '../../../shared/components/calendar/calendar-month-grid.component';
import { CalendarAgendaListComponent } from '../../../shared/components/calendar/calendar-agenda-list.component';
import type { CalendarEventLike, CalendarView } from '../../../shared/components/calendar/calendar.types';
import { groupByMonth, toIsoDate } from '../../../shared/components/calendar/calendar.utils';
import {
  claseUrgenciaDias,
  getEstadoKamCalendarioStyle,
  labelDiasRestantes,
} from '../estado-kam-calendario.styles';

type KamCalendarioItem = Omit<KamCalendarioEvento, 'tipo'> & {
  id: number;
  icono: string;
  tipo: string;
};

@Component({
  selector: 'app-kam-calendario',
  standalone: true,
  imports: [
    RouterLink,
    KamVistaToggleComponent,
    CalendarToolbarComponent,
    CalendarPeriodNavComponent,
    CalendarYearBoardComponent,
    CalendarMonthGridComponent,
    CalendarAgendaListComponent,
  ],
  templateUrl: './kam-calendario.component.html',
  styleUrl: './kam-calendario.component.scss',
})
export class KamCalendarioComponent implements OnInit {
  private readonly kamService = inject(KamService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  protected readonly eventoCardTpl = viewChild<TemplateRef<{ $implicit: KamCalendarioItem }>>('eventoCardTemplate');

  protected readonly items = signal<KamCalendarioEvento[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly anio = signal(new Date().getFullYear());
  protected readonly mes = signal(new Date().getMonth());
  protected readonly vista = signal<CalendarView>('anio');
  protected readonly ocultarVacios = signal(false);
  protected readonly diaSeleccionado = signal<string | null>(null);

  protected readonly formatFechaCorta = formatFechaCorta;
  protected readonly labelDiasRestantes = labelDiasRestantes;
  protected readonly claseUrgenciaDias = claseUrgenciaDias;

  protected readonly totalEventos = computed(() => this.items().length);

  protected readonly itemsCalendario = computed<KamCalendarioItem[]>(() =>
    this.items().map((e) => ({
      ...e,
      id: e.rondaId,
      icono: 'groups',
      tipo: 'kam',
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

  ngOnInit(): void {
    this.syncFromRoute();
    this.load();
    this.route.queryParamMap.subscribe(() => {
      this.syncFromRoute(false);
      this.load();
    });
  }

  protected readonly trackEventoFn = (e: KamCalendarioItem): string => `${e.rondaId}-${e.fecha}`;

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

  protected navigateToDetail(kamId: number): void {
    void this.router.navigate(['/kam', Number(kamId)]);
  }

  protected estadoStyle(estado: string) {
    this.themeService.theme();
    return getEstadoKamCalendarioStyle(estado);
  }

  protected recargar(): void {
    this.load();
  }

  protected dias(evento: KamCalendarioEvento): number {
    return Number(evento.diasRestantes ?? 0);
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
    this.error.set(null);
    this.kamService.getCalendario(this.anio()).subscribe({
      next: (r) => {
        this.items.set(r.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.items.set([]);
        this.error.set(mensajeErrorApi(err, 'No fue posible cargar el calendario KAM.'));
        this.loading.set(false);
      },
    });
  }
}
