---
title: "Epics and User Stories Specification"
status: final
created: "2026-11-22"
updated: "2026-11-22"
project_name: "mohamed_ramdan"
version: "1.0"
source_document: "docs/SRS-Mohamed-Ramdan.md"
coverage: "100% of UC-01 through UC-70, CRUD Permission Matrix, Accounting Formulas, and NFR-001 through NFR-010"
---

# Epics and User Stories Specification
## Cloud Accounting & Operational ERP System (Mohamed Ramadan Group)

---

## 1. Requirements Traceability Matrix Overview

| Epic ID | Epic Title | Covered Use Cases | Target Modules & Invariants |
| :--- | :--- | :--- | :--- |
| **EPIC-01** | Multi-Tenant Platform Foundation, Authentication & Security Governance | UC-01 to UC-15, NFR-001, 003, 005, 006, 007, 008, 009, 010 | Multi-tenant DB isolation, Auth, Rate limit, Freeze eviction, Employee CRUD, Super Admin dashboard |
| **EPIC-02** | Core Financial Foundation, COA Hierarchy & Accounting Governance | UC-16 to UC-24, UC-61 | Fixed root COA (12 roots), nature inheritance, Cost Centers, mandatory CC linking, Period locking, Year close |
| **EPIC-03** | Real Estate Portfolio, Unit Provisioning & Tenant Registry | UC-25 to UC-36 | Properties, auto-unit provisioning (Vacant), auto-cost center creation, Tenant master directory |
| **EPIC-04** | Rental Contracts, Automated Installment Engine & Lifecycle Governance | UC-37 to UC-42 (incl. UC-41A) | Contract creation, Occupied unit state, automated installment engine (monthly/quarterly/semi-annual/annual), print, cancellation approval |
| **EPIC-05** | Maker-Checker Financial Vouchers & Automated Balanced Ledger Engine | UC-43 to UC-51 | Draft vouchers, Rejection $\ge 10$ chars, Accountant approval, auto-balanced Journal Entry ($\text{Debit}-\text{Credit}=0$), Ledger immutability |
| **EPIC-06** | Contracting Progress Billing & Commercial Procurement | UC-52 to UC-55 | Subcontractor progress billing (line items, taxes, accountant approval), Supplier purchase invoices |
| **EPIC-07** | Comprehensive Financial Statements & High-Performance Export | UC-56 to UC-60, UC-63, NFR-002 | Trial Balance, General Ledger, Balance Sheet, Income Statement, Building P&L, PDF & Excel export $< 5$s |
| **EPIC-08** | Automated Cron Reminders, Status Transitions & Multi-Channel Alerts | UC-64 to UC-70, NFR-004 | 7-day reminder, due-date reminder, 1-day overdue transition, real-time in-app alerts, SMS Gateway, SMTP, Backups |

---

## 2. Granular Epic and User Story Breakdown

---

## Epic 1: Multi-Tenant Platform Foundation, Authentication & Security Governance

### Story 1.1: Multi-Tenant Database Connection & Dynamic Resolver
- **As a** System Architect / Developer,
- **I want** a dynamic database connection manager and middleware in Laravel,
- **So that** each company operates on an isolated MySQL database and cross-company data access is strictly prevented.
- **Acceptance Criteria**:
  1. `config/database.php` configures `central` and dynamic `tenant` connections.
  2. `TenantResolverMiddleware` identifies tenant via subdomain (`comp1.ehkam.com`) or authenticated token `company_id`.
  3. Queries on `central` connect to master DB (`central_db`); queries on `tenant` dynamically connect to `tenant_{uuid}_db`.
  4. Migration command provisions a new tenant database with all tables when a new company is created.

### Story 1.2: User Authentication, Brute-Force Rate Limiting & Role Redirection
- **As a** Registered User,
- **I want** to securely log into the system with email and password,
- **So that** I am authenticated and redirected to my role-specific dashboard.
- **Acceptance Criteria** [UC-01]:
  1. Validates email format (max 100 chars; error: *"يرجى إدخال بريد إلكتروني صحيح"*).
  2. Validates password (8-25 chars; error: *"يرجى إدخال كلمة المرور"*).
  3. Invalid credentials returns error: *"بيانات الدخول غير صحيحة"*.
  4. Deactivated account returns error: *"لا يمكن الوصول إلى الحساب"*.
  5. 5 consecutive failed login attempts trigger 15-minute temporary lockout.
  6. Successful authentication redirects based on role:
     - `super_admin` $\rightarrow$ `/admin/dashboard`
     - `branch_manager` $\rightarrow$ `/company/dashboard`
     - `general_accountant` $\rightarrow$ `/accounting/dashboard`
     - `data_entry` $\rightarrow$ `/data-entry/dashboard`

### Story 1.3: Password Recovery & Reset via 24-Hour Single-Use Token
- **As a** User who forgot their password,
- **I want** to receive a secure password reset link via email,
- **So that** I can securely regain access to my account.
- **Acceptance Criteria** [UC-02, UC-03]:
  1. Email submission validates email; unlisted email displays: *"البريد الإلكتروني غير مسجل في النظام"*.
  2. Dispatches reset link valid for exactly 24 hours with a 60-second resend cooldown timer.
  3. Opening link displays reset form: New Password (8-25 chars) and Confirm Password.
  4. Mismatched passwords display validation error.
  5. Used link displays: *"اللينك مستخدم من قبل، يرجى طلب لينك جديد"*.
  6. Expired link displays: *"انتهت صلاحية اللينك، يرجى طلب لينك جديد"*.
  7. Successful reset updates password hash, invalidates token immediately, and redirects to `/login`.

### Story 1.4: User Profile Management & Session Termination on Password Change
- **As an** Authenticated User,
- **I want** to view/update my profile and change my password,
- **So that** my contact details remain accurate and my account remains secure.
- **Acceptance Criteria** [UC-04, UC-05, UC-06]:
  1. Profile view shows Name (3-100 chars), Email (Read-Only), Mobile (10 digits starting `05`), and optional Profile Image (max 5MB).
  2. Password change requires `Current Password`, `New Password`, and `Confirm Password`.
  3. Invalid current password returns: *"كلمة المرور الحالية غير صحيحة"*.
  4. Mismatch returns: *"كلمات المرور غير متطابقة"*.
  5. Changing password successfully invalidates all active sessions across all devices and redirects to `/login`.
  6. User logout (UC-04) purges session/JWT and redirects to `/login`.

### Story 1.5: Super Admin Company Creation & Isolated DB Provisioning
- **As a** Super Admin,
- **I want** to create a company and assign its initial branch manager,
- **So that** a new business entity is established with an isolated database.
- **Acceptance Criteria** [UC-07]:
  1. Form fields: Company Name (3-100 chars, unique), Commercial Activity, Address, Country, City (dependent on Country), Tax Number (optional), Branch Manager Name, Manager Email (unique), Manager Mobile (10 digits starting 05, unique), Temporary Password (valid 24h).
  2. Duplicate company name error: *"اسم الشركة مستخدم بالفعل"*.
  3. Duplicate email/mobile error: *"البيانات مستخدمة بالفعل"*.
  4. System executes database provisioning for `tenant_{uuid}_db`, runs tenant migrations, seeds 12 root COA accounts, creates Branch Manager account, and emails welcome credentials.
  5. Provisioning failure returns: *"حدث خطأ أثناء إنشاء الشركة، يرجى المحاولة مرة أخرى"*.

### Story 1.6: Company List, Freeze/Activate & Immediate Session Eviction
- **As a** Super Admin,
- **I want** to view all registered companies and freeze/activate any company,
- **So that** I can enforce organizational compliance and immediately halt activity of suspended companies.
- **Acceptance Criteria** [UC-08, UC-09, UC-10]:
  1. Company list displays: ID, Name, Manager Name, Email, Creation Date, Status (Active/Frozen), Actions.
  2. Clicking Freeze prompts confirmation modal: *"هل أنت متأكد من تجميد/تفعيل هذه الشركة؟"*.
  3. Confirming Freeze updates status to `Frozen` and increments `companies.session_epoch`.
  4. **Immediate eviction rule**: All active sessions/JWTs of all users belonging to this company are immediately invalidated; any subsequent API call returns HTTP 403.
  5. Super Admin can re-assign or change company branch manager (UC-10).

### Story 1.7: Super Admin Consolidated Dashboard
- **As a** Super Admin,
- **I want** a consolidated executive dashboard,
- **So that** I can monitor group-wide financial and operational performance in real time.
- **Acceptance Criteria** [UC-11]:
  1. Filters: Date Range Picker (From/To Date), Company DDL, Manager DDL.
  2. Metric Cards:
     - Total Group Revenue: $\sum(\text{Revenues of all active companies})$.
     - Total Group Expenses: $\sum(\text{Expenses of all active companies})$.
     - Group Net Profit: $\text{Total Revenue} - \text{Total Expenses}$.
     - Active Companies Count, Frozen Companies Count.
  3. Visual bar/line chart comparing Revenue and Expenses across each operating entity.
  4. Aggregates data strictly from active (non-frozen) entities.

### Story 1.8: Branch Manager Employee CRUD Management
- **As a** Branch Manager,
- **I want** to manage employees within my isolated company,
- **So that** I can staff accounting and data entry roles.
- **Acceptance Criteria** [UC-12, UC-13, UC-14, UC-15]:
  1. Lists employees belonging strictly to the manager's company. Filter by Role (Accountant, Data Entry) and Status (Active, Inactive).
  2. Add Employee form: Name (3-100 chars), Email (unique), Mobile (10 digits starting 05, unique), Role [General Accountant, Data Entry], Temporary Password.
  3. Modifying email/mobile sends an alert notification to the employee.
  4. Deactivating employee immediately terminates active session and blocks login.
  5. Deleting an accountant with posted journal entries is blocked.

---

## Epic 2: Core Financial Foundation, COA Hierarchy & Accounting Governance

### Story 2.1: Chart of Accounts (COA) Tree & Recursive Nature Inheritance
- **As a** General Accountant,
- **I want** to manage a hierarchical Chart of Accounts with fixed root types,
- **So that** all financial transactions adhere to standard double-entry accounting rules.
- **Acceptance Criteria** [UC-16, UC-17, UC-18, UC-19A]:
  1. 12 immutable root accounts seeded: Assets, Liabilities, Equity, Expenses, Revenues, Purchases, Sales, Purchase Returns, Sales Returns, Withdrawals, Discounts Allowed, Discounts Earned. Fixed roots cannot be edited or deleted.
  2. Add Account form: Name (3-100 chars), Root Account, Parent Account, Nature (Debit/Credit, auto-inherited read-only), Account Type [Root, Sub], Opening Date, Opening Balance ($\ge 0$).
  3. Asset accounts allow: Depreciation Method [Straight-Line, Declining Balance], Purchase Price, Depreciation Rate, Useful Life, Scrap Value.
  4. Account Nature cannot be modified if posted entries exist.
  5. Account cannot be deleted if child accounts exist or posted entries are linked (Error: *"لا يمكن حذف الحساب لوجود قيود مرتبطة به"*).

### Story 2.2: Cost Center Management & Mandatory Linking Enforcement
- **As a** General Accountant,
- **I want** to manage Cost Centers and enforce mandatory linking on revenue/expense accounts,
- **So that** all income and expenditures are accurately tracked per building or contracting project.
- **Acceptance Criteria** [UC-19B, UC-20, UC-21, UC-22, UC-23]:
  1. Cost center table shows: Name, Type [Property (عقار), Contracting Project (مشروع مقاولات)], Status, Actions.
  2. Add Cost Center: Name (3-100 chars, unique), Type, Description, Status.
  3. Type cannot be changed and cost center cannot be deleted if linked transactions exist.
  4. Mandatory Linking Configuration (UC-23): Accountant selects COA account $\rightarrow$ checks "إلزامي الربط بمركز تكلفة" $\rightarrow$ selects allowed cost centers.
  5. Backend blocks saving/posting any journal entry with this account without a cost center (Error: *"يجب تحديد مركز التكلفة لهذا الحساب"*).

### Story 2.3: Fiscal Year Management & Accounting Period Locking
- **As a** General Accountant,
- **I want** to manage fiscal years and close accounting periods,
- **So that** closed financial periods are permanently locked from unauthorized modifications.
- **Acceptance Criteria** [UC-24]:
  1. Create Fiscal Year: Name, Start Date, End Date ($> \text{Start Date}$).
  2. Fiscal Periods: Status toggle [Open, Closed].
  3. **Strict Lock Interceptor**: Any attempt to create, edit, approve, or post a voucher or journal entry dated within a closed period or closed year is blocked with error: *"لا يمكن إنشاء أو ترحيل قيود في فترة مالية مغلقة"*.

### Story 2.4: Fiscal Year-End Closing & Retained Earnings Rollover
- **As a** General Accountant,
- **I want** to close the fiscal year and roll over balances,
- **So that** revenues and expenses are zeroed out and net income is credited to Equity.
- **Acceptance Criteria** [UC-61]:
  1. Accountant initiates Close Fiscal Year $\rightarrow$ system displays summary of revenues, expenses, and net profit.
  2. Confirmation modal displays: *"هل أنت متأكد من إغلاق السنة المالية؟ هذه العملية لا يمكن التراجع عنها."*.
  3. System auto-generates closing entries zeroing out all Revenue and Expense accounts into P&L Summary and transfers Net Profit/Loss to Equity.
  4. Fiscal year transitions to `Closed` permanently.

---

## Epic 3: Real Estate Portfolio, Unit Provisioning & Tenant Registry

### Story 3.1: Property Management & Auto-Provisioning of Units and Cost Center
- **As a** Data Entry Clerk,
- **I want** to add properties with unit counts and have units and cost centers auto-created,
- **So that** property setup is streamlined and cost tracking is instantly enabled.
- **Acceptance Criteria** [UC-25, UC-26, UC-27, UC-28]:
  1. Add Property form: Name (3-100 chars, unique), Address, Type [Residential, Commercial, Mixed], Units Count ($\ge 1$, error: *"عدد الوحدات يجب أن لا يقل عن 1"*), Unit Type [Apartment, Shop, Office, Warehouse].
  2. **Automated Multi-Object Creation**:
     - Creates Property record.
     - Auto-creates Cost Center under the exact Property Name (`type = 'property'`).
     - Auto-creates $N$ Unit records numbered $1 \dots N$ with status `Vacant (شاغرة)`.
  3. Deleting a property with active contracts is blocked (Error: *"لا يمكن حذف العقار لوجود عقود نشطة"*).

### Story 3.2: Property Unit Lifecycle & Maintenance Management
- **As a** Data Entry Clerk,
- **I want** to manage individual units within a property,
- **So that** unit availability and maintenance statuses are accurately tracked.
- **Acceptance Criteria** [UC-29, UC-30, UC-31, UC-32]:
  1. Units table shows: Unit No, Type, Area ($m^2$), Status [Vacant, Occupied, Under Maintenance], Current Tenant Name, Actions.
  2. Add Single Unit: Unit No (unique in property), Type, Area, Status (Default `Vacant`).
  3. Duplicate unit number in same property displays: *"رقم الوحدة مكرر في نفس العقار"*.
  4. A unit with an active contract cannot be deleted or set to `Vacant` manually.

### Story 3.3: Tenant Master Registry (Individuals & Corporates)
- **As a** Data Entry Clerk,
- **I want** to maintain a comprehensive directory of individual and corporate tenants,
- **So that** tenants can be referenced in rental contracts and billing.
- **Acceptance Criteria** [UC-33, UC-34, UC-35, UC-36]:
  1. Tenant directory lists: Name, Type, National ID / CR, Mobile, Email, Active Contracts Count, Actions.
  2. Add Tenant form: Name (3-100 chars), Type [Individual, Company], National ID / CR (unique), Mobile (10 digits starting 05), Email (unique), Address, Notes.
  3. Duplicate National ID / CR returns: *"رقم الهوية مستخدم بالفعل"*.
  4. Duplicate Email returns: *"البريد الإلكتروني مستخدم بالفعل"*.
  5. Cannot modify National ID or delete tenant if rental contracts exist.

---

## Epic 4: Rental Contracts, Automated Installment Engine & Lifecycle Governance

### Story 4.1: Rental Contract Creation & Automated Installment Schedule Generation
- **As a** Data Entry Clerk,
- **I want** to create a rental contract and have payment installments generated automatically,
- **So that** tenant billing schedules and unit occupancy are updated immediately.
- **Acceptance Criteria** [UC-37, UC-38]:
  1. Form inputs: Tenant DDL, Property DDL, Unit DDL (**displays only Vacant units**), Contract Type [Owner-Company, Company-Tenant], Start Date ($\ge \text{Today}$), End Date ($> \text{Start Date}$), Duration (Months), Total Rent ($> 0$), Collection Cycle [Monthly, Quarterly, Semi-Annual, Annual], First Payment.
  2. Unit occupied validation error: *"الوحدة مشغولة بعقد آخر"*.
  3. Date validation error: *"تاريخ النهاية يجب أن يكون أكبر من تاريخ البداية"*.
  4. Contract status created as `Active (ساري)`.
  5. Selected unit status automatically transitions from `Vacant` $\rightarrow$ `Occupied (مشغولة)`.
  6. **Automated Installment Engine**:
     - Monthly: 12 installments / year.
     - Quarterly: 4 installments / year.
     - Semi-Annual: 2 installments / year.
     - Annual: 1 installment / year.
     - Due dates spaced per cycle; installment statuses set to `Due (مستحقة)`.

### Story 4.2: Rental Contract Modifications, Document Uploads & Print/PDF
- **As a** Data Entry Clerk,
- **I want** to edit active contracts, attach documents, and print official lease agreements,
- **So that** contracts are documented and exportable.
- **Acceptance Criteria** [UC-39, UC-40, UC-41]:
  1. Modifying rent value or cycle recalculates only future unpaid installments; historical paid installments remain unchanged. Cannot edit expired contracts.
  2. Print / PDF Export renders formatted agreement with tenant info, unit specs, terms, and full installment table (UC-40).
  3. File Upload (UC-41) accepts PNG, JPEG, PDF up to 5MB per file, max 10 attachments per contract.

### Story 4.3: Two-Step Contract Cancellation Workflow & Unit Release
- **As a** Data Entry Clerk and Branch Manager,
- **I want** a Maker-Checker cancellation workflow for rental contracts,
- **So that** contracts are not cancelled without managerial approval and units are accurately released.
- **Acceptance Criteria** [UC-41A, UC-42]:
  1. Data Entry initiates cancellation on active/overdue contract $\rightarrow$ enters mandatory Cancellation Reason ($\ge 10$ chars). Contract status transitions to `Pending Cancellation (طلب إلغاء معلق)`. **Unit remains `Occupied`**.
  2. Branch Manager reviews pending cancellation in `/company/contracts`.
  3. **Manager Approval**: Contract status transitions to `Cancelled (ملغي)`. **Unit status immediately reverts to `Vacant (شاغرة)`**. Remaining dues calculated.
  4. **Manager Rejection**: Requires rejection reason. Contract reverts to previous state (`Active` or `Overdue`); Data Entry is alerted.

---

## Epic 5: Maker-Checker Financial Vouchers & Automated Balanced Ledger Engine

### Story 5.1: Create Draft Receipt Voucher (سند قبض)
- **As a** Data Entry Clerk (Maker),
- **I want** to create a draft receipt voucher against an installment when rent is collected,
- **So that** collections are recorded as drafts awaiting accountant approval.
- **Acceptance Criteria** [UC-43]:
  1. Form inputs: Rental Contract DDL, Installment DDL (lists unpaid installments), Collected Amount ($> 0$, $\le \text{Outstanding Installment Balance}$), Collection Date, Cost Center (auto-filled from contract property), Payment Method [Cash, Bank Transfer, Cheque], Notes.
  2. Amount $>$ Installment error: *"المبلغ أكبر من قيمة الدفعة"*.
  3. Already paid installment error: *"الدفعة مدفوعة مسبقاً"*.
  4. Voucher saved with status `Draft (مسودة)`. No impact on ledger. Dispatches in-app notification to General Accountant (UC-67).

### Story 5.2: Create Draft Disbursement Voucher (سند صرف)
- **As a** Data Entry Clerk (Maker),
- **I want** to record operating and maintenance expenses as draft disbursement vouchers,
- **So that** company expenditures are queued for accountant approval.
- **Acceptance Criteria** [UC-44]:
  1. Form inputs: Expense Type [Maintenance, Electricity, Water, Rent, Salaries, Other], Amount ($> 0$), Expense Date, Cost Center DDL, Debit Account (COA expense), Credit Account (Cash/Bank), Attachments, Notes.
  2. Amount $\le 0$ error: *"لا يمكن أن تكون القيمة أقل من أو تساوي 0"*.
  3. Voucher saved as `Draft (مسودة)`. No impact on ledger. Dispatches in-app alert to General Accountant.

### Story 5.3: Accountant Voucher Queue: Audit, Approve & Auto-Post Balanced Journal Entry
- **As a** General Accountant (Checker),
- **I want** to review draft vouchers and approve them to auto-generate balanced journal entries,
- **So that** financial vouchers are audited before posting to the General Ledger.
- **Acceptance Criteria** [UC-46, UC-47]:
  1. Displays queue of draft and rejected vouchers with filtering by type and date.
  2. Clicking "تأكيد الاعتماد (Confirm Approval)" verifies the fiscal period is open.
  3. **Automated Journal Entry Engine**:
     - *For Receipt Voucher*: Debit Cash/Bank = Amount; Credit Rental Revenue = Amount; Cost Center = Contract Cost Center; Installment status $\rightarrow$ `Paid`.
     - *For Disbursement Voucher*: Debit Expense Account = Amount; Credit Cash/Bank = Amount; Cost Center = Voucher Cost Center.
  4. Voucher status transitions to `Approved (معتمد)`.
  5. The Journal Entry is immediately posted to the General Ledger and Trial Balance.
  6. Posted entries are immutable (cannot be edited/deleted).

### Story 5.4: Accountant Voucher Rejection with Mandatory Reason & Maker Resubmission
- **As a** General Accountant and Data Entry Clerk,
- **I want** the accountant to reject incorrect vouchers with explanation and allow the clerk to revise,
- **So that** errors are corrected with clear audit trails.
- **Acceptance Criteria** [UC-45, UC-48]:
  1. Accountant clicks "رفض (Reject)" $\rightarrow$ rejection modal displays required Text Area.
  2. Reason must be $\ge 10$ and $\le 500$ chars. If $< 10$ chars: *"سبب الرفض يجب ألا يقل عن 10 أحرف"*.
  3. Voucher status transitions to `Rejected (مرفوض)`. Real-time in-app alert dispatched to Data Entry (UC-68).
  4. Data Entry opens rejected voucher, reviews accountant remarks (read-only), edits fields, and clicks "إعادة إرسال (Resubmit)" $\rightarrow$ status resets to `Draft`.

### Story 5.5: Manual Balanced Journal Entry Creation & Posting
- **As a** General Accountant,
- **I want** to create and post manual journal entries with strict balance validation,
- **So that** non-voucher adjustments, accruals, and settlements can be posted.
- **Acceptance Criteria** [UC-49, UC-50, UC-51]:
  1. Sequential Entry Number, Date (must be in open fiscal period), Explanation (10-500 chars).
  2. Line items table: Account DDL, Cost Center DDL (mandatory if account requires it), Debit, Credit, Line Note.
  3. Dynamic real-time calculation: Total Debit, Total Credit, Difference ($\text{Total Debit} - \text{Total Credit}$).
  4. "حفظ كمسودة (Save as Draft)" always enabled $\rightarrow$ saves as `Draft`.
  5. "حفظ وترحيل (Save & Post)" **enabled ONLY when Difference $= 0$ and Total Debit $> 0$**.
  6. Unbalanced error: *"القيد غير متوازن، يرجى مراجعة البنود"*.
  7. Missing mandatory cost center error: *"يجب تحديد مركز التكلفة لهذا الحساب"*.
  8. Posted entries are immutable.

---

## Epic 6: Contracting Progress Billing & Commercial Procurement

### Story 6.1: Contractor Progress Billing (مستخلصات المقاولين) Draft & Line Items
- **As a** Data Entry Clerk,
- **I want** to enter contractor progress billings with line-item quantities and rates,
- **So that** contractor claims are submitted for accountant approval.
- **Acceptance Criteria** [UC-52, UC-53]:
  1. Inputs: Contractor DDL, Project Cost Center DDL, Invoice Number (unique), Date, Attachments.
  2. Line Items Table: Description, Quantity ($> 0$), Unit, Unit Price ($> 0$), Item Total ($\text{Quantity} \times \text{Unit Price}$).
  3. Summary: Gross Total ($\sum \text{Item Totals}$), Tax Rate/Amount, Grand Total ($\text{Gross} + \text{Tax}$).
  4. Duplicate invoice number returns: *"رقم المستخلص مستخدم بالفعل"*.
  5. Saved as `Draft (مسودة)`. Dispatches alert to General Accountant.

### Story 6.2: Contractor Progress Billing Audit & Approval
- **As a** General Accountant,
- **I want** to audit and approve contractor progress billings,
- **So that** construction liabilities are formally booked.
- **Acceptance Criteria** [UC-54]:
  1. Accountant reviews line items and cost center $\rightarrow$ clicks Approve.
  2. Status transitions to `Approved (معتمد)`.
  3. Auto-posts balanced journal entry booking contractor liability against construction in progress / project expense.

### Story 6.3: Supplier Purchase Invoice Draft Entry
- **As a** Data Entry Clerk,
- **I want** to enter supplier purchase invoices with discounts and tax breakdowns,
- **So that** procurement expenses are recorded as drafts.
- **Acceptance Criteria** [UC-55]:
  1. Inputs: Supplier DDL, Invoice Number, Date, Cost Center DDL, Gross Purchases ($> 0$), Discount Earned ($\ge 0$), Net ($\text{Gross} - \text{Discount}$), Tax Type [VAT, Excise], Tax Amount ($\text{Net} \times \text{Tax Rate}$), Total Payable ($\text{Net} + \text{Tax}$), Payment Terms [Cash, Credit], Counter Account, Attachments.
  2. Saved as `Draft (مسودة)`. Dispatches alert to General Accountant.

---

## Epic 7: Comprehensive Financial Statements & High-Performance Export

### Story 7.1: Trial Balance (ميزان المراجعة) Calculation & Balance Verification
- **As a** General Accountant and Management,
- **I want** to view and export the Trial Balance,
- **So that** ledger debit and credit equilibrium is verified across all accounts.
- **Acceptance Criteria** [UC-56, UC-60]:
  1. Select Fiscal Year (Mandatory) and Date Range (From/To Date).
  2. Columns: Code & Name, Opening Debit, Opening Credit, Period Debit, Period Credit, Ending Debit, Ending Credit.
  3. Displays all accounts in COA, including zero-balance accounts.
  4. Balance verification: $\sum \text{Ending Debit} - \sum \text{Ending Credit} = 0$.
  5. If unbalanced, displays red alert: *"ميزان المراجعة غير متوازن، يرجى مراجعة القيود اليومية"*.
  6. Action buttons: "طباعة PDF" and "تصدير Excel (.xlsx)" load in $< 5.0$ seconds (NFR-002).

### Story 7.2: General Ledger (دفتر الأستاذ العام) with Counter-Account Tracking
- **As a** General Accountant,
- **I want** to inspect the General Ledger for any account with transaction details,
- **So that** complete transaction history and running balances can be audited.
- **Acceptance Criteria** [UC-57A]:
  1. Inputs: Account DDL (Mandatory), Counter Account DDL (Optional filter), Date Range (Optional).
  2. Table: Date, Entry No (Clickable link to entry details), Counter Account Name, Explanation, Debit, Credit, Running Balance.
  3. Running balance calculated based on debit vs. credit account nature.
  4. Multiple counter accounts displayed as *"المذكورين"*.
  5. Exportable to PDF and Excel (.xlsx).

### Story 7.3: Balance Sheet (الميزانية العمومية) & Accounting Equation Verification
- **As a** General Accountant and Super Admin,
- **I want** to generate the Balance Sheet,
- **So that** financial position is confirmed satisfying $\text{Assets} = \text{Liabilities} + \text{Equity}$.
- **Acceptance Criteria** [UC-57B]:
  1. Select Fiscal Year and Date Range.
  2. Assets: Fixed Assets (net of accumulated depreciation), Current Assets, Other Assets. Total Assets.
  3. Liabilities: Short-term Liabilities, Long-term Liabilities, Other Liabilities. Total Liabilities.
  4. Equity: Capital + Net Profit/Loss (imported from Income Statement) - Withdrawals. Total Equity.
  5. Strict validation: $\text{Total Assets} - (\text{Total Liabilities} + \text{Total Equity}) = 0$.
  6. If unbalanced, displays alert: *"الميزانية العمومية غير متوازنة، يرجى مراجعة القيود"*.
  7. Exportable to PDF and Excel (.xlsx).

### Story 7.4: Income Statement & Per-Building Income Statement
- **As a** General Accountant and Branch Manager,
- **I want** to view the Income Statement and Per-Building P&L,
- **So that** overall company profitability and individual building ROI are visible.
- **Acceptance Criteria** [UC-58, UC-59, UC-63]:
  1. Income Statement (UC-58): Net Sales, Beginning Inventory, Net Purchases, Ending Inventory, COGS, Gross Profit, Other Revenues, Expenses, Net Profit/Loss.
  2. Per-Building P&L (UC-59, UC-63): Filter by Building Cost Center and Date Range. Displays Building Revenues, Direct Expenses, and Net Building Contribution.
  3. Read-only for Branch Manager.
  4. Exportable to PDF and Excel (.xlsx).

---

## Epic 8: Automated Cron Reminders, Status Transitions & Multi-Channel Alerts

### Story 8.1: Daily Rent Due Reminders Cron Job (7-Day Advance & Due Date)
- **As an** Automated System Background Worker,
- **I want** to scan installments daily and send SMS/Email reminders to tenants,
- **So that** tenants are notified of upcoming rent due dates automatically.
- **Acceptance Criteria** [UC-64, UC-65]:
  1. Daily 08:00 AM Cron queries installments due in 7 days ($\text{Due Date} = \text{Today} + 7$). Dispatches SMS and Email with contract number and amount.
  2. Daily 08:00 AM Cron queries installments where $\text{Due Date} = \text{Today}$ and status $= \text{Due}$. Dispatches due-day alert.
  3. Prevents duplicate notifications for the same installment.
  4. Logs dispatch details (recipient, message, status, timestamp) in `notification_logs`.

### Story 8.2: Daily Overdue Status Transition Cron Job
- **As an** Automated System Background Worker,
- **I want** to identify unpaid installments 1 day past due and transition statuses,
- **So that** overdue contracts and installments are flagged without manual intervention.
- **Acceptance Criteria** [UC-66]:
  1. Daily 00:01 AM Cron queries installments where $\text{Due Date} < \text{Today}$ and status $= \text{Due}$.
  2. Transitions installment status to `Overdue (متأخرة)`.
  3. Transitions parent rental contract status to `Overdue (متأخر)`.
  4. Dispatches immediate in-app notifications to the Branch Manager and General Accountant.

### Story 8.3: Real-Time In-App Maker-Checker Alerts
- **As a** General Accountant and Data Entry Clerk,
- **I want** instant in-app alerts for voucher creation and rejection,
- **So that** Maker-Checker handoffs happen with zero latency.
- **Acceptance Criteria** [UC-67, UC-68]:
  1. When Data Entry creates a draft voucher $\rightarrow$ Accountant receives instant in-app alert and badge count $+1$.
  2. When Accountant rejects a voucher $\rightarrow$ Data Entry receives instant in-app alert displaying rejection reason.

### Story 8.4: SMS Gateway & SMTP External Integration Adapters
- **As a** System Integration Service,
- **I want** reliable, secure adapters for SMS Gateway and SMTP Email,
- **So that** notifications and invoices are transmitted reliably.
- **Acceptance Criteria** [UC-69, UC-70, NFR-004]:
  1. SMS Gateway: Encrypted API key storage, HTTP REST client, exponential backoff retries, transmission audit logging.
  2. SMTP Service: Encrypted credentials, TLS/SSL connection, queued background delivery with HTML email templates.
  3. Automated daily MySQL database backups (NFR-004).
