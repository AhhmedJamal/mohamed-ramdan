<?php

namespace Tests\Feature;

use App\Models\Central\Company;
use App\Models\Central\User;
use App\Models\Tenant\Account;
use App\Models\Tenant\CostCenter;
use App\Models\Tenant\FiscalPeriod;
use App\Models\Tenant\FiscalYear;
use App\Models\Tenant\Installment;
use App\Models\Tenant\JournalEntry;
use App\Models\Tenant\Property;
use App\Models\Tenant\RentalContract;
use App\Models\Tenant\Tenant;
use App\Models\Tenant\Unit;
use App\Models\Tenant\Voucher;
use App\Services\TenantManager;
use Database\Seeders\CentralSeeder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class VoucherAndJournalEntryTest extends TestCase
{
    protected Company $company;
    protected TenantManager $tenantManager;
    protected Account $cashAccount;
    protected Account $revenueAccount;
    protected Account $expenseAccount;
    protected CostCenter $costCenter;
    protected RentalContract $contract;
    protected Installment $installment;
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

        // 1. Fiscal Year & Open Monthly Periods
        $this->fiscalYear = FiscalYear::create([
            'name' => 'السنة المالية 2026',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'open',
        ]);
        for ($m = 1; $m <= 12; $m++) {
            $s = sprintf('2026-%02d-01', $m);
            $e = date('Y-m-t', strtotime($s));
            FiscalPeriod::create([
                'fiscal_year_id' => $this->fiscalYear->id,
                'period_number' => $m,
                'start_date' => $s,
                'end_date' => $e,
                'status' => 'open',
            ]);
        }

        // 2. Chart of Accounts roots & sub accounts
        $assetsRoot = Account::create([
            'code' => '1000',
            'name' => 'الأصول',
            'root_type' => 'assets',
            'nature' => 'debit',
            'account_type' => 'root',
            'is_fixed_root' => true,
        ]);
        $this->cashAccount = Account::create([
            'code' => '1101',
            'name' => 'الصندوق / الخزينة الرئيسية',
            'root_type' => 'assets',
            'nature' => 'debit',
            'account_type' => 'sub',
            'parent_id' => $assetsRoot->id,
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
            'name' => 'إيرادات تأجير العقارات',
            'root_type' => 'revenues',
            'nature' => 'credit',
            'account_type' => 'sub',
            'parent_id' => $revRoot->id,
            'is_cost_center_mandatory' => true,
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
            'name' => 'مصروفات صيانة المباني',
            'root_type' => 'expenses',
            'nature' => 'debit',
            'account_type' => 'sub',
            'parent_id' => $expRoot->id,
            'is_cost_center_mandatory' => true,
        ]);

        // 3. Cost Center & Property
        $this->costCenter = CostCenter::create([
            'code' => 'CC-PROP-TEST-FIN',
            'name' => 'مركز برج الأعمال',
            'type' => 'property',
            'status' => 'active',
        ]);

        $property = Property::create([
            'name' => 'برج الأعمال التجاري',
            'address' => 'الرياض',
            'type' => 'commercial',
            'units_count' => 1,
            'cost_center_id' => $this->costCenter->id,
        ]);

        $unit = Unit::create([
            'property_id' => $property->id,
            'unit_number' => 'OFF-101',
            'type' => 'office',
            'status' => 'occupied',
        ]);

        $tenant = Tenant::create([
            'name' => 'شركة الرواد للاستثمار',
            'type' => 'company',
            'national_id_or_cr' => '7009988776',
            'mobile' => '0555001122',
            'email' => 'alrowad@example.com',
        ]);

        $this->contract = RentalContract::create([
            'contract_number' => 'CNT-202601-0001',
            'tenant_id' => $tenant->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'contract_type' => 'company_to_tenant',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'duration_months' => 12,
            'total_rent' => 120000.00,
            'collection_cycle' => 'quarterly',
            'status' => 'active',
            'created_by' => 1,
        ]);

        $this->installment = Installment::create([
            'contract_id' => $this->contract->id,
            'installment_number' => 1,
            'due_date' => '2026-04-01',
            'amount' => 30000.00,
            'paid_amount' => 0.0000,
            'status' => 'due',
        ]);

        $this->tenantManager->resetToCentral();
    }

    protected function tearDown(): void
    {
        $this->tenantManager->resetToCentral();
        parent::tearDown();
    }

    private function getDataEntryToken(): string
    {
        $user = User::where('email', 'dataentry@comp1.com')->firstOrFail();
        return $user->createToken('test_token')->plainTextToken;
    }

    private function getAccountantToken(): string
    {
        $user = User::where('email', 'accountant@comp1.com')->firstOrFail();
        return $user->createToken('test_token')->plainTextToken;
    }

    public function test_data_entry_can_create_draft_receipt_and_disbursement_vouchers(): void
    {
        $this->app['auth']->forgetGuards();
        $dataEntryToken = $this->getDataEntryToken();

        // 1. Create Receipt Voucher (UC-43)
        $receiptRes = $this->withHeaders([
            'Authorization' => 'Bearer ' . $dataEntryToken,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/vouchers/receipt', [
            'contract_id' => $this->contract->id,
            'installment_id' => $this->installment->id,
            'amount' => 30000.00,
            'date' => '2026-04-02',
            'payment_method' => 'bank_transfer',
            'debit_account_id' => $this->cashAccount->id,
            'credit_account_id' => $this->revenueAccount->id,
            'notes' => 'تحصيل الدفعة الأولى عبر تحويل بنكي',
        ]);

        $receiptRes->assertStatus(201);
        $receiptRes->assertJsonPath('data.status', 'draft');
        $receiptRes->assertJsonPath('data.type', 'receipt');
        $this->assertStringStartsWith('RV-', $receiptRes->json('data.voucher_number'));

        // 2. Create Disbursement Voucher (UC-44)
        $this->app['auth']->forgetGuards();
        $disbRes = $this->withHeaders([
            'Authorization' => 'Bearer ' . $dataEntryToken,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/vouchers/disbursement', [
            'expense_type' => 'maintenance',
            'amount' => 2500.00,
            'date' => '2026-04-05',
            'cost_center_id' => $this->costCenter->id,
            'debit_account_id' => $this->expenseAccount->id,
            'credit_account_id' => $this->cashAccount->id,
            'payment_method' => 'cash',
            'notes' => 'صيانة دورية للمصاعد والمضخات',
        ]);

        $disbRes->assertStatus(201);
        $disbRes->assertJsonPath('data.status', 'draft');
        $disbRes->assertJsonPath('data.type', 'disbursement');
        $this->assertStringStartsWith('DV-', $disbRes->json('data.voucher_number'));
    }

    public function test_data_entry_cannot_approve_voucher_due_to_rbac(): void
    {
        $this->tenantManager->switchConnection($this->company);
        $voucher = Voucher::create([
            'voucher_number' => 'RV-202604-0099',
            'type' => 'receipt',
            'contract_id' => $this->contract->id,
            'installment_id' => $this->installment->id,
            'amount' => 10000.00,
            'date' => '2026-04-01',
            'cost_center_id' => $this->costCenter->id,
            'debit_account_id' => $this->cashAccount->id,
            'credit_account_id' => $this->revenueAccount->id,
            'payment_method' => 'cash',
            'status' => 'draft',
            'created_by' => 1,
        ]);
        $this->tenantManager->resetToCentral();

        $this->app['auth']->forgetGuards();
        $dataEntryToken = $this->getDataEntryToken();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $dataEntryToken,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/vouchers/{$voucher->id}/approve");

        $response->assertStatus(403);
    }

    public function test_accountant_approves_voucher_generates_balanced_journal_entry(): void
    {
        $this->tenantManager->switchConnection($this->company);
        $voucher = Voucher::create([
            'voucher_number' => 'RV-202604-0088',
            'type' => 'receipt',
            'contract_id' => $this->contract->id,
            'installment_id' => $this->installment->id,
            'amount' => 30000.00,
            'date' => '2026-04-01',
            'cost_center_id' => $this->costCenter->id,
            'debit_account_id' => $this->cashAccount->id,
            'credit_account_id' => $this->revenueAccount->id,
            'payment_method' => 'bank_transfer',
            'status' => 'draft',
            'created_by' => 1,
        ]);
        $this->tenantManager->resetToCentral();

        $this->app['auth']->forgetGuards();
        $accountantToken = $this->getAccountantToken();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $accountantToken,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/vouchers/{$voucher->id}/approve");

        $response->assertStatus(200);
        $response->assertJsonPath('data.voucher.status', 'approved');

        // Verify Journal Entry created & posted
        $jeId = $response->json('data.voucher.journal_entry_id');
        $this->assertNotNull($jeId);

        $this->tenantManager->switchConnection($this->company);
        $je = JournalEntry::with('items')->find($jeId);
        $this->assertEquals('posted', $je->status);
        $this->assertEquals(30000.00, $je->total_debit);
        $this->assertEquals(30000.00, $je->total_credit);
        $this->assertCount(2, $je->items);

        // Verify Installment marked paid
        $updatedInstallment = Installment::find($this->installment->id);
        $this->assertEquals('paid', $updatedInstallment->status);
        $this->assertEquals(30000.00, $updatedInstallment->paid_amount);

        $this->tenantManager->resetToCentral();
    }

    public function test_accountant_rejects_voucher_with_reason_and_data_entry_resubmits(): void
    {
        $this->tenantManager->switchConnection($this->company);
        $voucher = Voucher::create([
            'voucher_number' => 'DV-202604-0077',
            'type' => 'disbursement',
            'expense_type' => 'other',
            'amount' => 1500.00,
            'date' => '2026-04-10',
            'cost_center_id' => $this->costCenter->id,
            'debit_account_id' => $this->expenseAccount->id,
            'credit_account_id' => $this->cashAccount->id,
            'payment_method' => 'cash',
            'status' => 'draft',
            'created_by' => 1,
        ]);
        $this->tenantManager->resetToCentral();

        $this->app['auth']->forgetGuards();
        $accountantToken = $this->getAccountantToken();

        // 1. Rejection with reason < 10 chars -> fails (UC-48)
        $shortRes = $this->withHeaders([
            'Authorization' => 'Bearer ' . $accountantToken,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/vouchers/{$voucher->id}/reject", [
            'rejection_reason' => 'مرفوض',
        ]);
        $shortRes->assertStatus(422);
        $shortRes->assertJsonPath('message', 'يجب إدخال سبب الرفض بحيث لا يقل عن 10 أحرف');

        // 2. Rejection with valid reason
        $this->app['auth']->forgetGuards();
        $rejectRes = $this->withHeaders([
            'Authorization' => 'Bearer ' . $accountantToken,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/vouchers/{$voucher->id}/reject", [
            'rejection_reason' => 'يرجى إرفاق فاتورة الصيانة الضريبية الأصلية وتعديل البيان',
        ]);
        $rejectRes->assertStatus(200);
        $rejectRes->assertJsonPath('data.status', 'rejected');

        // 3. Data Entry modifies rejected voucher -> reverts to draft (UC-45)
        $this->app['auth']->forgetGuards();
        $dataEntryToken = $this->getDataEntryToken();

        $updateRes = $this->withHeaders([
            'Authorization' => 'Bearer ' . $dataEntryToken,
            'X-Tenant-Subdomain' => 'comp1',
        ])->putJson("/api/vouchers/{$voucher->id}", [
            'notes' => 'تم إرفاق الفاتورة وتصحيح تفاصيل الصيانة',
        ]);
        $updateRes->assertStatus(200);
        $updateRes->assertJsonPath('data.status', 'draft');
    }

    public function test_manual_balanced_journal_entry_posting_and_immutability(): void
    {
        $this->app['auth']->forgetGuards();
        $accountantToken = $this->getAccountantToken();

        // 1. Imbalanced entry -> fails (UC-49 Alternative 1)
        $imbalancedRes = $this->withHeaders([
            'Authorization' => 'Bearer ' . $accountantToken,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/journal-entries', [
            'date' => '2026-04-15',
            'explanation' => 'قيد تسوية إهلاك الأصول والآلات',
            'items' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 10000.00, 'credit' => 0.00],
                ['account_id' => $this->revenueAccount->id, 'cost_center_id' => $this->costCenter->id, 'debit' => 0.00, 'credit' => 8000.00],
            ],
        ]);
        $imbalancedRes->assertStatus(422);
        $imbalancedRes->assertJsonPath('message', 'القيد غير متوازن، إجمالي المدين يجب أن يساوي إجمالي الدائن');

        // 2. Missing mandatory cost center -> fails (UC-49 Alternative 2)
        $this->app['auth']->forgetGuards();
        $missingCcRes = $this->withHeaders([
            'Authorization' => 'Bearer ' . $accountantToken,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/journal-entries', [
            'date' => '2026-04-15',
            'explanation' => 'قيد تسوية إيرادات بدون مركز تكلفة',
            'items' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 10000.00, 'credit' => 0.00],
                ['account_id' => $this->revenueAccount->id, 'cost_center_id' => null, 'debit' => 0.00, 'credit' => 10000.00], // missing CC
            ],
        ]);
        $missingCcRes->assertStatus(422);

        // 3. Balanced entry with required cost center -> success (UC-49)
        $this->app['auth']->forgetGuards();
        $validRes = $this->withHeaders([
            'Authorization' => 'Bearer ' . $accountantToken,
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/journal-entries', [
            'date' => '2026-04-15',
            'explanation' => 'قيد تسوية إيرادات وتوزيع أرباح ربع سنوية',
            'items' => [
                ['account_id' => $this->cashAccount->id, 'debit' => 10000.00, 'credit' => 0.00],
                ['account_id' => $this->revenueAccount->id, 'cost_center_id' => $this->costCenter->id, 'debit' => 0.00, 'credit' => 10000.00],
            ],
            'is_posted' => true,
        ]);
        $validRes->assertStatus(201);
        $validRes->assertJsonPath('data.status', 'posted');
        $entryId = $validRes->json('data.id');

        // 4. Cannot delete posted entry -> fails (UC-49 Business Rules)
        $this->app['auth']->forgetGuards();
        $delRes = $this->withHeaders([
            'Authorization' => 'Bearer ' . $accountantToken,
            'X-Tenant-Subdomain' => 'comp1',
        ])->deleteJson("/api/journal-entries/{$entryId}");
        $delRes->assertStatus(422);
        $delRes->assertJsonPath('message', 'لا يمكن حذف قيد مرحّل');
    }
}
