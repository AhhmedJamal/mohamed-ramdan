<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $connection = 'central';
    protected $table = 'users';

    protected $fillable = [
        'name',
        'email',
        'mobile',
        'password',
        'profile_picture',
        'failed_login_attempts',
        'lockout_until',
        'status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'failed_login_attempts' => 'integer',
        'lockout_until' => 'datetime',
        'password' => 'hashed',
    ];

    public function isLockedOut(): bool
    {
        return $this->lockout_until && $this->lockout_until->isFuture();
    }

    public function companies(): BelongsToMany
    {
        return $this->belongsToMany(Company::class, 'company_user', 'user_id', 'company_id')
            ->withPivot('role', 'is_primary_manager')
            ->withTimestamps();
    }

    public function getRoleForCompany(?string $subdomain = null): ?string
    {
        $companies = $this->companies()->get();
        if ($companies->contains(fn($c) => $c->pivot->role === 'super_admin')) {
            return 'super_admin';
        }
        if ($subdomain) {
            $c = $companies->firstWhere('subdomain', $subdomain);
            if ($c) {
                return $c->pivot->role;
            }
        }
        return $companies->first()?->pivot?->role;
    }
}
