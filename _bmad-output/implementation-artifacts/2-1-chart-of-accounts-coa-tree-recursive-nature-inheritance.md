---
title: "Story 2.1: Chart of Accounts (COA) Tree & Recursive Nature Inheritance"
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

**Problem:** Financial integrity requires a standardized Chart of Accounts (COA) enforcing double-entry rules. Sub-accounts must inherit their nature (Debit/Credit) recursively from root types, fixed root accounts cannot be altered or deleted, and accounts with posted journal entries or child accounts cannot be deleted or have their nature modified. Asset accounts require depreciation parameters (straight-line or declining-balance).

**Approach:** Implement `/api/accounts` (CRUD, tree hierarchy, balance calculation) in PHP Laravel operating on the dynamic tenant connection. Enforce the 12 immutable root accounts seeded per tenant. When creating/updating sub-accounts, inherit `nature` and `root_type` automatically. If posted transactions exist, block deletion with `"لا يمكن حذف الحساب لوجود قيود مرتبطة به"` and block nature changes. If the account is a fixed root, block deletion with `"لا يمكن حذف الحساب الرئيسي"`. On React frontend, build `/accounting/chart-of-accounts` with collapsible tree view, nature badges, search filter, Add/Edit modal, and depreciation fields for assets.

## Boundaries & Constraints

**Always:**
- Actor: General Accountant (`role === 'general_accountant'`) has CRUD; Branch Manager and Data Entry have Read-Only (Section 1.6 matrix).
- 12 Root Accounts are immutable: cannot be deleted or modified (`is_fixed_root === true`).
- Recursive Nature Inheritance:
  - Assets (الأصول): Debit
  - Liabilities (الخصوم): Credit
  - Equity (حقوق الملكية): Credit
  - Expenses (المصروفات): Debit
  - Revenues (الإيرادات): Credit
  - Purchases (المشتريات): Debit
  - Sales (المبيعات): Credit
  - Purchase Returns (مردودات المشتريات): Credit
  - Sales Returns (مردودات المبيعات): Debit
  - Withdrawals (المسحوبات): Debit
  - Discounts Allowed (خصم مسموح به): Debit
  - Discounts Earned (خصم مكتسب): Credit
- Opening balance $\ge 0$.
- Asset accounts support: Depreciation Method (`straight_line`, `declining_balance`), purchase price, depreciation rate, useful life, scrap value.
- Exact Arabic error messages:
  - Cannot delete root: `"لا يمكن حذف الحساب الرئيسي"`
  - Cannot delete with child accounts: `"لا يمكن حذف حساب لديه حسابات فرعية"`
  - Cannot delete with transactions: `"لا يمكن حذف الحساب لوجود قيود مرتبطة به"`
  - Empty COA: `"لم يتم إنشاء حسابات بعد"`

**Never:**
- Never allow deletion or re-nature of fixed root accounts.
- Never change the nature of an account if posted journal entries or vouchers exist.
- Never delete an account with linked transactions.

## I/O & Edge-Case Matrix

| Scenario | Input | Response Code | Response Body / Behavior |
| :--- | :--- | :--- | :--- |
| List COA Tree | GET `/api/accounts` | HTTP 200 | Returns accounts structured as tree and flat list with current balances |
| Add Sub-Account | POST `/api/accounts` with valid data | HTTP 201 | Creates account, inherits nature/root_type from parent/root |
| Add Asset Account | POST `/api/accounts` under assets | HTTP 201 | Stores depreciation method, purchase price, rate, scrap value |
| Duplicate Account Name | POST `/api/accounts` with existing name | HTTP 422 | `{"message": "اسم الحساب مستخدم بالفعل"}` |
| Attempt Delete Root | DELETE `/api/accounts/{rootId}` | HTTP 422 | `{"message": "لا يمكن حذف الحساب الرئيسي"}` |
| Attempt Delete Parent | DELETE `/api/accounts/{id}` with sub-accounts | HTTP 422 | `{"message": "لا يمكن حذف حساب لديه حسابات فرعية"}` |
| Attempt Delete Linked | DELETE `/api/accounts/{id}` with journal entries | HTTP 422 | `{"message": "لا يمكن حذف الحساب لوجود قيود مرتبطة به"}` |
| Attempt Change Nature Linked | PUT `/api/accounts/{id}` altering nature with GL entries | HTTP 422 | `{"message": "لا يمكن تغيير طبيعة الحساب لوجود قيود مرحّلة مرتبطة به"}` |

</frozen-after-approval>

## Code Map

- `backend/database/migrations/tenant/2026_01_01_000011_enhance_accounts_and_cost_centers_table.php` -- Schema enhancement
- `backend/app/Models/Tenant/Account.php` -- Tenant Account model with hierarchy and relationships
- `backend/app/Http/Controllers/Tenant/AccountController.php` -- COA Tree, CRUD, validation, and audit safeguards
- `backend/routes/api.php` -- Register `/api/accounts` routes
- `backend/tests/Feature/ChartOfAccountsTest.php` -- Feature tests verifying all use cases and edge cases
- `frontend/src/pages/accounting/ChartOfAccountsPage.jsx` -- Interactive tree UI, modals, validations
- `frontend/src/App.jsx` -- Routing setup for `/accounting/chart-of-accounts`
- `frontend/src/components/layout/AppLayout.jsx` -- Navigation links for accounting
