import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CategoryService } from '../../services/category';
import { Category } from '../../models/category';
import { TransactionRequest } from '../../models/transaction';

@Component({
  selector: 'app-transaction-dialog',
  standalone: true,
  // Make sure to import all these Material modules so the form renders correctly!
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatDatepickerModule, MatNativeDateModule
  ],
  templateUrl: './transaction-dialog.html',
  styleUrl: './transaction-dialog.scss'
})
export class TransactionDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryService);

  // This reference allows us to close the dialog from within the component
  private dialogRef = inject(MatDialogRef<TransactionDialogComponent>);

  // Signals: all categories from the backend, and the currently chosen type
  private allCategories = signal<Category[]>([]);
  private selectedType = signal<'INCOME' | 'EXPENSE'>('EXPENSE');

  // computed() re-runs automatically whenever either signal above changes,
  // so the dropdown only ever shows categories matching Income/Expense
  categories = computed(() => this.allCategories().filter(c => c.type === this.selectedType()));

  // The field names match the backend's TransactionDto
  transactionForm: FormGroup = this.fb.group({
    type: ['EXPENSE', Validators.required],
    amount: ['', [Validators.required, Validators.min(0.01)]], // Must be greater than 0
    txnDate: [new Date(), Validators.required],                // Defaults to today's date
    categoryId: [null, Validators.required],
    note: ['']
  });

  ngOnInit(): void {
    this.categoryService.getCategories().subscribe({
      next: (cats) => this.allCategories.set(cats),
      error: (err) => console.error('Failed to load categories', err)
    });

    // When the user flips Income/Expense, update the list and clear the old pick
    this.transactionForm.controls['type'].valueChanges.subscribe(type => {
      this.selectedType.set(type);
      this.transactionForm.controls['categoryId'].reset(null);
    });
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
        txnTime: new Date().toTimeString().slice(0, 8), // "HH:mm:ss" - backend requires a time
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
