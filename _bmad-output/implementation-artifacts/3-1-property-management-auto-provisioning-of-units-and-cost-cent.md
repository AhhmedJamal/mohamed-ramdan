---
title: "Story 3.1: Property Management & Auto-Provisioning of Units and Cost Center"
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

**Problem:** Real estate onboarding is cumbersome when properties, cost centers, and unit inventories are created in disparate steps. Without automated provisioning, operational overhead increases and cost center tracking per building is frequently omitted. Furthermore, deleting a property with active contracts causes orphaned rental obligations and severe data corruption.

**Approach:** Implement `/api/properties` in PHP Laravel operating on the tenant database. When creating a property, validate unique name, address, property type (`residential`, `commercial`, `mixed`), units count ($\ge 1$), and unit type (`apartment`, `shop`, `office`, `warehouse`). In an atomic database transaction: (1) auto-create a Cost Center under the property name (`type = 'property'`), (2) create the `Property` record linking to that Cost Center, and (3) auto-provision $N$ `Unit` records numbered `1 \dots N` with status `vacant`. When deleting a property, verify no active contracts exist, otherwise reject with HTTP 422: `"لا يمكن حذف العقار لوجود عقود نشطة"`. On React frontend, build `/data-entry/properties` with search, property cards/table, auto-provisioning modal, and confirmation dialogs.

## Boundaries & Constraints

**Always:**
- Actor: Data Entry (`role === 'data_entry'`) or Super Admin has CRUD. Branch Manager and General Accountant have Read-Only (Section 1.6 matrix).
- Atomic Multi-Object Creation: Creating 1 property creates 1 Cost Center and $N$ Units.
- Units count must be $\ge 1$ (error: `"عدد الوحدات يجب أن لا يقل عن 1"`).
- Deletion blocked if active contracts exist (error: `"لا يمكن حذف العقار لوجود عقود نشطة"`).

**Never:**
- Never create a property without its linked cost center.
- Never delete a property with active rental contracts.

## I/O & Edge-Case Matrix

| Scenario | Input | Response Code | Response Body / Behavior |
| :--- | :--- | :--- | :--- |
| List Properties | GET `/api/properties` | HTTP 200 | Returns array of properties with units_count, vacant/occupied counts |
| Add Property & Auto-Provision | POST `/api/properties` with valid data | HTTP 201 | Creates Property, Cost Center, and $N$ Units in `vacant` status |
| Duplicate Property Name | POST with existing name | HTTP 422 | `{"message": "اسم العقار مستخدم بالفعل"}` |
| Units Count < 1 | POST with `units_count = 0` | HTTP 422 | `{"message": "عدد الوحدات يجب أن لا يقل عن 1"}` |
| Delete with Active Contracts | DELETE `/api/properties/{id}` with active contracts | HTTP 422 | `{"message": "لا يمكن حذف العقار لوجود عقود نشطة"}` |
| Delete without Contracts | DELETE `/api/properties/{id}` | HTTP 200 | Deletes property, cascades to units, deletes unlinked cost center |

</frozen-after-approval>

## Code Map

- `backend/app/Models/Tenant/Property.php` -- Property model with relations
- `backend/app/Models/Tenant/Unit.php` -- Unit model with status scopes
- `backend/app/Http/Controllers/Tenant/PropertyController.php` -- Property CRUD & atomic unit/cost center scaffolding
- `backend/routes/api.php` -- Register `/api/properties` routes
- `backend/tests/Feature/PropertyManagementTest.php` -- Feature tests verifying UC-25, UC-26, UC-27, UC-28
- `frontend/src/pages/properties/PropertyListPage.jsx` -- React property catalog with unit auto-creation modal
- `frontend/src/App.jsx` -- Register `/data-entry/properties` route
- `frontend/src/pages/dashboards/DataEntryDashboard.jsx` -- Link to properties

