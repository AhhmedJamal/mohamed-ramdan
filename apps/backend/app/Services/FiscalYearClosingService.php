<?php

namespace App\Services;

use App\Models\Tenant\Account;
use App\Models\Tenant\FiscalPeriod;
use App\Models\Tenant\FiscalYear;
use App\Models\Tenant\JournalEntry;
use App\Models\Tenant\JournalEntryItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FiscalYearClosingService
{
    protected array $revenueTypes = ['revenues', 'sales', 'purchase_returns', 'discounts_earned'];
    protected array $expenseTypes = ['expenses', 'purchases', 'sales_returns', 'discounts_allowed'];

    /**
     * Compute financial closing summary for a fiscal year (UC-61)
     */
    public function computeSummary(FiscalYear $fiscalYear): array
    {
        $startDate = $fiscalYear->start_date->toDateString();
        $endDate = $fiscalYear->end_date->toDateString();

        // Get posted entry items in this fiscal year
        $items = DB::connection('tenant')->table('journal_entry_items')
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_items.journal_entry_id')
            ->join('accounts', 'accounts.id', '=', 'journal_entry_items.account_id')
            ->where('journal_entries.status', 'posted')
            ->whereBetween('journal_entries.date', [$startDate, $endDate])
            ->select(
                'accounts.id as account_id',
                'accounts.code',
                'accounts.name',
                'accounts.root_type',
                'accounts.nature',
                DB::raw('COALESCE(SUM(journal_entry_items.debit), 0) as total_debit'),
                DB::raw('COALESCE(SUM(journal_entry_items.credit), 0) as total_credit')
            )
            ->groupBy('accounts.id', 'accounts.code', 'accounts.name', 'accounts.root_type', 'accounts.nature')
            ->get();

        $revenueAccounts = [];
        $expenseAccounts = [];
        $totalRevenue = 0.0;
        $totalExpenses = 0.0;

        foreach ($items as $item) {
            $debit = (float) $item->total_debit;
            $credit = (float) $item->total_credit;

            if (in_array($item->root_type, $this->revenueTypes)) {
                $netBalance = $credit - $debit; // Credit normal balance
                if ($netBalance != 0) {
                    $totalRevenue += $netBalance;
                    $revenueAccounts[] = [
                        'account_id' => $item->account_id,
                        'code' => $item->code,
                        'name' => $item->name,
                        'root_type' => $item->root_type,
                        'balance' => $netBalance,
                    ];
                }
            } elseif (in_array($item->root_type, $this->expenseTypes)) {
                $netBalance = $debit - $credit; // Debit normal balance
                if ($netBalance != 0) {
                    $totalExpenses += $netBalance;
                    $expenseAccounts[] = [
                        'account_id' => $item->account_id,
                        'code' => $item->code,
                        'name' => $item->name,
                        'root_type' => $item->root_type,
                        'balance' => $netBalance,
                    ];
                }
            }
        }

        $netProfit = $totalRevenue - $totalExpenses;

        return [
            'fiscal_year' => [
                'id' => $fiscalYear->id,
                'name' => $fiscalYear->name,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'status' => $fiscalYear->status,
                'closed_at' => $fiscalYear->closed_at,
            ],
            'total_revenue' => round($totalRevenue, 2),
            'total_expenses' => round($totalExpenses, 2),
            'net_profit' => round($netProfit, 2),
            'is_profit' => $netProfit >= 0,
            'revenue_accounts' => $revenueAccounts,
            'expense_accounts' => $expenseAccounts,
        ];
    }

    /**
     * Close the fiscal year, auto-generate balanced closing journal entry, and roll over to Equity
     * UC-61
     */
    public function closeYear(FiscalYear $fiscalYear, int $userId): array
    {
        if ($fiscalYear->status === 'closed') {
            throw ValidationException::withMessages([
                'fiscal_year' => ['السنة المالية مغلقة بالفعل']
            ]);
        }

        $startDate = $fiscalYear->start_date->toDateString();
        $endDate = $fiscalYear->end_date->toDateString();

        // Check 1: No draft vouchers pending
        $hasDraftVouchers = DB::connection('tenant')->table('vouchers')
            ->where('status', 'draft')
            ->whereBetween('date', [$startDate, $endDate])
            ->exists();

        // Check 2: No draft journal entries pending
        $hasDraftEntries = DB::connection('tenant')->table('journal_entries')
            ->where('status', 'draft')
            ->whereBetween('date', [$startDate, $endDate])
            ->exists();

        if ($hasDraftVouchers || $hasDraftEntries) {
            throw ValidationException::withMessages([
                'fiscal_year' => ['لا يمكن إغلاق السنة المالية لوجود قيود أو سندات مسودة معلقة']
            ]);
        }

        $summary = $this->computeSummary($fiscalYear);
        $totalRevenue = $summary['total_revenue'];
        $totalExpenses = $summary['total_expenses'];
        $netProfit = $summary['net_profit'];

        // Find Equity account to receive Net Profit/Loss
        $equityAccount = Account::where('root_type', 'equity')->where('is_fixed_root', true)->first();
        if (!$equityAccount) {
            $equityAccount = Account::where('root_type', 'equity')->firstOrFail();
        }

        return DB::connection('tenant')->transaction(function () use ($fiscalYear, $summary, $equityAccount, $userId, $endDate, $netProfit) {
            // Build closing journal entry items
            $closingItems = [];
            $totalDebit = 0.0;
            $totalCredit = 0.0;

            // 1. Debit all revenue accounts to zero them out
            foreach ($summary['revenue_accounts'] as $rev) {
                $amount = abs($rev['balance']);
                $closingItems[] = [
                    'account_id' => $rev['account_id'],
                    'debit' => $amount,
                    'credit' => 0.0,
                    'line_note' => "إقفال إيرادات {$rev['name']}",
                ];
                $totalDebit += $amount;
            }

            // 2. Credit all expense accounts to zero them out
            foreach ($summary['expense_accounts'] as $exp) {
                $amount = abs($exp['balance']);
                $closingItems[] = [
                    'account_id' => $exp['account_id'],
                    'debit' => 0.0,
                    'credit' => $amount,
                    'line_note' => "إقفال مصروفات {$exp['name']}",
                ];
                $totalCredit += $amount;
            }

            // 3. Roll over Net Profit / Loss to Equity
            if ($netProfit > 0) {
                // Net Profit: Credit Equity
                $closingItems[] = [
                    'account_id' => $equityAccount->id,
                    'debit' => 0.0,
                    'credit' => abs($netProfit),
                    'line_note' => 'ترحيل صافي أرباح العام إلى حقوق الملكية',
                ];
                $totalCredit += abs($netProfit);
            } elseif ($netProfit < 0) {
                // Net Loss: Debit Equity
                $closingItems[] = [
                    'account_id' => $equityAccount->id,
                    'debit' => abs($netProfit),
                    'credit' => 0.0,
                    'line_note' => 'ترحيل صافي خسائر العام من حقوق الملكية',
                ];
                $totalDebit += abs($netProfit);
            }

            // Generate unique entry number
            $closingEntryNumber = 'CLOSE-' . $fiscalYear->id . '-' . date('YmdHis');

            // Insert balanced journal entry
            $jeId = DB::connection('tenant')->table('journal_entries')->insertGetId([
                'entry_number' => $closingEntryNumber,
                'fiscal_year_id' => $fiscalYear->id,
                'date' => $endDate,
                'explanation' => "قيد إقفال الحسابات الاسمية وترصيد الأرباح والخسائر للسنة المالية {$fiscalYear->name}",
                'total_debit' => round($totalDebit, 4),
                'total_credit' => round($totalCredit, 4),
                'status' => 'posted',
                'created_by' => $userId,
                'posted_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($closingItems as $item) {
                DB::connection('tenant')->table('journal_entry_items')->insert([
                    'journal_entry_id' => $jeId,
                    'account_id' => $item['account_id'],
                    'cost_center_id' => null,
                    'debit' => round($item['debit'], 4),
                    'credit' => round($item['credit'], 4),
                    'line_note' => $item['line_note'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Update fiscal year to closed
            $fiscalYear->status = 'closed';
            $fiscalYear->closed_at = now();
            $fiscalYear->save();

            // Close all fiscal periods for this year
            FiscalPeriod::where('fiscal_year_id', $fiscalYear->id)->update([
                'status' => 'closed',
                'updated_at' => now(),
            ]);

            return [
                'fiscal_year' => $fiscalYear->fresh(),
                'closing_journal_entry_id' => $jeId,
                'closing_entry_number' => $closingEntryNumber,
                'total_debit' => $totalDebit,
                'total_credit' => $totalCredit,
                'net_profit' => $netProfit,
            ];
        });
    }
}

