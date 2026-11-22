# Epic 2 Context: Core Financial Foundation, COA Hierarchy & Accounting Governance

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Establish the double-entry accounting foundation and financial governance for the Mohamed Ramadan Group ERP. Every tenant entity operates with an immutable 12-root Chart of Accounts (COA) hierarchy enforcing recursive nature inheritance (Debit vs Credit). Cost centers (Properties and Contracting Projects) provide multidimensional tracking with mandatory linking enforcement on operational accounts. Strict fiscal year and accounting period locking permanently freeze closed periods against retroactive modifications, and year-end closing automatically zeroes nominal accounts and rolls net profit/loss into equity.

## Stories

- **Story 2.1**: Chart of Accounts (COA) Tree & Recursive Nature Inheritance (UC-16, UC-17, UC-18, UC-19A)
- **Story 2.2**: Cost Center Management & Mandatory Linking Enforcement (UC-19B, UC-20, UC-21, UC-22, UC-23)
- **Story 2.3**: Fiscal Year Management & Accounting Period Locking (UC-24)
- **Story 2.4**: Fiscal Year-End Closing & Retained Earnings Rollover (UC-61)

## Requirements & Constraints

- **Fixed Root Accounts (UC-16, UC-17)**: Exactly 12 root accounts seeded upon tenant creation:
  1. الأصول (Assets) - Debit
  2. الخصوم (Liabilities) - Credit
  3. حقوق الملكية (Equity) - Credit
  4. المصروفات (Expenses) - Debit
  5. الإيرادات (Revenues) - Credit
  6. المشتريات (Purchases) - Debit
  7. المبيعات (Sales) - Credit
  8. مردودات المشتريات (Purchase Returns) - Credit
  9. مردودات المبيعات (Sales Returns) - Debit
  10. المسحوبات (Withdrawals) - Debit
  11. خصم مسموح به (Discounts Allowed) - Debit
  12. خصم مكتسب (Discounts Earned) - Credit
  Root accounts are immutable: cannot be deleted or re-classified.
- **Recursive Nature Inheritance**: Every sub-account inherits its nature (Debit/Credit) directly from its root classification. Nature is read-only and immutable if posted entries exist.
- **Asset Depreciation Configuration**: Asset accounts support Straight-Line (`straight_line`) and Declining-Balance (`declining_balance`) methods with purchase price, depreciation rate, useful life, and scrap value.
- **Cost Center Architecture (UC-19B to UC-22)**: Cost centers support two strict types: Property (`property` - عقار) and Contracting Project (`contracting_project` - مشروع مقاولات). Name is unique. Type cannot be altered and deletion is blocked if linked transactions exist.
- **Mandatory Cost Center Linking (UC-23)**: Accounts can be marked `is_cost_center_mandatory = true` with allowed cost centers. Any journal entry or voucher involving such account without a cost center is strictly blocked with error: *"يجب تحديد مركز التكلفة لهذا الحساب"*.
- **Period & Year Locking (UC-24, UC-61)**: Closed periods and closed fiscal years permanently block any voucher, journal entry creation, modification, or posting with error: *"لا يمكن إنشاء أو ترحيل قيود في فترة مالية مغلقة"*.
- **Role Permissions (Section 1.6)**:
  - `general_accountant`: Full CRUD on COA, Cost Centers, Fiscal Years, Year Closing.
  - `branch_manager`: Read-only access to all financial configuration.
  - `data_entry`: Read-only access to COA and Cost Centers; no access to Fiscal Year closing.
  - `super_admin`: Central platform governance; no direct tenant accounting manipulation.

## Technical Decisions

- **Hierarchy Pattern**: Self-referencing foreign key (`parent_id`) on `accounts` table in tenant database with dynamic code generation or hierarchical prefixing.
- **Tree Computation**: Real-time balance roll-up computed from posted `journal_entry_items` plus opening balance.
- **Closing Automation**: Automatic balanced closing journal entry transferring nominal balances to Profit & Loss Summary, then net income/loss to Retained Earnings / Equity.

