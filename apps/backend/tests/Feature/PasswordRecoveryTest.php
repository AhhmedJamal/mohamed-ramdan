<?php

namespace Tests\Feature;

use App\Models\Central\User;
use Carbon\Carbon;
use Database\Seeders\CentralSeeder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PasswordRecoveryTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CentralSeeder::class);
    }

    public function test_forgot_password_validation_error(): void
    {
        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'invalid-email-format',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'يرجى إدخال بريد إلكتروني صحيح');
    }

    public function test_forgot_password_unregistered_email(): void
    {
        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'unknown@notregistered.com',
        ]);

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'البريد الإلكتروني غير مسجل في النظام',
            ]);
    }

    public function test_forgot_password_success_and_cooldown(): void
    {
        $email = 'accountant@comp1.com';

        // 1. Initial request succeeds
        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => $email,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني',
            ]);

        $token = $response->json('reset_token');
        $this->assertNotEmpty($token);

        // Verify token in DB
        $dbToken = DB::connection('central')->table('password_reset_tokens')
            ->where('token', $token)
            ->first();
        $this->assertNotNull($dbToken);
        $this->assertEquals($email, $dbToken->email);

        // Verify notification log created
        $log = DB::connection('central')->table('notification_logs')
            ->where('recipient', $email)
            ->where('channel', 'email')
            ->first();
        $this->assertNotNull($log);

        // 2. Immediate second request hits 60s cooldown
        $cooldownResponse = $this->postJson('/api/auth/forgot-password', [
            'email' => $email,
        ]);

        $cooldownResponse->assertStatus(429)
            ->assertJsonPath('message', 'لا يمكن إعادة إرسال اللينك قبل 60 ثانية');
        $this->assertGreaterThan(0, $cooldownResponse->json('remaining_seconds'));
    }

    public function test_reset_password_validation_errors(): void
    {
        $response = $this->postJson('/api/auth/reset-password', [
            'token' => 'sample-token',
            'email' => 'accountant@comp1.com',
            'password' => 'short',
            'password_confirmation' => 'short',
        ]);
        $response->assertStatus(422)
            ->assertJsonPath('message', 'يرجى إدخال كلمة المرور');

        // Mismatched passwords
        $mismatchResponse = $this->postJson('/api/auth/reset-password', [
            'token' => 'sample-token',
            'email' => 'accountant@comp1.com',
            'password' => 'NewPassword123',
            'password_confirmation' => 'DifferentPassword123',
        ]);
        $mismatchResponse->assertStatus(422)
            ->assertJsonPath('message', 'كلمات المرور غير متطابقة');
    }

    public function test_reset_password_invalid_token(): void
    {
        $response = $this->postJson('/api/auth/reset-password', [
            'token' => 'non-existent-token',
            'email' => 'accountant@comp1.com',
            'password' => 'NewPassword123',
            'password_confirmation' => 'NewPassword123',
        ]);

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'اللينك غير صحيح، يرجى طلب لينك جديد',
            ]);
    }

    public function test_reset_password_success_and_single_use(): void
    {
        $email = 'accountant@comp1.com';

        // 1. Generate reset token
        $forgotRes = $this->postJson('/api/auth/forgot-password', [
            'email' => $email,
        ]);
        $token = $forgotRes->json('reset_token');

        // 2. Perform reset
        $newPassword = 'BrandNewPassword@2026';
        $resetRes = $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => $email,
            'password' => $newPassword,
            'password_confirmation' => $newPassword,
        ]);

        $resetRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'تم إعادة تعيين كلمة المرور بنجاح، يمكنك الآن تسجيل الدخول',
            ]);

        // 3. Verify user can log in with new password
        $loginRes = $this->postJson('/api/auth/login', [
            'email' => $email,
            'password' => $newPassword,
        ]);
        $loginRes->assertStatus(200);

        // 4. Verify token cannot be reused (Single-Use rule)
        $reuseRes = $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => $email,
            'password' => 'AnotherPassword123',
            'password_confirmation' => 'AnotherPassword123',
        ]);

        $reuseRes->assertStatus(410)
            ->assertJson([
                'success' => false,
                'message' => 'اللينك مستخدم من قبل، يرجى طلب لينك جديد',
            ]);
    }

    public function test_reset_password_expired_token(): void
    {
        $email = 'accountant@comp1.com';
        $expiredToken = 'expired-token-' . uniqid();

        // Insert token expired 25 hours ago
        DB::connection('central')->table('password_reset_tokens')->insert([
            'email' => $email,
            'token' => $expiredToken,
            'created_at' => Carbon::now()->subHours(26),
            'expires_at' => Carbon::now()->subHours(2), // Expired
            'used_at' => null,
        ]);

        $response = $this->postJson('/api/auth/reset-password', [
            'token' => $expiredToken,
            'email' => $email,
            'password' => 'NewPassword123',
            'password_confirmation' => 'NewPassword123',
        ]);

        $response->assertStatus(410)
            ->assertJson([
                'success' => false,
                'message' => 'انتهت صلاحية اللينك، يرجى طلب لينك جديد',
            ]);
    }
}
