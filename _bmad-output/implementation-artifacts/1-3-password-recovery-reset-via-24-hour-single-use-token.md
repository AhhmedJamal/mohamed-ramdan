---
title: "Story 1.3: Password Recovery & Reset via 24-Hour Single-Use Token"
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

**Problem:** Users across all roles who forget their credentials need a secure self-service password recovery flow that prevents unauthorized access, guarantees single-use token expiration (24 hours), provides rate limiting (60-second cooldown on resends), and prevents account takeover.

**Approach:** Implement `/api/auth/forgot-password` and `/api/auth/reset-password` in PHP Laravel with token tracking in `password_reset_tokens` on `central` connection, logging dispatch in `notification_logs`. On the React frontend, provide `/forgot-password` (UC-02) and `/reset-password` (UC-03) views with exact Arabic validation messages, countdown resend timers, and password confirmation checks.

## Boundaries & Constraints

**Always:**
- Email submission validation: required, valid email format. Error: `"يرجى إدخال بريد إلكتروني صحيح"`.
- Non-existent email error: `"البريد الإلكتروني غير مسجل في النظام"`.
- Success dispatch message: `"تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني"`.
- Cooldown rule: 60-second cooldown before allowing a resend request.
- Token validity: exactly 24 hours (`now()->addHours(24)`).
- Single-use enforcement: once a token is used, set `used_at = now()`. Attempting to reuse returns: `"اللينك مستخدم من قبل، يرجى طلب لينك جديد"`.
- Expired token: attempting to use after 24 hours returns: `"انتهت صلاحية اللينك، يرجى طلب لينك جديد"`.
- Password requirements: 8-25 characters, confirmation must match.
- Resetting password clears any lockouts (`failed_login_attempts = 0`, `lockout_until = null`) and updates `password` hash.

**Never:**
- Never allow a token to be reused once consumed.
- Never accept a password shorter than 8 or longer than 25 characters.

## I/O & Edge-Case Matrix

| Scenario | Input | Response Code | Response Body / Behavior |
| :--- | :--- | :--- | :--- |
| Valid Email | Registered `email` | HTTP 200 | Creates token (24h expiry), returns `"تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني"`, starts 60s cooldown |
| Resend < 60s | Same `email` within 60s | HTTP 429 | `{"message": "يرجى الانتظار قبل طلب رابط جديد", "cooldown_seconds": 45}` |
| Unknown Email | Unregistered email | HTTP 404 | `{"message": "البريد الإلكتروني غير مسجل في النظام"}` |
| Valid Reset | `email`, `token`, `password`, `password_confirmation` | HTTP 200 | Updates password hash, sets `used_at`, returns `"تم تغيير كلمة المرور بنجاح"` |
| Used Token | Used token | HTTP 410 | `{"message": "اللينك مستخدم من قبل، يرجى طلب لينك جديد"}` |
| Expired Token | Token older than 24h | HTTP 410 | `{"message": "انتهت صلاحية اللينك، يرجى طلب لينك جديد"}` |
| Password Mismatch | Confirmed password differs | HTTP 422 | `{"message": "كلمات المرور غير متطابقة"}` |

</frozen-after-approval>

## Code Map

- `backend/database/migrations/central/2026_01_01_000006_create_password_reset_tokens_table.php` -- Migration for token storage with `expires_at` and `used_at`
- `backend/app/Http/Controllers/Central/PasswordResetController.php` -- Forgot and Reset password actions
- `backend/routes/api.php` -- Routes for `/api/auth/forgot-password` and `/api/auth/reset-password`
- `backend/tests/Feature/PasswordRecoveryTest.php` -- Feature tests verifying all scenarios and edge cases
- `frontend/src/pages/auth/ForgotPasswordPage.jsx` -- View for UC-02 with 60-second cooldown timer
- `frontend/src/pages/auth/ResetPasswordPage.jsx` -- View for UC-03 with password match check and token handling
- `frontend/src/App.jsx` -- Register routes for `/forgot-password` and `/reset-password`

## Tasks & Acceptance

**Execution:**
- [x] Create `password_reset_tokens` migration in central schema.
- [x] Implement `PasswordResetController` with `forgotPassword` and `resetPassword` methods.
- [x] Register routes in `backend/routes/api.php`.
- [x] Implement feature test suite `PasswordRecoveryTest.php` covering all scenarios.
- [x] Build React `ForgotPasswordPage` with 60s countdown timer and exact validation messages.
- [x] Build React `ResetPasswordPage` with password matching validation and token parsing.
- [x] Register routes in `frontend/src/App.jsx`.
- [x] Verify automated tests and frontend build.
