---
title: "Story 4.3: Two-Step Contract Cancellation Workflow & Unit Release"
type: 'feature'
created: '2026-11-22'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - "docs/SRS- Mohamed Ramdan.md"
  - "_bmad-output/planning-artifacts/architecture/architecture-mohamed_ramdan-2026-11-22/ARCHITECTURE-SPINE.md"
  - "_bmad-output/planning-artifacts/ux/ux-mohamed_ramdan-2026-11-22/EXPERIENCE.md"
  - "_bmad-output/implementation-artifacts/epic-4-context.md"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Arbitrary termination of contracts causes revenue loss and unreleased inventory. A two-step maker-checker cancellation workflow is required so Data Entry cannot unilaterally cancel contracts.

**Approach:** Implement UC-41A (`requestCancellation`) and UC-42 (`approveCancellation` and `rejectCancellation`). Data Entry submits a cancellation request with mandatory reason $\ge 10$ characters, setting status to `pending_cancellation`. Only Branch Manager can approve (transitioning contract to `cancelled`, releasing the unit back to `vacant`, and cancelling unpaid installments) or reject with mandatory reason $\ge 10$ characters (reverting status to `active`).

## Boundaries & Constraints

**Always:**
- Maker: Data Entry initiates cancellation request with reason $\ge 10$ characters (error: `"يجب إدخال سبب الإلغاء بحيث لا يقل عن 10 أحرف"`).
- Checker: Branch Manager approves or rejects. Rejection requires reason $\ge 10$ characters (error: `"يجب إدخال سبب الرفض بحيث لا يقل عن 10 أحرف"`).
- Atomic unit release: on approval, `units.status` becomes `vacant`, and unpaid installments are cancelled.

</frozen-after-approval>

## Code Map

- `backend/app/Http/Controllers/Tenant/RentalContractController.php` -- `requestCancellation`, `approveCancellation`, `rejectCancellation`
- `backend/tests/Feature/RentalContractTest.php` -- `test_contract_cancellation_workflow_two_step`, `test_branch_manager_rejects_cancellation_with_mandatory_reason`
- `frontend/src/pages/contracts/ContractListPage.jsx` -- Two-step cancellation request and approval/rejection dialogs

