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
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RentalContractTest extends TestCase
{
    protected Company $company;
    protected TenantManager $tenantManager;
    protected Property $property;
    protected Unit $unit;
    protected Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(CentralSeeder::class);
        $this->tenantManager = app(TenantManager::class);

        $this->company = Company::where('subdomain', 'comp1')->firstOrFail();
        $this->tenantManager->provisionTenantDatabase($this->company);

        // Run migrations on tenant to ensure attachments table exists
        $this->tenantManager->switchConnection($this->company);
        DB::connection('tenant')->statement('PRAGMA foreign_keys = OFF;');
        DB::connection('tenant')->table('contract_attachments')->delete();
        DB::connection('tenant')->table('installments')->delete();
        DB::connection('tenant')->table('rental_contracts')->delete();
        DB::connection('tenant')->table('tenants')->delete();
        DB::connection('tenant')->table('units')->delete();
        DB::connection('tenant')->table('properties')->delete();
        DB::connection('tenant')->table('cost_centers')->delete();
        DB::connection('tenant')->statement('PRAGMA foreign_keys = ON;');

        // Seed basic property and unit
        $cc = CostCenter::create([
            'code' => 'CC-PROP-RC-01',
            'name' => 'مركز عمارة الياسمين',
            'type' => 'property',
            'status' => 'active',
        ]);

        $this->property = Property::create([
            'name' => 'عمارة الياسمين السكنية',
            'address' => 'الرياض - حي النرجس',
            'type' => 'residential',
            'units_count' => 2,
            'cost_center_id' => $cc->id,
        ]);

        $this->unit = Unit::create([
            'property_id' => $this->property->id,
            'unit_number' => '101',
            'type' => 'apartment',
            'area_sqm' => 120,
            'status' => 'vacant',
        ]);

        $this->tenant = Tenant::create([
            'name' => 'عبد العزيز محمد الدوسري',
            'type' => 'individual',
            'national_id_or_cr' => '1011223399',
            'mobile' => '0501112233',
            'email' => 'abdulaziz@example.com',
            'address' => 'الرياض',
        ]);

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

    private function getBranchManagerToken(): string
    {
        $user = User::where('email', 'manager@comp1.com')->firstOrFail();
        return $user->createToken('test_token')->plainTextToken;
    }

    public function test_data_entry_can_create_rental_contract_with_automated_installments(): void
    {
        $this->app['auth']->forgetGuards();
        $token = $this->getDataEntryToken();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/contracts', [
            'tenant_id' => $this->tenant->id,
            'property_id' => $this->property->id,
            'unit_id' => $this->unit->id,
            'contract_type' => 'company_to_tenant',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'duration_months' => 12,
            'total_rent' => 60000.00,
            'collection_cycle' => 'quarterly', // 4 installments
            'first_payment' => 15000.00,
            'notes' => 'عقد سنوي دفعات ربع سنوية',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.status', 'active');
        $response->assertJsonPath('data.collection_cycle_label', 'ربع سنوي');

        // Check unit transitioned to occupied
        $this->tenantManager->switchConnection($this->company);
        $this->assertDatabaseHas('units', [
            'id' => $this->unit->id,
            'status' => 'occupied',
        ], 'tenant');

        // Check installments created
        $contractId = $response->json('data.id');
        $installments = DB::connection('tenant')->table('installments')->where('contract_id', $contractId)->get();
        $this->assertCount(4, $installments);

        // Sum of installments must strictly equal 60000.00
        $sum = $installments->sum('amount');
        $this->assertEquals(60000.00, $sum);

        $this->tenantManager->resetToCentral();
    }

    public function test_blocks_contract_on_occupied_unit(): void
    {
        $this->tenantManager->switchConnection($this->company);
        $this->unit->update(['status' => 'occupied']);
        $this->tenantManager->resetToCentral();

        $this->app['auth']->forgetGuards();
        $token = $this->getDataEntryToken();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/contracts', [
            'tenant_id' => $this->tenant->id,
            'property_id' => $this->property->id,
            'unit_id' => $this->unit->id,
            'contract_type' => 'company_to_tenant',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'duration_months' => 12,
            'total_rent' => 50000.00,
            'collection_cycle' => 'annual',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'الوحدة مشغولة بعقد آخر');
    }

    public function test_validates_end_date_after_start_date(): void
    {
        $this->app['auth']->forgetGuards();
        $token = $this->getDataEntryToken();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/contracts', [
            'tenant_id' => $this->tenant->id,
            'property_id' => $this->property->id,
            'unit_id' => $this->unit->id,
            'contract_type' => 'company_to_tenant',
            'start_date' => '2026-12-31',
            'end_date' => '2026-01-01', // Before start
            'duration_months' => 12,
            'total_rent' => 50000.00,
            'collection_cycle' => 'monthly',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية');
    }

    public function test_contract_cancellation_workflow_two_step(): void
    {
        $this->app['auth']->forgetGuards();
        $dataEntryToken = $this->getDataEntryToken();
        $managerToken = $this->getBranchManagerToken();

        // 1. Create active contract
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $dataEntryToken,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/contracts', [
            'tenant_id' => $this->tenant->id,
            'property_id' => $this->property->id,
            'unit_id' => $this->unit->id,
            'contract_type' => 'company_to_tenant',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'duration_months' => 12,
            'total_rent' => 48000.00,
            'collection_cycle' => 'monthly',
        ]);
        $response->assertStatus(201);
        $contractId = $response->json('data.id');

        // 2. Data Entry requests cancellation with reason < 10 chars -> fails
        $this->app['auth']->forgetGuards();
        $shortRes = $this->withHeaders([
            'Authorization' => 'Bearer ' . $dataEntryToken,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/contracts/{$contractId}/request-cancellation", [
            'cancellation_reason' => 'قصير جدا',
        ]);
        $shortRes->assertStatus(422);
        $shortRes->assertJsonPath('message', 'يجب إدخال سبب الإلغاء بحيث لا يقل عن 10 أحرف');

        // 3. Data Entry requests cancellation with valid reason
        $this->app['auth']->forgetGuards();
        $reqRes = $this->withHeaders([
            'Authorization' => 'Bearer ' . $dataEntryToken,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/contracts/{$contractId}/request-cancellation", [
            'cancellation_reason' => 'انتقال المستأجر إلى مدينة أخرى وإنهاء العقد بالتراضي',
        ]);
        $reqRes->assertStatus(200);
        $reqRes->assertJsonPath('data.status', 'pending_cancellation');

        // 4. Branch Manager approves cancellation (UC-42)
        $this->app['auth']->forgetGuards();
        $appRes = $this->withHeaders([
            'Authorization' => 'Bearer ' . $managerToken,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/contracts/{$contractId}/approve-cancellation");

        $appRes->assertStatus(200);
        $appRes->assertJsonPath('data.unit.status', 'vacant');

        // Check unit released to vacant and unpaid installments cancelled
        $this->tenantManager->switchConnection($this->company);
        $this->assertDatabaseHas('units', [
            'id' => $this->unit->id,
            'status' => 'vacant',
        ], 'tenant');

        $this->assertDatabaseHas('notifications', [
            'role' => 'branch_manager',
            'type' => 'contract_cancellation_request',
        ], 'tenant');

        $this->assertDatabaseHas('notifications', [
            'role' => 'data_entry',
            'type' => 'contract_cancellation_approved',
        ], 'tenant');

        $dueCount = DB::connection('tenant')->table('installments')
            ->where('contract_id', $contractId)
            ->where('status', 'due')
            ->count();
        $this->assertEquals(0, $dueCount);

        $this->tenantManager->resetToCentral();
    }

    public function test_cannot_update_expired_contract(): void
    {
        $this->app['auth']->forgetGuards();
        $dataEntryToken = $this->getDataEntryToken();

        $this->tenantManager->switchConnection($this->company);
        $contract = RentalContract::create([
            'contract_number' => 'CNT-202501-9999',
            'tenant_id' => $this->tenant->id,
            'property_id' => $this->property->id,
            'unit_id' => $this->unit->id,
            'contract_type' => 'company_to_tenant',
            'start_date' => '2025-01-01',
            'end_date' => '2025-12-31',
            'duration_months' => 12,
            'total_rent' => 40000.00,
            'collection_cycle' => 'annual',
            'status' => 'expired',
            'created_by' => 1,
        ]);
        $this->tenantManager->resetToCentral();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $dataEntryToken,
            'X-Tenant-Subdomain' => 'comp1',
        ])->putJson("/api/contracts/{$contract->id}", [
            'total_rent' => 45000.00,
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'لا يمكن تعديل عقد منتهي');
    }

    public function test_branch_manager_rejects_cancellation_with_mandatory_reason(): void
    {
        $this->app['auth']->forgetGuards();
        $dataEntryToken = $this->getDataEntryToken();
        $managerToken = $this->getBranchManagerToken();

        $this->tenantManager->switchConnection($this->company);
        $contract = RentalContract::create([
            'contract_number' => 'CNT-202601-8888',
            'tenant_id' => $this->tenant->id,
            'property_id' => $this->property->id,
            'unit_id' => $this->unit->id,
            'contract_type' => 'company_to_tenant',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'duration_months' => 12,
            'total_rent' => 40000.00,
            'collection_cycle' => 'quarterly',
            'status' => 'pending_cancellation',
            'cancellation_reason' => 'رغبة المستأجر في الإخلاء المبكر',
            'created_by' => 1,
        ]);
        $this->tenantManager->resetToCentral();

        // Reject with reason < 10 chars
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $managerToken,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/contracts/{$contract->id}/reject-cancellation", [
            'rejection_reason' => 'مرفوض',
        ]);
        $response->assertStatus(422);
        $response->assertJsonPath('message', 'يجب إدخال سبب الرفض بحيث لا يقل عن 10 أحرف');

        // Reject with valid reason >= 10 chars
        $this->app['auth']->forgetGuards();
        $response2 = $this->withHeaders([
            'Authorization' => 'Bearer ' . $managerToken,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/contracts/{$contract->id}/reject-cancellation", [
            'rejection_reason' => 'تم رفض الطلب لعدم تسوية المستحقات المالية المتبقية على المستأجر',
        ]);

        $response2->assertStatus(200);
        $response2->assertJsonPath('data.status', 'active');

        $this->tenantManager->switchConnection($this->company);
        $this->assertDatabaseHas('notifications', [
            'role' => 'data_entry',
            'type' => 'contract_cancellation_rejected',
        ], 'tenant');
        $this->tenantManager->resetToCentral();
    }

    public function test_contract_attachment_upload_and_deletion(): void
    {
        Storage::fake('public');

        $this->app['auth']->forgetGuards();
        $dataEntryToken = $this->getDataEntryToken();

        $this->tenantManager->switchConnection($this->company);
        $contract = RentalContract::create([
            'contract_number' => 'CNT-202601-7777',
            'tenant_id' => $this->tenant->id,
            'property_id' => $this->property->id,
            'unit_id' => $this->unit->id,
            'contract_type' => 'company_to_tenant',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'duration_months' => 12,
            'total_rent' => 50000.00,
            'collection_cycle' => 'annual',
            'status' => 'active',
            'created_by' => 1,
        ]);
        $this->tenantManager->resetToCentral();

        $file = UploadedFile::fake()->create('contract_signed.pdf', 1024, 'application/pdf');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $dataEntryToken,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/contracts/{$contract->id}/attachments", [
            'file' => $file,
        ]);

        $response->assertStatus(201);
        $attachmentId = $response->json('data.id');

        $this->tenantManager->switchConnection($this->company);
        $this->assertDatabaseHas('contract_attachments', [
            'id' => $attachmentId,
            'file_name' => 'contract_signed.pdf',
        ], 'tenant');
        $this->tenantManager->resetToCentral();

        // Delete attachment
        $this->app['auth']->forgetGuards();
        $delResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $dataEntryToken,
            'X-Tenant-Subdomain' => 'comp1',
        ])->deleteJson("/api/contracts/{$contract->id}/attachments/{$attachmentId}");

        $delResponse->assertStatus(200);

        $this->tenantManager->switchConnection($this->company);
        $this->assertDatabaseMissing('contract_attachments', [
            'id' => $attachmentId,
        ], 'tenant');
        $this->tenantManager->resetToCentral();
    }
}
