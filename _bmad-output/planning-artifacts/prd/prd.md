---
title: "Product Requirements Document: Cloud Accounting & Operational ERP System"
project: "Mohamed Ramadan Group"
version: "1.0"
status: "final"
created: "2026-11-22"
updated: "2026-11-22"
author: "Antigravity BMAD Product Team"
---

# Product Requirements Document (PRD)
## Cloud Accounting & Operational ERP System (Mohamed Ramadan Group v1.0)
**Source Baseline**: `docs/SRS.md` (Sole and Final Source of Truth)

---

## 1. Document Overview & Scope

### 1.1 Objective
This document defines the comprehensive product requirements for the **Cloud Accounting & Operational ERP System** of Mohamed Ramadan Group. The system serves three operating verticals across the Kingdom of Saudi Arabia: Real Estate Management, General Contracting, and Commercial Operations.

### 1.2 Target Actors & Roles (Section 1.6 CRUD Matrix)
1. **Super Admin**: System governance, tenant company provisioning, global settings, freezing/unfreezing companies, audit log inspection.
2. **Branch Manager**: Operational management (properties, units, contracts, contractor projects, operational reports).
3. **General Accountant**: Chart of Accounts, Cost Centers, Maker-Checker approvals/rejections, balanced journal entries, fiscal year closing, trial balance, P&L, balance sheet.
4. **Data Entry**: Operational input clerk (drafting contracts, vouchers, invoices, tenant records). Zero approval or posting authority.
5. **Tenant**: Lessee counterparty. Passive recipient of notifications and payment receipts via SMS/Email.
6. **SMS Gateway**: Automated system actor for SMS alerts, OTP, and scheduled installment reminders.

### 1.3 Scope Boundaries
- **In-Scope**: Multi-tenant isolation, Maker-Checker workflows, double-entry General Ledger engine, automated installment scheduler, background cron alerts, financial reporting (Trial Balance, General Ledger, Balance Sheet, Income Statement, Building P&L), bilingual Arabic (RTL primary) & English (LTR secondary).
- **Out-of-Scope**: Native mobile apps (iOS/Android), external online payment gateway checkout, direct automated Ejar government API integration, tenant self-service portal.

---

## 2. Core Architectural & Accounting Rules

### 2.1 Multi-Tenant Isolation & Company Lifecycle
- **Tenant Isolation**: Every database query on operational and financial records must filter by `company_id`.
- **Company States**: `active` and `frozen`.
- **Instant Revocation**: If a company is marked `frozen`, any subsequent request by any user of that company receives HTTP 403 / 401 with error message `حساب الشركة مجمد حالياً` / `Company account is currently frozen`, and user session/tokens are revoked immediately.

### 2.2 Chart of Accounts (COA) Structure
Inherited root hierarchy consisting of 5 top-level classes:
- `1`: Assets (الأصول)
- `2`: Liabilities (الخصوم)
- `3`: Equity (حقوق الملكية)
- `4`: Revenue (الإيرادات)
- `5`: Expenses (المصروفات)
Sub-accounts can be created up to 5 levels deep. Parent accounts cannot directly receive journal entries.

### 2.3 Maker-Checker Principle (Four-Eyes Control)
- **Maker**: Data Entry or General Accountant drafts vouchers or contractor claims.
- **Checker**: General Accountant or Branch Manager reviews and approves/rejects.
- **Rejection Rule**: Rejection requires a mandatory text reason of at least 10 characters (`rejection_reason.min:10`).
- **Posting Rule**: Draft vouchers do not affect the General Ledger. Upon approval, a balanced Journal Entry is generated and posted atomically.

### 2.4 Accounting Formulas & Balanced Ledgers
- **Trial Balance**:
  $$\sum \text{Debit} = \sum \text{Credit}$$
- **General Ledger Running Balance**:
  - For Asset (1) and Expense (5): $\text{Balance}_t = \text{Balance}_{t-1} + \text{Debit}_t - \text{Credit}_t$
  - For Liability (2), Equity (3), and Revenue (4): $\text{Balance}_t = \text{Balance}_{t-1} + \text{Credit}_t - \text{Debit}_t$
- **Balance Sheet**:
  $$\text{Total Assets} = \text{Total Liabilities} + \text{Total Equity} + \text{Current Period Net Income}$$
- **Income Statement**:
  $$\text{Net Income} = \sum \text{Revenues} - \sum \text{Expenses}$$
- **Per-Building Income Statement**:
  $$\text{Building Net Margin} = \sum \text{Revenues}_{\text{Building Cost Center}} - \sum \text{Expenses}_{\text{Building Cost Center}}$$

---

## 3. Detailed Functional Requirements (Use Cases UC-01 through UC-70)

### Module 1: System Admin & Company Management
- **FR-01 (UC-01: Login to Super Admin Dashboard)**: Super Admin authenticates at `/admin/login`, views global statistics (active companies, frozen companies, system health).
- **FR-02 (UC-02: Create New Company Tenant)**: Provision company record with name (AR/EN), commercial registration (CR, 10 digits), tax number (15 digits), currency (SAR), and auto-seed root Chart of Accounts.
- **FR-03 (UC-03: View / Search Companies)**: Filter companies by status, name, or CR number.
- **FR-04 (UC-04: Edit Company Profile)**: Update company metadata, contact email, phone, and legal address.
- **FR-05 (UC-05: Freeze Company Account)**: Transition company state to `frozen`. Revokes all active user tokens immediately.
- **FR-06 (UC-06: Unfreeze Company Account)**: Transition company state to `active`, restoring login privileges.
- **FR-07 (UC-07: Configure System Global Settings)**: Manage global SMS gateway credentials, SMTP mail server settings, default currency, and pagination limits.
- **FR-08 (UC-08: View Global Audit Logs)**: Inspect cross-tenant audit entries with actor, IP, timestamp, action, and JSON payload diffs.

### Module 2: Authentication & User Management
- **FR-09 (UC-09: User Login)**: Email and password authentication with rate limiting (5 attempts/min). Validates user `active` status and company `active` status. Returns Bearer token.
- **FR-10 (UC-10: User Logout)**: Revokes the current access token.
- **FR-11 (UC-11: Password Reset Request)**: Initiates password reset with token sent via email.
- **FR-12 (UC-12: Reset Password Confirmation)**: Accepts valid token and new password ($\ge 8$ chars, mixed case, number, symbol).
- **FR-13 (UC-13: Create User Account)**: Super Admin or Branch Manager provisions new user, assigns Role (Branch Manager, General Accountant, Data Entry), binds to `company_id`.
- **FR-14 (UC-14: Update User Details & Roles)**: Edit user profile, activate/deactivate account, or reassign operational roles.
- **FR-15 (UC-15: View Company User Directory)**: Paginated search of users within current company tenant.
- **FR-16 (UC-16: Enforce RBAC Permissions)**: Middleware enforces the Section 1.6 CRUD permission matrix on every API route.

### Module 3: Chart of Accounts & Cost Centers
- **FR-17 (UC-17: View Chart of Accounts Hierarchy)**: Recursive tree view of 5-tier COA with account code, name (AR/EN), class, and balance.
- **FR-18 (UC-18: Add Sub-Account)**: Create child account under parent node. Inherits class; auto-generates sequential child code.
- **FR-19 (UC-19: Edit Account Details)**: Update account name (AR/EN) and description. Cannot alter parent or account class if transactions exist.
- **FR-20 (UC-20: Deactivate Account)**: Deactivate account if zero balance and no transactions in current fiscal year.
- **FR-21 (UC-21: View Cost Centers Tree)**: Display cost center hierarchy (e.g., Company $\rightarrow$ Properties $\rightarrow$ Building $\rightarrow$ Unit).
- **FR-22 (UC-22: Create Cost Center)**: Provision cost center node with code, name, and parent cost center.
- **FR-23 (UC-23: Link Transaction to Cost Center)**: Require cost center selection on revenue and expense voucher line items.

### Module 4: Real Estate & Unit Operations
- **FR-24 (UC-24: Create Real Estate Property)**: Register property (building, complex, land) with name, address, deed number, total units, and auto-provisions a dedicated Cost Center.
- **FR-25 (UC-25: View / Search Properties)**: List properties with occupancy rate, unit count, and address filter.
- **FR-26 (UC-26: Update Property Details)**: Update property metadata, manager assignment, and physical specs.
- **FR-27 (UC-27: Create Property Unit)**: Create unit with unit number, floor, type (apartment, office, shop), annual rent price, and auto-provisions child Cost Center. Initial status `vacant`.
- **FR-28 (UC-28: View Property Units)**: Grid and list view of units filtered by status (`vacant`, `rented`, `maintenance`).
- **FR-29 (UC-29: Update Unit Status & Price)**: Edit rental price or flag unit for maintenance.
- **FR-30 (UC-30: Property Maintenance Log)**: Log maintenance requests and link maintenance disbursement vouchers to unit cost center.

### Module 5: Tenant & Lease Contract Management
- **FR-31 (UC-31: Register Tenant Record)**: Create tenant with national ID / Iqama (10 digits), name, phone (+966 format), email, and commercial register if corporate.
- **FR-32 (UC-32: View / Search Tenants)**: Paginated tenant directory with active contracts and balance summaries.
- **FR-33 (UC-33: Update Tenant Information)**: Edit contact details, bank account info, or emergency contacts.
- **FR-34 (UC-34: Draft Lease Contract)**: Create lease contract selecting Tenant, Unit, Start Date, End Date, Annual Rent, Payment Frequency (monthly, quarterly, semi-annual, annual). Initial status `draft`.
- **FR-35 (UC-35: Approve & Activate Lease Contract)**: Branch Manager or General Accountant activates contract. Updates unit status to `rented`. Triggers automated installment generator.
- **FR-36 (UC-36: Terminate Lease Contract)**: Early termination of lease contract, sets unit to `vacant`, adjusts remaining unpaid installments.
- **FR-37 (UC-37: View Contract Details & Schedule)**: Full view of contract terms, tenant info, and installment schedule.

### Module 6: Installment Engine & Automated Billing
- **FR-38 (UC-38: Automated Installment Schedule Generation)**:
  - Monthly: 12 installments.
  - Quarterly: 4 installments.
  - Semi-Annual: 2 installments.
  - Annual: 1 installment.
  - Generates exact due dates, amounts, and installment numbers summing to total contract value.
- **FR-39 (UC-39: View Installment Schedule)**: View installments with status: `pending`, `partially_paid`, `paid`, `overdue`.
- **FR-40 (UC-40: Mark Installment Paid / Partial Payment)**: Linking Receipt Voucher to installment updates paid amount and status.
- **FR-41 (UC-41: Overdue Detection Cron)**: Daily cron detects past-due pending installments and transitions status to `overdue`.
- **FR-41A (UC-41A: Overdue Rent Notification Dispatch)**: Automated SMS and In-App alert dispatched to tenant and accountant when installment enters `overdue` state.

### Module 7: Financial Vouchers (Receipt & Disbursement)
- **FR-42 (UC-42: Draft Receipt Voucher)**: Data Entry creates receipt voucher (Tenant, Amount, Payment Method: Cash/Bank, Deposit Account, Contract/Installment reference, Description). Initial status `draft`.
- **FR-43 (UC-43: Draft Disbursement Voucher)**: Data Entry creates payment voucher (Vendor/Payee, Amount, Payment Method, Expense Account, Cost Center, Description). Initial status `draft`.
- **FR-44 (UC-44: View Voucher List)**: Filter vouchers by type (Receipt/Disbursement), status (`draft`, `approved`, `rejected`), date range.
- **FR-45 (UC-45: Edit Draft Voucher)**: Modify line items, accounts, or amounts while voucher is in `draft` state.
- **FR-46 (UC-46: Approve Voucher - Maker-Checker)**: General Accountant approves voucher. Automatically generates balanced Journal Entry and posts to General Ledger.
- **FR-47 (UC-47: Reject Voucher - Maker-Checker)**: General Accountant rejects voucher. Requires mandatory rejection reason ($\ge 10$ characters). State becomes `rejected`.
- **FR-48 (UC-48: Print / Export Voucher PDF)**: Export standardized voucher in Arabic/English layout with serial number, QR code, and signatures.
- **FR-49 (UC-49: Cancel Approved Voucher)**: Reversal flow. Only General Accountant can cancel; generates counter-reversing journal entry.

### Module 8: Contractor & Contracting Operations
- **FR-50 (UC-50: Register Contractor / Subcontractor)**: Maintain contractor master data (Name, CR, Tax No, Phone, Bank details).
- **FR-51 (UC-51: Create Contracting Project)**: Define project name, budget, assigned cost center, start/end dates.
- **FR-52 (UC-52: Draft Contractor Invoice / Claim)**: Data Entry drafts contractor progress claim with itemized quantities, unit rates, retention deduction percentage, and VAT.
- **FR-53 (UC-53: Audit Contractor Invoice)**: General Accountant verifies claim against project budget and completed work percentages.
- **FR-54 (UC-54: Approve Contractor Invoice)**: Approves invoice, posts Journal Entry (Debit WIP/Expense, Credit Contractor Payable & Retention Payable).
- **FR-55 (UC-55: Reject Contractor Invoice)**: Rejection with mandatory reason ($\ge 10$ chars).

### Module 9: Double-Entry Journal Entries & General Ledger
- **FR-56 (UC-56: Create Manual Journal Entry)**: General Accountant drafts multi-line journal entry. Validates $\sum \text{Debit} - \sum \text{Credit} = 0$.
- **FR-57 (UC-57: Post Journal Entry)**: Posts balanced entry to General Ledger. Status becomes `posted`. Immutable once posted.
- **FR-58 (UC-58: View Journal Entries)**: List journal entries with filter by date, reference number, posting status.
- **FR-59 (UC-59: Reverse Journal Entry)**: Creates linked reversal journal entry with mirrored debits and credits.
- **FR-60 (UC-60: Query General Ledger)**: Query posted lines by account code, cost center, and date range.

### Module 10: Financial Reporting Engine
- **FR-61 (UC-61: Generate Trial Balance)**: Generates Trial Balance table with Opening Balance, Period Debit, Period Credit, and Closing Balance. Verifies $\sum \text{Debit} = \sum \text{Credit}$.
- **FR-62 (UC-62: Generate General Ledger Report)**: Detailed statement per account showing running balance.
- **FR-63 (UC-63: Generate Balance Sheet)**: Displays Assets, Liabilities, and Equity as of specified cut-off date. Verifies balance equation.
- **FR-64 (UC-64: Generate Income Statement - P&L)**: Displays Operating Revenues, Cost of Sales, Operating Expenses, Net Income for given fiscal period.
- **FR-65 (UC-65: Generate Per-Building Income Statement)**: Filters revenues and expenses by property cost center to compute net operating income per building.
- **FR-66 (UC-66: Export Financial Reports to PDF and Excel)**: One-click export of Trial Balance, GL, Balance Sheet, and Income Statements in PDF and `.xlsx` formats.

### Module 11: Fiscal Year Closing
- **FR-67 (UC-67: Create Fiscal Year & Accounting Periods)**: Define fiscal year start date, end date, and 12 monthly periods. Status `open`.
- **FR-68 (UC-68: Execute Fiscal Year Closing)**: Validates all vouchers and entries are posted. Calculates net income, transfers to Retained Earnings account (`300001`), locks the fiscal year. No transactions can be posted to closed fiscal years.

### Module 12: Automated Background Cron & Notifications
- **FR-69 (UC-69: Scheduled Rent Reminders Cron)**:
  - 7 days before due date: Automated SMS and email reminder to tenant.
  - On due date: Urgent payment reminder.
  - 1 day overdue: Overdue notice and operational alert to General Accountant.
- **FR-70 (UC-70: In-App & Notification Center)**: Real-time notification bell displaying voucher approvals, rejections, lease expirations, and overdue installments.

---

## 4. Object Status Lifecycle State Transitions

### 4.1 Company Lifecycle
$$\text{active} \underset{\text{UC-06 Unfreeze}}{\overset{\text{UC-05 Freeze}}{\rightleftharpoons}} \text{frozen}$$

### 4.2 Property Unit Lifecycle
$$\text{vacant} \xrightarrow{\text{UC-35 Lease Activated}} \text{rented} \xrightarrow{\text{UC-36 Lease Terminated}} \text{vacant}$$
$$\text{vacant} \rightleftharpoons \text{maintenance}$$

### 4.3 Lease Contract Lifecycle
$$\text{draft} \xrightarrow{\text{UC-35 Approve}} \text{active} \xrightarrow{\text{UC-36 Terminate / Expire}} \text{terminated} / \text{expired}$$

### 4.4 Installment Lifecycle
$$\text{pending} \xrightarrow{\text{UC-40 Partial Payment}} \text{partially\_paid} \xrightarrow{\text{UC-40 Full Payment}} \text{paid}$$
$$\text{pending} \xrightarrow{\text{UC-41 Due Date Passed + 1 Day}} \text{overdue} \xrightarrow{\text{Payment}} \text{paid}$$

### 4.5 Financial Voucher Lifecycle (Receipt & Disbursement)
$$\text{draft} \xrightarrow{\text{UC-46 Approve}} \text{approved (Posts GL Entry)}$$
$$\text{draft} \xrightarrow{\text{UC-47 Reject (Reason } \ge 10\text{ chars)}} \text{rejected}$$
$$\text{approved} \xrightarrow{\text{UC-49 Cancel (Reversal Entry)}} \text{cancelled}$$

### 4.6 Contractor Invoice Lifecycle
$$\text{draft} \xrightarrow{\text{UC-54 Approve}} \text{approved (Posts GL Entry)}$$
$$\text{draft} \xrightarrow{\text{UC-55 Reject (Reason } \ge 10\text{ chars)}} \text{rejected}$$

### 4.7 Fiscal Year Lifecycle
$$\text{open} \xrightarrow{\text{UC-68 Close Year (Transfers Net Income to Retained Earnings)}} \text{closed (Locked)}$$

---

## 5. Non-Functional Requirements (NFR Traceability)

- **NFR-001 (Performance)**: Standard API endpoints respond in $\le 500\text{ ms}$ under concurrent load.
- **NFR-002 (Report Throughput)**: Financial statements (Trial Balance, GL, P&L, Balance Sheet) execute in $\le 3.0\text{ s}$ for up to 100,000 journal lines.
- **NFR-003 (Multi-Tenant Data Isolation)**: Global query scopes guarantee zero cross-tenant data leakage. Frozen company status immediately invalidates auth tokens.
- **NFR-004 (Authentication & Cryptography)**: Passwords hashed with Bcrypt/Argon2id. API secured via Laravel Sanctum bearer tokens with expiration.
- **NFR-005 (Auditability & Immutability)**: Every posted journal entry is permanent. Deleting posted vouchers or journals is forbidden; adjustments must be executed via documented reversal vouchers. All CRUD actions logged in `audit_logs`.
- **NFR-006 (Data Integrity & Transactions)**: All voucher approvals, invoice postings, and fiscal closings wrapped in atomic database transactions (`DB::transaction`).
- **NFR-007 (Availability & Resilience)**: Automated daily database backups and scheduled background cron fault tolerance.
- **NFR-008 (Internationalization & Localization)**: Full native Right-to-Left (RTL) Arabic layout and typography, with toggleable LTR English layout. Exact Arabic terminology compliant with Saudi accounting conventions.
- **NFR-009 (Frontend Compatibility)**: Responsive interface operational across modern Chromium (Chrome, Edge) and WebKit (Safari) desktop and tablet viewports.
- **NFR-010 (Validation Rigor)**: Field validations with explicit Arabic error messages matching `docs/SRS.md` verbatim (e.g. CR 10 digits, Tax No 15 digits, Phone Saudi format `+9665xxxxxxxx`, Rejection Reason $\ge 10$ chars).

