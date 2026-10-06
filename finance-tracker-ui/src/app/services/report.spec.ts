import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportService } from './report';

describe('ReportService', () => {
  let service: ReportService;
  let http: HttpTestingController;
  let clicked: { download: string } | null;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ReportService);
    http = TestBed.inject(HttpTestingController);

    // jsdom can't really download a file: capture what the "click" would have saved instead
    clicked = null;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:fake');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked = { download: this.download };
    });
  });

  afterEach(() => http.verify());

  it('requests the file as a blob with month, format and currency', () => {
    service.download('2026-10', 'pdf', 'INR').subscribe();
    const req = http.expectOne(r => r.url === 'http://localhost:8080/api/reports/export');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.params.get('month')).toBe('2026-10');
    expect(req.request.params.get('format')).toBe('pdf');
    expect(req.request.params.get('currency')).toBe('INR');
    req.flush(new Blob(['%PDF-'], { type: 'application/pdf' }));
  });

  it('saves the response under a sensible filename', () => {
    service.download('2026-10', 'csv', 'USD').subscribe();
    http.expectOne(r => r.url.endsWith('/reports/export')).flush(new Blob(['a,b'], { type: 'text/csv' }));

    expect(clicked?.download).toBe('transaction-report-2026-10.csv');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });

  it('does not save anything when the request fails', () => {
    let failed = false;
    service.download('2026-10', 'csv', 'USD').subscribe({ error: () => (failed = true) });
    http.expectOne(r => r.url.endsWith('/reports/export'))
      .flush(new Blob(['{}']), { status: 400, statusText: 'Bad Request' });

    expect(failed).toBe(true);
    expect(clicked).toBeNull();
  });
});
