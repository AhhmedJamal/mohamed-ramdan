<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Voucher extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'voucher_number',
        'type',
        'contract_id',
        'installment_id',
        'expense_type',
        'amount',
        'date',
        'cost_center_id',
        'debit_account_id',
        'credit_account_id',
        'payment_method',
        'status',
        'rejection_reason',
        'created_by',
        'approved_by',
        'approved_at',
        'journal_entry_id',
        'notes',
    ];

    protected $casts = [
        'date' => 'date',
        'amount' => 'decimal:4',
        'approved_at' => 'datetime',
    ];

    public static array $typeArabicLabels = [
        'receipt' => 'سند قبض',
        'disbursement' => 'سند صرف',
    ];

    public static array $statusArabicLabels = [
        'draft' => 'مسودة',
        'approved' => 'معتمد',
        'rejected' => 'مرفوض',
    ];

    public static array $paymentMethodArabicLabels = [
        'cash' => 'نقدي',
        'bank_transfer' => 'تحويل بنكي',
        'cheque' => 'شيك',
    ];

    public static array $expenseTypeArabicLabels = [
        'maintenance' => 'صيانة',
        'electricity' => 'كهرباء',
        'water' => 'ماء',
        'rent' => 'إيجار',
        'salaries' => 'رواتب',
        'other' => 'أخرى',
    ];

    public function contract(): BelongsTo
    {
        return $this->belongsTo(RentalContract::class, 'contract_id');
    }

    public function installment(): BelongsTo
    {
        return $this->belongsTo(Installment::class, 'installment_id');
    }

    public function costCenter(): BelongsTo
    {
        return $this->belongsTo(CostCenter::class, 'cost_center_id');
    }

    public function debitAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'debit_account_id');
    }

    public function creditAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'credit_account_id');
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }
}

