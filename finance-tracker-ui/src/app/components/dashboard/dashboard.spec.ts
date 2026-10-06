import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { BaseChartDirective } from 'ng2-charts';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard';
import { DashboardService } from '../../services/dashboard';
import { AuthService } from '../../services/auth.service';
import { CurrencyService } from '../../services/currency';
import { fakeJwt } from '../../testing/fake-jwt';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let dashboard: DashboardService;

  beforeEach(async () => {
    localStorage.clear();
    // jsdom has no canvas, so swap the real chart directive out for the component tests
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient()]
    }).overrideComponent(DashboardComponent, {
      remove: { imports: [BaseChartDirective] },
      add: { schemas: [NO_ERRORS_SCHEMA] }
    });
    TestBed.inject(AuthService).setToken(fakeJwt(3600, 'alice'));
    dashboard = TestBed.inject(DashboardService);
  });

  const create = async () => {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  };

  it('greets the user and fills the cards and chart from the summary', async () => {
    vi.spyOn(dashboard, 'getSummary').mockReturnValue(of({
      totalBalance: 87.5, monthlyExpenses: 12.5,
      expenseBreakdown: [{ category: 'Food', amount: 12.5 }, { category: 'Rent', amount: 100 }]
    }));
    await create();

    expect(component.username()).toBe('alice');
    expect(component.totalBalance()).toBe(87.5);
    expect(component.monthlyExpenses()).toBe(12.5);
    expect(component.pieChartData().labels).toEqual(['Food', 'Rent']);
    expect(component.pieChartData().datasets[0].data).toEqual([12.5, 100]);
  });

  it('formats the cards in the selected display currency', async () => {
    vi.spyOn(dashboard, 'getSummary').mockReturnValue(of({
      totalBalance: 5, monthlyExpenses: 1234.5, expenseBreakdown: []
    }));
    TestBed.inject(CurrencyService).set('EUR');
    await create();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('€1,234.50');
  });

  it('keeps zeros and does not crash if the request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(dashboard, 'getSummary').mockReturnValue(throwError(() => new Error('boom')));
    await create();
    expect(component.totalBalance()).toBe(0);
  });
});
