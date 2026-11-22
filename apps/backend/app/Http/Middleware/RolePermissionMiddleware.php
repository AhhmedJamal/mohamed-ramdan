<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RolePermissionMiddleware
{
    /**
     * Enforce Section 1.6 CRUD Permission Matrix
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string  ...$roles Allowed roles (e.g. 'general_accountant', 'branch_manager')
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'غير مصرح لك، يرجى تسجيل الدخول',
            ], 401);
        }

        $tokenAbility = $user->currentAccessToken()?->abilities[0] ?? null;
        $subdomain = $request->header('X-Tenant-Subdomain') ?? $request->query('subdomain');
        $userRole = ($tokenAbility && $tokenAbility !== '*') ? $tokenAbility : $user->getRoleForCompany($subdomain);

        // Super Admin always bypasses tenant role restrictions
        $isSuperAdmin = $userRole === 'super_admin' 
            || $tokenAbility === 'super_admin' 
            || ($user->companies()->wherePivot('role', 'super_admin')->exists());

        if ($isSuperAdmin) {
            return $next($request);
        }

        if (empty($roles) || in_array($userRole, $roles)) {
            return $next($request);
        }

        return response()->json([
            'success' => false,
            'error_code' => 'FORBIDDEN_ROLE',
            'message' => 'غير مصرح لك بالوصول إلى هذه الوحدة الوظيفية وفقاً لمصفوفة الصلاحيات (Section 1.6)',
            'required_roles' => $roles,
            'current_role' => $userRole,
        ], 403);
    }
}
