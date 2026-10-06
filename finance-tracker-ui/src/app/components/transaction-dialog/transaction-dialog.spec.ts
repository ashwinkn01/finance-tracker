import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { TransactionDialogComponent } from './transaction-dialog';
import { CategoryService } from '../../services/category';
import { Category } from '../../models/category';
import { Transaction } from '../../models/transaction';

const categories: Category[] = [
  { id: 1, name: 'Food', type: 'EXPENSE' },
  { id: 2, name: 'Rent', type: 'EXPENSE' },
  { id: 3, name: 'Salary', type: 'INCOME' }
];
const existing: Transaction = {
  id: 9, amount: 12.5, type: 'EXPENSE', txnDate: '2026-10-06', txnTime: '08:30:00',
  note: 'Lunch', categoryId: 1, categoryName: 'Food'
};

describe('TransactionDialogComponent', () => {
  const close = vi.fn();

  const setup = async (data: Transaction | null = null) => {
    close.mockClear();
    await TestBed.configureTestingModule({
      imports: [TransactionDialogComponent],
      providers: [
        provideHttpClient(),
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    }).compileComponents();
    const svc = TestBed.inject(CategoryService);
    vi.spyOn(svc, 'getCategories').mockReturnValue(of(categories));
    const fixture = TestBed.createComponent(TransactionDialogComponent);
    await fixture.whenStable();
    return { fixture, component: fixture.componentInstance, svc };
  };

  it('starts empty in add mode and only lists EXPENSE categories', async () => {
    const { component } = await setup();
    expect(component.isEdit).toBe(false);
    expect(component.transactionForm.valid).toBe(false);
    expect(component.categories().map(c => c.name)).toEqual(['Food', 'Rent']);
  });

  it('switches the category list and clears the pick when the type changes', async () => {
    const { component } = await setup();
    component.transactionForm.patchValue({ categoryId: 1 });
    component.transactionForm.patchValue({ type: 'INCOME' });
    expect(component.categories().map(c => c.name)).toEqual(['Salary']);
    expect(component.transactionForm.value.categoryId).toBeNull();
  });

  it('closes with a backend-shaped payload on save', async () => {
    const { component } = await setup();
    component.transactionForm.setValue({
      type: 'EXPENSE', amount: '12.5', txnDate: new Date(2026, 9, 6), categoryId: 1, note: 'Lunch'
    });
    component.onSubmit();

    const payload = close.mock.calls[0][0];
    expect(payload).toMatchObject({
      type: 'EXPENSE', amount: 12.5, txnDate: '2026-10-06', categoryId: 1, note: 'Lunch'
    });
    expect(payload.txnTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('does not close when the form is invalid (amount must be > 0)', async () => {
    const { component } = await setup();
    component.transactionForm.setValue({
      type: 'EXPENSE', amount: 0, txnDate: new Date(), categoryId: 1, note: ''
    });
    component.onSubmit();
    expect(close).not.toHaveBeenCalled();
  });

  it('pre-fills the form in edit mode and keeps the original time', async () => {
    const { component } = await setup(existing);
    expect(component.isEdit).toBe(true);
    expect(component.transactionForm.value).toMatchObject({
      type: 'EXPENSE', amount: 12.5, categoryId: 1, note: 'Lunch'
    });

    component.onSubmit();
    expect(close.mock.calls[0][0]).toMatchObject({ txnDate: '2026-10-06', txnTime: '08:30:00' });
  });

  it('creates a category of the current type, reloads, and selects it', async () => {
    const { component, svc } = await setup();
    const create = vi.spyOn(svc, 'createCategory')
      .mockReturnValue(of({ id: 4, name: 'Gym', type: 'EXPENSE' }));
    component.addingCategory.set(true);
    component.newCategoryName.setValue('  Gym ');
    component.saveNewCategory();

    expect(create).toHaveBeenCalledWith('Gym', 'EXPENSE');
    expect(component.transactionForm.value.categoryId).toBe(4);
    expect(component.addingCategory()).toBe(false);
  });

  it('shows the server error if creating a category fails', async () => {
    const { component, svc } = await setup();
    vi.spyOn(svc, 'createCategory')
      .mockReturnValue(throwError(() => ({ error: { message: 'Nope' } })));
    component.newCategoryName.setValue('Gym');
    component.saveNewCategory();
    expect(component.categoryError()).toBe('Nope');
  });
});
