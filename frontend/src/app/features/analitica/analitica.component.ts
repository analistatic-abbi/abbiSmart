import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ChartData } from 'chart.js';
import {
  AnaliticaDashboard,
  AnaliticaEmbudoEtapa,
  AnaliticaGauges,
  DashboardService,
} from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { EstadoProceso } from '../../core/models/proceso.model';
import { Rol } from '../../core/models/rol.enum';
import { mensajeErrorApi, mensajeExitoApi } from '../../core/utils/api-error.util';
import { formatCurrencyAbbreviated } from '../../core/utils/currency.util';
import { YearSelectorComponent } from '../../shared/components/year-selector/year-selector.component';
import { GaugeComponent } from '../../shared/components/gauge/gauge.component';
import {
  AppChartClickEvent,
  ChartComponent,
} from '../../shared/components/chart/chart.component';

type ModuloAnalitica = 'procesos' | 'proyecciones' | 'crm';

/**
 * Paleta de gráficas: saturada y con matices bien separados
 * (evita varios azules/teals seguidos y pasteles claros).
 */
const CHART_HUE_PALETTE = [
  '#1d4ed8', // azul
  '#c2410c', // naranja
  '#15803d', // verde
  '#7e22ce', // morado
  '#b91c1c', // rojo
  '#a16207', // ámbar oscuro
  '#be185d', // fucsia
  '#0f766e', // verde petróleo
] as const;

interface KpiCard {
  key: string;
  label: string;
  value: string;
  route: string;
  queryParams?: Record<string, string | null>;
}

@Component({
  selector: 'app-analitica',
  standalone: true,
  imports: [RouterLink, DecimalPipe, FormsModule, YearSelectorComponent, ChartComponent, GaugeComponent],
  templateUrl: './analitica.component.html',
  styleUrl: './analitica.component.scss',
})
export class AnaliticaComponent implements OnInit {
  private readonly dashboard = inject(DashboardService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly data = signal<AnaliticaDashboard | null>(null);
  protected readonly anio = signal(new Date().getFullYear());
  protected readonly incluirCerradosDonut = signal(false);
  protected readonly modulo = signal<ModuloAnalitica>('procesos');
  protected readonly desde = signal<string>('');
  protected readonly hasta = signal<string>('');
  protected readonly guardandoMetas = signal(false);
  protected readonly metaAdjudicacionDraft = signal<number | null>(null);
  protected readonly metaFacturacionDraft = signal<number | null>(null);
  protected readonly puedeEditarMetas = computed(
    () => this.auth.rol() === Rol.Administrador,
  );
  protected readonly modulos: Array<{ id: ModuloAnalitica; label: string }> = [
    { id: 'procesos', label: 'Procesos' },
    { id: 'proyecciones', label: 'Proyecciones' },
    { id: 'crm', label: 'CRM' },
  ];

  protected readonly kpis = computed<KpiCard[]>(() => {
    const payload = this.data();
    if (!payload) return [];

    const hoy = this.formatDate(new Date());
    const en30 = this.formatDate(this.addDays(new Date(), 30));

    switch (this.modulo()) {
      case 'proyecciones':
        return [
          {
            key: 'proyecciones',
            label: 'Proyecciones activas',
            value: String(payload.kpis.proyeccionesActivas),
            route: '/proyecciones',
          },
          {
            key: 'venta',
            label: 'Valor venta (año)',
            value: formatCurrencyAbbreviated(payload.proyecciones.sumaValorVenta),
            route: '/proyecciones',
          },
          {
            key: 'facturacion',
            label: 'Valor facturación (año)',
            value: formatCurrencyAbbreviated(payload.proyecciones.sumaValorFacturacion),
            route: '/proyecciones',
          },
          {
            key: 'efectividad',
            label: '% ganadas Objetivo',
            value: this.formatPct(
              payload.efectividadMercado.objetivo.pctGanadasDeMaterializadas,
            ),
            route: '/proyecciones/efectividad-mercado',
          },
        ] as KpiCard[];
      case 'crm':
        return [
          {
            key: 'clientes',
            label: 'Clientes activos',
            value: String(payload.kpis.clientesActivos),
            route: '/crm/clientes',
          },
          {
            key: 'contactos',
            label: 'Contactos activos',
            value: String(payload.kpis.contactosActivos),
            route: '/crm/contactos',
          },
          {
            key: 'relacionamientos',
            label: 'Relacionamientos',
            value: String(payload.kpis.relacionamientosTotal),
            route: '/crm/relacionamientos',
          },
          {
            key: 'vencidos',
            label: 'Relacionamientos vencidos',
            value: String(payload.kpis.relacionamientosVencidos),
            route: '/crm/relacionamientos',
          },
          {
            key: 'reuniones',
            label: 'Reuniones programadas',
            value: String(payload.kpis.reunionesProgramadas ?? 0),
            route: '/crm/relacionamientos',
          },
        ] as KpiCard[];
      default:
        return [
          {
            key: 'procesos',
            label: 'Procesos activos',
            value: String(payload.kpis.procesosActivos),
            route: '/procesos',
          },
          {
            key: 'cierres',
            label: 'Cierres próx. 30 días',
            value: String(payload.kpis.cierresProximos30Dias),
            route: '/procesos',
            queryParams: { fechaCierreDesde: hoy, fechaCierreHasta: en30 },
          },
          {
            key: 'validacion',
            label: 'Validaciones pendientes',
            value: String(payload.kpis.validacionesPendientes),
            route: '/validacion',
          },
          {
            key: 'adjudicados',
            label: 'Adjudicados (embudo)',
            value: String(
              payload.embudo.find((item) => item.clave === 'adjudicado')?.total ?? 0,
            ),
            route: '/procesos',
            queryParams: { estado: EstadoProceso.Adjudicado },
          },
        ] as KpiCard[];
    }
  });

  protected readonly gauges = computed<AnaliticaGauges>(() => {
    return (
      this.data()?.gauges ?? {
        metaAdjudicacion: null,
        metaFacturacion: null,
        real: { adjudicacion: '0', facturacion: '0' },
        proyectada: { adjudicacion: '0', facturacion: '0' },
      }
    );
  });

  protected readonly donutChart = computed(() => {
    this.theme.theme();
    const payload = this.data();
    if (!payload) return null;

    const items = payload.resumen.porEstado.filter((item) =>
      this.incluirCerradosDonut()
        ? true
        : item.estado !== EstadoProceso.Descartado && item.estado !== EstadoProceso.Cerrado,
    );

    return this.buildPieChart(
      items.map((item) => item.estado),
      items.map((item) => item.total),
      items.map((item) => this.colorEstadoProceso(item.estado)),
      'doughnut',
    );
  });

  protected readonly segmentoChart = computed(() => {
    this.theme.theme();
    const payload = this.data();
    if (!payload) return null;

    const items = [...payload.resumen.porSegmento].sort((a, b) => b.total - a.total);
    return this.buildPieChart(
      items.map((item) => item.segmento),
      items.map((item) => item.total),
      this.pieColors(items.length),
      'pie',
    );
  });

  protected readonly proyeccionesChart = computed(() => {
    this.theme.theme();
    const payload = this.data();
    if (!payload) return null;

    const rows = payload.proyeccionesPorEstadoMercado;

    return {
      type: 'bar' as const,
      data: {
        labels: rows.map((item) => item.estado),
        datasets: [
          {
            label: 'General',
            data: rows.map((item) => item.general),
            backgroundColor: CHART_HUE_PALETTE[0],
            borderRadius: 4,
          },
          {
            label: 'Objetivo',
            data: rows.map((item) => item.objetivo),
            backgroundColor: CHART_HUE_PALETTE[1],
            borderRadius: 4,
          },
        ],
      },
      options: {
        plugins: { legend: { position: 'bottom' as const } },
      },
    };
  });

  protected readonly mercadoChart = computed(() => {
    this.theme.theme();
    const payload = this.data();
    if (!payload) return null;

    const items = payload.proyecciones.porMercado;
    return this.buildPieChart(
      items.map((item) => item.mercado ?? 'Sin asignar'),
      items.map((item) => item.total),
      this.pieColors(items.length),
      'pie',
    );
  });

  protected readonly cierresChart = computed(() => {
    this.theme.theme();
    const payload = this.data();
    if (!payload) return null;

    return {
      type: 'bar' as const,
      data: {
        labels: payload.cierresPorVentana.map((item) => item.label),
        datasets: [
          {
            label: 'Procesos',
            data: payload.cierresPorVentana.map((item) => item.total),
            backgroundColor: CHART_HUE_PALETTE[0],
            borderRadius: 6,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
      },
    };
  });

  protected readonly efectividadChart = computed(() => {
    this.theme.theme();
    const payload = this.data();
    if (!payload) return null;

    const general = payload.efectividadMercado.general.pctGanadasDeMaterializadas ?? 0;
    const objetivo = payload.efectividadMercado.objetivo.pctGanadasDeMaterializadas ?? 0;

    return {
      type: 'bar' as const,
      data: {
        labels: ['% ganadas (materializadas)'],
        datasets: [
          {
            label: 'General',
            data: [general],
            backgroundColor: CHART_HUE_PALETTE[0],
            borderRadius: 6,
          },
          {
            label: 'Objetivo',
            data: [objetivo],
            backgroundColor: CHART_HUE_PALETTE[1],
            borderRadius: 6,
          },
        ],
      },
      options: {
        plugins: { legend: { position: 'bottom' as const } },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value: string | number) => `${value}%`,
            },
          },
        },
      },
    };
  });

  protected readonly canalChart = computed(() => {
    this.theme.theme();
    const payload = this.data();
    if (!payload) return null;
    const items = payload.crm?.porCanal ?? [];
    return this.buildPieChart(
      items.map((item) => item.etiqueta),
      items.map((item) => item.total),
      this.pieColors(items.length),
      'pie',
    );
  });

  protected readonly resultadoChart = computed(() => {
    this.theme.theme();
    const payload = this.data();
    if (!payload) return null;
    const items = payload.crm?.porResultado ?? [];
    return this.buildPieChart(
      items.map((item) => item.etiqueta),
      items.map((item) => item.total),
      this.pieColors(items.length),
      'doughnut',
    );
  });

  protected readonly segmentoClienteChart = computed(() => {
    this.theme.theme();
    const payload = this.data();
    if (!payload) return null;
    const items = payload.crm?.porSegmentoCliente ?? [];
    return this.buildPieChart(
      items.map((item) => item.etiqueta),
      items.map((item) => item.total),
      this.pieColors(items.length),
      'pie',
    );
  });

  protected readonly estadoRespuestaChart = computed(() => {
    this.theme.theme();
    const payload = this.data();
    if (!payload) return null;
    const items = payload.crm?.estadoRespuesta ?? [];
    return this.buildPieChart(
      items.map((item) => item.etiqueta),
      items.map((item) => item.total),
      this.pieColors(items.length),
      'doughnut',
    );
  });

  protected readonly actividadCrmChart = computed(() => {
    this.theme.theme();
    const payload = this.data();
    if (!payload) return null;
    const items = payload.crm?.actividadPorVentana ?? [];

    return {
      type: 'bar' as const,
      data: {
        labels: items.map((item) => item.label),
        datasets: [
          {
            label: 'Relacionamientos',
            data: items.map((item) => item.total),
            backgroundColor: CHART_HUE_PALETTE[2],
            borderRadius: 6,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
      },
    };
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dashboard.getAnalitica(this.anio(), this.desde() || undefined, this.hasta() || undefined).subscribe({
      next: (response) => {
        this.data.set(response.data);
        this.syncMetasDraft(response.data.gauges);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No fue posible cargar los datos analíticos.');
        this.loading.set(false);
      },
    });
  }

  protected cambiarAnio(delta: number): void {
    this.anio.update((value) => value + delta);
    this.cargar();
  }

  protected seleccionarModulo(modulo: ModuloAnalitica): void {
    this.modulo.set(modulo);
  }

  protected onDesdeChange(event: Event): void {
    this.desde.set((event.target as HTMLInputElement).value);
    this.cargar();
  }

  protected onHastaChange(event: Event): void {
    this.hasta.set((event.target as HTMLInputElement).value);
    this.cargar();
  }

  protected limpiarFechas(): void {
    this.desde.set('');
    this.hasta.set('');
    this.cargar();
  }

  protected toggleCerradosDonut(): void {
    this.incluirCerradosDonut.update((value) => !value);
  }

  protected guardarMetas(event: Event): void {
    event.preventDefault();
    const metaAdjudicacion = Number(this.metaAdjudicacionDraft());
    const metaFacturacion = Number(this.metaFacturacionDraft());

    if (
      !Number.isFinite(metaAdjudicacion) ||
      !Number.isFinite(metaFacturacion) ||
      metaAdjudicacion <= 0 ||
      metaFacturacion <= 0
    ) {
      this.toast.error('Indique metas de adjudicación y facturación mayores que cero.');
      return;
    }

    this.guardandoMetas.set(true);
    this.dashboard
      .putMetas({
        anio: this.anio(),
        metaAdjudicacion,
        metaFacturacion,
      })
      .subscribe({
        next: (response) => {
          this.toast.success(mensajeExitoApi(response, 'Metas anuales guardadas correctamente.'));
          this.guardandoMetas.set(false);
          this.cargar();
        },
        error: (err) => {
          this.toast.error(mensajeErrorApi(err, 'No fue posible guardar las metas.'));
          this.guardandoMetas.set(false);
        },
      });
  }

  private syncMetasDraft(gauges: AnaliticaGauges | undefined): void {
    this.metaAdjudicacionDraft.set(
      gauges?.metaAdjudicacion != null ? Number(gauges.metaAdjudicacion) : null,
    );
    this.metaFacturacionDraft.set(
      gauges?.metaFacturacion != null ? Number(gauges.metaFacturacion) : null,
    );
  }

  protected navegarKpi(kpi: KpiCard): void {
    this.router.navigate([kpi.route], { queryParams: kpi.queryParams });
  }

  protected onEmbudoClick(etapa: AnaliticaEmbudoEtapa): void {
    switch (etapa.clave) {
      case 'proyecciones_activas':
        this.router.navigate(['/proyecciones']);
        break;
      case 'en_proceso':
        this.router.navigate(['/procesos'], { queryParams: { estado: EstadoProceso.EnProceso } });
        break;
      case 'en_validacion':
        this.router.navigate(['/procesos'], {
          queryParams: { estado: EstadoProceso.EnValidacion },
        });
        break;
      case 'presentado_subsanacion':
        this.router.navigate(['/procesos'], { queryParams: { estado: EstadoProceso.Presentado } });
        break;
      case 'adjudicado':
        this.router.navigate(['/procesos'], { queryParams: { estado: EstadoProceso.Adjudicado } });
        break;
    }
  }

  protected onDonutClick(event: AppChartClickEvent): void {
    const label = event.label?.trim();
    if (!label) return;
    this.router.navigate(['/procesos'], { queryParams: { estado: label } });
  }

  protected onSegmentoClick(event: AppChartClickEvent): void {
    const label = event.label?.trim();
    if (!label) return;
    this.router.navigate(['/procesos'], { queryParams: { segmento: label } });
  }

  protected onCierresClick(event: AppChartClickEvent): void {
    const payload = this.data();
    if (!payload) return;

    const ventana = payload.cierresPorVentana[event.index];
    if (!ventana) return;

    const hoy = new Date();
    let desde = hoy;
    let hasta = hoy;

    if (ventana.ventana === '0_30') {
      hasta = this.addDays(hoy, 30);
    } else if (ventana.ventana === '31_60') {
      desde = this.addDays(hoy, 31);
      hasta = this.addDays(hoy, 60);
    } else {
      desde = this.addDays(hoy, 61);
      hasta = this.addDays(hoy, 90);
    }

    this.router.navigate(['/procesos'], {
      queryParams: {
        fechaCierreDesde: this.formatDate(desde),
        fechaCierreHasta: this.formatDate(hasta),
      },
    });
  }

  protected chartData(config: { data: ChartData } | null): ChartData {
    return config?.data ?? { labels: [], datasets: [] };
  }

  protected funnelWidth(index: number): number {
    return Math.max(58, 100 - index * 10);
  }

  protected readonly funnelColor = (index: number): string => {
    return CHART_HUE_PALETTE[index % CHART_HUE_PALETTE.length];
  };

  private buildPieChart(
    labels: string[],
    values: number[],
    colors: string[],
    type: 'pie' | 'doughnut',
  ) {
    const styles = getComputedStyle(document.documentElement);
    const legendColor =
      styles.getPropertyValue('--color-on-surface').trim() || '#1a1c1f';
    const surface =
      styles.getPropertyValue('--color-surface').trim() || '#ffffff';

    return {
      type,
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: surface,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            position: 'bottom' as const,
            labels: {
              color: legendColor,
              usePointStyle: true,
              pointStyle: 'rectRounded',
              padding: 12,
              generateLabels: () => {
                const total = values.reduce((sum, v) => sum + (Number(v) || 0), 0);
                return labels.map((label, index) => {
                  const count = values[index] ?? 0;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return {
                    text: `${label}: ${count} (${pct}%)`,
                    fillStyle: colors[index],
                    strokeStyle: colors[index],
                    fontColor: legendColor,
                    hidden: false,
                    index,
                  };
                });
              },
            },
          },
          appDatalabels: { display: true, minPct: 6 },
        },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    };
  }

  private pieColors(count: number): string[] {
    return Array.from(
      { length: Math.max(count, 1) },
      (_, index) => CHART_HUE_PALETTE[index % CHART_HUE_PALETTE.length],
    );
  }

  private colorEstadoProceso(estado: string): string {
    const map: Record<string, string> = {
      [EstadoProceso.PorValidar]: '#ca8a04',
      [EstadoProceso.EnProceso]: '#1d4ed8',
      [EstadoProceso.Descartado]: '#b91c1c',
      [EstadoProceso.EnValidacion]: '#7e22ce',
      [EstadoProceso.Presentado]: '#0f766e',
      [EstadoProceso.Subsanacion]: '#c2410c',
      [EstadoProceso.Adjudicado]: '#15803d',
      [EstadoProceso.Cerrado]: '#475569',
    };
    return map[estado] ?? '#475569';
  }

  private formatPct(value: number | null): string {
    return value == null ? '—' : `${value}%`;
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }
}
