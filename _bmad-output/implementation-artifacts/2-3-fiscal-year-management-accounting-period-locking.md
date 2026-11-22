---
title: "Story 2.3: Fiscal Year Management & Accounting Period Locking"
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

**Problem:** Financial audit compliance requires closing accounting periods at month-end to freeze finalized financial results against retroactive tampering or backdated voucher posting. If a period is closed, no vouchers or journal entries can be created, updated, or posted within that date range.

**Approach:** Implement `/api/fiscal-years` in PHP Laravel operating on the tenant database. When creating a fiscal year, validate `end_date > start_date` and automatically generate 12 monthly fiscal periods. Provide a toggle to open or close any fiscal period with confirmation. Create a centralized validation service (`FiscalPeriodService::validateDateIsOpen($date)`) that checks whether a transaction date falls into an open fiscal period and open year, returning HTTP 422 with `"الفترة المالية مغلقة، لا يمكن إضافة أو تعديل قيود بها"` if locked. On React frontend, build `/accounting/fiscal-years` with year cards, 12-month period grid/table, status badges, period closing modals, and error messaging.

## Boundaries & Constraints

**Always:**
- Actor: General Accountant (`role === 'general_accountant'`) has CRUD; Branch Manager and Data Entry have Read-Only.
- Fiscal Year requires Name, Start Date, and End Date where `end_date > start_date`. Error if invalid: `"تاريخ النهاية يجب أن يكون أكبر من تاريخ البداية"`.
- Creating a fiscal year auto-generates 12 monthly periods (`fiscal_periods`) with exact start and end dates.
- Period lock rule: When a period is `closed`, any attempt to post or modify a voucher or journal entry dated within that period is blocked with message: `"الفترة المالية مغلقة، لا يمكن إضافة أو تعديل قيود بها"`.

**Never:**
- Never permit overlapping fiscal years with conflicting active dates.
- Never allow transaction posting in a closed accounting period or closed fiscal year.

## I/O & Edge-Case Matrix

| Scenario | Input | Response Code | Response Body / Behavior |
| :--- | :--- | :--- | :--- |
| List Fiscal Years | GET `/api/fiscal-years` | HTTP 200 | Returns fiscal years with status and period statistics |
| Create Fiscal Year | POST `/api/fiscal-years` with valid dates | HTTP 201 | Creates fiscal year and auto-provisions 12 monthly `fiscal_periods` |
| Invalid Date Range | POST with `end_date <= start_date` | HTTP 422 | `{"message": "تاريخ النهاية يجب أن يكون أكبر من تاريخ البداية"}` |
| Get Periods of Year | GET `/api/fiscal-years/{id}/periods` | HTTP 200 | Returns the 12 monthly periods with dates and status |
| Close Period | POST `/api/fiscal-years/{id}/periods/{periodId}/toggle` | HTTP 200 | Changes period status to `closed` |
| Validate Date in Closed Period | Service check on transaction date in closed period | HTTP 422 | `{"message": "الفترة المالية مغلقة، لا يمكن إضافة أو تعديل قيود بها"}` |

</frozen-after-approval>

## Code Map

- `backend/app/Services/FiscalPeriodService.php` -- Centralized period lock validation interceptor
- `backend/app/Http/Controllers/Tenant/FiscalYearController.php` -- Fiscal Year & Period CRUD and lock toggle
- `backend/routes/api.php` -- Register `/api/fiscal-years` routes
- `backend/tests/Feature/FiscalYearManagementTest.php` -- Automated feature tests verifying UC-24 and period locking
- `frontend/src/pages/accounting/FiscalYearsPage.jsx` -- React management UI with 12-month period grid and lock toggles
- `frontend/src/App.jsx` -- Register `/accounting/fiscal-years` route
- `frontend/src/pages/dashboards/AccountingDashboard.jsx` -- Link to fiscal years
