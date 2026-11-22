---
title: "Story 5.4: Accountant Voucher Rejection with Mandatory Reason & Maker Resubmission"
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

**Problem:** Vouchers with inaccurate amounts or missing invoice evidence need a transparent audit trail with feedback to the maker, rather than silent deletion.

**Approach:** Implement UC-48 (`/api/vouchers/{id}/reject`) and UC-45 (`update`). General Accountant can reject a draft voucher by providing a mandatory rejection reason $\ge 10$ characters (error: `"يجب إدخال سبب الرفض بحيث لا يقل عن 10 أحرف"`). The voucher status becomes `rejected`. Data Entry views the reason, amends the fields, and resubmits, which transitions the status back to `draft` for a new review iteration.

## Boundaries & Constraints

**Always:**
- Rejection reason is mandatory and $\ge 10$ characters.
- Rejected voucher reverts to `draft` upon modification by Data Entry.

</frozen-after-approval>

## Code Map

- `backend/app/Http/Controllers/Tenant/VoucherController.php` -- `reject`, `update`
- `backend/tests/Feature/VoucherAndJournalEntryTest.php` -- `test_accountant_rejects_voucher_with_reason_and_data_entry_resubmits`
- `frontend/src/pages/vouchers/VoucherListPage.jsx` -- Rejection modal and reason display

