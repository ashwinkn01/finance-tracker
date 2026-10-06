package com.ashwin.financetracker.finance_tracker_api.controller;

import com.ashwin.financetracker.finance_tracker_api.dto.BudgetDto;
import com.ashwin.financetracker.finance_tracker_api.dto.BudgetResponseDto;
import com.ashwin.financetracker.finance_tracker_api.service.BudgetService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {

    private final BudgetService budgetService;

    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    // Creates a budget, or updates the limit if one already exists for that category + month
    @PostMapping
    public ResponseEntity<BudgetResponseDto> setBudget(@RequestBody BudgetDto budgetDto) {
        return ResponseEntity.ok(budgetService.createOrUpdateBudget(budgetDto));
    }

    // Example: GET /api/budgets?month=2026-10
    @GetMapping
    public ResponseEntity<List<BudgetResponseDto>> getBudgets(@RequestParam String month) {
        return ResponseEntity.ok(budgetService.getBudgetsForMonth(month));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteBudget(@PathVariable Long id) {
        budgetService.deleteBudget(id);
        return ResponseEntity.ok(Map.of("message", "Budget deleted successfully"));
    }

    // Example: POST /api/budgets/copy?from=2026-09&to=2026-10
    @PostMapping("/copy")
    public ResponseEntity<List<BudgetResponseDto>> copyBudgets(@RequestParam String from, @RequestParam String to) {
        return ResponseEntity.ok(budgetService.copyBudgets(from, to));
    }
}
