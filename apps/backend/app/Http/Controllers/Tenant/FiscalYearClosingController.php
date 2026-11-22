<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\FiscalYear;
use App\Services\FiscalYearClosingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class FiscalYearClosingController extends Controller
{
    public function __construct(
        protected FiscalYearClosingService $closingService
    ) {}

    protected function authorizeAccountant(Request $request): bool
    {
        $user = $request->user();
        if (!$user) {
            return false;
        }

        $subdomain = $request->header('X-Tenant-Subdomain') ?? $request->query('subdomain');
        $role = $user->getRoleForCompany($subdomain);

        return in_array($role, ['general_accountant', 'super_admin']);
    }

    /**
     * Get closing financial summary for a fiscal year (UC-61)
     */
    public function getSummary(Request $request, $id): JsonResponse
    {
        $fiscalYear = FiscalYear::find($id);
        if (!$fiscalYear) {
            return response()->json(['message' => 'السنة المالية غير موجودة'], 404);
        }

        $summary = $this->closingService->computeSummary($fiscalYear);

        return response()->json([
            'success' => true,
            'summary' => $summary,
        ], 200);
    }

    /**
     * Execute fiscal year-end closing and balance rollover (UC-61)
     */
    public function closeYear(Request $request, $id): JsonResponse
    {
        if (!$this->authorizeAccountant($request)) {
            return response()->json(['message' => 'غير مصرح لك بإغلاق السنة المالية'], 403);
        }

        $fiscalYear = FiscalYear::find($id);
        if (!$fiscalYear) {
            return response()->json(['message' => 'السنة المالية غير موجودة'], 404);
        }

        try {
            $result = $this->closingService->closeYear($fiscalYear, $request->user()->id);

            return response()->json([
                'success' => true,
                'message' => 'تم إغلاق السنة المالية وترصيد الأرباح والخسائر بنجاح',
                'data' => $result,
            ], 200);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        }
    }
}

