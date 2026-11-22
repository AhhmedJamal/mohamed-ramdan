<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationLog extends Model
{
    use HasFactory;

    protected $connection = 'central';
    protected $table = 'notification_logs';
    public $timestamps = false;

    protected $fillable = [
        'company_id',
        'channel',
        'recipient',
        'subject',
        'message',
        'status',
        'error_message',
        'dispatched_at',
    ];

    protected $casts = [
        'dispatched_at' => 'datetime',
    ];
}

