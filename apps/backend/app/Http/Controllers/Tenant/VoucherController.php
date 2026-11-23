<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Account;
use App\Models\Tenant\CostCenter;
use App\Models\Tenant\FiscalYear;
use App\Models\Tenant\Installment;
use App\Models\Tenant\JournalEntry;
use App\Models\Tenant\JournalEntryItem;
use App\Models\Tenant\RentalContract;
use App\Models\Tenant\Voucher;
use App\Services\FiscalPeriodService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class VoucherController extends Controller
{
    /**
     * Authorize Data Entry permission (Maker: Section 1.6)
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
     * Authorize General Accountant permission (Checker: Section 1.6)
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
     * List all vouchers (UC-43, UC-44, UC-46)
     */
    public function index(Request $request): JsonResponse
    {
        $query = Voucher::with([
            'contract.tenant',
            'contract.property',
            'installment',
            'costCenter',
            'debitAccount',
            'creditAccount',
        ]);

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('voucher_number', 'like', "%{$s}%")
                    ->orWhereHas('contract.tenant', function ($t) use ($s) {
                        $t->where('name', 'like', "%{$s}%");
                    })
                    ->orWhereHas('costCenter', function ($cc) use ($s) {
                        $cc->where('name', 'like', "%{$s}%");
                    });
            });
        }

        $vouchers = $query->orderBy('id', 'desc')->get();

        $enriched = $vouchers->map(function ($v) {
            $data = $v->toArray();
            $data['type_label'] = Voucher::$typeArabicLabels[$v->type] ?? $v->type;
            $data['status_label'] = Voucher::$statusArabicLabels[$v->status] ?? $v->status;
            $data['payment_method_label'] = Voucher::$paymentMethodArabicLabels[$v->payment_method] ?? $v->payment_method;
            if ($v->expense_type) {
                $data['expense_type_label'] = Voucher::$expenseTypeArabicLabels[$v->expense_type] ?? $v->expense_type;
            }
            return $data;
        });

        return response()->json([
            'status' => 'success',
            'data' => $enriched,
            'count' => $enriched->count(),
        ]);
    }

    /**
     * Show single voucher
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $voucher = Voucher::with([
            'contract.tenant',
            'contract.property',
            'installment',
            'costCenter',
            'debitAccount',
            'creditAccount',
            'journalEntry.items.account',
        ])->find($id);

        if (!$voucher) {
            return response()->json([
                'status' => 'error',
                'message' => 'السند غير موجود',
            ], 404);
        }

        $data = $voucher->toArray();
        $data['type_label'] = Voucher::$typeArabicLabels[$voucher->type] ?? $voucher->type;
        $data['status_label'] = Voucher::$statusArabicLabels[$voucher->status] ?? $voucher->status;
        $data['payment_method_label'] = Voucher::$paymentMethodArabicLabels[$voucher->payment_method] ?? $voucher->payment_method;
        if ($voucher->expense_type) {
            $data['expense_type_label'] = Voucher::$expenseTypeArabicLabels[$voucher->expense_type] ?? $voucher->expense_type;
        }

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Generic store method to route based on type
     */
    public function store(Request $request): JsonResponse
    {
        if ($request->input('type') === 'disbursement') {
            return $this->storeDisbursement($request);
        }
        return $this->storeReceipt($request);
    }

    /**
     * Create draft receipt voucher (UC-43)
     */
    public function storeReceipt(Request $request): JsonResponse
    {
        if (!$this->authorizeDataEntry($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك بإنشاء سند قبض، الصلاحية لمدخل البيانات فقط',
            ], 403);
        }

        // Auto-resolve default cash/bank and revenue accounts if not explicitly chosen
        if (!$request->filled('debit_account_id')) {
            $cash = Account::where('root_type', 'assets')
                ->where('nature', 'debit')
                ->where('account_type', 'sub')
                ->first() ?? Account::where('root_type', 'assets')->first();
            if ($cash) {
                $request->merge(['debit_account_id' => $cash->id]);
            }
        }
        if (!$request->filled('credit_account_id')) {
            $rev = Account::where('root_type', 'revenues')
                ->where('nature', 'credit')
                ->first() ?? Account::where('root_type', 'revenues')->first();
            if ($rev) {
                $request->merge(['credit_account_id' => $rev->id]);
            }
        }
        if (!$request->filled('date')) {
            $request->merge(['date' => date('Y-m-d')]);
        }
        if (!$request->filled('payment_method')) {
            $request->merge(['payment_method' => 'bank_transfer']);
        }

        $validator = Validator::make($request->all(), [
            'contract_id' => 'required|exists:tenant.rental_contracts,id',
            'installment_id' => 'required|exists:tenant.installments,id',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'payment_method' => 'required|in:cash,bank_transfer,cheque',
            'debit_account_id' => 'required|exists:tenant.accounts,id',
            'credit_account_id' => 'required|exists:tenant.accounts,id',
            'notes' => 'nullable|string|max:500',
        ], [
            'amount.min' => 'المبلغ يجب أن يكون أكبر من 0',
            'amount.required' => 'المبلغ إلزامي',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $installment = Installment::where('id', $request->installment_id)
            ->where('contract_id', $request->contract_id)
            ->first();

        if (!$installment) {
            return response()->json([
                'status' => 'error',
                'message' => 'الدفعة المحددة لا تنتمي إلى هذا العقد',
            ], 422);
        }

        // UC-43 Alternative 2: الدفعة مدفوعة مسبقاً
        if ($installment->status === 'paid') {
            return response()->json([
                'status' => 'error',
                'message' => 'الدفعة مدفوعة مسبقاً',
            ], 422);
        }

        // UC-43 Alternative 1: المبلغ > قيمة الدفعة
        $remaining = (float)$installment->amount - (float)$installment->paid_amount;
        if ((float)$request->amount > $remaining + 0.001) {
            return response()->json([
                'status' => 'error',
                'message' => 'المبلغ يتجاوز قيمة الدفعة المتبقية',
            ], 422);
        }

        // Auto-inherit cost center from contract's property (UC-43)
        $contract = RentalContract::with('property')->find($request->contract_id);
        $costCenterId = $contract->property->cost_center_id;

        // Generate sequential number: RV-YYYYMM-XXXX
        $datePrefix = date('Ym');
        $count = Voucher::where('voucher_number', 'like', "RV-{$datePrefix}-%")->count();
        $voucherNumber = sprintf("RV-%s-%04d", $datePrefix, $count + 1);

        $voucher = Voucher::create([
            'voucher_number' => $voucherNumber,
            'type' => 'receipt',
            'contract_id' => $request->contract_id,
            'installment_id' => $request->installment_id,
            'amount' => $request->amount,
            'date' => $request->date,
            'cost_center_id' => $costCenterId,
            'debit_account_id' => $request->debit_account_id,
            'credit_account_id' => $request->credit_account_id,
            'payment_method' => $request->payment_method,
            'status' => 'draft',
            'notes' => $request->notes,
            'created_by' => $request->user()->id,
        ]);

        app(\App\Services\NotificationService::class)->notifyAccountantOfDraftVoucher(
            $voucher->voucher_number,
            (float)$voucher->amount,
            $request->user()->name
        );

        return response()->json([
            'status' => 'success',
            'message' => 'تم حفظ سند القبض كمسودة وإرساله للمحاسب العام للمراجعة والاعتماد',
            'data' => $voucher->load(['contract.tenant', 'installment', 'costCenter', 'debitAccount', 'creditAccount']),
        ], 201);
    }

    /**
     * Create draft disbursement voucher (UC-44)
     */
    public function storeDisbursement(Request $request): JsonResponse
    {
        if (!$this->authorizeDataEntry($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك بإنشاء سند صرف، الصلاحية لمدخل البيانات فقط',
            ], 403);
        }

        // Auto-resolve default accounts and cost center if not provided
        if (!$request->filled('debit_account_id')) {
            $exp = Account::where('root_type', 'expenses')
                ->where('nature', 'debit')
                ->first() ?? Account::where('root_type', 'expenses')->first();
            if ($exp) {
                $request->merge(['debit_account_id' => $exp->id]);
            }
        }
        if (!$request->filled('credit_account_id')) {
            $cash = Account::where('root_type', 'assets')
                ->where('nature', 'debit')
                ->where('account_type', 'sub')
                ->first() ?? Account::where('root_type', 'assets')->first();
            if ($cash) {
                $request->merge(['credit_account_id' => $cash->id]);
            }
        }
        if (!$request->filled('cost_center_id')) {
            $cc = CostCenter::where('status', 'active')->first();
            if ($cc) {
                $request->merge(['cost_center_id' => $cc->id]);
            }
        }
        if (!$request->filled('date')) {
            $request->merge(['date' => date('Y-m-d')]);
        }
        if (!$request->filled('payment_method')) {
            $request->merge(['payment_method' => 'bank_transfer']);
        }

        $validator = Validator::make($request->all(), [
            'expense_type' => 'required|in:maintenance,electricity,water,rent,salaries,other',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'cost_center_id' => 'required|exists:tenant.cost_centers,id',
            'debit_account_id' => 'required|exists:tenant.accounts,id',
            'credit_account_id' => 'required|exists:tenant.accounts,id',
            'payment_method' => 'required|in:cash,bank_transfer,cheque',
            'notes' => 'nullable|string|max:500',
        ], [
            'amount.min' => 'المبلغ يجب أن يكون أكبر من 0',
            'amount.required' => 'المبلغ إلزامي',
            'expense_type.required' => 'نوع المصروف إلزامي',
            'cost_center_id.required' => 'مركز التكلفة إلزامي',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        // Generate sequential number: DV-YYYYMM-XXXX
        $datePrefix = date('Ym');
        $count = Voucher::where('voucher_number', 'like', "DV-{$datePrefix}-%")->count();
        $voucherNumber = sprintf("DV-%s-%04d", $datePrefix, $count + 1);

        $voucher = Voucher::create([
            'voucher_number' => $voucherNumber,
            'type' => 'disbursement',
            'expense_type' => $request->expense_type,
            'amount' => $request->amount,
            'date' => $request->date,
            'cost_center_id' => $request->cost_center_id,
            'debit_account_id' => $request->debit_account_id,
            'credit_account_id' => $request->credit_account_id,
            'payment_method' => $request->payment_method,
            'status' => 'draft',
            'notes' => $request->notes,
            'created_by' => $request->user()->id,
        ]);

        app(\App\Services\NotificationService::class)->notifyAccountantOfDraftVoucher(
            $voucher->voucher_number,
            (float)$voucher->amount,
            $request->user()->name
        );

        return response()->json([
            'status' => 'success',
            'message' => 'تم حفظ سند الصرف كمسودة وإرساله للمحاسب العام للمراجعة والاعتماد',
            'data' => $voucher->load(['costCenter', 'debitAccount', 'creditAccount']),
        ], 201);
    }

    /**
     * Update rejected or draft voucher & resubmit (UC-45)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        if (!$this->authorizeDataEntry($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك بتعديل السند، الصلاحية لمدخل البيانات فقط',
            ], 403);
        }

        $voucher = Voucher::find($id);
        if (!$voucher) {
            return response()->json([
                'status' => 'error',
                'message' => 'السند غير موجود',
            ], 404);
        }

        if ($voucher->status === 'approved') {
            return response()->json([
                'status' => 'error',
                'message' => 'لا يمكن تعديل سند معتمد',
            ], 422);
        }

        $rules = [
            'amount' => 'sometimes|required|numeric|min:0.01',
            'date' => 'sometimes|required|date',
            'payment_method' => 'sometimes|required|in:cash,bank_transfer,cheque',
            'notes' => 'nullable|string|max:500',
        ];

        if ($voucher->type === 'disbursement') {
            $rules['expense_type'] = 'sometimes|required|in:maintenance,electricity,water,rent,salaries,other';
            $rules['cost_center_id'] = 'sometimes|required|exists:tenant.cost_centers,id';
        }

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $dataToUpdate = $request->only([
            'amount',
            'date',
            'payment_method',
            'notes',
            'expense_type',
            'cost_center_id',
            'debit_account_id',
            'credit_account_id',
        ]);

        // UC-45: السند المرفوض يعود لمسودة بعد التعديل
        if ($voucher->status === 'rejected') {
            $dataToUpdate['status'] = 'draft';
        }

        $voucher->update($dataToUpdate);

        return response()->json([
            'status' => 'success',
            'message' => 'تم تعديل السند وإعادة إرساله كمسودة للمحاسب العام',
            'data' => $voucher->fresh(['costCenter', 'debitAccount', 'creditAccount']),
        ]);
    }

    /**
     * Approve voucher & auto-post balanced journal entry (UC-47)
     */
    public function approve(Request $request, int $id): JsonResponse
    {
        if (!$this->authorizeAccountant($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك باعتماد السند، الصلاحية للمحاسب العام فقط',
            ], 403);
        }

        $voucher = Voucher::with(['debitAccount', 'creditAccount', 'costCenter'])->find($id);
        if (!$voucher) {
            return response()->json([
                'status' => 'error',
                'message' => 'السند غير موجود',
            ], 404);
        }

        if ($voucher->status === 'approved') {
            return response()->json([
                'status' => 'error',
                'message' => 'السند معتمد بالفعل',
            ], 422);
        }

        if ($voucher->status === 'rejected') {
            return response()->json([
                'status' => 'error',
                'message' => 'لا يمكن اعتماد سند في حالة مرفوض، يجب على مدخل البيانات تعديله أولاً',
            ], 422);
        }

        // Check fiscal period lock (UC-24, UC-47)
        if (!FiscalPeriodService::validateDateNotLocked($voucher->date->toDateString())) {
            return response()->json([
                'status' => 'error',
                'message' => 'الفترة المالية مغلقة، لا يمكن إضافة أو تعديل قيود بها',
            ], 422);
        }

        // Locate active fiscal year covering voucher date
        $fiscalYear = FiscalYear::where('start_date', '<=', $voucher->date)
            ->where('end_date', '>=', $voucher->date)
            ->where('status', 'open')
            ->first();

        if (!$fiscalYear) {
            return response()->json([
                'status' => 'error',
                'message' => 'لا توجد سنة مالية مفتوحة تغطي تاريخ السند',
            ], 422);
        }

        $result = DB::connection('tenant')->transaction(function () use ($voucher, $fiscalYear, $request) {
            // Generate sequential Journal Entry number: JE-YYYYMM-XXXX
            $datePrefix = date('Ym');
            $jeCount = JournalEntry::where('entry_number', 'like', "JE-{$datePrefix}-%")->count();
            $entryNumber = sprintf("JE-%s-%04d", $datePrefix, $jeCount + 1);

            $explanation = $voucher->type === 'receipt'
                ? "إثبات تحصيل إيجار بموجب سند قبض رقم {$voucher->voucher_number}"
                : "إثبات صرف مصروفات بموجب سند صرف رقم {$voucher->voucher_number}";

            // Auto Journal Entry (Total Debit = Total Credit = amount)
            $entry = JournalEntry::create([
                'entry_number' => $entryNumber,
                'fiscal_year_id' => $fiscalYear->id,
                'date' => $voucher->date,
                'explanation' => $explanation,
                'total_debit' => $voucher->amount,
                'total_credit' => $voucher->amount,
                'status' => 'posted',
                'voucher_id' => $voucher->id,
                'created_by' => $request->user()->id,
                'posted_at' => now(),
            ]);

            // Item 1: Debit Line
            JournalEntryItem::create([
                'journal_entry_id' => $entry->id,
                'account_id' => $voucher->debit_account_id,
                'cost_center_id' => ($voucher->type === 'disbursement' ? $voucher->cost_center_id : null),
                'debit' => $voucher->amount,
                'credit' => 0.0000,
                'counter_account_id' => $voucher->credit_account_id,
                'counter_account_name' => $voucher->creditAccount?->name,
                'line_note' => $voucher->notes,
            ]);

            // Item 2: Credit Line
            JournalEntryItem::create([
                'journal_entry_id' => $entry->id,
                'account_id' => $voucher->credit_account_id,
                'cost_center_id' => ($voucher->type === 'receipt' ? $voucher->cost_center_id : null),
                'debit' => 0.0000,
                'credit' => $voucher->amount,
                'counter_account_id' => $voucher->debit_account_id,
                'counter_account_name' => $voucher->debitAccount?->name,
                'line_note' => $voucher->notes,
            ]);

            // If Receipt voucher: update installment paid_amount and status
            if ($voucher->type === 'receipt' && $voucher->installment_id) {
                $installment = Installment::find($voucher->installment_id);
                if ($installment) {
                    $newPaid = (float)$installment->paid_amount + (float)$voucher->amount;
                    $installment->paid_amount = $newPaid;
                    if ($newPaid >= (float)$installment->amount - 0.001) {
                        $installment->status = 'paid';
                        $installment->paid_at = now();
                    }
                    $installment->save();
                }
            }

            // Update voucher to approved
            $voucher->update([
                'status' => 'approved',
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
                'journal_entry_id' => $entry->id,
            ]);

            return [
                'voucher' => $voucher->fresh(['debitAccount', 'creditAccount', 'costCenter', 'journalEntry.items']),
                'journal_entry' => $entry,
            ];
        });

        return response()->json([
            'status' => 'success',
            'message' => 'تم اعتماد السند وتوليد القيد المحاسبي المتوازن وترحيله لدفتر الأستاذ العام بنجاح',
            'data' => $result,
        ]);
    }

    /**
     * Reject voucher with mandatory reason >= 10 chars (UC-48)
     */
    public function reject(Request $request, int $id): JsonResponse
    {
        if (!$this->authorizeAccountant($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك برفض السند، الصلاحية للمحاسب العام فقط',
            ], 403);
        }

        $voucher = Voucher::find($id);
        if (!$voucher) {
            return response()->json([
                'status' => 'error',
                'message' => 'السند غير موجود',
            ], 404);
        }

        if ($voucher->status === 'approved') {
            return response()->json([
                'status' => 'error',
                'message' => 'لا يمكن رفض سند تم اعتماده وترحيله مسبقاً',
            ], 422);
        }

        // UC-48: سبب الرفض إلزامي - الحد الأدنى 10 حروف
        $validator = Validator::make($request->all(), [
            'rejection_reason' => 'required|string|min:10|max:500',
        ], [
            'rejection_reason.required' => 'سبب الرفض إلزامي',
            'rejection_reason.min' => 'يجب إدخال سبب الرفض بحيث لا يقل عن 10 أحرف',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $voucher->update([
            'status' => 'rejected',
            'rejection_reason' => $request->rejection_reason,
        ]);

        app(\App\Services\NotificationService::class)->notifyDataEntryOfRejection(
            $voucher->created_by,
            $voucher->voucher_number,
            $request->rejection_reason
        );

        return response()->json([
            'status' => 'success',
            'message' => 'تم رفض السند وإعادته لمدخل البيانات مع بيان السبب',
            'data' => $voucher->fresh(),
        ]);
    }
}
