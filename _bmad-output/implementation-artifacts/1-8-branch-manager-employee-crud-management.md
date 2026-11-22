---
title: "Story 1.8: Branch Manager Employee CRUD Management"
type: 'feature'
created: '2026-11-22'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 0
context:
  - "docs/SRS- Mohamed Ramdan.md"
  - "_bmad-output/planning-artifacts/architecture/architecture-mohamed_ramdan-2026-11-22/ARCHITECTURE-SPINE.md"
  - "_bmad-output/planning-artifacts/ux/ux-mohamed_ramdan-2026-11-22/EXPERIENCE.md"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Branch Managers must manage their company's accounting and operational workforce (General Accountants and Data Entry personnel) without exposing employees from other group entities. Deactivating an employee must immediately terminate their active session across all devices, and deleting an accountant who has posted journal entries must be strictly blocked to maintain accounting audit integrity.

**Approach:** Implement `/api/company/employees` (CRUD + toggle status) in PHP Laravel. Enforce company isolation by binding queries to the authenticated manager's company. When an employee is deactivated, delete all their Sanctum tokens (`$employee->tokens()->delete()`). Check tenant database before deletion of accountants to prevent audit trail destruction. On React frontend, build `/company/employees` with search, role and status filters, add/edit modal, and confirmation dialogs.

## Boundaries & Constraints

**Always:**
- Actor: Branch Manager (`role === 'branch_manager'`) or Super Admin.
- Strict isolation: Managers can only view, create, edit, or toggle employees linked to their own company.
- Roles allowed: `general_accountant` (محاسب عام) and `data_entry` (مدخل بيانات).
- Immediate session termination: deactivating an employee immediately purges all their personal access tokens.
- Deletion block: deleting an accountant with approved journal entries in the tenant database is blocked with message: `"لا يمكن حذف المحاسب لوجود قيود محاسبية مرتبطة به"`.
- Notification alert: changing email or mobile sends an alert notification log to the employee.

**Never:**
- Never allow a Branch Manager to view or modify employees from another company.
- Never delete an employee who is linked to posted accounting records.

## I/O & Edge-Case Matrix

| Scenario | Input | Response Code | Response Body / Behavior |
| :--- | :--- | :--- | :--- |
| List Employees | GET `/api/company/employees` | HTTP 200 | Returns employees strictly belonging to manager's company |
| Add Employee | Valid employee data | HTTP 201 | Creates user, links to company with role, dispatches welcome notification |
| Duplicate Email/Mobile | Already registered email/mobile | HTTP 422 | `{"message": "البيانات مستخدمة بالفعل"}` |
| Edit Employee | Updated `name`, `mobile`, `role` | HTTP 200 | Updates employee, dispatches alert if mobile/email changed |
| Deactivate Employee | POST `/api/company/employees/{id}/toggle-status` | HTTP 200 | Sets status = 'inactive', revokes all tokens, blocks future logins |
| Delete with Posted Records | DELETE `/api/company/employees/{id}` with GL entries | HTTP 422 | `{"message": "لا يمكن حذف المحاسب لوجود قيود محاسبية مرتبطة به"}` |
| Delete without Records | DELETE `/api/company/employees/{id}` without records | HTTP 200 | Removes employee linkage from company |

</frozen-after-approval>

## Code Map

- `backend/app/Http/Controllers/Central/EmployeeController.php` -- Full employee CRUD, toggle-status, and audit deletion guard
- `backend/routes/api.php` -- Protected `/api/company/employees` endpoints
- `backend/tests/Feature/EmployeeManagementTest.php` -- Comprehensive feature tests for UC-12, UC-13, UC-14, UC-15
- `frontend/src/pages/company/EmployeeListPage.jsx` -- React employee management interface with filters, modals, and confirmations
- `frontend/src/App.jsx` -- Register `/company/employees` route
- `frontend/src/pages/dashboards/CompanyDashboard.jsx` -- Link to employee management

## Tasks & Acceptance

**Execution:**
- [ ] Implement `EmployeeController` with `index`, `store`, `update`, `toggleStatus`, and `destroy`.
- [ ] Implement immediate session eviction on deactivation and audit integrity check on deletion.
- [ ] Register routes in `backend/routes/api.php` under `auth:sanctum`.
- [ ] Write and verify feature test suite `EmployeeManagementTest.php`.
- [ ] Build React `EmployeeListPage` with search, role/status filters, add/edit modal, and confirmation dialogs.
- [ ] Register route in `frontend/src/App.jsx` and link in `CompanyDashboard.jsx`.
- [ ] Verify full build and test suite.

