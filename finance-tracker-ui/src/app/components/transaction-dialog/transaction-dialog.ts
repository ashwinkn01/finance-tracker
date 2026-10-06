import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

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
export class TransactionDialogComponent {
  private fb = inject(FormBuilder);
  
  // This reference allows us to close the dialog from within the component
  private dialogRef = inject(MatDialogRef<TransactionDialogComponent>);

  transactionForm: FormGroup = this.fb.group({
    date: [new Date(), Validators.required], // Defaults to today's date
    description: ['', Validators.required],
    category: ['', Validators.required],
    amount: ['', [Validators.required, Validators.min(0.01)]], // Must be greater than 0
    type: ['EXPENSE', Validators.required] // Defaults to an expense
  });

  onCancel(): void {
    this.dialogRef.close(); // Closes the modal and returns undefined
  }

  onSubmit(): void {
    if (this.transactionForm.valid) {
      // Closes the modal and passes the form data back to the parent table
      this.dialogRef.close(this.transactionForm.value); 
    }
  }
}