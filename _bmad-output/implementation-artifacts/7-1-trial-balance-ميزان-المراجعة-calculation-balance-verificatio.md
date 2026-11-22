# Story 7.1: Trial Balance (ميزان المراجعة) Calculation & Balance Verification (UC-56)

Status: done

## Requirements Covered
- UC-56: Trial Balance (ميزان المراجعة بالمجاميع والأرصدة).
- Calculates opening balance (debit/credit prior to from_date), period movements (debit/credit), and ending balance (debit/credit).
- Verification condition: $\sum \text{Ending Debit} = \sum \text{Ending Credit}$ with zero difference.
- Shows alert banner in Arabic: "ميزان المراجعة متوازن بنسبة 100%" or error alert if unbalanced.
- Export to Excel (CSV/XLSX) and printable PDF view.

## Implementation Summary
- Backend: `FinancialReportService::getTrialBalance`, `FinancialReportController::trialBalance`, `FinancialReportController::export`.
- Frontend: `TrialBalancePage.jsx` at `/reports/trial-balance` with fiscal year and date range filters, 8-column table with multi-tier header and totals footer.
- Tests: `FinancialReportsTest::test_trial_balance_is_balanced_and_matches_posted_entries` passing.

