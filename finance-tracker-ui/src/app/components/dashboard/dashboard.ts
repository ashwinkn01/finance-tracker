import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { Subscription } from 'rxjs';

import { AuthService } from '../../services/auth.service';
// Make sure this path matches exactly what the CLI generated
import { DashboardService } from '../../services/dashboard';
import { TransactionService } from '../../services/transaction';
import { CurrencyService } from '../../services/currency';
import { ThemeService } from '../../services/theme';
import { Transaction, TransactionRequest } from '../../models/transaction';
import { TransactionDialogComponent } from '../transaction-dialog/transaction-dialog';

// Slice colours: teal first, then distinct hues that stay readable on dark and light backgrounds
const CHART_COLORS = ['#2dd4bf', '#38bdf8', '#a78bfa', '#fbbf24', '#fb7185', '#34d399', '#f97316', '#94a3b8'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatDialogModule,
    BaseChartDirective
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private transactionService = inject(TransactionService);
  private dialog = inject(MatDialog);
  currency = inject(CurrencyService);
  private theme = inject(ThemeService);

  username = signal<string | null>('');

  // The month being viewed, as "YYYY-MM" (the format the backend expects)
  month = signal<string>(this.dashboardService.currentMonth());
  isCurrentMonth = computed(() => this.month() >= this.dashboardService.currentMonth());
  // "October 2026" - parsed with an explicit day so it is never shifted by time zones
  monthLabel = computed(() => {
    const [y, m] = this.month().split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' });
  });

  // --- Signals for the stat cards ---
  totalIncome = signal<number>(0);
  totalExpenses = signal<number>(0);
  netBalance = signal<number>(0);
  loaded = signal<boolean>(false);
  recent = signal<Transaction[]>([]);
  // Nothing to show for this month -> friendly empty state instead of zeros
  isEmpty = computed(() => this.loaded() && this.totalIncome() === 0 && this.totalExpenses() === 0);

  // --- CHART CONFIGURATION ---
  pieChartType = signal<ChartType>('pie');

  pieChartData = signal<ChartData<'pie', number[], string | string[]>>({
    labels: [],
    datasets: [{ data: [], backgroundColor: CHART_COLORS }]
  });

  // computed(): rebuilt whenever the theme or currency changes
  pieChartOptions = computed<ChartConfiguration['options']>(() => {
    const text = this.theme.isDark() ? '#e2e8f0' : '#1e293b';
    const money = new Intl.NumberFormat('en', { style: 'currency', currency: this.currency.code() });
    return {
      responsive: true,
      maintainAspectRatio: false,
      borderColor: this.theme.isDark() ? '#1e2327' : '#ffffff',
      plugins: {
        legend: { position: 'right', labels: { color: text } },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${money.format(Number(ctx.raw))}` } }
      }
    };
  });

  private summarySub?: Subscription;

  ngOnInit(): void {
    this.username.set(this.authService.getCurrentUsername());
    this.loadDashboardData();
    this.loadRecent();
  }

  ngOnDestroy(): void {
    this.summarySub?.unsubscribe();
  }

  // --- Month navigation ---
  previousMonth(): void { this.shiftMonth(-1); }

  nextMonth(): void {
    if (!this.isCurrentMonth()) this.shiftMonth(1);
  }

  goToThisMonth(): void {
    this.month.set(this.dashboardService.currentMonth());
    this.loadDashboardData();
  }

  private shiftMonth(delta: number): void {
    const [y, m] = this.month().split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    this.month.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    this.loadDashboardData();
  }

  // --- Data loading ---
  private loadDashboardData(): void {
    // Cancel any in-flight request so a slow old response can't overwrite a newer month
    this.summarySub?.unsubscribe();
    this.summarySub = this.dashboardService.getSummary(this.month()).subscribe({
      next: (summary) => {
        this.totalIncome.set(summary.totalIncome);
        this.totalExpenses.set(summary.totalExpenses);
        this.netBalance.set(summary.netBalance);

        this.pieChartData.set({
          labels: summary.expenseBreakdown.map(item => item.category),
          datasets: [{
            data: summary.expenseBreakdown.map(item => item.amount),
            backgroundColor: CHART_COLORS
          }]
        });
        this.loaded.set(true);
      },
      error: (err) => {
        console.error('Failed to load dashboard data', err);
      }
    });
  }

  private loadRecent(): void {
    // The backend returns newest first, so page 0 with 5 rows is "recent"
    this.transactionService.getTransactions(0, 5).subscribe({
      next: (page) => this.recent.set(page.content),
      error: (err) => console.error('Failed to load recent transactions', err)
    });
  }

  // Empty-state button: same dialog as the Transactions page
  openAddDialog(): void {
    this.dialog.open(TransactionDialogComponent, { width: '500px' })
      .afterClosed().subscribe((result: TransactionRequest | undefined) => {
        if (!result) return;
        this.transactionService.createTransaction(result).subscribe({
          next: () => {
            // Jump to the month of the new transaction so the user sees it
            this.month.set(result.txnDate.slice(0, 7));
            this.loadDashboardData();
            this.loadRecent();
          },
          error: (err) => console.error('Failed to save transaction', err)
        });
      });
  }
}
