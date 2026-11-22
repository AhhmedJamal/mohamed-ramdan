<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\FiscalPeriod;
use App\Models\Tenant\FiscalYear;
use App\Services\FiscalPeriodService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class FiscalYearController extends Controller
{
    public function __construct(
        protected FiscalPeriodService $fiscalPeriodService
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
     * List all fiscal years with their periods (UC-24)
     */
    public function index(Request $request): JsonResponse
    {
        $years = FiscalYear::with(['periods' => function ($q) {
            $q->orderBy('period_number', 'asc');
        }])->orderBy('start_date', 'desc')->get();

        $enriched = $years->map(function ($fy) {
            $data = $fy->toArray();
            $data['status_label'] = $fy->status === 'open' ? 'مفتوحة' : 'مغلقة';
            $data['periods_count'] = $fy->periods->count();
            $data['open_periods_count'] = $fy->periods->where('status', 'open')->count();
            $data['closed_periods_count'] = $fy->periods->where('status', 'closed')->count();
            return $data;
        });

        return response()->json([
            'success' => true,
            'fiscal_years' => $enriched,
        ], 200);
    }

    /**
     * Get single fiscal year with its periods
     */
    public function show($id): JsonResponse
    {
        $fiscalYear = FiscalYear::with(['periods' => function ($q) {
            $q->orderBy('period_number', 'asc');
        }])->find($id);

        if (!$fiscalYear) {
            return response()->json(['message' => 'السنة المالية غير موجودة'], 404);
        }

        $data = $fiscalYear->toArray();
        $data['status_label'] = $fiscalYear->status === 'open' ? 'مفتوحة' : 'مغلقة';

        return response()->json([
            'success' => true,
            'fiscal_year' => $data,
        ], 200);
    }

    /**
     * Create new fiscal year and auto-generate 12 monthly periods (UC-24)
     */
    public function store(Request $request): JsonResponse
    {
        if (!$this->authorizeAccountant($request)) {
            return response()->json(['message' => 'غير مصرح لك بإدارة السنوات المالية'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:3|max:100',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
        ], [
            'name.required' => 'اسم السنة المالية إلزامي',
            'start_date.required' => 'تاريخ البداية إلزامي',
            'end_date.required' => 'تاريخ النهاية إلزامي',
            'end_date.after' => 'تاريخ النهاية يجب أن يكون أكبر من تاريخ البداية',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check for date overlap with existing fiscal years
        $overlap = FiscalYear::where(function ($q) use ($request) {
            $q->whereBetween('start_date', [$request->start_date, $request->end_date])
              ->orWhereBetween('end_date', [$request->start_date, $request->end_date])
              ->orWhere(function ($sub) use ($request) {
                  $sub->where('start_date', '<=', $request->start_date)
                      ->where('end_date', '>=', $request->end_date);
              });
        })->exists();

        if ($overlap) {
            return response()->json(['message' => 'توجد سنة مالية أخرى تغطي نفس الفترة الزمنية'], 422);
        }

        // Create Fiscal Year
        $fiscalYear = FiscalYear::create([
            'name' => $request->name,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'status' => 'open',
        ]);

        // Auto-provision 12 monthly periods
        $startDate = Carbon::parse($request->start_date);
        $endDate = Carbon::parse($request->end_date);

        for ($i = 1; $i <= 12; $i++) {
            $periodStart = (clone $startDate)->addMonths($i - 1)->startOfMonth();
            // Bound first period start to the year's actual start date
            if ($i === 1 && $startDate->greaterThan($periodStart)) {
                $periodStart = clone $startDate;
            }

            $periodEnd = (clone $periodStart)->endOfMonth();
            // Bound last period end to the year's actual end date
            if ($i === 12 || $periodEnd->greaterThan($endDate)) {
                $periodEnd = clone $endDate;
            }

            FiscalPeriod::create([
                'fiscal_year_id' => $fiscalYear->id,
                'period_number' => $i,
                'start_date' => $periodStart->toDateString(),
                'end_date' => $periodEnd->toDateString(),
                'status' => 'open',
            ]);
        }

        return response()->json([
            'message' => 'تم إنشاء السنة المالية وتوليد 12 فترة محاسبية بنجاح',
            'fiscal_year' => $fiscalYear->load('periods'),
        ], 201);
    }

    /**
     * Toggle status of a specific fiscal period (Open / Closed)
     */
    public function togglePeriodStatus(Request $request, $fiscalYearId, $periodId): JsonResponse
    {
        if (!$this->authorizeAccountant($request)) {
            return response()->json(['message' => 'غير مصرح لك بإغلاق الفترات المالية'], 403);
        }

        $fiscalYear = FiscalYear::find($fiscalYearId);
        if (!$fiscalYear) {
            return response()->json(['message' => 'السنة المالية غير موجودة'], 404);
        }

        if ($fiscalYear->status === 'closed') {
            return response()->json(['message' => 'السنة المالية مغلقة بالكامل ولا يمكن تعديل فتراتها'], 422);
        }

        $period = FiscalPeriod::where('fiscal_year_id', $fiscalYear->id)->find($periodId);
        if (!$period) {
            return response()->json(['message' => 'الفترة المحاسبية غير موجودة'], 404);
        }

        $period->status = $period->status === 'open' ? 'closed' : 'open';
        $period->save();

        return response()->json([
            'message' => $period->status === 'closed' ? 'تم إغلاق الفترة المحاسبية بنجاح' : 'تم إعادة فتح الفترة المحاسبية',
            'period' => $period,
        ], 200);
    }

    /**
     * Check if a proposed transaction date is open or locked
     */
    public function checkDateLock(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'date' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $this->fiscalPeriodService->validateDateIsOpen($request->date);
            return response()->json([
                'is_open' => true,
                'message' => 'الفترة المالية مفتوحة وتقبل القيود',
            ], 200);
        } catch (ValidationException $e) {
            return response()->json([
                'is_open' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}

