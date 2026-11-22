---
title: "User Experience & Interaction Specification: Cloud Accounting & Operational ERP System"
project: "Mohamed Ramadan Group"
version: "1.0"
status: "final"
created: "2026-11-22"
updated: "2026-11-22"
---

# User Experience & Interaction Specification (EXPERIENCE.md)
## Cloud Accounting & Operational ERP System (Mohamed Ramadan Group)

---

## 1. Foundation & Layout Architecture

### 1.1 Shell & Navigation Layout
- **App Layout**: Persistent responsive sidebar navigation on the right (in Arabic RTL) or left (in English LTR). Top header bar with Tenant Company Selector (for multi-tenant context), Notification Center bell with badge counter, Language Switcher (AR/EN), and User Profile Dropdown with Logout.
- **Responsive Breakpoints**:
  - Desktop ($> 1200\text{ px}$): Full expanded sidebar, multi-column dashboard KPI cards, sticky table action bars.
  - Tablet ($768\text{ px} - 1199\text{ px}$): Collapsible icon-only sidebar, responsive cards, horizontally scrollable data tables.
  - Mobile ($< 768\text{ px}$): Drawer menu, single-column stacked forms and KPI cards.

---

## 2. Role-Based Dashboards

### 2.1 Super Admin Dashboard (`/admin/dashboard`)
- **Key Metrics / KPI Cards**:
  - Total Registered Companies (Active vs Frozen badges).
  - Total Global Users.
  - Active System Sessions.
  - System Health Status (Database & Redis/Queue status).
- **Primary Widgets**:
  - Quick Company Provisioning Shortcut button (`+ New Company`).
  - Recent Global Audit Trail stream (User, Company, Action, Timestamp).
  - Fast Company Freeze/Unfreeze toggle table with instant confirmation modal.

### 2.2 Branch Manager Dashboard (`/company/dashboard`)
- **Key Metrics / KPI Cards**:
  - Property Occupancy Rate ($\frac{\text{Rented Units}}{\text{Total Units}} \times 100\%$).
  - Total Active Properties & Units.
  - Active Lease Contracts Count.
  - Overdue Installments Count & Total Overdue Amount (SAR).
- **Primary Widgets**:
  - Monthly Rental Revenue vs Target Progress Bar.
  - Upcoming Contract Expirations (Next 30 Days) table with quick renewal shortcut.
  - Property Vacancy Breakdown chart (Apartments, Commercial, Offices).

### 2.3 General Accountant Dashboard (`/accounting/dashboard`)
- **Key Metrics / KPI Cards**:
  - Pending Voucher Approvals (Receipt & Disbursement queue).
  - Contractor Progress Invoices Awaiting Audit.
  - Unposted / Draft Journal Entries Count.
  - Total Cash & Bank Liquid Balances (SAR).
- **Primary Widgets**:
  - Actionable Maker-Checker Pending Approval Queue (with 1-click Review modal).
  - Quick Financial Indicators: Current Month Revenue, Expenses, and Net Operating Income.
  - Fiscal Year Status banner with days remaining until year-end closing.

### 2.4 Data Entry Dashboard (`/data-entry/dashboard`)
- **Key Metrics / KPI Cards**:
  - My Draft Vouchers (Awaiting submission or review).
  - Recently Registered Tenants (Current Month).
  - Active Lease Contracts Created.
- **Primary Widgets**:
  - Quick Entry Action Hub:
    - `+ New Receipt Voucher`
    - `+ New Disbursement Voucher`
    - `+ New Tenant Record`
    - `+ New Lease Contract`
  - Recently Rejected Documents Table with accountant rejection reasons prominently displayed in red alerts for immediate correction.

---

## 3. Screen Flows & Detailed Form Components

### 3.1 Company Management (`/admin/companies`)
- **List Screen**: Data table with Company Name (AR/EN), Commercial Register (CR, 10 digits), Tax ID (15 digits), Status (`active` / `frozen`), Created Date, and Action menu (Edit, Freeze/Unfreeze).
- **Creation Modal / Page (`/admin/companies/create`)**:
  - Fields: Name (Arabic, required), Name (English, required), CR Number (10 digits, numeric validation), VAT Number (15 digits), Currency (default SAR), Address, Contact Email, Phone.
  - Behavior: Upon submit, system automatically seeds root Chart of Accounts (`1` to `5`) and creates default Fiscal Year.
- **Freeze Confirmation Modal**:
  - Destructive warning modal requiring explicit confirmation.
  - Explains that all company users will be logged out immediately.

### 3.2 Chart of Accounts (COA) Tree (`/accounting/chart-of-accounts`)
- **Hierarchical View**: Interactive recursive tree displaying nodes from Level 1 (Assets, Liabilities, Equity, Revenue, Expense) down to leaf accounts.
- **Node Badges**: Account Code, Account Title (bilingual), Nature (Debit/Credit), and live computed Balance in SAR.
- **Sub-Account Creation Modal**:
  - Pre-selected Parent Account.
  - Child code auto-generated based on sequential prefix.
  - Name (Arabic & English), Account Type selector.

### 3.3 Real Estate Properties & Units (`/properties`)
- **Property Screen (`/properties`)**:
  - Grid of property cards showing Building Name, Location, Deed No, Total Units, Occupancy %.
  - "Add Property" modal: provisions property and automatically generates parent Cost Center (`PROPERTIES / [Name]`).
- **Property Units View (`/properties/[id]/units`)**:
  - Tabbed status filters: All, Vacant (Green badge), Rented (Blue badge), Maintenance (Amber badge).
  - "Add Unit" modal: Unit Number, Floor, Type (Apartment, Commercial Shop, Office), Annual Rent, and auto-provisions child Cost Center.

### 3.4 Tenant Management & Lease Contracts (`/tenants`, `/contracts`)
- **Tenant Form (`/tenants/create`)**:
  - National ID / Iqama (strictly 10 digits validation).
  - Full Name (AR/EN), Mobile Number (Saudi format `+9665xxxxxxxx`).
  - Corporate toggle for Commercial Register if corporate entity.
- **Lease Contract Creation Form (`/contracts/create`)**:
  - **Dynamic Dropdown Dependency**:
    1. Select Property $\rightarrow$ Unit dropdown dynamically filters to show only `vacant` units for that property.
    2. Select Tenant $\rightarrow$ Displays tenant verification badge and active contract count.
    3. Enter Start Date & End Date $\rightarrow$ System computes lease duration in months/days.
    4. Enter Annual Rent Amount (SAR).
    5. Select Payment Frequency:
       - Monthly (12 installments)
       - Quarterly (4 installments)
       - Semi-Annual (2 installments)
       - Annual (1 installment)
  - **Live Installment Schedule Preview**:
    - Real-time interactive schedule table appears before saving, showing Installment Number, Due Date, and Equal Installment Amount.
  - **Action**: Save as `draft` or Save & Activate (transitions Unit status to `rented` and activates contract).

### 3.5 Financial Vouchers (Receipt & Disbursement) (`/vouchers`)
- **List Screen (`/vouchers`)**:
  - Filter tabs: All, Receipt Vouchers, Disbursement Vouchers, Drafts, Approved, Rejected.
- **Receipt Voucher Form (`/vouchers/receipt/create`)**:
  - Payer / Tenant selector, Amount (SAR), Payment Method (Cash / Bank Transfer / Cheque), Deposit Account (Asset: Bank / Cash treasury).
  - Linked Contract / Installment selector (updates installment status upon approval).
  - Description / Remarks (Arabic/English).
- **Disbursement Voucher Form (`/vouchers/disbursement/create`)**:
  - Payee / Vendor name, Amount (SAR), Payment Method, Source Cash/Bank Account.
  - Expense Account dropdown (Level 4/5 Expense) + Mandatory Cost Center selector.
- **Maker-Checker Interaction & Rejection Modal**:
  - When General Accountant clicks "Approve":
    - Triggers confirmation modal: "Approve and Post to General Ledger?"
    - Atomically creates and posts balanced Journal Entry.
  - When General Accountant clicks "Reject":
    - Rejection Modal opens with required textarea: "Reason for Rejection" (`minlength="10"`).
    - Save is disabled until text length $\ge 10$ characters.
    - Transitions voucher state to `rejected` and sends notification alert to the creator.
- **Print / PDF Voucher Action**:
  - Generates standardized printable A4 voucher layout containing company header, serial number, date, QR code, debit/credit details, and signature blocks.

### 3.6 Contractor Claims & Invoicing (`/contracting/invoices`)
- **Contractor Invoice Form (`/contracting/invoices/create`)**:
  - Contractor / Subcontractor selector, Project selector (Cost Center binding).
  - Itemized claim table: Item Description, Claimed Quantity, Unit Rate, Total Amount.
  - Retention Deduction Percentage input (e.g. 5% or 10%).
  - VAT Percentage (15%).
  - Computed Net Payable Amount.
- **Auditing & Approval Flow**:
  - Maker-Checker approval posts journal entry debiting WIP and crediting Contractor Payable & Retention Payable accounts.

### 3.7 Manual Balanced Journal Entries (`/accounting/journal-entries`)
- **Balanced Grid Interface**:
  - Multi-line dynamic table: Account Code / Name selector, Cost Center selector, Debit Amount, Credit Amount, Line Memo.
  - Dynamic Footer with Real-time Balance Checker:
    $$\sum \text{Debit} \quad \text{vs} \quad \sum \text{Credit} \quad \longrightarrow \quad \Delta = \text{Difference}$$
  - "Post to General Ledger" button is strictly disabled with a red warning badge until $\Delta = 0.00$ and at least two lines exist.

### 3.8 Financial Reports (`/reports/...`)
- **Trial Balance (`/reports/trial-balance`)**:
  - Date range filter, Level selector (Level 1 to 5).
  - Columns: Account Code, Account Name, Opening Balance (Dr/Cr), Transaction Period (Dr/Cr), Ending Balance (Dr/Cr).
  - Total Row ensuring $\sum \text{Debit} = \sum \text{Credit}$.
- **General Ledger (`/reports/general-ledger`)**:
  - Filter by Account and Date Range.
  - Chronological transaction rows with Date, Reference Number, Voucher Type, Memo, Debit, Credit, Running Balance.
- **Balance Sheet (`/reports/balance-sheet`)**:
  - As of Date selector.
  - Assets on top (or right in RTL), Liabilities & Equity below.
  - Automatic injection of Current Period Net Profit into Equity section.
  - Verification indicator: $\text{Total Assets} - (\text{Liabilities} + \text{Equity}) = 0.00$.
- **Income Statement (P&L) (`/reports/income-statement`)**:
  - Period filter (Monthly, Quarterly, Annual, Custom).
  - Operating Revenues, Cost of Sales, Gross Margin, Operating Expenses, Net Operating Income.
- **Per-Building Income Statement (`/reports/building-income-statement`)**:
  - Dropdown to select Property / Building Cost Center.
  - Displays rental revenues generated specifically by that building minus direct maintenance and operational expenses linked to that building's cost center.
- **Export Toolbar on All Reports**:
  - "Export to PDF" button (renders clean print layout with company letterhead).
  - "Export to Excel" button (generates `.xlsx` spreadsheet with formatted numeric columns).

### 3.9 Fiscal Year Closing (`/accounting/fiscal-years`)
- **Pre-Flight Closing Wizard**:
  - Step 1: Pre-flight audit check (verifies unposted vouchers = 0, draft journal entries = 0).
  - Step 2: Final Trial Balance validation ($\Delta = 0$).
  - Step 3: Closing Entry confirmation (transfers Revenue and Expense balances to Retained Earnings account `300001`).
  - Step 4: Permanent Fiscal Year Lock (transitions status to `closed`).

