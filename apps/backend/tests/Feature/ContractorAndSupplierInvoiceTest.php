<?php

namespace Tests\Feature;

use App\Models\Central\Company;
use App\Models\Central\User;
use App\Models\Tenant\Account;
use App\Models\Tenant\ContractorInvoice;
use App\Models\Tenant\ContractorInvoiceItem;
use App\Models\Tenant\CostCenter;
use App\Models\Tenant\FiscalPeriod;
use App\Models\Tenant\FiscalYear;
use App\Models\Tenant\JournalEntry;
use App\Models\Tenant\SupplierInvoice;
use App\Services\TenantManager;
use Database\Seeders\CentralSeeder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ContractorAndSupplierInvoiceTest extends TestCase
{
    protected Company $company;
    protected TenantManager $tenantManager;
    protected Account $wipAccount;
    protected Account $vatInputAccount;
    protected Account $payableAccount;
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
        DB::connection('tenant')->table('contractor_invoice_items')->delete();
        DB::connection('tenant')->table('contractor_invoices')->delete();
        DB::connection('tenant')->table('supplier_invoices')->delete();
        DB::connection('tenant')->table('journal_entry_items')->delete();
        DB::connection('tenant')->table('journal_entries')->delete();
        DB::connection('tenant')->table('cost_centers')->delete();
        DB::connection('tenant')->table('fiscal_periods')->delete();
        DB::connection('tenant')->table('fiscal_years')->delete();
        DB::connection('tenant')->table('accounts')->delete();
        DB::connection('tenant')->statement('PRAGMA foreign_keys = ON;');

        // Seed accounts
        $expRoot = Account::create([
            'code' => '5000',
            'name' => 'المصروفات',
            'root_type' => 'expenses',
            'nature' => 'debit',
            'account_type' => 'root',
            'is_fixed_root' => true,
        ]);

        $this->wipAccount = Account::create([
            'code' => '5101',
            'name' => 'أعمال مقاولات تحت التنفيذ',
            'root_type' => 'expenses',
            'nature' => 'debit',
            'account_type' => 'sub',
            'parent_id' => $expRoot->id,
            'is_cost_center_mandatory' => true,
        ]);

        $assetsRoot = Account::create([
            'code' => '1000',
            'name' => 'الأصول',
            'root_type' => 'assets',
            'nature' => 'debit',
            'account_type' => 'root',
            'is_fixed_root' => true,
        ]);

        $this->vatInputAccount = Account::create([
            'code' => '1205',
            'name' => 'ضريبة القيمة المضافة المدخلات',
            'root_type' => 'assets',
            'nature' => 'debit',
            'account_type' => 'sub',
            'parent_id' => $assetsRoot->id,
        ]);

        $liabRoot = Account::create([
            'code' => '2000',
            'name' => 'الخصوم',
            'root_type' => 'liabilities',
            'nature' => 'credit',
            'account_type' => 'root',
            'is_fixed_root' => true,
        ]);

        $this->payableAccount = Account::create([
            'code' => '2101',
            'name' => 'حساب الموردين والمقاولين',
            'root_type' => 'liabilities',
            'nature' => 'credit',
            'account_type' => 'sub',
            'parent_id' => $liabRoot->id,
        ]);

        // Seed Cost Center
        $this->costCenter = CostCenter::create([
            'code' => 'CC-BLD-01',
            'name' => 'مشروع برج الأمل',
            'type' => 'contracting_project',
            'status' => 'active',
        ]);

        // Seed Fiscal Year
        $this->fiscalYear = FiscalYear::create([
            'year' => 2026,
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

    /**
     * Test UC-52 & UC-53: Data Entry can create a draft contractor progress billing with line items
     */
    public function test_data_entry_can_create_draft_contractor_invoice(): void
    {
        $this->app['auth']->forgetGuards();
        $token = $this->getDataEntryToken();

        $payload = [
            'invoice_number' => 'CNT-INV-2026-001',
            'contractor_name' => 'شركة البناء المتقدم للمقاولات',
            'date' => '2026-03-15',
            'cost_center_id' => $this->costCenter->id,
            'tax_rate' => 15,
            'notes' => 'مستخلص الأعمال الإنشائية للمرحلة الثانية',
            'items' => [
                [
                    'item_name' => 'صب خرسانة مسلحة للأعمدة',
                    'quantity' => 50,
                    'unit' => 'متر مكعب',
                    'unit_price' => 400.00,
                ],
                [
                    'item_name' => 'أعمال حديد تسليح عالي المقاومة',
                    'quantity' => 10,
                    'unit' => 'طن',
                    'unit_price' => 3000.00,
                ],
            ],
        ];

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/contractor-invoices', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.contractor_name', 'شركة البناء المتقدم للمقاولات');

        $this->assertDatabaseHas('contractor_invoices', [
            'contractor_name' => 'شركة البناء المتقدم للمقاولات',
            'gross_total' => 50000.00, // (50 * 400) + (10 * 3000) = 20000 + 30000 = 50000
            'tax_amount' => 7500.00, // 15% VAT = 7500
            'grand_total' => 57500.00,
            'status' => 'draft',
        ], 'tenant');

        $this->assertDatabaseCount('contractor_invoice_items', 2, 'tenant');
    }

    /**
     * Test UC-54: General Accountant can approve contractor invoice and generate balanced GL entry
     */
    public function test_accountant_can_approve_contractor_invoice_and_generate_balanced_entry(): void
    {
        $this->app['auth']->forgetGuards();
        $token = $this->getAccountantToken();

        $this->tenantManager->switchConnection($this->company);
        $invoice = ContractorInvoice::create([
            'invoice_number' => 'BLD-2026-0001',
            'contractor_name' => 'مؤسسة إعمار الخليج للمقاولات',
            'date' => '2026-04-10',
            'cost_center_id' => $this->costCenter->id,
            'gross_total' => 10000.00,
            'tax_amount' => 1500.00,
            'grand_total' => 11500.00,
            'status' => 'draft',
            'created_by' => 1,
        ]);
        $this->tenantManager->resetToCentral();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/contractor-invoices/{$invoice->id}/approve");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.status', 'approved');

        $this->tenantManager->switchConnection($this->company);
        $invoice->refresh();
        $this->assertEquals('approved', $invoice->status);

        $entry = JournalEntry::with('items')->where('explanation', 'like', "%{$invoice->invoice_number}%")->first();
        $this->assertNotNull($entry);
        $this->assertEquals(11500.00, (float)$entry->total_debit);
        $this->assertEquals(11500.00, (float)$entry->total_credit);
        $this->assertEquals('posted', $entry->status);

        $this->tenantManager->resetToCentral();
    }

    /**
     * Test UC-55: Data Entry can create a draft supplier invoice and General Accountant can approve it
     */
    public function test_supplier_invoice_lifecycle_and_gl_posting(): void
    {
        $this->app['auth']->forgetGuards();
        $deToken = $this->getDataEntryToken();
        $accToken = $this->getAccountantToken();

        // 1. Data Entry creates draft supplier invoice
        $payload = [
            'invoice_number' => 'SUP-INV-2026-001',
            'supplier_name' => 'شركة مصاعد الخليج الحديثة',
            'date' => '2026-05-20',
            'gross_amount' => 20000.00,
            'tax_type' => 'vat',
            'payment_terms' => 'credit',
            'cost_center_id' => $this->costCenter->id,
            'counter_account_id' => $this->payableAccount->id,
            'notes' => 'توريد وتركيب قطع غيار المصاعد الدورية',
        ];

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$deToken}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson('/api/supplier-invoices', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.status', 'draft');

        $this->assertEquals(3000.0, (float)$response->json('data.tax_amount'));
        $this->assertEquals(23000.0, (float)$response->json('data.total_payable'));

        $invoiceId = $response->json('data.id');

        // 2. Data Entry tries to approve -> Forbidden (Maker-Checker violation)
        $this->app['auth']->forgetGuards();
        $forbiddenResponse = $this->withHeaders([
            'Authorization' => "Bearer {$deToken}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/supplier-invoices/{$invoiceId}/approve");

        $forbiddenResponse->assertStatus(403);

        // 3. General Accountant approves supplier invoice
        $this->app['auth']->forgetGuards();
        $approveResponse = $this->withHeaders([
            'Authorization' => "Bearer {$accToken}",
            'X-Tenant-Subdomain' => 'comp1',
        ])->postJson("/api/supplier-invoices/{$invoiceId}/approve");

        $approveResponse->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.status', 'approved');

        $this->tenantManager->switchConnection($this->company);
        $supplierInvoice = SupplierInvoice::find($invoiceId);
        $this->assertEquals('approved', $supplierInvoice->status);

        $entry = JournalEntry::with('items')->where('explanation', 'like', "%{$supplierInvoice->invoice_number}%")->first();
        $this->assertNotNull($entry);
        $this->assertEquals(23000.00, (float)$entry->total_debit);
        $this->assertEquals(23000.00, (float)$entry->total_credit);
        $this->tenantManager->resetToCentral();
    }
}
