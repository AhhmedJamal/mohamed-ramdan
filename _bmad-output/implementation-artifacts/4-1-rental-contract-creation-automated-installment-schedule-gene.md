---
title: "Story 4.1: Rental Contract Creation & Automated Installment Schedule Generation"
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

**Problem:** Manual generation of leasing contracts and installment payment plans leads to calculation discrepancies, missed rent reminders, double bookings of units, and inconsistent financial obligations.

**Approach:** Build `/api/contracts` in PHP Laravel operating on the isolated tenant database. Implement `InstallmentScheduleService` that deterministically calculates payment milestones based on the collection cycle (`monthly`, `quarterly`, `semi_annual`, `annual`) and duration. Ensure atomic transactions where contract creation transitions unit status to `occupied`, prevents leasing already occupied units (`"الوحدة مشغولة بعقد آخر"`), validates dates (`"تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية"`), and creates all installment rows. On the React frontend, provide contract directory with status filters (ساري، متأخر، منتهي، ملغي) and a creation wizard with interactive property/unit cascades, cycle selectors, and live installment preview.

## Boundaries & Constraints

**Always:**
- Actor: Data Entry (`role === 'data_entry'`) or Super Admin creates contracts. Branch Manager and Accountant have Read-Only.
- Unit validation: unit must belong to the selected property and must have status `vacant`. Occupied or maintenance units cannot be contracted (`"الوحدة مشغولة بعقد آخر"`).
- Date validation: `end_date > start_date` (error: `"تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية"`).
- Collection cycle: `monthly`, `quarterly`, `semi_annual`, `annual`.
- Atomic unit transition: upon successful contract creation, `units.status` becomes `occupied`.
- Installment schedule:
  - Installment total sum must strictly equal `total_rent`.
  - Due dates follow cycle offsets from `start_date`.

**Never:**
- Never create a contract on an occupied unit.
- Never produce installment totals that differ from `total_rent`.

## I/O & Edge-Case Matrix

| Scenario | Input | Response Code | Response Body / Behavior |
| :--- | :--- | :--- | :--- |
| List Contracts | GET `/api/contracts` | HTTP 200 | Returns contracts with tenant, property, unit, installments summary |
| Create Contract | POST `/api/contracts` with valid parameters | HTTP 201 | Creates contract, generates installments, sets unit to `occupied` |
| Occupied Unit | POST on unit with status `occupied` | HTTP 422 | `{"message": "الوحدة مشغولة بعقد آخر"}` |
| End Date Before Start | POST with `end_date <= start_date` | HTTP 422 | `{"message": "تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية"}` |
| Invalid Collection Cycle | POST with unsupported cycle | HTTP 422 | `{"message": "دورة التحصيل غير صالحة"}` |

</frozen-after-approval>

## Code Map

- `backend/app/Services/Tenant/InstallmentScheduleService.php` -- Installment milestone generator
- `backend/app/Models/Tenant/Installment.php` -- Installment model
- `backend/app/Models/Tenant/RentalContract.php` -- Contract relationships and status helpers
- `backend/app/Http/Controllers/Tenant/RentalContractController.php` -- Contract list, show, store
- `backend/routes/api.php` -- Register contract endpoints
- `backend/tests/Feature/RentalContractTest.php` -- Automated feature tests covering UC-37, UC-38
- `frontend/src/pages/contracts/ContractListPage.jsx` -- Contract directory with filters
- `frontend/src/pages/contracts/CreateContractPage.jsx` -- Contract wizard and installment schedule generator
- `frontend/src/App.jsx` -- Route registration
