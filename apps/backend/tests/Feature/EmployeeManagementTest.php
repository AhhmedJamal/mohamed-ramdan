<?php

namespace Tests\Feature;

use App\Models\Central\Company;
use App\Models\Central\User;
use App\Services\TenantManager;
use Database\Seeders\CentralSeeder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EmployeeManagementTest extends TestCase
{
    protected TenantManager $tenantManager;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CentralSeeder::class);
        $this->tenantManager = app(TenantManager::class);
    }

    private function getBranchManagerToken(): string
    {
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $res = $this->postJson('/api/auth/login', [
            'email' => 'manager@comp1.com',
            'password' => 'Password@123',
        ]);
        return $res->json('data.token');
    }

    public function test_branch_manager_can_list_own_company_employees(): void
    {
        $managerToken = $this->getBranchManagerToken();

        $response = $this->withHeader('Authorization', 'Bearer ' . $managerToken)
            ->getJson('/api/company/employees');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $emails = collect($response->json('data'))->pluck('email')->all();
        $this->assertContains('accountant@comp1.com', $emails);
        $this->assertContains('dataentry@comp1.com', $emails);
    }

    public function test_add_employee_validation_and_success(): void
    {
        $managerToken = $this->getBranchManagerToken();

        // 1. Duplicate email
        $res1 = $this->withHeader('Authorization', 'Bearer ' . $managerToken)
            ->postJson('/api/company/employees', [
                'name' => 'موظف مكرر',
                'email' => 'accountant@comp1.com', // Duplicate
                'mobile' => '0591234567',
                'role' => 'general_accountant',
            ]);
        $res1->assertStatus(422)
            ->assertJsonPath('message', 'البيانات مستخدمة بالفعل');

        // 2. Invalid mobile
        $res2 = $this->withHeader('Authorization', 'Bearer ' . $managerToken)
            ->postJson('/api/company/employees', [
                'name' => 'موظف جديد',
                'email' => 'newemp@comp1.com',
                'mobile' => '0612345678', // Invalid
                'role' => 'data_entry',
            ]);
        $res2->assertStatus(422)
            ->assertJsonPath('message', 'رقم الجوال يجب أن يتكون من 10 أرقام ويبدأ بـ 05');

        // 3. Success
        $newEmail = 'validemp_' . uniqid() . '@comp1.com';
        $newMobile = '05' . rand(10000000, 99999999);

        $res3 = $this->withHeader('Authorization', 'Bearer ' . $managerToken)
            ->postJson('/api/company/employees', [
                'name' => 'محمد السالم',
                'email' => $newEmail,
                'mobile' => $newMobile,
                'role' => 'data_entry',
                'temporary_password' => 'Emp@2026123',
            ]);

        $res3->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.email', $newEmail)
            ->assertJsonPath('data.role', 'data_entry')
            ->assertJsonPath('data.status', 'active');

        // Verify linked to company 1
        $emp = User::where('email', $newEmail)->first();
        $this->assertNotNull($emp);
        $this->assertTrue($emp->companies()->where('subdomain', 'comp1')->exists());
    }

    public function test_edit_employee_data_and_notification(): void
    {
        $managerToken = $this->getBranchManagerToken();
        $accountant = User::where('email', 'accountant@comp1.com')->first();

        $updatedMobile = '05' . rand(10000000, 99999999);

        $response = $this->withHeader('Authorization', 'Bearer ' . $managerToken)
            ->putJson("/api/company/employees/{$accountant->id}", [
                'name' => 'سامي يوسف المعتمد المعدل',
                'email' => $accountant->email,
                'mobile' => $updatedMobile,
                'role' => 'general_accountant',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'سامي يوسف المعتمد المعدل');

        // Verify notification logged
        $log = DB::connection('central')->table('notification_logs')
            ->where('recipient', $accountant->email)
            ->latest('id')
            ->first();
        $this->assertNotNull($log);
    }

    public function test_deactivate_employee_evicts_sessions_immediately(): void
    {
        // 1. Login as dataentry
        $empLogin = $this->postJson('/api/auth/login', [
            'email' => 'dataentry@comp1.com',
            'password' => 'Password@123',
        ]);
        $empToken = $empLogin->json('data.token');

        // Verify session works
        $this->withHeader('Authorization', 'Bearer ' . $empToken)
            ->getJson('/api/profile')
            ->assertStatus(200);

        // 2. Manager deactivates employee (UC-15)
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $managerToken = $this->getBranchManagerToken();
        $dataEntryUser = User::where('email', 'dataentry@comp1.com')->first();

        $toggleRes = $this->withHeader('Authorization', 'Bearer ' . $managerToken)
            ->postJson("/api/company/employees/{$dataEntryUser->id}/toggle-status");

        $toggleRes->assertStatus(200)
            ->assertJsonPath('data.status', 'inactive');

        // 3. Multi-Device Eviction Rule: Verify session is purged
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $evictedRes = $this->withHeader('Authorization', 'Bearer ' . $empToken)
            ->getJson('/api/profile');
        $evictedRes->assertStatus(401);

        // 4. Verify login is blocked
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $blockedLogin = $this->postJson('/api/auth/login', [
            'email' => 'dataentry@comp1.com',
            'password' => 'Password@123',
        ]);
        $blockedLogin->assertStatus(403)
            ->assertJsonPath('message', 'لا يمكن الوصول إلى الحساب');

        // Restore active status
        $dataEntryUser->update(['status' => 'active']);
    }

    public function test_delete_employee_blocked_if_accounting_entries_exist(): void
    {
        $managerToken = $this->getBranchManagerToken();
        $comp1 = Company::where('subdomain', 'comp1')->first();
        $accountant = User::where('email', 'accountant@comp1.com')->first();

        // 1. Insert an approved voucher created by this accountant in tenant DB
        $this->tenantManager->switchConnection($comp1);
        $ccId = DB::connection('tenant')->table('cost_centers')->value('id') ?? DB::connection('tenant')->table('cost_centers')->insertGetId([
            'code' => 'CC-EMP-01',
            'name' => 'مركز تجريبي',
            'type' => 'property',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $accId = DB::connection('tenant')->table('accounts')->value('id') ?? DB::connection('tenant')->table('accounts')->insertGetId([
            'code' => '1000',
            'name' => 'الأصول',
            'root_type' => 'assets',
            'nature' => 'debit',
            'account_type' => 'root',
            'is_fixed_root' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::connection('tenant')->table('vouchers')->insert([
            'voucher_number' => 'V-TEST-' . uniqid(),
            'type' => 'receipt',
            'amount' => 5000.0000,
            'date' => '2026-11-20',
            'cost_center_id' => $ccId,
            'debit_account_id' => $accId,
            'credit_account_id' => $accId,
            'payment_method' => 'cash',
            'status' => 'approved',
            'created_by' => $accountant->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->tenantManager->resetToCentral();

        // 2. Manager attempts to delete the accountant
        $this->app['auth']->forgetGuards();
        $response = $this->withHeader('Authorization', 'Bearer ' . $managerToken)
            ->deleteJson("/api/company/employees/{$accountant->id}");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'لا يمكن حذف المحاسب لوجود قيود محاسبية مرتبطة به');
    }

    public function test_delete_employee_succeeds_if_no_accounting_entries(): void
    {
        $managerToken = $this->getBranchManagerToken();

        // Add fresh employee
        $tempEmail = 'tempemp_' . uniqid() . '@comp1.com';
        $createRes = $this->withHeader('Authorization', 'Bearer ' . $managerToken)
            ->postJson('/api/company/employees', [
                'name' => 'موظف مؤقت للحذف',
                'email' => $tempEmail,
                'mobile' => '05' . rand(10000000, 99999999),
                'role' => 'data_entry',
            ]);
        $empId = $createRes->json('data.id');

        // Delete succeeds
        $deleteRes = $this->withHeader('Authorization', 'Bearer ' . $managerToken)
            ->deleteJson("/api/company/employees/{$empId}");

        $deleteRes->assertStatus(200)
            ->assertJsonPath('message', 'تم حذف الموظف من الشركة بنجاح');
    }
}

