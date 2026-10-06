import { TestBed } from '@angular/core/testing';
import { CurrencyService } from './currency';

describe('CurrencyService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('defaults to USD with a $ symbol', () => {
    const service = TestBed.inject(CurrencyService);
    expect(service.code()).toBe('USD');
    expect(service.symbol()).toBe('$');
  });

  it('changes the code and symbol, and remembers the choice', () => {
    const service = TestBed.inject(CurrencyService);
    service.set('INR');
    expect(service.code()).toBe('INR');
    expect(service.symbol()).toBe('₹');
    expect(localStorage.getItem('display_currency')).toBe('INR');
  });

  it('restores a saved currency and ignores unknown codes', () => {
    localStorage.setItem('display_currency', 'EUR');
    expect(TestBed.inject(CurrencyService).code()).toBe('EUR');

    TestBed.resetTestingModule();
    localStorage.setItem('display_currency', 'XXX');
    expect(TestBed.inject(CurrencyService).code()).toBe('USD');
  });
});
