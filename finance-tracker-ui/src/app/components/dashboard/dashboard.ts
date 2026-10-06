import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

import { AuthService } from '../../services/auth.service';
// Make sure this path matches exactly what the CLI generated
import { DashboardService } from '../../services/dashboard'; 
import { CurrencyService } from '../../services/currency';
import { ThemeService } from '../../services/theme';

// Slice colours: teal first, then distinct hues that stay readable on dark and light backgrounds
const CHART_COLORS = ['#2dd4bf', '#38bdf8', '#a78bfa', '#fbbf24', '#fb7185', '#34d399', '#f97316', '#94a3b8'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  currency = inject(CurrencyService);
  private theme = inject(ThemeService);
  
  username = signal<string | null>('');

  // --- NEW: Signals for the top stat cards ---
  totalBalance = signal<number>(0);
  monthlyExpenses = signal<number>(0);

  // --- CHART CONFIGURATION ---
  pieChartType = signal<ChartType>('pie');
  
  // CHANGED: Starts empty now, waiting for real data
  pieChartData = signal<ChartData<'pie', number[], string | string[]>>({
    labels: [],
    datasets: [{ 
      data: [], 
      backgroundColor: CHART_COLORS
    }]
  });

  // computed(): rebuilt whenever the theme flips, so legend text stays readable
  pieChartOptions = computed<ChartConfiguration['options']>(() => {
    const text = this.theme.isDark() ? '#e2e8f0' : '#1e293b';
    return {
      responsive: true,
      maintainAspectRatio: false,
      borderColor: this.theme.isDark() ? '#1e2327' : '#ffffff',
      plugins: {
        legend: { position: 'right', labels: { color: text } }
      }
    };
  });

  ngOnInit(): void {
    this.username.set(this.authService.getCurrentUsername());
    
    // CHANGED: Trigger the backend fetch when the page loads
    this.loadDashboardData();
  }

  // --- NEW: The method that actually fetches from Spring Boot ---
  private loadDashboardData(): void {
    this.dashboardService.getSummary().subscribe({
      next: (summary) => {
        // Update the number cards
        this.totalBalance.set(summary.totalBalance);
        this.monthlyExpenses.set(summary.monthlyExpenses);

        // Separate the Spring Boot categories and amounts into two arrays for Chart.js
        const chartLabels = summary.expenseBreakdown.map(item => item.category);
        const chartAmounts = summary.expenseBreakdown.map(item => item.amount);

        // Update the pie chart
        this.pieChartData.set({
          labels: chartLabels,
          datasets: [{
            data: chartAmounts,
            backgroundColor: CHART_COLORS
          }]
        });
      },
      error: (err) => {
        console.error('Failed to load dashboard data', err);
      }
    });
  }
}