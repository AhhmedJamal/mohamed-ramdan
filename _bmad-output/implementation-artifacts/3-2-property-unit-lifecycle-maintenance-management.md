---
title: "Story 3.2: Property Unit Lifecycle & Maintenance Management"
type: 'feature'
created: '2026-11-22'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - "docs/SRS- Mohamed Ramdan.md"
  - "_bmad-output/planning-artifacts/architecture/architecture-mohamed_ramdan-2026-11-22/ARCHITECTURE-SPINE.md"
  - "_bmad-output/planning-artifacts/ux/ux-mohamed_ramdan-2026-11-22/EXPERIENCE.md"
  - "_bmad-output/implementation-artifacts/epic-3-context.md"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Properties require dynamic inventory management for adding extra units, tracking unit dimensions, recording maintenance status, and preventing conflicting leases. A unit marked occupied by an active lease must be protected against accidental deletion or manual status tampering, while duplicate unit numbers within the same building must be strictly blocked.

**Approach:** Implement `/api/properties/{propertyId}/units` (CRUD, status transition) in PHP Laravel operating on the tenant database. Validate that `unit_number` is unique within the property (`"رقم الوحدة مكرر في نفس العقار"`). When editing, verify that a unit with an active contract cannot be changed to `vacant` (`"لا يمكن تغيير حالة الوحدة إلى شاغرة لوجود عقد إيجار نشط"`). When deleting, block if active contracts exist (`"لا يمكن حذف وحدة لها عقد إيجار نشط"`). On React frontend, build `/data-entry/properties/:propertyId/units` with unit cards, filter by status (all, vacant, occupied, under maintenance), add/edit unit modal, maintenance toggle, and active tenant display.

## Boundaries & Constraints

**Always:**
- Actor: Data Entry (`role === 'data_entry'`) or Super Admin.
- Unit number unique within same property (`['property_id', 'unit_number']`).
- Statuses allowed: `vacant` (شاغرة), `occupied` (مشغولة), `under_maintenance` (تحت الصيانة).
- Deletion blocked if active contract exists: `"لا يمكن حذف وحدة لها عقد إيجار نشط"`.
- Status transition to `vacant` blocked if active contract exists: `"لا يمكن تغيير حالة الوحدة إلى شاغرة لوجود عقد إيجار نشط"`.

**Never:**
- Never duplicate unit numbers within the same property.
- Never delete an occupied unit.

## I/O & Edge-Case Matrix

| Scenario | Input | Response Code | Response Body / Behavior |
| :--- | :--- | :--- | :--- |
| List Property Units | GET `/api/properties/{propertyId}/units` | HTTP 200 | Returns units with current tenant name and contract status |
| Add Single Unit | POST with valid data | HTTP 201 | Creates unit in property, default status `vacant` |
| Duplicate Unit Number in Property | POST with existing unit_number | HTTP 422 | `{"message": "رقم الوحدة مكرر في نفس العقار"}` |
| Edit Unit | PUT with updated area/type | HTTP 200 | Updates unit details |
| Reset Occupied to Vacant | PUT changing status to `vacant` with active contract | HTTP 422 | `{"message": "لا يمكن تغيير حالة الوحدة إلى شاغرة لوجود عقد إيجار نشط"}` |
| Delete Occupied Unit | DELETE unit with active contract | HTTP 422 | `{"message": "لا يمكن حذف وحدة لها عقد إيجار نشط"}` |
| Delete Vacant Unit | DELETE unit with no contracts | HTTP 200 | Deletes unit successfully |

</frozen-after-approval>

## Code Map

- `backend/app/Http/Controllers/Tenant/UnitController.php` -- Full Unit CRUD, status validation, contract guards
- `backend/routes/api.php` -- Register `/api/properties/{propertyId}/units` endpoints
- `backend/tests/Feature/UnitLifecycleTest.php` -- Feature tests verifying UC-29, UC-30, UC-31, UC-32
- `frontend/src/pages/properties/PropertyUnitsPage.jsx` -- Interactive unit inventory interface
- `frontend/src/App.jsx` -- Register `/data-entry/properties/:propertyId/units` route

