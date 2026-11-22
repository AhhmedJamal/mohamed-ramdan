# Mohamed Ramadan Group - Cloud Accounting & Operational ERP System

Enterprise multi-tenant Cloud Accounting & Operational ERP System for Mohamed Ramadan Group (Saudi Arabia / Real Estate, Contracting, and Commercial Operations).

## Architecture & Technology Stack

```
mohamed_ramdan/
├── docs/
│   └── SRS.md               # Sole and final specification & requirements source of truth
├── apps/
│   ├── backend/             # PHP Laravel API (Multi-tenant, Sanctum, Audit, Maker-Checker, Accounting Engine)
│   └── frontend/            # Next.js (App Router, Tailwind CSS, Lucide Icons, RTL Arabic & English)
├── README.md
└── AGENTS.md
```

- **Backend**: PHP Laravel (v11/12), Laravel Sanctum (Stateful Bearer token auth), SQLite (Testing) / MySQL (Multi-tenant company data isolation).
- **Frontend**: Next.js (React 19), Tailwind CSS, Lucide Icons, RTL Arabic (primary) and LTR English.
- **Specification**: Complete implementation of all 70 Use Cases (UC-01 through UC-70 + UC-41A), CRUD Permission Matrix (Section 1.6), Maker-Checker workflows, Balanced Journal Entry Posting, and NFR-001 through NFR-010 from `docs/SRS.md`.

