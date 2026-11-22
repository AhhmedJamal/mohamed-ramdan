<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Company extends Model
{
    use HasFactory;

    protected $connection = 'central';
    protected $table = 'companies';

    protected $fillable = [
        'uuid',
        'name',
        'trade_activity',
        'address',
        'country',
        'city',
        'tax_number',
        'subdomain',
        'db_name',
        'status',
        'session_epoch',
    ];

    protected $casts = [
        'session_epoch' => 'integer',
    ];

    public function isFrozen(): bool
    {
        return $this->status === 'frozen';
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'company_user', 'company_id', 'user_id')
            ->withPivot('role', 'is_primary_manager')
            ->withTimestamps();
    }
}

