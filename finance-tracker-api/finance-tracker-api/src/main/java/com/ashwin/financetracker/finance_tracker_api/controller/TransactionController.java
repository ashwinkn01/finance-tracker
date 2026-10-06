package com.ashwin.financetracker.finance_tracker_api.controller;

import com.ashwin.financetracker.finance_tracker_api.dto.TransactionDto;
import com.ashwin.financetracker.finance_tracker_api.dto.TransactionResponseDto;
import com.ashwin.financetracker.finance_tracker_api.service.TransactionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping
    public ResponseEntity<TransactionResponseDto> createTransaction(@RequestBody TransactionDto transactionDto) {
        TransactionResponseDto created = transactionService.createTransaction(transactionDto);
        return ResponseEntity.ok(created);
    }

    @GetMapping
    public ResponseEntity<Page<TransactionResponseDto>> getTransactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        // Sort by date descending (newest first)
        Pageable pageable = PageRequest.of(page, size, Sort.by("txnDate").descending());
        Page<TransactionResponseDto> transactions = transactionService.getUserTransactions(pageable);
        return ResponseEntity.ok(transactions);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteTransaction(@PathVariable Long id) {
        transactionService.deleteTransaction(id);
        return ResponseEntity.ok("Transaction deleted successfully");
    }
}