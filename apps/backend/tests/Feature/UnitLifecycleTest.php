<?php

namespace Tests\Feature;

use App\Models\Central\Company;
use App\Models\Central\User;
use App\Models\Tenant\Property;
use App\Models\Tenant\Unit;
use App\Services\TenantManager;
use Database\Seeders\CentralSeeder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class UnitLifecycleTest extends TestCase
{
    protected Company $company;
    protected TenantManager $tenantManager;
    protected Property $property;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(CentralSeeder::class);
        $this->tenantManager = app(TenantManager::class);

        $this->company = Company::where('subdomain', 'comp1')->firstOrFail();
        $this->tenantManager->provisionTenantDatabase($this->company);

        // Clean tables
        $this->tenantManager->switchConnection($this->company);
        DB::connection('tenant')->table('rental_contracts')->delete();
        DB::connection('tenant')->table('units')->delete();
        DB::connection('tenant')->table('properties')->delete();

        // Seed one test property
        $ccId = DB::connection('tenant')->table('cost_centers')->insertGetId([
            'code' => 'CC-PROP-' . uniqid(),
            'name' => 'برج النخيل ' . uniqid(),
            'type' => 'property',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->property = Property::create([
            'name' => 'برج النخيل ' . uniqid(),
            'address' => 'حي الصحافة',
            'type' => 'residential',
            'units_count' => 2,
            'cost_center_id' => $ccId,
        ]);

        Unit::create(['property_id' => $this->property->id, 'unit_number' => '101', 'type' => 'apartment', 'status' => 'vacant']);
        Unit::create(['property_id' => $this->property->id, 'unit_number' => '102', 'type' => 'apartment', 'status' => 'vacant']);
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

    public function test_can_list_units_of_property(): void
    {
        $token = $this->getDataEntryToken();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->getJson("/api/properties/{$this->property->id}/units");

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
        $this->assertCount(2, $response->json('units'));
    }

    public function test_can_add_unit_to_property(): void
    {
        $token = $this->getDataEntryToken();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/properties/{$this->property->id}/units", [
            'unit_number' => '103',
            'type' => 'apartment',
            'area_sqm' => 125,
            'status' => 'vacant',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('unit.unit_number', '103')
            ->assertJsonPath('unit.status', 'vacant');

        $this->tenantManager->switchConnection($this->company);
        $this->assertEquals(3, $this->property->fresh()->units_count);
        $this->tenantManager->resetToCentral();
    }

    public function test_duplicate_unit_number_in_same_property_is_rejected(): void
    {
        $token = $this->getDataEntryToken();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/properties/{$this->property->id}/units", [
            'unit_number' => '101', // Already exists in setUp
            'type' => 'apartment',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'رقم الوحدة مكرر في نفس العقار');
    }

    public function test_cannot_set_unit_to_vacant_if_active_contract_exists(): void
    {
        $token = $this->getDataEntryToken();

        $this->tenantManager->switchConnection($this->company);
        $unit = Unit::where('property_id', $this->property->id)->first();
        $unit->status = 'occupied';
        $unit->save();

        // Create tenant and active contract
        $tId = DB::connection('tenant')->table('tenants')->insertGetId([
            'name' => 'مستأجر نشط ' . uniqid(),
            'type' => 'individual',
            'national_id_or_cr' => '10' . rand(10000000, 99999999),
            'mobile' => '0502223344',
            'email' => 't_' . uniqid() . '@example.com',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::connection('tenant')->table('rental_contracts')->insert([
            'contract_number' => 'CNT-' . uniqid(),
            'tenant_id' => $tId,
            'property_id' => $this->property->id,
            'unit_id' => $unit->id,
            'contract_type' => 'company_to_tenant',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'duration_months' => 12,
            'total_rent' => 40000,
            'collection_cycle' => 'monthly',
            'status' => 'active',
            'created_by' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->tenantManager->resetToCentral();

        // Attempt updating status to vacant
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->putJson("/api/properties/{$this->property->id}/units/{$unit->id}", [
            'unit_number' => $unit->unit_number,
            'type' => $unit->type,
            'status' => 'vacant',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'لا يمكن تغيير حالة الوحدة إلى شاغرة لوجود عقد إيجار نشط');
    }

    public function test_cannot_delete_unit_with_active_contract(): void
    {
        $token = $this->getDataEntryToken();

        $this->tenantManager->switchConnection($this->company);
        $unit = Unit::where('property_id', $this->property->id)->first();
        $unit->status = 'occupied';
        $unit->save();

        $tId = DB::connection('tenant')->table('tenants')->insertGetId([
            'name' => 'مستأجر نشط ' . uniqid(),
            'type' => 'individual',
            'national_id_or_cr' => '10' . rand(10000000, 99999999),
            'mobile' => '0502223344',
            'email' => 't_' . uniqid() . '@example.com',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::connection('tenant')->table('rental_contracts')->insert([
            'contract_number' => 'CNT-' . uniqid(),
            'tenant_id' => $tId,
            'property_id' => $this->property->id,
            'unit_id' => $unit->id,
            'contract_type' => 'company_to_tenant',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'duration_months' => 12,
            'total_rent' => 40000,
            'collection_cycle' => 'monthly',
            'status' => 'active',
            'created_by' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->tenantManager->resetToCentral();

        // Attempt delete
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->deleteJson("/api/properties/{$this->property->id}/units/{$unit->id}");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'لا يمكن حذف وحدة لها عقد إيجار نشط');
    }

    public function test_can_delete_vacant_unit_without_contracts(): void
    {
        $token = $this->getDataEntryToken();

        $this->tenantManager->switchConnection($this->company);
        $unit = Unit::where('property_id', $this->property->id)->where('unit_number', '102')->first();
        $this->tenantManager->resetToCentral();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->deleteJson("/api/properties/{$this->property->id}/units/{$unit->id}");

        $response->assertStatus(200)
            ->assertJsonPath('message', 'تم حذف الوحدة بنجاح');

        $this->tenantManager->switchConnection($this->company);
        $this->assertNull(Unit::find($unit->id));
        $this->assertEquals(1, $this->property->fresh()->units_count);
        $this->tenantManager->resetToCentral();
    }

    public function test_accountant_cannot_create_or_delete_unit(): void
    {
        $token = $this->getAccountantToken();

        // Accountant can read
        $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->getJson("/api/properties/{$this->property->id}/units")->assertStatus(200);

        // Accountant cannot create
        $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/properties/{$this->property->id}/units", [
            'unit_number' => '999',
            'type' => 'apartment',
        ])->assertStatus(403);
    }
}

