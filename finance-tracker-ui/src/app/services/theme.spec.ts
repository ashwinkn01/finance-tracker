import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.colorScheme = '';
    TestBed.configureTestingModule({});
  });

  it('defaults to dark and applies it to <html>', () => {
    const theme = TestBed.inject(ThemeService);
    expect(theme.isDark()).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('toggles to light, applies it and remembers the choice', () => {
    const theme = TestBed.inject(ThemeService);
    theme.toggle();
    expect(theme.mode()).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(localStorage.getItem('theme_mode')).toBe('light');
    theme.toggle();
    expect(theme.isDark()).toBe(true);
  });

  it('restores a saved light preference', () => {
    localStorage.setItem('theme_mode', 'light');
    expect(TestBed.inject(ThemeService).mode()).toBe('light');
  });
});
