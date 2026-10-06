import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TransactionService } from './transaction';
import { TransactionRequest } from '../models/transaction';

describe('TransactionService', () => {
  let service: TransactionService;
  let http: HttpTestingController;
  const base = 'http://localhost:8080/api/transactions';
  const payload: TransactionRequest = {
    amount: 10, type: 'EXPENSE', txnDate: '2026-10-06', txnTime: '12:00:00', categoryId: 1
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(TransactionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests one page with page and size params', () => {
    service.getTransactions(2, 25).subscribe();
    const req = http.expectOne(r => r.url === base);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('25');
    req.flush({ content: [], totalElements: 0, number: 2, size: 25 });
  });

  it('POSTs a new transaction', () => {
    service.createTransaction(payload).subscribe();
    const req = http.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('PUTs an update to /transactions/:id', () => {
    service.updateTransaction(7, payload).subscribe();
    const req = http.expectOne(`${base}/7`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('DELETEs /transactions/:id', () => {
    service.deleteTransaction(7).subscribe();
    const req = http.expectOne(`${base}/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush('Transaction deleted successfully');
  });
});
