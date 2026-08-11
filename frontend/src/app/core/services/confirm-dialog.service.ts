import { Injectable, signal } from '@angular/core';

export type ConfirmDialogVariant = 'primary' | 'danger';

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
}

export interface ConfirmDialogState extends Required<ConfirmDialogConfig> {}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  readonly state = signal<ConfirmDialogState | null>(null);

  private resolver: ((value: boolean) => void) | null = null;

  confirm(config: ConfirmDialogConfig): Promise<boolean> {
    if (this.resolver) {
      this.resolve(false);
    }

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
      this.state.set({
        title: config.title,
        message: config.message,
        confirmLabel: config.confirmLabel ?? 'Confirmar',
        cancelLabel: config.cancelLabel ?? 'Cancelar',
        variant: config.variant ?? 'primary',
      });
    });
  }

  resolve(confirmed: boolean): void {
    const resolver = this.resolver;
    this.resolver = null;
    this.state.set(null);
    resolver?.(confirmed);
  }
}
