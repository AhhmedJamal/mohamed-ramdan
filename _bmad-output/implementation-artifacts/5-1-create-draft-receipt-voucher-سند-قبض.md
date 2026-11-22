---
title: "Story 5.1: Create Draft Receipt Voucher (سند قبض)"
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

**Problem:** Recording rent payments without linkage to rental contracts and installment milestones leads to untraceable cash collections and inaccurate tenant balances.

**Approach:** Implement UC-43 (`/api/vouchers/receipt`). Data Entry selects an active contract and an unpaid installment, enters the collected amount (validated $\le$ remaining due amount; error: `"المبلغ يتجاوز قيمة الدفعة المتبقية"`), collection date, payment method, and accounts. The cost center is automatically inherited from the contract's property. The voucher is saved as a `draft` without affecting financial statements until accountant approval.

## Boundaries & Constraints

**Always:**
- Maker: Data Entry creates drafts (`role === 'data_entry'`).
- Amount cannot exceed the remaining due amount of the installment.
- Cost center is auto-inherited from contract property.
- Status is strictly `draft`.

</frozen-after-approval>

## Code Map

- `backend/app/Http/Controllers/Tenant/VoucherController.php` -- `storeReceipt`
- `backend/app/Models/Tenant/Voucher.php` -- Model and Arabic labels
- `backend/tests/Feature/VoucherAndJournalEntryTest.php` -- `test_data_entry_can_create_draft_receipt_and_disbursement_vouchers`
- `frontend/src/pages/vouchers/CreateReceiptVoucherPage.jsx` -- Receipt voucher entry interface

