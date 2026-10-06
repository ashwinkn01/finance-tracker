package com.ashwin.financetracker.finance_tracker_api.dto;

import com.ashwin.financetracker.finance_tracker_api.entity.CategoryType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CategoryDto {
    private Long id;
    private String name;
    private CategoryType type;
}
