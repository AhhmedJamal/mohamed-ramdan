<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Account;
use App\Models\Tenant\ContractorInvoice;
use App\Models\Tenant\ContractorInvoiceItem;
use App\Models\Tenant\CostCenter;
use App\Models\Tenant\FiscalYear;
use App\Models\Tenant\JournalEntry;
use App\Models\Tenant\JournalEntryItem;
use App\Services\FiscalPeriodService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ContractorInvoiceController extends Controller
{
    /**
     * Authorize Data Entry permission (UC-53)
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
     * Authorize General Accountant permission (UC-54)
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
     * List contractor progress billings (UC-52)
     */
    public function index(Request $request): JsonResponse
    {
        $query = ContractorInvoice::with(['costCenter', 'items']);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('cost_center_id')) {
            $query->where('cost_center_id', $request->cost_center_id);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('invoice_number', 'like', "%{$s}%")
                    ->orWhere('contractor_name', 'like', "%{$s}%");
            });
        }

        $invoices = $query->orderBy('id', 'desc')->get();

        $enriched = $invoices->map(function ($inv) {
            $data = $inv->toArray();
            $data['status_label'] = ContractorInvoice::$statusArabicLabels[$inv->status] ?? $inv->status;
            $data['remaining_amount'] = (float)$inv->grand_total - (float)$inv->paid_amount;
            return $data;
        });

        return response()->json([
            'status' => 'success',
            'data' => $enriched,
            'count' => $enriched->count(),
        ]);
    }

    /**
     * Show single contractor billing (UC-52)
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $invoice = ContractorInvoice::with(['costCenter', 'items'])->find($id);

        if (!$invoice) {
            return response()->json([
                'status' => 'error',
                'message' => 'مستخلص المقاول غير موجود',
            ], 404);
        }

        $data = $invoice->toArray();
        $data['status_label'] = ContractorInvoice::$statusArabicLabels[$invoice->status] ?? $invoice->status;
        $data['remaining_amount'] = (float)$invoice->grand_total - (float)$invoice->paid_amount;

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Create draft contractor progress billing (UC-53)
     */
    public function store(Request $request): JsonResponse
    {
        if (!$this->authorizeDataEntry($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك بإنشاء مستخلص، الصلاحية لمدخل البيانات فقط',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'contractor_name' => 'required|string|max:100',
            'cost_center_id' => 'required|exists:tenant.cost_centers,id',
            'invoice_number' => 'required|string|max:50|unique:tenant.contractor_invoices,invoice_number',
            'date' => 'required|date',
            'tax_rate' => 'nullable|numeric|min:0|max:100', // e.g. 15 for 15%
            'items' => 'required|array|min:1',
            'items.*.item_name' => 'required|string|max:255',
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'items.*.unit' => 'required|string|max:50',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.notes' => 'nullable|string|max:255',
        ], [
            'invoice_number.unique' => 'رقم المستخلص مستخدم بالفعل',
            'items.min' => 'يجب إدخال بند واحد على الأقل للمستخلص',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $itemsData = $request->items;
        $grossTotal = 0.0;
        $calculatedItems = [];

        foreach ($itemsData as $item) {
            $qty = (float) $item['quantity'];
            $price = (float) $item['unit_price'];
            $lineTotal = round($qty * $price, 2);
            $grossTotal += $lineTotal;

            $calculatedItems[] = [
                'item_name' => $item['item_name'],
                'quantity' => $qty,
                'unit' => $item['unit'],
                'unit_price' => $price,
                'total' => $lineTotal,
                'notes' => $item['notes'] ?? null,
            ];
        }

        $taxRate = $request->has('tax_rate') ? (float)$request->tax_rate : 15.0; // default 15% VAT
        $taxAmount = round($grossTotal * ($taxRate / 100), 2);
        $grandTotal = round($grossTotal + $taxAmount, 2);

        $invoice = DB::connection('tenant')->transaction(function () use ($request, $grossTotal, $taxAmount, $grandTotal, $calculatedItems) {
            $invoice = ContractorInvoice::create([
                'contractor_name' => $request->contractor_name,
                'cost_center_id' => $request->cost_center_id,
                'invoice_number' => $request->invoice_number,
                'date' => $request->date,
                'gross_total' => $grossTotal,
                'tax_amount' => $taxAmount,
                'grand_total' => $grandTotal,
                'paid_amount' => 0.0000,
                'status' => 'draft',
                'created_by' => $request->user()->id,
            ]);

            foreach ($calculatedItems as $line) {
                ContractorInvoiceItem::create(array_merge($line, [
                    'contractor_invoice_id' => $invoice->id,
                ]));
            }

            return $invoice->load(['costCenter', 'items']);
        });

        return response()->json([
            'status' => 'success',
            'message' => 'تم حفظ مستخلص المقاول كمسودة بنجاح وإرساله للمحاسب العام للاعتماد',
            'data' => $invoice,
        ], 201);
    }

    /**
     * Approve contractor billing & generate GL Journal Entry (UC-54)
     */
    public function approve(Request $request, int $id): JsonResponse
    {
        if (!$this->authorizeAccountant($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك باعتماد المستخلص، الصلاحية للمحاسب العام فقط',
            ], 403);
        }

        $invoice = ContractorInvoice::with('items')->find($id);
        if (!$invoice) {
            return response()->json([
                'status' => 'error',
                'message' => 'المستخلص غير موجود',
            ], 404);
        }

        if ($invoice->status !== 'draft') {
            return response()->json([
                'status' => 'error',
                'message' => 'المستخلص ليس في حالة مسودة',
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
                'message' => 'لا توجد سنة مالية مفتوحة تغطي تاريخ المستخلص',
            ], 422);
        }

        // Locate or create nominal accounts for Contracting Expense and Contractor Payables
        $expenseAccount = Account::where('root_type', 'expenses')->first();
        $payableAccount = Account::where('root_type', 'liabilities')->first();

        if (!$expenseAccount || !$payableAccount) {
            return response()->json([
                'status' => 'error',
                'message' => 'يجب تهيئة حسابات المصروفات والالتزامات في شجرة الحسابات لإتمام القيد',
            ], 422);
        }

        DB::connection('tenant')->transaction(function () use ($invoice, $fiscalYear, $expenseAccount, $payableAccount, $request) {
            $datePrefix = date('Ym');
            $count = JournalEntry::where('entry_number', 'like', "JE-{$datePrefix}-%")->count();
            $entryNumber = sprintf("JE-%s-%04d", $datePrefix, $count + 1);

            $entry = JournalEntry::create([
                'entry_number' => $entryNumber,
                'fiscal_year_id' => $fiscalYear->id,
                'date' => $invoice->date,
                'explanation' => "إثبات استحقاق مستخلص مقاولات رقم {$invoice->invoice_number} للمقاول {$invoice->contractor_name}",
                'total_debit' => $invoice->grand_total,
                'total_credit' => $invoice->grand_total,
                'status' => 'posted',
                'created_by' => $request->user()->id,
                'posted_at' => now(),
            ]);

            // Item 1: Debit Line (Expense / WIP)
            JournalEntryItem::create([
                'journal_entry_id' => $entry->id,
                'account_id' => $expenseAccount->id,
                'cost_center_id' => $invoice->cost_center_id,
                'debit' => $invoice->grand_total,
                'credit' => 0.0000,
                'counter_account_id' => $payableAccount->id,
                'counter_account_name' => $payableAccount->name,
                'line_note' => "مستخلص مقاولات: {$invoice->contractor_name}",
            ]);

            // Item 2: Credit Line (Contractor Payable)
            JournalEntryItem::create([
                'journal_entry_id' => $entry->id,
                'account_id' => $payableAccount->id,
                'cost_center_id' => null,
                'debit' => 0.0000,
                'credit' => $invoice->grand_total,
                'counter_account_id' => $expenseAccount->id,
                'counter_account_name' => $expenseAccount->name,
                'line_note' => "مستحق للمقاول: {$invoice->contractor_name}",
            ]);

            $invoice->update([
                'status' => 'approved',
                'approved_by' => $request->user()->id,
            ]);
        });

        return response()->json([
            'status' => 'success',
            'message' => 'تم اعتماد مستخلص المقاول وتوليد القيد المحاسبي المتوازن وترحيله لدفتر الأستاذ بنجاح',
            'data' => $invoice->fresh(['costCenter', 'items']),
        ]);
    }
}

