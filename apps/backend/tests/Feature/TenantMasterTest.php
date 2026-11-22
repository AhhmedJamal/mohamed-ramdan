<?php

namespace Tests\Feature;

use App\Models\Central\Company;
use App\Models\Central\User;
use App\Models\Tenant\CostCenter;
use App\Models\Tenant\Property;
use App\Models\Tenant\RentalContract;
use App\Models\Tenant\Tenant;
use App\Models\Tenant\Unit;
use App\Services\TenantManager;
use Database\Seeders\CentralSeeder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TenantMasterTest extends TestCase
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

        // Clean tables
        $this->tenantManager->switchConnection($this->company);
        DB::connection('tenant')->table('rental_contracts')->delete();
        DB::connection('tenant')->table('tenants')->delete();
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
        $user = User::where('email', 'dataentry@comp1.com')->firstOrFail();
        return $user->createToken('test_token')->plainTextToken;
    }

    private function getAccountantToken(): string
    {
        $user = User::where('email', 'accountant@comp1.com')->firstOrFail();
        return $user->createToken('test_token')->plainTextToken;
    }

    public function test_data_entry_can_create_individual_and_company_tenants(): void
    {
        $this->app['auth']->forgetGuards();
        $token = $this->getDataEntryToken();

        // 1. Create individual tenant
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/tenants', [
            'name' => 'سعد بن عبد الله القحطاني',
            'type' => 'individual',
            'national_id_or_cr' => '1088776655',
            'mobile' => '0501234567',
            'email' => 'saad@example.com',
            'address' => 'الرياض - حي الملز',
            'notes' => 'مستأجر شقة سكنية',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.name', 'سعد بن عبد الله القحطاني');
        $response->assertJsonPath('data.type_label', 'فرد');

        $this->tenantManager->switchConnection($this->company);
        $this->assertDatabaseHas('tenants', [
            'national_id_or_cr' => '1088776655',
            'mobile' => '0501234567',
        ], 'tenant');
        $this->tenantManager->resetToCentral();

        // 2. Create company tenant
        $this->app['auth']->forgetGuards();
        $response2 = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/tenants', [
            'name' => 'شركة الأفق للاستشارات التقنية',
            'type' => 'company',
            'national_id_or_cr' => '7011223344',
            'mobile' => '0559876543',
            'email' => 'info@ofok-tech.com',
            'address' => 'جدة - طريق الملك',
            'notes' => 'مستأجر مكاتب تجارية',
        ]);

        $response2->assertStatus(201);
        $response2->assertJsonPath('data.type_label', 'شركة');

        $this->tenantManager->switchConnection($this->company);
        $this->assertDatabaseHas('tenants', [
            'national_id_or_cr' => '7011223344',
        ], 'tenant');
        $this->tenantManager->resetToCentral();
    }

    public function test_validates_duplicate_national_id_or_cr(): void
    {
        $this->tenantManager->switchConnection($this->company);
        Tenant::create([
            'name' => 'مستأجر أول',
            'type' => 'individual',
            'national_id_or_cr' => '1099887766',
            'mobile' => '0501112233',
            'email' => 'first@example.com',
        ]);
        $this->tenantManager->resetToCentral();

        $this->app['auth']->forgetGuards();
        $token = $this->getDataEntryToken();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/tenants', [
            'name' => 'مستأجر ثاني بنفس الهوية',
            'type' => 'individual',
            'national_id_or_cr' => '1099887766',
            'mobile' => '0504445566',
            'email' => 'second@example.com',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'رقم الهوية مستخدم بالفعل');
    }

    public function test_validates_saudi_mobile_number_format(): void
    {
        $this->app['auth']->forgetGuards();
        $token = $this->getDataEntryToken();

        // Invalid: does not start with 05
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/tenants', [
            'name' => 'خالد بن سلطان',
            'type' => 'individual',
            'national_id_or_cr' => '1022334455',
            'mobile' => '0612345678', // starts with 06
            'email' => 'khaled@example.com',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'يرجى إدخال رقم جوال صحيح يبدأ بـ 05 ويتكون من 10 أرقام');

        // Invalid: 9 digits only
        $this->app['auth']->forgetGuards();
        $response2 = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/tenants', [
            'name' => 'خالد بن سلطان',
            'type' => 'individual',
            'national_id_or_cr' => '1022334455',
            'mobile' => '050123456', // 9 digits
            'email' => 'khaled@example.com',
        ]);

        $response2->assertStatus(422);
        $response2->assertJsonPath('message', 'يرجى إدخال رقم جوال صحيح يبدأ بـ 05 ويتكون من 10 أرقام');
    }

    public function test_accountant_cannot_create_tenant_due_to_rbac(): void
    {
        $this->app['auth']->forgetGuards();
        $token = $this->getAccountantToken();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/tenants', [
            'name' => 'تجربة غير مصرح بها',
            'type' => 'individual',
            'national_id_or_cr' => '1099001122',
            'mobile' => '0509988776',
            'email' => 'unauth@example.com',
        ]);

        $response->assertStatus(403);
    }

    public function test_blocks_altering_national_id_if_contracts_exist(): void
    {
        $this->tenantManager->switchConnection($this->company);

        $costCenter = CostCenter::firstOrCreate(
            ['code' => 'CC-PROP-TEST'],
            ['name' => 'مركز عقار التجربة', 'type' => 'property', 'status' => 'active']
        );

        $property = Property::create([
            'name' => 'عمارة التجربة العقارية',
            'address' => 'الرياض',
            'type' => 'residential',
            'units_count' => 1,
            'cost_center_id' => $costCenter->id,
        ]);

        $unit = Unit::create([
            'property_id' => $property->id,
            'unit_number' => '101',
            'type' => 'apartment',
            'status' => 'occupied',
        ]);

        $tenant = Tenant::create([
            'name' => 'سالم الدوسري',
            'type' => 'individual',
            'national_id_or_cr' => '1011223344',
            'mobile' => '0505554433',
            'email' => 'salem@example.com',
        ]);

        $dataEntryUser = User::where('email', 'dataentry@comp1.com')->firstOrFail();

        RentalContract::create([
            'contract_number' => 'CNT-2026-TEST-001',
            'tenant_id' => $tenant->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'contract_type' => 'company_to_tenant',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'duration_months' => 12,
            'total_rent' => 60000.00,
            'collection_cycle' => 'quarterly',
            'status' => 'active',
            'created_by' => $dataEntryUser->id,
        ]);

        $this->tenantManager->resetToCentral();

        $this->app['auth']->forgetGuards();
        $token = $this->getDataEntryToken();

        // Attempt to change national_id_or_cr
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'X-Tenant-Subdomain' => 'comp1',
        ])->putJson("/api/tenants/{$tenant->id}", [
            'national_id_or_cr' => '1099999999',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'لا يمكن تغيير رقم الهوية لوجود عقود مرتبطة');

        // But changing name or mobile is permitted
        $this->app['auth']->forgetGuards();
        $response2 = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'X-Tenant-Subdomain' => 'comp1',
        ])->putJson("/api/tenants/{$tenant->id}", [
            'name' => 'سالم محمد الدوسري',
            'mobile' => '0509998887',
        ]);

        $response2->assertStatus(200);
        $response2->assertJsonPath('data.name', 'سالم محمد الدوسري');
    }

    public function test_blocks_deleting_tenant_with_existing_contracts(): void
    {
        $this->tenantManager->switchConnection($this->company);

        $costCenter = CostCenter::firstOrCreate(
            ['code' => 'CC-PROP-TEST-2'],
            ['name' => 'مركز عقار التجربة 2', 'type' => 'property', 'status' => 'active']
        );

        $property = Property::create([
            'name' => 'برج النخيل 2',
            'address' => 'جدة',
            'type' => 'commercial',
            'units_count' => 1,
            'cost_center_id' => $costCenter->id,
        ]);

        $unit = Unit::create([
            'property_id' => $property->id,
            'unit_number' => 'OFF-01',
            'type' => 'office',
            'status' => 'occupied',
        ]);

        $tenant = Tenant::create([
            'name' => 'مؤسسة التجارة العالمية',
            'type' => 'company',
            'national_id_or_cr' => '7001122334',
            'mobile' => '0551122334',
            'email' => 'corp@example.com',
        ]);

        $dataEntryUser = User::where('email', 'dataentry@comp1.com')->firstOrFail();

        RentalContract::create([
            'contract_number' => 'CNT-2026-CORP-001',
            'tenant_id' => $tenant->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'contract_type' => 'company_to_tenant',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'duration_months' => 12,
            'total_rent' => 120000.00,
            'collection_cycle' => 'monthly',
            'status' => 'active',
            'created_by' => $dataEntryUser->id,
        ]);

        $this->tenantManager->resetToCentral();

        $this->app['auth']->forgetGuards();
        $token = $this->getDataEntryToken();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'X-Tenant-Subdomain' => 'comp1',
        ])->deleteJson("/api/tenants/{$tenant->id}");

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'لا يمكن حذف المستأجر لوجود عقود إيجار مرتبطة به');
    }

    public function test_can_delete_tenant_without_contracts(): void
    {
        $this->tenantManager->switchConnection($this->company);

        $tenant = Tenant::create([
            'name' => 'مستأجر مسجل بدون عقد',
            'type' => 'individual',
            'national_id_or_cr' => '1044556677',
            'mobile' => '0503332211',
            'email' => 'unused@example.com',
        ]);

        $this->tenantManager->resetToCentral();

        $this->app['auth']->forgetGuards();
        $token = $this->getDataEntryToken();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'X-Tenant-Subdomain' => 'comp1',
        ])->deleteJson("/api/tenants/{$tenant->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('message', 'تم حذف المستأجر بنجاح');

        $this->tenantManager->switchConnection($this->company);
        $this->assertDatabaseMissing('tenants', [
            'id' => $tenant->id,
        ], 'tenant');
        $this->tenantManager->resetToCentral();
    }
}
