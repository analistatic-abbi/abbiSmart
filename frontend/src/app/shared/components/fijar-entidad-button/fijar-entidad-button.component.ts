import { Component, effect, inject, input, output, signal } from '@angular/core';
import {
  BandejaPersonalService,
  FijacionEntidadTipo,
} from '../../../core/services/bandeja-personal.service';
import { mensajeErrorApi } from '../../../core/utils/api-error.util';

@Component({
  selector: 'app-fijar-entidad-button',
  standalone: true,
  template: `
    <div class="fijar-wrap">
      <button
        type="button"
        class="btn-fijar"
        [class.btn-fijar--active]="fijado()"
        [disabled]="loading() || !entidadIdValido()"
        (click)="toggle()"
        [attr.aria-pressed]="fijado()"
        [title]="fijado() ? 'Desfijar de mi bandeja' : 'Fijar en mi bandeja'"
      >
        <span class="material-symbols-outlined">{{ fijado() ? 'keep' : 'push_pin' }}</span>
        <span>{{ fijado() ? 'Fijado' : 'Fijar en mi bandeja' }}</span>
      </button>
      @if (error()) {
        <p class="fijar-error">{{ error() }}</p>
      }
    </div>
  `,
  styles: `
    .fijar-wrap {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }

    .btn-fijar {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--color-outline-variant);
      border-radius: var(--radius-prime);
      background: var(--color-surface-container-lowest);
      color: var(--color-on-surface-variant);
      font-size: 14px;
      font-weight: 500;
      padding: 8px 12px;
      cursor: pointer;

      &:hover:not(:disabled) {
        background: var(--color-surface-container);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      &--active {
        color: var(--color-primary);
        border-color: var(--color-primary-container);
        background: var(--color-secondary-container);
      }
    }

    .fijar-error {
      margin: 0;
      font-size: 12px;
      color: var(--color-error, #b3261e);
      max-width: 220px;
    }
  `,
})
export class FijarEntidadButtonComponent {
  readonly entidadTipo = input.required<FijacionEntidadTipo>();
  readonly entidadId = input.required<number | string>();

  readonly changed = output<boolean>();

  private readonly bandejaService = inject(BandejaPersonalService);

  protected readonly fijado = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = Number(this.entidadId());
      if (!Number.isFinite(id) || id < 1) return;
      this.cargarEstado();
    });
  }

  protected entidadIdValido(): boolean {
    const id = Number(this.entidadId());
    return Number.isFinite(id) && id >= 1;
  }

  protected toggle(): void {
    if (this.loading() || !this.entidadIdValido()) return;

    this.loading.set(true);
    this.error.set(null);

    const tipo = this.entidadTipo();
    const id = Number(this.entidadId());
    const request = this.fijado()
      ? this.bandejaService.desfijar(tipo, id)
      : this.bandejaService.fijar(tipo, id);

    request.subscribe({
      next: () => {
        const nuevoEstado = !this.fijado();
        this.fijado.set(nuevoEstado);
        this.loading.set(false);
        this.changed.emit(nuevoEstado);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(mensajeErrorApi(err, 'No se pudo actualizar la fijación'));
      },
    });
  }

  private cargarEstado(): void {
    const id = Number(this.entidadId());
    if (!Number.isFinite(id) || id < 1) return;

    this.bandejaService.getEstado(this.entidadTipo(), id).subscribe({
      next: (res) => this.fijado.set(res.data.fijado),
      error: () => this.fijado.set(false),
    });
  }
}
