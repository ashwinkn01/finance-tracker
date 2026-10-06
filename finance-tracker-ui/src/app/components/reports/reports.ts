import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';

import { DashboardService } from '../../services/dashboard';
import { ReportFormat, ReportService } from '../../services/report';
import { CurrencyService } from '../../services/currency';
import { DashboardSummary } from '../../models/dashboard';
import { currentMonth, monthLabel, shiftMonth } from '../../utils/month';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss'
})
export class ReportsComponent implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private reportService = inject(ReportService);
  currency = inject(CurrencyService);

  month = signal<string>(currentMonth());
  monthLabel = computed(() => monthLabel(this.month()));
  isCurrentMonth = computed(() => this.month() >= currentMonth());

  summary = signal<DashboardSummary | null>(null);
  loading = signal<boolean>(true);
  loadError = signal<string>('');

  // Which format is being downloaded right now (disables the buttons and shows a spinner)
  downloading = signal<ReportFormat | null>(null);
  downloadError = signal<string>('');

  // Nothing to report for this month
  isEmpty = computed(() => {
    const s = this.summary();
    return !!s && s.totalIncome === 0 && s.totalExpenses === 0;
  });

  // Category rows with each one's share of total spending
  categories = computed(() => {
    const s = this.summary();
    if (!s) return [];
    return s.expenseBreakdown.map(c => ({
      name: c.category,
      amount: c.amount,
      share: s.totalExpenses > 0 ? (c.amount / s.totalExpenses) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);
  });

  private sub?: Subscription;

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  previousMonth(): void {
    this.month.set(shiftMonth(this.month(), -1));
    this.load();
  }

  nextMonth(): void {
    if (this.isCurrentMonth()) return;
    this.month.set(shiftMonth(this.month(), 1));
    this.load();
  }

  goToThisMonth(): void {
    this.month.set(currentMonth());
    this.load();
  }

  private load(): void {
    this.sub?.unsubscribe(); // a slow old response must not overwrite a newer month
    this.loading.set(true);
    this.loadError.set('');
    this.downloadError.set('');
    this.sub = this.dashboardService.getSummary(this.month()).subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: () => {
        this.summary.set(null);
        this.loading.set(false);
        this.loadError.set('Could not load this month. Please try again.');
      }
    });
  }

  download(format: ReportFormat): void {
    if (this.downloading()) return;
    this.downloading.set(format);
    this.downloadError.set('');
    this.reportService.download(this.month(), format, this.currency.code()).subscribe({
      next: () => this.downloading.set(null),
      error: () => {
        this.downloading.set(null);
        this.downloadError.set(`Could not generate the ${format.toUpperCase()} report. Please try again.`);
      }
    });
  }
}
