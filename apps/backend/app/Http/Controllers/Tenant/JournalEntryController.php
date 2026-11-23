<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Account;
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

class JournalEntryController extends Controller
{
    /**
     * Authorize General Accountant permission (Section 1.6)
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
     * List all journal entries (UC-50, UC-54)
     */
    public function index(Request $request): JsonResponse
    {
        $query = JournalEntry::with(['items.account', 'items.costCenter', 'fiscalYear']);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('from_date')) {
            $query->where('date', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->where('date', '<=', $request->to_date);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('entry_number', 'like', "%{$s}%")
                    ->orWhere('explanation', 'like', "%{$s}%");
            });
        }

        $entries = $query->orderBy('id', 'desc')->get();

        $enriched = $entries->map(function ($e) {
            $data = $e->toArray();
            $data['status_label'] = JournalEntry::$statusArabicLabels[$e->status] ?? $e->status;
            $data['entry_date'] = $e->date;
            $data['description'] = $e->explanation;
            $data['lines'] = $e->items;
            return $data;
        });

        return response()->json([
            'status' => 'success',
            'data' => $enriched,
            'entries' => $enriched,
            'count' => $enriched->count(),
        ]);
    }

    /**
     * Show single journal entry (UC-51)
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $entry = JournalEntry::with(['items.account', 'items.costCenter', 'fiscalYear', 'voucher'])->find($id);

        if (!$entry) {
            return response()->json([
                'status' => 'error',
                'message' => 'القيد اليومي غير موجود',
            ], 404);
        }

        $data = $entry->toArray();
        $data['status_label'] = JournalEntry::$statusArabicLabels[$entry->status] ?? $entry->status;
        $data['entry_date'] = $entry->date;
        $data['description'] = $entry->explanation;
        $data['lines'] = $entry->items;

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Create manual balanced journal entry (UC-49)
     */
    public function store(Request $request): JsonResponse
    {
        if (!$this->authorizeAccountant($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك بإنشاء قيد يومية يدوي، الصلاحية للمحاسب العام فقط',
            ], 403);
        }

        // Merge frontend aliases
        if (!$request->filled('date') && $request->filled('entry_date')) {
            $request->merge(['date' => $request->entry_date]);
        }
        if (!$request->filled('explanation') && $request->filled('description')) {
            $request->merge(['explanation' => $request->description]);
        }
        if (!$request->has('items') && $request->has('lines')) {
            $items = array_map(function ($line) {
                if (!isset($line['line_note']) && isset($line['memo'])) {
                    $line['line_note'] = $line['memo'];
                }
                return $line;
            }, (array) $request->lines);
            $request->merge(['items' => $items]);
        }

        $validator = Validator::make($request->all(), [
            'date' => 'required|date',
            'explanation' => 'required|string|min:10|max:500',
            'items' => 'required|array|min:2',
            'items.*.account_id' => 'required|exists:tenant.accounts,id',
            'items.*.cost_center_id' => 'nullable|exists:tenant.cost_centers,id',
            'items.*.debit' => 'required|numeric|min:0',
            'items.*.credit' => 'required|numeric|min:0',
            'items.*.line_note' => 'nullable|string|max:255',
            'is_posted' => 'nullable|boolean',
        ], [
            'explanation.min' => 'الإيضاح يجب أن يكون 10 أحرف على الأقل',
            'items.min' => 'يجب إدخال طرفين على الأقل للقيد (مدين ودائن)',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check fiscal period not locked (UC-24)
        if (!FiscalPeriodService::validateDateNotLocked($request->date)) {
            return response()->json([
                'status' => 'error',
                'message' => 'الفترة المالية مغلقة، لا يمكن إضافة أو تعديل قيود بها',
            ], 422);
        }

        $fiscalYear = FiscalYear::where('start_date', '<=', $request->date)
            ->where('end_date', '>=', $request->date)
            ->where('status', 'open')
            ->first();

        if (!$fiscalYear) {
            return response()->json([
                'status' => 'error',
                'message' => 'لا توجد سنة مالية مفتوحة تغطي تاريخ القيد',
            ], 422);
        }

        // Sum Debits and Credits
        $totalDebit = 0.0;
        $totalCredit = 0.0;
        $itemsData = $request->items;

        foreach ($itemsData as $item) {
            $totalDebit += (float) $item['debit'];
            $totalCredit += (float) $item['credit'];

            // Validate cost center mandatory rule (UC-49 Alternative 2)
            $account = Account::find($item['account_id']);
            if ($account && $account->is_cost_center_mandatory && empty($item['cost_center_id'])) {
                return response()->json([
                    'status' => 'error',
                    'message' => "الحساب [{$account->name}] يتطلب تحديد مركز تكلفة إلزامي",
                ], 422);
            }
        }

        // Business Rule UC-49: شرط الترحيل: إجمالي المدين − إجمالي الدائن = 0
        if (abs($totalDebit - $totalCredit) > 0.0001) {
            return response()->json([
                'status' => 'error',
                'message' => 'القيد غير متوازن، إجمالي المدين يجب أن يساوي إجمالي الدائن',
                'total_debit' => $totalDebit,
                'total_credit' => $totalCredit,
                'difference' => abs($totalDebit - $totalCredit),
            ], 422);
        }

        $isPosted = $request->boolean('is_posted', true);

        $entry = DB::connection('tenant')->transaction(function () use ($request, $fiscalYear, $totalDebit, $totalCredit, $itemsData, $isPosted) {
            $datePrefix = date('Ym');
            $count = JournalEntry::where('entry_number', 'like', "JE-{$datePrefix}-%")->count();
            $entryNumber = sprintf("JE-%s-%04d", $datePrefix, $count + 1);

            $entry = JournalEntry::create([
                'entry_number' => $entryNumber,
                'fiscal_year_id' => $fiscalYear->id,
                'date' => $request->date,
                'explanation' => $request->explanation,
                'total_debit' => $totalDebit,
                'total_credit' => $totalCredit,
                'status' => $isPosted ? 'posted' : 'draft',
                'created_by' => $request->user()->id,
                'posted_at' => $isPosted ? now() : null,
            ]);

            foreach ($itemsData as $item) {
                JournalEntryItem::create([
                    'journal_entry_id' => $entry->id,
                    'account_id' => $item['account_id'],
                    'cost_center_id' => $item['cost_center_id'] ?? null,
                    'debit' => $item['debit'],
                    'credit' => $item['credit'],
                    'line_note' => $item['line_note'] ?? null,
                ]);
            }

            return $entry->load(['items.account', 'items.costCenter', 'fiscalYear']);
        });

        return response()->json([
            'status' => 'success',
            'message' => $isPosted ? 'تم إنشاء القيد وترحيله بنجاح' : 'تم حفظ القيد كمسودة بنجاح',
            'data' => $entry,
        ], 201);
    }

    /**
     * Update draft journal entry (UC-50)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        if (!$this->authorizeAccountant($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك بتعديل القيد، الصلاحية للمحاسب العام فقط',
            ], 403);
        }

        $entry = JournalEntry::find($id);
        if (!$entry) {
            return response()->json([
                'status' => 'error',
                'message' => 'القيد غير موجود',
            ], 404);
        }

        // Business Rule UC-49: القيد المرحّل لا يمكن تعديله
        if ($entry->status === 'posted') {
            return response()->json([
                'status' => 'error',
                'message' => 'لا يمكن تعديل قيد مرحّل',
            ], 422);
        }

        // Merge frontend aliases
        if (!$request->filled('date') && $request->filled('entry_date')) {
            $request->merge(['date' => $request->entry_date]);
        }
        if (!$request->filled('explanation') && $request->filled('description')) {
            $request->merge(['explanation' => $request->description]);
        }
        if (!$request->has('items') && $request->has('lines')) {
            $items = array_map(function ($line) {
                if (!isset($line['line_note']) && isset($line['memo'])) {
                    $line['line_note'] = $line['memo'];
                }
                return $line;
            }, (array) $request->lines);
            $request->merge(['items' => $items]);
        }

        $validator = Validator::make($request->all(), [
            'date' => 'sometimes|required|date',
            'explanation' => 'sometimes|required|string|min:10|max:500',
            'items' => 'sometimes|required|array|min:2',
            'items.*.account_id' => 'required|exists:tenant.accounts,id',
            'items.*.cost_center_id' => 'nullable|exists:tenant.cost_centers,id',
            'items.*.debit' => 'required|numeric|min:0',
            'items.*.credit' => 'required|numeric|min:0',
            'items.*.line_note' => 'nullable|string|max:255',
            'is_posted' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $date = $request->input('date', $entry->date);
        if (!FiscalPeriodService::validateDateNotLocked($date)) {
            return response()->json([
                'status' => 'error',
                'message' => 'الفترة المالية مغلقة، لا يمكن إضافة أو تعديل قيود بها',
            ], 422);
        }

        $itemsData = $request->has('items') ? $request->items : null;
        $totalDebit = $entry->total_debit;
        $totalCredit = $entry->total_credit;

        if ($itemsData !== null) {
            $totalDebit = 0.0;
            $totalCredit = 0.0;
            foreach ($itemsData as $item) {
                $totalDebit += (float) $item['debit'];
                $totalCredit += (float) $item['credit'];

                $account = Account::find($item['account_id']);
                if ($account && $account->is_cost_center_mandatory && empty($item['cost_center_id'])) {
                    return response()->json([
                        'status' => 'error',
                        'message' => "الحساب [{$account->name}] يتطلب تحديد مركز تكلفة إلزامي",
                    ], 422);
                }
            }

            if (abs($totalDebit - $totalCredit) > 0.0001) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'القيد غير متوازن، إجمالي المدين يجب أن يساوي إجمالي الدائن',
                    'total_debit' => $totalDebit,
                    'total_credit' => $totalCredit,
                    'difference' => abs($totalDebit - $totalCredit),
                ], 422);
            }
        }

        $isPosted = $request->boolean('is_posted', false);

        DB::connection('tenant')->transaction(function () use ($entry, $request, $date, $totalDebit, $totalCredit, $itemsData, $isPosted) {
            $entry->date = $date;
            if ($request->filled('explanation')) {
                $entry->explanation = $request->explanation;
            }
            $entry->total_debit = $totalDebit;
            $entry->total_credit = $totalCredit;
            if ($isPosted) {
                $entry->status = 'posted';
                $entry->posted_at = now();
            }
            $entry->save();

            if ($itemsData !== null) {
                JournalEntryItem::where('journal_entry_id', $entry->id)->delete();
                foreach ($itemsData as $item) {
                    JournalEntryItem::create([
                        'journal_entry_id' => $entry->id,
                        'account_id' => $item['account_id'],
                        'cost_center_id' => $item['cost_center_id'] ?? null,
                        'debit' => $item['debit'],
                        'credit' => $item['credit'],
                        'line_note' => $item['line_note'] ?? null,
                    ]);
                }
            }
        });

        $loaded = $entry->fresh(['items.account', 'items.costCenter', 'fiscalYear']);
        $data = $loaded->toArray();
        $data['entry_date'] = $loaded->date;
        $data['description'] = $loaded->explanation;
        $data['lines'] = $loaded->items;

        return response()->json([
            'status' => 'success',
            'message' => $isPosted ? 'تم تحديث القيد وترحيله بنجاح' : 'تم تحديث مسودة القيد بنجاح',
            'data' => $data,
        ], 200);
    }

    /**
     * Delete draft journal entry (UC-53)
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        if (!$this->authorizeAccountant($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك بحذف القيد، الصلاحية للمحاسب العام فقط',
            ], 403);
        }

        $entry = JournalEntry::find($id);
        if (!$entry) {
            return response()->json([
                'status' => 'error',
                'message' => 'القيد غير موجود',
            ], 404);
        }

        // Business Rule UC-49: القيد المرحّل لا يمكن تعديله أو حذفه
        if ($entry->status === 'posted') {
            return response()->json([
                'status' => 'error',
                'message' => 'لا يمكن حذف قيد مرحّل',
            ], 422);
        }

        $entry->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'تم حذف مسودة القيد بنجاح',
        ]);
    }
}
