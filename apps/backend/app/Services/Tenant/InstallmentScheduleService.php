<?php

namespace App\Services\Tenant;

use App\Models\Tenant\Installment;
use App\Models\Tenant\RentalContract;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class InstallmentScheduleService
{
    /**
     * Map cycle to month interval
     */
    public static function getCycleIntervalMonths(string $cycle): int
    {
        return match ($cycle) {
            'monthly' => 1,
            'quarterly' => 3,
            'semi_annual' => 6,
            'annual' => 12,
            default => 1,
        };
    }

    /**
     * Calculate number of cycle periods in contract duration
     */
    public static function getPeriodsCount(int $durationMonths, string $cycle): int
    {
        $interval = self::getCycleIntervalMonths($cycle);
        return max(1, (int) ceil($durationMonths / $interval));
    }

    /**
     * Generate installment rows for a contract (UC-38)
     */
    public static function generateSchedule(RentalContract $contract, ?string $explicitFirstDueDate = null): Collection
    {
        // Remove any existing unpaid installments if recalculating (UC-39)
        $contract->installments()->where('status', 'due')->delete();

        $startDate = Carbon::parse($contract->start_date);
        $totalRent = (float) $contract->total_rent;
        $firstPayment = (float) ($contract->first_payment ?? 0);
        $cycle = $contract->collection_cycle;
        $intervalMonths = self::getCycleIntervalMonths($cycle);
        $durationMonths = (int) $contract->duration_months;
        $totalPeriods = self::getPeriodsCount($durationMonths, $cycle);

        $createdInstallments = collect();
        $runningTotal = 0.0;

        if ($firstPayment > 0) {
            // Installment 1: advance first payment on contract start date
            $inst1 = Installment::create([
                'contract_id' => $contract->id,
                'installment_number' => 1,
                'due_date' => $startDate->toDateString(),
                'amount' => $firstPayment,
                'paid_amount' => 0.0000,
                'status' => 'due',
            ]);
            $createdInstallments->push($inst1);
            $runningTotal += $firstPayment;

            // Remaining rent distributed among subsequent periods
            $remainingRent = max(0.0, $totalRent - $firstPayment);
            $remainingPeriods = max(1, $totalPeriods - 1);
            $baseAmount = round($remainingRent / $remainingPeriods, 2);

            for ($i = 1; $i <= $remainingPeriods; $i++) {
                // First recurring installment due at start_date + cycle (SRS UC-38)
                $dueDate = $startDate->copy()->addMonths($intervalMonths * $i);
                $isLast = ($i === $remainingPeriods);
                $amount = $isLast ? round($totalRent - $runningTotal, 2) : $baseAmount;

                $inst = Installment::create([
                    'contract_id' => $contract->id,
                    'installment_number' => $i + 1,
                    'due_date' => $dueDate->toDateString(),
                    'amount' => $amount,
                    'paid_amount' => 0.0000,
                    'status' => 'due',
                ]);
                $createdInstallments->push($inst);
                $runningTotal += $amount;
            }
        } else {
            // No advance payment. Periodic installments based on cycle
            $baseAmount = round($totalRent / $totalPeriods, 2);

            for ($i = 1; $i <= $totalPeriods; $i++) {
                if ($explicitFirstDueDate && $i === 1) {
                    $dueDate = Carbon::parse($explicitFirstDueDate);
                } else {
                    // SRS rule: تاريخ أول استحقاق = تاريخ البداية + دورة التحصيل
                    $dueDate = $startDate->copy()->addMonths($intervalMonths * $i);
                }

                $isLast = ($i === $totalPeriods);
                $amount = $isLast ? round($totalRent - $runningTotal, 2) : $baseAmount;

                $inst = Installment::create([
                    'contract_id' => $contract->id,
                    'installment_number' => $i,
                    'due_date' => $dueDate->toDateString(),
                    'amount' => $amount,
                    'paid_amount' => 0.0000,
                    'status' => 'due',
                ]);
                $createdInstallments->push($inst);
                $runningTotal += $amount;
            }
        }

        return $createdInstallments;
    }
}

