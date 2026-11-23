<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\ContractAttachment;
use App\Models\Tenant\Notification;
use App\Models\Tenant\Property;
use App\Models\Tenant\RentalContract;
use App\Models\Tenant\Unit;
use App\Services\Tenant\InstallmentScheduleService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class RentalContractController extends Controller
{
    /**
     * Authorize Data Entry permission (CRUD Section 1.6)
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
     * Authorize Branch Manager permission (CRUD Section 1.6)
     */
    protected function authorizeBranchManager(Request $request): bool
    {
        $user = $request->user();
        if (!$user) {
            return false;
        }

        $subdomain = $request->header('X-Tenant-Subdomain') ?? $request->query('subdomain');
        $role = $user->getRoleForCompany($subdomain);

        return in_array($role, ['branch_manager', 'super_admin']);
    }

    /**
     * List all rental contracts (UC-37)
     */
    public function index(Request $request): JsonResponse
    {
        $query = RentalContract::with(['tenant', 'property', 'unit', 'installments', 'attachments']);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('property_id')) {
            $query->where('property_id', $request->property_id);
        }

        if ($request->filled('contract_type')) {
            $query->where('contract_type', $request->contract_type);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('contract_number', 'like', "%{$s}%")
                    ->orWhereHas('tenant', function ($t) use ($s) {
                        $t->where('name', 'like', "%{$s}%")
                            ->orWhere('national_id_or_cr', 'like', "%{$s}%");
                    })
                    ->orWhereHas('property', function ($p) use ($s) {
                        $p->where('name', 'like', "%{$s}%");
                    })
                    ->orWhereHas('unit', function ($u) use ($s) {
                        $u->where('unit_number', 'like', "%{$s}%");
                    });
            });
        }

        $contracts = $query->orderBy('id', 'desc')->get();

        $enriched = $contracts->map(function ($contract) {
            $data = $contract->toArray();
            $data['status_label'] = RentalContract::$statusArabicLabels[$contract->status] ?? $contract->status;
            $data['contract_type_label'] = RentalContract::$contractTypeArabicLabels[$contract->contract_type] ?? $contract->contract_type;
            $data['collection_cycle_label'] = RentalContract::$collectionCycleArabicLabels[$contract->collection_cycle] ?? $contract->collection_cycle;
            $data['total_paid'] = (float) $contract->installments->where('status', 'paid')->sum('paid_amount');
            $data['total_due'] = (float) $contract->installments->where('status', 'due')->sum('amount');
            $data['total_overdue'] = (float) $contract->installments->where('status', 'overdue')->sum('amount');
            return $data;
        });

        return response()->json([
            'status' => 'success',
            'data' => $enriched,
            'count' => $enriched->count(),
        ]);
    }

    /**
     * Show single rental contract with full details (UC-37, UC-40)
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $contract = RentalContract::with(['tenant', 'property', 'unit', 'installments', 'attachments'])->find($id);

        if (!$contract) {
            return response()->json([
                'status' => 'error',
                'message' => 'عقد الإيجار غير موجود',
            ], 404);
        }

        $data = $contract->toArray();
        $data['status_label'] = RentalContract::$statusArabicLabels[$contract->status] ?? $contract->status;
        $data['contract_type_label'] = RentalContract::$contractTypeArabicLabels[$contract->contract_type] ?? $contract->contract_type;
        $data['collection_cycle_label'] = RentalContract::$collectionCycleArabicLabels[$contract->collection_cycle] ?? $contract->collection_cycle;
        $data['total_paid'] = (float) $contract->installments->where('status', 'paid')->sum('paid_amount');
        $data['total_due'] = (float) $contract->installments->where('status', 'due')->sum('amount');
        $data['total_overdue'] = (float) $contract->installments->where('status', 'overdue')->sum('amount');

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Create rental contract & generate installments (UC-38)
     */
    public function store(Request $request): JsonResponse
    {
        if (!$this->authorizeDataEntry($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك بإنشاء عقد إيجار، الصلاحية لمدخل البيانات فقط',
            ], 403);
        }

        // Support payload aliases and automatic field calculations
        if ($request->has('annual_rent') && !$request->has('total_rent')) {
            $request->merge(['total_rent' => $request->annual_rent]);
        }
        if ($request->has('frequency') && !$request->has('collection_cycle')) {
            $request->merge(['collection_cycle' => $request->frequency]);
        }
        if (!$request->has('contract_type')) {
            $request->merge(['contract_type' => 'company_to_tenant']);
        }
        if (!$request->has('duration_months') && $request->filled('start_date') && $request->filled('end_date')) {
            $start = Carbon::parse($request->start_date);
            $end = Carbon::parse($request->end_date);
            $months = max(1, (int) round($start->diffInMonths($end)));
            $request->merge(['duration_months' => $months]);
        }

        $validator = Validator::make($request->all(), [
            'tenant_id' => 'required|exists:tenant.tenants,id',
            'property_id' => 'required|exists:tenant.properties,id',
            'unit_id' => 'required|exists:tenant.units,id',
            'contract_type' => 'required|in:owner_to_company,company_to_tenant',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'duration_months' => 'required|integer|min:1',
            'total_rent' => 'required|numeric|min:0',
            'collection_cycle' => 'required|in:monthly,quarterly,semi_annual,annual',
            'first_payment' => 'nullable|numeric|min:0',
            'first_due_date' => 'nullable|date',
            'notes' => 'nullable|string|max:1000',
        ], [
            'end_date.after' => 'تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية',
            'duration_months.min' => 'مدة العقد يجب أن تكون شهراً واحداً على الأقل',
            'total_rent.min' => 'قيمة الإيجار يجب ألا تقل عن 0',
            'collection_cycle.in' => 'دورة التحصيل غير صالحة',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        // Validate unit belongs to property
        $unit = Unit::where('id', $request->unit_id)
            ->where('property_id', $request->property_id)
            ->first();

        if (!$unit) {
            return response()->json([
                'status' => 'error',
                'message' => 'الوحدة المحددة لا تنتمي إلى هذا العقار',
            ], 422);
        }

        // UC-38 Alternative 1: الوحدة مشغولة بعقد آخر
        if ($unit->status !== 'vacant') {
            return response()->json([
                'status' => 'error',
                'message' => 'الوحدة مشغولة بعقد آخر',
            ], 422);
        }

        // UC-38 Alternative 3: المستأجر له عقد نشط على نفس الوحدة
        $hasActiveContract = RentalContract::where('unit_id', $unit->id)
            ->where('tenant_id', $request->tenant_id)
            ->where('status', 'active')
            ->exists();

        if ($hasActiveContract) {
            return response()->json([
                'status' => 'error',
                'message' => 'المستأجر له عقد نشط على نفس الوحدة',
            ], 422);
        }

        $contract = DB::connection('tenant')->transaction(function () use ($request, $unit) {
            // Generate sequential contract number: CNT-YYYYMM-XXXX
            $datePrefix = date('Ym');
            $countThisMonth = RentalContract::where('contract_number', 'like', "CNT-{$datePrefix}-%")->count();
            $contractNumber = sprintf("CNT-%s-%04d", $datePrefix, $countThisMonth + 1);

            $contract = RentalContract::create([
                'contract_number' => $contractNumber,
                'tenant_id' => $request->tenant_id,
                'property_id' => $request->property_id,
                'unit_id' => $unit->id,
                'contract_type' => $request->contract_type,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'duration_months' => $request->duration_months,
                'total_rent' => $request->total_rent,
                'collection_cycle' => $request->collection_cycle,
                'first_payment' => $request->first_payment ?? 0.0000,
                'status' => 'active',
                'notes' => $request->notes,
                'created_by' => $request->user()->id,
            ]);

            // Transition unit state to 'occupied' (UC-38)
            $unit->update(['status' => 'occupied']);

            // Generate installment schedule
            InstallmentScheduleService::generateSchedule($contract, $request->first_due_date);

            return $contract->load(['tenant', 'property', 'unit', 'installments']);
        });

        $data = $contract->toArray();
        $data['status_label'] = RentalContract::$statusArabicLabels[$contract->status] ?? $contract->status;
        $data['contract_type_label'] = RentalContract::$contractTypeArabicLabels[$contract->contract_type] ?? $contract->contract_type;
        $data['collection_cycle_label'] = RentalContract::$collectionCycleArabicLabels[$contract->collection_cycle] ?? $contract->collection_cycle;

        return response()->json([
            'status' => 'success',
            'message' => 'تم إنشاء عقد الإيجار وجدول الدفعات بنجاح',
            'data' => $data,
        ], 201);
    }

    /**
     * Update rental contract (UC-39)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        if (!$this->authorizeDataEntry($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك بتعديل العقد، الصلاحية لمدخل البيانات فقط',
            ], 403);
        }

        $contract = RentalContract::with('installments')->find($id);
        if (!$contract) {
            return response()->json([
                'status' => 'error',
                'message' => 'عقد الإيجار غير موجود',
            ], 404);
        }

        // UC-39 Alternative 1: لا يمكن تعديل عقد منتهي
        if ($contract->status === 'expired') {
            return response()->json([
                'status' => 'error',
                'message' => 'لا يمكن تعديل عقد منتهي',
            ], 422);
        }

        if ($contract->status === 'cancelled') {
            return response()->json([
                'status' => 'error',
                'message' => 'لا يمكن تعديل عقد ملغي',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'start_date' => 'sometimes|required|date',
            'end_date' => 'sometimes|required|date|after:start_date',
            'duration_months' => 'sometimes|required|integer|min:1',
            'total_rent' => 'sometimes|required|numeric|min:0',
            'collection_cycle' => 'sometimes|required|in:monthly,quarterly,semi_annual,annual',
            'notes' => 'nullable|string|max:1000',
        ], [
            'end_date.after' => 'تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $rentChanged = $request->has('total_rent') && (float)$request->total_rent !== (float)$contract->total_rent;
        $cycleChanged = $request->has('collection_cycle') && $request->collection_cycle !== $contract->collection_cycle;

        $contract->update($request->only([
            'start_date',
            'end_date',
            'duration_months',
            'total_rent',
            'collection_cycle',
            'notes',
        ]));

        // UC-39: إذا تغيرت القيمة أو دورة التحصيل، يتم إعادة حساب جدول الدفعات المستقبلية
        if ($rentChanged || $cycleChanged) {
            InstallmentScheduleService::generateSchedule($contract);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'تم تحديث عقد الإيجار بنجاح',
            'data' => $contract->fresh(['tenant', 'property', 'unit', 'installments']),
        ]);
    }

    /**
     * Request contract cancellation (UC-41A)
     */
    public function requestCancellation(Request $request, int $id): JsonResponse
    {
        if (!$this->authorizeDataEntry($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك بتقديم طلب إلغاء العقد',
            ], 403);
        }

        $contract = RentalContract::find($id);
        if (!$contract) {
            return response()->json([
                'status' => 'error',
                'message' => 'عقد الإيجار غير موجود',
            ], 404);
        }

        if (!in_array($contract->status, ['active', 'overdue'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'لا يمكن طلب إلغاء عقد إلا إذا كان في حالة ساري أو متأخر',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'cancellation_reason' => 'required|string|min:10|max:500',
        ], [
            'cancellation_reason.required' => 'سبب الإلغاء إلزامي',
            'cancellation_reason.min' => 'يجب إدخال سبب الإلغاء بحيث لا يقل عن 10 أحرف',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $contract->update([
            'status' => 'pending_cancellation',
            'cancellation_reason' => $request->cancellation_reason,
            'cancellation_requested_by' => $request->user()->id,
        ]);

        // UC-41A: Notify Branch Manager of pending cancellation request
        Notification::create([
            'role' => 'branch_manager',
            'type' => 'contract_cancellation_request',
            'title' => 'طلب إلغاء عقد إيجار',
            'message' => "طلب إلغاء للعقد رقم {$contract->contract_number}، السبب: {$request->cancellation_reason}",
            'data' => ['contract_id' => $contract->id],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'تم إرسال طلب إلغاء العقد لمدير الشركة للموافقة',
            'data' => $contract->fresh(),
        ]);
    }

    /**
     * Approve contract cancellation by Branch Manager (UC-42)
     */
    public function approveCancellation(Request $request, int $id): JsonResponse
    {
        if (!$this->authorizeBranchManager($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك باعتماد إلغاء العقد، الصلاحية لمدير الشركة فقط',
            ], 403);
        }

        $contract = RentalContract::find($id);
        if (!$contract) {
            return response()->json([
                'status' => 'error',
                'message' => 'عقد الإيجار غير موجود',
            ], 404);
        }

        if ($contract->status !== 'pending_cancellation') {
            return response()->json([
                'status' => 'error',
                'message' => 'العقد ليس في حالة طلب إلغاء معلق',
            ], 422);
        }

        DB::connection('tenant')->transaction(function () use ($contract) {
            // Update contract status to cancelled
            $contract->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
            ]);

            // Release unit back to vacant
            Unit::where('id', $contract->unit_id)->update(['status' => 'vacant']);

            // Cancel all unpaid installments
            $contract->installments()->where('status', 'due')->update(['status' => 'cancelled']);
        });

        // UC-42: Notify requester (Data Entry) of approval
        Notification::create([
            'user_id' => $contract->cancellation_requested_by ?? $contract->created_by,
            'role' => 'data_entry',
            'type' => 'contract_cancellation_approved',
            'title' => 'تمت الموافقة على إلغاء العقد',
            'message' => "تمت الموافقة على إلغاء العقد رقم {$contract->contract_number} وإتاحة الوحدة كشاغرة",
            'data' => ['contract_id' => $contract->id],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'تمت الموافقة على إلغاء العقد وإتاحة الوحدة كشاغرة',
            'data' => $contract->fresh(['unit', 'installments']),
        ]);
    }

    /**
     * Reject contract cancellation by Branch Manager (UC-42)
     */
    public function rejectCancellation(Request $request, int $id): JsonResponse
    {
        if (!$this->authorizeBranchManager($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك برفض إلغاء العقد، الصلاحية لمدير الشركة فقط',
            ], 403);
        }

        $contract = RentalContract::find($id);
        if (!$contract) {
            return response()->json([
                'status' => 'error',
                'message' => 'عقد الإيجار غير موجود',
            ], 404);
        }

        if ($contract->status !== 'pending_cancellation') {
            return response()->json([
                'status' => 'error',
                'message' => 'العقد ليس في حالة طلب إلغاء معلق',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'rejection_reason' => 'required|string|min:10|max:500',
        ], [
            'rejection_reason.required' => 'سبب الرفض إلزامي عند الرفض',
            'rejection_reason.min' => 'يجب إدخال سبب الرفض بحيث لا يقل عن 10 أحرف',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first(),
            ], 422);
        }

        // Revert contract to active status
        $contract->update([
            'status' => 'active',
            'rejection_reason' => $request->rejection_reason,
        ]);

        // UC-42: Notify requester (Data Entry) of rejection with reason
        Notification::create([
            'user_id' => $contract->cancellation_requested_by ?? $contract->created_by,
            'role' => 'data_entry',
            'type' => 'contract_cancellation_rejected',
            'title' => 'تم رفض طلب إلغاء العقد',
            'message' => "تم رفض طلب إلغاء العقد رقم {$contract->contract_number}، سبب الرفض: {$request->rejection_reason}",
            'data' => ['contract_id' => $contract->id],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'تم رفض طلب إلغاء العقد وإعادته إلى الحالة السارية',
            'data' => $contract->fresh(),
        ]);
    }

    /**
     * Upload contract attachment document (UC-41)
     */
    public function uploadAttachment(Request $request, int $id): JsonResponse
    {
        if (!$this->authorizeDataEntry($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك برفع مستندات، الصلاحية لمدخل البيانات فقط',
            ], 403);
        }

        $contract = RentalContract::find($id);
        if (!$contract) {
            return response()->json([
                'status' => 'error',
                'message' => 'عقد الإيجار غير موجود',
            ], 404);
        }

        // UC-41: الحد الأقصى 10 ملفات
        if ($contract->attachments()->count() >= 10) {
            return response()->json([
                'status' => 'error',
                'message' => 'تم الوصول إلى الحد الأقصى لعدد المستندات المرفقة (10 ملفات)',
            ], 422);
        }

        // UC-41: PNG, JPEG, PDF - max 5MB (5120KB)
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:pdf,png,jpg,jpeg|max:5120',
        ], [
            'file.required' => 'الملف مطلوب',
            'file.mimes' => 'صيغة الملف غير مدعومة. الصيغ المدعومة هي PDF, PNG, JPEG',
            'file.max' => 'حجم الملف يجب ألا يتجاوز 5 ميجابايت',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $file = $request->file('file');
        $filename = time() . '_' . $file->getClientOriginalName();
        $path = $file->storeAs("contracts/{$contract->id}", $filename, 'public');

        $attachment = ContractAttachment::create([
            'contract_id' => $contract->id,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_type' => $file->getClientOriginalExtension(),
            'file_size' => $file->getSize(),
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'تم رفع المستند المرفق بنجاح',
            'data' => $attachment,
        ], 201);
    }

    /**
     * Delete contract attachment (UC-41)
     */
    public function deleteAttachment(Request $request, int $id, int $attachmentId): JsonResponse
    {
        if (!$this->authorizeDataEntry($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك بحذف المستند المرفق',
            ], 403);
        }

        $attachment = ContractAttachment::where('id', $attachmentId)
            ->where('contract_id', $id)
            ->first();

        if (!$attachment) {
            return response()->json([
                'status' => 'error',
                'message' => 'المستند غير موجود',
            ], 404);
        }

        Storage::disk('public')->delete($attachment->file_path);
        $attachment->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'تم حذف المستند بنجاح',
        ]);
    }
}

