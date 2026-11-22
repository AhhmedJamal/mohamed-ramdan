<?php

namespace Tests\Feature;

use App\Models\Central\Company;
use App\Models\Central\User;
use App\Models\Tenant\CostCenter;
use App\Models\Tenant\Property;
use App\Models\Tenant\Tenant;
use App\Models\Tenant\Unit;
use App\Services\TenantManager;
use Database\Seeders\CentralSeeder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PropertyManagementTest extends TestCase
{
    protected Company $company;
    protected TenantManager $tenantManager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(CentralSeeder::class);
        $this->tenantManager = app(TenantManager::class);

        $this->company = Company::where('subdomain', 'comp1')->firstOrFail();
        $this->tenantManager->provisionTenantDatabase($this->company);

        // Clean properties, units, contracts
        $this->tenantManager->switchConnection($this->company);
        DB::connection('tenant')->table('rental_contracts')->delete();
        DB::connection('tenant')->table('units')->delete();
        DB::connection('tenant')->table('properties')->delete();
        $this->tenantManager->resetToCentral();
    }

    protected function tearDown(): void
    {
        $this->tenantManager->resetToCentral();
        parent::tearDown();
    }

    private function getDataEntryToken(): string
    {
        $res = $this->postJson('/api/auth/login', [
            'email' => 'dataentry@comp1.com',
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

    public function test_can_list_properties(): void
    {
        $token = $this->getDataEntryToken();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->getJson('/api/properties');

        $response->assertStatus(200)
            ->assertJsonStructure(['success', 'properties']);
    }

    public function test_add_property_auto_provisions_cost_center_and_vacant_units(): void
    {
        $token = $this->getDataEntryToken();
        $propName = 'برج الأمل السكني ' . uniqid();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/properties', [
            'name' => $propName,
            'address' => 'طريق الملك عبد العزيز، الرياض',
            'type' => 'residential',
            'units_count' => 4,
            'unit_type' => 'apartment',
            'default_area_sqm' => 140,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('property.name', $propName)
            ->assertJsonPath('property.units_count', 4)
            ->assertJsonPath('property.cost_center.name', $propName)
            ->assertJsonPath('property.cost_center.type', 'property');

        // Verify 4 units auto-created in vacant status
        $units = $response->json('property.units');
        $this->assertCount(4, $units);
        foreach ($units as $u) {
            $this->assertEquals('vacant', $u['status']);
            $this->assertEquals('apartment', $u['type']);
            $this->assertEquals('140.00', $u['area_sqm']);
        }
    }

    public function test_duplicate_property_name_is_rejected(): void
    {
        $token = $this->getDataEntryToken();
        $propName = 'عمارة الفردوس ' . uniqid();

        // First creation
        $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/properties', [
            'name' => $propName,
            'address' => 'حي الورود',
            'type' => 'commercial',
            'units_count' => 2,
            'unit_type' => 'office',
        ])->assertStatus(201);

        // Duplicate
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/properties', [
            'name' => $propName,
            'address' => 'حي آخر',
            'type' => 'commercial',
            'units_count' => 2,
            'unit_type' => 'office',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'اسم العقار مستخدم بالفعل');
    }

    public function test_units_count_less_than_one_is_rejected(): void
    {
        $token = $this->getDataEntryToken();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/properties', [
            'name' => 'عمارة الصفر ' . uniqid(),
            'address' => 'حي النخيل',
            'type' => 'residential',
            'units_count' => 0,
            'unit_type' => 'apartment',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.units_count.0', 'عدد الوحدات يجب أن لا يقل عن 1');
    }

    public function test_cannot_delete_property_with_active_rental_contracts(): void
    {
        $token = $this->getDataEntryToken();
        $propName = 'مجمع النشاط ' . uniqid();

        // Create property
        $propRes = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/properties', [
            'name' => $propName,
            'address' => 'حي المروج',
            'type' => 'residential',
            'units_count' => 2,
            'unit_type' => 'apartment',
        ]);
        $propId = $propRes->json('property.id');
        $unitId = $propRes->json('property.units.0.id');

        // Insert active rental contract in tenant DB
        $this->tenantManager->switchConnection($this->company);
        $tenantId = DB::connection('tenant')->table('tenants')->insertGetId([
            'name' => 'مستأجر تجريبي ' . uniqid(),
            'type' => 'individual',
            'national_id_or_cr' => '10' . rand(10000000, 99999999),
            'mobile' => '0501112233',
            'email' => 't_' . uniqid() . '@example.com',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::connection('tenant')->table('rental_contracts')->insert([
            'contract_number' => 'CNT-' . uniqid(),
            'tenant_id' => $tenantId,
            'property_id' => $propId,
            'unit_id' => $unitId,
            'contract_type' => 'company_to_tenant',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'duration_months' => 12,
            'total_rent' => 36000,
            'collection_cycle' => 'monthly',
            'first_payment' => 3000,
            'status' => 'active',
            'created_by' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->tenantManager->resetToCentral();

        // Attempt deletion
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->deleteJson("/api/properties/{$propId}");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'لا يمكن حذف العقار لوجود عقود نشطة');
    }

    public function test_can_delete_property_without_contracts(): void
    {
        $token = $this->getDataEntryToken();
        $propName = 'عمارة مؤقتة ' . uniqid();

        // Create property
        $propRes = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/properties', [
            'name' => $propName,
            'address' => 'حي السليمانية',
            'type' => 'mixed',
            'units_count' => 3,
            'unit_type' => 'shop',
        ]);
        $propId = $propRes->json('property.id');

        // Delete property
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->deleteJson("/api/properties/{$propId}");

        $response->assertStatus(200)
            ->assertJsonPath('message', 'تم حذف العقار ووحداته بنجاح');

        $this->tenantManager->switchConnection($this->company);
        $this->assertNull(Property::find($propId));
        $this->assertEquals(0, Unit::where('property_id', $propId)->count());
        $this->tenantManager->resetToCentral();
    }

    public function test_accountant_cannot_create_or_delete_property(): void
    {
        $token = $this->getAccountantToken();

        // Accountant can read (CRUD Matrix Section 1.6)
        $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->getJson('/api/properties')->assertStatus(200);

        // Accountant cannot create
        $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/properties', [
            'name' => 'عمارة ممنوعة',
            'address' => 'حي محظور',
            'type' => 'residential',
            'units_count' => 2,
            'unit_type' => 'apartment',
        ])->assertStatus(403);
    }
}

