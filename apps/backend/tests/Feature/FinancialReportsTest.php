<?php

namespace Tests\Feature;

use App\Models\Central\Company;
use App\Models\Central\User;
use App\Models\Tenant\Account;
use App\Models\Tenant\CostCenter;
use App\Models\Tenant\FiscalPeriod;
use App\Models\Tenant\FiscalYear;
use App\Models\Tenant\JournalEntry;
use App\Models\Tenant\JournalEntryItem;
use App\Services\TenantManager;
use Database\Seeders\CentralSeeder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FinancialReportsTest extends TestCase
{
    protected Company $company;
    protected TenantManager $tenantManager;
    protected Account $cashAccount;
    protected Account $revenueAccount;
    protected Account $expenseAccount;
    protected Account $capitalAccount;
    protected CostCenter $costCenter;
    protected FiscalYear $fiscalYear;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(CentralSeeder::class);
        $this->tenantManager = app(TenantManager::class);

        $this->company = Company::where('subdomain', 'comp1')->firstOrFail();
        $this->tenantManager->provisionTenantDatabase($this->company);
        $this->tenantManager->switchConnection($this->company);

        // Clean tables
        DB::connection('tenant')->statement('PRAGMA foreign_keys = OFF;');
        DB::connection('tenant')->table('journal_entry_items')->delete();
        DB::connection('tenant')->table('journal_entries')->delete();
        DB::connection('tenant')->table('cost_centers')->delete();
        DB::connection('tenant')->table('fiscal_periods')->delete();
        DB::connection('tenant')->table('fiscal_years')->delete();
        DB::connection('tenant')->table('accounts')->delete();
        DB::connection('tenant')->statement('PRAGMA foreign_keys = ON;');

        // 1. Fiscal Year
        $this->fiscalYear = FiscalYear::create([
            'name' => 'السنة المالية 2026',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'open',
        ]);

        for ($m = 1; $m <= 12; $m++) {
            $monthStr = str_pad($m, 2, '0', STR_PAD_LEFT);
            FiscalPeriod::create([
                'fiscal_year_id' => $this->fiscalYear->id,
                'period_number' => $m,
                'start_date' => "2026-{$monthStr}-01",
                'end_date' => date('Y-m-t', strtotime("2026-{$monthStr}-01")),
                'status' => 'open',
            ]);
        }

        // 2. Chart of Accounts roots & leaf accounts
        $assetRoot = Account::create([
            'code' => '1000',
            'name' => 'الأصول',
            'root_type' => 'assets',
            'nature' => 'debit',
            'account_type' => 'root',
            'is_fixed_root' => true,
        ]);
        $this->cashAccount = Account::create([
            'code' => '1101',
            'name' => 'الصندوق الرئيسي',
            'root_type' => 'assets',
            'nature' => 'debit',
            'account_type' => 'sub',
            'parent_id' => $assetRoot->id,
        ]);

        $equityRoot = Account::create([
            'code' => '3000',
            'name' => 'حقوق الملكية',
            'root_type' => 'equity',
            'nature' => 'credit',
            'account_type' => 'root',
            'is_fixed_root' => true,
        ]);
        $this->capitalAccount = Account::create([
            'code' => '3101',
            'name' => 'رأس المال المدفوع',
            'root_type' => 'equity',
            'nature' => 'credit',
            'account_type' => 'sub',
            'parent_id' => $equityRoot->id,
        ]);

        $revRoot = Account::create([
            'code' => '4000',
            'name' => 'الإيرادات',
            'root_type' => 'revenues',
            'nature' => 'credit',
            'account_type' => 'root',
            'is_fixed_root' => true,
        ]);
        $this->revenueAccount = Account::create([
            'code' => '4101',
            'name' => 'إيرادات تأجير عقارات',
            'root_type' => 'revenues',
            'nature' => 'credit',
            'account_type' => 'sub',
            'parent_id' => $revRoot->id,
        ]);

        $expRoot = Account::create([
            'code' => '5000',
            'name' => 'المصروفات',
            'root_type' => 'expenses',
            'nature' => 'debit',
            'account_type' => 'root',
            'is_fixed_root' => true,
        ]);
        $this->expenseAccount = Account::create([
            'code' => '5101',
            'name' => 'مصروفات صيانة ونظافة',
            'root_type' => 'expenses',
            'nature' => 'debit',
            'account_type' => 'sub',
            'parent_id' => $expRoot->id,
        ]);

        // 3. Cost Center
        $this->costCenter = CostCenter::create([
            'code' => 'CC-PROP-100',
            'name' => 'برج النور التجاري',
            'type' => 'property',
            'status' => 'active',
        ]);

        // 4. Seed Balanced Journal Entries
        // Entry 1: Capital injection (Debit Cash 100,000 / Credit Capital 100,000)
        $entry1 = JournalEntry::create([
            'entry_number' => 'JE-2026-0001',
            'fiscal_year_id' => $this->fiscalYear->id,
            'date' => '2026-01-05',
            'explanation' => 'إيداع رأس المال التأسيسي',
            'total_debit' => 100000.00,
            'total_credit' => 100000.00,
            'status' => 'posted',
            'created_by' => 1,
            'posted_at' => now(),
        ]);
        JournalEntryItem::create([
            'journal_entry_id' => $entry1->id,
            'account_id' => $this->cashAccount->id,
            'debit' => 100000.00,
            'credit' => 0.0000,
            'counter_account_id' => $this->capitalAccount->id,
            'counter_account_name' => $this->capitalAccount->name,
            'line_note' => 'إيداع نقدي',
        ]);
        JournalEntryItem::create([
            'journal_entry_id' => $entry1->id,
            'account_id' => $this->capitalAccount->id,
            'debit' => 0.0000,
            'credit' => 100000.00,
            'counter_account_id' => $this->cashAccount->id,
            'counter_account_name' => $this->cashAccount->name,
            'line_note' => 'رأس مال مؤسس',
        ]);

        // Entry 2: Rent Revenue (Debit Cash 40,000 / Credit Revenue 40,000 with cost center)
        $entry2 = JournalEntry::create([
            'entry_number' => 'JE-2026-0002',
            'fiscal_year_id' => $this->fiscalYear->id,
            'date' => '2026-02-10',
            'explanation' => 'تحصيل إيجار برج النور',
            'total_debit' => 40000.00,
            'total_credit' => 40000.00,
            'status' => 'posted',
            'created_by' => 1,
            'posted_at' => now(),
        ]);
        JournalEntryItem::create([
            'journal_entry_id' => $entry2->id,
            'account_id' => $this->cashAccount->id,
            'debit' => 40000.00,
            'credit' => 0.0000,
            'counter_account_id' => $this->revenueAccount->id,
            'counter_account_name' => $this->revenueAccount->name,
            'cost_center_id' => $this->costCenter->id,
            'line_note' => 'تحصيل دفعة إيجار',
        ]);
        JournalEntryItem::create([
            'journal_entry_id' => $entry2->id,
            'account_id' => $this->revenueAccount->id,
            'debit' => 0.0000,
            'credit' => 40000.00,
            'counter_account_id' => $this->cashAccount->id,
            'counter_account_name' => $this->cashAccount->name,
            'cost_center_id' => $this->costCenter->id,
            'line_note' => 'إيراد إيجار برج النور',
        ]);

        // Entry 3: Maintenance Expense (Debit Expense 10,000 / Credit Cash 10,000 with cost center)
        $entry3 = JournalEntry::create([
            'entry_number' => 'JE-2026-0003',
            'fiscal_year_id' => $this->fiscalYear->id,
            'date' => '2026-03-01',
            'explanation' => 'صيانة مصاعد برج النور',
            'total_debit' => 10000.00,
            'total_credit' => 10000.00,
            'status' => 'posted',
            'created_by' => 1,
            'posted_at' => now(),
        ]);
        JournalEntryItem::create([
            'journal_entry_id' => $entry3->id,
            'account_id' => $this->expenseAccount->id,
            'debit' => 10000.00,
            'credit' => 0.0000,
            'counter_account_id' => $this->cashAccount->id,
            'counter_account_name' => $this->cashAccount->name,
            'cost_center_id' => $this->costCenter->id,
            'line_note' => 'مصروف صيانة مصاعد',
        ]);
        JournalEntryItem::create([
            'journal_entry_id' => $entry3->id,
            'account_id' => $this->cashAccount->id,
            'debit' => 0.0000,
            'credit' => 10000.00,
            'counter_account_id' => $this->expenseAccount->id,
            'counter_account_name' => $this->expenseAccount->name,
            'cost_center_id' => $this->costCenter->id,
            'line_note' => 'صرف نقدي للصيانة',
        ]);

        $this->tenantManager->resetToCentral();
    }

    protected function tearDown(): void
    {
        $this->tenantManager->resetToCentral();
        parent::tearDown();
    }

    private function getAccountantToken(): string
    {
        $user = User::where('email', 'accountant@comp1.com')->firstOrFail();
        return $user->createToken('test_reports')->plainTextToken;
    }

    /**
     * Test UC-56: Trial Balance calculation and balance verification
     */
    public function test_trial_balance_is_balanced_and_matches_posted_entries(): void
    {
        $this->app['auth']->forgetGuards();
        $token = $this->getAccountantToken();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->getJson('/api/reports/trial-balance');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.totals.is_balanced', true)
            ->assertJsonPath('data.totals.balance_difference', 0);

        // Net Ending Cash: 100,000 + 40,000 - 10,000 = 130,000
        $accounts = collect($response->json('data.accounts'));
        $cash = $accounts->firstWhere('code', '1101');
        $this->assertEquals(130000.00, (float)$cash['ending_debit']);

        // Revenue: 40,000 Credit
        $rev = $accounts->firstWhere('code', '4101');
        $this->assertEquals(40000.00, (float)$rev['ending_credit']);

        // Expense: 10,000 Debit
        $exp = $accounts->firstWhere('code', '5101');
        $this->assertEquals(10000.00, (float)$exp['ending_debit']);

        // Capital: 100,000 Credit
        $cap = $accounts->firstWhere('code', '3101');
        $this->assertEquals(100000.00, (float)$cap['ending_credit']);

        // Sum Ending Debit = 130,000 + 10,000 = 140,000
        // Sum Ending Credit = 100,000 + 40,000 = 140,000
        $this->assertEquals(140000.00, (float)$response->json('data.totals.ending_debit'));
        $this->assertEquals(140000.00, (float)$response->json('data.totals.ending_credit'));
    }

    /**
     * Test UC-57: General Ledger statement with running balance
     */
    public function test_general_ledger_calculates_running_balance_correctly(): void
    {
        $this->app['auth']->forgetGuards();
        $token = $this->getAccountantToken();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->getJson("/api/reports/general-ledger?account_id={$this->cashAccount->id}");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $this->assertEquals(130000.00, (float)$response->json('data.closing_balance'));

        $rows = $response->json('data.rows');
        $this->assertCount(3, $rows);

        // Row 1: +100,000 -> Running = 100,000
        $this->assertEquals(100000.00, (float)$rows[0]['running_balance']);
        // Row 2: +40,000 -> Running = 140,000
        $this->assertEquals(140000.00, (float)$rows[1]['running_balance']);
        // Row 3: -10,000 -> Running = 130,000
        $this->assertEquals(130000.00, (float)$rows[2]['running_balance']);
    }

    /**
     * Test UC-57 (Part 2): Balance Sheet verifies Total Assets = Total Liabilities + Total Equity
     */
    public function test_balance_sheet_verifies_accounting_equation(): void
    {
        $this->app['auth']->forgetGuards();
        $token = $this->getAccountantToken();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->getJson('/api/reports/balance-sheet');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.is_balanced', true)
            ->assertJsonPath('data.difference', 0);

        // Assets = 130,000 (Cash)
        $this->assertEquals(130000.00, (float)$response->json('data.assets.total'));

        // Liabilities = 0
        $this->assertEquals(0.00, (float)$response->json('data.liabilities.total'));

        // Equity = Capital (100,000) + Net Profit (40,000 - 10,000 = 30,000) = 130,000
        $this->assertEquals(100000.00, (float)$response->json('data.equity.capital'));
        $this->assertEquals(30000.00, (float)$response->json('data.equity.net_profit'));
        $this->assertEquals(130000.00, (float)$response->json('data.equity.total'));

        // Total Liabilities & Equity = 130,000
        $this->assertEquals(130000.00, (float)$response->json('data.total_liabilities_and_equity'));
    }

    /**
     * Test UC-58 & UC-59: Income Statement and Per-Building Income Statement
     */
    public function test_income_statement_and_per_building_income_statement(): void
    {
        $this->app['auth']->forgetGuards();
        $token = $this->getAccountantToken();

        // 1. Overall Income Statement
        $resOverall = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->getJson('/api/reports/income-statement');

        $resOverall->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.is_profit', true);

        $this->assertEquals(40000.00, (float)$resOverall->json('data.revenues.total'));
        $this->assertEquals(10000.00, (float)$resOverall->json('data.expenses.total'));
        $this->assertEquals(30000.00, (float)$resOverall->json('data.net_profit'));

        // 2. Per-Building Income Statement (UC-59)
        $resBuilding = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->getJson("/api/reports/building-income-statement?cost_center_id={$this->costCenter->id}");

        $resBuilding->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.cost_center.code', 'CC-PROP-100');

        $this->assertEquals(40000.00, (float)$resBuilding->json('data.revenues.total'));
        $this->assertEquals(10000.00, (float)$resBuilding->json('data.expenses.total'));
        $this->assertEquals(30000.00, (float)$resBuilding->json('data.net_profit'));
    }
}
