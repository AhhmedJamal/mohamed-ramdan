<?php

namespace App\Services;

use App\Models\Central\Company;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class TenantManager
{
    protected ?Company $currentCompany = null;

    /**
     * Resolve company by subdomain
     */
    public function resolveBySubdomain(?string $subdomain): ?Company
    {
        if (empty($subdomain)) {
            return null;
        }

        return Company::where('subdomain', strtolower(trim($subdomain)))->first();
    }

    /**
     * Resolve company by ID
     */
    public function resolveById(int $id): ?Company
    {
        return Company::find($id);
    }

    /**
     * Dynamically switch active connection to tenant database
     */
    public function switchConnection(Company $company): void
    {
        $this->currentCompany = $company;
        $driver = Config::get('database.connections.tenant.driver', 'mysql');

        if ($driver === 'sqlite') {
            $prefix = app()->environment('testing') ? 'test_' : '';
            $dbPath = database_path("{$prefix}tenant_{$company->subdomain}.sqlite");
            if (!File::exists($dbPath) || filesize($dbPath) < 1000) {
                if (File::exists(database_path('tenant.sqlite'))) {
                    File::copy(database_path('tenant.sqlite'), $dbPath);
                } else {
                    File::put($dbPath, '');
                }
            }
            Config::set('database.connections.tenant.database', $dbPath);
        } else {
            $this->ensureTenantDatabaseExists($company);
            Config::set('database.connections.tenant.database', $company->db_name);
        }

        DB::purge('tenant');
        DB::reconnect('tenant');
        DB::setDefaultConnection('tenant');
    }

    /**
     * Ensure MySQL tenant database exists before connecting or migrating
     */
    public function ensureTenantDatabaseExists(Company $company): void
    {
        $driver = Config::get('database.connections.tenant.driver', 'mysql');
        if ($driver === 'mysql') {
            try {
                DB::connection('central')->statement("CREATE DATABASE IF NOT EXISTS `{$company->db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
            } catch (\Throwable $e) {
                // Ignore if central is not MySQL or insufficient privileges
            }
        }
    }

    /**
     * Reset default connection back to central
     */
    public function resetToCentral(): void
    {
        $this->currentCompany = null;
        DB::purge('tenant');
        DB::setDefaultConnection('central');
    }

    /**
     * Get currently active company
     */
    public function getCurrentCompany(): ?Company
    {
        return $this->currentCompany;
    }

    /**
     * Execute tenant migrations for a given company
     */
    public function migrateTenant(Company $company): int
    {
        $this->switchConnection($company);

        if (app()->bound('migrator')) {
            app('migrator')->setConnection('tenant');
        }

        return Artisan::call('migrate', [
            '--database' => 'tenant',
            '--path' => database_path('migrations/tenant'),
            '--realpath' => true,
            '--force' => true,
        ]);
    }

    /**
     * Fully provision a tenant database: switch connection, run migrations, and seed root COA accounts
     */
    public function provisionTenantDatabase(Company $company): void
    {
        $this->switchConnection($company);

        if (app()->bound('migrator')) {
            app('migrator')->setConnection('tenant');
        }

        Artisan::call('migrate', [
            '--database' => 'tenant',
            '--path' => database_path('migrations/tenant'),
            '--realpath' => true,
            '--force' => true,
        ]);

        $seeder = new \Database\Seeders\TenantSeeder();
        $seeder->run();

        $this->resetToCentral();
    }
}
