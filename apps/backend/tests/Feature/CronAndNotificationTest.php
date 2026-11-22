<?php

namespace Tests\Feature;

use App\Models\Central\Company;
use App\Models\Central\User;
use App\Models\Tenant\Account;
use App\Models\Tenant\CostCenter;
use App\Models\Tenant\FiscalPeriod;
use App\Models\Tenant\FiscalYear;
use App\Models\Tenant\Installment;
use App\Models\Tenant\Notification;
use App\Models\Tenant\Property;
use App\Models\Tenant\RentalContract;
use App\Models\Tenant\SmsLog;
use App\Models\Tenant\Tenant;
use App\Models\Tenant\Unit;
use App\Models\Tenant\Voucher;
use App\Services\SmsGatewayService;
use App\Services\TenantManager;
use Database\Seeders\CentralSeeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CronAndNotificationTest extends TestCase
{
    protected Company $company;
    protected TenantManager $tenantManager;
    protected RentalContract $contract;
    protected Installment $instDueIn7Days;
    protected Installment $instDueToday;
    protected Installment $instPastDue;
    protected Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(CentralSeeder::class);
        $this->tenantManager = app(TenantManager::class);

        $this->company = Company::where('subdomain', 'comp1')->firstOrFail();

        foreach (Company::all() as $comp) {
            $this->tenantManager->provisionTenantDatabase($comp);
        }

        $this->tenantManager->switchConnection($this->company);

        // Clean tables
        DB::connection('tenant')->statement('PRAGMA foreign_keys = OFF;');
        DB::connection('tenant')->table('sms_logs')->delete();
        DB::connection('tenant')->table('notifications')->delete();
        DB::connection('tenant')->table('vouchers')->delete();
        DB::connection('tenant')->table('installments')->delete();
        DB::connection('tenant')->table('rental_contracts')->delete();
        DB::connection('tenant')->table('tenants')->delete();
        DB::connection('tenant')->table('units')->delete();
        DB::connection('tenant')->table('properties')->delete();
        DB::connection('tenant')->table('cost_centers')->delete();
        DB::connection('tenant')->table('fiscal_periods')->delete();
        DB::connection('tenant')->table('fiscal_years')->delete();
        DB::connection('tenant')->table('accounts')->delete();
        DB::connection('tenant')->statement('PRAGMA foreign_keys = ON;');

        // Seed basic property and tenant
        $cc = CostCenter::create([
            'code' => 'CC-PROP-NOTIF',
            'name' => 'عمارة الإشعارات',
            'type' => 'property',
            'status' => 'active',
        ]);

        $prop = Property::create([
            'name' => 'عمارة النخيل',
            'type' => 'residential',
            'units_count' => 10,
            'cost_center_id' => $cc->id,
            'address' => 'الرياض',
        ]);

        $unit = Unit::create([
            'property_id' => $prop->id,
            'unit_number' => 'U-101',
            'type' => 'apartment',
            'status' => 'occupied',
        ]);

        $this->tenant = Tenant::create([
            'name' => 'عبدالله المحمد',
            'type' => 'individual',
            'national_id_or_cr' => '1099887766',
            'mobile' => '0501234567',
            'email' => 'abdullah@example.com',
        ]);

        $today = Carbon::today();

        $this->contract = RentalContract::create([
            'contract_number' => 'CNT-2026-CRON-01',
            'tenant_id' => $this->tenant->id,
            'property_id' => $prop->id,
            'unit_id' => $unit->id,
            'contract_type' => 'company_to_tenant',
            'start_date' => $today->copy()->subMonths(6)->toDateString(),
            'end_date' => $today->copy()->addMonths(6)->toDateString(),
            'duration_months' => 12,
            'total_rent' => 60000.00,
            'collection_cycle' => 'quarterly',
            'status' => 'active',
            'created_by' => 1,
        ]);

        // 1. Installment due in 7 days
        $this->instDueIn7Days = Installment::create([
            'contract_id' => $this->contract->id,
            'installment_number' => 1,
            'due_date' => $today->copy()->addDays(7)->toDateString(),
            'amount' => 15000.00,
            'paid_amount' => 0.00,
            'status' => 'due',
        ]);

        // 2. Installment due today
        $this->instDueToday = Installment::create([
            'contract_id' => $this->contract->id,
            'installment_number' => 2,
            'due_date' => $today->toDateString(),
            'amount' => 15000.00,
            'paid_amount' => 0.00,
            'status' => 'due',
        ]);

        // 3. Installment past due
        $this->instPastDue = Installment::create([
            'contract_id' => $this->contract->id,
            'installment_number' => 3,
            'due_date' => $today->copy()->subDays(5)->toDateString(),
            'amount' => 15000.00,
            'paid_amount' => 0.00,
            'status' => 'due',
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
        return $user->createToken('test_notif')->plainTextToken;
    }

    private function getDataEntryToken(): string
    {
        $user = User::where('email', 'dataentry@comp1.com')->firstOrFail();
        return $user->createToken('test_notif')->plainTextToken;
    }

    /**
     * Test UC-64, UC-65 & UC-69: Daily rent reminder cron command
     */
    public function test_daily_rent_reminders_cron_job(): void
    {
        $exitCode = Artisan::call('erp:send-rent-reminders');
        $this->assertEquals(0, $exitCode);

        $this->tenantManager->switchConnection($this->company);

        // Verify 7-day advance notification was created
        $this->assertDatabaseHas('notifications', [
            'type' => 'rent_reminder_7_days',
            'role' => 'tenant',
        ], 'tenant');

        // Verify due-today notification was created
        $this->assertDatabaseHas('notifications', [
            'type' => 'rent_due_today',
            'role' => 'tenant',
        ], 'tenant');

        // Verify SMS log was recorded
        $this->assertDatabaseHas('sms_logs', [
            'recipient_mobile' => '0501234567',
            'status' => 'sent',
        ], 'tenant');

        $this->tenantManager->switchConnection($this->company);
        $notifCountBefore = Notification::count();

        // Idempotency: re-running does not duplicate notifications today
        Artisan::call('erp:send-rent-reminders');
        $this->tenantManager->switchConnection($this->company);
        $notifCountAfter = Notification::count();
        $this->assertEquals($notifCountBefore, $notifCountAfter);

        $this->tenantManager->resetToCentral();
    }

    /**
     * Test UC-66 & Section 4.3: Daily overdue status transition cron command
     */
    public function test_daily_overdue_contracts_transition_cron_job(): void
    {
        $exitCode = Artisan::call('erp:update-overdue-contracts');
        $this->assertEquals(0, $exitCode);

        $this->tenantManager->switchConnection($this->company);

        // Installment past due should transition to 'overdue'
        $this->instPastDue->refresh();
        $this->assertEquals('overdue', $this->instPastDue->status);

        // Contract should transition to 'overdue'
        $this->contract->refresh();
        $this->assertEquals('overdue', $this->contract->status);

        // Manager and Accountant should receive In-App notification (UC-66)
        $this->assertDatabaseHas('notifications', [
            'type' => 'contract_overdue',
            'role' => 'branch_manager',
        ], 'tenant');

        $this->assertDatabaseHas('notifications', [
            'type' => 'contract_overdue',
            'role' => 'general_accountant',
        ], 'tenant');

        $this->tenantManager->resetToCentral();
    }

    /**
     * Test UC-67 & UC-68: In-App Notifications API
     */
    public function test_in_app_notifications_lifecycle_and_api(): void
    {
        $this->app['auth']->forgetGuards();
        $accToken = $this->getAccountantToken();
        $deToken = $this->getDataEntryToken();

        $this->tenantManager->switchConnection($this->company);
        $notif = Notification::create([
            'role' => 'general_accountant',
            'type' => 'draft_voucher_created',
            'title' => 'سند مسودة بانتظار الاعتماد',
            'message' => 'تم إنشاء سند قبض جديد برقم RV-2026-0001',
            'is_read' => false,
        ]);
        $this->tenantManager->resetToCentral();

        // Accountant fetches notifications
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$accToken}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->getJson('/api/notifications');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('unread_count', 1);

        // Accountant marks notification as read
        $readRes = $this->withHeaders([
            'Authorization' => "Bearer {$accToken}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/notifications/{$notif->id}/read");

        $readRes->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.is_read', true);

        $this->tenantManager->switchConnection($this->company);
        $notif->refresh();
        $this->assertTrue((bool)$notif->is_read);
        $this->assertNotNull($notif->read_at);
        $this->tenantManager->resetToCentral();
    }

    /**
     * Test UC-69: SMS Gateway Adapter validation and error handling
     */
    public function test_sms_gateway_service_validation(): void
    {
        $this->tenantManager->switchConnection($this->company);
        $smsService = app(SmsGatewayService::class);

        // 1. Invalid Saudi mobile number
        $resInvalid = $smsService->send('12345', 'رسالة تجريبية');
        $this->assertFalse($resInvalid['success']);
        $this->assertDatabaseHas('sms_logs', [
            'recipient_mobile' => '12345',
            'status' => 'failed',
        ], 'tenant');

        // 2. Valid Saudi mobile number
        $resValid = $smsService->send('0509876543', 'رسالة ترحيبية');
        $this->assertTrue($resValid['success']);
        $this->assertDatabaseHas('sms_logs', [
            'recipient_mobile' => '0509876543',
            'status' => 'sent',
        ], 'tenant');

        $this->tenantManager->resetToCentral();
    }
}
