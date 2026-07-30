import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'abbi-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<ThemeMode>(this.readStoredTheme());

  readonly theme = this._theme.asReadonly();
  readonly isDark = () => this._theme() === 'dark';

  constructor() {
    this.apply(this._theme());
  }

  toggle(): void {
    this.set(this._theme() === 'dark' ? 'light' : 'dark');
  }

  set(mode: ThemeMode): void {
    if (this._theme() === mode) return;
    this._theme.set(mode);
    this.apply(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }

  private apply(mode: ThemeMode): void {
    const root = document.documentElement;
    root.dataset['theme'] = mode;
    root.classList.toggle('dark', mode === 'dark');
    root.style.colorScheme = mode;
  }

  private readStoredTheme(): ThemeMode {
    if (typeof localStorage === 'undefined') return 'light';
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'dark' ? 'dark' : 'light';
  }
}
