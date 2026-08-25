import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  input,
  output,
} from '@angular/core';
import {
  ActiveElement,
  Chart,
  ChartData,
  ChartEvent,
  ChartOptions,
  ChartType,
  Plugin,
  registerables,
} from 'chart.js';

Chart.register(...registerables);

/** Etiquetas sobre pie/doughnut (porcentaje en el arco) y barras (valor). */
const appDatalabelsPlugin = {
  id: 'appDatalabels',
  afterDatasetsDraw(
    chart: Chart,
    _args: unknown,
    pluginOptions: { display?: boolean; minPct?: number } | undefined,
  ) {
    if (!pluginOptions?.display) return;

    const { ctx } = chart;
    const minPct = pluginOptions.minPct ?? 6;

    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (meta.hidden) return;

      const isArc = meta.type === 'pie' || meta.type === 'doughnut';
      const values = (dataset.data as Array<number | null>).map((v) => Number(v ?? 0));
      const total = values.reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0);

      meta.data.forEach((element, index) => {
        const value = values[index];
        if (!Number.isFinite(value) || value <= 0) return;

        const pct = total > 0 ? (value / total) * 100 : 0;
        if (isArc && pct < minPct) return;

        let x = 0;
        let y = 0;

        if (isArc) {
          // En arcos, x/y son el centro del gráfico; el texto va al medio del segmento.
          const props = element.getProps(
            ['x', 'y', 'startAngle', 'endAngle', 'innerRadius', 'outerRadius'],
            true,
          ) as Record<string, number>;
          const cx = Number(props['x'] ?? 0);
          const cy = Number(props['y'] ?? 0);
          const start = Number(props['startAngle'] ?? 0);
          const end = Number(props['endAngle'] ?? 0);
          const inner = Number(props['innerRadius'] ?? 0);
          const outer = Number(props['outerRadius'] ?? 0);
          const midAngle = (start + end) / 2;
          const radius = inner + (outer - inner) * 0.55;
          x = cx + Math.cos(midAngle) * radius;
          y = cy + Math.sin(midAngle) * radius;
        } else {
          const props = element.getProps(['x', 'y'], true) as Record<string, number>;
          x = Number(props['x'] ?? 0);
          y = Number(props['y'] ?? 0) - 10;
        }

        const text = isArc ? `${Math.round(pct)}%` : String(value);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '600 11px system-ui, sans-serif';
        if (isArc) {
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = 'rgba(0,0,0,0.5)';
          ctx.lineWidth = 3;
          ctx.strokeText(text, x, y);
          ctx.fillText(text, x, y);
        } else {
          const styles = getComputedStyle(document.documentElement);
          ctx.fillStyle =
            styles.getPropertyValue('--color-on-surface').trim() || '#1a1c1f';
          ctx.fillText(text, x, y);
        }
        ctx.restore();
      });
    });
  },
};

Chart.register(appDatalabelsPlugin as Plugin);

export type AppChartType = ChartType;

export interface AppChartClickEvent {
  label?: string;
  index: number;
  datasetIndex: number;
}

@Component({
  selector: 'app-chart',
  standalone: true,
  template: `<div class="chart-host"><canvas #canvas></canvas></div>`,
  styleUrl: './chart.component.scss',
})
export class ChartComponent implements AfterViewInit, OnDestroy {
  readonly type = input.required<AppChartType>();
  readonly data = input.required<ChartData>();
  readonly options = input<ChartOptions & Record<string, unknown>>({});
  readonly height = input(280);

  readonly chartClick = output<AppChartClickEvent>();

  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;
  private viewReady = false;

  constructor() {
    effect(() => {
      this.height();
      this.type();
      this.data();
      this.options();
      if (this.viewReady) {
        this.renderChart();
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderChart();
    this.observeTheme();
  }

  ngOnDestroy(): void {
    this.themeObserver?.disconnect();
    this.chart?.destroy();
  }

  private themeObserver: MutationObserver | null = null;

  private observeTheme(): void {
    this.themeObserver = new MutationObserver(() => this.renderChart());
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
  }

  private renderChart(): void {
    const canvas = this.canvasRef.nativeElement;
    const host = canvas.parentElement;
    if (host) {
      host.style.minHeight = `${this.height()}px`;
    }

    const themeOptions = this.buildThemeOptions();
    const userOptions = this.options();
    const mergedOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 800,
        easing: 'easeOutQuart',
      },
      ...userOptions,
      plugins: {
        ...themeOptions.plugins,
        ...userOptions.plugins,
      },
      scales: {
        ...themeOptions.scales,
        ...userOptions.scales,
      },
    };

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    this.chart = new Chart(canvas, {
      type: this.type(),
      data: this.data(),
      options: {
        ...mergedOptions,
        onClick: (_event: ChartEvent, elements: ActiveElement[]) => {
          if (!elements.length) return;
          const element = elements[0];
          const datasetIndex = element.datasetIndex ?? 0;
          const index = element.index ?? 0;
          const labels = this.data().labels ?? [];
          this.chartClick.emit({
            label: String(labels[index] ?? ''),
            index,
            datasetIndex,
          });
        },
      },
    });
  }

  private buildThemeOptions(): ChartOptions {
    const styles = getComputedStyle(document.documentElement);
    const text = styles.getPropertyValue('--color-on-surface-variant').trim() || '#6b7280';
    const grid = styles.getPropertyValue('--color-outline-variant').trim() || '#d1d5db';

    return {
      color: text,
      plugins: {
        legend: {
          labels: { color: text },
        },
        tooltip: {
          titleColor: styles.getPropertyValue('--color-on-surface').trim() || '#1a1c1f',
          bodyColor: text,
          backgroundColor:
            styles.getPropertyValue('--color-surface-container-lowest').trim() || '#ffffff',
          borderColor: grid,
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          ticks: { color: text },
          grid: { color: grid },
          border: { color: grid },
        },
        y: {
          ticks: { color: text },
          grid: { color: grid },
          border: { color: grid },
        },
      },
      elements: {
        bar: {
          borderRadius: 4,
        },
      },
    };
  }
}

export function readChartPalette(): { primary: string; accent: string; secondary: string; text: string } {
  const styles = getComputedStyle(document.documentElement);
  return {
    primary: styles.getPropertyValue('--color-primary').trim() || '#0e3b65',
    accent: styles.getPropertyValue('--color-accent').trim() || '#be5535',
    secondary: styles.getPropertyValue('--color-link').trim() || '#2e8ec2',
    text: styles.getPropertyValue('--color-on-surface-variant').trim() || '#6b7280',
  };
}
