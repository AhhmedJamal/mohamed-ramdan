<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CostCenter extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'code',
        'name',
        'type',
        'description',
        'status',
    ];

    public function accounts(): BelongsToMany
    {
        return $this->belongsToMany(Account::class, 'account_cost_centers', 'cost_center_id', 'account_id')->withTimestamps();
    }

    public function journalEntryItems(): HasMany
    {
        return $this->hasMany(JournalEntryItem::class, 'cost_center_id');
    }

    public function vouchers(): HasMany
    {
        return $this->hasMany(Voucher::class, 'cost_center_id');
    }
}

