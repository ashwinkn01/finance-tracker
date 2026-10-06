package com.ashwin.financetracker.finance_tracker_api.service;

import com.ashwin.financetracker.finance_tracker_api.dto.CategoryDto;
import com.ashwin.financetracker.finance_tracker_api.dto.CategoryResponseDto;
import com.ashwin.financetracker.finance_tracker_api.entity.Category;
import com.ashwin.financetracker.finance_tracker_api.entity.CategoryType;
import com.ashwin.financetracker.finance_tracker_api.entity.User;
import com.ashwin.financetracker.finance_tracker_api.repository.CategoryRepository;
import com.ashwin.financetracker.finance_tracker_api.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    public CategoryService(CategoryRepository categoryRepository, UserRepository userRepository) {
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
    }

    // --- SECURITY HELPER METHOD ---
    // This strictly enforces Data Isolation across all your services
    private User getAuthenticatedUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Authenticated user not found in database"));
    }

    // 1. Create a Category
    public CategoryResponseDto createCategory(CategoryDto categoryDto) {
        User user = getAuthenticatedUser(); // Securely get the logged-in user

        if (categoryDto.getName() == null || categoryDto.getName().isBlank() || categoryDto.getType() == null) {
            throw new IllegalArgumentException("Category name and type are required");
        }

        return CategoryResponseDto.from(saveCategory(user, categoryDto.getName().trim(), categoryDto.getType()));
    }

    // 2. Get all Categories for the logged-in user
    public List<CategoryResponseDto> getUserCategories() {
        User user = getAuthenticatedUser();
        List<Category> categories = categoryRepository.findByUserId(user.getId()); // Only fetch THEIR categories

        // First visit: give the user a starter set so the transaction form is usable
        if (categories.isEmpty()) {
            categories = seedDefaultCategories(user);
        }
        return categories.stream().map(CategoryResponseDto::from).toList();
    }

    private Category saveCategory(User user, String name, CategoryType type) {
        Category category = new Category();
        category.setName(name);
        category.setType(type);
        category.setUser(user); // Tie the category exclusively to this user
        return categoryRepository.save(category);
    }

    private List<Category> seedDefaultCategories(User user) {
        List<Category> defaults = new java.util.ArrayList<>();
        for (String name : List.of("Food", "Rent", "Transport", "Shopping", "Bills", "Entertainment", "Other")) {
            defaults.add(saveCategory(user, name, CategoryType.EXPENSE));
        }
        for (String name : List.of("Salary", "Freelance", "Other Income")) {
            defaults.add(saveCategory(user, name, CategoryType.INCOME));
        }
        return defaults;
    }
}