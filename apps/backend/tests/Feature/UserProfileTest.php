<?php

namespace Tests\Feature;

use App\Models\Central\User;
use Database\Seeders\CentralSeeder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class UserProfileTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CentralSeeder::class);
    }

    private function authenticateAs(string $email = 'accountant@comp1.com'): array
    {
        $loginRes = $this->postJson('/api/auth/login', [
            'email' => $email,
            'password' => 'Password@123',
        ]);

        return [
            'token' => $loginRes->json('data.token'),
            'user' => $loginRes->json('data.user'),
        ];
    }

    public function test_get_profile(): void
    {
        $auth = $this->authenticateAs();

        $response = $this->withHeader('Authorization', 'Bearer ' . $auth['token'])
            ->getJson('/api/profile');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.email', 'accountant@comp1.com')
            ->assertJsonPath('data.name', 'سامي يوسف (المحاسب العام)');
    }

    public function test_update_profile_validation_errors(): void
    {
        $auth = $this->authenticateAs();

        // 1. Invalid mobile format
        $res1 = $this->withHeader('Authorization', 'Bearer ' . $auth['token'])
            ->putJson('/api/profile', [
                'name' => 'سامي يوسف المعدل',
                'mobile' => '0612345678', // Does not start with 05
            ]);
        $res1->assertStatus(422)
            ->assertJsonPath('message', 'رقم الجوال يجب أن يتكون من 10 أرقام ويبدأ بـ 05');

        // 2. Duplicate mobile (Super Admin's mobile: 0500000001)
        $res2 = $this->withHeader('Authorization', 'Bearer ' . $auth['token'])
            ->putJson('/api/profile', [
                'name' => 'سامي يوسف المعدل',
                'mobile' => '0500000001',
            ]);
        $res2->assertStatus(422)
            ->assertJsonPath('message', 'رقم الجوال مستخدم بالفعل');
    }

    public function test_update_profile_success(): void
    {
        $auth = $this->authenticateAs();
        $newMobile = '0512345678';

        $response = $this->withHeader('Authorization', 'Bearer ' . $auth['token'])
            ->putJson('/api/profile', [
                'name' => 'سامي يوسف المحاسب المعتمد',
                'mobile' => $newMobile,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'سامي يوسف المحاسب المعتمد')
            ->assertJsonPath('data.mobile', $newMobile);

        // Verify notification log created for mobile change
        $log = DB::connection('central')->table('notification_logs')
            ->where('recipient', $newMobile)
            ->where('channel', 'sms')
            ->first();
        $this->assertNotNull($log);
    }

    public function test_change_password_validation_errors(): void
    {
        $auth = $this->authenticateAs();

        // Mismatched passwords
        $res1 = $this->withHeader('Authorization', 'Bearer ' . $auth['token'])
            ->postJson('/api/profile/change-password', [
                'current_password' => 'Password@123',
                'new_password' => 'NewPassword123',
                'new_password_confirmation' => 'Mismatch123',
            ]);
        $res1->assertStatus(422)
            ->assertJsonPath('message', 'كلمات المرور غير متطابقة');

        // Short password
        $res2 = $this->withHeader('Authorization', 'Bearer ' . $auth['token'])
            ->postJson('/api/profile/change-password', [
                'current_password' => 'Password@123',
                'new_password' => 'short',
                'new_password_confirmation' => 'short',
            ]);
        $res2->assertStatus(422)
            ->assertJsonPath('message', 'يرجى إدخال كلمة المرور');
    }

    public function test_change_password_invalid_current_password(): void
    {
        $auth = $this->authenticateAs();

        $response = $this->withHeader('Authorization', 'Bearer ' . $auth['token'])
            ->postJson('/api/profile/change-password', [
                'current_password' => 'WrongCurrentPassword',
                'new_password' => 'NewPassword123',
                'new_password_confirmation' => 'NewPassword123',
            ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'كلمة المرور الحالية غير صحيحة',
            ]);
    }

    public function test_change_password_success_and_immediate_session_eviction(): void
    {
        $auth = $this->authenticateAs();
        $token = $auth['token'];
        $newPassword = 'BrandNewPassword@2026';

        // 1. Change password successfully
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/profile/change-password', [
                'current_password' => 'Password@123',
                'new_password' => $newPassword,
                'new_password_confirmation' => $newPassword,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'تم تغيير كلمة المرور بنجاح، تم إنهاء جميع الجلسات النشطة، يرجى تسجيل الدخول مجدداً',
            ]);

        // 2. Verify all tokens revoked (immediate eviction rule)
        $this->app['auth']->forgetGuards();
        $profileRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/profile');
        $profileRes->assertStatus(401);

        // 3. Verify user can log in with new password
        $loginRes = $this->postJson('/api/auth/login', [
            'email' => 'accountant@comp1.com',
            'password' => $newPassword,
        ]);
        $loginRes->assertStatus(200);
    }
}

