<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RentalContract extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'contract_number',
        'tenant_id',
        'property_id',
        'unit_id',
        'contract_type',
        'start_date',
        'end_date',
        'duration_months',
        'total_rent',
        'collection_cycle',
        'first_payment',
        'status',
        'cancellation_reason',
        'rejection_reason',
        'cancellation_requested_by',
        'cancelled_at',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'total_rent' => 'decimal:4',
        'first_payment' => 'decimal:4',
    ];

    public static array $statusArabicLabels = [
        'active' => 'ساري',
        'overdue' => 'متأخر',
        'expired' => 'منتهي',
        'pending_cancellation' => 'طلب إلغاء معلق',
        'cancelled' => 'ملغي',
    ];

    public static array $contractTypeArabicLabels = [
        'owner_to_company' => 'بين المالك والشركة',
        'company_to_tenant' => 'بين الشركة والمستأجر النهائي',
    ];

    public static array $collectionCycleArabicLabels = [
        'monthly' => 'شهري',
        'quarterly' => 'ربع سنوي',
        'semi_annual' => 'نصف سنوي',
        'annual' => 'سنوي',
    ];

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class, 'property_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function installments(): HasMany
    {
        return $this->hasMany(Installment::class, 'contract_id')->orderBy('installment_number');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ContractAttachment::class, 'contract_id');
    }
}
