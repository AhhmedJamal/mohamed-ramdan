<?php

namespace App\Services;

use App\Models\Tenant\FiscalPeriod;
use App\Models\Tenant\FiscalYear;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class FiscalPeriodService
{
    /**
     * Strict Period Lock Interceptor
     * Validates that a transaction date falls into an active, open fiscal year and open fiscal period.
     * Throws ValidationException with exact SRS error message if locked.
     */
    public function validateDateIsOpen(string $date): void
    {
        $d = Carbon::parse($date)->toDateString();

        // Check if date falls in any fiscal year
        $fiscalYear = FiscalYear::where('start_date', '<=', $d)
            ->where('end_date', '>=', $d)
            ->first();

        if (!$fiscalYear || $fiscalYear->status === 'closed') {
            throw ValidationException::withMessages([
                'date' => ['الفترة المالية مغلقة، لا يمكن إضافة أو تعديل قيود بها']
            ]);
        }

        // Check if date falls in a closed fiscal period within this year
        $closedPeriod = FiscalPeriod::where('fiscal_year_id', $fiscalYear->id)
            ->where('start_date', '<=', $d)
            ->where('end_date', '>=', $d)
            ->where('status', 'closed')
            ->exists();

        if ($closedPeriod) {
            throw ValidationException::withMessages([
                'date' => ['الفترة المالية مغلقة، لا يمكن إضافة أو تعديل قيود بها']
            ]);
        }
    }

    /**
     * Boolean check whether a date is open for transactions
     */
    public function isDateOpen(string $date): bool
    {
        try {
            $this->validateDateIsOpen($date);
            return true;
        } catch (ValidationException $e) {
            return false;
        }
    }

    /**
     * Static helper for controllers
     */
    public static function validateDateNotLocked(string $date): bool
    {
        return app(self::class)->isDateOpen($date);
    }
}

