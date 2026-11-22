---
title: "Story 1.5: Super Admin Company Creation & Isolated DB Provisioning"
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

**Problem:** Super Admin needs to establish new corporate entities under Mohamed Ramadan Group without manual database operations. Each new company must have its own isolated database schema, inherited root Chart of Accounts (12 root accounts), and an appointed Branch Manager with welcome credentials.

**Approach:** Implement `POST /api/admin/companies` in PHP Laravel. Validate company details and manager credentials against duplicate checks in the central database. Use `TenantManager` to dynamically provision the tenant database, run all tenant migrations, and seed the 12 immutable root accounts. Create/link the branch manager with role `branch_manager` and log welcome credentials in `notification_logs`. On React frontend, build the Create Company modal/page with dependent dropdowns (Country/City) and exact Arabic validations.

## Boundaries & Constraints

**Always:**
- Actor: Super Admin only (`role === 'super_admin'`). Non-super-admins receive HTTP 403.
- Company name: required, 3-100 chars, unique. Duplicate error: `"اسم الشركة مستخدم بالفعل"`.
- Trade activity, address, country, city: required.
- Tax number: optional, valid format.
- Subdomain: required, unique, lowercase alphanumeric.
- Manager details: name, email (unique), mobile (10 digits starting 05, unique). Duplicate error: `"البيانات مستخدمة بالفعل"`.
- Provisioning: automatically execute tenant schema migrations and seed 12 fixed root accounts.
- If provisioning fails: roll back company creation and return HTTP 500: `"حدث خطأ أثناء إنشاء الشركة، يرجى المحاولة مرة أخرى"`.

**Never:**
- Never allow non-Super Admin users to provision companies.
- Never reuse existing database files or schemas without clean initialization.

## I/O & Edge-Case Matrix

| Scenario | Input | Response Code | Response Body / Behavior |
| :--- | :--- | :--- | :--- |
| Valid Creation | Full company + manager data | HTTP 201 | Provisions DB, seeds 12 root accounts, links manager, returns created company |
| Duplicate Company Name | Existing company name | HTTP 422 | `{"message": "اسم الشركة مستخدم بالفعل"}` |
| Duplicate Manager Email | Email used by another user | HTTP 422 | `{"message": "البيانات مستخدمة بالفعل"}` |
| Duplicate Manager Mobile | Mobile used by another user | HTTP 422 | `{"message": "البيانات مستخدمة بالفعل"}` |
| Non-Super Admin | Token of accountant / manager | HTTP 403 | `{"message": "غير مصرح لك بتنفيذ هذا الإجراء"}` |

</frozen-after-approval>

## Code Map

- `backend/app/Services/TenantManager.php` -- Added `provisionTenantDatabase(Company $company)` method
- `backend/app/Http/Controllers/Central/CompanyController.php` -- Company creation (`store`), listing (`index`), and freeze/activate actions
- `backend/routes/api.php` -- Protected `/api/admin/companies` endpoints
- `backend/tests/Feature/CompanyProvisioningTest.php` -- Automated feature tests covering UC-07
- `frontend/src/pages/admin/CreateCompanyPage.jsx` -- Company creation form with dependent dropdowns and manager inputs
- `frontend/src/App.jsx` -- Register `/admin/companies/create`
- `frontend/src/pages/dashboards/AdminDashboard.jsx` -- Added direct link to company creation

## Tasks & Acceptance

**Execution:**
- [x] Add `provisionTenantDatabase` to `TenantManager`.
- [x] Implement `CompanyController@store` with validation and error strings matching SRS UC-07.
- [x] Create `AdminAccessMiddleware` or gate to protect `/api/admin/*` routes strictly for `super_admin`.
- [x] Register routes in `backend/routes/api.php`.
- [x] Implement and pass feature test suite `CompanyProvisioningTest.php`.
- [x] Build React `CreateCompanyPage` with country/city dependent dropdowns and manager credentials.
- [x] Register route in `frontend/src/App.jsx` and add quick-action link in `AdminDashboard.jsx`.
- [x] Verify automated tests and frontend build.
