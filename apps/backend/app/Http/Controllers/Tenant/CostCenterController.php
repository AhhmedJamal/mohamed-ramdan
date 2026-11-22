<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Account;
use App\Models\Tenant\CostCenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class CostCenterController extends Controller
{
    /**
     * Helper to verify General Accountant permission for mutations
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
     * List all cost centers (UC-19B)
     */
    public function index(Request $request): JsonResponse
    {
        $query = CostCenter::withCount(['accounts']);

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('code', 'like', "%{$s}%")
                    ->orWhere('description', 'like', "%{$s}%");
            });
        }

        $costCenters = $query->orderBy('id', 'desc')->get();

        $enriched = $costCenters->map(function ($cc) {
            $data = $cc->toArray();
            $data['type_label'] = $cc->type === 'property' ? 'عقار' : 'مشروع مقاولات';
            $data['status_label'] = $cc->status === 'active' ? 'نشط' : 'معطّل';
            return $data;
        });

        return response()->json([
            'success' => true,
            'cost_centers' => $enriched,
        ], 200);
    }

    /**
     * Get single cost center details
     */
    public function show($id): JsonResponse
    {
        $costCenter = CostCenter::with(['accounts'])->find($id);

        if (!$costCenter) {
            return response()->json(['message' => 'مركز التكلفة غير موجود'], 404);
        }

        $data = $costCenter->toArray();
        $data['type_label'] = $costCenter->type === 'property' ? 'عقار' : 'مشروع مقاولات';
        $data['status_label'] = $costCenter->status === 'active' ? 'نشط' : 'معطّل';

        return response()->json([
            'success' => true,
            'cost_center' => $data,
        ], 200);
    }

    /**
     * Create a new cost center (UC-20)
     */
    public function store(Request $request): JsonResponse
    {
        if (!$this->authorizeAccountant($request)) {
            return response()->json(['message' => 'غير مصرح لك بإضافة مراكز تكلفة'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:3|max:100',
            'type' => 'required|in:property,contracting_project',
            'description' => 'nullable|string|max:500',
            'status' => 'nullable|in:active,inactive',
        ], [
            'name.required' => 'اسم مركز التكلفة إلزامي',
            'name.min' => 'اسم مركز التكلفة يجب أن يكون بين 3 و100 حرف',
            'name.max' => 'اسم مركز التكلفة يجب أن يكون بين 3 و100 حرف',
            'type.required' => 'نوع مركز التكلفة إلزامي',
            'type.in' => 'نوع مركز التكلفة يجب أن يكون عقار أو مشروع مقاولات',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check duplicate name in tenant DB
        $nameExists = CostCenter::where('name', $request->name)->exists();
        if ($nameExists) {
            return response()->json(['message' => 'اسم مركز التكلفة مستخدم بالفعل'], 422);
        }

        // Generate sequential unique code
        $prefix = $request->type === 'property' ? 'CC-PROP-' : 'CC-PROJ-';
        $count = CostCenter::where('type', $request->type)->count() + 1;
        $code = $prefix . str_pad((string) $count, 3, '0', STR_PAD_LEFT);

        // Ensure unique code
        while (CostCenter::where('code', $code)->exists()) {
            $count++;
            $code = $prefix . str_pad((string) $count, 3, '0', STR_PAD_LEFT);
        }

        $costCenter = CostCenter::create([
            'code' => $code,
            'name' => $request->name,
            'type' => $request->type,
            'description' => $request->description,
            'status' => $request->input('status', 'active'),
        ]);

        return response()->json([
            'message' => 'تم إنشاء مركز التكلفة بنجاح',
            'cost_center' => $costCenter,
        ], 201);
    }

    /**
     * Update cost center (UC-21)
     */
    public function update(Request $request, $id): JsonResponse
    {
        if (!$this->authorizeAccountant($request)) {
            return response()->json(['message' => 'غير مصرح لك بتعديل مراكز التكلفة'], 403);
        }

        $costCenter = CostCenter::find($id);
        if (!$costCenter) {
            return response()->json(['message' => 'مركز التكلفة غير موجود'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:3|max:100',
            'type' => 'nullable|in:property,contracting_project',
            'description' => 'nullable|string|max:500',
            'status' => 'nullable|in:active,inactive',
        ], [
            'name.required' => 'اسم مركز التكلفة إلزامي',
            'name.min' => 'اسم مركز التكلفة يجب أن يكون بين 3 و100 حرف',
            'name.max' => 'اسم مركز التكلفة يجب أن يكون بين 3 و100 حرف',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check duplicate name excluding self
        $nameExists = CostCenter::where('name', $request->name)->where('id', '!=', $id)->exists();
        if ($nameExists) {
            return response()->json(['message' => 'اسم مركز التكلفة مستخدم بالفعل'], 422);
        }

        // Business Rule: Type cannot be changed if linked transactions exist (UC-21)
        if ($request->has('type') && $request->type !== $costCenter->type) {
            if ($this->hasLinkedTransactions($costCenter->id)) {
                return response()->json(['message' => 'لا يمكن تغيير نوع مركز التكلفة لوجود قيود مرتبطة به'], 422);
            }
            $costCenter->type = $request->type;
        }

        $costCenter->name = $request->name;
        $costCenter->description = $request->input('description', $costCenter->description);
        if ($request->has('status')) {
            $costCenter->status = $request->status;
        }
        $costCenter->save();

        return response()->json([
            'message' => 'تم تحديث مركز التكلفة بنجاح',
            'cost_center' => $costCenter,
        ], 200);
    }

    /**
     * Delete cost center (UC-22)
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        if (!$this->authorizeAccountant($request)) {
            return response()->json(['message' => 'غير مصرح لك بحذف مراكز التكلفة'], 403);
        }

        $costCenter = CostCenter::find($id);
        if (!$costCenter) {
            return response()->json(['message' => 'مركز التكلفة غير موجود'], 404);
        }

        // Check linked transactions (UC-22 Alternative 1)
        if ($this->hasLinkedTransactions($costCenter->id)) {
            return response()->json(['message' => 'لا يمكن حذف مركز تكلفة له قيود مرتبطة'], 422);
        }

        $costCenter->delete();

        return response()->json(['message' => 'تم حذف مركز التكلفة بنجاح'], 200);
    }

    /**
     * Toggle status active/inactive
     */
    public function toggleStatus(Request $request, $id): JsonResponse
    {
        if (!$this->authorizeAccountant($request)) {
            return response()->json(['message' => 'غير مصرح لك بتعديل حالة مركز التكلفة'], 403);
        }

        $costCenter = CostCenter::find($id);
        if (!$costCenter) {
            return response()->json(['message' => 'مركز التكلفة غير موجود'], 404);
        }

        $costCenter->status = $costCenter->status === 'active' ? 'inactive' : 'active';
        $costCenter->save();

        return response()->json([
            'message' => 'تم تغيير حالة مركز التكلفة بنجاح',
            'status' => $costCenter->status,
        ], 200);
    }

    /**
     * Configure mandatory cost center linking on an account (UC-23)
     */
    public function configureAccountLinking(Request $request): JsonResponse
    {
        if (!$this->authorizeAccountant($request)) {
            return response()->json(['message' => 'غير مصرح لك بتعديل إعدادات الحسابات'], 403);
        }

        $validator = Validator::make($request->all(), [
            'account_id' => 'required|integer',
            'is_mandatory' => 'required|boolean',
            'allowed_cost_center_ids' => 'nullable|array',
            'allowed_cost_center_ids.*' => 'integer',
        ], [
            'account_id.required' => 'الحساب إلزامي',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $account = Account::find($request->account_id);
        if (!$account) {
            return response()->json(['message' => 'الحساب غير موجود'], 404);
        }

        $account->is_cost_center_mandatory = $request->boolean('is_mandatory');
        $account->save();

        // Sync allowed cost centers
        if ($request->has('allowed_cost_center_ids')) {
            $account->allowedCostCenters()->sync($request->input('allowed_cost_center_ids', []));
        }

        return response()->json([
            'message' => 'تم تحديث إعدادات ربط الحساب بمركز التكلفة بنجاح',
            'account' => $account->load('allowedCostCenters'),
        ], 200);
    }

    /**
     * Helper to verify if cost center has linked transactions or operational records
     */
    protected function hasLinkedTransactions(int $costCenterId): bool
    {
        $hasJournalItems = DB::connection('tenant')->table('journal_entry_items')
            ->where('cost_center_id', $costCenterId)
            ->exists();

        $hasVouchers = DB::connection('tenant')->table('vouchers')
            ->where('cost_center_id', $costCenterId)
            ->exists();

        $hasProperties = DB::connection('tenant')->table('properties')
            ->where('cost_center_id', $costCenterId)
            ->exists();

        $hasContractorInvoices = DB::connection('tenant')->table('contractor_invoices')
            ->where('cost_center_id', $costCenterId)
            ->exists();

        $hasSupplierInvoices = DB::connection('tenant')->table('supplier_invoices')
            ->where('cost_center_id', $costCenterId)
            ->exists();

        return $hasJournalItems || $hasVouchers || $hasProperties || $hasContractorInvoices || $hasSupplierInvoices;
    }
}

