---
title: "Story 2.4: Fiscal Year-End Closing & Retained Earnings Rollover"
type: 'feature'
created: '2026-11-22'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - "docs/SRS- Mohamed Ramdan.md"
  - "_bmad-output/planning-artifacts/architecture/architecture-mohamed_ramdan-2026-11-22/ARCHITECTURE-SPINE.md"
  - "_bmad-output/planning-artifacts/ux/ux-mohamed_ramdan-2026-11-22/EXPERIENCE.md"
  - "_bmad-output/implementation-artifacts/epic-2-context.md"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** At fiscal year-end, nominal accounts (revenues, sales, purchase returns, discounts earned, expenses, purchases, sales returns, discounts allowed) must be formally closed out to zero, and the net profit or loss must be permanently transferred into Equity (Retained Earnings). The fiscal year and all its monthly periods must be permanently locked against any future transaction posting, and the operation is irreversible per standard accounting principles.

**Approach:** Implement `/api/fiscal-years/{id}/closing-summary` and `/api/fiscal-years/{id}/close` in PHP Laravel operating on the tenant database. Calculate nominal balances from posted journal items in the fiscal year. Verify no draft vouchers or draft journal entries remain pending. In a database transaction, auto-generate a balanced closing journal entry (`Total Debit - Total Credit = 0`, `status = 'posted'`) that zeroes nominal balances and credits/debits the Net Profit/Loss to the Equity root account. Update the fiscal year and all its periods to `status = 'closed'`, setting `closed_at = now()`. On React frontend, build `/accounting/fiscal-year-closing` with fiscal year selector, summary cards, accounts breakdown, confirmation modal (`"هل أنت متأكد من إغلاق السنة المالية؟ هذه العملية لا يمكن التراجع عنها."`), and post-closing audit badge.

## Boundaries & Constraints

**Always:**
- Actor: General Accountant (`role === 'general_accountant'`) or Super Admin.
- Pre-conditions: Fiscal Year must be currently `open`.
- Strict validation: Cannot close a year with pending draft vouchers or draft journal entries (error: `"لا يمكن إغلاق السنة المالية لوجود قيود أو سندات مسودة معلقة"`).
- Exact confirmation modal text: `"هل أنت متأكد من إغلاق السنة المالية؟ هذه العملية لا يمكن التراجع عنها."`.
- Closing entry must be perfectly balanced: $\text{Total Debit} = \text{Total Credit}$.
- Closing is final and permanent: Year and all 12 periods become `closed`.

**Never:**
- Never close an already closed fiscal year (error: `"السنة المالية مغلقة بالفعل"`).
- Never allow manual modifications or posting in a closed fiscal year.

## I/O & Edge-Case Matrix

| Scenario | Input | Response Code | Response Body / Behavior |
| :--- | :--- | :--- | :--- |
| Get Closing Summary | GET `/api/fiscal-years/{id}/closing-summary` | HTTP 200 | Returns Total Revenue, Total Expenses, Net Profit/Loss, and account lines |
| Attempt Close Already Closed | POST `/api/fiscal-years/{id}/close` on closed year | HTTP 422 | `{"message": "السنة المالية مغلقة بالفعل"}` |
| Attempt Close with Draft Entries | POST `/api/fiscal-years/{id}/close` with pending drafts | HTTP 422 | `{"message": "لا يمكن إغلاق السنة المالية لوجود قيود أو سندات مسودة معلقة"}` |
| Successful Year Closing | POST `/api/fiscal-years/{id}/close` confirmed | HTTP 200 | Auto-generates balanced closing entry, updates equity, closes all periods |

</frozen-after-approval>

## Code Map

- `backend/app/Services/FiscalYearClosingService.php` -- Summary computation, closing entry generator, equity rollover
- `backend/app/Http/Controllers/Tenant/FiscalYearClosingController.php` -- Summary and closing endpoints
- `backend/routes/api.php` -- Register `/api/fiscal-years/{id}/closing-summary` and `/api/fiscal-years/{id}/close`
- `backend/tests/Feature/FiscalYearClosingTest.php` -- Comprehensive feature tests verifying UC-61
- `frontend/src/pages/accounting/FiscalYearClosingPage.jsx` -- Interactive closing UI, summary cards, and modal
- `frontend/src/App.jsx` -- Register `/accounting/fiscal-year-closing` route
- `frontend/src/pages/dashboards/AccountingDashboard.jsx` -- Link to year closing

