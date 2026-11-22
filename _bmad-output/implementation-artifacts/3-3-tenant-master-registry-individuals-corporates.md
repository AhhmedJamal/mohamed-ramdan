---
title: "Story 3.3: Tenant Master Registry (Individuals & Corporates)"
type: 'feature'
created: '2026-11-22'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - "docs/SRS- Mohamed Ramdan.md"
  - "_bmad-output/planning-artifacts/architecture/architecture-mohamed_ramdan-2026-11-22/ARCHITECTURE-SPINE.md"
  - "_bmad-output/planning-artifacts/ux/ux-mohamed_ramdan-2026-11-22/EXPERIENCE.md"
  - "_bmad-output/implementation-artifacts/epic-3-context.md"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Leasing and installment tracking rely on accurate tenant master data. Duplicate National IDs / CRs or non-validated mobile numbers compromise notifications and legal validity. Furthermore, altering a tenant's National ID or deleting a tenant record with existing contracts undermines rental contract enforceability and voucher attribution.

**Approach:** Implement `/api/tenants` (CRUD) in PHP Laravel operating on the tenant database. Enforce strict uniqueness on `national_id_or_cr` (`"رقم الهوية مستخدم بالفعل"`) and `email` (`"البريد الإلكتروني مستخدم بالفعل"`). Enforce 10-digit Saudi mobile format starting with `05` (`"يرجى إدخال رقم جوال صحيح يبدأ بـ 05 ويتكون من 10 أرقام"`). Protect linked records: prevent changing `national_id_or_cr` if contracts exist (`"لا يمكن تغيير رقم الهوية لوجود عقود مرتبطة"`), and block deleting any tenant with contracts (`"لا يمكن حذف المستأجر لوجود عقود إيجار مرتبطة به"`). On React frontend, build `/data-entry/tenants` with tenant directory, search, type badges (Individual vs Company), active contract count, Add/Edit modal, and deletion confirmation dialog.

## Boundaries & Constraints

**Always:**
- Actor: Data Entry (`role === 'data_entry'`) or Super Admin has CRUD. Branch Manager and General Accountant have Read-Only.
- Tenant types: `individual` (فرد) or `company` (شركة).
- National ID / Commercial Registration: unique per tenant database.
- Mobile: 10 digits starting with `05`.
- Deletion blocked if any rental contracts exist (error: `"لا يمكن حذف المستأجر لوجود عقود إيجار مرتبطة به"`).
- Changing National ID / CR blocked if contracts exist (error: `"لا يمكن تغيير رقم الهوية لوجود عقود مرتبطة"`).

**Never:**
- Never delete a tenant who has signed contracts.
- Never duplicate national IDs or CR numbers.

## I/O & Edge-Case Matrix

| Scenario | Input | Response Code | Response Body / Behavior |
| :--- | :--- | :--- | :--- |
| List Tenants | GET `/api/tenants` | HTTP 200 | Returns tenants with active contract count |
| Add Tenant | POST `/api/tenants` with valid individual/corporate data | HTTP 201 | Creates tenant record |
| Duplicate National ID | POST with existing `national_id_or_cr` | HTTP 422 | `{"message": "رقم الهوية مستخدم بالفعل"}` |
| Duplicate Email | POST with existing `email` | HTTP 422 | `{"message": "البريد الإلكتروني مستخدم بالفعل"}` |
| Invalid Mobile | POST with invalid mobile | HTTP 422 | `{"message": "يرجى إدخال رقم جوال صحيح يبدأ بـ 05 ويتكون من 10 أرقام"}` |
| Edit Tenant National ID with Contracts | PUT modifying `national_id_or_cr` with contracts | HTTP 422 | `{"message": "لا يمكن تغيير رقم الهوية لوجود عقود مرتبطة"}` |
| Delete Tenant with Contracts | DELETE tenant with contracts | HTTP 422 | `{"message": "لا يمكن حذف المستأجر لوجود عقود إيجار مرتبطة به"}` |
| Delete Tenant without Contracts | DELETE unused tenant | HTTP 200 | `{"message": "تم حذف المستأجر بنجاح"}` |

</frozen-after-approval>

## Code Map

- `backend/app/Http/Controllers/Tenant/TenantMasterController.php` -- Tenant CRUD, validations, contract safeguards
- `backend/routes/api.php` -- Register `/api/tenants` endpoints
- `backend/tests/Feature/TenantMasterTest.php` -- Comprehensive feature tests verifying UC-33, UC-34, UC-35, UC-36
- `frontend/src/pages/tenants/TenantListPage.jsx` -- React tenant directory and management interface
- `frontend/src/App.jsx` -- Register `/data-entry/tenants` route
- `frontend/src/pages/dashboards/DataEntryDashboard.jsx` -- Link to tenant registry
