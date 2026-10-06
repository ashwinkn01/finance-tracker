import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { DashboardSummary } from '../models/dashboard';

// Shape of what Spring Boot's DashboardSummaryDto actually sends
interface DashboardSummaryResponse {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  categoryBreakdown: { categoryName: string; totalSpent: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  // inject() is the modern alternative to constructor injection
  private http = inject(HttpClient);

  // This environment variable should point to your Spring Boot URL (e.g., http://localhost:8080/api)
  private apiUrl = `${environment.apiUrl}/dashboard`;

  // The backend requires ?month=YYYY-MM, so default to the current month.
  getSummary(month: string = this.currentMonth()): Observable<DashboardSummary> {
    const params = new HttpParams().set('month', month);
    return this.http.get<DashboardSummaryResponse>(`${this.apiUrl}/summary`, { params }).pipe(
      // map() reshapes the backend DTO into the model the UI uses
      map(res => ({
        totalBalance: res.netBalance,
        monthlyExpenses: res.totalExpenses,
        expenseBreakdown: res.categoryBreakdown.map(c => ({
          category: c.categoryName,
          amount: c.totalSpent
        }))
      }))
    );
  }

  private currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
