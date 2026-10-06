package com.ashwin.financetracker.finance_tracker_api.dto;

import com.ashwin.financetracker.finance_tracker_api.entity.Category;
import com.ashwin.financetracker.finance_tracker_api.entity.CategoryType;
import lombok.AllArgsConstructor;
import lombok.Getter;

// Safe to send to the client: no User field, so no password hash.
@Getter
@AllArgsConstructor
public class CategoryResponseDto {
    private Long id;
    private String name;
    private CategoryType type;

    public static CategoryResponseDto from(Category c) {
        return new CategoryResponseDto(c.getId(), c.getName(), c.getType());
    }
}
