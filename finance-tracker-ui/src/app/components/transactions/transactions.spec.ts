import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { TransactionsComponent } from './transactions';
import { TransactionService } from '../../services/transaction';
import { Transaction } from '../../models/transaction';

const txn = (over: Partial<Transaction> = {}): Transaction => ({
  id: 1, amount: 12.5, type: 'EXPENSE', txnDate: '2026-10-06', txnTime: '12:00:00',
  note: 'Lunch', categoryId: 2, categoryName: 'Food', ...over
});
const page = (content: Transaction[], totalElements = content.length) =>
  ({ content, totalElements, number: 0, size: 5 });

describe('TransactionsComponent', () => {
  let fixture: ComponentFixture<TransactionsComponent>;
  let component: TransactionsComponent;
  let service: TransactionService;
  // The component imports MatDialogModule, which gives it its OWN MatDialog,
  // so the fake must be provided at component level (not on the root injector).
  const dialog = { open: vi.fn() };

  beforeEach(async () => {
    dialog.open.mockReset();
    await TestBed.configureTestingModule({
      imports: [TransactionsComponent],
      providers: [provideHttpClient()]
    })
      .overrideComponent(TransactionsComponent, {
        set: { providers: [{ provide: MatDialog, useValue: dialog }] }
      })
      .compileComponents();
    service = TestBed.inject(TransactionService);
  });

  const create = async () => {
    fixture = TestBed.createComponent(TransactionsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  };

  it('loads the first page and renders the rows with signs and category names', async () => {
    const get = vi.spyOn(service, 'getTransactions').mockReturnValue(of(page([
      txn(), txn({ id: 2, type: 'INCOME', amount: 100, note: 'Pay', categoryName: 'Salary' })
    ])));
    await create();
    fixture.detectChanges();

    expect(get).toHaveBeenCalledWith(0, 5);
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('Lunch');
    expect(text).toContain('Salary');
    expect(text).toContain('-$12.50');
    expect(text).toContain('+$100.00');
  });

  it('uses the backend total for the paginator and re-fetches on page change', async () => {
    const get = vi.spyOn(service, 'getTransactions').mockReturnValue(of(page([txn()], 42)));
    await create();
    expect(component.totalElements).toBe(42);

    component.onPage({ pageIndex: 2, pageSize: 10, length: 42 });
    expect(get).toHaveBeenLastCalledWith(2, 10);
  });

  it('deletes after confirmation and reloads', async () => {
    vi.spyOn(service, 'getTransactions').mockReturnValue(of(page([txn()])));
    const del = vi.spyOn(service, 'deleteTransaction').mockReturnValue(of('ok'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await create();

    component.deleteTransaction(txn());
    expect(del).toHaveBeenCalledWith(1);
    expect(service.getTransactions).toHaveBeenCalledTimes(2);
  });

  it('does not delete when the user cancels the confirmation', async () => {
    vi.spyOn(service, 'getTransactions').mockReturnValue(of(page([txn()])));
    const del = vi.spyOn(service, 'deleteTransaction');
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await create();

    component.deleteTransaction(txn());
    expect(del).not.toHaveBeenCalled();
  });

  it('opens the edit dialog with the row and PUTs the result', async () => {
    vi.spyOn(service, 'getTransactions').mockReturnValue(of(page([txn()])));
    const update = vi.spyOn(service, 'updateTransaction').mockReturnValue(of(txn()));
    const result = { amount: 20, type: 'EXPENSE' as const, txnDate: '2026-10-06', txnTime: '12:00:00', categoryId: 2 };
    dialog.open.mockReturnValue({ afterClosed: () => of(result) });
    await create();

    component.openEditDialog(txn());
    expect(dialog.open.mock.calls[0][1].data.id).toBe(1);
    expect(update).toHaveBeenCalledWith(1, result);
  });

  it('creates a transaction from the add dialog result and reloads', async () => {
    vi.spyOn(service, 'getTransactions').mockReturnValue(of(page([])));
    const created = vi.spyOn(service, 'createTransaction').mockReturnValue(of(txn()));
    const result = { amount: 5, type: 'EXPENSE' as const, txnDate: '2026-10-06', txnTime: '12:00:00', categoryId: 2 };
    dialog.open.mockReturnValue({ afterClosed: () => of(result) });
    await create();

    component.openAddDialog();
    expect(created).toHaveBeenCalledWith(result);
    expect(service.getTransactions).toHaveBeenCalledTimes(2);
  });

  it('does nothing when the dialog is cancelled', async () => {
    vi.spyOn(service, 'getTransactions').mockReturnValue(of(page([])));
    const create$ = vi.spyOn(service, 'createTransaction');
    dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
    await create();

    component.openAddDialog();
    expect(dialog.open).toHaveBeenCalled();
    expect(create$).not.toHaveBeenCalled();
  });
});
