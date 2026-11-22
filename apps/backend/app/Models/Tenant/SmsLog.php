<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;

class SmsLog extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'recipient_mobile',
        'message',
        'status',
        'error_message',
        'dispatched_at',
    ];

    protected $casts = [
        'dispatched_at' => 'datetime',
    ];
}

