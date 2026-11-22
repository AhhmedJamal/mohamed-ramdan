<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\Company;
use App\Models\Central\User;
use App\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    protected TenantManager $tenantManager;

    public function __construct(TenantManager $tenantManager)
    {
        $this->tenantManager = $tenantManager;
    }

    /**
     * Consolidated Dashboard Metrics across all Active Operating Entities (UC-11)
     */
    public function metrics(Request $request): JsonResponse
    {
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $companyId = $request->query('company_id');
        $managerId = $request->query('manager_id');

        // 1. Company Counts
        $activeCompaniesCount = Company::where('status', 'active')->count();
        $frozenCompaniesCount = Company::where('status', 'frozen')->count();

        // 2. Query Active Companies strictly (UC-11 Business Rule: Active companies only)
        $query = Company::where('status', 'active');

        if ($companyId && $companyId !== 'all') {
            $query->where('id', $companyId);
        }

        if ($managerId && $managerId !== 'all') {
            $query->whereHas('users', function ($q) use ($managerId) {
                $q->where('users.id', $managerId)->where('is_primary_manager', true);
            });
        }

        $activeCompanies = $query->with(['users' => function ($q) {
            $q->wherePivot('is_primary_manager', true);
        }])->get();

        $entityBreakdown = [];

        // 3. Programmatically iterate over each active company database (multi-tenant safe isolation)
        foreach ($activeCompanies as $company) {
            $this->tenantManager->switchConnection($company);

            $voucherQuery = DB::connection('tenant')->table('vouchers')
                ->where('status', 'approved');

            if ($startDate) {
                $voucherQuery->where('date', '>=', $startDate);
            }
            if ($endDate) {
                $voucherQuery->where('date', '<=', $endDate);
            }

            // Receipts = Revenue
            $revenue = (clone $voucherQuery)
                ->where('type', 'receipt')
                ->sum('amount');

            // Disbursements = Expenses
            $expenses = (clone $voucherQuery)
                ->where('type', 'disbursement')
                ->sum('amount');

            $manager = $company->users->first();

            $entityBreakdown[] = [
                'company_id' => $company->id,
                'company_name' => $company->name,
                'subdomain' => $company->subdomain,
                'manager_name' => $manager?->name ?? 'غير محدد',
                'revenue' => (float) $revenue,
                'expenses' => (float) $expenses,
                'net_profit' => (float) ($revenue - $expenses),
            ];
        }

        // Reset connection back to central
        $this->tenantManager->resetToCentral();

        // 4. Group Totals
        $totalRevenue = array_sum(array_column($entityBreakdown, 'revenue'));
        $totalExpenses = array_sum(array_column($entityBreakdown, 'expenses'));
        $netProfit = $totalRevenue - $totalExpenses;

        // 5. Filter Dropdown Options
        $allCompanies = Company::select('id', 'name', 'status')->get();
        $allManagers = User::whereHas('companies', function ($q) {
            $q->where('is_primary_manager', true);
        })->select('id', 'name')->get();

        return response()->json([
            'success' => true,
            'data' => [
                'metrics' => [
                    'total_revenue' => (float) $totalRevenue,
                    'total_expenses' => (float) $totalExpenses,
                    'net_profit' => (float) $netProfit,
                    'active_companies_count' => $activeCompaniesCount,
                    'frozen_companies_count' => $frozenCompaniesCount,
                ],
                'entity_breakdown' => $entityBreakdown,
                'filters' => [
                    'companies' => $allCompanies,
                    'managers' => $allManagers,
                ],
            ],
        ]);
    }
}

