package com.ashwin.financetracker.finance_tracker_api.dto;

import com.ashwin.financetracker.finance_tracker_api.entity.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

// Guards against the earlier bug where the whole entity (incl. the user's password hash) was serialized.
class ResponseDtoTest {

    private User owner() {
        User u = new User();
        u.setId(1L);
        u.setUsername("me");
        u.setEmail("me@x.com");
        u.setPassword("$2a$10$SUPER-SECRET-HASH");
        return u;
    }

    @Test
    void transactionJsonNeverContainsUserOrPassword() {
        Category c = new Category();
        c.setId(2L); c.setName("Food"); c.setType(CategoryType.EXPENSE); c.setUser(owner());
        Transaction t = new Transaction();
        t.setId(3L); t.setUser(owner()); t.setCategory(c);
        t.setAmount(new BigDecimal("12.50")); t.setType(TransactionType.EXPENSE);
        t.setTxnDate(LocalDate.of(2026, 10, 6)); t.setTxnTime(LocalTime.NOON); t.setNote("Lunch");

        String json = JsonMapper.builder().build().writeValueAsString(TransactionResponseDto.from(t));

        assertThat(json).contains("\"categoryName\":\"Food\"").contains("\"note\":\"Lunch\"");
        assertThat(json).doesNotContain("password").doesNotContain("SECRET").doesNotContain("me@x.com")
                .doesNotContain("\"user\"");
    }

    @Test
    void categoryJsonNeverContainsUserOrPassword() {
        Category c = new Category();
        c.setId(2L); c.setName("Food"); c.setType(CategoryType.EXPENSE); c.setUser(owner());

        String json = JsonMapper.builder().build().writeValueAsString(CategoryResponseDto.from(c));

        assertThat(json).contains("\"name\":\"Food\"").contains("\"type\":\"EXPENSE\"");
        assertThat(json).doesNotContain("password").doesNotContain("SECRET").doesNotContain("\"user\"");
    }
}
