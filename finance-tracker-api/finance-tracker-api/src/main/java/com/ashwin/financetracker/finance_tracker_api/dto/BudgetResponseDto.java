package com.ashwin.financetracker.finance_tracker_api.dto;

import com.ashwin.financetracker.finance_tracker_api.entity.Budget;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.math.RoundingMode;

// What we send to the client for a budget. No User field, so nothing sensitive can leak.
// `spent` and `percentUsed` are worked out for the budget's month.
@Getter
@Builder
public class BudgetResponseDto {
    private Long id;
    private Long categoryId;
    private String categoryName;
    private String monthYear;
    private BigDecimal limitAmount;
    private BigDecimal spent;
    private double percentUsed;
    private boolean overBudget;

    public static BudgetResponseDto from(Budget b, BigDecimal spent) {
        double percent = b.getLimitAmount().signum() > 0
                ? spent.multiply(BigDecimal.valueOf(100))
                        .divide(b.getLimitAmount(), 1, RoundingMode.HALF_UP).doubleValue()
                : 0.0;
        return BudgetResponseDto.builder()
                .id(b.getId())
                .categoryId(b.getCategory().getId())
                .categoryName(b.getCategory().getName())
                .monthYear(b.getMonthYear())
                .limitAmount(b.getLimitAmount())
                .spent(spent)
                .percentUsed(percent)
                .overBudget(spent.compareTo(b.getLimitAmount()) > 0)
                .build();
    }
}
