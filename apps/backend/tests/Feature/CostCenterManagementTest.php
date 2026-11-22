<?php

namespace Tests\Feature;

use App\Models\Central\Company;
use App\Models\Central\User;
use App\Models\Tenant\Account;
use App\Models\Tenant\CostCenter;
use App\Services\TenantManager;
use Database\Seeders\CentralSeeder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CostCenterManagementTest extends TestCase
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
    }

    protected function tearDown(): void
    {
        $this->tenantManager->resetToCentral();
        parent::tearDown();
    }

    private function getAccountantToken(): string
    {
        $res = $this->postJson('/api/auth/login', [
            'email' => 'accountant@comp1.com',
            'password' => 'Password@123',
        ]);
        return $res->json('data.token');
    }

    private function getDataEntryToken(): string
    {
        $res = $this->postJson('/api/auth/login', [
            'email' => 'dataentry@comp1.com',
            'password' => 'Password@123',
        ]);
        return $res->json('data.token');
    }

    public function test_general_accountant_can_list_cost_centers(): void
    {
        $token = $this->getAccountantToken();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->getJson('/api/cost-centers');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'cost_centers',
            ]);
    }

    public function test_can_create_property_and_contracting_cost_centers(): void
    {
        $token = $this->getAccountantToken();
        $propName = 'برج الأندلس السكني ' . uniqid();
        $projName = 'مشروع إنشاء جسر الرياض ' . uniqid();

        // Property cost center
        $propRes = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/cost-centers', [
            'name' => $propName,
            'type' => 'property',
            'description' => 'عمارة سكنية بحي العليا',
            'status' => 'active',
        ]);

        $propRes->assertStatus(201)
            ->assertJsonPath('cost_center.name', $propName)
            ->assertJsonPath('cost_center.type', 'property');
        $this->assertStringStartsWith('CC-PROP-', $propRes->json('cost_center.code'));

        // Contracting project cost center
        $projRes = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/cost-centers', [
            'name' => $projName,
            'type' => 'contracting_project',
            'description' => 'مشروع مقاولات بنية تحتية',
            'status' => 'active',
        ]);

        $projRes->assertStatus(201)
            ->assertJsonPath('cost_center.name', $projName)
            ->assertJsonPath('cost_center.type', 'contracting_project');
        $this->assertStringStartsWith('CC-PROJ-', $projRes->json('cost_center.code'));
    }

    public function test_duplicate_cost_center_name_is_rejected(): void
    {
        $token = $this->getAccountantToken();
        $name = 'مجمع السعادة ' . uniqid();

        $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/cost-centers', [
            'name' => $name,
            'type' => 'property',
        ])->assertStatus(201);

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/cost-centers', [
            'name' => $name,
            'type' => 'property',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'اسم مركز التكلفة مستخدم بالفعل');
    }

    public function test_cannot_change_type_of_cost_center_with_transactions(): void
    {
        $token = $this->getAccountantToken();
        $accountant = User::where('email', 'accountant@comp1.com')->first();
        $name = 'عمارة النور ' . uniqid();

        $res = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/cost-centers', [
            'name' => $name,
            'type' => 'property',
        ]);
        $ccId = $res->json('cost_center.id');

        // Insert a simulated journal item linked to this cost center
        $this->tenantManager->switchConnection($this->company);
        $fyId = DB::connection('tenant')->table('fiscal_years')->insertGetId([
            'name' => 'السنة 2026 ' . uniqid(),
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $jeId = DB::connection('tenant')->table('journal_entries')->insertGetId([
            'entry_number' => 'JV-' . uniqid(),
            'fiscal_year_id' => $fyId,
            'date' => '2026-06-01',
            'explanation' => 'قيد تكلفة',
            'total_debit' => 2000,
            'total_credit' => 2000,
            'status' => 'posted',
            'created_by' => $accountant->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $acc = Account::first();
        DB::connection('tenant')->table('journal_entry_items')->insert([
            'journal_entry_id' => $jeId,
            'account_id' => $acc->id,
            'cost_center_id' => $ccId,
            'debit' => 2000,
            'credit' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->tenantManager->resetToCentral();

        // Attempt changing type from property to contracting_project
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->putJson("/api/cost-centers/{$ccId}", [
            'name' => $name,
            'type' => 'contracting_project',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'لا يمكن تغيير نوع مركز التكلفة لوجود قيود مرتبطة به');
    }

    public function test_cannot_delete_cost_center_with_linked_transactions(): void
    {
        $token = $this->getAccountantToken();
        $accountant = User::where('email', 'accountant@comp1.com')->first();
        $name = 'عمارة الفلاح ' . uniqid();

        $res = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/cost-centers', [
            'name' => $name,
            'type' => 'property',
        ]);
        $ccId = $res->json('cost_center.id');

        // Link with journal entry
        $this->tenantManager->switchConnection($this->company);
        $fyId = DB::connection('tenant')->table('fiscal_years')->insertGetId([
            'name' => 'السنة 2026 ' . uniqid(),
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $jeId = DB::connection('tenant')->table('journal_entries')->insertGetId([
            'entry_number' => 'JV-' . uniqid(),
            'fiscal_year_id' => $fyId,
            'date' => '2026-06-01',
            'explanation' => 'قيد تكلفة',
            'total_debit' => 1000,
            'total_credit' => 1000,
            'status' => 'posted',
            'created_by' => $accountant->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $acc = Account::first();
        DB::connection('tenant')->table('journal_entry_items')->insert([
            'journal_entry_id' => $jeId,
            'account_id' => $acc->id,
            'cost_center_id' => $ccId,
            'debit' => 1000,
            'credit' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->tenantManager->resetToCentral();

        // Attempt deletion
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->deleteJson("/api/cost-centers/{$ccId}");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'لا يمكن حذف مركز تكلفة له قيود مرتبطة');
    }

    public function test_can_delete_unused_cost_center(): void
    {
        $token = $this->getAccountantToken();
        $name = 'مركز تكلفة مؤقت ' . uniqid();

        $res = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/cost-centers', [
            'name' => $name,
            'type' => 'property',
        ]);
        $ccId = $res->json('cost_center.id');

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->deleteJson("/api/cost-centers/{$ccId}");

        $response->assertStatus(200)
            ->assertJsonPath('message', 'تم حذف مركز التكلفة بنجاح');
    }

    public function test_can_toggle_cost_center_status(): void
    {
        $token = $this->getAccountantToken();
        $name = 'عمارة اليرموك ' . uniqid();

        $res = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/cost-centers', [
            'name' => $name,
            'type' => 'property',
            'status' => 'active',
        ]);
        $ccId = $res->json('cost_center.id');

        // Toggle to inactive
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/cost-centers/{$ccId}/toggle-status");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'inactive');
    }

    public function test_data_entry_cannot_mutate_cost_centers(): void
    {
        $token = $this->getDataEntryToken();

        // Can read
        $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->getJson('/api/cost-centers')->assertStatus(200);

        // Cannot create
        $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/cost-centers', [
            'name' => 'مركز غير مصرح ' . uniqid(),
            'type' => 'property',
        ])->assertStatus(403);
    }

    public function test_configure_account_mandatory_cost_center_linking(): void
    {
        $token = $this->getAccountantToken();

        $this->tenantManager->switchConnection($this->company);
        $expenseAcc = Account::where('root_type', 'expenses')->firstOrFail();
        $this->tenantManager->resetToCentral();

        // Create 2 cost centers
        $cc1 = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/cost-centers', [
            'name' => 'عمارة الياسمين ' . uniqid(),
            'type' => 'property',
        ])->json('cost_center.id');

        $cc2 = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/cost-centers', [
            'name' => 'مشروع النرجس ' . uniqid(),
            'type' => 'contracting_project',
        ])->json('cost_center.id');

        // Configure mandatory linking (UC-23)
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/cost-centers/link-account', [
            'account_id' => $expenseAcc->id,
            'is_mandatory' => true,
            'allowed_cost_center_ids' => [$cc1, $cc2],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('account.is_cost_center_mandatory', true);

        $this->tenantManager->switchConnection($this->company);
        $reloaded = Account::with('allowedCostCenters')->find($expenseAcc->id);
        $this->assertTrue($reloaded->is_cost_center_mandatory);
        $this->assertCount(2, $reloaded->allowedCostCenters);
        $this->tenantManager->resetToCentral();
    }
}

