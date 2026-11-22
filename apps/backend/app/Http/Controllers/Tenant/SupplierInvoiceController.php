<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Account;
use App\Models\Tenant\CostCenter;
use App\Models\Tenant\FiscalYear;
use App\Models\Tenant\JournalEntry;
use App\Models\Tenant\JournalEntryItem;
use App\Models\Tenant\SupplierInvoice;
use App\Services\FiscalPeriodService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class SupplierInvoiceController extends Controller
{
    /**
     * Authorize Data Entry permission (UC-55)
     */
    protected function authorizeDataEntry(Request $request): bool
    {
        $user = $request->user();
        if (!$user) {
            return false;
        }

        $subdomain = $request->header('X-Tenant-Subdomain') ?? $request->query('subdomain');
        $role = $user->getRoleForCompany($subdomain);

        return in_array($role, ['data_entry', 'super_admin']);
    }

    /**
     * Authorize Accountant permission
     */
    protected function authorizeAccountant(Request $request): bool
    {
        $user = $request->user();
        if (!$user) {
            return false;
        }

        $subdomain = $request->header('X-Tenant-Subdomain') ?? $request->query('subdomain');
        $role = $user->getRoleForCompany($subdomain);

        return in_array($role, ['general_accountant', 'super_admin']);
    }

    /**
     * List all supplier purchase invoices (UC-55)
     */
    public function index(Request $request): JsonResponse
    {
        $query = SupplierInvoice::with(['costCenter', 'counterAccount']);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('invoice_number', 'like', "%{$s}%")
                    ->orWhere('supplier_name', 'like', "%{$s}%");
            });
        }

        $invoices = $query->orderBy('id', 'desc')->get();

        $enriched = $invoices->map(function ($inv) {
            $data = $inv->toArray();
            $data['status_label'] = SupplierInvoice::$statusArabicLabels[$inv->status] ?? $inv->status;
            $data['payment_terms_label'] = SupplierInvoice::$paymentTermsArabicLabels[$inv->payment_terms] ?? $inv->payment_terms;
            $data['tax_type_label'] = SupplierInvoice::$taxTypeArabicLabels[$inv->tax_type] ?? $inv->tax_type;
            return $data;
        });

        return response()->json([
            'status' => 'success',
            'data' => $enriched,
            'count' => $enriched->count(),
        ]);
    }

    /**
     * Create draft supplier purchase invoice (UC-55)
     */
    public function store(Request $request): JsonResponse
    {
        if (!$this->authorizeDataEntry($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك بإدخال فاتورة مورد، الصلاحية لمدخل البيانات فقط',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'supplier_name' => 'required|string|max:100',
            'invoice_number' => 'required|string|max:50|unique:tenant.supplier_invoices,invoice_number',
            'date' => 'required|date',
            'cost_center_id' => 'required|exists:tenant.cost_centers,id',
            'gross_amount' => 'required|numeric|min:0.01',
            'discount_earned' => 'nullable|numeric|min:0',
            'tax_type' => 'required|in:vat,excise',
            'payment_terms' => 'required|in:cash,credit',
            'counter_account_id' => 'nullable|exists:tenant.accounts,id',
        ], [
            'invoice_number.unique' => 'رقم فاتورة المورد مستخدم بالفعل',
            'gross_amount.min' => 'إجمالي المشتريات يجب أن يكون أكبر من 0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $gross = (float) $request->gross_amount;
        $discount = (float) ($request->discount_earned ?? 0);
        $net = max(0.0, $gross - $discount);
        $taxRate = $request->tax_type === 'vat' ? 0.15 : 0.05;
        $tax = round($net * $taxRate, 2);
        $totalPayable = round($net + $tax, 2);

        $invoice = SupplierInvoice::create([
            'supplier_name' => $request->supplier_name,
            'invoice_number' => $request->invoice_number,
            'date' => $request->date,
            'cost_center_id' => $request->cost_center_id,
            'gross_amount' => $gross,
            'discount_earned' => $discount,
            'net_amount' => $net,
            'tax_type' => $request->tax_type,
            'tax_amount' => $tax,
            'total_payable' => $totalPayable,
            'payment_terms' => $request->payment_terms,
            'counter_account_id' => $request->counter_account_id,
            'status' => 'draft',
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'تم حفظ فاتورة المورد كمسودة بنجاح وإرسالها للمحاسب العام',
            'data' => $invoice->load(['costCenter', 'counterAccount']),
        ], 201);
    }

    /**
     * Approve supplier invoice & post to GL
     */
    public function approve(Request $request, int $id): JsonResponse
    {
        if (!$this->authorizeAccountant($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك باعتماد الفاتورة، الصلاحية للمحاسب العام فقط',
            ], 403);
        }

        $invoice = SupplierInvoice::find($id);
        if (!$invoice) {
            return response()->json([
                'status' => 'error',
                'message' => 'الفاتورة غير موجودة',
            ], 404);
        }

        if ($invoice->status !== 'draft') {
            return response()->json([
                'status' => 'error',
                'message' => 'الفاتورة معتمدة بالفعل',
            ], 422);
        }

        // Check fiscal period
        if (!FiscalPeriodService::validateDateNotLocked($invoice->date->toDateString())) {
            return response()->json([
                'status' => 'error',
                'message' => 'الفترة المالية مغلقة، لا يمكن إضافة أو تعديل قيود بها',
            ], 422);
        }

        $fiscalYear = FiscalYear::where('start_date', '<=', $invoice->date)
            ->where('end_date', '>=', $invoice->date)
            ->where('status', 'open')
            ->first();

        if (!$fiscalYear) {
            return response()->json([
                'status' => 'error',
                'message' => 'لا توجد سنة مالية مفتوحة تغطي تاريخ الفاتورة',
            ], 422);
        }

        $purchasesAccount = Account::where('root_type', 'purchases')->first()
            ?? Account::where('root_type', 'expenses')->first();
        $payableAccount = Account::where('root_type', 'liabilities')->first()
            ?? Account::where('root_type', 'assets')->first();

        DB::connection('tenant')->transaction(function () use ($invoice, $fiscalYear, $purchasesAccount, $payableAccount, $request) {
            $datePrefix = date('Ym');
            $count = JournalEntry::where('entry_number', 'like', "JE-{$datePrefix}-%")->count();
            $entryNumber = sprintf("JE-%s-%04d", $datePrefix, $count + 1);

            $entry = JournalEntry::create([
                'entry_number' => $entryNumber,
                'fiscal_year_id' => $fiscalYear->id,
                'date' => $invoice->date,
                'explanation' => "إثبات فاتورة مشتريات مورد رقم {$invoice->invoice_number} من {$invoice->supplier_name}",
                'total_debit' => $invoice->total_payable,
                'total_credit' => $invoice->total_payable,
                'status' => 'posted',
                'created_by' => $request->user()->id,
                'posted_at' => now(),
            ]);

            JournalEntryItem::create([
                'journal_entry_id' => $entry->id,
                'account_id' => $purchasesAccount->id,
                'cost_center_id' => $invoice->cost_center_id,
                'debit' => $invoice->total_payable,
                'credit' => 0.0000,
                'counter_account_id' => $payableAccount->id,
                'counter_account_name' => $payableAccount->name,
                'line_note' => "مشتريات مورد: {$invoice->supplier_name}",
            ]);

            JournalEntryItem::create([
                'journal_entry_id' => $entry->id,
                'account_id' => $payableAccount->id,
                'cost_center_id' => null,
                'debit' => 0.0000,
                'credit' => $invoice->total_payable,
                'counter_account_id' => $purchasesAccount->id,
                'counter_account_name' => $purchasesAccount->name,
                'line_note' => "مستحق للمورد: {$invoice->supplier_name}",
            ]);

            $invoice->update(['status' => 'approved']);
        });

        return response()->json([
            'status' => 'success',
            'message' => 'تم اعتماد فاتورة المورد وترحيل القيد لدفتر الأستاذ بنجاح',
            'data' => $invoice->fresh(['costCenter', 'counterAccount']),
        ]);
    }
}

