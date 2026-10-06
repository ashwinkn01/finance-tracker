import { TransactionType } from './transaction';

// Maps to CategoryResponseDto.java
export interface Category {
  id: number;
  name: string;
  type: TransactionType; // categories are either INCOME or EXPENSE
}
