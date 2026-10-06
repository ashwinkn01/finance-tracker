package com.ashwin.financetracker.finance_tracker_api.controller;

import com.ashwin.financetracker.finance_tracker_api.service.ReportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    // Example request: GET /api/reports/export?month=2026-07&format=pdf&currency=INR
    // Problems (bad month, unknown format, bad currency) throw an exception that
    // GlobalExceptionHandler turns into a JSON 400 response.
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportReport(
            @RequestParam String month,
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) String currency) {

        byte[] reportData;
        String contentType;
        String extension;

        if ("pdf".equalsIgnoreCase(format)) {
            reportData = reportService.generatePdfReport(month, currency);
            contentType = MediaType.APPLICATION_PDF_VALUE;
            extension = "pdf";
        } else if ("csv".equalsIgnoreCase(format)) {
            reportData = reportService.generateCsvReport(month, currency);
            contentType = "text/csv; charset=UTF-8";
            extension = "csv";
        } else {
            throw new IllegalArgumentException("Format must be csv or pdf");
        }

        // The month was validated by the service above, so it is safe to put in the filename
        String filename = "transaction-report-" + month + "." + extension;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .body(reportData);
    }
}
