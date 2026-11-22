<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Installment extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'contract_id',
        'installment_number',
        'due_date',
        'amount',
        'paid_amount',
        'status',
        'paid_at',
    ];

    protected $casts = [
        'due_date' => 'date',
        'amount' => 'decimal:4',
        'paid_amount' => 'decimal:4',
        'paid_at' => 'datetime',
    ];

    public static array $statusArabicLabels = [
        'due' => 'مستحق',
        'paid' => 'مدفوع',
        'overdue' => 'متأخر',
        'cancelled' => 'ملغي',
    ];

    public function contract(): BelongsTo
    {
        return $this->belongsTo(RentalContract::class, 'contract_id');
    }
}

