<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\Company;
use App\Models\Central\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    /**
     * User Login (UC-01)
     * Handles authentication for all 4 roles: Super Admin, Branch Manager, General Accountant, Data Entry
     */
    public function login(Request $request): JsonResponse
    {
        // 1. Validation per SRS UC-01
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email', 'max:100'],
            'password' => ['required', 'string', 'min:8', 'max:25'],
        ], [
            'email.required' => 'يرجى إدخال بريد إلكتروني صحيح',
            'email.email' => 'يرجى إدخال بريد إلكتروني صحيح',
            'email.max' => 'يرجى إدخال بريد إلكتروني صحيح',
            'password.required' => 'يرجى إدخال كلمة المرور',
            'password.min' => 'يرجى إدخال كلمة المرور',
            'password.max' => 'يرجى إدخال كلمة المرور',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $email = $request->input('email');
        $password = $request->input('password');

        // 2. Fetch user from central DB
        $user = User::where('email', $email)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'بيانات الدخول غير صحيحة',
            ], 401);
        }

        // 3. Check Lockout Status (UC-01 Business Rule: 15-minute lockout after 5 failed attempts)
        if ($user->isLockedOut()) {
            return response()->json([
                'success' => false,
                'message' => 'تم تعليق الحساب مؤقتاً لمدة 15 دقيقة بسبب تكرار المحاولات الخاطئة',
                'lockout_until' => $user->lockout_until->toIso8601String(),
            ], 429);
        }

        // 4. Check Account Status (Alternative 2: Deactivated or deleted account)
        if ($user->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'لا يمكن الوصول إلى الحساب',
            ], 403);
        }

        // 5. Verify Password
        if (!Hash::check($password, $user->password)) {
            $user->increment('failed_login_attempts');

            if ($user->failed_login_attempts >= 5) {
                $user->update([
                    'lockout_until' => now()->addMinutes(15),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'تم تعليق الحساب مؤقتاً لمدة 15 دقيقة بسبب تكرار المحاولات الخاطئة',
                    'lockout_until' => $user->lockout_until->toIso8601String(),
                ], 429);
            }

            return response()->json([
                'success' => false,
                'message' => 'بيانات الدخول غير صحيحة',
                'remaining_attempts' => max(0, 5 - $user->failed_login_attempts),
            ], 401);
        }

        // 6. Reset failed attempts on successful password verification
        $user->update([
            'failed_login_attempts' => 0,
            'lockout_until' => null,
        ]);

        // 7. Resolve User Role & Associated Company
        $requestedSubdomain = $request->header('X-Tenant-Subdomain') ?? $request->query('subdomain');
        $companies = $user->companies()->get();

        $primaryCompany = null;
        $role = null;

        // Check if user is Super Admin across any company
        $isSuperAdmin = $companies->contains(function ($c) {
            return $c->pivot->role === 'super_admin';
        });

        if ($isSuperAdmin) {
            $role = 'super_admin';
            $redirectUrl = '/admin/dashboard';
        } else {
            // Find company matching subdomain or default to first company
            if ($requestedSubdomain) {
                $primaryCompany = $companies->firstWhere('subdomain', $requestedSubdomain);
            } else {
                $primaryCompany = $companies->first();
            }

            if (!$primaryCompany) {
                return response()->json([
                    'success' => false,
                    'message' => 'لا يمكن الوصول إلى الحساب',
                ], 403);
            }

            // Check if Company is Frozen
            if ($primaryCompany->status === 'frozen') {
                return response()->json([
                    'success' => false,
                    'error_code' => 'COMPANY_FROZEN',
                    'message' => 'الشركة مجمدة، يرجى مراجعة الإدارة',
                ], 403);
            }

            $role = $primaryCompany->pivot->role;

            $roleRedirects = [
                'branch_manager' => '/company/dashboard',
                'general_accountant' => '/accounting/dashboard',
                'data_entry' => '/data-entry/dashboard',
            ];

            $redirectUrl = $roleRedirects[$role] ?? '/company/dashboard';
        }

        // 8. Generate Sanctum Personal Access Token
        $token = $user->createToken('auth_token', [$role])->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'تم تسجيل الدخول بنجاح',
            'data' => [
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'mobile' => $user->mobile,
                    'role' => $role,
                    'redirect_url' => $redirectUrl,
                ],
                'company' => $primaryCompany ? [
                    'id' => $primaryCompany->id,
                    'uuid' => $primaryCompany->uuid,
                    'name' => $primaryCompany->name,
                    'subdomain' => $primaryCompany->subdomain,
                    'status' => $primaryCompany->status,
                ] : null,
            ],
        ]);
    }

    /**
     * Get Current Authenticated User (UC-04)
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $companies = $user->companies()->get();

        $isSuperAdmin = $companies->contains(function ($c) {
            return $c->pivot->role === 'super_admin';
        });

        $role = $isSuperAdmin ? 'super_admin' : ($companies->first()?->pivot?->role ?? 'user');
        $primaryCompany = $companies->first();

        $roleRedirects = [
            'super_admin' => '/admin/dashboard',
            'branch_manager' => '/company/dashboard',
            'general_accountant' => '/accounting/dashboard',
            'data_entry' => '/data-entry/dashboard',
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'mobile' => $user->mobile,
                    'profile_picture' => $user->profile_picture,
                    'role' => $role,
                    'redirect_url' => $roleRedirects[$role] ?? '/company/dashboard',
                ],
                'company' => $primaryCompany ? [
                    'id' => $primaryCompany->id,
                    'uuid' => $primaryCompany->uuid,
                    'name' => $primaryCompany->name,
                    'subdomain' => $primaryCompany->subdomain,
                    'status' => $primaryCompany->status,
                ] : null,
            ],
        ]);
    }

    /**
     * User Logout (UC-04)
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'تم تسجيل الخروج بنجاح',
        ]);
    }
}

