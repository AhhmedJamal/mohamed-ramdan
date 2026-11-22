<?php

namespace App\Services;

use App\Models\Tenant\Account;
use App\Models\Tenant\CostCenter;
use App\Models\Tenant\FiscalYear;
use App\Models\Tenant\JournalEntry;
use App\Models\Tenant\JournalEntryItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class FinancialReportService
{
    /**
     * UC-56: Trial Balance (ميزان المراجعة)
     */
    public function getTrialBalance(?string $fiscalYearId = null, ?string $fromDate = null, ?string $toDate = null): array
    {
        $accounts = Account::orderBy('code')->get();

        $rows = [];
        $totalOpeningDebit = 0.0;
        $totalOpeningCredit = 0.0;
        $totalPeriodDebit = 0.0;
        $totalPeriodCredit = 0.0;
        $totalEndingDebit = 0.0;
        $totalEndingCredit = 0.0;

        foreach ($accounts as $acc) {
            $openingDebit = 0.0;
            $openingCredit = 0.0;

            // Opening balance: only movements strictly prior to fromDate
            if ($fromDate) {
                $openingQuery = JournalEntryItem::where('account_id', $acc->id)
                    ->whereHas('journalEntry', function ($q) use ($fromDate, $fiscalYearId) {
                        $q->where('status', 'posted');
                        if ($fiscalYearId) {
                            $q->where('fiscal_year_id', $fiscalYearId);
                        }
                        $q->where('date', '<', $fromDate);
                    });

                $openingDebitSum = (float)$openingQuery->sum('debit');
                $openingCreditSum = (float)$openingQuery->sum('credit');

                $openingNet = $openingDebitSum - $openingCreditSum;

                if ($acc->nature === 'debit') {
                    if ($openingNet >= 0) {
                        $openingDebit = $openingNet;
                    } else {
                        $openingCredit = abs($openingNet);
                    }
                } else {
                    $creditNet = $openingCreditSum - $openingDebitSum;
                    if ($creditNet >= 0) {
                        $openingCredit = $creditNet;
                    } else {
                        $openingDebit = abs($creditNet);
                    }
                }
            }

            // Period movements: movements between fromDate (if provided) and toDate (if provided)
            $periodQuery = JournalEntryItem::where('account_id', $acc->id)
                ->whereHas('journalEntry', function ($q) use ($fromDate, $toDate, $fiscalYearId) {
                    $q->where('status', 'posted');
                    if ($fiscalYearId) {
                        $q->where('fiscal_year_id', $fiscalYearId);
                    }
                    if ($fromDate) {
                        $q->where('date', '>=', $fromDate);
                    }
                    if ($toDate) {
                        $q->where('date', '<=', $toDate);
                    }
                });

            $periodDebit = (float)$periodQuery->sum('debit');
            $periodCredit = (float)$periodQuery->sum('credit');

            // Cumulative ending calculation
            $cumulativeDebit = $openingDebit + $periodDebit;
            $cumulativeCredit = $openingCredit + $periodCredit;

            $endingDebit = 0.0;
            $endingCredit = 0.0;

            if ($acc->nature === 'debit') {
                $net = $cumulativeDebit - $cumulativeCredit;
                if ($net >= 0) {
                    $endingDebit = $net;
                } else {
                    $endingCredit = abs($net);
                }
            } else {
                $net = $cumulativeCredit - $cumulativeDebit;
                if ($net >= 0) {
                    $endingCredit = $net;
                } else {
                    $endingDebit = abs($net);
                }
            }

            $rows[] = [
                'account_id' => $acc->id,
                'code' => $acc->code,
                'name' => $acc->name,
                'root_type' => $acc->root_type,
                'nature' => $acc->nature,
                'opening_debit' => round($openingDebit, 2),
                'opening_credit' => round($openingCredit, 2),
                'period_debit' => round($periodDebit, 2),
                'period_credit' => round($periodCredit, 2),
                'ending_debit' => round($endingDebit, 2),
                'ending_credit' => round($endingCredit, 2),
            ];

            $totalOpeningDebit += $openingDebit;
            $totalOpeningCredit += $openingCredit;
            $totalPeriodDebit += $periodDebit;
            $totalPeriodCredit += $periodCredit;
            $totalEndingDebit += $endingDebit;
            $totalEndingCredit += $endingCredit;
        }

        $balanceDifference = round($totalEndingDebit - $totalEndingCredit, 2);
        $isBalanced = abs($balanceDifference) < 0.01;

        return [
            'accounts' => $rows,
            'totals' => [
                'opening_debit' => round($totalOpeningDebit, 2),
                'opening_credit' => round($totalOpeningCredit, 2),
                'period_debit' => round($totalPeriodDebit, 2),
                'period_credit' => round($totalPeriodCredit, 2),
                'ending_debit' => round($totalEndingDebit, 2),
                'ending_credit' => round($totalEndingCredit, 2),
                'balance_difference' => $balanceDifference,
                'is_balanced' => $isBalanced,
            ],
            'filters' => [
                'fiscal_year_id' => $fiscalYearId,
                'from_date' => $fromDate,
                'to_date' => $toDate,
            ],
        ];
    }

    /**
     * UC-57: General Ledger (دفتر الأستاذ العام)
     */
    public function getGeneralLedger(
        int $accountId,
        ?int $counterAccountId = null,
        ?string $fromDate = null,
        ?string $toDate = null
    ): array {
        $account = Account::findOrFail($accountId);

        $openingBalance = 0.0;
        if ($fromDate) {
            $openingQuery = JournalEntryItem::where('account_id', $accountId)
                ->whereHas('journalEntry', function ($q) use ($fromDate) {
                    $q->where('status', 'posted')
                        ->where('date', '<', $fromDate);
                });

            $openingDebit = (float)$openingQuery->sum('debit');
            $openingCredit = (float)$openingQuery->sum('credit');

            $openingBalance = $account->nature === 'debit'
                ? ($openingDebit - $openingCredit)
                : ($openingCredit - $openingDebit);
        }

        // Fetch movements
        $query = JournalEntryItem::with(['journalEntry', 'counterAccount', 'costCenter'])
            ->where('account_id', $accountId)
            ->whereHas('journalEntry', function ($q) use ($fromDate, $toDate) {
                $q->where('status', 'posted');
                if ($fromDate) {
                    $q->where('date', '>=', $fromDate);
                }
                if ($toDate) {
                    $q->where('date', '<=', $toDate);
                }
            });

        if ($counterAccountId) {
            $query->where('counter_account_id', $counterAccountId);
        }

        $items = $query->join('journal_entries', 'journal_entry_items.journal_entry_id', '=', 'journal_entries.id')
            ->orderBy('journal_entries.date', 'asc')
            ->orderBy('journal_entries.id', 'asc')
            ->select('journal_entry_items.*')
            ->get();

        $runningBalance = $openingBalance;
        $totalDebit = 0.0;
        $totalCredit = 0.0;
        $statementRows = [];

        foreach ($items as $item) {
            $deb = (float)$item->debit;
            $cred = (float)$item->credit;
            $totalDebit += $deb;
            $totalCredit += $cred;

            if ($account->nature === 'debit') {
                $runningBalance += ($deb - $cred);
            } else {
                $runningBalance += ($cred - $deb);
            }

            $statementRows[] = [
                'id' => $item->id,
                'date' => $item->journalEntry->date->format('Y-m-d'),
                'entry_number' => $item->journalEntry->entry_number,
                'journal_entry_id' => $item->journalEntry->id,
                'explanation' => $item->line_note ?: $item->journalEntry->explanation,
                'counter_account_name' => $item->counter_account_name
                    ?: ($item->counterAccount ? $item->counterAccount->name : 'المذكورين'),
                'cost_center_name' => $item->costCenter ? $item->costCenter->name : null,
                'debit' => round($deb, 2),
                'credit' => round($cred, 2),
                'running_balance' => round($runningBalance, 2),
            ];
        }

        return [
            'account' => [
                'id' => $account->id,
                'code' => $account->code,
                'name' => $account->name,
                'root_type' => $account->root_type,
                'nature' => $account->nature,
            ],
            'opening_balance' => round($openingBalance, 2),
            'total_debit' => round($totalDebit, 2),
            'total_credit' => round($totalCredit, 2),
            'closing_balance' => round($runningBalance, 2),
            'rows' => $statementRows,
        ];
    }

    /**
     * UC-57 (Part 2): Balance Sheet (الميزانية العمومية)
     * Total Assets = Total Liabilities + Total Equity
     */
    public function getBalanceSheet(?string $asOfDate = null, ?string $fiscalYearId = null): array
    {
        $trial = $this->getTrialBalance($fiscalYearId, null, $asOfDate);
        $accounts = $trial['accounts'];

        $assets = [];
        $liabilities = [];
        $equity = [];

        $totalAssets = 0.0;
        $totalLiabilities = 0.0;
        $totalCapital = 0.0;
        $totalWithdrawals = 0.0;

        foreach ($accounts as $acc) {
            $root = $acc['root_type'];
            if ($root === 'assets') {
                $bal = $acc['ending_debit'] - $acc['ending_credit'];
                $assets[] = [
                    'account_id' => $acc['account_id'],
                    'code' => $acc['code'],
                    'name' => $acc['name'],
                    'amount' => round($bal, 2),
                ];
                $totalAssets += $bal;
            } elseif ($root === 'liabilities') {
                $bal = $acc['ending_credit'] - $acc['ending_debit'];
                $liabilities[] = [
                    'account_id' => $acc['account_id'],
                    'code' => $acc['code'],
                    'name' => $acc['name'],
                    'amount' => round($bal, 2),
                ];
                $totalLiabilities += $bal;
            } elseif ($root === 'equity') {
                $bal = $acc['ending_credit'] - $acc['ending_debit'];
                $equity[] = [
                    'account_id' => $acc['account_id'],
                    'code' => $acc['code'],
                    'name' => $acc['name'],
                    'amount' => round($bal, 2),
                ];
                $totalCapital += $bal;
            }
        }

        // Calculate Net Profit from Income Statement up to asOfDate
        $incomeStmt = $this->getIncomeStatement(null, $asOfDate, $fiscalYearId);
        $netProfit = $incomeStmt['net_profit'];

        $totalEquity = $totalCapital + $netProfit - $totalWithdrawals;
        $totalLiabilitiesAndEquity = $totalLiabilities + $totalEquity;

        $difference = round($totalAssets - $totalLiabilitiesAndEquity, 2);
        $isBalanced = abs($difference) < 0.01;

        return [
            'as_of_date' => $asOfDate ?: Carbon::today()->format('Y-m-d'),
            'assets' => [
                'items' => $assets,
                'total' => round($totalAssets, 2),
            ],
            'liabilities' => [
                'items' => $liabilities,
                'total' => round($totalLiabilities, 2),
            ],
            'equity' => [
                'items' => $equity,
                'capital' => round($totalCapital, 2),
                'net_profit' => round($netProfit, 2),
                'withdrawals' => round($totalWithdrawals, 2),
                'total' => round($totalEquity, 2),
            ],
            'total_liabilities_and_equity' => round($totalLiabilitiesAndEquity, 2),
            'difference' => $difference,
            'is_balanced' => $isBalanced,
        ];
    }

    /**
     * UC-58: Income Statement (قائمة الدخل)
     * Net Profit = Total Revenues - Total Expenses
     */
    public function getIncomeStatement(?string $fromDate = null, ?string $toDate = null, ?string $fiscalYearId = null): array
    {
        $accounts = Account::whereIn('root_type', ['revenues', 'expenses'])->orderBy('code')->get();

        $revenues = [];
        $expenses = [];
        $totalRevenues = 0.0;
        $totalExpenses = 0.0;

        foreach ($accounts as $acc) {
            $query = JournalEntryItem::where('account_id', $acc->id)
                ->whereHas('journalEntry', function ($q) use ($fromDate, $toDate, $fiscalYearId) {
                    $q->where('status', 'posted');
                    if ($fiscalYearId) {
                        $q->where('fiscal_year_id', $fiscalYearId);
                    }
                    if ($fromDate) {
                        $q->where('date', '>=', $fromDate);
                    }
                    if ($toDate) {
                        $q->where('date', '<=', $toDate);
                    }
                });

            $deb = (float)$query->sum('debit');
            $cred = (float)$query->sum('credit');

            if ($acc->root_type === 'revenues') {
                $net = $cred - $deb;
                $revenues[] = [
                    'account_id' => $acc->id,
                    'code' => $acc->code,
                    'name' => $acc->name,
                    'amount' => round($net, 2),
                ];
                $totalRevenues += $net;
            } else {
                $net = $deb - $cred;
                $expenses[] = [
                    'account_id' => $acc->id,
                    'code' => $acc->code,
                    'name' => $acc->name,
                    'amount' => round($net, 2),
                ];
                $totalExpenses += $net;
            }
        }

        $netProfit = round($totalRevenues - $totalExpenses, 2);

        return [
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'revenues' => [
                'items' => $revenues,
                'total' => round($totalRevenues, 2),
            ],
            'expenses' => [
                'items' => $expenses,
                'total' => round($totalExpenses, 2),
            ],
            'net_profit' => $netProfit,
            'is_profit' => $netProfit >= 0,
        ];
    }

    /**
     * UC-59: Per-Building Income Statement (قائمة الدخل لكل عمارة / مركز تكلفة)
     */
    public function getBuildingIncomeStatement(int $costCenterId, ?string $fromDate = null, ?string $toDate = null): array
    {
        $costCenter = CostCenter::findOrFail($costCenterId);

        $query = JournalEntryItem::with(['account', 'journalEntry'])
            ->where('cost_center_id', $costCenterId)
            ->whereHas('journalEntry', function ($q) use ($fromDate, $toDate) {
                $q->where('status', 'posted');
                if ($fromDate) {
                    $q->where('date', '>=', $fromDate);
                }
                if ($toDate) {
                    $q->where('date', '<=', $toDate);
                }
            });

        $items = $query->get();

        $revenues = [];
        $expenses = [];
        $totalRevenues = 0.0;
        $totalExpenses = 0.0;

        foreach ($items as $item) {
            $acc = $item->account;
            if (!$acc) continue;

            $deb = (float)$item->debit;
            $cred = (float)$item->credit;

            if ($acc->root_type === 'revenues') {
                $amt = $cred - $deb;
                $totalRevenues += $amt;
                $revenues[] = [
                    'account_name' => $acc->name,
                    'code' => $acc->code,
                    'entry_number' => $item->journalEntry->entry_number,
                    'date' => $item->journalEntry->date->format('Y-m-d'),
                    'amount' => round($amt, 2),
                ];
            } elseif ($acc->root_type === 'expenses') {
                $amt = $deb - $cred;
                $totalExpenses += $amt;
                $expenses[] = [
                    'account_name' => $acc->name,
                    'code' => $acc->code,
                    'entry_number' => $item->journalEntry->entry_number,
                    'date' => $item->journalEntry->date->format('Y-m-d'),
                    'amount' => round($amt, 2),
                ];
            }
        }

        $netProfit = round($totalRevenues - $totalExpenses, 2);

        return [
            'cost_center' => [
                'id' => $costCenter->id,
                'code' => $costCenter->code,
                'name' => $costCenter->name,
                'type' => $costCenter->type,
            ],
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'revenues' => [
                'items' => $revenues,
                'total' => round($totalRevenues, 2),
            ],
            'expenses' => [
                'items' => $expenses,
                'total' => round($totalExpenses, 2),
            ],
            'net_profit' => $netProfit,
            'is_profit' => $netProfit >= 0,
        ];
    }
}
