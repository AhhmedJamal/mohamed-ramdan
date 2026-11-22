<?php

namespace Tests\Feature;

use App\Models\Central\Company;
use App\Services\TenantManager;
use Database\Seeders\CentralSeeder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminDashboardMetricsTest extends TestCase
{
    protected TenantManager $tenantManager;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CentralSeeder::class);
        $this->tenantManager = app(TenantManager::class);

        // Clear existing vouchers and journal entries in all tenant DBs for clean test state
        $companies = Company::all();
        foreach ($companies as $comp) {
            $this->tenantManager->provisionTenantDatabase($comp);
            $this->tenantManager->switchConnection($comp);
            DB::connection('tenant')->statement('PRAGMA foreign_keys = OFF;');
            DB::connection('tenant')->table('journal_entry_items')->delete();
            DB::connection('tenant')->table('journal_entries')->delete();
            DB::connection('tenant')->table('vouchers')->delete();
            DB::connection('tenant')->statement('PRAGMA foreign_keys = ON;');
        }
        $this->tenantManager->resetToCentral();
    }

    private function getSuperAdminToken(): string
    {
        $res = $this->postJson('/api/auth/login', [
            'email' => 'admin@mohamedramdan.com',
            'password' => 'Password@123',
        ]);
        return $res->json('data.token');
    }

    private function getAccountantToken(): string
    {
        $res = $this->postJson('/api/auth/login', [
            'email' => 'accountant@comp1.com',
            'password' => 'Password@123',
        ]);
        return $res->json('data.token');
    }

    public function test_non_super_admin_forbidden(): void
    {
        $accountantToken = $this->getAccountantToken();

        $response = $this->withHeader('Authorization', 'Bearer ' . $accountantToken)
            ->getJson('/api/admin/dashboard/metrics');

        $response->assertStatus(403)
            ->assertJsonPath('message', 'غير مصرح لك بتنفيذ هذا الإجراء');
    }

    private function insertTestVouchers(): void
    {
        $comp1 = Company::where('subdomain', 'comp1')->first();
        $comp2 = Company::where('subdomain', 'comp2')->first();

        // 1. Insert vouchers into Company 1
        $this->tenantManager->switchConnection($comp1);
        $cc1 = DB::connection('tenant')->table('cost_centers')->insertGetId([
            'code' => 'CC-DASH-' . uniqid(),
            'name' => 'مركز برج اليمامة ' . uniqid(),
            'type' => 'property',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $ensureAccount = function ($code, $name, $root, $nature) {
            $id = DB::connection('tenant')->table('accounts')->where('code', $code)->value('id');
            if ($id) return $id;
            return DB::connection('tenant')->table('accounts')->insertGetId([
                'code' => $code,
                'name' => $name,
                'root_type' => $root,
                'nature' => $nature,
                'account_type' => 'root',
                'is_fixed_root' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        };

        $accCash = $ensureAccount('1000', 'الأصول', 'assets', 'debit');
        $accRev = $ensureAccount('5000', 'المصروفات', 'expenses', 'debit');
        $accExp = $ensureAccount('4000', 'الإيرادات', 'revenues', 'credit');

        DB::connection('tenant')->table('vouchers')->insert([
            'voucher_number' => 'V-REC-' . uniqid(),
            'type' => 'receipt',
            'amount' => 100000.0000,
            'date' => '2026-11-01',
            'cost_center_id' => $cc1,
            'debit_account_id' => $accCash,
            'credit_account_id' => $accRev,
            'payment_method' => 'bank_transfer',
            'status' => 'approved',
            'created_by' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::connection('tenant')->table('vouchers')->insert([
            'voucher_number' => 'V-PAY-' . uniqid(),
            'type' => 'disbursement',
            'amount' => 30000.0000,
            'date' => '2026-11-05',
            'cost_center_id' => $cc1,
            'debit_account_id' => $accExp,
            'credit_account_id' => $accCash,
            'payment_method' => 'cash',
            'status' => 'approved',
            'created_by' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Insert vouchers into Company 2
        $this->tenantManager->switchConnection($comp2);
        $cc2 = DB::connection('tenant')->table('cost_centers')->insertGetId([
            'code' => 'CC-DASH-2-' . uniqid(),
            'name' => 'مركز مشروع الجسر ' . uniqid(),
            'type' => 'contracting_project',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $acc2Cash = $ensureAccount('1000', 'الأصول', 'assets', 'debit');
        $acc2Rev = $ensureAccount('5000', 'المصروفات', 'expenses', 'debit');

        DB::connection('tenant')->table('vouchers')->insert([
            'voucher_number' => 'V-REC-2-' . uniqid(),
            'type' => 'receipt',
            'amount' => 50000.0000,
            'date' => '2026-11-10',
            'cost_center_id' => $cc2,
            'debit_account_id' => $acc2Cash,
            'credit_account_id' => $acc2Rev,
            'payment_method' => 'bank_transfer',
            'status' => 'approved',
            'created_by' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->tenantManager->resetToCentral();
    }

    public function test_consolidated_metrics_aggregation_across_active_companies(): void
    {
        $this->insertTestVouchers();
        $adminToken = $this->getSuperAdminToken();

        // Query Dashboard Metrics
        $response = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->getJson('/api/admin/dashboard/metrics');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $metrics = $response->json('data.metrics');
        $this->assertEquals(150000.0, $metrics['total_revenue']);
        $this->assertEquals(30000.0, $metrics['total_expenses']);
        $this->assertEquals(120000.0, $metrics['net_profit']); // 150000 - 30000 = 120000
        $this->assertEquals(3, $metrics['active_companies_count']);
        $this->assertEquals(0, $metrics['frozen_companies_count']);
    }

    public function test_frozen_company_data_excluded_from_metrics(): void
    {
        $this->insertTestVouchers();
        $adminToken = $this->getSuperAdminToken();
        $comp2 = Company::where('subdomain', 'comp2')->first();

        // Freeze Company 2
        $comp2->update(['status' => 'frozen']);

        $response = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->getJson('/api/admin/dashboard/metrics');

        $response->assertStatus(200);
        $metrics = $response->json('data.metrics');

        // Only Company 1's revenue (100,000) should be included, Company 2 (50,000) excluded
        $this->assertEquals(100000.0, $metrics['total_revenue']);
        $this->assertEquals(2, $metrics['active_companies_count']);
        $this->assertEquals(1, $metrics['frozen_companies_count']);

        // Restore
        $comp2->update(['status' => 'active']);
    }

    public function test_date_range_filtering(): void
    {
        $this->insertTestVouchers();
        $adminToken = $this->getSuperAdminToken();

        // Query date range that only covers Comp1 receipt (2026-11-01) and payment (2026-11-05), excludes Comp2 (2026-11-10)
        $response = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->getJson('/api/admin/dashboard/metrics?start_date=2026-11-01&end_date=2026-11-06');

        $response->assertStatus(200);
        $metrics = $response->json('data.metrics');

        $this->assertEquals(100000.0, $metrics['total_revenue']);
        $this->assertEquals(30000.0, $metrics['total_expenses']);
        $this->assertEquals(70000.0, $metrics['net_profit']);
    }
}
