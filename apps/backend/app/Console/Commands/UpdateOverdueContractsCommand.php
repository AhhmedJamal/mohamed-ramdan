<?php

namespace App\Console\Commands;

use App\Models\Central\Company;
use App\Models\Tenant\Installment;
use App\Models\Tenant\RentalContract;
use App\Services\NotificationService;
use App\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Console\Command;

class UpdateOverdueContractsCommand extends Command
{
    protected $signature = 'erp:update-overdue-contracts';
    protected $description = 'Daily cron job to transition unpaid past-due installments and contracts to overdue or expired (UC-66, Section 4.3 & 4.4)';

    public function handle(
        TenantManager $tenantManager,
        NotificationService $notificationService
    ): int {
        $this->info('Starting Daily Overdue Contracts Status Transition...');

        $today = Carbon::today()->toDateString();
        $activeCompanies = Company::where('status', 'active')->get();

        foreach ($activeCompanies as $company) {
            $this->info("Processing company: {$company->name} ({$company->subdomain})");
            $tenantManager->switchConnection($company);

            // 1. Transition past-due unpaid installments to 'overdue' (Section 4.4)
            $overdueCount = Installment::where('status', 'due')
                ->where('due_date', '<', $today)
                ->update(['status' => 'overdue']);

            $this->info("Updated {$overdueCount} installments to overdue.");

            // 2. Transition active contracts with overdue installments to 'overdue' (UC-66 & Section 4.3)
            $contractsWithOverdue = RentalContract::with(['tenant', 'installments'])
                ->where('status', 'active')
                ->whereHas('installments', function ($q) {
                    $q->where('status', 'overdue');
                })
                ->get();

            foreach ($contractsWithOverdue as $contract) {
                $contract->update(['status' => 'overdue']);

                $overdueSum = (float)$contract->installments->where('status', 'overdue')->sum('amount');
                $tenantName = $contract->tenant ? $contract->tenant->name : 'المستأجر';

                // Send In-App notification to Manager & Accountant (UC-66)
                $notificationService->notifyContractOverdue(
                    $contract->contract_number,
                    $tenantName,
                    $overdueSum
                );
            }

            // 3. Transition contracts past end date to 'expired' (Section 4.3)
            $expiredCount = RentalContract::whereIn('status', ['active', 'overdue'])
                ->where('end_date', '<', $today)
                ->update(['status' => 'expired']);

            $this->info("Updated {$expiredCount} contracts to expired.");

            $tenantManager->resetToCentral();
        }

        $this->info('Daily Overdue Contracts processing completed successfully.');
        return Command::SUCCESS;
    }
}

