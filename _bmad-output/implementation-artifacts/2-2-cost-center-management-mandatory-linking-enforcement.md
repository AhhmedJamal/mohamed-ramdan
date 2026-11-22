---
title: "Story 2.2: Cost Center Management & Mandatory Linking Enforcement"
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

**Problem:** Accurate financial reporting by building (Per-Building Income Statement UC-63) and contracting project requires strict cost-center tracking. Without mandatory cost center enforcement on operational revenue and expense accounts, accounting entries can be posted without attribution, corrupting building-level profitability. Furthermore, changing a cost center's type or deleting a cost center that has active transactions compromises audit integrity.

**Approach:** Implement `/api/cost-centers` (CRUD, status toggle, account linking configuration) in PHP Laravel operating on the dynamic tenant database. Validate that names are unique, types are strictly `property` or `contracting_project`, and status is `active` or `inactive`. For UC-23, support configuring accounts with `is_cost_center_mandatory = true` and selecting allowed cost centers. Implement backend validation blocking any voucher or journal entry that touches a mandatory-linking account without a valid cost center (`"يجب تحديد مركز التكلفة لهذا الحساب"`). On React frontend, build `/accounting/cost-centers` with list view, search, add/edit modal, status toggle, account linking drawer/modal, and confirmation dialogs.

## Boundaries & Constraints

**Always:**
- Actor: General Accountant (`role === 'general_accountant'`) has CRUD; Branch Manager and Data Entry have Read-Only (Section 1.6 matrix).
- Cost center types: strictly `property` (عقار) or `contracting_project` (مشروع مقاولات).
- Cost center name must be unique (3-100 chars; duplicate error: `"اسم مركز التكلفة مستخدم بالفعل"`).
- Deletion blocked if linked transactions exist: error `"لا يمكن حذف مركز تكلفة له قيود مرتبطة"`.
- Type modification blocked if linked transactions exist.
- Mandatory cost center linking: when an account has `is_cost_center_mandatory = true`, any voucher or journal item referencing this account without `cost_center_id` returns HTTP 422: `"يجب تحديد مركز التكلفة لهذا الحساب"`.

**Never:**
- Never allow non-accountants to modify cost centers or linking rules.
- Never delete a cost center with linked vouchers, journal entries, properties, or contractor invoices.

## I/O & Edge-Case Matrix

| Scenario | Input | Response Code | Response Body / Behavior |
| :--- | :--- | :--- | :--- |
| List Cost Centers | GET `/api/cost-centers` | HTTP 200 | Returns array of cost centers with type, status, and linked accounts count |
| Add Cost Center | POST `/api/cost-centers` with valid data | HTTP 201 | Creates cost center, auto-generates sequential code (CC-PROP-xxx / CC-PROJ-xxx) |
| Duplicate Name | POST `/api/cost-centers` with existing name | HTTP 422 | `{"message": "اسم مركز التكلفة مستخدم بالفعل"}` |
| Edit Cost Center | PUT `/api/cost-centers/{id}` | HTTP 200 | Updates name, description, status |
| Change Type with Transactions | PUT `/api/cost-centers/{id}` altering `type` with GL items | HTTP 422 | `{"message": "لا يمكن تغيير نوع مركز التكلفة لوجود قيود مرتبطة به"}` |
| Delete with Transactions | DELETE `/api/cost-centers/{id}` with GL items or vouchers | HTTP 422 | `{"message": "لا يمكن حذف مركز تكلفة له قيود مرتبطة"}` |
| Delete without Transactions | DELETE `/api/cost-centers/{id}` unused | HTTP 200 | `{"message": "تم حذف مركز التكلفة بنجاح"}` |
| Toggle Status | POST `/api/cost-centers/{id}/toggle-status` | HTTP 200 | Flips status between active and inactive |
| Configure Account Linking (UC-23) | POST `/api/cost-centers/link-account` with `account_id`, `is_mandatory`, `allowed_cost_center_ids` | HTTP 200 | Updates `is_cost_center_mandatory` and syncs `account_cost_centers` |

</frozen-after-approval>

## Code Map

- `backend/app/Http/Controllers/Tenant/CostCenterController.php` -- Full cost center CRUD, toggle-status, and account-linking logic
- `backend/routes/api.php` -- Register `/api/cost-centers` endpoints
- `backend/tests/Feature/CostCenterManagementTest.php` -- Automated feature tests verifying UC-19B, UC-20, UC-21, UC-22, UC-23
- `frontend/src/pages/accounting/CostCentersPage.jsx` -- React UI for cost centers and mandatory linking
- `frontend/src/App.jsx` -- Register `/accounting/cost-centers` route
- `frontend/src/pages/dashboards/AccountingDashboard.jsx` -- Link to cost centers page
