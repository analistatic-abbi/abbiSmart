import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: number;
  message: string;
  kind: ToastKind;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly toasts = signal<ToastMessage[]>([]);

  success(message: string, durationMs = 4500): void {
    this.show(message, 'success', durationMs);
  }

  error(message: string, durationMs = 5500): void {
    this.show(message, 'error', durationMs);
  }

  info(message: string, durationMs = 4500): void {
    this.show(message, 'info', durationMs);
  }

  warning(message: string, durationMs = 5000): void {
    this.show(message, 'warning', durationMs);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    this.toasts.update((items) => items.filter((item) => item.id !== id));
  }

  private show(message: string, kind: ToastKind, durationMs: number): void {
    const text = message.trim();
    if (!text) {
      return;
    }

    const toast: ToastMessage = {
      id: ++this.nextId,
      message: text,
      kind,
    };

    this.toasts.update((items) => [...items, toast].slice(-4));

    const timer = setTimeout(() => this.dismiss(toast.id), durationMs);
    this.timers.set(toast.id, timer);
  }
}
