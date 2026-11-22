# Epic 3 Context: Real Estate Portfolio, Unit Provisioning & Tenant Registry

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Provide end-to-end property portfolio management, automated unit scaffolding, and centralized tenant directories for the Mohamed Ramadan Group ERP. When a property is created, the system auto-creates an associated Cost Center under the property name (`type = 'property'`) and auto-provisions $N$ unit records in `vacant` (شاغرة) status. Units can be added, updated, or put under maintenance, but occupied units cannot be altered or set to vacant manually. Tenants (individuals and corporate entities) are managed with strict National ID / CR and Email uniqueness, with deletion permanently blocked if contracts exist.

## Stories

- **Story 3.1**: Property Management & Auto-Provisioning of Units and Cost Center (UC-25, UC-26, UC-27, UC-28)
- **Story 3.2**: Property Unit Lifecycle & Maintenance Management (UC-29, UC-30, UC-31, UC-32)
- **Story 3.3**: Tenant Master Registry (Individuals & Corporates) (UC-33, UC-34, UC-35, UC-36)

## Requirements & Constraints

- **Multi-Object Atomic Creation (UC-26)**:
  - Property Name (3-100 chars, unique)
  - Address (required)
  - Property Type (`residential`, `commercial`, `mixed`)
  - Units Count ($\ge 1$; error: *"عدد الوحدات يجب أن لا يقل عن 1"*)
  - Default Unit Type (`apartment`, `shop`, `office`, `warehouse`)
  - **Automated Workflow**:
    1. Creates `Property` record.
    2. Auto-creates `CostCenter` with `name = Property.name`, `type = 'property'`.
    3. Auto-creates $N$ `Unit` records numbered $1 \dots N$ with status `vacant`.
- **Property Deletion Guard (UC-28)**:
  - Deleting a property with active contracts is strictly blocked with error: *"لا يمكن حذف العقار لوجود عقود نشطة"*.
  - When allowed, deletion cascades to units and unlinks/removes the created cost center if no transactions exist.
- **Unit Lifecycle & Status Integrity (UC-29 to UC-32)**:
  - Unit number is unique per property (error: *"رقم الوحدة مكرر في نفس العقار"*).
  - Statuses: `vacant` (شاغرة), `occupied` (مشغولة), `under_maintenance` (تحت الصيانة).
  - An occupied unit cannot be manually modified to `vacant` or deleted.
- **Tenant Master Directory (UC-33 to UC-36)**:
  - Type: `individual` (فرد) or `company` (شركة).
  - National ID / CR: Unique (error: *"رقم الهوية مستخدم بالفعل"*).
  - Mobile: 10 digits starting with `05` (format: `^05\d{8}$`).
  - Email: Valid, unique (error: *"البريد الإلكتروني مستخدم بالفعل"*).
  - Cannot delete tenant with contracts (active or expired) (error: *"لا يمكن حذف المستأجر لوجود عقود إيجار مرتبطة به"*).
- **CRUD Permission Matrix (Section 1.6)**:
  - `data_entry`: Full CRUD on Properties, Units, Tenants.
  - `branch_manager`: Read-only.
  - `general_accountant`: Read-only.
  - `super_admin`: Platform governance.

