# AGENTS.md

## Project Directives & Behavioral Guidelines for AI Agents

### 1. Source of Truth
- `docs/SRS.md` is the SOLE and FINAL source of truth.
- Do NOT invent features, roles, screens, fields, or integrations outside `docs/SRS.md`.
- Strictly exclude Out-of-Scope items:
  - Mobile applications
  - External payment gateways
  - Ejar government integration
  - Tenant self-payment portal
- Implement every detail inside `docs/SRS.md` without omission:
  - 6 Actors: Super Admin, Branch Manager, General Accountant, Data Entry, Tenant, SMS Gateway
  - CRUD Permission Matrix (Section 1.6)
  - 70 Use Cases (UC-01 through UC-70 including UC-41A)
  - Every validation, Arabic and English error message, alternative flow
  - Accounting formulas (Trial Balance, General Ledger, Balance Sheet, Income Statement, Per-Building Income Statement)
  - Maker-Checker rules (Draft, Approval, Rejection with mandatory $\ge 10$ char reason)
  - Object status lifecycles (Sections 4.1–4.8)
  - NFR-001 through NFR-010

### 2. Repository Layout
- `apps/backend/`: PHP Laravel backend application (app/, database/, routes/, tests/, etc.).
- `apps/frontend/`: Next.js frontend application (src/, public/, tests/, etc.).
- `docs/SRS.md`: System requirements specification.

### 3. Language & Internationalization
- Arabic is primary with right-to-left (`dir="rtl"`) layout.
- English is secondary with left-to-right (`dir="ltr"`) layout.
- All Arabic error messages, validation messages, and system alerts must match `docs/SRS.md` verbatim.

