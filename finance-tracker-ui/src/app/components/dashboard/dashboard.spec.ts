import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { BaseChartDirective } from 'ng2-charts';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard';
import { DashboardService } from '../../services/dashboard';
import { TransactionService } from '../../services/transaction';
import { AuthService } from '../../services/auth.service';
import { CurrencyService } from '../../services/currency';
import { DashboardSummary } from '../../models/dashboard';
import { Transaction } from '../../models/transaction';
import { fakeJwt } from '../../testing/fake-jwt';

const summary = (over: Partial<DashboardSummary> = {}): DashboardSummary => ({
  totalIncome: 100, totalExpenses: 12.5, netBalance: 87.5,
  expenseBreakdown: [{ category: 'Food', amount: 12.5 }], ...over
});
const txn: Transaction = {
  id: 1, amount: 12.5, type: 'EXPENSE', txnDate: '2026-10-06', txnTime: '12:00:00',
  note: 'Lunch', categoryId: 2, categoryName: 'Food'
};

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let dashboard: DashboardService;
  let transactions: TransactionService;
  let getSummary: ReturnType<typeof vi.spyOn>;
  // The component imports MatDialogModule, so its MatDialog must be faked at component level
  const dialog = { open: vi.fn() };
  const text = () => (fixture.nativeElement as HTMLElement).textContent!;

  beforeEach(() => {
    localStorage.clear();
    dialog.open.mockReset();
    // jsdom has no canvas, so swap the real chart directive out for the component tests
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient(), provideRouter([])]
    }).overrideComponent(DashboardComponent, {
      remove: { imports: [BaseChartDirective] },
      add: {
        schemas: [NO_ERRORS_SCHEMA],
        providers: [{ provide: MatDialog, useValue: dialog }]
      }
    });
    TestBed.inject(AuthService).setToken(fakeJwt(3600, 'alice'));
    dashboard = TestBed.inject(DashboardService);
    transactions = TestBed.inject(TransactionService);
    getSummary = vi.spyOn(dashboard, 'getSummary').mockReturnValue(of(summary()));
    vi.spyOn(transactions, 'getTransactions')
      .mockReturnValue(of({ content: [txn], totalElements: 1, number: 0, size: 5 }));
  });

  const create = async () => {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  };

  it('greets the user and loads the current month', async () => {
    await create();
    expect(component.username()).toBe('alice');
    expect(getSummary).toHaveBeenCalledWith(dashboard.currentMonth());
    expect(component.totalIncome()).toBe(100);
    expect(component.totalExpenses()).toBe(12.5);
    expect(component.netBalance()).toBe(87.5);
    expect(component.pieChartData().labels).toEqual(['Food']);
    expect(component.pieChartData().datasets[0].data).toEqual([12.5]);
  });

  it('formats the cards in the selected display currency', async () => {
    getSummary.mockReturnValue(of(summary({ totalIncome: 1234.5 })));
    TestBed.inject(CurrencyService).set('EUR');
    await create();
    expect(text()).toContain('€1,234.50');
  });

  it('steps back and forward through months, but never past the current month', async () => {
    await create();
    expect(component.isCurrentMonth()).toBe(true);

    component.nextMonth(); // blocked: already on the current month
    expect(component.month()).toBe(dashboard.currentMonth());

    component.previousMonth();
    expect(component.isCurrentMonth()).toBe(false);
    expect(getSummary).toHaveBeenLastCalledWith(component.month());

    component.nextMonth();
    expect(component.month()).toBe(dashboard.currentMonth());
  });

  it('wraps from January to the previous December', async () => {
    await create();
    component.month.set('2026-01');
    component.previousMonth();
    expect(component.month()).toBe('2025-12');
  });

  it('shows a month label like "January 2026"', async () => {
    await create();
    component.month.set('2026-01');
    expect(component.monthLabel()).toBe('January 2026');
  });

  it('shows the empty state with an Add button when the month has no data', async () => {
    getSummary.mockReturnValue(of(summary({ totalIncome: 0, totalExpenses: 0, netBalance: 0, expenseBreakdown: [] })));
    await create();
    expect(component.isEmpty()).toBe(true);
    expect(text()).toContain('No transactions in');
    expect(text()).toContain('Add Transaction');
  });

  it('lists recent transactions', async () => {
    await create();
    expect(text()).toContain('Lunch');
    expect(text()).toContain('-$12.50');
  });

  it('creates a transaction from the empty-state dialog and jumps to its month', async () => {
    const result = { amount: 5, type: 'EXPENSE' as const, txnDate: '2026-03-15', txnTime: '10:00:00', categoryId: 2 };
    dialog.open.mockReturnValue({ afterClosed: () => of(result) });
    const create$ = vi.spyOn(transactions, 'createTransaction').mockReturnValue(of(txn));
    await create();

    component.openAddDialog();
    expect(create$).toHaveBeenCalledWith(result);
    expect(component.month()).toBe('2026-03');
    expect(getSummary).toHaveBeenLastCalledWith('2026-03');
  });

  it('keeps zeros and does not crash if the request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getSummary.mockReturnValue(throwError(() => new Error('boom')));
    await create();
    expect(component.totalExpenses()).toBe(0);
  });
});
