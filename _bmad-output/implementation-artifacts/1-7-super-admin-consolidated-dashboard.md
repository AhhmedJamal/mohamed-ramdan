---
title: "Story 1.7: Super Admin Consolidated Dashboard"
type: 'feature'
created: '2026-11-22'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - "docs/SRS- Mohamed Ramdan.md"
  - "_bmad-output/planning-artifacts/architecture/architecture-mohamed_ramdan-2026-11-22/ARCHITECTURE-SPINE.md"
  - "_bmad-output/planning-artifacts/ux/ux-mohamed_ramdan-2026-11-22/EXPERIENCE.md"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Super Admin requires group-level executive financial and operational visibility across all three operating entities (Real Estate, Contracting, Commercial) without violating multi-tenant isolation or executing dangerous cross-database SQL joins.

**Approach:** Implement `GET /api/admin/dashboard/metrics` in PHP Laravel. The controller filters active companies, programmatically iterates over each active company's database connection via `TenantManager`, aggregates revenues (accounts with root_type `revenues` or vouchers), expenses (accounts with root_type `expenses` or vouchers), computes `Net_Profit = Total_Revenue - Total_Expenses`, and counts active and frozen entities. On React frontend, enhance `/admin/dashboard` with Date Range pickers, Company/Manager dropdown filters, metric cards, and entity breakdown charts.

## Boundaries & Constraints

**Always:**
- Actor: Super Admin only.
- Strict multi-tenant isolation: programmatically query each active company database individually; never issue raw cross-database SQL JOINs.
- Active companies only: strictly exclude data from companies where `status === 'frozen'`.
- Exact formulas per SRS UC-11:
  - $\text{Total\_Revenue} = \sum(\text{Revenue of all Active Companies})$
  - $\text{Total\_Expenses} = \sum(\text{Expenses of all Active Companies})$
  - $\text{Net\_Profit} = \text{Total\_Revenue} - \text{Total\_Expenses}$
- Date range filtering: filter transaction date between `start_date` and `end_date`.

**Never:**
- Never aggregate revenue or expenses from frozen companies into active financial metrics.

## I/O & Edge-Case Matrix

| Scenario | Input | Response Code | Response Body / Behavior |
| :--- | :--- | :--- | :--- |
| Full Dashboard | GET `/api/admin/dashboard/metrics` | HTTP 200 | Returns total revenue, expenses, net profit, company counts, and entity breakdown |
| Filter by Company | `company_id=1` | HTTP 200 | Returns metrics filtered strictly for Company 1 |
| Filter by Date Range | `start_date`, `end_date` | HTTP 200 | Filters financial transactions strictly within specified date range |
| All Companies Frozen | No active companies | HTTP 200 | Returns 0 for revenue and expenses, correct count of frozen companies |

</frozen-after-approval>

## Code Map

- `backend/app/Http/Controllers/Central/AdminDashboardController.php` -- Aggregation logic over active tenant databases
- `backend/routes/api.php` -- Protected route `/api/admin/dashboard/metrics`
- `backend/tests/Feature/AdminDashboardMetricsTest.php` -- Feature tests for UC-11
- `frontend/src/pages/dashboards/AdminDashboard.jsx` -- Enhanced React dashboard with date range, company filter, live metrics, and visual comparison

## Tasks & Acceptance

**Execution:**
- [x] Implement `AdminDashboardController@metrics` with programmatic tenant iteration and safe aggregation.
- [x] Register route in `backend/routes/api.php` under `EnsureSuperAdmin`.
- [x] Implement feature tests `AdminDashboardMetricsTest.php`.
- [x] Enhance React `AdminDashboard.jsx` to fetch live metrics, apply date and company filters, and render comparative bars.
- [x] Verify automated tests and frontend build.
