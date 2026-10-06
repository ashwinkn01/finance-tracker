package com.ashwin.financetracker.finance_tracker_api.service;

import com.ashwin.financetracker.finance_tracker_api.dto.BudgetDto;
import com.ashwin.financetracker.finance_tracker_api.dto.BudgetResponseDto;
import com.ashwin.financetracker.finance_tracker_api.entity.Budget;
import com.ashwin.financetracker.finance_tracker_api.entity.Category;
import com.ashwin.financetracker.finance_tracker_api.entity.CategoryType;
import com.ashwin.financetracker.finance_tracker_api.entity.Transaction;
import com.ashwin.financetracker.finance_tracker_api.entity.TransactionType;
import com.ashwin.financetracker.finance_tracker_api.entity.User;
import com.ashwin.financetracker.finance_tracker_api.repository.BudgetRepository;
import com.ashwin.financetracker.finance_tracker_api.repository.CategoryRepository;
import com.ashwin.financetracker.finance_tracker_api.repository.TransactionRepository;
import com.ashwin.financetracker.finance_tracker_api.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;

    public BudgetService(BudgetRepository budgetRepository, CategoryRepository categoryRepository,
                         UserRepository userRepository, TransactionRepository transactionRepository) {
        this.budgetRepository = budgetRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
    }

    private User getAuthenticatedUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private YearMonth parseMonth(String monthYear) {
        try {
            return YearMonth.parse(monthYear);
        } catch (DateTimeParseException | NullPointerException e) {
            throw new IllegalArgumentException("Month must be in YYYY-MM format");
        }
    }

    // Set or Update a Budget
    public BudgetResponseDto createOrUpdateBudget(BudgetDto budgetDto) {
        User user = getAuthenticatedUser();
        String month = parseMonth(budgetDto.getMonthYear()).toString();

        if (budgetDto.getLimitAmount() == null || budgetDto.getLimitAmount().signum() <= 0) {
            throw new IllegalArgumentException("Budget limit must be greater than zero");
        }

        // 1. Fetch the category
        Category category = categoryRepository.findById(budgetDto.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found"));

        // 2. CRITICAL SECURITY CHECK: Does this category actually belong to this user?
        if (!category.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized: Category belongs to another user");
        }

        // Budgets only make sense for money going out
        if (category.getType() != CategoryType.EXPENSE) {
            throw new IllegalArgumentException("Budgets can only be set for expense categories");
        }

        // 3. Upsert Logic: Find existing budget for this month, or create a new one
        Budget budget = budgetRepository.findByUserIdAndCategoryIdAndMonthYear(
                user.getId(), category.getId(), month
        ).orElse(new Budget());

        // 4. Set values and save
        budget.setUser(user);
        budget.setCategory(category);
        budget.setLimitAmount(budgetDto.getLimitAmount());
        budget.setMonthYear(month);

        Budget saved = budgetRepository.save(budget);
        return BudgetResponseDto.from(saved, spentByCategory(user, month).getOrDefault(category.getId(), BigDecimal.ZERO));
    }

    // Budgets for ONE month, each with how much has been spent so far
    public List<BudgetResponseDto> getBudgetsForMonth(String monthYear) {
        User user = getAuthenticatedUser();
        String month = parseMonth(monthYear).toString();
        Map<Long, BigDecimal> spent = spentByCategory(user, month);

        return budgetRepository.findByUserIdAndMonthYear(user.getId(), month).stream()
                .map(b -> BudgetResponseDto.from(b, spent.getOrDefault(b.getCategory().getId(), BigDecimal.ZERO)))
                .toList();
    }

    public void deleteBudget(Long id) {
        User user = getAuthenticatedUser();
        Budget budget = budgetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Budget not found"));
        if (!budget.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized to delete this budget");
        }
        budgetRepository.delete(budget);
    }

    // Copy every budget from one month into another. Categories that already have a
    // budget in the target month are left alone, so nothing is overwritten.
    public List<BudgetResponseDto> copyBudgets(String fromMonth, String toMonth) {
        User user = getAuthenticatedUser();
        String from = parseMonth(fromMonth).toString();
        String to = parseMonth(toMonth).toString();
        if (from.equals(to)) {
            throw new IllegalArgumentException("Choose two different months");
        }

        List<Long> alreadyThere = budgetRepository.findByUserIdAndMonthYear(user.getId(), to).stream()
                .map(b -> b.getCategory().getId()).toList();

        List<Budget> copies = new ArrayList<>();
        for (Budget source : budgetRepository.findByUserIdAndMonthYear(user.getId(), from)) {
            if (alreadyThere.contains(source.getCategory().getId())) continue;
            Budget copy = new Budget();
            copy.setUser(user);
            copy.setCategory(source.getCategory());
            copy.setLimitAmount(source.getLimitAmount());
            copy.setMonthYear(to);
            copies.add(copy);
        }
        budgetRepository.saveAll(copies);

        return getBudgetsForMonth(to);
    }

    // Total EXPENSE amount per category id for a month
    private Map<Long, BigDecimal> spentByCategory(User user, String month) {
        YearMonth ym = YearMonth.parse(month);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();

        Map<Long, BigDecimal> totals = new HashMap<>();
        for (Transaction t : transactionRepository.findByUserIdAndTxnDateBetween(user.getId(), start, end)) {
            if (t.getType() == TransactionType.EXPENSE) {
                totals.merge(t.getCategory().getId(), t.getAmount(), BigDecimal::add);
            }
        }
        return totals;
    }
}
