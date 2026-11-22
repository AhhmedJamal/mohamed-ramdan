<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JournalEntry extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'entry_number',
        'fiscal_year_id',
        'date',
        'explanation',
        'total_debit',
        'total_credit',
        'status',
        'voucher_id',
        'created_by',
        'posted_at',
    ];

    protected $casts = [
        'date' => 'date',
        'total_debit' => 'decimal:4',
        'total_credit' => 'decimal:4',
        'posted_at' => 'datetime',
    ];

    public static array $statusArabicLabels = [
        'draft' => 'مسودة',
        'approved' => 'معتمد',
        'posted' => 'مرحّل',
    ];

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class, 'fiscal_year_id');
    }

    public function voucher(): BelongsTo
    {
        return $this->belongsTo(Voucher::class, 'voucher_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(JournalEntryItem::class, 'journal_entry_id');
    }
}

