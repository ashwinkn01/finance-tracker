import { Injectable, computed, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'theme_mode';

// Remembers whether the user wants dark or light mode and applies it to the whole page.
// Dark is the default. Angular Material's theme reads CSS `color-scheme`, so flipping
// that one property on <html> restyles every component.
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.load());
  readonly isDark = computed(() => this.mode() === 'dark');

  constructor() {
    this.apply(this.mode());
  }

  toggle(): void {
    this.set(this.isDark() ? 'light' : 'dark');
  }

  set(mode: ThemeMode): void {
    this.mode.set(mode);
    this.apply(mode);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* storage unavailable: keep in memory only */ }
  }

  private apply(mode: ThemeMode): void {
    document.documentElement.style.colorScheme = mode;
  }

  private load(): ThemeMode {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  }
}
