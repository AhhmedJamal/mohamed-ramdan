<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    /**
     * Get Current User Profile (UC-05)
     */
    public function getProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $companies = $user->companies()->get();

        $isSuperAdmin = $companies->contains(function ($c) {
            return $c->pivot->role === 'super_admin';
        });

        $role = $isSuperAdmin ? 'super_admin' : ($companies->first()?->pivot?->role ?? 'user');
        $primaryCompany = $companies->first();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'mobile' => $user->mobile,
                'profile_picture' => $user->profile_picture,
                'role' => $role,
                'company' => $primaryCompany ? [
                    'id' => $primaryCompany->id,
                    'name' => $primaryCompany->name,
                    'subdomain' => $primaryCompany->subdomain,
                    'status' => $primaryCompany->status,
                ] : null,
            ],
        ]);
    }

    /**
     * Update Profile Data (UC-05)
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        // 1. Validation per SRS UC-05
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'min:3', 'max:100'],
            'mobile' => [
                'required',
                'string',
                'regex:/^05[0-9]{8}$/',
                Rule::unique('users', 'mobile')->ignore($user->id),
            ],
            'profile_picture' => ['nullable', 'image', 'mimes:jpeg,png,jpg', 'max:5120'],
        ], [
            'name.required' => 'يرجى إدخال الاسم',
            'name.min' => 'الاسم يجب ألا يقل عن 3 أحرف',
            'name.max' => 'الاسم يجب ألا يزيد عن 100 حرف',
            'mobile.required' => 'يرجى إدخال رقم الجوال',
            'mobile.regex' => 'رقم الجوال يجب أن يتكون من 10 أرقام ويبدأ بـ 05',
            'mobile.unique' => 'رقم الجوال مستخدم بالفعل',
            'profile_picture.image' => 'الصورة الشخصية يجب أن تكون ملف صورة صالح',
            'profile_picture.max' => 'حجم الصورة لا يجب أن يتجاوز 5 ميجابايت',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $oldMobile = $user->mobile;
        $newMobile = $request->input('mobile');

        $user->name = $request->input('name');
        $user->mobile = $newMobile;

        // Handle profile picture upload
        if ($request->hasFile('profile_picture')) {
            $path = $request->file('profile_picture')->store('profiles', 'public');
            $user->profile_picture = $path;
        }

        $user->save();

        // Business Rule: Notification when mobile changes
        if ($oldMobile !== $newMobile) {
            DB::connection('central')->table('notification_logs')->insert([
                'company_id' => $user->companies()->first()?->id ?? 1,
                'channel' => 'sms',
                'recipient' => $newMobile,
                'subject' => 'تحديث رقم الجوال',
                'message' => 'تم تحديث رقم الجوال الخاص بحسابكم في نظام مجموعة محمد رمضان بنجاح',
                'status' => 'sent',
                'dispatched_at' => Carbon::now(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث الملف الشخصي بنجاح',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'mobile' => $user->mobile,
                'profile_picture' => $user->profile_picture,
            ],
        ]);
    }

    /**
     * Change Password from Profile & Terminate All Active Sessions (UC-06)
     */
    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        // 1. Validation per SRS UC-06
        $validator = Validator::make($request->all(), [
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'max:25'],
            'new_password_confirmation' => ['required', 'same:new_password'],
        ], [
            'current_password.required' => 'يرجى إدخال كلمة المرور الحالية',
            'new_password.required' => 'يرجى إدخال كلمة المرور',
            'new_password.min' => 'يرجى إدخال كلمة المرور',
            'new_password.max' => 'يرجى إدخال كلمة المرور',
            'new_password_confirmation.required' => 'يرجى تأكيد كلمة المرور',
            'new_password_confirmation.same' => 'كلمات المرور غير متطابقة',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        // 2. Alternative 1: Verify Current Password
        if (!Hash::check($request->input('current_password'), $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'كلمة المرور الحالية غير صحيحة',
            ], 400);
        }

        // 3. Update Password
        $user->password = Hash::make($request->input('new_password'));
        $user->save();

        // 4. Critical Business Rule (UC-06): Multi-Device Eviction
        // Terminate ALL active sessions / personal access tokens across all devices
        $user->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'تم تغيير كلمة المرور بنجاح، تم إنهاء جميع الجلسات النشطة، يرجى تسجيل الدخول مجدداً',
        ]);
    }
}

