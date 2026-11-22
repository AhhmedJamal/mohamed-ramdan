<?php

namespace Tests\Feature;

use App\Models\Central\Company;
use App\Services\TenantManager;
use Database\Seeders\CentralSeeder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TenantConnectionTest extends TestCase
{
    protected TenantManager $tenantManager;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed sample companies and super admin
        $this->seed(CentralSeeder::class);

        $this->tenantManager = app(TenantManager::class);

        // Migrate tenant schema for comp1, comp2, comp3
        foreach (Company::all() as $company) {
            $this->tenantManager->migrateTenant($company);
        }
    }

    public function test_health_check_endpoint(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'healthy',
                'system' => 'Mohamed Ramadan Group ERP',
                'version' => '1.0',
            ]);
    }

    public function test_resolves_tenant_via_header_and_switches_connection(): void
    {
        $response = $this->withHeaders([
            'X-Tenant-Subdomain' => 'comp1',
        ])->getJson('/api/tenant/info');

        $response->assertStatus(200)
            ->assertJson([
                'is_tenant' => true,
                'company' => [
                    'subdomain' => 'comp1',
                    'name' => 'مجموعة رمضان للاستثمار العقاري',
                    'status' => 'active',
                ],
                'connection' => 'tenant',
            ]);
    }

    public function test_returns_404_for_unregistered_tenant_subdomain(): void
    {
        $response = $this->withHeaders([
            'X-Tenant-Subdomain' => 'unknown_subdomain',
        ])->getJson('/api/tenant/info');

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'الشركة غير موجودة في النظام',
            ]);
    }

    public function test_returns_403_for_frozen_tenant(): void
    {
        // Temporarily freeze comp3
        $company = Company::where('subdomain', 'comp3')->first();
        $company->update(['status' => 'frozen']);

        $response = $this->withHeaders([
            'X-Tenant-Subdomain' => 'comp3',
        ])->getJson('/api/tenant/info');

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'الشركة مجمدة، يرجى مراجعة الإدارة',
            ]);

        // Restore active status
        $company->update(['status' => 'active']);
    }

    public function test_strict_tenant_data_isolation(): void
    {
        $comp1 = Company::where('subdomain', 'comp1')->first();
        $comp2 = Company::where('subdomain', 'comp2')->first();

        $uniq = uniqid();
        $propName = 'برج اليمامة السكني ' . $uniq;
        $ccCode = 'CC-PROP-' . $uniq;
        $ccName = 'مركز برج اليمامة ' . $uniq;

        // 1. Switch to comp1 and insert a property
        $this->tenantManager->switchConnection($comp1);

        $costCenterId = DB::connection('tenant')->table('cost_centers')->insertGetId([
            'code' => $ccCode,
            'name' => $ccName,
            'type' => 'property',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::connection('tenant')->table('properties')->insert([
            'name' => $propName,
            'address' => 'طريق الملك عبد العزيز، الرياض',
            'type' => 'residential',
            'units_count' => 12,
            'cost_center_id' => $costCenterId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $comp1Count = DB::connection('tenant')->table('properties')
            ->where('name', $propName)
            ->count();
        $this->assertEquals(1, $comp1Count);

        // 2. Switch to comp2 and verify this property does NOT exist
        $this->tenantManager->switchConnection($comp2);

        $comp2Count = DB::connection('tenant')->table('properties')
            ->where('name', $propName)
            ->count();
        $this->assertEquals(0, $comp2Count, 'Data from Company 1 leaked into Company 2!');

        // 3. Switch back to central and verify isolation remains intact
        $this->tenantManager->resetToCentral();
        $this->assertEquals('central', DB::getDefaultConnection());
    }
}
