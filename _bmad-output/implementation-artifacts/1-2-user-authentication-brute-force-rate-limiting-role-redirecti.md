---
title: "Story 1.2: User Authentication, Brute-Force Rate Limiting & Role Redirection"
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

**Problem:** The ERP system serves 4 internal actor roles (`super_admin`, `branch_manager`, `general_accountant`, `data_entry`) who access the application through a unified URL. The system must authenticate users securely from the central database, protect against brute-force attacks via a 5-attempt/15-minute lockout, reject frozen-company employees, and immediately direct users to their designated role dashboards.

**Approach:** Implement a robust authentication controller in Laravel using Laravel Sanctum for API token issuance and custom lockout tracking in `users` (`failed_login_attempts`, `lockout_until`). On the React frontend, build an accessible, RTL Arabic login form with visibility toggle, client-side validation adhering to exact SRS rules, and seamless role-based routing.

## Boundaries & Constraints

**Always:**
- Email validation: required, valid email format, max 100 characters, error: `"يرجى إدخال بريد إلكتروني صحيح"`.
- Password validation: required, 8-25 characters, error: `"يرجى إدخال كلمة المرور"`.
- Invalid credentials error: `"بيانات الدخول غير صحيحة"`.
- Inactive/deactivated account error: `"لا يمكن الوصول إلى الحساب"`.
- Frozen company check: if user belongs to a frozen company, deny with HTTP 403 and message: `"الشركة مجمدة، يرجى مراجعة الإدارة"`.
- Brute-force rule: exactly 5 consecutive failed attempts lock the account for 15 minutes.
- Role-based redirect URLs:
  - `super_admin` -> `/admin/dashboard`
  - `branch_manager` -> `/company/dashboard`
  - `general_accountant` -> `/accounting/dashboard`
  - `data_entry` -> `/data-entry/dashboard`

**Never:**
- Never expose passwords or raw hashes in API responses.
- Never allow a deactivated user or an employee of a frozen company to authenticate.
- Never redirect to arbitrary or unverified role paths.

## I/O & Edge-Case Matrix

| Scenario | Input | Response Code | Response Body / Behavior |
| :--- | :--- | :--- | :--- |
| Valid Super Admin | `email`, `password` | HTTP 200 | Returns token, user info, role `super_admin`, redirects to `/admin/dashboard` |
| Valid Branch Manager | `email`, `password` | HTTP 200 | Returns token, user info, role `branch_manager`, company info, redirects to `/company/dashboard` |
| Valid Accountant | `email`, `password` | HTTP 200 | Returns token, user info, role `general_accountant`, redirects to `/accounting/dashboard` |
| Valid Data Entry | `email`, `password` | HTTP 200 | Returns token, user info, role `data_entry`, redirects to `/data-entry/dashboard` |
| Bad Password | `email`, incorrect pass | HTTP 401 | `{"message": "بيانات الدخول غير صحيحة"}` (increments `failed_attempts`) |
| 5 Failed Attempts | 5th consecutive bad pass | HTTP 429 | `{"message": "تم تعليق الحساب مؤقتاً لمدة 15 دقيقة بسبب تكرار المحاولات الخاطئة"}` |
| Locked Account | Login during 15-min lockout | HTTP 429 | `{"message": "تم تعليق الحساب مؤقتاً لمدة 15 دقيقة بسبب تكرار المحاولات الخاطئة"}` |
| Deactivated User | `status = 'inactive'` | HTTP 403 | `{"message": "لا يمكن الوصول إلى الحساب"}` |
| Frozen Company | User linked to `status = 'frozen'` company | HTTP 403 | `{"message": "الشركة مجمدة، يرجى مراجعة الإدارة"}` |

</frozen-after-approval>

## Code Map

- `backend/app/Http/Controllers/Central/AuthController.php` -- Authentication endpoints (`login`, `me`, `logout`)
- `backend/app/Models/Central/User.php` -- Central user model with authentication, failed attempts counter, and lockout logic
- `backend/routes/api.php` -- Public `/api/auth/login` and authenticated `/api/auth/me`, `/api/auth/logout` routes
- `backend/tests/Feature/UserAuthenticationTest.php` -- Comprehensive feature tests for UC-01
- `frontend/src/context/AuthContext.jsx` -- React authentication state provider
- `frontend/src/pages/auth/LoginPage.jsx` -- RTL login view with input validation and password toggle
- `frontend/src/components/ProtectedRoute.jsx` -- Role-based route guard
- `frontend/src/pages/dashboards/` -- Dedicated dashboards for Super Admin, Branch Manager, Accountant, Data Entry
- `frontend/src/App.jsx` -- Router configuration with role-based routing

## Tasks & Acceptance

**Execution:**
- [x] Create `AuthController` with `login`, `me`, and `logout` actions.
- [x] Implement failed login tracking (5 attempts limit -> 15 min lock) on `User` model.
- [x] Implement company freeze verification for branch managers and tenant employees.
- [x] Register routes in `backend/routes/api.php`.
- [x] Write backend automated feature tests covering all 8 scenarios in `UserAuthenticationTest.php`.
- [x] Build React `AuthContext` and token storage.
- [x] Build React `LoginPage` with exact SRS Arabic validation messages, password visibility toggle, and disabled submit state until valid.
- [x] Add role-based protected routes and dummy dashboard landing views for all 4 roles.
- [x] Verify full build and end-to-end test execution.
