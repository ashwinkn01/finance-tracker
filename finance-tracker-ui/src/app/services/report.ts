import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export type ReportFormat = 'csv' | 'pdf';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reports`;

  // Asks the backend for the file as a Blob (raw bytes), then hands it to the browser as a download.
  // We can't just link to the URL: a plain link wouldn't send the Authorization header.
  download(month: string, format: ReportFormat, currency: string): Observable<Blob> {
    const params = new HttpParams().set('month', month).set('format', format).set('currency', currency);
    return this.http.get(`${this.apiUrl}/export`, { params, responseType: 'blob' }).pipe(
      tap(blob => this.save(blob, `transaction-report-${month}.${format}`))
    );
  }

  // Creates a temporary link to the in-memory file and clicks it
  private save(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
