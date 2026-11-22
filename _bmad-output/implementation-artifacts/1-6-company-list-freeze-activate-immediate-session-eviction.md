---
title: "Story 1.6: Company List, Freeze/Activate & Immediate Session Eviction"
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

**Problem:** Super Admin needs to oversee all registered corporate entities, filter and search them, toggle company operational status (Active vs. Frozen), and appoint/change Branch Managers. Crucially, when a company is frozen, all employees of that entity must be immediately evicted from their active sessions across all devices, and subsequent API requests or login attempts must be blocked with HTTP 403.

**Approach:** Implement company list (`GET /api/admin/companies`), status toggle (`POST /api/admin/companies/{id}/toggle-status`), and manager assignment (`POST /api/admin/companies/{id}/assign-manager`) in PHP Laravel. Upon freezing, iterate over all non-super-admin users belonging to the company and purge all their personal access tokens (`$user->tokens()->delete()`). On React frontend, create `/admin/companies` with search, status filtering, confirmation modal (`"هل أنت متأكد من تجميد/تفعيل هذه الشركة؟"`), and Assign Manager dialog.

## Boundaries & Constraints

**Always:**
- Actor: Super Admin only.
- Confirmation Modal required before toggling status: exact text `"هل أنت متأكد من تجميد/تفعيل هذه الشركة؟"`.
- Immediate Session Eviction rule: freezing a company immediately purges all active Sanctum tokens of every employee of that company.
- Subsequent calls to tenant endpoints for frozen company return HTTP 403: `"الشركة مجمدة، يرجى مراجعة الإدارة"`.
- Financial data remains strictly preserved in the tenant database.
- Assign Manager: company has exactly 1 primary manager at a time (`is_primary_manager = true`).

**Never:**
- Never allow a non-Super Admin to freeze or activate companies.
- Never delete or drop the tenant database when freezing a company.

## I/O & Edge-Case Matrix

| Scenario | Input | Response Code | Response Body / Behavior |
| :--- | :--- | :--- | :--- |
| List Companies | GET `/api/admin/companies?search=...&status=...` | HTTP 200 | Returns filtered list with manager info and status |
| Freeze Company | POST `/api/admin/companies/{id}/toggle-status` (current = active) | HTTP 200 | Sets status = 'frozen', revokes all tokens of company employees, returns success |
| Employee of Frozen Company | Any API call with previous token | HTTP 401 / 403 | Token is revoked or tenant middleware rejects with `"الشركة مجمدة، يرجى مراجعة الإدارة"` |
| Activate Company | POST `/api/admin/companies/{id}/toggle-status` (current = frozen) | HTTP 200 | Sets status = 'active', returns success |
| Assign Manager | POST `/api/admin/companies/{id}/assign-manager` with valid user | HTTP 200 | Unsets previous primary manager, sets new manager, dispatches notification log |

</frozen-after-approval>

## Code Map

- `backend/app/Http/Controllers/Central/CompanyController.php` -- `index`, `toggleStatus`, and `assignManager` methods
- `backend/routes/api.php` -- Protected `/api/admin/companies` endpoints
- `backend/tests/Feature/CompanyFreezeAndEvictionTest.php` -- Automated feature tests covering UC-08, UC-09, UC-10
- `frontend/src/pages/admin/CompanyListPage.jsx` -- Company list view with search, filter, confirmation modal, and manager modal
- `frontend/src/App.jsx` -- Register `/admin/companies` route
- `frontend/src/pages/dashboards/AdminDashboard.jsx` -- Added link to company list

## Tasks & Acceptance

**Execution:**
- [x] Add `toggleStatus` and `assignManager` methods to `CompanyController`.
- [x] Implement multi-device session eviction in `toggleStatus` when freezing.
- [x] Register routes in `backend/routes/api.php`.
- [x] Write and verify automated feature tests `CompanyFreezeAndEvictionTest.php`.
- [x] Build React `CompanyListPage` with search, status filters, confirmation modal, and manager assignment dialog.
- [x] Register route in `frontend/src/App.jsx` and link in `AdminDashboard.jsx`.
- [x] Verify automated tests and frontend build.
