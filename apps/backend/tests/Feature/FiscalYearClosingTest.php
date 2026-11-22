<?php

namespace Tests\Feature;

use App\Models\Central\Company;
use App\Models\Central\User;
use App\Models\Tenant\Account;
use App\Models\Tenant\FiscalPeriod;
use App\Models\Tenant\FiscalYear;
use App\Services\TenantManager;
use Database\Seeders\CentralSeeder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FiscalYearClosingTest extends TestCase
{
    protected Company $company;
    protected TenantManager $tenantManager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(CentralSeeder::class);
        $this->tenantManager = app(TenantManager::class);

        $this->company = Company::where('subdomain', 'comp1')->firstOrFail();
        $this->tenantManager->provisionTenantDatabase($this->company);

        // Clean tenant fiscal and journal tables
        $this->tenantManager->switchConnection($this->company);
        DB::connection('tenant')->table('journal_entry_items')->delete();
        DB::connection('tenant')->table('journal_entries')->delete();
        DB::connection('tenant')->table('vouchers')->delete();
        DB::connection('tenant')->table('fiscal_periods')->delete();
        DB::connection('tenant')->table('fiscal_years')->delete();
        $this->tenantManager->resetToCentral();
    }

    protected function tearDown(): void
    {
        $this->tenantManager->resetToCentral();
        parent::tearDown();
    }

    private function getAccountantToken(): string
    {
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $res = $this->postJson('/api/auth/login', [
            'email' => 'accountant@comp1.com',
            'password' => 'Password@123',
        ]);
        return $res->json('data.token');
    }

    private function getDataEntryToken(): string
    {
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $res = $this->postJson('/api/auth/login', [
            'email' => 'dataentry@comp1.com',
            'password' => 'Password@123',
        ]);
        return $res->json('data.token');
    }

    public function test_can_get_closing_financial_summary(): void
    {
        $token = $this->getAccountantToken();
        $accountant = User::where('email', 'accountant@comp1.com')->first();

        // 1. Create fiscal year 2026
        $fyRes = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/fiscal-years', [
            'name' => 'السنة المالية 2026',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
        ]);
        $fyId = $fyRes->json('fiscal_year.id');

        // 2. Insert posted entries: Revenue = 100,000, Expense = 40,000 -> Net Profit = 60,000
        $this->tenantManager->switchConnection($this->company);
        $revAcc = Account::where('root_type', 'revenues')->firstOrFail();
        $expAcc = Account::where('root_type', 'expenses')->firstOrFail();
        $bankAcc = Account::where('root_type', 'assets')->firstOrFail();

        // Revenue Entry: Debit Bank 100,000 / Credit Revenues 100,000
        $revJeId = DB::connection('tenant')->table('journal_entries')->insertGetId([
            'entry_number' => 'JV-REV-' . uniqid(),
            'fiscal_year_id' => $fyId,
            'date' => '2026-05-10',
            'explanation' => 'قيد تحصيل إيرادات عقارية',
            'total_debit' => 100000,
            'total_credit' => 100000,
            'status' => 'posted',
            'created_by' => $accountant->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::connection('tenant')->table('journal_entry_items')->insert([
            ['journal_entry_id' => $revJeId, 'account_id' => $bankAcc->id, 'debit' => 100000, 'credit' => 0, 'created_at' => now(), 'updated_at' => now()],
            ['journal_entry_id' => $revJeId, 'account_id' => $revAcc->id, 'debit' => 0, 'credit' => 100000, 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Expense Entry: Debit Expenses 40,000 / Credit Bank 40,000
        $expJeId = DB::connection('tenant')->table('journal_entries')->insertGetId([
            'entry_number' => 'JV-EXP-' . uniqid(),
            'fiscal_year_id' => $fyId,
            'date' => '2026-08-20',
            'explanation' => 'قيد مصروفات صيانة وتشغيل',
            'total_debit' => 40000,
            'total_credit' => 40000,
            'status' => 'posted',
            'created_by' => $accountant->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::connection('tenant')->table('journal_entry_items')->insert([
            ['journal_entry_id' => $expJeId, 'account_id' => $expAcc->id, 'debit' => 40000, 'credit' => 0, 'created_at' => now(), 'updated_at' => now()],
            ['journal_entry_id' => $expJeId, 'account_id' => $bankAcc->id, 'debit' => 0, 'credit' => 40000, 'created_at' => now(), 'updated_at' => now()],
        ]);
        $this->tenantManager->resetToCentral();

        // 3. Request closing summary
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->getJson("/api/fiscal-years/{$fyId}/closing-summary");

        $response->assertStatus(200)
            ->assertJsonPath('summary.total_revenue', 100000)
            ->assertJsonPath('summary.total_expenses', 40000)
            ->assertJsonPath('summary.net_profit', 60000)
            ->assertJsonPath('summary.is_profit', true);
    }

    public function test_cannot_close_year_with_pending_draft_vouchers_or_entries(): void
    {
        $token = $this->getAccountantToken();
        $accountant = User::where('email', 'accountant@comp1.com')->first();

        // Create year
        $fyRes = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/fiscal-years', [
            'name' => 'السنة 2027 ' . uniqid(),
            'start_date' => '2027-01-01',
            'end_date' => '2027-12-31',
        ]);
        $fyId = $fyRes->json('fiscal_year.id');

        // Insert a draft journal entry
        $this->tenantManager->switchConnection($this->company);
        DB::connection('tenant')->table('journal_entries')->insert([
            'entry_number' => 'JV-DRAFT-' . uniqid(),
            'fiscal_year_id' => $fyId,
            'date' => '2027-04-01',
            'explanation' => 'قيد مسودة لم يعتمد بعد',
            'total_debit' => 5000,
            'total_credit' => 5000,
            'status' => 'draft',
            'created_by' => $accountant->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->tenantManager->resetToCentral();

        // Attempt closing
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/fiscal-years/{$fyId}/close");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'لا يمكن إغلاق السنة المالية لوجود قيود أو سندات مسودة معلقة');
    }

    public function test_successful_fiscal_year_end_closing_and_equity_rollover(): void
    {
        $token = $this->getAccountantToken();
        $accountant = User::where('email', 'accountant@comp1.com')->first();

        // Create year
        $fyRes = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/fiscal-years', [
            'name' => 'السنة المالية 2028 ' . uniqid(),
            'start_date' => '2028-01-01',
            'end_date' => '2028-12-31',
        ]);
        $fyId = $fyRes->json('fiscal_year.id');

        // Insert posted revenue: 50,000 and expense: 20,000 -> Net Profit: 30,000
        $this->tenantManager->switchConnection($this->company);
        $revAcc = Account::where('root_type', 'revenues')->firstOrFail();
        $expAcc = Account::where('root_type', 'expenses')->firstOrFail();
        $bankAcc = Account::where('root_type', 'assets')->firstOrFail();

        $revJeId = DB::connection('tenant')->table('journal_entries')->insertGetId([
            'entry_number' => 'JV-REV-' . uniqid(),
            'fiscal_year_id' => $fyId,
            'date' => '2028-05-10',
            'explanation' => 'إيراد عقاري',
            'total_debit' => 50000,
            'total_credit' => 50000,
            'status' => 'posted',
            'created_by' => $accountant->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::connection('tenant')->table('journal_entry_items')->insert([
            ['journal_entry_id' => $revJeId, 'account_id' => $bankAcc->id, 'debit' => 50000, 'credit' => 0, 'created_at' => now(), 'updated_at' => now()],
            ['journal_entry_id' => $revJeId, 'account_id' => $revAcc->id, 'debit' => 0, 'credit' => 50000, 'created_at' => now(), 'updated_at' => now()],
        ]);

        $expJeId = DB::connection('tenant')->table('journal_entries')->insertGetId([
            'entry_number' => 'JV-EXP-' . uniqid(),
            'fiscal_year_id' => $fyId,
            'date' => '2028-08-20',
            'explanation' => 'مصروف كهرباء',
            'total_debit' => 20000,
            'total_credit' => 20000,
            'status' => 'posted',
            'created_by' => $accountant->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::connection('tenant')->table('journal_entry_items')->insert([
            ['journal_entry_id' => $expJeId, 'account_id' => $expAcc->id, 'debit' => 20000, 'credit' => 0, 'created_at' => now(), 'updated_at' => now()],
            ['journal_entry_id' => $expJeId, 'account_id' => $bankAcc->id, 'debit' => 0, 'credit' => 20000, 'created_at' => now(), 'updated_at' => now()],
        ]);
        $this->tenantManager->resetToCentral();

        // Execute closing
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/fiscal-years/{$fyId}/close");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.fiscal_year.status', 'closed')
            ->assertJsonPath('data.net_profit', 30000);

        // Verify balanced closing entry in DB
        $this->tenantManager->switchConnection($this->company);
        $closingEntry = DB::connection('tenant')->table('journal_entries')
            ->where('id', $response->json('data.closing_journal_entry_id'))
            ->first();

        $this->assertNotNull($closingEntry);
        $this->assertEquals('posted', $closingEntry->status);
        $this->assertEquals($closingEntry->total_debit, $closingEntry->total_credit);

        // Verify all 12 periods are closed
        $openPeriodsCount = FiscalPeriod::where('fiscal_year_id', $fyId)->where('status', 'open')->count();
        $this->assertEquals(0, $openPeriodsCount);

        // Verify year status is closed
        $fy = FiscalYear::find($fyId);
        $this->assertEquals('closed', $fy->status);
        $this->assertNotNull($fy->closed_at);
        $this->tenantManager->resetToCentral();

        // Attempting to close again returns 422
        $againResponse = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/fiscal-years/{$fyId}/close");

        $againResponse->assertStatus(422)
            ->assertJsonPath('message', 'السنة المالية مغلقة بالفعل');
    }

    public function test_data_entry_cannot_close_fiscal_year(): void
    {
        $accountantToken = $this->getAccountantToken();

        $fy = $this->withHeaders([
            'Authorization' => "Bearer {$accountantToken}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/fiscal-years', [
            'name' => 'السنة 2029 ' . uniqid(),
            'start_date' => '2029-01-01',
            'end_date' => '2029-12-31',
        ])->json('fiscal_year');

        // Clear cached auth guards before switching to data entry
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $dataEntryToken = $this->getDataEntryToken();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$dataEntryToken}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/fiscal-years/{$fy['id']}/close");

        $response->assertStatus(403);
    }
}

