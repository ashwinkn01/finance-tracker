package com.ashwin.financetracker.finance_tracker_api.service;

import com.ashwin.financetracker.finance_tracker_api.controller.ReportController;
import com.ashwin.financetracker.finance_tracker_api.entity.*;
import com.ashwin.financetracker.finance_tracker_api.repository.TransactionRepository;
import com.ashwin.financetracker.finance_tracker_api.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock TransactionRepository transactionRepository;
    @Mock UserRepository userRepository;

    ReportService service;
    User me;

    @BeforeEach
    void setUp() {
        service = new ReportService(transactionRepository, userRepository);
        me = TransactionServiceTest.user(1L, "me");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("me", null, List.of()));
        lenient().when(userRepository.findByUsername("me")).thenReturn(Optional.of(me));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private Transaction txn(String category, String amount, TransactionType type, String note, int day) {
        Category c = TransactionServiceTest.category(1L, category, me);
        Transaction t = TransactionServiceTest.transaction((long) day, me, c);
        t.setAmount(new BigDecimal(amount));
        t.setType(type);
        t.setNote(note);
        t.setTxnDate(LocalDate.of(2026, 10, day));
        t.setTxnTime(LocalTime.of(9, 30));
        return t;
    }

    private void given(Transaction... ts) {
        when(transactionRepository.findByUserIdAndTxnDateBetween(any(), any(), any())).thenReturn(List.of(ts));
    }

    private String csv(String currency) {
        return new String(service.generateCsvReport("2026-10", currency), StandardCharsets.UTF_8);
    }

    @Test
    void csvHasHeaderCurrencyColumnAndTwoDecimalAmounts() {
        given(txn("Food", "12.5", TransactionType.EXPENSE, "Lunch", 6));

        String[] lines = csv("INR").split("\\R");

        assertThat(lines[0]).isEqualTo("\"Date\",\"Time\",\"Type\",\"Category\",\"Amount\",\"Currency\",\"Note\"");
        assertThat(lines[1]).contains("\"2026-10-06\"").contains("\"EXPENSE\"").contains("\"Food\"")
                .contains("\"12.50\"").contains("\"INR\"").contains("\"Lunch\"");
    }

    @Test
    void csvRowsAreSortedByDate() {
        given(txn("B", "1", TransactionType.EXPENSE, "later", 20), txn("A", "1", TransactionType.EXPENSE, "earlier", 2));

        String[] lines = csv("").split("\\R");

        assertThat(lines[1]).contains("earlier");
        assertThat(lines[2]).contains("later");
    }

    @Test
    void csvDefusesSpreadsheetFormulas() {
        given(txn("=SUM(A1)", "1", TransactionType.EXPENSE, "=HYPERLINK(\"http://evil\")", 1),
              txn("Food", "1", TransactionType.EXPENSE, "+cmd", 2),
              txn("Food", "1", TransactionType.EXPENSE, "@user", 3),
              txn("Food", "1", TransactionType.EXPENSE, "-5", 4));

        String out = csv("");

        assertThat(out).contains("\"'=SUM(A1)\"").contains("\"'=HYPERLINK(").contains("\"'+cmd\"")
                .contains("\"'@user\"").contains("\"'-5\"");
        assertThat(out).doesNotContain(",\"=");
    }

    @Test
    void ordinaryNotesAreLeftAlone() {
        assertThat(ReportService.neutralizeFormula("Lunch with Sam")).isEqualTo("Lunch with Sam");
        assertThat(ReportService.neutralizeFormula(null)).isEmpty();
        assertThat(ReportService.neutralizeFormula("")).isEmpty();
    }

    @Test
    void csvKeepsNonAsciiTextIntact() {
        given(txn("Café ☕", "3", TransactionType.EXPENSE, "Crème brûlée", 5));
        assertThat(csv("")).contains("Café ☕").contains("Crème brûlée");
    }

    @Test
    void pdfIsAValidPdfEvenForAnEmptyMonth() {
        given();
        byte[] pdf = service.generatePdfReport("2026-10", "INR");
        assertThat(new String(pdf, 0, 5, StandardCharsets.ISO_8859_1)).isEqualTo("%PDF-");
    }

    @Test
    void pdfWithDataIsGenerated() {
        given(txn("Salary", "1000", TransactionType.INCOME, "Pay", 1), txn("Food", "12.5", TransactionType.EXPENSE, null, 6));
        byte[] pdf = service.generatePdfReport("2026-10", "USD");
        assertThat(new String(pdf, 0, 5, StandardCharsets.ISO_8859_1)).isEqualTo("%PDF-");
        assertThat(pdf.length).isGreaterThan(500);
    }

    @Test
    void rejectsBadMonthAndBadCurrency() {
        assertThatThrownBy(() -> service.generateCsvReport("October", "")).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("YYYY-MM");
        assertThatThrownBy(() -> service.generatePdfReport("2026-13", "")).hasMessageContaining("YYYY-MM");
        assertThatThrownBy(() -> service.generateCsvReport("2026-10", "inr")).hasMessageContaining("3-letter");
        assertThatThrownBy(() -> service.generateCsvReport("2026-10", "US$")).hasMessageContaining("3-letter");
    }

    @Test
    void controllerSetsDownloadHeadersAndRejectsUnknownFormats() {
        given(txn("Food", "1", TransactionType.EXPENSE, "x", 1));
        ReportController controller = new ReportController(service);

        ResponseEntity<byte[]> csv = controller.exportReport("2026-10", "CSV", "USD");
        assertThat(csv.getHeaders().getFirst("Content-Disposition"))
                .isEqualTo("attachment; filename=\"transaction-report-2026-10.csv\"");
        assertThat(csv.getHeaders().getFirst("Content-Type")).startsWith("text/csv");

        ResponseEntity<byte[]> pdf = controller.exportReport("2026-10", "pdf", null);
        assertThat(pdf.getHeaders().getFirst("Content-Type")).isEqualTo("application/pdf");

        assertThatThrownBy(() -> controller.exportReport("2026-10", "xlsx", null)).hasMessageContaining("csv or pdf");
    }
}
