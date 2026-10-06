import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { BudgetDialogComponent, BudgetDialogData } from './budget-dialog';
import { CategoryService } from '../../services/category';
import { Category } from '../../models/category';
import { Budget } from '../../models/budget';

const categories: Category[] = [
  { id: 1, name: 'Food', type: 'EXPENSE' },
  { id: 2, name: 'Rent', type: 'EXPENSE' },
  { id: 3, name: 'Salary', type: 'INCOME' }
];
const data = (over: Partial<BudgetDialogData> = {}): BudgetDialogData => ({
  month: '2026-10', monthLabel: 'October 2026', takenCategoryIds: [], ...over
});
const existing: Budget = {
  id: 9, categoryId: 2, categoryName: 'Rent', monthYear: '2026-10',
  limitAmount: 500, spent: 100, percentUsed: 20, overBudget: false
};

describe('BudgetDialogComponent', () => {
  const close = vi.fn();

  const setup = async (d: BudgetDialogData) => {
    close.mockClear();
    await TestBed.configureTestingModule({
      imports: [BudgetDialogComponent],
      providers: [
        provideHttpClient(),
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: d }
      ]
    }).compileComponents();
    vi.spyOn(TestBed.inject(CategoryService), 'getCategories').mockReturnValue(of(categories));
    const fixture = TestBed.createComponent(BudgetDialogComponent);
    await fixture.whenStable();
    return { fixture, component: fixture.componentInstance };
  };

  it('offers only expense categories', async () => {
    const { component } = await setup(data());
    expect(component.categories().map(c => c.name)).toEqual(['Food', 'Rent']);
  });

  it('hides categories that already have a budget this month', async () => {
    const { component } = await setup(data({ takenCategoryIds: [1] }));
    expect(component.categories().map(c => c.name)).toEqual(['Rent']);
  });

  it('closes with a backend-shaped request on save', async () => {
    const { component } = await setup(data());
    component.form.setValue({ categoryId: 1, limitAmount: '250' });
    component.onSubmit();
    expect(close).toHaveBeenCalledWith({ categoryId: 1, limitAmount: 250, monthYear: '2026-10' });
  });

  it('rejects a zero or empty limit', async () => {
    const { component } = await setup(data());
    component.form.setValue({ categoryId: 1, limitAmount: 0 });
    component.onSubmit();
    expect(close).not.toHaveBeenCalled();
  });

  it('edit mode pre-fills, locks the category, and still sends it', async () => {
    const { component } = await setup(data({ existing, takenCategoryIds: [2] }));
    expect(component.isEdit).toBe(true);
    expect(component.form.controls['categoryId'].disabled).toBe(true);
    expect(component.categories().map(c => c.name)).toContain('Rent');

    component.form.patchValue({ limitAmount: 700 });
    component.onSubmit();
    expect(close).toHaveBeenCalledWith({ categoryId: 2, limitAmount: 700, monthYear: '2026-10' });
  });
});
