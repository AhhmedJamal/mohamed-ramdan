<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContractorInvoice extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'invoice_number',
        'contractor_name',
        'cost_center_id',
        'date',
        'gross_total',
        'tax_amount',
        'grand_total',
        'paid_amount',
        'status',
        'created_by',
        'approved_by',
    ];

    protected $casts = [
        'date' => 'date',
        'gross_total' => 'decimal:4',
        'tax_amount' => 'decimal:4',
        'grand_total' => 'decimal:4',
        'paid_amount' => 'decimal:4',
    ];

    public static array $statusArabicLabels = [
        'draft' => 'مسودة',
        'approved' => 'معتمد',
        'partially_paid' => 'مدفوع جزئياً',
        'fully_paid' => 'مدفوع بالكامل',
    ];

    public function costCenter(): BelongsTo
    {
        return $this->belongsTo(CostCenter::class, 'cost_center_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ContractorInvoiceItem::class, 'contractor_invoice_id');
    }
}

