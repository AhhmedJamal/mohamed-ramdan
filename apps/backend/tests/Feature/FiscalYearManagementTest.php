<?php

namespace Tests\Feature;

use App\Models\Central\Company;
use App\Models\Central\User;
use App\Models\Tenant\FiscalPeriod;
use App\Models\Tenant\FiscalYear;
use App\Services\FiscalPeriodService;
use App\Services\TenantManager;
use Database\Seeders\CentralSeeder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FiscalYearManagementTest extends TestCase
{
    protected Company $company;
    protected TenantManager $tenantManager;
    protected FiscalPeriodService $periodService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(CentralSeeder::class);
        $this->tenantManager = app(TenantManager::class);
        $this->periodService = app(FiscalPeriodService::class);

        $this->company = Company::where('subdomain', 'comp1')->firstOrFail();
        $this->tenantManager->provisionTenantDatabase($this->company);

        // Clean tenant fiscal and journal tables to avoid cross-test run overlaps
        $this->tenantManager->switchConnection($this->company);
        DB::connection('tenant')->table('journal_entry_items')->delete();
        DB::connection('tenant')->table('journal_entries')->delete();
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

    public function test_can_create_fiscal_year_with_12_auto_generated_periods(): void
    {
        $token = $this->getAccountantToken();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/fiscal-years', [
            'name' => 'السنة المالية 2026',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('fiscal_year.name', 'السنة المالية 2026')
            ->assertJsonPath('fiscal_year.status', 'open');

        $periods = $response->json('fiscal_year.periods');
        $this->assertCount(12, $periods);
        $this->assertEquals(1, $periods[0]['period_number']);
        $this->assertEquals(12, $periods[11]['period_number']);
        $this->assertEquals('open', $periods[0]['status']);
    }

    public function test_invalid_date_range_is_rejected(): void
    {
        $token = $this->getAccountantToken();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/fiscal-years', [
            'name' => 'سنة غير صحيحة',
            'start_date' => '2027-12-31',
            'end_date' => '2027-01-01',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.end_date.0', 'تاريخ النهاية يجب أن يكون أكبر من تاريخ البداية');
    }

    public function test_overlapping_fiscal_year_is_rejected(): void
    {
        $token = $this->getAccountantToken();

        // Create first year
        $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/fiscal-years', [
            'name' => 'السنة الأولى 2028',
            'start_date' => '2028-01-01',
            'end_date' => '2028-12-31',
        ])->assertStatus(201);

        // Attempt overlap
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/fiscal-years', [
            'name' => 'سنة متداخلة 2028',
            'start_date' => '2028-06-01',
            'end_date' => '2029-05-31',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'توجد سنة مالية أخرى تغطي نفس الفترة الزمنية');
    }

    public function test_can_toggle_period_status_and_enforce_period_lock(): void
    {
        $token = $this->getAccountantToken();

        // Create Fiscal Year 2030
        $res = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/fiscal-years', [
            'name' => 'السنة المالية 2030',
            'start_date' => '2030-01-01',
            'end_date' => '2030-12-31',
        ]);
        $fyId = $res->json('fiscal_year.id');
        $period1 = $res->json('fiscal_year.periods.0');

        // Check date in period 1 is currently open
        $checkRes1 = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->getJson('/api/fiscal-years/check-date?date=2030-01-15');
        $checkRes1->assertStatus(200)
            ->assertJsonPath('is_open', true);

        // Close period 1
        $toggleRes = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/fiscal-years/{$fyId}/periods/{$period1['id']}/toggle");
        $toggleRes->assertStatus(200)
            ->assertJsonPath('period.status', 'closed');

        // Check date in period 1 is now locked
        $checkRes2 = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->getJson('/api/fiscal-years/check-date?date=2030-01-15');
        $checkRes2->assertStatus(422)
            ->assertJsonPath('message', 'الفترة المالية مغلقة، لا يمكن إضافة أو تعديل قيود بها');

        // Reopen period 1
        $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/fiscal-years/{$fyId}/periods/{$period1['id']}/toggle")
            ->assertStatus(200)
            ->assertJsonPath('period.status', 'open');

        // Check date is open again
        $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->getJson('/api/fiscal-years/check-date?date=2030-01-15')
            ->assertStatus(200)
            ->assertJsonPath('is_open', true);
    }

    public function test_data_entry_cannot_create_year_or_toggle_period(): void
    {
        $accountantToken = $this->getAccountantToken();

        // Accountant creates year
        $fy = $this->withHeaders([
            'Authorization' => "Bearer {$accountantToken}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/fiscal-years', [
            'name' => 'السنة المالية 2031',
            'start_date' => '2031-01-01',
            'end_date' => '2031-12-31',
        ])->json('fiscal_year');

        // Clear cached auth guards before switching to data entry
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $dataEntryToken = $this->getDataEntryToken();

        // Data Entry can read
        $this->withHeaders([
            'Authorization' => "Bearer {$dataEntryToken}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->getJson('/api/fiscal-years')->assertStatus(200);

        // Data Entry forbidden to create
        $this->withHeaders([
            'Authorization' => "Bearer {$dataEntryToken}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/fiscal-years', [
            'name' => 'سنة ممنوعة',
            'start_date' => '2032-01-01',
            'end_date' => '2032-12-31',
        ])->assertStatus(403);

        // Data Entry forbidden to toggle period
        $this->withHeaders([
            'Authorization' => "Bearer {$dataEntryToken}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/fiscal-years/{$fy['id']}/periods/{$fy['periods'][0]['id']}/toggle")
            ->assertStatus(403);
    }
}
