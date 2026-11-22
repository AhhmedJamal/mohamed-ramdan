<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Property extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'name',
        'address',
        'type',
        'units_count',
        'cost_center_id',
    ];

    protected $casts = [
        'units_count' => 'integer',
    ];

    public static array $typeArabicLabels = [
        'residential' => 'سكني',
        'commercial' => 'تجاري',
        'mixed' => 'مختلط',
    ];

    public function costCenter(): BelongsTo
    {
        return $this->belongsTo(CostCenter::class, 'cost_center_id');
    }

    public function units(): HasMany
    {
        return $this->hasMany(Unit::class, 'property_id');
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(RentalContract::class, 'property_id');
    }

    public function activeContracts(): HasMany
    {
        return $this->hasMany(RentalContract::class, 'property_id')->where('status', 'active');
    }
}

