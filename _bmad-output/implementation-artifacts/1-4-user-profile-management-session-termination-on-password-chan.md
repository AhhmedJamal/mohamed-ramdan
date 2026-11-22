---
title: "Story 1.4: User Profile Management & Session Termination on Password Change"
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

**Problem:** Authenticated users across all four roles must be able to view and manage their personal contact details (Name, Mobile, Profile Picture) while keeping Email immutable from self-edit, and securely update their password with mandatory verification of their current password. To prevent compromised sessions, a password change must immediately invalidate all active authentication sessions across all devices.

**Approach:** Implement `/api/profile` (GET and PUT) and `/api/profile/change-password` (POST) in PHP Laravel on the central user model. Revoke all Sanctum tokens on password update (`$user->tokens()->delete()`). On the React frontend, provide a comprehensive Profile Management view with inline mobile validation (`05XXXXXXXX`), profile image upload (max 5MB), and password change modal with full session eviction handling.

## Boundaries & Constraints

**Always:**
- Name: required, min 3 chars, max 100 chars.
- Email: read-only in profile view (cannot be altered self-service).
- Mobile: required, 10 digits starting with `05` (`^05[0-9]{8}$`), unique in system. Error: `"رقم الجوال يجب أن يتكون من 10 أرقام ويبدأ بـ 05"`. Duplicate error: `"رقم الجوال مستخدم بالفعل"`.
- Profile Picture: optional, image formats (jpeg, png, jpg), max 5MB.
- Change Password:
  - Current password required; invalid current password returns: `"كلمة المرور الحالية غير صحيحة"`.
  - New password: required, 8-25 characters.
  - Confirmation: must match new password; mismatch returns: `"كلمات المرور غير متطابقة"`.
  - **Immediate Multi-Device Session Eviction**: upon successful password update, all existing tokens of the user must be deleted from `personal_access_tokens`, and client state cleared, redirecting to `/login`.

**Never:**
- Never allow a user to modify their email address from their profile.
- Never retain active tokens after a password change.

## I/O & Edge-Case Matrix

| Scenario | Input | Response Code | Response Body / Behavior |
| :--- | :--- | :--- | :--- |
| View Profile | GET `/api/profile` | HTTP 200 | Returns name, email, mobile, profile_picture, role, company |
| Update Profile | `name`, `mobile` (valid) | HTTP 200 | Updates profile, dispatches notification if mobile changed, returns success |
| Duplicate Mobile | `mobile` owned by another user | HTTP 422 | `{"message": "رقم الجوال مستخدم بالفعل"}` |
| Invalid Mobile Format | `mobile` not matching `05XXXXXXXX` | HTTP 422 | `{"message": "رقم الجوال يجب أن يتكون من 10 أرقام ويبدأ بـ 05"}` |
| Change Pass - Bad Current | Wrong current password | HTTP 400 | `{"message": "كلمة المرور الحالية غير صحيحة"}` |
| Change Pass - Mismatch | New pass != confirmation | HTTP 422 | `{"message": "كلمات المرور غير متطابقة"}` |
| Change Pass - Success | Valid current & new pass | HTTP 200 | Hashes new password, revokes ALL user tokens, returns `"تم تغيير كلمة المرور بنجاح، تم إنهاء جميع الجلسات النشطة"` |

</frozen-after-approval>

## Code Map

- `backend/app/Http/Controllers/Central/ProfileController.php` -- Profile retrieval, updating, and password change endpoints
- `backend/routes/api.php` -- Protected `/api/profile` and `/api/profile/change-password` routes
- `backend/tests/Feature/UserProfileTest.php` -- Feature tests for UC-05 and UC-06
- `frontend/src/pages/profile/ProfilePage.jsx` -- React profile view with edit form, image upload, and change password dialog
- `frontend/src/App.jsx` -- Register `/profile` route
- `frontend/src/components/AppLayout.jsx` -- Add profile navigation link in header user menu

## Tasks & Acceptance

**Execution:**
- [x] Implement `ProfileController` with `getProfile`, `updateProfile`, and `changePassword`.
- [x] Implement immediate token revocation (`$user->tokens()->delete()`) upon password change.
- [x] Register routes in `backend/routes/api.php` under `auth:sanctum`.
- [x] Write and verify automated feature tests `UserProfileTest.php`.
- [x] Build React `ProfilePage` with responsive RTL layout, mobile validation, and change password modal.
- [x] Update `AppLayout` with profile link and avatar.
- [x] Verify frontend build and automated tests.
