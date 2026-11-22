<?php

namespace App\Console\Commands;

use App\Models\Central\Company;
use App\Services\TenantManager;
use Illuminate\Console\Command;

class TenantMigrateCommand extends Command
{
    protected $signature = 'tenant:migrate {--company= : The ID or subdomain of the company}';
    protected $description = 'Execute database migrations on tenant databases';

    public function handle(TenantManager $tenantManager): int
    {
        $companyIdentifier = $this->option('company');

        if ($companyIdentifier) {
            $company = is_numeric($companyIdentifier)
                ? $tenantManager->resolveById((int)$companyIdentifier)
                : $tenantManager->resolveBySubdomain($companyIdentifier);

            if (!$company) {
                $this->error("Company not found for identifier: {$companyIdentifier}");
                return self::FAILURE;
            }

            $this->migrateCompany($tenantManager, $company);
            return self::SUCCESS;
        }

        $companies = Company::where('status', 'active')->get();

        if ($companies->isEmpty()) {
            $this->info("No active companies found to migrate.");
            return self::SUCCESS;
        }

        foreach ($companies as $company) {
            $this->migrateCompany($tenantManager, $company);
        }

        $this->info("All active tenant databases migrated successfully.");
        return self::SUCCESS;
    }

    protected function migrateCompany(TenantManager $tenantManager, Company $company): void
    {
        $this->info("Migrating tenant database for company: {$company->name} ({$company->subdomain})...");
        $result = $tenantManager->migrateTenant($company);

        if ($result === 0) {
            $this->info("Successfully migrated: {$company->name}");
        } else {
            $this->warn("Migration finished with code {$result} for: {$company->name}");
        }
    }
}

