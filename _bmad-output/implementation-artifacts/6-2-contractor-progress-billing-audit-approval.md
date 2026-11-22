# Story 6.2: Contractor Progress Billing Audit & Approval (UC-54)

Status: done

## Requirements Covered
- UC-54: General Accountant reviews and approves contractor progress billings.
- Enforces closed fiscal period safeguards.
- Atomically generates an immutable, balanced Journal Entry in the General Ledger:
  - Debit: Contracting Expense / WIP Account (with Project Cost Center)
  - Debit: VAT Input Tax Account (if tax > 0)
  - Credit: Contractor Accounts Payable
  - Balance equation: Total Debit - Total Credit = 0.
- Maker-Checker: Data Entry cannot self-approve.

## Implementation Summary
- Backend:
  - `ContractorInvoiceController::approve`
  - Validates fiscal period via `FiscalPeriodService::validateDateNotLocked`.
  - Transactional journal entry generation and immediate posting (`status: posted`).
- Frontend:
  - Approval modal in `ContractorInvoiceListPage.jsx` restricted to General Accountant / Super Admin.
- Tests: `ContractorAndSupplierInvoiceTest::test_accountant_can_approve_contractor_invoice_and_generate_balanced_entry` passing.

