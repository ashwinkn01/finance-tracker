export interface Transaction {
  id?: number; // Optional because we don't have an ID when creating a new one
  amount: number;
  date: string;
  description: string;
  category: string;
  type: 'INCOME' | 'EXPENSE'; // Enforces strict string matching
}