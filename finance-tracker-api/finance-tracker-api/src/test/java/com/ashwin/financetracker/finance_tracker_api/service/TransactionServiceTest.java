package com.ashwin.financetracker.finance_tracker_api.service;

import com.ashwin.financetracker.finance_tracker_api.dto.TransactionDto;
import com.ashwin.financetracker.finance_tracker_api.dto.TransactionResponseDto;
import com.ashwin.financetracker.finance_tracker_api.entity.*;
import com.ashwin.financetracker.finance_tracker_api.repository.CategoryRepository;
import com.ashwin.financetracker.finance_tracker_api.repository.TransactionRepository;
import com.ashwin.financetracker.finance_tracker_api.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock TransactionRepository transactionRepository;
    @Mock CategoryRepository categoryRepository;
    @Mock UserRepository userRepository;

    TransactionService service;
    User me;
    User other;

    @BeforeEach
    void setUp() {
        service = new TransactionService(transactionRepository, categoryRepository, userRepository);
        me = user(1L, "me");
        other = user(2L, "other");
        // Pretend "me" is the logged-in user, like the JWT filter would
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("me", null, java.util.List.of()));
        when(userRepository.findByUsername("me")).thenReturn(Optional.of(me));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createSavesTransactionForLoggedInUserAndReturnsSafeDto() {
        Category food = category(10L, "Food", me);
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(food));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(i -> i.getArgument(0));

        TransactionResponseDto result = service.createTransaction(dto(10L));

        assertThat(result.getCategoryName()).isEqualTo("Food");
        assertThat(result.getAmount()).isEqualByComparingTo("12.50");
    }

    @Test
    void createRejectsAnotherUsersCategory() {
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category(10L, "Theirs", other)));

        assertThatThrownBy(() -> service.createTransaction(dto(10L)))
                .hasMessageContaining("belongs to another user");
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void updateChangesFieldsOfOwnTransaction() {
        Transaction existing = transaction(5L, me, category(10L, "Food", me));
        Category rent = category(11L, "Rent", me);
        when(transactionRepository.findById(5L)).thenReturn(Optional.of(existing));
        when(categoryRepository.findById(11L)).thenReturn(Optional.of(rent));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(i -> i.getArgument(0));

        TransactionDto edit = dto(11L);
        edit.setAmount(new BigDecimal("99.00"));
        edit.setNote("edited");
        TransactionResponseDto result = service.updateTransaction(5L, edit);

        assertThat(result.getCategoryName()).isEqualTo("Rent");
        assertThat(result.getAmount()).isEqualByComparingTo("99.00");
        assertThat(result.getNote()).isEqualTo("edited");
    }

    @Test
    void updateRejectsSomeoneElsesTransaction() {
        when(transactionRepository.findById(5L))
                .thenReturn(Optional.of(transaction(5L, other, category(10L, "Food", other))));

        assertThatThrownBy(() -> service.updateTransaction(5L, dto(10L)))
                .hasMessageContaining("Unauthorized");
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void updateRejectsMovingTransactionToAnotherUsersCategory() {
        when(transactionRepository.findById(5L))
                .thenReturn(Optional.of(transaction(5L, me, category(10L, "Food", me))));
        when(categoryRepository.findById(99L)).thenReturn(Optional.of(category(99L, "Theirs", other)));

        assertThatThrownBy(() -> service.updateTransaction(5L, dto(99L)))
                .hasMessageContaining("belongs to another user");
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void deleteRemovesOwnTransaction() {
        Transaction t = transaction(5L, me, category(10L, "Food", me));
        when(transactionRepository.findById(5L)).thenReturn(Optional.of(t));

        service.deleteTransaction(5L);

        verify(transactionRepository).delete(t);
    }

    @Test
    void deleteRejectsSomeoneElsesTransaction() {
        when(transactionRepository.findById(5L))
                .thenReturn(Optional.of(transaction(5L, other, category(10L, "Food", other))));

        assertThatThrownBy(() -> service.deleteTransaction(5L)).hasMessageContaining("Unauthorized");
        verify(transactionRepository, never()).delete(any());
    }

    // ---- helpers ----
    static User user(Long id, String name) {
        User u = new User();
        u.setId(id);
        u.setUsername(name);
        u.setPassword("$2a$10$secret-hash");
        return u;
    }

    static Category category(Long id, String name, User owner) {
        Category c = new Category();
        c.setId(id);
        c.setName(name);
        c.setType(CategoryType.EXPENSE);
        c.setUser(owner);
        return c;
    }

    static Transaction transaction(Long id, User owner, Category category) {
        Transaction t = new Transaction();
        t.setId(id);
        t.setUser(owner);
        t.setCategory(category);
        t.setAmount(new BigDecimal("12.50"));
        t.setType(TransactionType.EXPENSE);
        t.setTxnDate(LocalDate.of(2026, 10, 6));
        t.setTxnTime(LocalTime.NOON);
        return t;
    }

    static TransactionDto dto(Long categoryId) {
        TransactionDto d = new TransactionDto();
        d.setAmount(new BigDecimal("12.50"));
        d.setType(TransactionType.EXPENSE);
        d.setTxnDate(LocalDate.of(2026, 10, 6));
        d.setTxnTime(LocalTime.NOON);
        d.setCategoryId(categoryId);
        return d;
    }
}
