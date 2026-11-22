<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSuperAdmin
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'غير مصرح لك بتنفيذ هذا الإجراء',
            ], 401);
        }

        $isSuperAdmin = $user->companies()->wherePivot('role', 'super_admin')->exists()
            || $user->tokenCan('super_admin');

        if (!$isSuperAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'غير مصرح لك بتنفيذ هذا الإجراء',
            ], 403);
        }

        return $next($request);
    }
}

