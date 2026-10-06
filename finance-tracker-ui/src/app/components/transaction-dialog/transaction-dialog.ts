import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CategoryService } from '../../services/category';
import { CurrencyService } from '../../services/currency';
import { Category } from '../../models/category';
import { Transaction, TransactionRequest } from '../../models/transaction';

@Component({
  selector: 'app-transaction-dialog',
  standalone: true,
  // Make sure to import all these Material modules so the form renders correctly!
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatDatepickerModule, MatNativeDateModule
  ],
  templateUrl: './transaction-dialog.html',
  styleUrl: './transaction-dialog.scss'
})
export class TransactionDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryService);
  currency = inject(CurrencyService);

  // This reference allows us to close the dialog from within the component
  private dialogRef = inject(MatDialogRef<TransactionDialogComponent>);

  // If the table opened us with a transaction, we are EDITING it; otherwise we are adding.
  readonly existing: Transaction | null = inject<Transaction | null>(MAT_DIALOG_DATA, { optional: true });
  readonly isEdit = this.existing !== null;

  // Signals: all categories from the backend, and the currently chosen type
  private allCategories = signal<Category[]>([]);
  private selectedType = signal<'INCOME' | 'EXPENSE'>(this.existing?.type ?? 'EXPENSE');

  // computed() re-runs automatically whenever either signal above changes,
  // so the dropdown only ever shows categories matching Income/Expense
  categories = computed(() => this.allCategories().filter(c => c.type === this.selectedType()));

  // Inline "add category" row
  addingCategory = signal(false);
  categoryError = signal('');
  newCategoryName = new FormControl('', [Validators.required, Validators.maxLength(50)]);

  // The field names match the backend's TransactionDto
  transactionForm: FormGroup = this.fb.group({
    type: [this.existing?.type ?? 'EXPENSE', Validators.required],
    amount: [this.existing?.amount ?? '', [Validators.required, Validators.min(0.01)]], // Must be greater than 0
    // Appending T00:00 makes the string parse as LOCAL midnight (a bare "2026-10-06" parses as UTC)
    txnDate: [this.existing ? new Date(this.existing.txnDate + 'T00:00') : new Date(), Validators.required],
    categoryId: [this.existing?.categoryId ?? null, Validators.required],
    note: [this.existing?.note ?? '']
  });

  ngOnInit(): void {
    this.loadCategories();

    // When the user flips Income/Expense, update the list and clear the old pick
    this.transactionForm.controls['type'].valueChanges.subscribe(type => {
      this.selectedType.set(type);
      this.transactionForm.controls['categoryId'].reset(null);
    });
  }

  private loadCategories(selectId?: number): void {
    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        this.allCategories.set(cats);
        if (selectId) this.transactionForm.controls['categoryId'].setValue(selectId);
      },
      error: (err) => console.error('Failed to load categories', err)
    });
  }

  saveNewCategory(): void {
    if (this.newCategoryName.invalid) return;
    this.categoryError.set('');
    // The new category gets whatever type (Income/Expense) is currently selected in the form
    this.categoryService.createCategory(this.newCategoryName.value!.trim(), this.selectedType()).subscribe({
      next: (created) => {
        this.newCategoryName.reset('');
        this.addingCategory.set(false);
        this.loadCategories(created.id); // refresh the list and auto-select the new one
      },
      error: (err) => this.categoryError.set(err.error?.message ?? 'Could not create category')
    });
  }

  cancelNewCategory(): void {
    this.newCategoryName.reset('');
    this.categoryError.set('');
    this.addingCategory.set(false);
  }

  onCancel(): void {
    this.dialogRef.close(); // Closes the modal and returns undefined
  }

  onSubmit(): void {
    if (this.transactionForm.valid) {
      const v = this.transactionForm.value;
      const payload: TransactionRequest = {
        type: v.type,
        amount: Number(v.amount),
        txnDate: this.toIsoDate(v.txnDate),
        // Backend requires a time: keep the original when editing, otherwise use "now" as "HH:mm:ss"
        txnTime: this.existing?.txnTime ?? new Date().toTimeString().slice(0, 8),
        note: v.note || undefined,
        categoryId: v.categoryId
      };
      // Closes the modal and passes the payload back to the parent table
      this.dialogRef.close(payload);
    }
  }

  // The datepicker gives a JS Date; Spring wants "yyyy-MM-dd" in LOCAL time
  // (toISOString() would convert to UTC and can shift the day).
  private toIsoDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
