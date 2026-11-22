<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Services\FinancialReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FinancialReportController extends Controller
{
    protected FinancialReportService $reportService;

    public function __construct(FinancialReportService $reportService)
    {
        $this->reportService = $reportService;
    }

    /**
     * Authorize General Accountant or Branch Manager
     */
    protected function authorizeViewer(Request $request): bool
    {
        $user = $request->user();
        if (!$user) return false;

        $subdomain = $request->header('X-Tenant-Subdomain') ?? $request->query('subdomain');
        $role = $user->getRoleForCompany($subdomain);

        return in_array($role, ['general_accountant', 'branch_manager', 'super_admin']);
    }

    /**
     * UC-56: Trial Balance (ميزان المراجعة)
     */
    public function trialBalance(Request $request): JsonResponse
    {
        if (!$this->authorizeViewer($request)) {
            return response()->json(['status' => 'error', 'message' => 'غير مصرح لك بعرض ميزان المراجعة'], 403);
        }

        $data = $this->reportService->getTrialBalance(
            $request->query('fiscal_year_id'),
            $request->query('from_date'),
            $request->query('to_date')
        );

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * UC-57: General Ledger (دفتر الأستاذ العام)
     */
    public function generalLedger(Request $request): JsonResponse
    {
        if (!$this->authorizeViewer($request)) {
            return response()->json(['status' => 'error', 'message' => 'غير مصرح لك بعرض دفتر الأستاذ العام'], 403);
        }

        $accountId = (int)$request->query('account_id');
        if (!$accountId) {
            return response()->json(['status' => 'error', 'message' => 'يرجى اختيار الحساب المطلوب'], 422);
        }

        $counterAccountId = $request->filled('counter_account_id') ? (int)$request->query('counter_account_id') : null;

        $data = $this->reportService->getGeneralLedger(
            $accountId,
            $counterAccountId,
            $request->query('from_date'),
            $request->query('to_date')
        );

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * UC-57 (Part 2): Balance Sheet (الميزانية العمومية)
     */
    public function balanceSheet(Request $request): JsonResponse
    {
        if (!$this->authorizeViewer($request)) {
            return response()->json(['status' => 'error', 'message' => 'غير مصرح لك بعرض الميزانية العمومية'], 403);
        }

        $data = $this->reportService->getBalanceSheet(
            $request->query('as_of_date'),
            $request->query('fiscal_year_id')
        );

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * UC-58: Income Statement (قائمة الدخل)
     */
    public function incomeStatement(Request $request): JsonResponse
    {
        if (!$this->authorizeViewer($request)) {
            return response()->json(['status' => 'error', 'message' => 'غير مصرح لك بعرض قائمة الدخل'], 403);
        }

        $data = $this->reportService->getIncomeStatement(
            $request->query('from_date'),
            $request->query('to_date'),
            $request->query('fiscal_year_id')
        );

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * UC-59: Per-Building Income Statement (قائمة الدخل لكل عمارة)
     */
    public function buildingIncomeStatement(Request $request): JsonResponse
    {
        if (!$this->authorizeViewer($request)) {
            return response()->json(['status' => 'error', 'message' => 'غير مصرح لك بعرض قائمة الدخل للعمارة'], 403);
        }

        $costCenterId = (int)$request->query('cost_center_id');
        if (!$costCenterId) {
            return response()->json(['status' => 'error', 'message' => 'يرجى اختيار مركز التكلفة (العمارة)'], 422);
        }

        $data = $this->reportService->getBuildingIncomeStatement(
            $costCenterId,
            $request->query('from_date'),
            $request->query('to_date')
        );

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * UC-60: Export report to CSV/Excel stream
     */
    public function export(Request $request): StreamedResponse|JsonResponse
    {
        if (!$this->authorizeViewer($request)) {
            return response()->json(['status' => 'error', 'message' => 'غير مصرح لك بتصدير التقارير'], 403);
        }

        $type = $request->query('report_type', 'trial_balance');
        $fileName = "report_{$type}_" . date('Ymd_His') . ".csv";

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($type, $request) {
            $handle = fopen('php://output', 'w');
            // Add UTF-8 BOM for Arabic text in Excel
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            if ($type === 'trial_balance') {
                $tb = $this->reportService->getTrialBalance(
                    $request->query('fiscal_year_id'),
                    $request->query('from_date'),
                    $request->query('to_date')
                );
                fputcsv($handle, ['رمز الحساب', 'اسم الحساب', 'طبيعة الحساب', 'مدين افتتاحي', 'دائن افتتاحي', 'مدين الفترة', 'دائن الفترة', 'الرصيد المدين', 'الرصيد الدائن']);
                foreach ($tb['accounts'] as $row) {
                    fputcsv($handle, [
                        $row['code'],
                        $row['name'],
                        $row['nature'],
                        $row['opening_debit'],
                        $row['opening_credit'],
                        $row['period_debit'],
                        $row['period_credit'],
                        $row['ending_debit'],
                        $row['ending_credit'],
                    ]);
                }
                $totals = $tb['totals'];
                fputcsv($handle, [
                    'الإجماليات',
                    '',
                    '',
                    $totals['opening_debit'],
                    $totals['opening_credit'],
                    $totals['period_debit'],
                    $totals['period_credit'],
                    $totals['ending_debit'],
                    $totals['ending_credit'],
                ]);
            }

            fclose($handle);
        }, 200, $headers);
    }
}

