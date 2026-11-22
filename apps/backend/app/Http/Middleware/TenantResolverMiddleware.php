<?php

namespace App\Http\Middleware;

use App\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TenantResolverMiddleware
{
    public function __construct(
        protected TenantManager $tenantManager
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        // Check for subdomain in Host, or explicit header X-Tenant-Subdomain or X-Tenant-ID
        $subdomain = $this->extractSubdomain($request);

        if (!$subdomain) {
            // For general public or admin routes without tenant context, continue on central
            return $next($request);
        }

        $company = $this->tenantManager->resolveBySubdomain($subdomain);

        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'الشركة غير موجودة في النظام',
            ], 404);
        }

        // Frozen Company Enforcement (AD-02)
        if ($company->isFrozen()) {
            return response()->json([
                'success' => false,
                'message' => 'الشركة مجمدة، يرجى مراجعة الإدارة',
            ], 403);
        }

        // Switch to tenant database
        $this->tenantManager->switchConnection($company);
        $request->attributes->set('current_company', $company);

        $response = $next($request);

        // Reset default connection back to central after response completes
        $this->tenantManager->resetToCentral();

        return $response;
    }

    protected function extractSubdomain(Request $request): ?string
    {
        // Central management, admin, auth, profile and employee routes must remain on central connection
        $path = $request->path();
        if (str_starts_with($path, 'api/auth') ||
            str_starts_with($path, 'api/admin') ||
            str_starts_with($path, 'api/profile') ||
            str_starts_with($path, 'api/company/employees')) {
            return null;
        }

        // 1. Check direct headers (useful for APIs and tests)
        if ($request->hasHeader('X-Tenant-Subdomain')) {
            return $request->header('X-Tenant-Subdomain');
        }

        // 2. Check query parameter (optional fallback)
        if ($request->query('subdomain')) {
            return $request->query('subdomain');
        }

        // 3. Extract from host (e.g. comp1.ehkam.com -> comp1)
        $host = $request->getHost();

        // If IP address (e.g. 127.0.0.1) or localhost, never extract subdomain from IP octets
        if (filter_var($host, FILTER_VALIDATE_IP) || $host === 'localhost' || str_ends_with($host, '.local')) {
            return null;
        }

        $parts = explode('.', $host);

        // If domain has subdomain format like comp1.domain.com
        if (count($parts) >= 3 && !in_array($parts[0], ['www', 'api', 'admin'])) {
            return $parts[0];
        }

        // 4. Fallback to authenticated user's company
        if ($request->user() && $company = $request->user()->companies()->first()) {
            return $company->subdomain;
        }

        return null;
    }
}
