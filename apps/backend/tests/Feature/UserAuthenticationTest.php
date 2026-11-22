<?php

namespace Tests\Feature;

use App\Models\Central\Company;
use App\Models\Central\User;
use Database\Seeders\CentralSeeder;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserAuthenticationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Seed standard companies and roles
        $this->seed(CentralSeeder::class);
    }

    public function test_login_validation_errors(): void
    {
        // 1. Missing email
        $response = $this->postJson('/api/auth/login', [
            'password' => 'Password@123',
        ]);
        $response->assertStatus(422)
            ->assertJsonPath('message', 'يرجى إدخال بريد إلكتروني صحيح');

        // 2. Missing password
        $response = $this->postJson('/api/auth/login', [
            'email' => 'admin@mohamedramdan.com',
        ]);
        $response->assertStatus(422)
            ->assertJsonPath('message', 'يرجى إدخال كلمة المرور');

        // 3. Password shorter than 8 characters
        $response = $this->postJson('/api/auth/login', [
            'email' => 'admin@mohamedramdan.com',
            'password' => '12345',
        ]);
        $response->assertStatus(422)
            ->assertJsonPath('message', 'يرجى إدخال كلمة المرور');
    }

    public function test_login_invalid_credentials(): void
    {
        // Wrong password
        $response = $this->postJson('/api/auth/login', [
            'email' => 'admin@mohamedramdan.com',
            'password' => 'WrongPassword123',
        ]);
        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'بيانات الدخول غير صحيحة',
            ]);

        // Non-existent email
        $response = $this->postJson('/api/auth/login', [
            'email' => 'nonexistent@mohamedramdan.com',
            'password' => 'Password@123',
        ]);
        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'بيانات الدخول غير صحيحة',
            ]);
    }

    public function test_login_brute_force_lockout_after_5_failed_attempts(): void
    {
        $email = 'manager@comp1.com';

        // 4 failed attempts
        for ($i = 1; $i <= 4; $i++) {
            $res = $this->postJson('/api/auth/login', [
                'email' => $email,
                'password' => 'WrongPassword' . $i,
            ]);
            $res->assertStatus(401)
                ->assertJsonPath('remaining_attempts', 5 - $i);
        }

        // 5th failed attempt triggers 15-minute lockout
        $res5 = $this->postJson('/api/auth/login', [
            'email' => $email,
            'password' => 'WrongPassword5',
        ]);
        $res5->assertStatus(429)
            ->assertJsonPath('message', 'تم تعليق الحساب مؤقتاً لمدة 15 دقيقة بسبب تكرار المحاولات الخاطئة');

        // Subsequent attempt with correct password while locked still returns 429
        $resLocked = $this->postJson('/api/auth/login', [
            'email' => $email,
            'password' => 'Password@123',
        ]);
        $resLocked->assertStatus(429)
            ->assertJsonPath('message', 'تم تعليق الحساب مؤقتاً لمدة 15 دقيقة بسبب تكرار المحاولات الخاطئة');
    }

    public function test_login_deactivated_account_returns_403(): void
    {
        $inactiveUser = User::create([
            'name' => 'موظف موقف',
            'email' => 'deactivated@comp1.com',
            'mobile' => '0599999999',
            'password' => Hash::make('Password@123'),
            'status' => 'inactive',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'deactivated@comp1.com',
            'password' => 'Password@123',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'لا يمكن الوصول إلى الحساب',
            ]);
    }

    public function test_login_frozen_company_user_denied(): void
    {
        $comp1 = Company::where('subdomain', 'comp1')->first();
        $comp1->update(['status' => 'frozen']);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'manager@comp1.com',
            'password' => 'Password@123',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error_code' => 'COMPANY_FROZEN',
                'message' => 'الشركة مجمدة، يرجى مراجعة الإدارة',
            ]);

        // Restore
        $comp1->update(['status' => 'active']);
    }

    public function test_super_admin_login_and_redirect(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'admin@mohamedramdan.com',
            'password' => 'Password@123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.role', 'super_admin')
            ->assertJsonPath('data.user.redirect_url', '/admin/dashboard');

        $this->assertNotEmpty($response->json('data.token'));
    }

    public function test_branch_manager_login_and_redirect(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'manager@comp1.com',
            'password' => 'Password@123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.role', 'branch_manager')
            ->assertJsonPath('data.user.redirect_url', '/company/dashboard')
            ->assertJsonPath('data.company.subdomain', 'comp1');
    }

    public function test_general_accountant_login_and_redirect(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'accountant@comp1.com',
            'password' => 'Password@123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.role', 'general_accountant')
            ->assertJsonPath('data.user.redirect_url', '/accounting/dashboard');
    }

    public function test_data_entry_login_and_redirect(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'dataentry@comp1.com',
            'password' => 'Password@123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.role', 'data_entry')
            ->assertJsonPath('data.user.redirect_url', '/data-entry/dashboard');
    }

    public function test_me_and_logout(): void
    {
        // 1. Login
        $loginRes = $this->postJson('/api/auth/login', [
            'email' => 'accountant@comp1.com',
            'password' => 'Password@123',
        ]);
        $token = $loginRes->json('data.token');

        // 2. Access /me
        $meRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/auth/me');
        $meRes->assertStatus(200)
            ->assertJsonPath('data.user.email', 'accountant@comp1.com');

        // 3. Logout
        $logoutRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/auth/logout');
        $logoutRes->assertStatus(200)
            ->assertJsonPath('message', 'تم تسجيل الخروج بنجاح');

        // 4. Verify token is revoked
        $this->app['auth']->forgetGuards();
        $revokedRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/auth/me');
        $revokedRes->assertStatus(401);
    }
}
