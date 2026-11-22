<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Account extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'code',
        'name',
        'root_type',
        'nature',
        'account_type',
        'parent_id',
        'is_cost_center_mandatory',
        'opening_balance',
        'opening_date',
        'depreciation_method',
        'purchase_price',
        'depreciation_rate',
        'useful_life_years',
        'scrap_value',
        'is_fixed_root',
    ];

    protected $casts = [
        'is_cost_center_mandatory' => 'boolean',
        'is_fixed_root' => 'boolean',
        'opening_balance' => 'decimal:4',
        'purchase_price' => 'decimal:4',
        'depreciation_rate' => 'decimal:2',
        'useful_life_years' => 'integer',
        'scrap_value' => 'decimal:4',
        'opening_date' => 'date',
    ];

    public static array $rootNatures = [
        'assets' => 'debit',
        'liabilities' => 'credit',
        'equity' => 'credit',
        'expenses' => 'debit',
        'revenues' => 'credit',
        'purchases' => 'debit',
        'sales' => 'credit',
        'purchase_returns' => 'credit',
        'sales_returns' => 'debit',
        'withdrawals' => 'debit',
        'discounts_allowed' => 'debit',
        'discounts_earned' => 'credit',
    ];

    public static array $rootArabicNames = [
        'assets' => 'الأصول',
        'liabilities' => 'الخصوم',
        'equity' => 'حقوق الملكية',
        'expenses' => 'المصروفات',
        'revenues' => 'الإيرادات',
        'purchases' => 'المشتريات',
        'sales' => 'المبيعات',
        'purchase_returns' => 'مردودات المشتريات',
        'sales_returns' => 'مردودات المبيعات',
        'withdrawals' => 'المسحوبات',
        'discounts_allowed' => 'خصم مسموح به',
        'discounts_earned' => 'خصم مكتسب',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Account::class, 'parent_id');
    }

    public function allowedCostCenters(): BelongsToMany
    {
        return $this->belongsToMany(CostCenter::class, 'account_cost_centers', 'account_id', 'cost_center_id')->withTimestamps();
    }

    public function calculateBalance(): float
    {
        // Calculate debits and credits from posted journal entry items
        $totals = DB::connection('tenant')->table('journal_entry_items')
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_items.journal_entry_id')
            ->where('journal_entries.status', 'posted')
            ->where('journal_entry_items.account_id', $this->id)
            ->selectRaw('COALESCE(SUM(debit), 0) as total_debit, COALESCE(SUM(credit), 0) as total_credit')
            ->first();

        $totalDebit = (float) ($totals->total_debit ?? 0);
        $totalCredit = (float) ($totals->total_credit ?? 0);
        $opening = (float) $this->opening_balance;

        if ($this->nature === 'debit') {
            return $opening + $totalDebit - $totalCredit;
        } else {
            return $opening + $totalCredit - $totalDebit;
        }
    }
}

