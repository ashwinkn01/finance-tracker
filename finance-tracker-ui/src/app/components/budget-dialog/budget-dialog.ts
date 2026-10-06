import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { CategoryService } from '../../services/category';
import { CurrencyService } from '../../services/currency';
import { Category } from '../../models/category';
import { Budget, BudgetRequest } from '../../models/budget';

// What the dashboard passes in when it opens this dialog
export interface BudgetDialogData {
  month: string;                 // "2026-10"
  monthLabel: string;            // "October 2026" (for the title)
  existing?: Budget;             // set when editing
  takenCategoryIds: number[];    // categories that already have a budget this month
}

@Component({
  selector: 'app-budget-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule
  ],
  templateUrl: './budget-dialog.html',
  styleUrl: './budget-dialog.scss'
})
export class BudgetDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryService);
  private dialogRef = inject(MatDialogRef<BudgetDialogComponent>);
  readonly data = inject<BudgetDialogData>(MAT_DIALOG_DATA);
  currency = inject(CurrencyService);

  readonly isEdit = !!this.data.existing;

  // Only EXPENSE categories without a budget yet (when editing, the category is fixed)
  categories = signal<Category[]>([]);

  form: FormGroup = this.fb.group({
    categoryId: [this.data.existing?.categoryId ?? null, Validators.required],
    limitAmount: [this.data.existing?.limitAmount ?? '', [Validators.required, Validators.min(0.01)]]
  });

  ngOnInit(): void {
    if (this.isEdit) {
      this.form.controls['categoryId'].disable(); // can't move a budget to another category
    }
    this.categoryService.getCategories().subscribe({
      next: (cats) => this.categories.set(
        cats.filter(c => c.type === 'EXPENSE' &&
          (c.id === this.data.existing?.categoryId || !this.data.takenCategoryIds.includes(c.id)))
      ),
      error: (err) => console.error('Failed to load categories', err)
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    // getRawValue() includes the disabled category control (a plain .value would leave it out)
    const v = this.form.getRawValue();
    const request: BudgetRequest = {
      categoryId: v.categoryId,
      limitAmount: Number(v.limitAmount),
      monthYear: this.data.month
    };
    this.dialogRef.close(request);
  }
}
