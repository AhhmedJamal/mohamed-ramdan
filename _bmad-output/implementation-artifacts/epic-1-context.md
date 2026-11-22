# Epic 1 Context: Multi-Tenant Platform Foundation, Authentication & Security Governance

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Establish the core multi-tenant backend architecture and frontend foundation for the Mohamed Ramadan Group ERP. Every company entity operates inside a completely isolated MySQL database (`tenant_{uuid}_db`), while authentication, rate-limiting, and tenant routing are handled by central middleware. Users are authenticated and strictly routed to role-tailored dashboards (`/admin/dashboard`, `/company/dashboard`, `/accounting/dashboard`, `/data-entry/dashboard`), company freeze triggers immediate force-logout across all devices, and branch managers have self-contained employee management within their isolated perimeter.

## Stories

- Story 1.1: Multi-Tenant Database Connection & Dynamic Resolver
- Story 1.2: User Authentication, Brute-Force Rate Limiting & Role Redirection
- Story 1.3: Password Recovery & Reset via 24-Hour Single-Use Token
- Story 1.4: User Profile Management & Session Termination on Password Change
- Story 1.5: Super Admin Company Creation & Isolated DB Provisioning
- Story 1.6: Company List, Freeze/Activate & Immediate Session Eviction
- Story 1.7: Super Admin Consolidated Dashboard
- Story 1.8: Branch Manager Employee CRUD Management

## Requirements & Constraints

- **Multi-Tenant Isolation (NFR-001)**: 100% database isolation; no cross-tenant joins; central database manages companies, users, and roles.
- **Brute-Force Protection**: 5 consecutive failed login attempts trigger a 15-minute lockout.
- **Immediate Eviction on Freeze**: When Super Admin freezes a company, all active user tokens/sessions belonging to that company are immediately terminated; all subsequent requests return HTTP 403.
- **Role-Based Redirection**:
  - Super Admin $\rightarrow$ `/admin/dashboard`
  - Branch Manager $\rightarrow$ `/company/dashboard`
  - General Accountant $\rightarrow$ `/accounting/dashboard`
  - Data Entry $\rightarrow$ `/data-entry/dashboard`
- **Employee Roles**: Branch Manager can only create and manage General Accountant and Data Entry accounts within their company.
- **Consolidated Dashboard (Super Admin)**: Aggregates revenue, expenses, net profit, and entity statuses across all active companies.
- **Security & Localization**: Encrypted passwords (Bcrypt), HTTPS, Arabic RTL primary layout with English toggle (NFR-007, 008, 009).

## Technical Decisions

- **Architecture (AD-01, AD-02, AD-03)**:
  - Backend: PHP Laravel 11 REST API.
  - Frontend: React 18 SPA (React Router, Axios, Tailwind CSS, Lucide Icons, RTL support).
  - Database: MySQL 8 with `central` and dynamic `tenant` connection configuration.
  - Subdomain routing: `comp1.ehkam.com` resolved by `TenantResolverMiddleware` mapping to `companies.subdomain` and switching `DB::setDefaultConnection('tenant')`.
  - Session Epoch: Central `companies.session_epoch` incremented on freeze; checked by `CompanyStatusMiddleware` to reject revoked tokens immediately.

## UX & Interaction Patterns

- Directionality: Arabic RTL (`dir="rtl"`) as the primary document layout with Tajawal/Cairo typography; English LTR toggle.
- Authentication pages: Clean centered cards, password show/hide eye toggle, clear inline Arabic error messages.
- Dashboards: Role-tailored stats cards, data tables with pagination, confirmation modals for freeze/deactivate actions.

## Cross-Story Dependencies

- Story 1.1 is the foundational infrastructure prerequisite for Story 1.2 through 1.8 and all subsequent epics.
- Story 1.2 provides authenticated JWT tokens carrying `company_id` and role context for all subsequent stories.

