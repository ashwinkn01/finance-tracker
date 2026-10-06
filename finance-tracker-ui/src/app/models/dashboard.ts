// Maps to the Java DTO representing individual category slices
export interface CategoryExpense {
  category: string;
  amount: number;
}

// The dashboard payload for ONE month (mapped from the backend's DashboardSummaryDto)
export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  expenseBreakdown: CategoryExpense[];
}
