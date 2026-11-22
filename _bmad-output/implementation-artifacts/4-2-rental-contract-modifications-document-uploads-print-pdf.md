---
title: "Story 4.2: Rental Contract Modifications, Document Uploads & Print/PDF"
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

**Problem:** Contract modifications without financial safeguards can cause inconsistency in installment tracking. Paper contracts require digital archiving, and users require printable formal contracts with complete installment schedules.

**Approach:** Implement contract modification safeguards in `RentalContractController.php` (block modifying expired contracts `"لا يمكن تعديل عقد منتهي"` and cancelled contracts `"لا يمكن تعديل عقد ملغي"`). Automatically recalculate future unpaid installments when total rent or collection cycle changes. Implement document upload and attachment management supporting PDF, PNG, JPEG up to 5MB and up to 10 files per contract (UC-41). Implement formal printable contract and PDF view with full financial breakdown, installment schedules, and signature blocks (UC-40).

## Boundaries & Constraints

**Always:**
- Actor: Data Entry has CRUD on attachments and update on active contracts.
- Expired contracts cannot be modified (error: `"لا يمكن تعديل عقد منتهي"`).
- Attachments: PNG, JPEG, PDF, max 5MB, max 10 attachments per contract.
- Print format: includes full contract details, landlord/tenant identities, installment milestones, and signature spaces.

</frozen-after-approval>

## Code Map

- `backend/app/Http/Controllers/Tenant/RentalContractController.php` -- `update`, `uploadAttachment`, `deleteAttachment`
- `backend/app/Models/Tenant/ContractAttachment.php` -- Attachment model
- `backend/tests/Feature/RentalContractTest.php` -- `test_cannot_update_expired_contract`, `test_contract_attachment_upload_and_deletion`
- `frontend/src/pages/contracts/ContractDetailsPage.jsx` -- Formal print layout & attachments manager

