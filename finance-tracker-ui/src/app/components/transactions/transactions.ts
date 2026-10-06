import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon'; 
import { TransactionService } from '../../services/transaction';
import { Transaction, TransactionRequest } from '../../models/transaction';
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
  displayedColumns: string[] = ['txnDate', 'note', 'categoryName', 'amount', 'type', 'actions'];

  // These decorators grab the Paginator and Sort components from the HTML 
  @ViewChild(MatSort) sort!: MatSort;

  // Server-side paging state: the backend sends one page at a time
  totalElements = 0;
  pageSize = 5;
  pageIndex = 0;

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.transactionService.getTransactions(this.pageIndex, this.pageSize).subscribe({
      next: (page) => {
        this.dataSource.data = page.content;   // Spring wraps the rows in `content`
        this.totalElements = page.totalElements;
        this.dataSource.sort = this.sort;      // sorting applies to the rows on this page
      },
      error: (err) => console.error('Failed to load transactions', err)
    });
  }

  // Fires when the user clicks next/previous or changes the page size
  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadTransactions();
  }

  deleteTransaction(txn: Transaction): void {
    if (!confirm(`Delete this ${txn.categoryName} transaction?`)) return;
    this.transactionService.deleteTransaction(txn.id).subscribe({
      next: () => this.loadTransactions(),
      error: (err) => console.error('Failed to delete transaction', err)
    });
  }

  openAddDialog(): void {
    const dialogRef = this.dialog.open(TransactionDialogComponent, {
      width: '500px' // Sets a nice standard width for the pop-up
    });

    // When the dialog closes, check if we have data to save
    dialogRef.afterClosed().subscribe((result: TransactionRequest) => {
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