<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforceActiveUserAndCompany
{
    /**
     * Handle an incoming request.
     * Enforces UC-01, UC-09, UC-15 and NFR-003:
     * 1. Inactive users are immediately rejected (HTTP 403) and all tokens revoked.
     * 2. Non-super-admin users belonging to a frozen company are immediately rejected (HTTP 403) and tokens revoked.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return $next($request);
        }

        // 1. Check if User account is active (UC-15)
        if ($user->status !== 'active') {
            $user->tokens()->delete();

            return response()->json([
                'success' => false,
                'error_code' => 'USER_INACTIVE',
                'message' => 'لا يمكن الوصول إلى الحساب، تم تعطيل حساب المستخدم',
            ], 403);
        }

        // 2. Check if user is Super Admin (Super admins are never blocked by tenant company freezes)
        $isSuperAdmin = $user->companies()->wherePivot('role', 'super_admin')->exists()
            || $user->tokenCan('super_admin');

        if ($isSuperAdmin) {
            return $next($request);
        }

        // 3. For tenant users, verify their associated company is not frozen (UC-09, NFR-003)
        $subdomain = $request->header('X-Tenant-Subdomain') ?? $request->query('subdomain');
        $companies = $user->companies;

        if ($subdomain) {
            $company = $companies->firstWhere('subdomain', $subdomain);
        } else {
            $company = $companies->first();
        }

        if ($company && $company->status === 'frozen') {
            $user->tokens()->delete();

            return response()->json([
                'success' => false,
                'error_code' => 'COMPANY_FROZEN',
                'message' => 'حساب الشركة مجمد حالياً، يرجى مراجعة إدارة المجموعة',
            ], 403);
        }

        return $next($request);
    }
}

