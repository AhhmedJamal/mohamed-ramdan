<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractorInvoiceItem extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'contractor_invoice_id',
        'item_name',
        'quantity',
        'unit',
        'unit_price',
        'total',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:4',
        'unit_price' => 'decimal:4',
        'total' => 'decimal:4',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(ContractorInvoice::class, 'contractor_invoice_id');
    }
}

