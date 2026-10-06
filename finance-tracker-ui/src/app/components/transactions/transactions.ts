import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon'; 
import { TransactionService } from '../../services/transaction';
import { Transaction } from '../../models/transaction';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TransactionDialogComponent } from '../transaction-dialog/transaction-dialog';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule, 
    MatTableModule, 
    MatPaginatorModule, 
    MatSortModule, 
    MatCardModule, 
    MatButtonModule,
    MatIconModule,
    CurrencyPipe,
    DatePipe,
    MatDialogModule
  ],
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss'
})
export class TransactionsComponent implements OnInit {
  private transactionService = inject(TransactionService);
  private dialog = inject(MatDialog);

  // The Material Data Source holding our rows
  dataSource = new MatTableDataSource<Transaction>([]);
  
  // The exact order of columns we want to render in the HTML
  displayedColumns: string[] = ['date', 'description', 'category', 'amount', 'type', 'actions'];

  // These decorators grab the Paginator and Sort components from the HTML 
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.transactionService.getTransactions().subscribe({
      next: (data) => {
        this.dataSource.data = data;
        // Attach the paginator and sorter once the data arrives
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      },
      error: (err) => console.error('Failed to load transactions', err)
    });
  }
  openAddDialog(): void {
    const dialogRef = this.dialog.open(TransactionDialogComponent, {
      width: '500px' // Sets a nice standard width for the pop-up
    });

    // When the dialog closes, check if we have data to save
    dialogRef.afterClosed().subscribe((result: Transaction) => {
      if (result) {
        // If the user clicked save, send it to Spring Boot!
        this.transactionService.createTransaction(result).subscribe({
          next: () => {
            // Re-fetch the table data to show the new row instantly
            this.loadTransactions(); 
          },
          error: (err) => console.error('Failed to save transaction', err)
        });
      }
    });
  }
}