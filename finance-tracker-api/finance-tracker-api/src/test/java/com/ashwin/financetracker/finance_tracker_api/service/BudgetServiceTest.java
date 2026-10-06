package com.ashwin.financetracker.finance_tracker_api.service;

import com.ashwin.financetracker.finance_tracker_api.dto.BudgetDto;
import com.ashwin.financetracker.finance_tracker_api.dto.BudgetResponseDto;
import com.ashwin.financetracker.finance_tracker_api.entity.*;
import com.ashwin.financetracker.finance_tracker_api.repository.BudgetRepository;
import com.ashwin.financetracker.finance_tracker_api.repository.CategoryRepository;
import com.ashwin.financetracker.finance_tracker_api.repository.TransactionRepository;
import com.ashwin.financetracker.finance_tracker_api.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BudgetServiceTest {

    @Mock BudgetRepository budgetRepository;
    @Mock CategoryRepository categoryRepository;
    @Mock UserRepository userRepository;
    @Mock TransactionRepository transactionRepository;

    BudgetService service;
    User me;
    User other;
    Category food;

    @BeforeEach
    void setUp() {
        service = new BudgetService(budgetRepository, categoryRepository, userRepository, transactionRepository);
        me = TransactionServiceTest.user(1L, "me");
        other = TransactionServiceTest.user(2L, "other");
        food = TransactionServiceTest.category(10L, "Food", me);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("me", null, List.of()));
        // lenient: not every test (e.g. the pure JSON one) needs the logged-in user
        lenient().when(userRepository.findByUsername("me")).thenReturn(Optional.of(me));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private BudgetDto dto(Long categoryId, String limit, String month) {
        BudgetDto d = new BudgetDto();
        d.setCategoryId(categoryId);
        d.setLimitAmount(limit == null ? null : new BigDecimal(limit));
        d.setMonthYear(month);
        return d;
    }

    private Budget budget(Long id, Category c, User owner, String limit, String month) {
        Budget b = new Budget();
        b.setId(id);
        b.setCategory(c);
        b.setUser(owner);
        b.setLimitAmount(new BigDecimal(limit));
        b.setMonthYear(month);
        return b;
    }

    private Transaction spend(Category c, String amount, TransactionType type) {
        Transaction t = TransactionServiceTest.transaction(1L, me, c);
        t.setAmount(new BigDecimal(amount));
        t.setType(type);
        return t;
    }

    @Test
    void createsNewBudgetAndReportsSpentSoFar() {
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(food));
        when(budgetRepository.findByUserIdAndCategoryIdAndMonthYear(1L, 10L, "2026-10")).thenReturn(Optional.empty());
        when(budgetRepository.save(any(Budget.class))).thenAnswer(i -> i.getArgument(0));
        when(transactionRepository.findByUserIdAndTxnDateBetween(1L, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31)))
                .thenReturn(List.of(spend(food, "30.00", TransactionType.EXPENSE)));

        BudgetResponseDto result = service.createOrUpdateBudget(dto(10L, "100", "2026-10"));

        assertThat(result.getCategoryName()).isEqualTo("Food");
        assertThat(result.getSpent()).isEqualByComparingTo("30");
        assertThat(result.getPercentUsed()).isEqualTo(30.0);
        assertThat(result.isOverBudget()).isFalse();
    }

    @Test
    void updatesExistingBudgetInsteadOfDuplicating() {
        Budget existing = budget(5L, food, me, "50", "2026-10");
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(food));
        when(budgetRepository.findByUserIdAndCategoryIdAndMonthYear(1L, 10L, "2026-10")).thenReturn(Optional.of(existing));
        when(budgetRepository.save(any(Budget.class))).thenAnswer(i -> i.getArgument(0));
        when(transactionRepository.findByUserIdAndTxnDateBetween(any(), any(), any())).thenReturn(List.of());

        BudgetResponseDto result = service.createOrUpdateBudget(dto(10L, "200", "2026-10"));

        assertThat(result.getId()).isEqualTo(5L);
        assertThat(result.getLimitAmount()).isEqualByComparingTo("200");
    }

    @Test
    void rejectsInvalidInput() {
        assertThatThrownBy(() -> service.createOrUpdateBudget(dto(10L, "100", "October")))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("YYYY-MM");
        assertThatThrownBy(() -> service.createOrUpdateBudget(dto(10L, "0", "2026-10")))
                .hasMessageContaining("greater than zero");
        assertThatThrownBy(() -> service.createOrUpdateBudget(dto(10L, null, "2026-10")))
                .hasMessageContaining("greater than zero");
        verify(budgetRepository, never()).save(any());
    }

    @Test
    void rejectsAnotherUsersCategoryAndIncomeCategories() {
        when(categoryRepository.findById(99L)).thenReturn(Optional.of(TransactionServiceTest.category(99L, "Theirs", other)));
        assertThatThrownBy(() -> service.createOrUpdateBudget(dto(99L, "100", "2026-10")))
                .hasMessageContaining("belongs to another user");

        Category salary = TransactionServiceTest.category(11L, "Salary", me);
        salary.setType(CategoryType.INCOME);
        when(categoryRepository.findById(11L)).thenReturn(Optional.of(salary));
        assertThatThrownBy(() -> service.createOrUpdateBudget(dto(11L, "100", "2026-10")))
                .hasMessageContaining("expense categories");
        verify(budgetRepository, never()).save(any());
    }

    @Test
    void monthListingFlagsOverBudgetAndIgnoresIncome() {
        when(budgetRepository.findByUserIdAndMonthYear(1L, "2026-10"))
                .thenReturn(List.of(budget(5L, food, me, "100", "2026-10")));
        when(transactionRepository.findByUserIdAndTxnDateBetween(any(), any(), any())).thenReturn(List.of(
                spend(food, "80.00", TransactionType.EXPENSE),
                spend(food, "45.50", TransactionType.EXPENSE),
                spend(food, "500.00", TransactionType.INCOME)));

        BudgetResponseDto result = service.getBudgetsForMonth("2026-10").get(0);

        assertThat(result.getSpent()).isEqualByComparingTo("125.50");
        assertThat(result.getPercentUsed()).isEqualTo(125.5);
        assertThat(result.isOverBudget()).isTrue();
    }

    @Test
    void deleteRemovesOwnBudgetButNotOthers() {
        Budget mine = budget(5L, food, me, "100", "2026-10");
        when(budgetRepository.findById(5L)).thenReturn(Optional.of(mine));
        service.deleteBudget(5L);
        verify(budgetRepository).delete(mine);

        Budget theirs = budget(6L, food, other, "100", "2026-10");
        when(budgetRepository.findById(6L)).thenReturn(Optional.of(theirs));
        assertThatThrownBy(() -> service.deleteBudget(6L)).hasMessageContaining("Unauthorized");
        verify(budgetRepository, never()).delete(theirs);
    }

    @Test
    @SuppressWarnings("unchecked")
    void copyCreatesMissingBudgetsOnlyAndNeverOverwrites() {
        Category rent = TransactionServiceTest.category(11L, "Rent", me);
        when(budgetRepository.findByUserIdAndMonthYear(1L, "2026-10"))
                .thenReturn(List.of(budget(7L, rent, me, "999", "2026-10"))); // Rent already budgeted this month
        when(budgetRepository.findByUserIdAndMonthYear(1L, "2026-09")).thenReturn(List.of(
                budget(1L, food, me, "100", "2026-09"),
                budget(2L, rent, me, "500", "2026-09")));
        when(transactionRepository.findByUserIdAndTxnDateBetween(any(), any(), any())).thenReturn(List.of());

        service.copyBudgets("2026-09", "2026-10");

        ArgumentCaptor<List<Budget>> saved = ArgumentCaptor.forClass(List.class);
        verify(budgetRepository).saveAll(saved.capture());
        assertThat(saved.getValue()).hasSize(1);
        assertThat(saved.getValue().get(0).getCategory().getName()).isEqualTo("Food");
        assertThat(saved.getValue().get(0).getMonthYear()).isEqualTo("2026-10");
        assertThat(saved.getValue().get(0).getLimitAmount()).isEqualByComparingTo("100");
    }

    @Test
    void copyRejectsSameMonth() {
        assertThatThrownBy(() -> service.copyBudgets("2026-10", "2026-10")).hasMessageContaining("different months");
        verify(budgetRepository, never()).saveAll(anyList());
    }

    @Test
    void responseJsonNeverContainsUserOrPassword() {
        String json = JsonMapper.builder().build()
                .writeValueAsString(BudgetResponseDto.from(budget(5L, food, me, "100", "2026-10"), BigDecimal.TEN));
        assertThat(json).contains("\"categoryName\":\"Food\"")
                .doesNotContain("password").doesNotContain("secret").doesNotContain("\"user\"");
    }
}
