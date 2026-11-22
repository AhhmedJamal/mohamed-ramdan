<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Property;
use App\Models\Tenant\RentalContract;
use App\Models\Tenant\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class UnitController extends Controller
{
    /**
     * Helper to verify Data Entry permission for mutations (CRUD matrix Section 1.6)
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
     * List all units of a property (UC-29)
     */
    public function index(Request $request, $propertyId): JsonResponse
    {
        $property = Property::find($propertyId);
        if (!$property) {
            return response()->json(['message' => 'العقار غير موجود'], 404);
        }

        $query = Unit::where('property_id', $propertyId)->with(['activeContract.tenant']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        $units = $query->orderBy('id', 'asc')->get();

        $enriched = $units->map(function ($unit) {
            $data = $unit->toArray();
            $data['current_tenant_name'] = $unit->activeContract?->tenant?->name ?? null;
            $data['contract_number'] = $unit->activeContract?->contract_number ?? null;
            $data['type_label'] = Unit::$typeArabicLabels[$unit->type] ?? $unit->type;
            $data['status_label'] = Unit::$statusArabicLabels[$unit->status] ?? $unit->status;
            return $data;
        });

        return response()->json([
            'success' => true,
            'property' => $property,
            'units' => $enriched,
        ], 200);
    }

    /**
     * Add single unit to property (UC-30)
     */
    public function store(Request $request, $propertyId): JsonResponse
    {
        if (!$this->authorizeDataEntry($request)) {
            return response()->json(['message' => 'غير مصرح لك بإضافة وحدات'], 403);
        }

        $property = Property::find($propertyId);
        if (!$property) {
            return response()->json(['message' => 'العقار غير موجود'], 404);
        }

        $validator = Validator::make($request->all(), [
            'unit_number' => 'required|string|max:50',
            'type' => 'required|in:apartment,shop,office,warehouse',
            'area_sqm' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:vacant,under_maintenance',
        ], [
            'unit_number.required' => 'رقم الوحدة إلزامي',
            'type.required' => 'نوع الوحدة إلزامي',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check duplicate unit number within the same property (UC-30 Alternative 1)
        $duplicate = Unit::where('property_id', $propertyId)
            ->where('unit_number', $request->unit_number)
            ->exists();

        if ($duplicate) {
            return response()->json(['message' => 'رقم الوحدة مكرر في نفس العقار'], 422);
        }

        $unit = Unit::create([
            'property_id' => $property->id,
            'unit_number' => $request->unit_number,
            'type' => $request->type,
            'area_sqm' => $request->area_sqm,
            'status' => $request->input('status', 'vacant'),
        ]);

        // Update units_count on property
        $property->increment('units_count');

        return response()->json([
            'message' => 'تم إضافة الوحدة بنجاح',
            'unit' => $unit,
        ], 201);
    }

    /**
     * Show single unit details
     */
    public function show(Request $request, $propertyId, $id): JsonResponse
    {
        $unit = Unit::where('property_id', $propertyId)
            ->with(['activeContract.tenant'])
            ->find($id);

        if (!$unit) {
            return response()->json(['message' => 'الوحدة غير موجودة'], 404);
        }

        $data = $unit->toArray();
        $data['current_tenant_name'] = $unit->activeContract?->tenant?->name ?? null;
        $data['type_label'] = Unit::$typeArabicLabels[$unit->type] ?? $unit->type;
        $data['status_label'] = Unit::$statusArabicLabels[$unit->status] ?? $unit->status;

        return response()->json([
            'success' => true,
            'unit' => $data,
        ], 200);
    }

    /**
     * Update unit details (UC-31)
     */
    public function update(Request $request, $propertyId, $id): JsonResponse
    {
        if (!$this->authorizeDataEntry($request)) {
            return response()->json(['message' => 'غير مصرح لك بتعديل بيانات الوحدات'], 403);
        }

        $unit = Unit::where('property_id', $propertyId)->find($id);
        if (!$unit) {
            return response()->json(['message' => 'الوحدة غير موجودة'], 404);
        }

        $validator = Validator::make($request->all(), [
            'unit_number' => 'required|string|max:50',
            'type' => 'required|in:apartment,shop,office,warehouse',
            'area_sqm' => 'nullable|numeric|min:0',
            'status' => 'required|in:vacant,occupied,under_maintenance',
        ], [
            'unit_number.required' => 'رقم الوحدة إلزامي',
            'type.required' => 'نوع الوحدة إلزامي',
            'status.required' => 'حالة الوحدة إلزامية',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check duplicate unit number excluding self
        $duplicate = Unit::where('property_id', $propertyId)
            ->where('unit_number', $request->unit_number)
            ->where('id', '!=', $id)
            ->exists();

        if ($duplicate) {
            return response()->json(['message' => 'رقم الوحدة مكرر في نفس العقار'], 422);
        }

        // Business Rule: Cannot change status to vacant if there is an active contract (UC-31)
        if ($request->status === 'vacant' && $unit->status !== 'vacant') {
            $hasActiveContract = RentalContract::where('unit_id', $unit->id)
                ->where('status', 'active')
                ->exists();

            if ($hasActiveContract) {
                return response()->json(['message' => 'لا يمكن تغيير حالة الوحدة إلى شاغرة لوجود عقد إيجار نشط'], 422);
            }
        }

        $unit->unit_number = $request->unit_number;
        $unit->type = $request->type;
        $unit->area_sqm = $request->area_sqm;
        $unit->status = $request->status;
        $unit->save();

        return response()->json([
            'message' => 'تم تحديث بيانات الوحدة بنجاح',
            'unit' => $unit,
        ], 200);
    }

    /**
     * Delete unit (UC-32)
     */
    public function destroy(Request $request, $propertyId, $id): JsonResponse
    {
        if (!$this->authorizeDataEntry($request)) {
            return response()->json(['message' => 'غير مصرح لك بحذف الوحدات'], 403);
        }

        $unit = Unit::where('property_id', $propertyId)->find($id);
        if (!$unit) {
            return response()->json(['message' => 'الوحدة غير موجودة'], 404);
        }

        // Business Rule: Cannot delete unit with active rental contract (UC-32 Alternative 1)
        $hasActiveContract = RentalContract::where('unit_id', $unit->id)
            ->where('status', 'active')
            ->exists();

        if ($hasActiveContract) {
            return response()->json(['message' => 'لا يمكن حذف وحدة لها عقد إيجار نشط'], 422);
        }

        // Check if any contracts exist
        $hasAnyContracts = RentalContract::where('unit_id', $unit->id)->exists();
        if ($hasAnyContracts) {
            return response()->json(['message' => 'لا يمكن حذف وحدة مرتبطة بعقود إيجار سابقة'], 422);
        }

        $property = Property::find($propertyId);

        $unit->delete();

        if ($property && $property->units_count > 0) {
            $property->decrement('units_count');
        }

        return response()->json(['message' => 'تم حذف الوحدة بنجاح'], 200);
    }
}

