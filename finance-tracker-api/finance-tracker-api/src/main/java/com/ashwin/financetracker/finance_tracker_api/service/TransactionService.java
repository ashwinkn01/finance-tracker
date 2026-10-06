package com.ashwin.financetracker.finance_tracker_api.service;

import com.ashwin.financetracker.finance_tracker_api.dto.TransactionDto;
import com.ashwin.financetracker.finance_tracker_api.dto.TransactionResponseDto;
import com.ashwin.financetracker.finance_tracker_api.entity.Category;
import com.ashwin.financetracker.finance_tracker_api.entity.Transaction;
import com.ashwin.financetracker.finance_tracker_api.entity.User;
import com.ashwin.financetracker.finance_tracker_api.repository.CategoryRepository;
import com.ashwin.financetracker.finance_tracker_api.repository.TransactionRepository;
import com.ashwin.financetracker.finance_tracker_api.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    public TransactionService(TransactionRepository transactionRepository, CategoryRepository categoryRepository, UserRepository userRepository) {
        this.transactionRepository = transactionRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
    }

    private User getAuthenticatedUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // 1. Create a new Transaction
    public TransactionResponseDto createTransaction(TransactionDto dto) {
        User user = getAuthenticatedUser();

        Category category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found"));

        // Security Check: Ensure the category belongs to this user
        if (!category.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized: Category belongs to another user");
        }

        Transaction transaction = new Transaction();
        transaction.setAmount(dto.getAmount());
        transaction.setType(dto.getType());         // Mapped to your enum
        transaction.setTxnDate(dto.getTxnDate());   // Mapped to your LocalDate
        transaction.setTxnTime(dto.getTxnTime());   // Mapped to your LocalTime
        transaction.setNote(dto.getNote());         // Mapped to your String note
        transaction.setCategory(category);
        transaction.setUser(user);

        return TransactionResponseDto.from(transactionRepository.save(transaction));
    }

    // 2. Get Paginated Transactions
    public Page<TransactionResponseDto> getUserTransactions(Pageable pageable) {
        return transactionRepository.findByUserId(getAuthenticatedUser().getId(), pageable)
                .map(TransactionResponseDto::from);
    }
    
    // 3. Delete a Transaction (with security check)
    public void deleteTransaction(Long transactionId) {
        User user = getAuthenticatedUser();
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));
                
        if (!transaction.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized to delete this transaction");
        }
        
        transactionRepository.delete(transaction);
    }
}