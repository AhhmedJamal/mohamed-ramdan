<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'name',
        'type',
        'national_id_or_cr',
        'mobile',
        'email',
        'address',
        'notes',
    ];

    public static array $typeArabicLabels = [
        'individual' => 'فرد',
        'company' => 'شركة',
    ];

    public function contracts(): HasMany
    {
        return $this->hasMany(RentalContract::class, 'tenant_id');
    }

    public function activeContracts(): HasMany
    {
        return $this->hasMany(RentalContract::class, 'tenant_id')->where('status', 'active');
    }
}

