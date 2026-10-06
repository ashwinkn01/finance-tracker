package com.ashwin.financetracker.finance_tracker_api.dto;

import com.ashwin.financetracker.finance_tracker_api.entity.Transaction;
import com.ashwin.financetracker.finance_tracker_api.entity.TransactionType;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

// What we send TO the client. Deliberately has no User field, so nothing
// sensitive (like the password hash) can leak through the JSON.
@Getter
@Builder
public class TransactionResponseDto {
    private Long id;
    private BigDecimal amount;
    private TransactionType type;
    private LocalDate txnDate;
    private LocalTime txnTime;
    private String note;
    private Long categoryId;
    private String categoryName;

    public static TransactionResponseDto from(Transaction t) {
        return TransactionResponseDto.builder()
                .id(t.getId())
                .amount(t.getAmount())
                .type(t.getType())
                .txnDate(t.getTxnDate())
                .txnTime(t.getTxnTime())
                .note(t.getNote())
                .categoryId(t.getCategory().getId())
                .categoryName(t.getCategory().getName())
                .build();
    }
}
