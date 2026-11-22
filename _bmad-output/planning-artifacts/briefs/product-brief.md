---
title: "Product Brief: Cloud Accounting & Operational ERP System"
project: "Mohamed Ramadan Group"
version: "1.0"
status: "approved"
created: "2026-11-22"
updated: "2026-11-22"
author: "Antigravity BMAD Product Team"
---

# Executive Product Brief: Cloud Accounting & Operational ERP System
**Client Organization**: Mohamed Ramadan Group (Kingdom of Saudi Arabia)  
**System Version**: 1.0  
**Specification Baseline**: `docs/SRS.md` (Sole and Final Source of Truth)

---

## 1. Executive Summary & Problem Statement

Mohamed Ramadan Group operates a diversified commercial enterprise across the Kingdom of Saudi Arabia comprising three distinct business verticals:
1. **Real Estate Development & Property Management**
2. **General Contracting & Construction**
3. **Commercial & Retail Operations**

Prior to this system, the group faced critical operational and governance bottlenecks:
- **Fragmented Financial Records**: Inability to achieve real-time visibility across independent business lines, leading to delayed consolidation, manual reconciliation errors, and lack of unified audit trails.
- **Absence of Strict Separation & Multi-Tenancy**: Shared spreadsheets or decoupled legacy tools failed to guarantee cryptographic and logical isolation between operating companies while allowing executive oversight.
- **Lack of Governance & Maker-Checker Controls**: Financial disbursements, receipt vouchers, and contractor claims lacked rigid four-eyes controls (Maker-Checker workflow), creating compliance risks and unmonitored liabilities.
- **Manual Rent Collection & Installment Calculation**: Property leases required tedious manual tracking for monthly, quarterly, semi-annual, and annual installments, resulting in overdue payments and lost revenues.
- **Reporting Inefficiencies**: Inability to generate instant, GAAP/IFRS-compliant financial statements (Trial Balance, General Ledger, Balance Sheet, Consolidated Income Statement, and Unit/Building-level P&L).

The **Cloud Accounting & Operational ERP System** provides an enterprise-grade, cloud-native platform providing strict multi-tenant company isolation, double-entry general ledger accounting, automated contract installment generation, rigid Maker-Checker approval workflows, and automated scheduled event notifications.

---

## 2. Target Actors & Roles (Section 1.6 CRUD Matrix Baseline)

The system supports exactly **six (6) distinct actors**, each bound to strict role-based access control (RBAC):

| Actor | Role Definition & Domain Responsibilities | Primary Interface / Access |
|---|---|---|
| **Super Admin** | System Owner & IT Administrator. Provisions independent company tenants, freezes/unfreezes company accounts (triggering immediate session termination for frozen tenants), manages global configurations, monitors audit logs across all tenants. | `/admin/dashboard`, Company & User Management |
| **Branch Manager** | Operational Executive for a specific company tenant. Manages properties, units, tenants, lease contracts, and contractor projects. Has view/create/edit permissions for operational assets and can view company-level operational dashboards. | `/company/dashboard`, Property & Contract Portals |
| **General Accountant** | Financial Authority for a company tenant. Manages Chart of Accounts (COA) inheritance, Cost Centers, performs Maker-Checker approvals/rejections for vouchers and contractor invoices, executes Fiscal Year closing, and generates financial reports (Trial Balance, General Ledger, Balance Sheet, Income Statement). | `/accounting/dashboard`, Financial & Reporting Portals |
| **Data Entry** | Operational Clerk. Drafts contracts, creates draft receipt and disbursement vouchers, inputs supplier and contractor bills, records tenant data. **Zero approval authority**; cannot post to General Ledger or approve vouchers. | `/data-entry/dashboard`, Operational Draft Forms |
| **Tenant** | External Counterparty (Lessee). Passive recipient of SMS/Email payment reminders, contract signing notifications, and payment receipts. | SMS Gateway & Transactional Notifications |
| **SMS Gateway** | System Automated Actor. Dispatches OTP verification tokens, 7-day upcoming rent reminders, due-date notices, and overdue payment alerts via REST API. | Automated Background Cron & Event Dispatcher |

---

## 3. Portfolio Scope Across Three Independent Companies

The system implements strict logical multi-tenancy where each company operates as an isolated tenant with its own dedicated Chart of Accounts, Cost Centers, Fiscal Years, Customers, Vendors, and Transactional Ledgers:

### 3.1 Real Estate Management Company
- **Asset Hierarchy**: Real Estate Properties (Buildings/Compounds) $\rightarrow$ Property Units (Apartments, Offices, Retail Shops).
- **Cost Center Binding**: Every property and unit automatically provisions and links to a dedicated hierarchical Cost Center (`PROPERTIES / [Property Name] / [Unit Number]`).
- **Lease Lifecycle**: Draft $\rightarrow$ Active $\rightarrow$ Terminated / Expired.
- **Installment Engine**: Automated generation of installment schedules based on lease terms and selected frequencies (Monthly: 12 installments, Quarterly: 4 installments, Semi-Annual: 2 installments, Annual: 1 installment).
- **Financial Attribution**: Per-Building Income Statement isolating rental revenues, maintenance expenses, and net yield per physical asset.

### 3.2 General Contracting & Construction Company
- **Project Governance**: Project master data, project cost centers, and site supervisor assignments.
- **Contractor Invoicing**: Progress billings, subcontractor claims, retention deductions, and tax calculations.
- **Maker-Checker Claim Approval**: Data Entry drafts contractor invoice $\rightarrow$ General Accountant audits quantities and cost codes $\rightarrow$ Approval automatically generates balanced Journal Entry posting to Work in Progress (WIP) and Accounts Payable.

### 3.3 Commercial & Retail Trading Company
- **Procurement & Payables**: Supplier invoices, purchase disbursement vouchers, trade receivables, and merchant operational expenditures.
- **Cash & Liquidity Management**: Multi-treasury cash and bank account management with continuous ledger reconciliation.

---

## 4. In-Scope vs. Out-of-Scope Boundaries

### 4.1 In-Scope Capabilities
- **Multi-Tenant Isolation**: Complete isolation of company data filtered via tenant scope; instantaneous session revocation upon company freeze.
- **Accounting Engine**:
  - Hierarchical Chart of Accounts rooted in 5 fundamental classes: Assets (1), Liabilities (2), Equity (3), Revenue (4), Expenses (5).
  - Strict double-entry balance validation ($\sum \text{Debit} - \sum \text{Credit} = 0$).
  - Immutable General Ledger entries once posted.
  - Cost Center attribution mandatory for all operational revenue and expense accounts.
  - Fiscal Year management with irreversible closing and retained earnings calculation.
- **Maker-Checker Workflow**:
  - Four-eyes principle on Receipt Vouchers, Disbursement Vouchers, and Contractor Invoices.
  - Rejection requires mandatory explanation ($\ge 10$ characters).
  - Draft state does not hit the General Ledger; Approval automatically triggers real-time ledger posting.
- **Operational Automation**:
  - Automated rent schedule generator.
  - Scheduled background cron jobs for 7-day rent alerts, due-date notifications, and 1-day overdue lease transitions.
  - Real-time in-app, SMS, and SMTP alerts.
- **Financial Reporting**:
  - Real-time Trial Balance (Summary & Detailed).
  - General Ledger report with date range and account filters.
  - Balance Sheet (Assets = Liabilities + Equity).
  - Income Statement (Revenues - Expenses).
  - Per-Building / Unit P&L Statement with PDF and Excel (.xlsx) exports.
- **Bilingual Experience**:
  - Arabic as primary interface language with full native Right-to-Left (`dir="rtl"`) layout.
  - English secondary interface language with Left-to-Right (`dir="ltr"`) layout.

### 4.2 Out-of-Scope Capabilities (Strictly Excluded)
To preserve development velocity and adhere strictly to `docs/SRS.md`, the following elements are explicitly **excluded**:
- **Mobile Applications**: No native iOS or Android apps (responsive web only).
- **External Online Payment Gateways**: No checkout portals, credit card gateways (e.g., Moyasar, HyperPay, Stripe), or mada card tokenization. Payments are entered manually by authorized accountants as Bank/Cash Vouchers.
- **Government Integration (Ejar / ZATCA Fatoora Phase 2)**: Direct API integration with the Ministry of Housing (Ejar) or live XML ZATCA clearance is excluded from v1.0.
- **Tenant Self-Service Web Portal**: Tenants do not log in to create tickets or execute payments online; they interact via SMS and official paper/PDF receipts issued by the company.

---

## 5. Non-Functional & Architectural Foundations

- **Performance (NFR-001, NFR-002)**: API response time $\le 500\text{ ms}$ for standard queries; financial reports generation $\le 3.0\text{ s}$ for up to 100,000 ledger entries.
- **Security & Multi-Tenancy (NFR-003, NFR-004)**: Cryptographic password hashing (Argon2id/Bcrypt), Laravel Sanctum bearer token authentication, company freeze immediate logout middleware, tenant scoping applied globally across all database queries.
- **Auditability & Immutability (NFR-005)**: Zero hard deletes on posted financial vouchers and journal entries; complete audit logging capturing actor ID, timestamp, IP address, and payload diffs.
- **UI Responsiveness (NFR-009)**: Modern Next.js React frontend optimized for Chrome, Safari, and Edge on desktop and tablet viewports.

