# Story 6.1: Contractor Progress Billing (مستخلصات المقاولين) Draft & Line Items (UC-52, UC-53)

Status: done

## Requirements Covered
- UC-52: Browse and search contractor progress billings list.
- UC-53: Data Entry drafts a contractor progress billing with dynamic line items (item_name, quantity, unit, unit_price, line total), 15% VAT, project cost center linking, and notes.

## Implementation Summary
- Backend:
  - Model: `ContractorInvoice.php`, `ContractorInvoiceItem.php`.
  - Controller: `ContractorInvoiceController.php` (`store`, `index`, `show`).
  - Validation: unique invoice number, required contractor name, date, cost center, line items with positive quantity and price.
- Frontend:
  - `frontend/src/pages/contracting/ContractorInvoiceListPage.jsx`
  - `frontend/src/pages/contracting/CreateContractorInvoicePage.jsx` with live auto-calculating totals and dynamic row addition/deletion.
- Tests: `ContractorAndSupplierInvoiceTest::test_data_entry_can_create_draft_contractor_invoice` passing.

