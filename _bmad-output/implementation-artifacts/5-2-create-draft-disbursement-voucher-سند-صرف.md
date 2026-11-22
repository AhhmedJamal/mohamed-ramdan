---
title: "Story 5.2: Create Draft Disbursement Voucher (سند صرف)"
type: 'feature'
created: '2026-11-22'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - "docs/SRS- Mohamed Ramdan.md"
  - "_bmad-output/planning-artifacts/architecture/architecture-mohamed_ramdan-2026-11-22/ARCHITECTURE-SPINE.md"
  - "_bmad-output/planning-artifacts/ux/ux-mohamed_ramdan-2026-11-22/EXPERIENCE.md"
  - "_bmad-output/implementation-artifacts/epic-5-context.md"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Operational disbursements (maintenance, electricity, water, salaries) recorded without cost centers and Maker-Checker verification risk budget leaks and improper expense attribution.

**Approach:** Implement UC-44 (`/api/vouchers/disbursement`). Data Entry selects expense type (`maintenance`, `electricity`, `water`, `rent`, `salaries`, `other`), enters amount ($>0$), expense date, mandatory cost center, debit expense account, credit payment account, and payment method. Saved as a `draft` awaiting General Accountant review.

## Boundaries & Constraints

**Always:**
- Amount must be $>0$ (error: `"المبلغ يجب أن يكون أكبر من 0"`).
- Mandatory cost center linking.
- Status is strictly `draft`.

</frozen-after-approval>

## Code Map

- `backend/app/Http/Controllers/Tenant/VoucherController.php` -- `storeDisbursement`
- `backend/tests/Feature/VoucherAndJournalEntryTest.php` -- `test_data_entry_can_create_draft_receipt_and_disbursement_vouchers`
- `frontend/src/pages/vouchers/CreateDisbursementVoucherPage.jsx` -- Disbursement voucher entry interface

