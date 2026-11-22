<?php

namespace App\Console\Commands;

use App\Models\Central\Company;
use App\Services\TenantManager;
use Database\Seeders\TenantSeeder;
use Illuminate\Console\Command;

class TenantSeedCommand extends Command
{
    protected $signature = 'tenant:seed {--company= : The ID or subdomain of the company}';
    protected $description = 'Seed tenant databases with fixed root COA accounts';

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

            $this->seedCompany($tenantManager, $company);
            return self::SUCCESS;
        }

        $companies = Company::where('status', 'active')->get();

        foreach ($companies as $company) {
            $this->seedCompany($tenantManager, $company);
        }

        $this->info("All active tenant databases seeded with fixed root COA accounts.");
        return self::SUCCESS;
    }

    protected function seedCompany(TenantManager $tenantManager, Company $company): void
    {
        $this->info("Seeding tenant database for company: {$company->name} ({$company->subdomain})...");
        $tenantManager->switchConnection($company);

        $seeder = new TenantSeeder();
        $seeder->run();

        $this->info("Successfully seeded COA root accounts for: {$company->name}");
    }
}

