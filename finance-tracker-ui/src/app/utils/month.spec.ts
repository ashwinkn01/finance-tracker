import { currentMonth, monthLabel, shiftMonth } from './month';

describe('month helpers', () => {
  it('shifts across year boundaries in both directions', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-10', 0)).toBe('2026-10');
    expect(shiftMonth('2026-10', -13)).toBe('2025-09');
  });

  it('formats a readable label', () => {
    expect(monthLabel('2026-10')).toBe('October 2026');
    expect(monthLabel('2026-01')).toBe('January 2026');
  });

  it('returns the current month as YYYY-MM', () => {
    expect(currentMonth()).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });
});
