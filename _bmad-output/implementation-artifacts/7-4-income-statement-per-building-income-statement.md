# Story 7.4: Income Statement & Per-Building Income Statement (UC-58, UC-59, UC-60)

Status: done

## Requirements Covered
- UC-58: Income Statement (قائمة الدخل الشاملة).
  - Net Profit/Loss = Total Revenues - Total Expenses.
- UC-59: Per-Building Income Statement (قائمة الدخل لكل عمارة / مركز تكلفة).
  - Filters by mandatory Cost Center (`cost_center_id`).
  - Displays revenues and direct expenses assigned to the building and calculates net operating margin.
- UC-60: Export reports (Excel/CSV stream and PDF print view).

## Implementation Summary
- Backend:
  - `FinancialReportService::getIncomeStatement`
  - `FinancialReportService::getBuildingIncomeStatement`
  - `FinancialReportController::incomeStatement`, `buildingIncomeStatement`, `export`
- Frontend:
  - `IncomeStatementPage.jsx` at `/reports/income-statement`
  - `BuildingIncomeStatementPage.jsx` at `/reports/building-income-statement`
- Tests: `FinancialReportsTest::test_income_statement_and_per_building_income_statement` passing.

