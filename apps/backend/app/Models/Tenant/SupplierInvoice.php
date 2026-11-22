<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierInvoice extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'supplier_name',
        'invoice_number',
        'date',
        'cost_center_id',
        'gross_amount',
        'discount_earned',
        'net_amount',
        'tax_type',
        'tax_amount',
        'total_payable',
        'payment_terms',
        'counter_account_id',
        'status',
        'created_by',
    ];

    protected $casts = [
        'date' => 'date',
        'gross_amount' => 'decimal:4',
        'discount_earned' => 'decimal:4',
        'net_amount' => 'decimal:4',
        'tax_amount' => 'decimal:4',
        'total_payable' => 'decimal:4',
    ];

    public static array $statusArabicLabels = [
        'draft' => 'مسودة',
        'approved' => 'معتمد',
    ];

    public static array $paymentTermsArabicLabels = [
        'cash' => 'نقدي',
        'credit' => 'آجل',
    ];

    public static array $taxTypeArabicLabels = [
        'vat' => 'ضريبة القيمة المضافة (15%)',
        'excise' => 'ضريبة انتقائية',
    ];

    public function costCenter(): BelongsTo
    {
        return $this->belongsTo(CostCenter::class, 'cost_center_id');
    }

    public function counterAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'counter_account_id');
    }
}

