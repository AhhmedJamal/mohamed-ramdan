<?php

namespace Tests\Feature;

use App\Models\Central\Company;
use App\Models\Central\User;
use App\Models\Tenant\Account;
use App\Services\TenantManager;
use Database\Seeders\CentralSeeder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ChartOfAccountsTest extends TestCase
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

    private function getManagerToken(): string
    {
        $res = $this->postJson('/api/auth/login', [
            'email' => 'manager@comp1.com',
            'password' => 'Password@123',
        ]);
        return $res->json('data.token');
    }

    public function test_can_list_chart_of_accounts_with_all_12_seeded_roots(): void
    {
        $token = $this->getAccountantToken();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->getJson('/api/accounts');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'tree',
                'flat',
            ]);

        $flat = $response->json('flat');
        $this->assertGreaterThanOrEqual(12, count($flat));

        $roots = collect($flat)->keyBy('root_type');
        $this->assertEquals('debit', $roots['assets']['nature']);
        $this->assertEquals('credit', $roots['liabilities']['nature']);
        $this->assertEquals('credit', $roots['equity']['nature']);
        $this->assertEquals('debit', $roots['expenses']['nature']);
        $this->assertEquals('credit', $roots['revenues']['nature']);
        $this->assertEquals('debit', $roots['purchases']['nature']);
        $this->assertEquals('credit', $roots['sales']['nature']);
    }

    public function test_general_accountant_can_create_sub_account_inheriting_nature(): void
    {
        $token = $this->getAccountantToken();
        $uniqueName = 'بنك الراجحي ' . uniqid();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/accounts', [
            'name' => $uniqueName,
            'root_type' => 'assets',
            'account_type' => 'sub',
            'opening_balance' => 50000,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('account.name', $uniqueName)
            ->assertJsonPath('account.nature', 'debit')
            ->assertJsonPath('account.root_type', 'assets');
    }

    public function test_asset_sub_account_with_depreciation_parameters(): void
    {
        $token = $this->getAccountantToken();
        $uniqueName = 'سيارات نقل ' . uniqid();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/accounts', [
            'name' => $uniqueName,
            'root_type' => 'assets',
            'account_type' => 'sub',
            'opening_balance' => 120000,
            'depreciation_method' => 'straight_line',
            'purchase_price' => 120000,
            'depreciation_rate' => 20,
            'useful_life_years' => 5,
            'scrap_value' => 10000,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('account.name', $uniqueName)
            ->assertJsonPath('account.depreciation_method', 'straight_line')
            ->assertJsonPath('account.depreciation_rate', '20.00');
    }

    public function test_duplicate_account_name_is_rejected(): void
    {
        $token = $this->getAccountantToken();
        $uniqueName = 'صندوق رئيسي ' . uniqid();

        // First creation
        $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/accounts', [
            'name' => $uniqueName,
            'root_type' => 'assets',
            'account_type' => 'sub',
        ])->assertStatus(201);

        // Duplicate name
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/accounts', [
            'name' => $uniqueName,
            'root_type' => 'assets',
            'account_type' => 'sub',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'اسم الحساب مستخدم بالفعل');
    }

    public function test_data_entry_cannot_create_or_modify_account(): void
    {
        $token = $this->getDataEntryToken();

        // Data Entry can read
        $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->getJson('/api/accounts')->assertStatus(200);

        // Data Entry forbidden to create
        $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/accounts', [
            'name' => 'حساب غير مصرح ' . uniqid(),
            'root_type' => 'expenses',
            'account_type' => 'sub',
        ])->assertStatus(403);
    }

    public function test_cannot_delete_fixed_root_account(): void
    {
        $token = $this->getAccountantToken();

        $this->tenantManager->switchConnection($this->company);
        $assetsRoot = Account::where('root_type', 'assets')->where('is_fixed_root', true)->firstOrFail();
        $this->tenantManager->resetToCentral();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->deleteJson("/api/accounts/{$assetsRoot->id}");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'لا يمكن حذف الحساب الرئيسي');
    }

    public function test_cannot_delete_account_with_sub_accounts(): void
    {
        $token = $this->getAccountantToken();
        $parentName = 'أصول متداولة بنوك ' . uniqid();

        // Create parent sub-account
        $parentRes = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/accounts', [
            'name' => $parentName,
            'root_type' => 'assets',
            'account_type' => 'sub',
        ]);
        $parentId = $parentRes->json('account.id');

        // Create child under parent
        $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/accounts', [
            'name' => 'بنك فرعي ' . uniqid(),
            'root_type' => 'assets',
            'parent_id' => $parentId,
            'account_type' => 'sub',
        ])->assertStatus(201);

        // Attempt deleting parent
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->deleteJson("/api/accounts/{$parentId}");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'لا يمكن حذف حساب لديه حسابات فرعية');
    }

    public function test_cannot_delete_account_with_linked_journal_entries(): void
    {
        $token = $this->getAccountantToken();
        $accountant = User::where('email', 'accountant@comp1.com')->first();
        $accName = 'مصروفات صيانة ' . uniqid();

        // Create account
        $res = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/accounts', [
            'name' => $accName,
            'root_type' => 'expenses',
            'account_type' => 'sub',
        ]);
        $accId = $res->json('account.id');

        // Insert a simulated journal entry in tenant DB
        $this->tenantManager->switchConnection($this->company);
        $fyId = DB::connection('tenant')->table('fiscal_years')->insertGetId([
            'name' => 'السنة المالية ' . uniqid(),
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
            'explanation' => 'قيد مصروفات صيانة',
            'total_debit' => 1500,
            'total_credit' => 1500,
            'status' => 'posted',
            'created_by' => $accountant->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::connection('tenant')->table('journal_entry_items')->insert([
            'journal_entry_id' => $jeId,
            'account_id' => $accId,
            'debit' => 1500,
            'credit' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->tenantManager->resetToCentral();

        // Attempt deletion
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->deleteJson("/api/accounts/{$accId}");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'لا يمكن حذف الحساب لوجود قيود مرتبطة به');
    }

    public function test_cannot_modify_nature_of_account_with_posted_journal_entries(): void
    {
        $token = $this->getAccountantToken();
        $accountant = User::where('email', 'accountant@comp1.com')->first();
        $accName = 'حساب تجاري ' . uniqid();

        // Create account
        $res = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/accounts', [
            'name' => $accName,
            'root_type' => 'revenues',
            'account_type' => 'sub',
        ]);
        $accId = $res->json('account.id');

        // Insert a posted journal entry
        $this->tenantManager->switchConnection($this->company);
        $fyId = DB::connection('tenant')->table('fiscal_years')->insertGetId([
            'name' => 'السنة المالية ' . uniqid(),
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
            'explanation' => 'قيد إيراد',
            'total_debit' => 5000,
            'total_credit' => 5000,
            'status' => 'posted',
            'created_by' => $accountant->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::connection('tenant')->table('journal_entry_items')->insert([
            'journal_entry_id' => $jeId,
            'account_id' => $accId,
            'debit' => 0,
            'credit' => 5000,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->tenantManager->resetToCentral();

        // Attempt to modify nature to debit
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->putJson("/api/accounts/{$accId}", [
            'name' => $accName,
            'nature' => 'debit',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'لا يمكن تغيير طبيعة الحساب لوجود قيود مرحّلة مرتبطة به');
    }

    public function test_can_delete_unused_leaf_sub_account(): void
    {
        $token = $this->getAccountantToken();
        $accName = 'حساب تجريبي مؤقت ' . uniqid();

        // Create account
        $res = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/accounts', [
            'name' => $accName,
            'root_type' => 'expenses',
            'account_type' => 'sub',
        ]);
        $accId = $res->json('account.id');

        // Delete account
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->deleteJson("/api/accounts/{$accId}");

        $response->assertStatus(200)
            ->assertJsonPath('message', 'تم حذف الحساب بنجاح');
    }
}
