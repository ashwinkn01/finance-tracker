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
import { BudgetService } from '../../services/budget';
import { AuthService } from '../../services/auth.service';
import { CurrencyService } from '../../services/currency';
import { DashboardSummary } from '../../models/dashboard';
import { Transaction } from '../../models/transaction';
import { Budget } from '../../models/budget';
import { fakeJwt } from '../../testing/fake-jwt';

const summary = (over: Partial<DashboardSummary> = {}): DashboardSummary => ({
  totalIncome: 100, totalExpenses: 12.5, netBalance: 87.5,
  expenseBreakdown: [{ category: 'Food', amount: 12.5 }], ...over
});
const txn: Transaction = {
  id: 1, amount: 12.5, type: 'EXPENSE', txnDate: '2026-10-06', txnTime: '12:00:00',
  note: 'Lunch', categoryId: 2, categoryName: 'Food'
};

const budget = (over: Partial<Budget> = {}): Budget => ({
  id: 1, categoryId: 2, categoryName: 'Food', monthYear: '2026-10',
  limitAmount: 100, spent: 50, percentUsed: 50, overBudget: false, ...over
});

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let dashboard: DashboardService;
  let transactions: TransactionService;
  let budgets: BudgetService;
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
    budgets = TestBed.inject(BudgetService);
    vi.spyOn(budgets, 'getBudgets').mockReturnValue(of([budget()]));
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

  describe('budgets', () => {
    it('loads the budgets of the viewed month and reloads when the month changes', async () => {
      await create();
      expect(budgets.getBudgets).toHaveBeenCalledWith(dashboard.currentMonth());
      expect(component.budgets()).toHaveLength(1);
      expect(text()).toContain('Food');
      expect(text()).toContain('$50.00 of $100.00');

      component.previousMonth();
      expect(budgets.getBudgets).toHaveBeenLastCalledWith(component.month());
    });

    it('colours bars green under 80%, amber from 80% to the limit, red when over', async () => {
      await create();
      expect(component.budgetState(budget({ percentUsed: 79.9 }))).toBe('ok');
      expect(component.budgetState(budget({ percentUsed: 80 }))).toBe('warn');
      expect(component.budgetState(budget({ percentUsed: 100 }))).toBe('warn');
      expect(component.budgetState(budget({ percentUsed: 120, overBudget: true }))).toBe('over');
    });

    it('says how much a budget is exceeded by', async () => {
      vi.mocked(budgets.getBudgets).mockReturnValue(
        of([budget({ spent: 125.5, percentUsed: 125.5, overBudget: true })]));
      await create();
      expect(text()).toContain('Over budget by $25.50');
    });

    it('offers to copy last month only when there are no budgets yet', async () => {
      vi.mocked(budgets.getBudgets).mockReturnValue(of([]));
      await create();
      expect(text()).toContain('No budgets set for');
      expect(text()).toContain('Copy from');

      vi.mocked(budgets.getBudgets).mockReturnValue(of([budget()]));
      component.goToThisMonth();
      await fixture.whenStable();
      expect(text()).not.toContain('Copy from');
    });

    it('copies from the previous month into the viewed month', async () => {
      vi.mocked(budgets.getBudgets).mockReturnValue(of([]));
      const copy = vi.spyOn(budgets, 'copyBudgets').mockReturnValue(of([budget()]));
      await create();
      component.month.set('2026-01');

      component.copyFromPreviousMonth();
      expect(copy).toHaveBeenCalledWith('2025-12', '2026-01');
      expect(component.budgets()).toHaveLength(1);
    });

    it('saves a budget returned by the dialog, passing the month and taken categories', async () => {
      const request = { categoryId: 2, limitAmount: 80, monthYear: '2026-10' };
      dialog.open.mockReturnValue({ afterClosed: () => of(request) });
      const save = vi.spyOn(budgets, 'saveBudget').mockReturnValue(of(budget()));
      await create();

      component.openBudgetDialog();
      const config = dialog.open.mock.calls[0][1];
      expect(config.data).toMatchObject({ month: dashboard.currentMonth(), takenCategoryIds: [2] });
      expect(save).toHaveBeenCalledWith(request);
    });

    it('does not save when the dialog is cancelled', async () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
      const save = vi.spyOn(budgets, 'saveBudget');
      await create();
      component.openBudgetDialog();
      expect(save).not.toHaveBeenCalled();
    });

    it('removes a budget after confirmation, and not when cancelled', async () => {
      const del = vi.spyOn(budgets, 'deleteBudget').mockReturnValue(of({ message: 'ok' }));
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      await create();

      component.deleteBudget(budget());
      expect(del).not.toHaveBeenCalled();

      confirm.mockReturnValue(true);
      component.deleteBudget(budget());
      expect(del).toHaveBeenCalledWith(1);
    });
  });
});
