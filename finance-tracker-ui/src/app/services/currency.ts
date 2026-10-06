import { Injectable, computed, signal } from '@angular/core';

export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SGD', name: 'Singapore Dollar' }
];

const STORAGE_KEY = 'display_currency';

// Holds the ONE currency the whole app displays amounts in.
// Note: amounts are stored as plain numbers - changing this only changes how they are shown.
@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  readonly currencies = CURRENCIES;

  // A signal, so every template that reads code() updates the instant it changes
  readonly code = signal<string>(this.load());

  // e.g. "$", "€", "₹" - derived from the code using the browser's Intl API
  readonly symbol = computed(() =>
    new Intl.NumberFormat('en', { style: 'currency', currency: this.code() })
      .formatToParts(0)
      .find(p => p.type === 'currency')?.value ?? this.code()
  );

  set(code: string): void {
    this.code.set(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* storage unavailable: keep in memory only */ }
  }

  private load(): string {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && CURRENCIES.some(c => c.code === saved)) return saved;
    } catch { /* ignore */ }
    return 'USD';
  }
}
