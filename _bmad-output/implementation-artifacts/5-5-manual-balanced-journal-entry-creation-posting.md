---
title: "Story 5.5: Manual Balanced Journal Entry Creation & Posting"
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

**Problem:** Adjustments, opening balances, and asset depreciation require manual multi-line journal entries with strict balance verification and cost center enforcement.

**Approach:** Implement UC-49, UC-50, UC-51, UC-54 (`/api/journal-entries`). General Accountant creates multi-line entries with debits and credits. Enforce balance: $\text{Total Debit} - \text{Total Credit} = 0$ (error: `"القيد غير متوازن، إجمالي المدين يجب أن يساوي إجمالي الدائن"`). Enforce mandatory cost centers for accounts configured with `is_cost_center_mandatory`. Posted entries are immediately reflected in GL and Trial Balance, and are strictly immutable.

## Boundaries & Constraints

**Always:**
- $\sum \text{Debit} - \sum \text{Credit} = 0$.
- Mandatory cost center on flagged accounts.
- Posted entries cannot be edited or deleted (error: `"لا يمكن حذف قيد مرحّل"`).

</frozen-after-approval>

## Code Map

- `backend/app/Http/Controllers/Tenant/JournalEntryController.php` -- CRUD & balance validator
- `backend/app/Models/Tenant/JournalEntry.php` & `JournalEntryItem.php` -- Models
- `backend/tests/Feature/VoucherAndJournalEntryTest.php` -- `test_manual_balanced_journal_entry_posting_and_immutability`
- `frontend/src/pages/accounting/JournalEntriesPage.jsx` -- Dynamic multi-line editor & live balance checker

