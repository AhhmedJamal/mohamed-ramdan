---
title: "Story 5.3: Accountant Voucher Queue Audit, Approve & Auto-Post Balanced Journal Entry"
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

**Problem:** Direct manual ledger posting by operational staff causes imbalances and bypasses audit oversight.

**Approach:** Implement UC-47 (`/api/vouchers/{id}/approve`). Only General Accountant can approve drafts. The system verifies that the transaction date is in an open fiscal period (error: `"الفترة المالية مغلقة، لا يمكن إضافة أو تعديل قيود بها"`). Upon approval, the system atomically:
1. Transitions voucher status to `approved`.
2. Generates an immutable balanced Journal Entry ($\text{Debit} - \text{Credit} = 0$).
3. Posts the journal entry directly to the General Ledger (`status = 'posted'`).
4. Updates linked installment `paid_amount` and transitions status to `paid` if fully covered.

## Boundaries & Constraints

**Always:**
- Checker: General Accountant or Super Admin only.
- Strict period lock interceptor: cannot approve in a closed fiscal period.
- Journal Entry balance: `total_debit === total_credit`.
- Immutability: once approved, cannot be modified or deleted.

</frozen-after-approval>

## Code Map

- `backend/app/Http/Controllers/Tenant/VoucherController.php` -- `approve`
- `backend/tests/Feature/VoucherAndJournalEntryTest.php` -- `test_accountant_approves_voucher_generates_balanced_journal_entry`
- `frontend/src/pages/vouchers/VoucherListPage.jsx` -- Accountant review queue & one-click approval

