# Epic 4 Context: Rental Contracts, Automated Installment Engine & Lifecycle Governance

## Overview & System Role
Epic 4 implements the commercial leasing and rental operations engine for the Mohamed Ramadan Group Cloud ERP system, strictly adhering to `@docs/SRS- Mohamed Ramdan.md` (v1.0).

It covers:
1. **Rental Contract Creation & Unit Provisioning (UC-37, UC-38)**:
   - Contract types:
     - `owner_to_company` (بين المالك والشركة)
     - `company_to_tenant` (بين الشركة والمستأجر النهائي)
   - Automatic unit state transition from `vacant` to `occupied`.
   - Automated installment schedule generation engine:
     - Monthly (`monthly`): every 1 month
     - Quarterly (`quarterly`): every 3 months
     - Semi-Annual (`semi_annual`): every 6 months
     - Annual (`annual`): every 12 months
     - First installment due date: `start_date + cycle` (or on start date for initial advance payment if specified).
     - Calculation: remaining rent evenly distributed across generated installment milestones.
2. **Contract Modifications, Document Attachments & Printable PDF (UC-39, UC-40, UC-41)**:
   - Modification safeguards: blocked on expired contracts (`"لا يمكن تعديل عقد منتهي"`).
   - If rent or cycle changes, future unpaid installments are automatically recalculated.
   - Document attachments: PNG, JPEG, PDF upload up to 5MB, up to 10 files per contract.
   - Print & PDF layout: formal Arabic contract template including group branding, contract clauses, tenant and property specifics, and full installment schedule.
3. **Two-Step Cancellation Governance & Unit Release (UC-41A, UC-42)**:
   - Maker (Data Entry): submits cancellation request with mandatory reason $\ge 10$ chars (`status -> pending_cancellation`).
   - Checker (Branch Manager): approves cancellation (`status -> cancelled`, unlinks/cancels unpaid installments, and automatically releases unit back to `vacant`) or rejects cancellation with mandatory reason $\ge 10$ chars (`status -> active`).

## Data Models & Schema (`tenant` database)
- `rental_contracts`:
  - `id`, `contract_number` (unique, e.g. `CNT-YYYYMM-XXXX`)
  - `tenant_id` (FK to `tenants`)
  - `property_id` (FK to `properties`)
  - `unit_id` (FK to `units`)
  - `contract_type` (`owner_to_company`, `company_to_tenant`)
  - `start_date`, `end_date`, `duration_months`
  - `total_rent`, `collection_cycle` (`monthly`, `quarterly`, `semi_annual`, `annual`)
  - `first_payment`
  - `status` (`active`, `overdue`, `expired`, `pending_cancellation`, `cancelled`)
  - `cancellation_reason`, `cancellation_requested_by`, `rejection_reason`
  - `cancelled_at`, `notes`, `created_by`
- `installments`:
  - `id`, `contract_id` (FK to `rental_contracts`)
  - `installment_number`
  - `due_date`
  - `amount`, `paid_amount`
  - `status` (`due`, `paid`, `overdue`, `cancelled`)
  - `paid_at`
- `contract_attachments`:
  - `id`, `contract_id`
  - `file_path`, `file_name`, `file_type`, `file_size`

## Permissions Matrix (Section 1.6)
- **Data Entry**:
  - Contracts: Create, Read, Update, Request Cancellation (UC-41A).
  - Attachments: Upload, View, Delete.
- **Branch Manager**:
  - Contracts: Read-Only.
  - Cancellation Requests: Approve / Reject (UC-42).
- **General Accountant**:
  - Contracts & Installments: Read-Only (used for voucher attribution and revenue recognition).
- **Super Admin**:
  - Full system oversight across all companies.

