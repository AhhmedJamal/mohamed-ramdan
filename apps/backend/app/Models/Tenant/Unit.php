<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Unit extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'property_id',
        'unit_number',
        'type',
        'area_sqm',
        'status',
    ];

    protected $casts = [
        'area_sqm' => 'decimal:2',
    ];

    public static array $typeArabicLabels = [
        'apartment' => 'شقة',
        'shop' => 'محل',
        'office' => 'مكتب',
        'warehouse' => 'مستودع',
    ];

    public static array $statusArabicLabels = [
        'vacant' => 'شاغرة',
        'occupied' => 'مشغولة',
        'under_maintenance' => 'تحت الصيانة',
    ];

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class, 'property_id');
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(RentalContract::class, 'unit_id');
    }

    public function activeContract()
    {
        return $this->hasOne(RentalContract::class, 'unit_id')->where('status', 'active')->latestOfMany();
    }
}

