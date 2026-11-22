<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'user_id',
        'role',
        'type',
        'title',
        'message',
        'data',
        'is_read',
        'read_at',
    ];

    protected $casts = [
        'data' => 'array',
        'is_read' => 'boolean',
        'read_at' => 'datetime',
    ];
}

