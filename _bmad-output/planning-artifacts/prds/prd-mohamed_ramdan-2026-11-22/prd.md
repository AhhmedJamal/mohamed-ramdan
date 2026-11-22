---
title: "Product Requirements Document (PRD): Cloud Accounting & Operational ERP System"
status: final
created: "2026-11-22"
updated: "2026-11-22"
project_name: "mohamed_ramdan"
owner: "Mr. Mohamed Ramadan (أ. محمد رمضان)"
version: "1.0"
source_document: "docs/SRS-Mohamed-Ramdan.md"
---

# Product Requirements Document (PRD)
## Cloud Accounting & Operational ERP System (Mohamed Ramadan Group)

---

## 1. Document Overview & Objective

### 1.1 Purpose
This Product Requirements Document (PRD) serves as the exhaustive, authoritative software specification for the **Cloud Accounting & Operational ERP System** developed for **Mohamed Ramadan Group (مجموعة الأستاذ محمد رمضان)**. Every functional requirement, validation rule, error message, permission constraint, accounting formula, state transition, and non-functional requirement documented herein is translated directly and completely from `@docs/SRS-Mohamed-Ramdan.md` without omission.

### 1.2 Target Audience
- Full Stack Engineering Team (PHP Laravel Backend, React.js Frontend, MySQL Multi-Tenant DB)
- Technical Project Manager & Solution Architect
- Quality Assurance (QA) & Test Engineers
- Project Sponsor: Mr. Mohamed Ramadan (أ. محمد رمضان)

### 1.3 Tech Stack & Deployment Constraints
- **Frontend**: React.js (Single Page Application, responsive, Arabic RTL primary with English toggle)
- **Backend**: PHP Laravel (RESTful APIs, multi-tenant database switching middleware, queue workers)
- **Database**: MySQL (Isolated Multi-Tenancy — separate database per company entity)
- **Hosting**: AWS / DigitalOcean cloud infrastructure (99.9% availability)
- **Subdomains**: `comp1.ehkam.com`, `comp2.ehkam.com`, `comp3.ehkam.com`
- **Supported Browsers**: Google Chrome, Apple Safari, Microsoft Edge (fully responsive across mobile, tablet, and desktop)

---

## 2. Scope & Actor Governance

### 2.1 In-Scope Capabilities
1. Multi-Tenant Administration (Isolated databases, company lifecycle, subdomain routing, consolidated dashboards).
2. Role-Based Access Control (RBAC) & Authentication (Session management, 5-attempt brute-force protection, 24h reset links, role redirection).
3. Core Financial Setup (Hierarchical Chart of Accounts with fixed root types, Cost Centers, Fiscal Years, Accounting Period Locking).
4. Real Estate Operations (Property & auto-unit creation, tenant master directory, rental contracts, automated installment schedules, cancellation approval).
5. Contracting & Commercial Modules (Contractor milestone billing, line-item quantity/unit price calculations, supplier purchase invoices).
6. Maker-Checker Financial Engine (Draft vouchers, rejection with $\ge 10$ char remarks, automated balanced journal entry generation, immutable general ledger).
7. Comprehensive Financial Reporting (Trial Balance, General Ledger, Balance Sheet, Income Statement, Per-Building Income Statement, PDF & Excel exports).
8. Automated Background Jobs & Event Notifications (7-day rent reminder, due-date reminder, 1-day overdue transition, real-time in-app alerts, SMS & SMTP email integration).

### 2.2 Out-of-Scope (Strictly Excluded)
1. Native Mobile Applications (iOS / Android) for tenants or property owners.
2. External Online Payment Gateways (e.g., credit card, Mada, Apple Pay APIs).
3. Direct Government "Ejar" Platform API integration in this version.
4. Tenant self-service portal / online checkout.

---

### 2.3 User Personas & Actors

| Actor Name | Arabic Title | Description | Default Landing Page |
| :--- | :--- | :--- | :--- |
| **Super Admin** | الأدمن العام | Highest administrative and technical owner. Creates companies, provisions databases, assigns managers, views group-wide consolidated dashboards and reports. | `/admin/dashboard` |
| **Branch Manager** | مدير الشركة | Operational and managerial head within an isolated company scope. Manages employees, views company reports, approves contract cancellations and exceptional discounts. | `/company/dashboard` |
| **General Accountant** | المحاسب العام | Financial gatekeeper. Holds sole authority to configure COA, Cost Centers, Fiscal Years, approve/reject vouchers, post manual journal entries, and export final financial statements. | `/accounting/dashboard` |
| **Data Entry** | مدخل البيانات | Operational clerk. Enters properties, units, tenants, contracts, cancellation requests, and creates draft vouchers, contractor bills, and supplier invoices. | `/data-entry/dashboard` |
| **Tenant** | المستأجر | Indirect actor. Receives automated SMS/Email reminders 7 days prior to rent due date, on due date, and overdue notices. | External Recipient |
| **SMS Gateway** | بوابة SMS | External messaging integration for dispatching operational SMS text messages. | System API |

---

### 2.4 CRUD Permission Matrix (Section 1.6)

The following permission matrix is enforced at both the API middleware and UI routing layers:

| Functional Module | Super Admin (الأدمن العام) | Branch Manager (مدير الشركة) | General Accountant (المحاسب العام) | Data Entry (مدخل البيانات) |
| :--- | :---: | :---: | :---: | :---: |
| **Company Management (إدارة الشركات)** | **CRUD** | — | — | — |
| **Employee Management (إدارة الموظفين)** | — | **CRUD** | Read | Read |
| **Chart of Accounts (شجرة الحسابات)** | — | Read | **CRUD** | Read |
| **Cost Centers (مراكز التكلفة)** | — | Read | **CRUD** | Read |
| **Fiscal Year (السنة المالية)** | — | Read | **CRUD** | Read |
| **Properties & Units (العقارات والوحدات)** | — | Read | Read | **CRUD** |
| **Tenants (المستأجرون)** | — | Read | Read | **CRUD** |
| **Rental Contracts (عقود الإيجار)** | — | Read | Read | **Create / Read / Update** |
| **Receipt / Disbursement Vouchers (سندات القبض/الصرف)** | — | Read | **Read / Approve / Reject** | **Create / Update (Draft)** |
| **Manual Journal Entries (القيود اليومية اليدوية)** | — | Read | **Create / Read** | Read |
| **Contractor Invoices (مستخلصات المقاولين)** | — | Read | **Approve** | **Create (Draft)** |
| **Supplier Invoices (فواتير الموردين)** | — | Read | Read | **Create (Draft)** |
| **Financial Reports (التقارير المالية)** | **Read (Consolidated)** | **Read (Company-only)** | **CRUD / Export** | — |
| **Dashboards (لوحة القياس)** | **Read (Consolidated)** | **Read (Company-only)** | **Read** | — |

---

## 3. Traceable Functional Requirements (UC-01 through UC-70)

### Module 3.1: Authentication & Access Management

#### FR-01 (UC-01): System Login & Role-Based Redirection
- **Actor**: Any User (Super Admin, Branch Manager, General Accountant, Data Entry)
- **Pre-Conditions**: Valid account exists; application accessible via base URL or tenant subdomain.
- **Form Components & Validations**:
  - `Email`: Text Input, Mandatory, valid email syntax, max 100 characters. Error: *"يرجى إدخال بريد إلكتروني صحيح"*.
  - `Password`: Password Input with show/hide toggle, Mandatory, encrypted (hashed in DB), 8 to 25 characters. Error: *"يرجى إدخال كلمة المرور"*.
  - `Submit Button`: Enabled only when all mandatory fields are valid.
  - `Forgot Password Link`: Navigates to FR-02.
- **Post-Conditions & Role Redirection**:
  - Super Admin $\rightarrow$ `/admin/dashboard`
  - Branch Manager $\rightarrow$ `/company/dashboard`
  - General Accountant $\rightarrow$ `/accounting/dashboard`
  - Data Entry $\rightarrow$ `/data-entry/dashboard`
- **Alternative & Security Rules**:
  - Invalid credentials error: *"بيانات الدخول غير صحيحة"*.
  - Deactivated / deleted account error: *"لا يمكن الوصول إلى الحساب"*.
  - **Brute-Force Policy**: Maximum 5 consecutive failed login attempts before a 15-minute temporary account lockout.

#### FR-02 (UC-02): Forgot Password - Email Submission
- **Actor**: Any Registered User
- **Pre-Conditions**: Navigated from Login screen.
- **Components & Validations**:
  - `Email`: Text Input, Mandatory, valid email syntax.
  - `Submit Button`: Enabled upon valid email entry.
- **Post-Conditions**: Generates a secure, cryptographically random reset token; dispatches reset link via SMTP. Success message: *"تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني"*.
- **Alternative & Business Rules**:
  - Unregistered email: *"البريد الإلكتروني غير مسجل في النظام"*.
  - Invalid email syntax: *"يرجى إدخال بريد إلكتروني صحيح"*.
  - **Token Expiry**: Token is valid for 24 hours. Resend cooldown rate limit: 60 seconds.

#### FR-03 (UC-03): Reset Password via Token Link
- **Actor**: Any User holding valid token
- **Pre-Conditions**: User opened reset link from email; link is within 24-hour window and unused.
- **Components & Validations**:
  - `New Password`: Password Input, Mandatory, 8 to 25 characters.
  - `Confirm Password`: Password Input, Mandatory, must strictly match `New Password`.
  - `Submit Button`: Triggers password update.
- **Post-Conditions**: Updates hashed password in database; invalidates token immediately (single-use only); redirects user to Login (FR-01).
- **Alternative Rules**:
  - Token already used: *"اللينك مستخدم من قبل، يرجى طلب لينك جديد"*.
  - Token expired: *"انتهت صلاحية اللينك، يرجى طلب لينك جديد"*.
  - Resend request generates new token and resets cooldown timer.

#### FR-04 (UC-04): User Logout
- **Actor**: All Authenticated Users
- **Main Flow**: User selects "حسابي" dropdown $\rightarrow$ clicks "تسجيل الخروج".
- **Post-Conditions**: Invalidate session/JWT token on backend; purge client-side session and auth state; redirect to `/login`.
- **Alternative**: Session timeout due to inactivity automatically redirects to `/login` with notification: *"انتهت صلاحية الجلسة"*.

#### FR-05 (UC-05): View & Edit User Profile
- **Actor**: All Authenticated Users
- **Components & Validations**:
  - `Profile Picture`: Image upload (PNG, JPEG), max 5MB, optional.
  - `Name`: Text Input, Mandatory, 3 to 100 characters.
  - `Email`: Text Input, Mandatory, Read-Only for user (modifiable only by Admin/Manager).
  - `Mobile Number`: Text Input, Mandatory, exactly 10 digits starting with `05`.
  - `Save Button`: Persists updates.
  - `Change Password Link`: Navigates to FR-06.
- **Business Rules**: Email and mobile must remain globally unique. Changing email/mobile sends an alert notification.

#### FR-06 (UC-06): Change Password from Profile
- **Actor**: Authenticated User
- **Components & Validations**:
  - `Current Password`: Password Input, Mandatory. Verification failure error: *"كلمة المرور الحالية غير صحيحة"*.
  - `New Password`: Password Input, Mandatory, 8 to 25 characters.
  - `Confirm New Password`: Password Input, Mandatory. Mismatch error: *"كلمات المرور غير متطابقة"*.
- **Post-Conditions & Rules**: Updates password hash; terminates all active sessions across all devices for this user; redirects to `/login`.

---

### Module 3.2: Company & Multi-Tenant Management

#### FR-07 (UC-07): Create Company & Provision Tenant DB
- **Actor**: Super Admin (الأدمن العام)
- **Components & Validations**:
  - `Company Name`: Text Input, Mandatory, 3 to 100 characters, globally unique. Duplicate error: *"اسم الشركة مستخدم بالفعل"*.
  - `Commercial Activity (النشاط التجاري)`: Text Input, Mandatory.
  - `Address`: Text Input, Mandatory.
  - `Country`: Dropdown (DDL), Mandatory.
  - `City`: Dropdown (DDL), Mandatory, dynamically filtered based on selected Country.
  - `Tax Registration Number (الرقم الضريبي)`: Text Input, Optional, valid tax format.
  - `Branch Manager Name`: Text Input, Mandatory.
  - `Manager Email`: Text Input, Mandatory, valid email, globally unique.
  - `Manager Mobile`: Text Input, Mandatory, 10 digits starting with `05`, globally unique.
  - `Temporary Password`: Password field, auto-generated or manual, encrypted, valid for 24 hours.
  - `Submit Button`: Executes provisioning.
- **Post-Conditions & Multi-Tenancy Architecture**:
  - System provisions an isolated MySQL tenant database.
  - Migrates full tenant schema (COA root accounts, seed tables).
  - Creates Branch Manager account bound to the new tenant.
  - Dispatches welcome email with credentials to the manager.
  - On DB provisioning error: *"حدث خطأ أثناء إنشاء الشركة، يرجى المحاولة مرة أخرى"*.

#### FR-08 (UC-08): List Registered Companies
- **Actor**: Super Admin
- **Components**:
  - Search Input (by company name).
  - Status Filter: Dropdown [All, Active (نشطة), Frozen (مجمدة)].
  - Table Columns: Index (#), Company Name, Manager Name, Email, Creation Date, Status, Actions (Freeze/Activate, View, Edit).
  - "Create New Company" CTA button.

#### FR-09 (UC-09): Freeze & Activate Company
- **Actor**: Super Admin
- **Workflow**: Super Admin clicks Freeze/Activate toggle $\rightarrow$ confirmation modal appears (*"هل أنت متأكد من تجميد/تفعيل هذه الشركة؟"*) $\rightarrow$ clicks Confirm.
- **Business Rule (Immediate Eviction)**:
  - Freezing a company updates company status to `Frozen`.
  - **Immediately and forcefully terminates all active sessions of all employees belonging to this company**.
  - All subsequent login attempts by company employees are blocked while company is frozen.
  - Historical financial data remains intact and immutable.

#### FR-10 (UC-10): Assign / Change Branch Manager
- **Actor**: Super Admin
- **Components & Validations**:
  - Manager Name (Mandatory), Email (Mandatory, unique), Mobile (Mandatory, 10 digits starting 05), Temporary Password.
- **Business Rules**:
  - Each company has exactly one primary active manager at any time.
  - A single individual (email) can be assigned as manager of multiple companies; when authenticated, the manager has access to switch between assigned companies without separate credentials.

#### FR-11 (UC-11): Consolidated Executive Dashboard
- **Actor**: Super Admin
- **Components & Formulas**:
  - `Date Range Picker`: From Date — To Date.
  - `Company Filter`: DDL of all registered companies.
  - `Manager Filter`: DDL of registered company managers.
  - `Total Group Revenue Card`: $\text{Total\_Revenue} = \sum(\text{Revenue of all Active Companies})$.
  - `Total Group Expenses Card`: $\text{Total\_Expenses} = \sum(\text{Expenses of all Active Companies})$.
  - `Group Net Profit Card`: $\text{Net\_Profit} = \text{Total\_Revenue} - \text{Total\_Expenses}$.
  - `Active Companies Count Card` & `Frozen Companies Count Card`.
  - `Comparative Chart`: Bar/Line visual comparing revenues and expenses per company.
- **Constraint**: Aggregates data strictly from active (non-frozen) companies.

---

### Module 3.3: Employee Management (Per-Company)

#### FR-12 (UC-12): List Company Employees
- **Actor**: Branch Manager (مدير الشركة)
- **Components**:
  - Search by employee name.
  - Role Filter: DDL [All, General Accountant (محاسب عام), Data Entry (مدخل بيانات)].
  - Status Filter: DDL [All, Active (مفعّل), Inactive (معطّل)].
  - Table Columns: Name, Role, Email, Mobile, Status, Actions (Edit, Activate/Deactivate, Delete).
- **Business Rule**: Branch Manager sees only employees belonging to their isolated company.

#### FR-13 (UC-13): Add New Employee
- **Actor**: Branch Manager
- **Components & Validations**:
  - `Employee Name`: Text Input, Mandatory, 3 to 100 characters.
  - `Email`: Text Input, Mandatory, valid email, unique in tenant.
  - `Mobile Number`: Text Input, Mandatory, 10 digits starting with `05`, unique.
  - `Role`: Dropdown, Mandatory [General Accountant, Data Entry].
  - `Temporary Password`: Password field, 8 to 25 characters.
- **Post-Conditions**: Account created in `Active` status by default; welcome credentials dispatched via email.

#### FR-14 (UC-14): Edit Employee Data
- **Actor**: Branch Manager
- **Components**: Name, Email (unique), Mobile (unique), Role.
- **Business Rule**: Modifying email or mobile dispatches an alert notification to the employee.

#### FR-15 (UC-15): Activate / Deactivate Employee
- **Actor**: Branch Manager
- **Workflow**: Manager toggles status $\rightarrow$ confirmation modal.
- **Business Rule**: Deactivating an employee updates status to `Inactive`, immediately invalidates active sessions, and prevents login.

---

### Module 3.4: Financial Setup (COA, Cost Centers, Fiscal Years)

#### FR-16 (UC-16): Chart of Accounts (COA) Tree View
- **Actor**: General Accountant (CRUD), Branch Manager (Read), Data Entry (Read)
- **Components**:
  - Interactive hierarchical tree view showing Account Code, Account Name, Account Nature (Debit/Credit), Current Balance.
  - Search bar by code or name.
  - "Add Account" CTA button.
- **Fixed Root Accounts Invariant**:
  - The root account classes are permanently fixed and cannot be deleted or reclassified:
    1. **Assets (الأصول)** $\rightarrow$ Debit (مدين)
    2. **Liabilities (الخصوم)** $\rightarrow$ Credit (دائن)
    3. **Equity (حقوق الملكية)** $\rightarrow$ Credit (دائن)
    4. **Expenses (المصروفات)** $\rightarrow$ Debit (مدين)
    5. **Revenues (الإيرادات)** $\rightarrow$ Credit (دائن)
    6. **Purchases (المشتريات)** $\rightarrow$ Debit (مدين)
    7. **Sales (المبيعات)** $\rightarrow$ Credit (دائن)
    8. **Purchase Returns (مردودات المشتريات)** $\rightarrow$ Credit (دائن)
    9. **Sales Returns (مردودات المبيعات)** $\rightarrow$ Debit (مدين)
    10. **Withdrawals (المسحوبات)** $\rightarrow$ Debit (مدين)
    11. **Discounts Allowed (خصم مسموح به)** $\rightarrow$ Debit (مدين)
    12. **Discounts Earned (خصم مكتسب)** $\rightarrow$ Credit (دائن)
  - Infinite sub-account nesting levels are supported. Sub-accounts strictly inherit account nature from parent.

#### FR-17 (UC-17): Add Account to COA
- **Actor**: General Accountant
- **Components & Validations**:
  - `Account Name`: Text Input, Mandatory, 3 to 100 characters.
  - `Root Account`: Dropdown, Mandatory (from fixed roots above).
  - `Parent Account`: Dropdown, conditional (required if Account Type is Sub-Account).
  - `Account Nature`: Read-only label, auto-inherited based on root account selection.
  - `Account Type`: Radio buttons [Root (رئيسي), Sub-Account (فرعي)].
  - `Account Opening Date`: Date Picker, Mandatory, defaults to today.
  - `Opening Balance`: Decimal Number, optional, $\ge 0$.
  - *For Asset Accounts only*:
    - `Depreciation Method`: DDL [Straight-Line (قسط ثابت), Declining Balance (قسط متناقص)].
    - `Purchase Price`: Decimal Number, Mandatory.
    - `Depreciation Rate (%)`: Decimal Number, Mandatory.
    - `Useful Life (Years)`: Number, Optional.
    - `Scrap Value (قيمة الخردة)`: Decimal Number, Optional.

#### FR-18 (UC-18): Edit COA Account
- **Actor**: General Accountant
- **Business Rule**: Account nature and parent type **cannot be edited** if posted journal entries are associated with the account.

#### FR-19 (UC-19A): Delete COA Account
- **Actor**: General Accountant
- **Business Rules**:
  - Fixed root accounts can **never** be deleted.
  - Any account having child accounts or posted journal entries **cannot** be deleted (Error: *"لا يمكن حذف الحساب لوجود قيود مرتبطة به"*).

#### FR-20 (UC-19B): List Cost Centers
- **Actor**: General Accountant (CRUD), Branch Manager (Read), Data Entry (Read)
- **Components**: Table showing Cost Center Name, Type [Property (عقار), Contracting Project (مشروع مقاولات)], Status [Active, Inactive], Actions.

#### FR-21 (UC-20): Add Cost Center
- **Actor**: General Accountant
- **Components & Validations**:
  - `Cost Center Name`: Text Input, Mandatory, 3 to 100 characters, unique in tenant.
  - `Cost Center Type`: DDL, Mandatory [Property (عقار), Contracting Project (مشروع مقاولات)].
  - `Description`: Text Area, Optional, max 500 characters.
  - `Status`: Radio button [Active (نشط), Inactive (معطّل)].

#### FR-22 (UC-21): Edit Cost Center
- **Actor**: General Accountant
- **Business Rule**: Cost Center Type cannot be altered if journal entries or transactions are already linked.

#### FR-23 (UC-22): Delete Cost Center
- **Actor**: General Accountant
- **Business Rule**: Cannot delete a Cost Center with existing linked transactions or journal entries.

#### FR-24 (UC-23): Mandatory Cost Center Linking Configuration
- **Actor**: General Accountant
- **Components**:
  - `Account`: Dropdown from COA (Revenues / Expenses).
  - `Mandatory Cost Center Linking`: Checkbox.
  - `Allowed Cost Centers`: Multi-Select DDL (active when checkbox is ticked).
- **Enforcement Rule**: If an account is flagged with mandatory cost center linking, any manual or automatic journal entry referencing this account **must** include a valid cost center; otherwise saving/posting is blocked with error: *"يجب تحديد مركز التكلفة لهذا الحساب"*.

#### FR-25 (UC-24): Fiscal Year & Period Lock Management
- **Actor**: General Accountant
- **Components & Validations**:
  - `Fiscal Year Name`: Text Input, Mandatory (e.g., "السنة المالية 2026").
  - `Start Date`: Date Picker, Mandatory.
  - `End Date`: Date Picker, Mandatory, must be strictly $> \text{Start Date}$.
  - `Period Status`: Toggle [Open (مفتوحة), Closed (مغلقة)].
- **Strict Accounting Lock Rule**:
  - When a fiscal period or year is marked as **Closed**, the backend must block creation, editing, or posting of any journal entries or vouchers dated within that period with an immutable error: *"لا يمكن إنشاء أو ترحيل قيود في فترة مالية مغلقة"*.
  - Period closing requires accountant confirmation.

---

### Module 3.5: Real Estate & Property Management

#### FR-26 (UC-25): List Properties (Buildings)
- **Actor**: Data Entry (CRUD), Branch Manager (Read), General Accountant (Read)
- **Components**: Search bar, table showing Property Name, Address, Total Units Count, Property Type [Residential, Commercial, Mixed], Actions (View Units, Edit, Delete).
- **Core Invariant**: Every property functions as an independent Cost Center.

#### FR-27 (UC-26): Add Property & Auto-Create Units & Cost Center
- **Actor**: Data Entry
- **Components & Validations**:
  - `Property Name`: Text Input, Mandatory, 3 to 100 characters, unique.
  - `Address`: Text Input, Mandatory.
  - `Property Type`: DDL, Mandatory [Residential (سكني), Commercial (تجاري), Mixed (مختلط)].
  - `Units Count`: Number Input, Mandatory, integer $\ge 1$. Error if $< 1$: *"عدد الوحدات يجب أن لا يقل عن 1"*.
  - `Default Unit Type`: DDL, Mandatory [Apartment (شقة), Shop (محل), Office (مكتب), Warehouse (مستودع)].
- **Automatic Multi-Object Provisioning**:
  1. Creates Property record in tenant DB.
  2. **Automatically provisions $N$ Unit records** numbered sequentially ($1 \dots N$) with status `Vacant (شاغرة)`.
  3. **Automatically provisions a Cost Center** under the exact name of the property.

#### FR-28 (UC-27): Edit Property Data
- **Actor**: Data Entry
- **Business Rule**: Total units count cannot be decreased below the number of currently occupied or contracted units.

#### FR-29 (UC-28): Delete Property
- **Actor**: Data Entry
- **Business Rule**: Cannot delete a property that has active or past rental contracts. Deleting a property purges its vacant units and linked Cost Center.

#### FR-30 (UC-29): View Property Units List
- **Actor**: Data Entry
- **Components**: Unit Number, Unit Type, Area ($m^2$), Status [Vacant (شاغرة), Occupied (مشغولة), Under Maintenance (تحت الصيانة)], Current Tenant Name, Actions (Edit, Create Contract).

#### FR-31 (UC-30): Add Single Unit to Property
- **Actor**: Data Entry
- **Components & Validations**:
  - `Unit Number`: Text Input, Mandatory, unique within this property.
  - `Unit Type`: DDL [Apartment, Shop, Office, Warehouse].
  - `Area ($m^2$)`: Number, Optional.
  - `Status`: Radio button [Vacant (شاغرة), Under Maintenance (تحت الصيانة)]. Default is `Vacant`.

#### FR-32 (UC-31): Edit Unit Data
- **Actor**: Data Entry
- **Business Rule**: A unit with an active contract cannot have its status manually toggled to `Vacant`.

#### FR-33 (UC-32): Delete Unit
- **Actor**: Data Entry
- **Business Rule**: Cannot delete a unit that is tied to an active rental contract.

---

### Module 3.6: Tenant Directory Management

#### FR-34 (UC-33): List Tenants
- **Actor**: Data Entry (CRUD), Branch Manager (Read), General Accountant (Read)
- **Components**: Search input, table showing Tenant Name, National ID / Commercial Register, Mobile Number, Email, Active Contracts Count, Actions (Edit, Delete, View Contracts).

#### FR-35 (UC-34): Add New Tenant
- **Actor**: Data Entry
- **Components & Validations**:
  - `Tenant Name`: Text Input, Mandatory, 3 to 100 characters.
  - `Tenant Type`: Radio buttons [Individual (فرد), Corporate / Company (شركة)].
  - `National ID / CR (رقم الهوية / السجل التجاري)`: Text Input, Mandatory, unique in tenant database. Duplicate error: *"رقم الهوية مستخدم بالفعل"*.
  - `Mobile Number`: Text Input, Mandatory, 10 digits starting with `05`.
  - `Email`: Text Input, Mandatory, valid email syntax. Duplicate error: *"البريد الإلكتروني مستخدم بالفعل"*.
  - `Address`: Text Input, Optional.
  - `Notes`: Text Area, Optional, max 500 characters.

#### FR-36 (UC-35): Edit Tenant Data
- **Actor**: Data Entry
- **Business Rule**: National ID / CR cannot be modified if rental contracts exist for this tenant.

#### FR-37 (UC-36): Delete Tenant
- **Actor**: Data Entry
- **Business Rule**: Cannot delete a tenant with active or historical rental contracts.

---

### Module 3.7: Rental Contracts & Automated Installments

#### FR-38 (UC-37): List Rental Contracts
- **Actor**: Data Entry (Create/Read/Update), Branch Manager (Read Only), General Accountant (Read Only)
- **Components**: Search bar, Status Filter [All, Active (ساري), Overdue (متأخر), Expired (منتهي), Pending Cancellation (طلب إلغاء معلق), Cancelled (ملغي)], Property Filter, table listing Contract No, Tenant, Unit, Total Rent, Start/End Date, Status, Actions (View, Edit, Print, Request Cancellation).

#### FR-39 (UC-38): Create Rental Contract & Generate Installment Schedule
- **Actor**: Data Entry
- **Components & Validations**:
  - `Tenant`: Dropdown, Mandatory (active tenants).
  - `Property`: Dropdown, Mandatory.
  - `Unit`: Dropdown, Mandatory, dependent on selected Property, **displays only Vacant units**.
  - `Contract Type`: DDL, Mandatory [Between Owner and Company (بين المالك والشركة), Between Company and End Tenant (بين الشركة والمستأجر النهائي)].
  - `Start Date`: Date Picker, Mandatory, must be $\ge \text{Today}$.
  - `End Date`: Date Picker, Mandatory, must be strictly $> \text{Start Date}$.
  - `Contract Duration (Months)`: Integer, Mandatory, computed or entered.
  - `Total Rent Value`: Decimal Number, Mandatory, $> 0$.
  - `Collection Cycle (دورة التحصيل)`: DDL, Mandatory:
    - **Monthly (شهري)**: 12 installments per year.
    - **Quarterly (ربع سنوي)**: 4 installments per year.
    - **Semi-Annual (نصف سنوي)**: 2 installments per year.
    - **Annual (سنوي)**: 1 installment per year.
  - `First Payment Amount`: Decimal Number, Optional.
  - `Notes`: Text Area, Optional.
- **Automated Lifecycle Trigger**:
  1. Contract is created in status `Active (ساري)`.
  2. **Automated Installment Generation**: Generates installment records with due dates spaced according to the collection cycle ($\text{Due Date}_k = \text{Start Date} + k \times \text{Cycle Duration}$), each with amount $=\text{Total Rent} / \text{Number of Installments}$ (adjusted for first payment). Initial installment status is `Due (مستحقة)`.
  3. **Unit State Transition**: Selected unit status immediately transitions from `Vacant (شاغرة)` $\rightarrow$ `Occupied (مشغولة)`.

#### FR-40 (UC-39): Edit Rental Contract
- **Actor**: Data Entry
- **Business Rules**: Expired or cancelled contracts cannot be edited. If rent value or cycle is modified, recalculation applies **only to future unpaid installments**; historical paid installments remain untouched.

#### FR-41 (UC-40): Print & PDF Export Rental Contract
- **Actor**: Data Entry, Branch Manager, General Accountant
- **Capability**: Produces a standardized, printable contract layout with tenant details, unit info, terms, and the complete installment breakdown schedule. Supports direct browser print and PDF download.

#### FR-42 (UC-41): Upload Rental Contract Documents
- **Actor**: Data Entry
- **Components & Validations**: File Upload supporting PDF, PNG, JPEG. Max file size: 5MB per file. Max files: 10 attachments per contract.

#### FR-43 (UC-41A): Request Rental Contract Cancellation
- **Actor**: Data Entry
- **Pre-Conditions**: Contract is in `Active (ساري)` or `Overdue (متأخر)` status. Cannot request cancellation for expired contracts.
- **Components & Validations**:
  - `Cancellation Reason`: Text Area, Mandatory, min 10 characters.
  - `Additional Notes`: Text Area, Optional.
  - `Submit Button`: Sends cancellation request.
- **Post-Conditions**: Contract transitions to `Pending Cancellation (طلب إلغاء معلق)`. **The unit remains `Occupied (مشغولة)`** until the Branch Manager formally approves the cancellation. An in-app alert is dispatched to the Branch Manager.

#### FR-44 (UC-42): Approve / Reject Contract Cancellation
- **Actor**: Branch Manager (مدير الشركة)
- **Components**:
  - Table of pending cancellation requests showing Contract No, Tenant, Cancellation Reason, Actions (Approve, Reject).
  - `Rejection Reason`: Text Area, Mandatory if Reject is selected.
- **Post-Conditions & Unit Release**:
  - **Upon Approval**: Contract transitions to `Cancelled (ملغي)`. **The unit immediately transitions to `Vacant (شاغرة)`**. The system computes remaining dues/balances for settlement.
  - **Upon Rejection**: Contract reverts to previous state (`Active` or `Overdue`); Data Entry is notified of rejection with reason.

---

### Module 3.8: Maker-Checker Financial Vouchers

#### FR-45 (UC-43): Create Draft Receipt Voucher (سند قبض مسودة)
- **Actor**: Data Entry (Maker)
- **Components & Validations**:
  - `Rental Contract`: Dropdown, Mandatory, lists active/overdue contracts.
  - `Installment (الدفعة)`: Dropdown, Mandatory, dynamically lists unpaid due installments for selected contract.
  - `Collected Amount`: Decimal Number, Mandatory, $> 0$, must be $\le \text{Installment Outstanding Balance}$. Error if greater: *"المبلغ أكبر من قيمة الدفعة"*. Error if already paid: *"الدفعة مدفوعة مسبقاً"*.
  - `Collection Date`: Date Picker, Mandatory, defaults to today.
  - `Cost Center`: Dropdown, Mandatory, auto-populated from the contract's linked property.
  - `Payment Method`: DDL, Mandatory [Cash (نقدي), Bank Transfer (تحويل بنكي), Cheque (شيك)].
  - `Notes`: Text Area, Optional.
- **Post-Conditions**: Voucher saved with status `Draft (مسودة)`. **Does not alter the General Ledger or Trial Balance**. Triggers real-time in-app notification to General Accountant (UC-67).

#### FR-46 (UC-44): Create Draft Disbursement Voucher (سند صرف مسودة)
- **Actor**: Data Entry (Maker)
- **Components & Validations**:
  - `Expense Type`: DDL, Mandatory [Maintenance (صيانة), Electricity (كهرباء), Water (ماء), Rent (إيجار), Salaries (رواتب), Other (أخرى)].
  - `Amount`: Decimal Number, Mandatory, strictly $> 0$. Error if $\le 0$: *"لا يمكن أن تكون القيمة أقل من أو تساوي 0"*.
  - `Expense Date`: Date Picker, Mandatory.
  - `Cost Center`: Dropdown, Mandatory.
  - `Debit Account (حساب المصروف)`: Dropdown from COA, Mandatory.
  - `Credit Account (حساب الدفع)`: Dropdown from COA (Cash/Bank), Mandatory.
  - `Attachments`: File Upload, Optional.
  - `Notes`: Text Area, Optional.
- **Post-Conditions**: Saved as `Draft (مسودة)`. Does not touch ledgers. Dispatches notification to General Accountant.

#### FR-47 (UC-45): Edit Rejected Voucher & Resubmit
- **Actor**: Data Entry
- **Pre-Conditions**: Voucher has status `Rejected (مرفوض)`.
- **Components**: Displays Accountant's Rejection Remarks (Read-Only label); all voucher fields editable; "Resubmit" CTA button.
- **Post-Conditions**: Updates voucher data; resets status to `Draft (مسودة)`; notifies General Accountant.

#### FR-48 (UC-46): Review Draft Vouchers Queue
- **Actor**: General Accountant (Checker)
- **Components**: Filter by Type [All, Receipt, Disbursement], Date Range; table showing Voucher No, Type, Amount, Date, Cost Center, Created By, Status [Draft, Rejected], Rejection Reason (if any), Actions (View, Approve, Reject).

#### FR-49 (UC-47): Approve Voucher & Auto-Post Balanced Journal Entry
- **Actor**: General Accountant (Checker)
- **Pre-Conditions**: Voucher status is `Draft (مسودة)`; Fiscal Period for voucher date is `Open`.
- **Workflow**: Accountant reviews voucher and verified cost center $\rightarrow$ clicks "تأكيد الاعتماد (Confirm Approval)".
- **Automated Balanced Journal Entry Engine**:
  - **For Approved Receipt Voucher (سند قبض)**:
    1. $\text{Debit}: \text{Cash / Bank Account} = \text{Collected Amount}$
    2. $\text{Credit}: \text{Rental Revenue Account} = \text{Collected Amount}$
    3. $\text{Cost Center}: \text{Inherited from Contract's Property}$
    4. Installment status transitions to `Paid (مدفوعة)`.
  - **For Approved Disbursement Voucher (سند صرف)**:
    1. $\text{Debit}: \text{Specified Expense Account} = \text{Expense Amount}$
    2. $\text{Credit}: \text{Specified Cash / Bank Account} = \text{Expense Amount}$
    3. $\text{Cost Center}: \text{Directly from Voucher}$
- **Immutability & Accounting Impact**:
  - Voucher status transitions to `Approved (معتمد)`.
  - The generated Journal Entry is immediately posted to the General Ledger.
  - Immediately updates General Ledger, Trial Balance, and Financial Statements.
  - **Approved/posted entries are strictly immutable** (cannot be modified or deleted; can only be reversed via an offsetting Journal Entry).
  - Blocked if the fiscal period is closed.

#### FR-50 (UC-48): Reject Voucher with Mandatory Reason
- **Actor**: General Accountant
- **Pre-Conditions**: Voucher status is `Draft (مسودة)`.
- **Components & Validations**:
  - `Rejection Reason`: Text Area, Mandatory, **minimum 10 characters, maximum 500 characters**.
  - Validation error if $< 10$ characters: *"سبب الرفض يجب ألا يقل عن 10 أحرف"*.
- **Post-Conditions**: Voucher status transitions to `Rejected (مرفوض)`; rejection reason recorded; real-time in-app alert dispatched to Data Entry (UC-68).

---

### Module 3.9: Manual Journal Entries

#### FR-51 (UC-49): Create Manual Journal Entry & Balance Validation
- **Actor**: General Accountant
- **Components & Form Fields**:
  - `Entry Number`: System auto-generated, sequential per fiscal year.
  - `Date`: Date Picker, Mandatory, defaults to today. Must fall within an open fiscal period.
  - `Explanation (الإيضاح)`: Text Input, Mandatory, 10 to 500 characters.
  - `Journal Items Table`:
    - `Account`: Dropdown from COA, Mandatory.
    - `Cost Center`: Dropdown, Mandatory if account requires it (per FR-24).
    - `Debit (مدين)`: Decimal Number, $\ge 0$.
    - `Credit (دائن)`: Decimal Number, $\ge 0$.
    - `Item Note`: Text Input, Optional.
    - "Add Item" / "Remove Item" row buttons.
  - `Total Debit`: Auto-computed sum of all debit lines.
  - `Total Credit`: Auto-computed sum of all credit lines.
  - `Balance Difference`: $\text{Difference} = \text{Total Debit} - \text{Total Credit}$.
  - `Save as Draft Button`: Always available.
  - `Save and Post Button`: **Enabled ONLY when $\text{Difference} = 0$ and $\text{Total Debit} > 0$**.
- **Accounting Validation Rules**:
  - Posting balance condition: $\sum \text{Debit} - \sum \text{Credit} = 0$. Error if unbalanced: *"القيد غير متوازن، يرجى مراجعة البنود"*.
  - Cost center check: If an account has mandatory cost center linking and none is provided: *"يجب تحديد مركز التكلفة لهذا الحساب"*.
  - Status upon Save: `Draft (مسودة)`. Status upon Save & Post: `Posted (مرحّل)`.
  - Posted entries are immutable.

#### FR-52 (UC-50): List Journal Entries
- **Actor**: General Accountant (Full), Data Entry (Read Only for posted), Branch Manager (Read Only)
- **Components**: Date range filter, Status filter [All, Draft, Posted], table showing Entry No, Date, Explanation, Total Debit, Total Credit, Status, Creator, Actions (View, Edit [Draft only]).

#### FR-53 (UC-51): View Journal Entry Details
- **Actor**: General Accountant, Branch Manager, Data Entry
- **Components**: Detailed view showing Entry No, Date, Explanation, balanced items table (Account, Cost Center, Debit, Credit, Line Note), Total Debit, Total Credit, Posted Status.

---

### Module 3.10: Contracting Progress Billing & Supplier Invoices

#### FR-54 (UC-52): List Contractor Invoices (مستخلصات المقاولين)
- **Actor**: General Accountant (Approve), Branch Manager (Read), Data Entry (Create/Read)
- **Components**: Search, Contractor filter, Status filter [All, Draft, Approved, Partially Paid, Fully Paid], table showing Invoice No, Contractor Name, Project (Cost Center), Gross Amount, Paid, Remaining, Status, Date, Actions.

#### FR-55 (UC-53): Create Contractor Invoice Draft
- **Actor**: Data Entry
- **Components & Line-Item Calculations**:
  - `Contractor`: Dropdown, Mandatory.
  - `Project (Cost Center)`: Dropdown, Mandatory.
  - `Invoice Number`: Text Input, Mandatory, unique. Duplicate error: *"رقم المستخلص مستخدم بالفعل"*.
  - `Date`: Date Picker, Mandatory.
  - `Line Items Table`:
    - `Item Description`: Text Input, Mandatory.
    - `Quantity`: Decimal Number, Mandatory, $> 0$.
    - `Unit`: DDL [Meter, Ton, Day, Lump Sum, etc.].
    - `Unit Price`: Decimal Number, Mandatory, $> 0$.
    - `Item Total`: Auto-calculated: $\text{Item Total} = \text{Quantity} \times \text{Unit Price}$.
    - `Line Note`: Text Input, Optional.
  - `Gross Total`: Auto-calculated: $\sum \text{Item Totals}$.
  - `Tax Rate (%) / Amount`: Decimal Number, Optional.
  - `Grand Total with Tax`: Auto-calculated: $\text{Gross Total} + \text{Tax Amount}$.
  - `Attachments`: File Upload, Optional.
- **Post-Conditions**: Saved with status `Draft (مسودة)`; notifies General Accountant.

#### FR-56 (UC-54): Approve Contractor Invoice
- **Actor**: General Accountant
- **Pre-Conditions**: Contractor invoice is in `Draft` status; fiscal period is open.
- **Post-Conditions**: Transitions to `Approved (معتمد)`; generates an automated journal entry booking contractor liability against project construction in progress / expense; posts entry to General Ledger.

#### FR-57 (UC-55): Create Supplier Purchase Invoice Draft
- **Actor**: Data Entry
- **Components & Calculations**:
  - `Supplier`: Dropdown, Mandatory.
  - `Invoice Number`: Text Input, Mandatory.
  - `Date`: Date Picker, Mandatory.
  - `Cost Center`: Dropdown, Mandatory.
  - `Gross Purchases Total`: Decimal Number, Mandatory, $> 0$.
  - `Discount Earned (خصم مكتسب)`: Decimal Number, Optional, $\ge 0$.
  - `Net Invoice Value`: Auto-calculated: $\text{Net} = \text{Gross} - \text{Discount}$.
  - `Tax Type`: DDL [VAT (قيمة مضافة), Excise (انتقائية)].
  - `Tax Amount`: Auto-calculated: $\text{Net} \times \text{Tax Rate}$.
  - `Total Payable`: Auto-calculated: $\text{Net} + \text{Tax Amount}$.
  - `Payment Terms`: DDL [Cash (نقدي), Credit/On Account (آجل)].
  - `Counter Account`: Dropdown (Cash / Supplier Payable).
  - `Attachments`: File Upload, Optional.
- **Post-Conditions**: Saved as `Draft (مسودة)`; notifies General Accountant.

---

### Module 3.11: Comprehensive Financial Reports & Period Close

#### FR-58 (UC-56): Trial Balance (ميزان المراجعة)
- **Actor**: General Accountant (Export), Branch Manager (Read), Super Admin (Consolidated)
- **Components & Filters**: Fiscal Year DDL (Mandatory), Date Range (From Date — To Date).
- **Table Structure**:
  - Columns: Account Code & Name, Opening Debit, Opening Credit, Period Debit, Period Credit, Ending Debit, Ending Credit.
  - Totals Row: Sum of all columns.
  - Export Actions: "Print PDF", "Export Excel (.xlsx)".
- **Exact Accounting Formulas**:
  1. *Opening Balance*: Ending balance from preceding period/year. Debit nature placed in Opening Debit; Credit nature in Opening Credit.
  2. *Period Activity*:
     - $\text{Period\_Debit} = \sum(\text{All Debit Journal Entries in Period for Account})$
     - $\text{Period\_Credit} = \sum(\text{All Credit Journal Entries in Period for Account})$
  3. *Ending Balances*:
     - For Debit Nature Accounts: $\text{Ending\_Debit} = \text{Opening\_Debit} + \text{Period\_Debit} - \text{Period\_Credit}$ (Ending Credit $= 0$).
     - For Credit Nature Accounts: $\text{Ending\_Credit} = \text{Opening\_Credit} + \text{Period\_Credit} - \text{Period\_Debit}$ (Ending Debit $= 0$).
  4. *Balance Condition (شرط التوازن)*:
     - $\sum \text{Ending\_Debit} - \sum \text{Ending\_Credit} = 0$
     - If unbalanced, display red warning: *"ميزان المراجعة غير متوازن، يرجى مراجعة القيود اليومية"*.
  5. Shows all COA accounts, including zero-balance accounts.

#### FR-59 (UC-57A): General Ledger (دفتر الأستاذ العام)
- **Actor**: General Accountant (Export), Branch Manager (Read)
- **Components & Filters**:
  - Account Dropdown (Mandatory).
  - Counter Account Filter (Optional DDL).
  - Date Range (Optional).
- **Table Structure**:
  - Columns: Date, Entry No (Clickable link opening entry details), Counter Account, Explanation, Debit, Credit, Running Balance.
- **Formulas & Rules**:
  - For Debit Accounts: $\text{Balance} = \text{Opening Balance} + \sum \text{Debit} - \sum \text{Credit}$.
  - For Credit Accounts: $\text{Balance} = \text{Opening Balance} - \sum \text{Debit} + \sum \text{Credit}$.
  - Counter Account Display: If single offsetting account $\rightarrow$ account name; if multiple offsetting accounts $\rightarrow$ displays *"المذكورين"*.
  - Exportable to PDF and Excel (.xlsx).

#### FR-60 (UC-57B): Balance Sheet (الميزانية العمومية)
- **Actor**: General Accountant (Export), Branch Manager (Read), Super Admin (Consolidated)
- **Fundamental Accounting Equation**:
  $$\text{Total Assets} = \text{Total Liabilities} + \text{Total Equity}$$
  $$\text{Balance Difference} = \text{Total Assets} - (\text{Total Liabilities} + \text{Total Equity}) = 0$$
  If $\text{Difference} \ne 0$, display alert: *"الميزانية العمومية غير متوازنة، يرجى مراجعة القيود"*.
- **Detailed Component Calculations**:
  1. **Assets (الأصول)**:
     - Fixed Assets (الأصول الثابتة) net of accumulated depreciation: $\text{Net Fixed Asset} = \text{Cost} - \text{Accumulated Depreciation}$.
     - Current Assets (الأصول المتداولة): Sum of cash, bank, receivables.
     - Other Assets (أصول أخرى).
     - $\text{Total Assets} = \text{Fixed} + \text{Current} + \text{Other}$.
  2. **Liabilities (الخصوم)**:
     - Short-term Liabilities (خصوم متداولة / قصيرة الأجل).
     - Long-term Liabilities (خصوم طويلة الأجل).
     - Other Liabilities.
     - $\text{Total Liabilities} = \text{Short-term} + \text{Long-term} + \text{Other}$.
  3. **Equity (حقوق الملكية)**:
     - Capital (رأس المال).
     - Net Profit / Loss (صافي الربح / الخسارة) imported directly from Income Statement. Added if profit, subtracted if loss.
     - Withdrawals (المسحوبات): Subtracted from equity.
     - $\text{Total Equity} = \text{Capital} + \text{Net Profit} - \text{Withdrawals}$.

#### FR-61 (UC-58): Income Statement (قائمة الدخل)
- **Actor**: General Accountant (Export), Branch Manager (Read), Super Admin (Consolidated)
- **Formulas & Structure**:
  1. $\text{Gross Profit / Loss (مجمل الربح)} = \text{Net Sales} - \text{Cost of Goods Sold (تكلفة المبيعات)}$
  2. $\text{Cost of Goods Sold} = \text{Beginning Inventory} + \text{Net Purchases} - \text{Ending Inventory}$
  3. $\text{Net Profit / Loss (صافي الربح/الخسارة)} = \text{Gross Profit} + \text{Total Other Revenues} - \text{Total Operating Expenses}$
  4. Derived directly from ending balances in Trial Balance / General Ledger. Export to PDF and Excel (.xlsx).

#### FR-62 (UC-59): Per-Building Income Statement (قائمة الدخل لكل عمارة)
- **Actor**: General Accountant, Branch Manager
- **Components & Filters**: Cost Center (Building) Dropdown (Mandatory), Date Range (Mandatory).
- **Calculations**:
  - $\text{Building Revenue} = \sum(\text{Rental Revenues booked to this Building Cost Center})$.
  - $\text{Direct Building Expenses} = \sum(\text{Direct Maintenance, Utility, and Operating Expenses booked to this Cost Center})$.
  - $\text{Building Net Profit / Loss} = \text{Building Revenue} - \text{Direct Building Expenses}$.
  - Export to PDF and Excel (.xlsx).

#### FR-63 (UC-60): Report Export Engine
- **Actor**: General Accountant, Branch Manager, Super Admin
- **Supported Formats**: Adobe PDF (formatted for official print with company header), Microsoft Excel (`.xlsx` formatted with numerical cells and headers).
- **Latency Requirement**: Report generation and export completion $< 5.0$ seconds (NFR-002).

#### FR-64 (UC-61): Fiscal Year Closing & Account Rollover
- **Actor**: General Accountant
- **Pre-Conditions**: Fiscal Year is open; all periods reviewed.
- **Workflow**: Accountant initiates Year Close $\rightarrow$ system displays summary of revenues, expenses, and net profit $\rightarrow$ confirmation modal (*"هل أنت متأكد من إغلاق السنة المالية؟ هذه العملية لا يمكن التراجع عنها."*) $\rightarrow$ confirmed.
- **Automated Closing Engine**:
  1. System generates closing journal entries zeroing out all Revenue and Expense accounts into Profit & Loss Summary (أرباح وخسائر).
  2. Rolls net profit/loss into Equity (Retained Earnings / حقوق الملكية).
  3. Transitions Fiscal Year status to `Closed (مغلقة)`.
  4. Locks all periods permanently from further postings.

---

### Module 3.12: Role Dashboards & Metrics

#### FR-65 (UC-62): Branch Manager Operational Dashboard
- **Actor**: Branch Manager
- **Components & Real-Time Cards**:
  - `Cash Liquidity Card`: Current cash and bank aggregate balances.
  - `Total Liabilities Card`: Total outstanding payables/debt.
  - `Overdue Receivables Card`: Total unpaid overdue rent installments.
  - `Active Contracts Count Card` & `Overdue Contracts Count Card`.
  - `Monthly Revenue vs Expenses Chart`: Trendline visualization.
- **Data Scope**: Strictly isolated to the manager's assigned company.

#### FR-66 (UC-63): Per-Building P&L Summary for Branch Manager
- **Actor**: Branch Manager
- **Components**: Building DDL, Date Range, Revenue breakdown, Direct Expenses breakdown, Net Building Contribution, PDF/Excel export.

---

### Module 3.13: Automated Cron Jobs & Event-Driven Alerts

#### FR-67 (UC-64): 7-Day Pre-Due Rent Reminder Cron Job
- **Actor**: Background Scheduled Job (System Cron)
- **Schedule**: Executes daily at 08:00 AM server time.
- **Logic**: Queries all active contracts for installments due in exactly 7 days ($\text{Due Date} = \text{Today} + 7$). Dispatches automated SMS and Email notification to the tenant with contract and amount details. Logs dispatch status in `notification_logs`. Prevents duplicate dispatches.

#### FR-68 (UC-65): Due-Date Rent Reminder Cron Job
- **Actor**: Background Scheduled Job (System Cron)
- **Schedule**: Executes daily at 08:00 AM server time.
- **Logic**: Queries all installments where $\text{Due Date} = \text{Today}$ and status $= \text{Due}$. Dispatches SMS and Email alert to tenant. Logs dispatch status.

#### FR-69 (UC-66): Overdue Contract & Installment Transition Cron Job
- **Actor**: Background Scheduled Job (System Cron)
- **Schedule**: Executes daily at 00:01 AM server time.
- **Logic**: Queries all installments where $\text{Due Date} < \text{Today}$ and status $= \text{Due}$.
  - Transitions installment status to `Overdue (متأخرة)`.
  - Transitions corresponding rental contract status to `Overdue (متأخر)`.
  - Dispatches immediate in-app notification to Branch Manager and General Accountant.

#### FR-70 (UC-67): New Draft Voucher Real-Time Notification
- **Actor**: Event-Driven System Notification
- **Trigger**: Data Entry creates a draft receipt or disbursement voucher.
- **Logic**: Dispatches immediate in-app WebSocket/SSE alert and increments unread badge counter on General Accountant's dashboard.

#### FR-71 (UC-68): Voucher Rejection Real-Time Notification
- **Actor**: Event-Driven System Notification
- **Trigger**: General Accountant rejects a draft voucher.
- **Logic**: Dispatches immediate in-app alert to the Data Entry clerk who created the draft, including the accountant's mandatory rejection remarks.

#### FR-72 (UC-69): SMS Gateway Integration Service
- **Actor**: System Integration Service
- **Specs**: Encrypted API key storage, HTTP REST adapter to SMS provider, automatic retry mechanism with exponential backoff on failure, comprehensive transmission audit logging (`recipient`, `message`, `status`, `response_payload`).

#### FR-73 (UC-70): SMTP Email Integration Service
- **Actor**: System Integration Service
- **Specs**: Secure TLS/SSL SMTP client, encrypted credentials in database/environment, queue-backed background mail worker, HTML invoice and reminder email templates.

---

## 4. Object Status Transition Specifications (Sections 4.1 - 4.8)

### 4.1 Journal Entry (القيد اليومي)
| State | Possible Next States | Trigger Event | Authorized Actor |
| :--- | :--- | :--- | :--- |
| **Draft (مسودة)** | Approved (معتمد) | Accountant approves entry | General Accountant |
| **Draft (مسودة)** | Rejected (مرفوض) | Accountant rejects with reason $\ge 10$ chars | General Accountant |
| **Approved (معتمد)** | Posted (مرحّل) | Immediate automated ledger posting | System (Automated) |
| **Rejected (مرفوض)** | Draft (مسودة) | Data Entry edits and resubmits | Data Entry / Accountant |
| **Posted (مرحّل)** | *Terminal (Immutable)* | Reversal entry only; no direct edit/delete | None |

### 4.2 Rental Contract (عقد الإيجار)
| State | Possible Next States | Trigger Event | Authorized Actor |
| :--- | :--- | :--- | :--- |
| **Active (ساري)** | Overdue (متأخر) | Installment unpaid 1 day after due date | System Cron Job |
| **Active (ساري)** | Expired (منتهي) | Contract end date reached | System Cron Job |
| **Active (ساري)** | Pending Cancellation (طلب إلغاء معلق) | Cancellation requested with reason | Data Entry |
| **Overdue (متأخر)** | Active (ساري) | All overdue installments paid | System (Voucher approval) |
| **Overdue (متأخر)** | Pending Cancellation | Cancellation requested with reason | Data Entry |
| **Pending Cancellation** | Cancelled (ملغي) | Branch Manager approves cancellation | Branch Manager |
| **Pending Cancellation** | Active / Overdue | Branch Manager rejects cancellation | Branch Manager |
| **Cancelled (ملغي)** | *Terminal* | Unit released to Vacant; dues calculated | None |

### 4.3 Financial Voucher (سند القبض / الصرف)
| State | Possible Next States | Trigger Event | Authorized Actor |
| :--- | :--- | :--- | :--- |
| **Draft (مسودة)** | Approved (معتمد) | Accountant approves voucher | General Accountant |
| **Draft (مسودة)** | Rejected (مرفوض) | Accountant rejects with reason $\ge 10$ chars | General Accountant |
| **Rejected (مرفوض)** | Draft (مسودة) | Data Entry edits and resubmits | Data Entry |
| **Approved (معتمد)** | *Terminal (Immutable)* | Generates posted Journal Entry | None |

### 4.4 Contractor Invoice (مستخلص المقاول)
| State | Possible Next States | Trigger Event | Authorized Actor |
| :--- | :--- | :--- | :--- |
| **Draft (مسودة)** | Approved (معتمد) | Accountant audits and approves | General Accountant |
| **Approved (معتمد)** | Partially Paid (مدفوع جزئياً) | Partial payment disbursement voucher approved | System (Voucher approval) |
| **Approved (معتمد)** | Fully Paid (مدفوع بالكامل) | Full payment disbursement voucher approved | System (Voucher approval) |
| **Partially Paid** | Fully Paid (مدفوع بالكامل) | Final disbursement voucher approved | System (Voucher approval) |

### 4.5 Property Unit (الوحدة العقارية)
| State | Possible Next States | Trigger Event | Authorized Actor |
| :--- | :--- | :--- | :--- |
| **Vacant (شاغرة)** | Occupied (مشغولة) | Rental contract created on unit | System (Contract creation) |
| **Vacant (شاغرة)** | Under Maintenance (تحت الصيانة) | Unit taken offline for repairs | Data Entry |
| **Under Maintenance** | Vacant (شاغرة) | Maintenance work completed | Data Entry |
| **Occupied (مشغولة)** | Vacant (شاغرة) | Contract cancellation approved or contract ends | Branch Manager / System |

### 4.6 Company Entity (الشركة)
| State | Possible Next States | Trigger Event | Authorized Actor |
| :--- | :--- | :--- | :--- |
| **Active (نشطة)** | Frozen (مجمدة) | Super Admin freezes company | Super Admin |
| **Frozen (مجمدة)** | Active (نشطة) | Super Admin reactivates company | Super Admin |

### 4.7 Employee Account (الموظف)
| State | Possible Next States | Trigger Event | Authorized Actor |
| :--- | :--- | :--- | :--- |
| **Active (مفعّل)** | Inactive (معطّل) | Branch Manager deactivates account | Branch Manager |
| **Inactive (معطّل)** | Active (مفعّل) | Branch Manager reactivates account | Branch Manager |

### 4.8 Payment Installment (الدفعة)
| State | Possible Next States | Trigger Event | Authorized Actor |
| :--- | :--- | :--- | :--- |
| **Due (مستحقة)** | Paid (مدفوعة) | Receipt voucher approved by Accountant | System (Voucher approval) |
| **Due (مستحقة)** | Overdue (متأخرة) | 1 day post due date without payment | System Cron Job |
| **Overdue (متأخرة)** | Paid (مدفوعة) | Receipt voucher approved by Accountant | System (Voucher approval) |
| **Due / Overdue** | Cancelled (ملغاة) | Contract cancelled by Branch Manager | Branch Manager |

---

## 5. Non-Functional Requirements (NFR-001 through NFR-010)

| Requirement ID | Quality Dimension | Detailed Specification & Acceptance Threshold |
| :--- | :--- | :--- |
| **NFR-001** | Multi-Tenant Data Isolation | Complete database-level isolation per company. No cross-tenant database queries. Immediate session termination upon company freeze. |
| **NFR-002** | Report Performance | Complex financial reports (Trial Balance, General Ledger, Balance Sheet) with up to 50,000 ledger entries must load in $< 5.0$ seconds. |
| **NFR-003** | Cloud Availability | Hosted on AWS / DigitalOcean with guaranteed $99.9\%$ operational uptime. |
| **NFR-004** | Disaster Recovery & Backup | Automated daily full database snapshots for all tenant databases, retained for 30 days. |
| **NFR-005** | Horizontal Scalability | System architecture supports provisioning new company tenants and databases seamlessly without code changes or downtime. |
| **NFR-006** | Browser & Device Compatibility | Fully functional, responsive UI on Google Chrome, Apple Safari, Microsoft Edge across Desktop, Tablet, and Mobile viewport resolutions. |
| **NFR-007** | Information Security | Bcrypt password hashing, encrypted API keys & SMTP secrets at rest, HTTPS/TLS 1.3 in transit, parameterized SQL queries preventing SQLi. |
| **NFR-008** | Usability & RTL Ergonomics | Intuitive user interface adhering to Arabic Right-to-Left (RTL) standards with natural spacing, standard accounting labels, and clear error cues. |
| **NFR-009** | Internationalization | Full support for Modern Standard Arabic (primary) and English (LTR) language toggle with complete localization keys. |
| **NFR-010** | Operational Reliability | Continuous 24/7/365 operation with total unplanned downtime $< 0.1\%$ per calendar month. |

---

## 6. End of Requirements & Traceability Sign-off
This document directly satisfies Step 2 of the BMAD pipeline. Every requirement is traceable to the source document `@docs/SRS-Mohamed-Ramdan.md`.

