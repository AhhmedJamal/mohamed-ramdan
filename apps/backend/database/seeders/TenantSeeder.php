<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TenantSeeder extends Seeder
{
    /**
     * Seeds the 12 immutable root accounts per SRS Section 2.4 (UC-16, UC-17)
     */
    public function run(): void
    {
        $rootAccounts = [
            ['code' => '1000', 'name' => 'الأصول', 'root_type' => 'assets', 'nature' => 'debit', 'account_type' => 'root', 'is_fixed_root' => true],
            ['code' => '2000', 'name' => 'الخصوم', 'root_type' => 'liabilities', 'nature' => 'credit', 'account_type' => 'root', 'is_fixed_root' => true],
            ['code' => '3000', 'name' => 'حقوق الملكية', 'root_type' => 'equity', 'nature' => 'credit', 'account_type' => 'root', 'is_fixed_root' => true],
            ['code' => '4000', 'name' => 'المصروفات', 'root_type' => 'expenses', 'nature' => 'debit', 'account_type' => 'root', 'is_fixed_root' => true],
            ['code' => '5000', 'name' => 'الإيرادات', 'root_type' => 'revenues', 'nature' => 'credit', 'account_type' => 'root', 'is_fixed_root' => true],
            ['code' => '6000', 'name' => 'المشتريات', 'root_type' => 'purchases', 'nature' => 'debit', 'account_type' => 'root', 'is_fixed_root' => true],
            ['code' => '7000', 'name' => 'المبيعات', 'root_type' => 'sales', 'nature' => 'credit', 'account_type' => 'root', 'is_fixed_root' => true],
            ['code' => '8000', 'name' => 'مردودات المشتريات', 'root_type' => 'purchase_returns', 'nature' => 'credit', 'account_type' => 'root', 'is_fixed_root' => true],
            ['code' => '9000', 'name' => 'مردودات المبيعات', 'root_type' => 'sales_returns', 'nature' => 'debit', 'account_type' => 'root', 'is_fixed_root' => true],
            ['code' => '3100', 'name' => 'المسحوبات', 'root_type' => 'withdrawals', 'nature' => 'debit', 'account_type' => 'root', 'is_fixed_root' => true],
            ['code' => '4100', 'name' => 'خصم مسموح به', 'root_type' => 'discounts_allowed', 'nature' => 'debit', 'account_type' => 'root', 'is_fixed_root' => true],
            ['code' => '5100', 'name' => 'خصم مكتسب', 'root_type' => 'discounts_earned', 'nature' => 'credit', 'account_type' => 'root', 'is_fixed_root' => true],
        ];

        foreach ($rootAccounts as $acc) {
            DB::connection('tenant')->table('accounts')->updateOrInsert(
                ['code' => $acc['code']],
                array_merge($acc, [
                    'opening_balance' => 0.0000,
                    'is_cost_center_mandatory' => in_array($acc['root_type'], ['expenses', 'revenues']),
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}

