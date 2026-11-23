<?php

namespace Tests\Feature;

use App\Models\Central\Company;
use App\Models\Central\User;
use Database\Seeders\CentralSeeder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CompanyFreezeAndEvictionTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CentralSeeder::class);
    }

    private function getSuperAdminToken(): string
    {
        $res = $this->postJson('/api/auth/login', [
            'email' => 'admin@mohamedramdan.com',
            'password' => 'Password@123',
        ]);
        return $res->json('data.token');
    }

    public function test_list_companies_with_search_and_filter(): void
    {
        $adminToken = $this->getSuperAdminToken();

        // 1. List all
        $response = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->getJson('/api/admin/companies');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
        $this->assertGreaterThanOrEqual(3, count($response->json('data')));

        // 2. Search by name
        $searchRes = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->getJson('/api/admin/companies?search=عقاري');
        $searchRes->assertStatus(200);
        $this->assertEquals(1, count($searchRes->json('data')));
        $this->assertEquals('comp1', $searchRes->json('data.0.subdomain'));

        // 3. Filter by status
        $filterRes = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->getJson('/api/admin/companies?status=active');
        $filterRes->assertStatus(200);
        $this->assertNotEmpty($filterRes->json('data'));
    }

    public function test_freeze_company_evicts_all_employee_sessions_immediately(): void
    {
        $comp1 = Company::where('subdomain', 'comp1')->first();

        // 1. Login as Accountant of comp1
        $accountantLogin = $this->postJson('/api/auth/login', [
            'email' => 'accountant@comp1.com',
            'password' => 'Password@123',
        ]);
        $accountantToken = $accountantLogin->json('data.token');

        // Verify session is active
        $this->withHeader('Authorization', 'Bearer ' . $accountantToken)
            ->getJson('/api/profile')
            ->assertStatus(200);

        // 2. Super Admin Freezes Company 1 (UC-09)
        $this->app['auth']->forgetGuards();
        $adminToken = $this->getSuperAdminToken();
        $this->app['auth']->forgetGuards();
        $freezeRes = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->postJson("/api/admin/companies/{$comp1->id}/toggle-status");

        $freezeRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'frozen');

        // 3. Multi-Device Eviction Rule: Verify Accountant's token is destroyed immediately
        $this->app['auth']->forgetGuards();
        $evictedRes = $this->withHeader('Authorization', 'Bearer ' . $accountantToken)
            ->getJson('/api/profile');
        $evictedRes->assertStatus(401);

        // 4. Verify login is blocked with HTTP 403 for employees of frozen company
        $blockedLogin = $this->postJson('/api/auth/login', [
            'email' => 'accountant@comp1.com',
            'password' => 'Password@123',
        ]);
        $blockedLogin->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error_code' => 'COMPANY_FROZEN',
                'message' => 'الشركة مجمدة، يرجى مراجعة الإدارة',
            ]);
    }

    public function test_activate_frozen_company_restores_login(): void
    {
        $comp1 = Company::where('subdomain', 'comp1')->first();
        $adminToken = $this->getSuperAdminToken();

        // Freeze
        $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->postJson("/api/admin/companies/{$comp1->id}/toggle-status");

        // Reactivate
        $activateRes = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->postJson("/api/admin/companies/{$comp1->id}/toggle-status");

        $activateRes->assertStatus(200)
            ->assertJsonPath('data.status', 'active');

        // Accountant can log in again
        $loginRes = $this->postJson('/api/auth/login', [
            'email' => 'accountant@comp1.com',
            'password' => 'Password@123',
        ]);
        $loginRes->assertStatus(200);
    }

    public function test_assign_branch_manager(): void
    {
        $comp1 = Company::where('subdomain', 'comp1')->first();
        $adminToken = $this->getSuperAdminToken();

        $newManagerData = [
            'manager_name' => 'سلطان بن عبدالعزيز',
            'manager_email' => 'sultan@comp1.com',
            'manager_mobile' => '0566666666',
            'temporary_password' => 'Sultan@2026',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->postJson("/api/admin/companies/{$comp1->id}/assign-manager", $newManagerData);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.manager.email', 'sultan@comp1.com');

        // Verify in DB that old manager is no longer primary and sultan is primary
        $primaryManager = $comp1->users()->wherePivot('is_primary_manager', true)->first();
        $this->assertNotNull($primaryManager);
        $this->assertEquals('sultan@comp1.com', $primaryManager->email);

        // Verify notification logged
        $log = DB::connection('central')->table('notification_logs')
            ->where('recipient', 'sultan@comp1.com')
            ->first();
        $this->assertNotNull($log);
    }

    public function test_frozen_company_middleware_blocks_direct_tenant_requests(): void
    {
        $comp1 = Company::where('subdomain', 'comp1')->first();
        $comp1->status = 'frozen';
        $comp1->save();

        $response = $this->withHeader('X-Tenant-Subdomain', 'comp1')
            ->getJson('/api/tenant/info');

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error_code' => 'COMPANY_FROZEN',
                'message' => 'الشركة مجمدة، يرجى مراجعة الإدارة',
            ]);
    }
}
