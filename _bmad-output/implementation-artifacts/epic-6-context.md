# Epic 6 Context: Contracting Progress Billing & Commercial Procurement

## Overview & Scope
Epic 6 implements the project contracting and commercial procurement operations for Mohamed Ramadan Group Cloud ERP system, strictly adhering to `@docs/SRS- Mohamed Ramdan.md` (v1.0).

It covers:
1. **Contractor Progress Billing (مستخلصات المقاولين) (UC-52, UC-53, UC-54)**:
   - Line items with quantity, unit (meter, ton, day, etc.), unit price, line total.
   - Financial totals: Gross Total ($\sum \text{line totals}$), Tax Amount, Grand Total ($\text{Gross} + \text{Tax}$).
   - Maker (Data Entry): creates draft billing linked to project cost center.
   - Checker (General Accountant): audits billing line items and approves.
   - Automated Balanced GL Posting:
     - Debit: Contracting Works in Progress / Expenses (أعمال تحت التنفيذ / مصروفات مقاولات) + VAT Input Tax (ضريبة القيمة المضافة مدخلات).
     - Credit: Contractor Payables (مستحقات المقاولين).
2. **Supplier Purchase Invoices (فواتير الموردين) (UC-55)**:
   - Supplier name, invoice number, date, cost center.
   - Calculations:
     - Net Amount = Gross Amount - Discount Earned.
     - Tax Amount = Net Amount * Tax Rate (15% VAT).
     - Total Payable = Net Amount + Tax Amount.
   - Payment terms: `cash` (نقدي) or `credit` (آجل).
   - Approval generates balanced Journal Entry to GL.

