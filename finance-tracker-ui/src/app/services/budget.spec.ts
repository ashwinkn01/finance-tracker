import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BudgetService } from './budget';

describe('BudgetService', () => {
  let service: BudgetService;
  let http: HttpTestingController;
  const base = 'http://localhost:8080/api/budgets';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(BudgetService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GETs the budgets of one month', () => {
    service.getBudgets('2026-10').subscribe();
    const req = http.expectOne(r => r.url === base);
    expect(req.request.params.get('month')).toBe('2026-10');
    req.flush([]);
  });

  it('POSTs a budget request', () => {
    const body = { categoryId: 3, limitAmount: 100, monthYear: '2026-10' };
    service.saveBudget(body).subscribe();
    const req = http.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('DELETEs a budget by id', () => {
    service.deleteBudget(4).subscribe();
    const req = http.expectOne(`${base}/4`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'ok' });
  });

  it('POSTs from/to when copying budgets', () => {
    service.copyBudgets('2026-09', '2026-10').subscribe();
    const req = http.expectOne(r => r.url === `${base}/copy`);
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('from')).toBe('2026-09');
    expect(req.request.params.get('to')).toBe('2026-10');
    req.flush([]);
  });
});
