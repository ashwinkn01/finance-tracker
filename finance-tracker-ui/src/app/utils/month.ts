// Small helpers for "YYYY-MM" month strings (the format the backend uses everywhere).

export function currentMonth(): string {
  return toMonth(new Date());
}

// shiftMonth('2026-01', -1) === '2025-12'
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  return toMonth(new Date(y, m - 1 + delta, 1));
}

// monthLabel('2026-10') === 'October 2026'
// The date is built from parts (not parsed from a string), so time zones can never shift the month.
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' });
}

function toMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
