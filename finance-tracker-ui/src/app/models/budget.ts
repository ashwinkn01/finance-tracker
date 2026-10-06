// What the backend SENDS (BudgetResponseDto.java): a budget plus how much has been spent so far
export interface Budget {
  id: number;
  categoryId: number;
  categoryName: string;
  monthYear: string;      // "2026-10"
  limitAmount: number;
  spent: number;
  percentUsed: number;    // can exceed 100
  overBudget: boolean;
}

// What the backend EXPECTS when setting a budget (BudgetDto.java)
export interface BudgetRequest {
  categoryId: number;
  limitAmount: number;
  monthYear: string;
}
