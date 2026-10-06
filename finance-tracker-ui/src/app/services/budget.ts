import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Budget, BudgetRequest } from '../models/budget';

@Injectable({
  providedIn: 'root'
})
export class BudgetService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/budgets`;

  getBudgets(month: string): Observable<Budget[]> {
    return this.http.get<Budget[]>(this.apiUrl, { params: new HttpParams().set('month', month) });
  }

  // Creates the budget, or updates its limit if the category already has one that month
  saveBudget(request: BudgetRequest): Observable<Budget> {
    return this.http.post<Budget>(this.apiUrl, request);
  }

  deleteBudget(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  // Copies every budget from one month into another (existing ones are never overwritten)
  copyBudgets(from: string, to: string): Observable<Budget[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.post<Budget[]>(`${this.apiUrl}/copy`, null, { params });
  }
}
