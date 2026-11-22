<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\Relations\Pivot;

class CompanyUser extends Pivot
{
    protected $connection = 'central';
    protected $table = 'company_user';

    protected $fillable = [
        'company_id',
        'user_id',
        'role',
        'is_primary_manager',
    ];

    protected $casts = [
        'is_primary_manager' => 'boolean',
    ];
}

