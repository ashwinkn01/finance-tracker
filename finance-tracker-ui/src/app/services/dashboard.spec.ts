import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardService } from './dashboard';

describe('DashboardService', () => {
  let service: DashboardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(DashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends the requested month and maps the backend DTO to the UI model', () => {
    let result: any;
    service.getSummary('2026-10').subscribe(r => (result = r));

    const req = http.expectOne(r => r.url === 'http://localhost:8080/api/dashboard/summary');
    expect(req.request.params.get('month')).toBe('2026-10');
    req.flush({
      totalIncome: 100, totalExpenses: 12.5, netBalance: 87.5,
      categoryBreakdown: [{ categoryName: 'Food', totalSpent: 12.5 }]
    });

    expect(result).toEqual({
      totalIncome: 100,
      totalExpenses: 12.5,
      netBalance: 87.5,
      expenseBreakdown: [{ category: 'Food', amount: 12.5 }]
    });
  });

  it('defaults to the current month as YYYY-MM', () => {
    service.getSummary().subscribe();
    const req = http.expectOne(r => r.url.endsWith('/dashboard/summary'));
    expect(req.request.params.get('month')).toMatch(/^\d{4}-\d{2}$/);
    req.flush({ totalIncome: 0, totalExpenses: 0, netBalance: 0, categoryBreakdown: [] });
  });
});
