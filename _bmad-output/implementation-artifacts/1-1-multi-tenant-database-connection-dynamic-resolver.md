---
title: "Story 1.1: Multi-Tenant Database Connection & Dynamic Resolver"
type: 'feature'
created: '2026-11-22'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - "docs/SRS-Mohamed-Ramdan.md"
  - "_bmad-output/planning-artifacts/architecture/architecture-mohamed_ramdan-2026-11-22/ARCHITECTURE-SPINE.md"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Mohamed Ramadan Group operates three distinct commercial entities that require 100% data isolation. Commingled database models risk data leakage, accounting contamination, and lack of true operational autonomy.

**Approach:** Implement a dynamic multi-tenant database connection manager and middleware in PHP Laravel 11. Central authentication and company registry reside in a central database (`central_db`), while each company entity operates on an isolated database (`tenant_{uuid}_db`), switched dynamically at runtime based on the request's subdomain or tenant identifier.

## Boundaries & Constraints

**Always:**
- Strict isolated database multi-tenancy: every tenant database query must target the active company database (`tenant` connection).
- The central connection (`central`) is exclusively reserved for global tables: `companies`, `users`, `company_user`, `notification_logs`.
- If an invalid or unresolvable tenant subdomain is supplied, abort immediately with HTTP 404/400.
- All code must support testing with dynamic SQLite databases (in testing/CI) and MySQL databases (in staging/production) with identical switching behavior.

**Never:**
- Never execute cross-database SQL `JOIN` queries between a tenant database and the central database.
- Never hardcode company credentials or bypass dynamic connection configuration.
- Never invent roles outside Super Admin, Branch Manager, General Accountant, and Data Entry.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| Valid Subdomain Request | HTTP request with `Host: comp1.ehkam.com` or header `X-Tenant-Subdomain: comp1` | Tenant resolved, `tenant` connection switched to `tenant_comp1_db`, `DB::getDefaultConnection() == 'tenant'` | N/A |
| Central/System Request | HTTP request to `/api/admin/*` or `/api/auth/*` without tenant | Operates on `central` connection (`companies`, `users`) | N/A |
| Unknown Subdomain | HTTP request with `X-Tenant-Subdomain: non_existent` | Aborts with HTTP 404 | Returns JSON `{"message": "الشركة غير موجودة في النظام"}` |
| Suspended/Frozen Tenant | Tenant has `status = 'frozen'` | Rejects connection with HTTP 403 | Returns JSON `{"message": "الشركة مجمدة، يرجى مراجعة الإدارة"}` |

</frozen-after-approval>

## Code Map

- `apps/backend/config/database.php` -- Central and dynamic tenant connection configurations
- `apps/backend/app/Services/TenantManager.php` -- Tenant discovery, dynamic connection builder, connection switcher, and tenant migration runner
- `apps/backend/app/Http/Middleware/TenantResolverMiddleware.php` -- Request interceptor to detect and switch tenant context
- `apps/backend/app/Models/Central/Company.php` -- Central company model with UUID, status, and DB name
- `apps/backend/app/Models/Central/User.php` -- Central user model with authentication and lockout logic
- `apps/backend/database/migrations/central/` -- Central database schema migrations (companies, users, company_user, notification_logs)
- `apps/backend/database/migrations/tenant/` -- Tenant database schema migrations template (accounts, cost_centers, fiscal_years, properties, units, tenants, contracts, vouchers, ledgers)
- `apps/backend/app/Console/Commands/TenantMigrateCommand.php` -- Artisan command to run tenant migrations across one or all tenants
- `apps/frontend/src/services/api.js` -- Axios client configured with tenant subdomain header injection
- `apps/frontend/src/context/TenantContext.jsx` -- Next.js client context managing current tenant subdomain and state
- `apps/backend/tests/Feature/TenantConnectionTest.php` -- Feature tests verifying tenant resolution, connection isolation, and cross-tenant separation

## Tasks & Acceptance

**Execution:**
- [x] Initialize backend Laravel service structure with `central` and dynamic `tenant` database connections.
- [x] Create `Company` and `User` central models and central database migrations.
- [x] Create `TenantManager` service to configure and switch database connections at runtime.
- [x] Create `TenantResolverMiddleware` supporting subdomain detection and header fallback.
- [x] Implement tenant migrations schema and `tenant:migrate` Artisan console command.
- [x] Create base React frontend API service and `TenantContext` supporting multi-tenant subdomain resolution.
- [x] Write and verify comprehensive automated tests (`TenantConnectionTest.php`) ensuring 100% data isolation.

**Acceptance Criteria:**
- Given a registered active company in the central database, when an API request carries its subdomain, then the application switches the default database connection to that company's isolated database.
- Given an invalid or unregistered company subdomain, when an API request is received, then the system returns HTTP 404 with Arabic error message *"الشركة غير موجودة في النظام"*.
- Given data created in Company A's database, when querying from Company B's tenant context, then Company A's data is completely invisible.

## Implementation Notes

- Initialized Story 1.1 with clean separation between central master store and tenant operational stores.
- Implemented `TenantManager` with support for both SQLite (for automated zero-dependency testing) and MySQL (production).
- Configured React frontend API client with automatic subdomain extraction and header injection.
