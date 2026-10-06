export type TransactionType = 'INCOME' | 'EXPENSE';

// What the backend SENDS us (TransactionResponseDto.java)
export interface Transaction {
  id: number;
  amount: number;
  type: TransactionType;
  txnDate: string;       // "2026-10-06"
  txnTime: string;       // "12:00:00"
  note: string | null;
  categoryId: number;
  categoryName: string;
}

// What the backend EXPECTS when creating one (TransactionDto.java)
export interface TransactionRequest {
  amount: number;
  type: TransactionType;
  txnDate: string;
  txnTime: string;
  note?: string;
  categoryId: number;
}

// Spring's Page<T> wrapper - we only declare the fields we use
export interface Page<T> {
  content: T[];
  totalElements: number;
  number: number;   // current page index (0-based)
  size: number;
}
