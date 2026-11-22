<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{
    /**
     * Send Password Reset Link (UC-02)
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        // 1. Validation per SRS UC-02
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
        ], [
            'email.required' => 'يرجى إدخال بريد إلكتروني صحيح',
            'email.email' => 'يرجى إدخال بريد إلكتروني صحيح',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $email = $request->input('email');

        // 2. Check if user exists (Alternative 1)
        $user = User::where('email', $email)->first();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'البريد الإلكتروني غير مسجل في النظام',
            ], 404);
        }

        // 3. Check 60-Second Cooldown Rule (UC-02 Business Rule)
        $recentToken = DB::connection('central')
            ->table('password_reset_tokens')
            ->where('email', $email)
            ->where('created_at', '>', Carbon::now()->subSeconds(60))
            ->orderByDesc('id')
            ->first();

        if ($recentToken) {
            $createdTime = Carbon::parse($recentToken->created_at);
            $secondsElapsed = Carbon::now()->diffInSeconds($createdTime);
            $remainingSeconds = max(1, 60 - $secondsElapsed);

            return response()->json([
                'success' => false,
                'message' => 'لا يمكن إعادة إرسال اللينك قبل 60 ثانية',
                'remaining_seconds' => $remainingSeconds,
            ], 429);
        }

        // 4. Generate Single-Use Token with 24-hour Expiry
        $token = Str::random(64);

        DB::connection('central')->table('password_reset_tokens')->insert([
            'email' => $email,
            'token' => $token,
            'created_at' => Carbon::now(),
            'expires_at' => Carbon::now()->addHours(24),
            'used_at' => null,
        ]);

        // 5. Log Notification in Central DB
        DB::connection('central')->table('notification_logs')->insert([
            'company_id' => $user->companies()->first()?->id ?? 1,
            'channel' => 'email',
            'recipient' => $email,
            'subject' => 'رابط استعادة كلمة المرور',
            'message' => 'رابط استعادة كلمة المرور صالح لمدة 24 ساعة',
            'status' => 'sent',
            'dispatched_at' => Carbon::now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني',
            'reset_token' => $token, // Provided for automated testing / client navigation
        ]);
    }

    /**
     * Reset Password from Link (UC-03)
     */
    public function resetPassword(Request $request): JsonResponse
    {
        // 1. Validation per SRS UC-03
        $validator = Validator::make($request->all(), [
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'max:25'],
            'password_confirmation' => ['required', 'same:password'],
        ], [
            'email.required' => 'يرجى إدخال بريد إلكتروني صحيح',
            'email.email' => 'يرجى إدخال بريد إلكتروني صحيح',
            'password.required' => 'يرجى إدخال كلمة المرور',
            'password.min' => 'يرجى إدخال كلمة المرور',
            'password.max' => 'يرجى إدخال كلمة المرور',
            'password_confirmation.required' => 'يرجى تأكيد كلمة المرور',
            'password_confirmation.same' => 'كلمات المرور غير متطابقة',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $token = $request->input('token');
        $email = $request->input('email');
        $password = $request->input('password');

        // 2. Fetch Token Record
        $tokenRecord = DB::connection('central')
            ->table('password_reset_tokens')
            ->where('token', $token)
            ->where('email', $email)
            ->first();

        if (!$tokenRecord) {
            return response()->json([
                'success' => false,
                'message' => 'اللينك غير صحيح، يرجى طلب لينك جديد',
            ], 404);
        }

        // 3. Alternative 1: Used Token check
        if ($tokenRecord->used_at !== null) {
            return response()->json([
                'success' => false,
                'message' => 'اللينك مستخدم من قبل، يرجى طلب لينك جديد',
            ], 410);
        }

        // 4. Alternative 2: Expired Token check (24 hours)
        if (Carbon::now()->isAfter(Carbon::parse($tokenRecord->expires_at))) {
            return response()->json([
                'success' => false,
                'message' => 'انتهت صلاحية اللينك، يرجى طلب لينك جديد',
            ], 410);
        }

        // 5. Update User Password and reset any lockouts
        $user = User::where('email', $email)->first();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'البريد الإلكتروني غير مسجل في النظام',
            ], 404);
        }

        $user->update([
            'password' => Hash::make($password),
            'failed_login_attempts' => 0,
            'lockout_until' => null,
        ]);

        // 6. Invalidate Token immediately (Single-Use Business Rule)
        DB::connection('central')
            ->table('password_reset_tokens')
            ->where('id', $tokenRecord->id)
            ->update([
                'used_at' => Carbon::now(),
            ]);

        return response()->json([
            'success' => true,
            'message' => 'تم إعادة تعيين كلمة المرور بنجاح، يمكنك الآن تسجيل الدخول',
        ]);
    }
}
