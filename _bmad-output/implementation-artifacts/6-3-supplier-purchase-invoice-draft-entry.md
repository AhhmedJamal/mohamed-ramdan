# Story 6.3: Supplier Purchase Invoice Draft Entry & Approval (UC-55)

Status: done

## Requirements Covered
- UC-55: Supplier Purchase Invoices (فواتير الموردين والمشتريات التجارية).
- Data Entry creates draft purchase invoice with gross amount, discount earned, tax type (VAT 15% / Excise 5%), payment terms (Cash / Credit), cost center, and notes.
- General Accountant approves invoice, automatically creating and posting balanced Journal Entry to General Ledger.
- Maker-Checker enforcement: Data Entry is strictly forbidden from approving supplier invoices.

## Implementation Summary
- Backend:
  - Model: `SupplierInvoice.php`.
  - Controller: `SupplierInvoiceController.php` (`index`, `store`, `approve`).
  - Validation: unique invoice number, supplier name, date, positive gross amount.
- Frontend:
  - `frontend/src/pages/procurement/SupplierInvoiceListPage.jsx` with modal for drafting new invoices and approval confirmation dialog.
- Tests: `ContractorAndSupplierInvoiceTest::test_supplier_invoice_lifecycle_and_gl_posting` passing.

