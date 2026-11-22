<?php

namespace Tests\Feature;

use App\Models\Central\Company;
use App\Models\Central\User;
use App\Services\TenantManager;
use Database\Seeders\CentralSeeder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CompanyProvisioningTest extends TestCase
{
    protected TenantManager $tenantManager;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CentralSeeder::class);
        $this->tenantManager = app(TenantManager::class);
    }

    private function getSuperAdminToken(): string
    {
        $res = $this->postJson('/api/auth/login', [
            'email' => 'admin@mohamedramdan.com',
            'password' => 'Password@123',
        ]);
        return $res->json('data.token');
    }

    private function getBranchManagerToken(): string
    {
        $res = $this->postJson('/api/auth/login', [
            'email' => 'manager@comp1.com',
            'password' => 'Password@123',
        ]);
        return $res->json('data.token');
    }

    public function test_non_super_admin_cannot_create_company(): void
    {
        $managerToken = $this->getBranchManagerToken();

        $response = $this->withHeader('Authorization', 'Bearer ' . $managerToken)
            ->postJson('/api/admin/companies', [
                'name' => 'شركة تجريبية جديدة',
                'trade_activity' => 'مقاولات',
                'address' => 'الرياض',
                'country' => 'السعودية',
                'city' => 'الرياض',
                'subdomain' => 'testcompany',
                'manager_name' => 'فهد العتيبي',
                'manager_email' => 'fahad@testcompany.com',
                'manager_mobile' => '0598765432',
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'غير مصرح لك بتنفيذ هذا الإجراء');
    }

    public function test_duplicate_company_name_returns_error(): void
    {
        $adminToken = $this->getSuperAdminToken();

        $response = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->postJson('/api/admin/companies', [
                'name' => 'مجموعة رمضان للاستثمار العقاري', // Duplicate
                'trade_activity' => 'استثمارات',
                'address' => 'طريق الملك فهد',
                'country' => 'السعودية',
                'city' => 'الرياض',
                'subdomain' => 'unique_sub',
                'manager_name' => 'مدير جديد',
                'manager_email' => 'newmanager@example.com',
                'manager_mobile' => '0588888888',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'اسم الشركة مستخدم بالفعل');
    }

    public function test_duplicate_manager_email_or_mobile_returns_error(): void
    {
        $adminToken = $this->getSuperAdminToken();

        // Duplicate email (accountant@comp1.com already seeded)
        $response = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->postJson('/api/admin/companies', [
                'name' => 'شركة الإنشاءات السريعة',
                'trade_activity' => 'إنشاءات',
                'address' => 'طريق العليا',
                'country' => 'السعودية',
                'city' => 'الرياض',
                'subdomain' => 'fastcon',
                'manager_name' => 'مدير سريع',
                'manager_email' => 'accountant@comp1.com', // Duplicate email
                'manager_mobile' => '0577777777',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'البيانات مستخدمة بالفعل');
    }

    public function test_successful_company_creation_and_isolated_db_provisioning(): void
    {
        $adminToken = $this->getSuperAdminToken();
        $subdomain = 'tech' . uniqid();

        $payload = [
            'name' => 'شركة الحلول الذكية ' . uniqid(),
            'trade_activity' => 'تقنية المعلومات والحلول السحابية',
            'address' => 'واحة غرناطة، الرياض',
            'country' => 'السعودية',
            'city' => 'الرياض',
            'tax_number' => '300099999900003',
            'subdomain' => $subdomain,
            'manager_name' => 'المهندس ياسر الغامدي',
            'manager_email' => "yasser_{$subdomain}@example.com",
            'manager_mobile' => '05' . rand(10000000, 99999999),
            'temporary_password' => 'Manager@2026',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->postJson('/api/admin/companies', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'تم إنشاء الشركة بنجاح وتأسيس قاعدة البيانات المعزولة')
            ->assertJsonPath('data.subdomain', $subdomain);

        // 1. Verify Company in Central DB
        $company = Company::where('subdomain', $subdomain)->first();
        $this->assertNotNull($company);
        $this->assertEquals($payload['name'], $company->name);
        $this->assertEquals('active', $company->status);

        // 2. Verify Manager created and linked in Central DB
        $manager = User::where('email', $payload['manager_email'])->first();
        $this->assertNotNull($manager);
        $this->assertEquals($payload['manager_name'], $manager->name);

        $pivot = $company->users()->where('user_id', $manager->id)->first();
        $this->assertNotNull($pivot);
        $this->assertEquals('branch_manager', $pivot->pivot->role);
        $this->assertTrue((bool)$pivot->pivot->is_primary_manager);

        // 3. Verify notification log created
        $log = DB::connection('central')->table('notification_logs')
            ->where('recipient', $payload['manager_email'])
            ->first();
        $this->assertNotNull($log);

        // 4. Verify Tenant Database isolation: Switch connection and verify 12 root accounts exist
        $this->tenantManager->switchConnection($company);
        $accountsCount = DB::connection('tenant')->table('accounts')->count();
        $this->assertEquals(12, $accountsCount, 'Tenant database was not seeded with 12 fixed root accounts!');

        // Check essential root accounts
        $assets = DB::connection('tenant')->table('accounts')->where('code', '1000')->first();
        $this->assertNotNull($assets);
        $this->assertEquals('الأصول', $assets->name);
        $this->assertEquals('debit', $assets->nature);

        $liabilities = DB::connection('tenant')->table('accounts')->where('code', '2000')->first();
        $this->assertNotNull($liabilities);
        $this->assertEquals('الخصوم', $liabilities->name);
        $this->assertEquals('credit', $liabilities->nature);

        // Reset to central
        $this->tenantManager->resetToCentral();
    }
}

