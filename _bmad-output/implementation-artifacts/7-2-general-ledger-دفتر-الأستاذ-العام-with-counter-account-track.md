# Story 7.2: General Ledger (دفتر الأستاذ العام) Statement & Running Balance (UC-57)

Status: done

## Requirements Covered
- UC-57: General Ledger per account with running balance tracking.
- Calculates opening balance based on account nature (Debit nature: Opening + Debit - Credit; Credit nature: Opening - Debit + Credit).
- Shows transaction date, entry number, explanation, counter account (الحساب الآخر / المذكورين), cost center, debit, credit, and running balance.
- Filters by mandatory account, optional counter account, and date range.

## Implementation Summary
- Backend: `FinancialReportService::getGeneralLedger`, `FinancialReportController::generalLedger`.
- Frontend: `GeneralLedgerPage.jsx` at `/reports/general-ledger` with live account switcher and counter-account filtering.
- Tests: `FinancialReportsTest::test_general_ledger_calculates_running_balance_correctly` passing.

