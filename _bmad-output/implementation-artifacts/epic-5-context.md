# Epic 5 Context: Maker-Checker Financial Vouchers & Automated Balanced Ledger Engine

## Overview & Accounting Spine
Epic 5 implements the core financial transaction engine of the Mohamed Ramadan Group Cloud Accounting ERP system strictly adhering to `@docs/SRS- Mohamed Ramdan.md` (v1.0).

It establishes:
1. **Maker-Checker Segregation of Duties (Sections 1.6 & 2.8)**:
   - **Maker (Data Entry)**:
     - Creates Draft Receipt Vouchers (سند قبض) linked to rental contracts and installment milestones (UC-43).
     - Creates Draft Disbursement Vouchers (سند صرف) for operational expenses (UC-44).
     - Modifies and resubmits rejected vouchers (UC-45).
     - **Strict Barrier**: Data Entry cannot approve, post to GL, or alter chart of accounts / fiscal periods.
   - **Checker (General Accountant)**:
     - Audits pending draft voucher queue (UC-46, UC-47).
     - Rejection requires mandatory reason $\ge 10$ characters (UC-48) (error: `"يجب إدخال سبب الرفض بحيث لا يقل عن 10 أحرف"`).
     - Approval is final and automatically generates balanced Journal Entries ($\text{Debit} - \text{Credit} = 0$) and immediately posts them to the General Ledger.
2. **Automated Balanced Journal Entry Engine (UC-47)**:
   - For Receipt Voucher (سند قبض):
     - Debit: Cash / Bank Account (أصول متداولة / نقدية وما في حكمها) = Collected Amount.
     - Credit: Rental Revenue Account (إيرادات التأجير) = Collected Amount.
     - Cost Center: Inherited from Contract Property.
     - Installment Update: `paid_amount += amount`. If fully paid, `status -> paid`, `paid_at = now()`.
   - For Disbursement Voucher (سند صرف):
     - Debit: Expense Account (مصروفات صيانة، كهرباء، رواتب، ...) = Disbursed Amount. Cost Center: Linked.
     - Credit: Cash / Bank Account = Disbursed Amount.
   - Period Locking: Cannot approve voucher if date falls in a closed fiscal period (error: `"الفترة المالية مغلقة، لا يمكن إضافة أو تعديل قيود بها"`).
3. **Manual Balanced Journal Entries (UC-49, UC-50, UC-51, UC-52, UC-53, UC-54)**:
   - Manual journal entries for adjustments and opening balances.
   - Strict verification: `total_debit === total_credit` (error: `"القيد غير متوازن، إجمالي المدين يجب أن يساوي إجمالي الدائن"`).
   - Mandatory cost centers enforced if account requires it.
   - Posted entries are immutable.

