package com.ashwin.financetracker.finance_tracker_api.service;

import com.ashwin.financetracker.finance_tracker_api.entity.Transaction;
import com.ashwin.financetracker.finance_tracker_api.entity.TransactionType;
import com.ashwin.financetracker.finance_tracker_api.entity.User;
import com.ashwin.financetracker.finance_tracker_api.repository.TransactionRepository;
import com.ashwin.financetracker.finance_tracker_api.repository.UserRepository;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.opencsv.CSVWriter;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class ReportService {

    private static final Pattern CURRENCY_CODE = Pattern.compile("^[A-Z]{3}$");

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;

    public ReportService(TransactionRepository transactionRepository, UserRepository userRepository) {
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
    }

    // --- SECURITY & DATA FETCHING ---
    private User getAuthenticatedUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private List<Transaction> getTransactionsForMonth(String monthYear) {
        User user = getAuthenticatedUser();
        YearMonth ym;
        try {
            ym = YearMonth.parse(monthYear);
        } catch (DateTimeParseException | NullPointerException e) {
            throw new IllegalArgumentException("Month must be in YYYY-MM format");
        }
        // Reusing the exact method you already built for the Dashboard!
        return transactionRepository.findByUserIdAndTxnDateBetween(user.getId(), ym.atDay(1), ym.atEndOfMonth())
                .stream()
                .sorted(Comparator.comparing(Transaction::getTxnDate).thenComparing(Transaction::getTxnTime))
                .toList();
    }

    // The currency is only a LABEL (no conversion happens), so just make sure it is a 3-letter code
    private String cleanCurrency(String currency) {
        if (currency == null || currency.isBlank()) return "";
        if (!CURRENCY_CODE.matcher(currency).matches()) {
            throw new IllegalArgumentException("Currency must be a 3-letter code such as USD or INR");
        }
        return currency;
    }

    // Spreadsheet apps treat a cell starting with = + - @ (or tab/CR) as a FORMULA.
    // A note like =HYPERLINK("http://evil") would run when the CSV is opened, so we defuse it
    // by prefixing a single quote, which makes the cell plain text.
    static String neutralizeFormula(String value) {
        if (value == null || value.isEmpty()) return "";
        char first = value.charAt(0);
        if (first == '=' || first == '+' || first == '-' || first == '@' || first == '\t' || first == '\r') {
            return "'" + value;
        }
        return value;
    }

    private static String money(BigDecimal amount) {
        return amount.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();
    }

    // --- 1. CSV GENERATION ---
    public byte[] generateCsvReport(String monthYear, String currency) {
        String code = cleanCurrency(currency);
        List<Transaction> transactions = getTransactionsForMonth(monthYear);

        // This holds the file in memory instead of saving to disk
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        // UTF-8 explicitly (the platform default can differ), so names like "Café" survive
        try (CSVWriter writer = new CSVWriter(new OutputStreamWriter(out, StandardCharsets.UTF_8))) {
            writer.writeNext(new String[]{"Date", "Time", "Type", "Category", "Amount", "Currency", "Note"});

            for (Transaction t : transactions) {
                writer.writeNext(new String[]{
                        t.getTxnDate().toString(),
                        t.getTxnTime().toString(),
                        t.getType().name(),
                        neutralizeFormula(t.getCategory().getName()),
                        money(t.getAmount()),
                        code,
                        neutralizeFormula(t.getNote())
                });
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate CSV file");
        }

        return out.toByteArray();
    }

    // --- 2. PDF GENERATION ---
    public byte[] generatePdfReport(String monthYear, String currency) {
        String code = cleanCurrency(currency);
        List<Transaction> transactions = getTransactionsForMonth(monthYear);
        String prefix = code.isEmpty() ? "" : code + " ";

        BigDecimal income = BigDecimal.ZERO;
        BigDecimal expenses = BigDecimal.ZERO;
        for (Transaction t : transactions) {
            if (t.getType() == TransactionType.INCOME) income = income.add(t.getAmount());
            else expenses = expenses.add(t.getAmount());
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();

        // OpenPDF uses a Document object to represent the page
        try (Document document = new Document()) {
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Paragraph title = new Paragraph("Transaction Report - " + monthYear, titleFont);
            title.setAlignment(Paragraph.ALIGN_CENTER);
            title.setSpacingAfter(16);
            document.add(title);

            // Summary block: income, expenses, net balance
            Font label = FontFactory.getFont(FontFactory.HELVETICA, 11);
            Font value = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
            PdfPTable summary = new PdfPTable(2);
            summary.setWidthPercentage(45);
            summary.setHorizontalAlignment(Element.ALIGN_LEFT);
            summary.setSpacingAfter(16);
            addSummaryRow(summary, "Total income", prefix + money(income), label, value);
            addSummaryRow(summary, "Total expenses", prefix + money(expenses), label, value);
            addSummaryRow(summary, "Net balance", prefix + money(income.subtract(expenses)), label, value);
            document.add(summary);

            if (transactions.isEmpty()) {
                document.add(new Paragraph("No transactions in this month."));
            } else {
                PdfPTable table = new PdfPTable(new float[]{2f, 1.6f, 1.6f, 2.4f, 2f, 3f});
                table.setWidthPercentage(100);
                table.setHeaderRows(1);
                for (String h : new String[]{"Date", "Time", "Type", "Category", "Amount", "Note"}) {
                    PdfPCell cell = new PdfPCell(new Phrase(h, value));
                    cell.setBackgroundColor(new java.awt.Color(225, 240, 238));
                    table.addCell(cell);
                }
                for (Transaction t : transactions) {
                    table.addCell(t.getTxnDate().toString());
                    table.addCell(t.getTxnTime().toString());
                    table.addCell(t.getType().name());
                    table.addCell(t.getCategory().getName());
                    table.addCell(prefix + money(t.getAmount()));
                    table.addCell(t.getNote() != null ? t.getNote() : "");
                }
                document.add(table);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF file");
        }

        return out.toByteArray();
    }

    private void addSummaryRow(PdfPTable table, String name, String amount, Font label, Font value) {
        table.addCell(new Phrase(name, label));
        table.addCell(new Phrase(amount, value));
    }
}
