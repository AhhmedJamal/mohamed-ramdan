# Story 7.3: Balance Sheet (الميزانية العمومية) & Accounting Equation Verification (UC-57 Part 2)

Status: done

## Requirements Covered
- UC-57 (Part 2): Balance Sheet (قائمة المركز المالي).
- Verifies fundamental accounting equation: $\text{Total Assets} = \text{Total Liabilities} + \text{Total Equity}$.
- Integrates Net Profit from Income Statement directly into Equity section.
- Displays two-column presentation: Assets (Fixed, Current, Other) vs Liabilities & Equity (Capital, Net Profit, Withdrawals).
- Displays balance verification status.

## Implementation Summary
- Backend: `FinancialReportService::getBalanceSheet`, `FinancialReportController::balanceSheet`.
- Frontend: `BalanceSheetPage.jsx` at `/reports/balance-sheet` with as-of date filter and PDF print action.
- Tests: `FinancialReportsTest::test_balance_sheet_verifies_accounting_equation` passing.

