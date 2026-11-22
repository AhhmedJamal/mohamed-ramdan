<?php

namespace App\Console\Commands;

use App\Models\Central\Company;
use App\Models\Tenant\Installment;
use App\Models\Tenant\Notification;
use App\Models\Tenant\RentalContract;
use App\Services\NotificationService;
use App\Services\SmsGatewayService;
use App\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendRentRemindersCommand extends Command
{
    protected $signature = 'erp:send-rent-reminders';
    protected $description = 'Daily cron job to send 7-day advance and due-date rent reminders via SMS and In-App (UC-64, UC-65, UC-69)';

    public function handle(
        TenantManager $tenantManager,
        SmsGatewayService $smsService,
        NotificationService $notificationService
    ): int {
        $this->info('Starting Daily Rent Reminders Cron Job...');

        $today = Carbon::today()->toDateString();
        $in7Days = Carbon::today()->addDays(7)->toDateString();

        $activeCompanies = Company::where('status', 'active')->get();

        foreach ($activeCompanies as $company) {
            $this->info("Processing company: {$company->name} ({$company->subdomain})");
            $tenantManager->switchConnection($company);

            // 1. Advance 7-Day Reminders (UC-64)
            $advanceInstallments = Installment::with(['contract.tenant', 'contract.property', 'contract.unit'])
                ->where('status', 'due')
                ->whereDate('due_date', $in7Days)
                ->get();

            foreach ($advanceInstallments as $inst) {
                $contract = $inst->contract;
                if (!$contract || $contract->status !== 'active') continue;
                $tenant = $contract->tenant;
                if (!$tenant) continue;

                // Idempotency check: avoid sending duplicate alert today for this installment
                $alreadySent = Notification::where('type', 'rent_reminder_7_days')
                    ->where('data->installment_id', $inst->id)
                    ->whereDate('created_at', $today)
                    ->exists();

                if ($alreadySent) continue;

                $remaining = (float)$inst->amount - (float)$inst->paid_amount;
                $msg = "عزيزي المستأجر {$tenant->name}، نود تذكيركم بموعد استحقاق دفعة الإيجار لعقد رقم {$contract->contract_number} بعد 7 أيام بتاريخ {$inst->due_date->format('Y-m-d')} بمبلغ " . number_format($remaining, 2) . " ر.س.";

                // Dispatch SMS
                if ($tenant->mobile) {
                    $smsService->send($tenant->mobile, $msg);
                }

                // In-App Notification log
                $notificationService->notify(
                    'rent_reminder_7_days',
                    'تذكير بموعد استحقاق دفعة إيجار قادمة',
                    $msg,
                    'tenant',
                    null,
                    [
                        'installment_id' => $inst->id,
                        'contract_id' => $contract->id,
                        'due_date' => $inst->due_date->format('Y-m-d'),
                        'amount' => $remaining,
                    ]
                );
            }

            // 2. Due Date Reminders (UC-65)
            $dueDateInstallments = Installment::with(['contract.tenant', 'contract.property', 'contract.unit'])
                ->where('status', 'due')
                ->whereDate('due_date', $today)
                ->get();

            foreach ($dueDateInstallments as $inst) {
                $contract = $inst->contract;
                if (!$contract || $contract->status !== 'active') continue;
                $tenant = $contract->tenant;
                if (!$tenant) continue;

                $alreadySent = Notification::where('type', 'rent_due_today')
                    ->where('data->installment_id', $inst->id)
                    ->whereDate('created_at', $today)
                    ->exists();

                if ($alreadySent) continue;

                $remaining = (float)$inst->amount - (float)$inst->paid_amount;
                $msg = "عزيزي المستأجر {$tenant->name}، نود تذكيركم بأن موعد سداد دفعة الإيجار لعقد رقم {$contract->contract_number} مستحق اليوم بمبلغ " . number_format($remaining, 2) . " ر.س.";

                if ($tenant->mobile) {
                    $smsService->send($tenant->mobile, $msg);
                }

                $notificationService->notify(
                    'rent_due_today',
                    'تنبيه: دفعة إيجار مستحقة السداد اليوم',
                    $msg,
                    'tenant',
                    null,
                    [
                        'installment_id' => $inst->id,
                        'contract_id' => $contract->id,
                        'due_date' => $today,
                        'amount' => $remaining,
                    ]
                );
            }

            $tenantManager->resetToCentral();
        }

        $this->info('Daily Rent Reminders completed successfully.');
        return Command::SUCCESS;
    }
}
