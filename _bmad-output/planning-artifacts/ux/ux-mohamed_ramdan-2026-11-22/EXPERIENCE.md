---
title: "User Experience Architecture & Behavior (EXPERIENCE.md)"
status: final
created: "2026-11-22"
updated: "2026-11-22"
project_name: "mohamed_ramdan"
version: "1.0"
source_document: "docs/SRS-Mohamed-Ramdan.md"
---

# User Experience Architecture & Behavior (EXPERIENCE.md)
## Cloud Accounting & Operational ERP System (Mohamed Ramadan Group)

---

## 1. Foundation & Information Architecture

### 1.1 Form Factor & Responsive Layout
- **Target Platform**: Responsive Web Application (Single Page Application via React.js).
- **Supported Viewports**:
  - Desktop ($1280\text{px} \times 800\text{px}$ and above) — primary operational view with multi-column tables, split panes, and sticky action headers.
  - Tablet ($768\text{px}$ to $1024\text{px}$) — responsive collapsible sidebar, horizontally scrollable data tables.
  - Mobile ($375\text{px}$ to $430\text{px}$) — vertical card stacked view, bottom action sheets, touch targets $\ge 44\text{px}$.
- **Language & Direction**: Modern Standard Arabic (`dir="rtl"`, primary) with English (`dir="ltr"`) header switcher.

### 1.2 Global Navigation & Role-Based Sitemaps

The navigation sidebar and accessible routes are dynamically scoped to the authenticated user's assigned role:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ROLE-BASED SITEMAP                              │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Super Admin (الأدمن العام):                                         │
│    ├── /admin/dashboard (Consolidated Metrics & Charts)               │
│    ├── /admin/companies (Company Registry, DB Provisioning, Freeze)    │
│    ├── /admin/reports (Consolidated Group Financials)                  │
│    └── /profile (Account settings, password reset)                     │
│                                                                        │
│ 2. Branch Manager (مدير الشركة):                                       │
│    ├── /company/dashboard (Liquidity, Debt, Overdue, Trends)           │
│    ├── /company/employees (Accountant & Data Entry User Management)    │
│    ├── /company/contracts (Read-Only Contracts & Cancellation Approvals)│
│    ├── /company/properties (Read-Only Properties & Units)               │
│    ├── /company/reports (Company Financial Reports & Building P&L)     │
│    └── /profile                                                        │
│                                                                        │
│ 3. General Accountant (المحاسب العام):                                 │
│    ├── /accounting/dashboard (Pending Vouchers & Invoices, Key Ratios) │
│    ├── /accounting/coa (Interactive Chart of Accounts Tree)            │
│    ├── /accounting/cost-centers (Cost Centers & Linking Rules)         │
│    ├── /accounting/fiscal-year (Fiscal Years & Period Locking)         │
│    ├── /accounting/vouchers (Draft Queue: Review, Approve, Reject)     │
│    ├── /accounting/journal-entries (Manual Balanced Journal Entries)   │
│    ├── /accounting/contractors (Progress Billing Approval)             │
│    ├── /accounting/reports (Trial Balance, GL, Balance Sheet, P&L)     │
│    ├── /accounting/period-close (Year-End Rollover & Account Zeroing)  │
│    └── /profile                                                        │
│                                                                        │
│ 4. Data Entry (مدخل البيانات):                                         │
│    ├── /data-entry/dashboard (Operational Tasks, Rejection Alerts)     │
│    ├── /data-entry/properties (Buildings, Auto-Units, Unit Status)    │
│    ├── /data-entry/tenants (Individual & Corporate Tenant Directory)   │
│    ├── /data-entry/contracts (Create Rental Contracts, Schedules)      │
│    ├── /data-entry/cancellations (Submit Contract Cancellation Request)│
│    ├── /data-entry/vouchers (Create Draft Receipt & Disbursement)      │
│    ├── /data-entry/contractors (Create Contractor Progress Billing)    │
│    ├── /data-entry/suppliers (Create Supplier Purchase Invoices)       │
│    └── /profile                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Role-Based Dashboard Specifications

### 2.1 Super Admin Dashboard (`/admin/dashboard`) [UC-11]
- **Header Filters**:
  - `Date Range Picker`: "من تاريخ (From Date)" — "إلى تاريخ (To Date)".
  - `Company Filter`: Dropdown populated with all active companies; default is "الكل (All)".
  - `Manager Filter`: Dropdown of assigned branch managers.
- **KPI Summary Cards**:
  1. **إجمالي إيرادات المجموعة (Total Group Revenue)**: Sum of all active companies' revenues. Tooltip displays currency (SAR).
  2. **إجمالي مصروفات المجموعة (Total Group Expenses)**: Sum of all active companies' expenses.
  3. **صافي أرباح المجموعة (Group Net Profit)**: Total Revenue minus Total Expenses (highlighted green if positive, red if negative).
  4. **عدد الشركات النشطة (Active Companies Count)**: Large numeric counter with link to `/admin/companies`.
  5. **عدد الشركات المجمدة (Frozen Companies Count)**: Amber/Red alert counter.
- **Visual Analytics**:
  - Group Financial Performance Chart: Side-by-side grouped bar chart comparing Revenue vs. Expenses across each operating entity.
  - Drill-down: Clicking any company bar redirects to company-filtered view.

### 2.2 Branch Manager Dashboard (`/company/dashboard`) [UC-62]
- **Company Identity Banner**: Displays Company Name, Commercial Register, City, and active Fiscal Year.
- **Financial & Operational KPI Cards**:
  1. **السيولة النقدية (Cash Liquidity)**: Aggregate balance of Cash in Hand and Bank accounts for this company.
  2. **إجمالي الديون والالتزامات (Total Liabilities)**: Accounts payable + contractor dues + pending liabilities.
  3. **المستحقات المتأخرة (Overdue Receivables)**: Sum of all unpaid rent installments past due date.
  4. **العقود السارية (Active Contracts Count)**: Count of active rental agreements.
  5. **العقود المتأخرة (Overdue Contracts Count)**: Alert badge counter with link to overdue contract table.
- **Trend Chart**:
  - Monthly Revenue & Operational Expense trend line chart over the last 12 rolling months.
- **Pending Approvals Quick Action Widget**:
  - Lists pending rental contract cancellation requests submitted by Data Entry with one-click "مراجعة (Review)" modal trigger.

### 2.3 General Accountant Dashboard (`/accounting/dashboard`)
- **Action-Required Queues (Maker-Checker Hub)**:
  1. **سندات بانتظار الاعتماد (Vouchers Awaiting Approval)**: Red attention badge counter showing count of draft receipt and disbursement vouchers.
  2. **مستخلصات المقاولين المعلقة (Pending Contractor Invoices)**: Amber badge counter showing pending contractor progress bills.
  3. **حالة الفترة المالية الحالية (Current Period Status)**: Pill showing "الفترة مفتوحة (Period Open)" or "الفترة مغلقة (Period Closed)".
- **Quick Action Bar**:
  - CTA Button: "+ إنشاء قيد يومية يدوي (Create Manual Journal Entry)".
  - CTA Button: "شجرة الحسابات (Chart of Accounts)".
  - CTA Button: "ميزان المراجعة (Trial Balance)".
- **Recent Audit Activity Feed**:
  - Real-time log of the last 10 posted transactions with clickable entry numbers, debit/credit totals, and timestamps.

### 2.4 Data Entry Dashboard (`/data-entry/dashboard`)
- **Operational Task Hub**:
  - Quick CTA Card: "+ إنشاء عقد إيجار جديد (New Rental Contract)".
  - Quick CTA Card: "+ إنشاء سند قبض (New Receipt Voucher)".
  - Quick CTA Card: "+ إنشاء سند صرف (New Disbursement Voucher)".
- **Rejection Attention Alert Table (السندات المرفوضة)**:
  - High-priority alert banner if any vouchers were rejected by the General Accountant.
  - Table shows: Voucher No, Type, Date, Rejection Reason snippet, and prominent "تعديل وإعادة إرسال (Edit & Resubmit)" button.
- **Occupancy & Units Summary**:
  - Vacant Units count (شاغرة), Occupied Units count (مشغولة), Under Maintenance count (تحت الصيانة).

---

## 3. Form Component Behaviors, Dropdown Dependencies & Validations

### 3.1 Dropdown Dependencies (DDL Cascading)

1. **Company Creation (UC-07)**:
   - `Country (الدولة)` $\rightarrow$ Selection triggers dynamic filtering of `City (المدينة)` dropdown.
2. **Chart of Accounts (UC-17)**:
   - `Root Account (الحساب الرئيسي)` selection strictly dictates:
     - The options available in `Parent Account (الحساب الأب)`.
     - The read-only value in `Account Nature (طبيعة الحساب)` (Debit for Assets/Expenses/Purchases/Sales Returns/Discounts Allowed/Withdrawals; Credit for Liabilities/Equity/Revenues/Sales/Purchase Returns/Discounts Earned).
3. **Property & Unit Selection in Rental Contract (UC-38)**:
   - Selecting `Property (العقار)` filters `Unit (الوحدة)` dropdown.
   - `Unit` dropdown displays **strictly Vacant (شاغرة) units**. Occupied or under-maintenance units are completely filtered out.
4. **Receipt Voucher Creation (UC-43)**:
   - Selecting `Rental Contract (عقد الإيجار)` dynamically loads:
     - `Installment (الدفعة)` dropdown containing only unpaid or due installments for that contract.
     - `Cost Center (مركز التكلفة)` field, which is auto-populated and locked to the contract's linked property.
   - Selecting an Installment automatically binds the upper bound of the `Collected Amount` input ($\le \text{Outstanding Installment Balance}$).

---

### 3.2 Form Validation Rules & Exact Error Messages (SRS Mapping)

| Screen / Field | Validation Rule | Exact Error Message (SRS) |
| :--- | :--- | :--- |
| **Login / Email** | Mandatory, RFC 5322 syntax, max 100 chars | *"يرجى إدخال بريد إلكتروني صحيح"* |
| **Login / Password** | Mandatory, min 8, max 25 chars | *"يرجى إدخال كلمة المرور"* |
| **Login / Auth** | Invalid email or password | *"بيانات الدخول غير صحيحة"* |
| **Login / Status** | Account deactivated or deleted | *"لا يمكن الوصول إلى الحساب"* |
| **Forgot Password** | Email not in system database | *"البريد الإلكتروني غير مسجل في النظام"* |
| **Reset Password** | Token used or expired | *"اللينك مستخدم من قبل، يرجى طلب لينك جديد"* / *"انتهت صلاحية اللينك، يرجى طلب لينك جديد"* |
| **Profile / Password** | Current password mismatch | *"كلمة المرور الحالية غير صحيحة"* |
| **Profile / Confirm** | New password confirmation mismatch | *"كلمات المرور غير متطابقة"* |
| **Company / Name** | Duplicate company name | *"اسم الشركة مستخدم بالفعل"* |
| **Company / Email** | Duplicate manager email | *"البيانات مستخدمة بالفعل"* |
| **Company / DB** | Database provisioning exception | *"حدث خطأ أثناء إنشاء الشركة، يرجى المحاولة مرة أخرى"* |
| **Property / Units** | Units count $< 1$ | *"عدد الوحدات يجب أن لا يقل عن 1"* |
| **Property / Delete** | Property has active contracts | *"لا يمكن حذف العقار لوجود عقود نشطة"* |
| **Unit / Code** | Duplicate unit code in property | *"رقم الوحدة مكرر في نفس العقار"* |
| **Unit / Delete** | Unit has active contract | *"لا يمكن حذف الوحدة لوجود عقد نشط"* |
| **Tenant / ID** | Duplicate National ID / CR | *"رقم الهوية مستخدم بالفعل"* |
| **Tenant / Email** | Duplicate tenant email | *"البريد الإلكتروني مستخدم بالفعل"* |
| **Contract / Unit** | Unit occupied by another contract | *"الوحدة مشغولة بعقد آخر"* |
| **Contract / Dates** | End Date $\le$ Start Date | *"تاريخ النهاية يجب أن يكون أكبر من تاريخ البداية"* |
| **Voucher / Receipt** | Collected amount $>$ Installment amount | *"المبلغ أكبر من قيمة الدفعة"* |
| **Voucher / Receipt** | Installment already paid | *"الدفعة مدفوعة مسبقاً"* |
| **Voucher / Expense** | Amount $\le 0$ | *"لا يمكن أن تكون القيمة أقل من أو تساوي 0"* |
| **Voucher / Reject** | Rejection reason $< 10$ chars | *"سبب الرفض يجب ألا يقل عن 10 أحرف"* |
| **Journal Entry** | $\text{Total Debit} - \text{Total Credit} \ne 0$ | *"القيد غير متوازن، يرجى مراجعة البنود"* |
| **Journal Entry** | Account requires cost center, none selected | *"يجب تحديد مركز التكلفة لهذا الحساب"* |
| **Accounting / Lock** | Entry dated in closed fiscal period | *"لا يمكن إنشاء أو ترحيل قيود في فترة مالية مغلقة"* |
| **COA / Delete** | Account has child accounts or posted entries | *"لا يمكن حذف الحساب لوجود قيود مرتبطة به"* |
| **COA / Root** | Deleting fixed root accounts | *"لا يمكن حذف الحساب الرئيسي"* |
| **Trial Balance** | $\sum \text{Debit} \ne \sum \text{Credit}$ | *"ميزان المراجعة غير متوازن، يرجى مراجعة القيود اليومية"* |
| **Balance Sheet** | $\text{Assets} \ne \text{Liabilities} + \text{Equity}$ | *"الميزانية العمومية غير متوازنة، يرجى مراجعة القيود"* |

---

## 4. Confirmation Modals & User Feedback Patterns

### 4.1 Company Freeze Confirmation Modal [UC-09]
- **Trigger**: Super Admin clicks "تجميد (Freeze)" button next to an active company.
- **Modal Visuals**: Warning triangle icon (Amber/Red), title *"تجميد الشركة (Freeze Company)"*.
- **Body Text**:
  > *"هل أنت متأكد من تجميد هذه الشركة؟ سيؤدي هذا الإجراء إلى تسجيل خروج جميع موظفي الشركة فوراً ومنعهم من تسجيل الدخول حتى يتم إعادة التفعيل."*
- **Actions**:
  - `تأكيد التجميد (Confirm Freeze)`: Red primary button.
  - `إلغاء (Cancel)`: Slate outline button.

### 4.2 Voucher Rejection Modal [UC-48]
- **Trigger**: General Accountant clicks "رفض (Reject)" on a draft voucher.
- **Modal Title**: *"رفض سند (Reject Voucher)"*.
- **Input Component**: Text Area with label *"سبب الرفض (إلزامي)*", placeholder *"يرجى توضيح سبب الرفض بدقة لمدخل البيانات (10 أحرف على الأقل)..."*.
- **Live Helper**: Character counter *"عدد الأحرف: X / 500 (الحد الأدنى 10)"*. "تأكيد الرفض (Confirm Rejection)" button disabled until $X \ge 10$.

### 4.3 Contract Cancellation Approval Modal [UC-42]
- **Trigger**: Branch Manager clicks "موافقة على الإلغاء (Approve Cancellation)".
- **Modal Visuals**: Blue information icon, title *"اعتماد إلغاء عقد الإيجار"*.
- **Summary**: Contract No, Tenant Name, Unit No, Unpaid Balance calculated.
- **Notice**: *"سيتم إنهاء العقد فوراً وإعادة تحويل حالة الوحدة إلى (شاغرة)."*
- **Action**: "تأكيد إلغاء العقد (Confirm Cancellation)".

### 4.4 Fiscal Year Close Confirmation Modal [UC-61]
- **Trigger**: General Accountant clicks "إغلاق السنة المالية (Close Fiscal Year)".
- **Modal Visuals**: Red danger shield icon.
- **Prompt**:
  > *"هل أنت متأكد من إغلاق السنة المالية؟ هذه العملية لا يمكن التراجع عنها. سيتم ترحيل حسابات الإيرادات والمصروفات إلى حساب الأرباح والخسائر، وترصيد صافي الربح إلى حقوق الملكية، وإقفال كافة الفترات المالية نهائياً."*
- **Confirmation Action**: Requires typing the fiscal year name to unlock the final "إغلاق نهائي (Permanent Close)" button.

---

## 5. Report Layouts & Print/PDF/Excel Actions

### 5.1 Financial Report Action Toolbar
Every financial report screen (Trial Balance, General Ledger, Balance Sheet, Income Statement, Per-Building P&L) contains a standardized top action toolbar:
- `Period Selector`: Fiscal Year DDL and Date Range Picker.
- `Filter Trigger`: Optional Account or Cost Center multi-select.
- `Print PDF Button (`.btn-export-pdf`)`:
  - Renders a clean print stylesheet: removes sidebar, headers, and navigation bars; adds company logo, official tax registration number, generated timestamp, and page numbers ("صفحة X من Y").
- `Export Excel Button (`.btn-export-excel`)`:
  - Triggers client-side/API streaming generation of `.xlsx` file. Formats numbers as Excel currency cells, retains header hierarchy, and includes automated sum formulas in total rows.

### 5.2 Print Contract Layout [UC-40]
- Triggered from `/data-entry/contracts` or `/company/contracts`.
- Standard official lease agreement layout:
  - Header: Group Logo, Company Details.
  - Party Information: Owner / First Party vs. Tenant / Second Party.
  - Property & Unit Details: Unit number, area, usage type, building name, address.
  - Financial Terms: Total annual rent, collection cycle, start date, end date.
  - Installment Breakdown Table: Installment #, Due Date, Installment Amount, Status.
  - Signature Blocks: First Party Signature, Second Party Signature, Seal.

---

## 6. End-to-End User Journeys (UJ-01 through UJ-04)

### UJ-01: Company Provisioning to Operational Readiness
- **Protagonist**: Mr. Mohamed Ramadan (Super Admin).
- **Steps**:
  1. Super Admin logs into `/login` with credentials $\rightarrow$ redirected to `/admin/dashboard`.
  2. Navigates to `/admin/companies` $\rightarrow$ clicks "إنشاء شركة جديدة (Create Company)".
  3. Fills company details (Name: "شركة إعمار للمقاولات", Activity: "مقاولات عامة", City: "الرياض") and assigns Branch Manager (Name: "أحمد منصور", Email: `manager@emaar.com`, Mobile: `0501234567`).
  4. Clicks "إنشاء". System provisions isolated MySQL DB `tenant_emaar`, seeds COA and root tables, generates 24h temp credentials, and emails manager.
  5. Super Admin sees the new company active on the consolidated dashboard.

### UJ-02: Property Onboarding & Rental Agreement Execution
- **Protagonist**: Salem (Data Entry Clerk at Company 1).
- **Steps**:
  1. Salem logs in $\rightarrow$ redirected to `/data-entry/dashboard`.
  2. Enters `/data-entry/properties` $\rightarrow$ clicks "إضافة عقار". Enters "برج الياسمين", 20 units, residential.
  3. System creates property, 20 vacant units, and auto-provisions Cost Center "برج الياسمين".
  4. Salem registers new tenant "خالد العتيبي" (National ID `1089234567`, mobile `0555123456`).
  5. Clicks "إنشاء عقد إيجار". Selects "برج الياسمين", unit "101", tenant "خالد العتيبي", total rent SAR 48,000, cycle "Quarterly (ربع سنوي)".
  6. Submits form: System creates active contract, auto-generates 4 installments of SAR 12,000 due every 3 months, and immediately marks Unit 101 as `Occupied (مشغولة)`.

### UJ-03: Maker-Checker Voucher Approval & Real-Time Ledger Impact
- **Protagonists**: Salem (Data Entry - Maker) & Tariq (General Accountant - Checker).
- **Steps**:
  1. Tenant خالد pays first installment (SAR 12,000 via bank transfer).
  2. Salem opens `/data-entry/vouchers` $\rightarrow$ "إنشاء سند قبض". Selects Khalid's contract, Installment 1, amount SAR 12,000, Bank Transfer. Cost center auto-fills as "برج الياسمين". Clicks "حفظ كمسودة".
  3. Voucher is created in status `Draft`. An in-app WebSocket alert pings Tariq's accountant dashboard with badge counter `+1`.
  4. Tariq opens `/accounting/vouchers` $\rightarrow$ clicks "عرض (View)" on the draft voucher.
  5. Tariq inspects cost center and accounts, then clicks "تأكيد الاعتماد (Confirm Approval)".
  6. System transitions voucher to `Approved`, installment to `Paid`, and automatically generates and posts a balanced Journal Entry:
     - Debit Bank Account = SAR 12,000
     - Credit Rental Revenue = SAR 12,000 (Cost Center: برج الياسمين)
  7. Tariq clicks "ميزان المراجعة" $\rightarrow$ Trial Balance instantly reflects SAR 12,000 in Bank and Revenue columns with zero delay.

### UJ-04: Tenant Rent Reminder & Overdue State Transition
- **Protagonists**: Automated System Cron & Khalid (Tenant).
- **Steps**:
  1. 7 days before installment 2 due date, the daily 08:00 AM Cron job runs. It locates Khalid's upcoming installment and dispatches an SMS and Email notification with payment details.
  2. On due date, a second automated reminder SMS is dispatched.
  3. Installment remains unpaid 1 day after due date. At 00:01 AM, the overnight Cron runs.
  4. System transitions the installment status to `Overdue (متأخرة)` and contract status to `Overdue (متأخر)`.
  5. An in-app alert is generated for the Branch Manager and General Accountant dashboards.

