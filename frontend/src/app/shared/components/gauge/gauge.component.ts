import { Component, computed, input } from '@angular/core';
import {
  formatCurrencyAbbreviated,
  formatCurrencyFull,
} from '../../../core/utils/currency.util';

const CX = 100;
const CY = 108;
const RADIUS = 82;
const TRACK_LENGTH = Math.PI * RADIUS;

export function porcentajeVsMeta(
  valor: string | number,
  meta: string | number | null | undefined,
): number | null {
  const techo = Number(meta);
  if (!Number.isFinite(techo) || techo <= 0) {
    return null;
  }

  const monto = Number(valor);
  if (!Number.isFinite(monto)) {
    return 0;
  }

  return (monto / techo) * 100;
}

@Component({
  selector: 'app-gauge',
  standalone: true,
  templateUrl: './gauge.component.html',
  styleUrl: './gauge.component.scss',
})
export class GaugeComponent {
  readonly titulo = input.required<string>();
  readonly subtitulo = input.required<string>();
  readonly valor = input<string>('0');
  readonly meta = input<string | null>(null);
  readonly emptyMessage = input('Defina la meta del año');

  protected readonly cx = CX;
  protected readonly cy = CY;
  protected readonly radius = RADIUS;
  protected readonly trackLength = TRACK_LENGTH;

  protected readonly porcentaje = computed(() =>
    porcentajeVsMeta(this.valor(), this.meta()),
  );

  protected readonly tieneMeta = computed(() => this.porcentaje() != null);

  protected readonly porcentajeVisual = computed(() => {
    const pct = this.porcentaje();
    if (pct == null) return 0;
    return Math.min(Math.max(pct, 0), 100);
  });

  protected readonly dashFilled = computed(
    () => (this.porcentajeVisual() / 100) * TRACK_LENGTH,
  );

  protected readonly needle = computed(() => {
    const theta = Math.PI - (this.porcentajeVisual() / 100) * Math.PI;
    return {
      x: CX + RADIUS * Math.cos(theta),
      y: CY - RADIUS * Math.sin(theta),
    };
  });

  protected readonly valorAbreviado = computed(() =>
    formatCurrencyAbbreviated(this.valor()),
  );

  protected readonly valorCompleto = computed(() => formatCurrencyFull(this.valor(), 2));

  protected readonly metaCompleta = computed(() => {
    const meta = this.meta();
    return meta == null ? null : formatCurrencyFull(meta, 2);
  });

  protected readonly porcentajeLabel = computed(() => {
    const pct = this.porcentaje();
    if (pct == null) return null;
    const rounded = Math.round(pct * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
  });
}
