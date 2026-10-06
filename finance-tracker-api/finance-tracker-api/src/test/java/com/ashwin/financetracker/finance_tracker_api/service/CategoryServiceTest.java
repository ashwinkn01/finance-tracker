package com.ashwin.financetracker.finance_tracker_api.service;

import com.ashwin.financetracker.finance_tracker_api.dto.CategoryDto;
import com.ashwin.financetracker.finance_tracker_api.dto.CategoryResponseDto;
import com.ashwin.financetracker.finance_tracker_api.entity.Category;
import com.ashwin.financetracker.finance_tracker_api.entity.CategoryType;
import com.ashwin.financetracker.finance_tracker_api.entity.User;
import com.ashwin.financetracker.finance_tracker_api.repository.CategoryRepository;
import com.ashwin.financetracker.finance_tracker_api.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock CategoryRepository categoryRepository;
    @Mock UserRepository userRepository;

    CategoryService service;
    User me;

    @BeforeEach
    void setUp() {
        service = new CategoryService(categoryRepository, userRepository);
        me = TransactionServiceTest.user(1L, "me");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("me", null, List.of()));
        when(userRepository.findByUsername("me")).thenReturn(Optional.of(me));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void firstFetchSeedsDefaultCategoriesOfBothTypes() {
        when(categoryRepository.findByUserId(1L)).thenReturn(List.of());
        when(categoryRepository.save(any(Category.class))).thenAnswer(i -> i.getArgument(0));

        List<CategoryResponseDto> result = service.getUserCategories();

        assertThat(result).hasSize(10);
        assertThat(result).extracting(CategoryResponseDto::getType).contains(CategoryType.EXPENSE, CategoryType.INCOME);
        assertThat(result).extracting(CategoryResponseDto::getName).contains("Food", "Salary");
    }

    @Test
    void existingCategoriesAreReturnedWithoutSeeding() {
        Category c = TransactionServiceTest.category(1L, "Gym", me);
        when(categoryRepository.findByUserId(1L)).thenReturn(List.of(c));

        assertThat(service.getUserCategories()).hasSize(1);
        verify(categoryRepository, never()).save(any());
    }

    @Test
    void createTrimsNameAndStoresTypeAndOwner() {
        when(categoryRepository.save(any(Category.class))).thenAnswer(i -> i.getArgument(0));
        CategoryDto dto = new CategoryDto();
        dto.setName("  Gym ");
        dto.setType(CategoryType.EXPENSE);

        CategoryResponseDto result = service.createCategory(dto);

        assertThat(result.getName()).isEqualTo("Gym");
        assertThat(result.getType()).isEqualTo(CategoryType.EXPENSE);
    }

    @Test
    void createRequiresNameAndType() {
        CategoryDto noType = new CategoryDto();
        noType.setName("Gym");
        CategoryDto blankName = new CategoryDto();
        blankName.setName("  ");
        blankName.setType(CategoryType.INCOME);

        assertThatThrownBy(() -> service.createCategory(noType)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.createCategory(blankName)).isInstanceOf(IllegalArgumentException.class);
        verify(categoryRepository, times(0)).save(any());
    }
}
