---
title: "Product Brief: Cloud Accounting & Operational ERP System (Mohamed Ramadan Group)"
status: final
created: "2026-11-22"
updated: "2026-11-22"
project_name: "mohamed_ramdan"
owner: "Mr. Mohamed Ramadan (أ. محمد رمضان)"
version: "1.0"
---

# Product Brief: Cloud Accounting & Operational ERP System (Mohamed Ramadan Group)

## 1. Executive Summary

The **Cloud Accounting & Operational ERP System** is a unified, multi-tenant enterprise resource planning platform engineered specifically for **Mohamed Ramadan Group (مجموعة الأستاذ محمد رمضان)**. The group manages a diversified commercial investment portfolio across three independent companies and branches, spanning:
1. **Real Estate Investments** (multi-unit residential, commercial, and mixed-use properties).
2. **Contracting Projects** (construction milestones, subcontractor billings, and site cost tracking).
3. **Commercial Trading & Operations** (procurement, supplier invoicing, and operational expenditures).

To resolve operational fragmentation, enforce financial auditability, and provide executive visibility, the system establishes a zero-trust financial architecture. It combines **Isolated Multi-Tenancy** (physically/logically isolated databases per company with centralized authentication) with a rigorous **Maker-Checker governance model**. Under this model, operational data entry personnel can only create draft records, while certified General Accountants hold the exclusive authority to validate, approve, reject with audit reasons, and post immutable double-entry journal entries to the General Ledger.

The platform provides role-tailored dashboards and workflows in **Arabic (primary RTL)** and **English (LTR)**, complete financial statement generation (Trial Balance, General Ledger, Balance Sheet, Income Statement, and Per-Building P&L), automated installment generation, and background event-driven and scheduled notifications via SMS and Email.

---

## 2. Problem Statement & Market Context

Prior to this system, the group faced significant operational and financial challenges:
- **Data Cross-Contamination & Security Risks**: Managing multiple distinct operating companies under informal accounting tools created risks of commingling financial balances, leaking sensitive operational costs, and obscuring true entity-level profitability.
- **Absence of Maker-Checker Controls**: Operational staff recording collections, expenses, and contract cancellations had direct or uncontrolled impact on financial ledgers, creating variance, posting errors, and lack of internal accountability.
- **Disconnected Property Operations and General Ledger**: Rental contracts, installment schedules, and building-level maintenance expenditures were decoupled from the Chart of Accounts and Cost Centers, preventing accurate per-property return-on-investment (ROI) analysis.
- **Delayed Reporting & Executive Blind Spots**: Executive leadership lacked consolidated real-time oversight of group liquidity, total liabilities, overdue receivables, and performance comparison across active entities.

---

## 3. Product Vision & Solution Overview

The system delivers an end-to-end, single-source-of-truth web platform built on **React.js**, **PHP Laravel**, and **MySQL multi-tenant architecture**:
- **Multi-Tenant Isolation**: Each company operates within its own dedicated database. Super Admin oversees the group through consolidated dashboards, while branch personnel are strictly locked to their company's perimeter. Freezing a company terminates all active user sessions instantly.
- **Constitutional Maker-Checker Governance**:
  - *Data Entry (Maker)*: Registers properties, units, tenants, contracts, draft receipt/disbursement vouchers, contractor invoices, and supplier invoices.
  - *General Accountant (Checker)*: Manages the Chart of Accounts (fixed root classes, inherited debit/credit nature), configures Cost Centers, locks Fiscal Year periods, reviews draft queues, enters mandatory rejection notes (>= 10 characters), and executes one-click approval that generates auto-balanced, immutable journal entries (`Debit - Credit = 0`).
  - *Branch Manager*: Oversees company performance, manages staff access, and approves rental contract terminations and exceptional discounts.
- **Automated Property & Cost Center Lifecycle**: Adding a property automatically provisions its dedicated Cost Center and vacant units. Creating a rental contract automatically schedules rent installments (monthly, quarterly, semi-annual, annual) and transitions the unit to "Occupied".
- **Real-Time Financial & Operational Engine**: Immediate posting to the General Ledger and Trial Balance upon voucher approval, real-time recalculation of tenant dues, automated overnight cron jobs for rent reminders (7 days prior, due day, and 1-day overdue transition), and instant in-app alerts.

---

## 4. User Personas & Actor Hierarchy

The system defines six explicit actors strictly mapped to business responsibilities:

| Actor | Role Definition & Responsibility | Key System Surface |
| :--- | :--- | :--- |
| **Super Admin (الأدمن العام)** | Group owner / Chief Executive. Provisions companies, assigns branch managers, freezes/activates entities, views consolidated financial & operational dashboards. | `/admin/dashboard` |
| **Branch Manager (مدير الشركة)** | Executive governor of an isolated company. Manages company staff, monitors liquidity/debt/contracts, approves contract cancellations and exceptional discounts. | `/company/dashboard` |
| **General Accountant (المحاسب العام)** | Chief financial officer for the company. Manages COA, Cost Centers, Fiscal Years, creates manual journal entries, audits/approves/rejects vouchers & contractor claims, exports financial reports. | `/accounting/dashboard` |
| **Data Entry (مدخل البيانات)** | Operational clerk. Enters properties, units, tenants, rental contracts, cancellation requests, draft receipt vouchers, draft expense vouchers, and supplier invoices. | `/data-entry/dashboard` |
| **Tenant (المستأجر)** | External beneficiary (indirect actor). Receives automated SMS/Email reminders 7 days prior to rent due date, on due date, and overdue notices. | SMS / Email Gateway |
| **SMS Gateway (External System)** | Automated API integration for dispatching operational SMS text messages with encrypted API key storage. | System Integration |

---

## 5. Scope Boundaries

### In-Scope (Phase 1.0 Release)
1. **Multi-Tenant Administration**: Company creation with isolated MySQL database provisioning, subdomain mapping (`comp1.ehkam.com`), freezing/activation with instantaneous session invalidation, and branch manager assignment.
2. **User & Access Management**: Secure login with 5-attempt rate-limiting / 15-minute lockout, role-based redirection, 24-hour single-use token password resets, and role-based access control (RBAC).
3. **Core Accounting Engine**:
   - Fixed root Chart of Accounts (Assets, Liabilities, Equity, Expenses, Revenues, Sales, Purchases, Sales Returns, Purchase Returns, Withdrawals, Discounts Allowed, Discounts Earned).
   - Cost Centers for all properties and contracting projects with mandatory linking enforcement.
   - Fiscal year and accounting period locking (preventing any retroactive postings to closed periods).
   - Manual balanced journal entries (`Total Debit - Total Credit = 0`) and automatic voucher-driven posting.
   - Comprehensive Financial Statements (Trial Balance, General Ledger with counter-account tracking, Balance Sheet, Income Statement, Per-Building Income Statement) with 1-click PDF and Excel (.xlsx) export.
   - Fiscal year closing and automatic retained earnings / P&L rollup.
4. **Real Estate & Property Management**:
   - Property / building creation with automatic unit generation and cost center creation.
   - Unit status transitions: Vacant $\leftrightarrow$ Occupied $\leftrightarrow$ Under Maintenance.
   - Tenant master registry (Individual and Corporate records).
   - Rental contract generation with automated installment engines (Monthly: 12, Quarterly: 4, Semi-Annual: 2, Annual: 1).
   - Document attachment uploads (PDF, PNG, JPEG up to 5MB, max 10 files).
   - Two-step contract cancellation workflow (Data Entry requests with mandatory justification $\rightarrow$ Branch Manager reviews, approves, and automatically releases unit to Vacant).
5. **Contracting & Commercial Modules**:
   - Subcontractor progress billing (مستخلصات المقاولين) with quantity $\times$ unit price line items, tax calculations, and accountant approval.
   - Supplier purchase invoice entry with earned discount deductions and tax calculations.
6. **Automation & Notifications**:
   - Daily Cron Jobs for 7-day prior rent reminder, due-date alert, and 1-day post-due contract/installment status transition to "Overdue".
   - Event-driven real-time In-App alerts for voucher drafts and voucher rejections (including accountant rejection remarks $\ge 10$ chars).
   - Encrypted SMTP email server and SMS Gateway integrations.
7. **Localization & Usability**: Full Arabic RTL primary interface with English LTR toggle; responsive web layouts for desktop, tablet, and mobile browsers (Chrome, Safari, Edge).

### Out-of-Scope (Strictly Excluded)
- Native mobile applications (iOS / Android) for tenants or property owners.
- External online payment gateway integrations (e.g., credit card, Mada, Apple Pay processing).
- Direct API integration with the governmental "Ejar" platform in this release.
- Tenant self-service portal / online payment checkout.

---

## 6. Success Criteria & Non-Functional Benchmarks

| Metric / Requirement | Target Benchmark | Verification Method |
| :--- | :--- | :--- |
| **Multi-Tenant Isolation (NFR-001)** | 100% data partition; zero cross-company data leakage; immediate token invalidation on company freeze. | Multi-tenant security audit & automated unit/integration tests. |
| **Report Generation Latency (NFR-002)**| Complex financial reports (Trial Balance, Balance Sheet) load in $< 5.0$ seconds. | Performance benchmark on 50,000+ posted journal entry lines. |
| **High Availability (NFR-003, NFR-010)** | $99.9\%$ operational uptime; planned maintenance $< 0.1\%$. | Cloud health checks & monitoring telemetry (AWS / DigitalOcean). |
| **Data Integrity & Immutability** | Zero posted unbalanced entries (`Debit - Credit = 0` strictly enforced); posted entries cannot be edited or deleted (reversal entry only). | Database constraints, service layer unit tests, and ledger audit. |
| **Automated Data Backup (NFR-004)** | Daily automated snapshots for all tenant databases. | Automated backup cron & restore drills. |
| **Browser Compatibility (NFR-006)** | Pixel-perfect responsive rendering on Google Chrome, Apple Safari, Microsoft Edge. | Cross-browser automated Playwright UI tests. |
| **Localization Fidelity (NFR-008, 009)** | 100% Arabic UI coverage with natural RTL orientation, standardized accounting terminology, and English toggle. | Linguistic & visual inspection. |

