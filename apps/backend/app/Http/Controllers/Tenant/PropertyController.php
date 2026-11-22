<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\CostCenter;
use App\Models\Tenant\Property;
use App\Models\Tenant\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PropertyController extends Controller
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
     * List all properties (UC-25)
     */
    public function index(Request $request): JsonResponse
    {
        $query = Property::with(['costCenter', 'units']);

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('address', 'like', "%{$s}%");
            });
        }

        $properties = $query->orderBy('id', 'desc')->get();

        $enriched = $properties->map(function ($property) {
            $data = $property->toArray();
            $data['type_label'] = Property::$typeArabicLabels[$property->type] ?? $property->type;
            $data['vacant_units_count'] = $property->units->where('status', 'vacant')->count();
            $data['occupied_units_count'] = $property->units->where('status', 'occupied')->count();
            $data['maintenance_units_count'] = $property->units->where('status', 'under_maintenance')->count();
            return $data;
        });

        return response()->json([
            'success' => true,
            'properties' => $enriched,
        ], 200);
    }

    /**
     * Get single property with its units and cost center
     */
    public function show($id): JsonResponse
    {
        $property = Property::with(['costCenter', 'units'])->find($id);

        if (!$property) {
            return response()->json(['message' => 'العقار غير موجود'], 404);
        }

        $data = $property->toArray();
        $data['type_label'] = Property::$typeArabicLabels[$property->type] ?? $property->type;
        $data['vacant_units_count'] = $property->units->where('status', 'vacant')->count();
        $data['occupied_units_count'] = $property->units->where('status', 'occupied')->count();
        $data['maintenance_units_count'] = $property->units->where('status', 'under_maintenance')->count();

        return response()->json([
            'success' => true,
            'property' => $data,
        ], 200);
    }

    /**
     * Create property with automated Cost Center and Unit scaffolding (UC-26)
     */
    public function store(Request $request): JsonResponse
    {
        if (!$this->authorizeDataEntry($request)) {
            return response()->json(['message' => 'غير مصرح لك بإضافة عقارات'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:3|max:100',
            'address' => 'required|string|max:255',
            'type' => 'required|in:residential,commercial,mixed',
            'units_count' => 'required|integer|min:1',
            'unit_type' => 'required|in:apartment,shop,office,warehouse',
            'default_area_sqm' => 'nullable|numeric|min:0',
        ], [
            'name.required' => 'اسم العقار إلزامي',
            'name.min' => 'اسم العقار يجب أن يكون بين 3 و100 حرف',
            'name.max' => 'اسم العقار يجب أن يكون بين 3 و100 حرف',
            'address.required' => 'العنوان إلزامي',
            'type.required' => 'نوع العقار إلزامي',
            'units_count.required' => 'عدد الوحدات إلزامي',
            'units_count.min' => 'عدد الوحدات يجب أن لا يقل عن 1',
            'unit_type.required' => 'نوع الوحدات إلزامي',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check unique property name in tenant DB
        $nameExists = Property::where('name', $request->name)->exists();
        if ($nameExists) {
            return response()->json(['message' => 'اسم العقار مستخدم بالفعل'], 422);
        }

        return DB::connection('tenant')->transaction(function () use ($request) {
            // 1. Auto-create Cost Center with same name (UC-26 Rule 1)
            $count = CostCenter::where('type', 'property')->count() + 1;
            $code = 'CC-PROP-' . str_pad((string) $count, 3, '0', STR_PAD_LEFT);
            while (CostCenter::where('code', $code)->exists()) {
                $count++;
                $code = 'CC-PROP-' . str_pad((string) $count, 3, '0', STR_PAD_LEFT);
            }

            // If a cost center with this exact name already exists, reuse it or suffix it
            $costCenter = CostCenter::where('name', $request->name)->first();
            if (!$costCenter) {
                $costCenter = CostCenter::create([
                    'code' => $code,
                    'name' => $request->name,
                    'type' => 'property',
                    'description' => "مركز تكلفة خاص بعقار {$request->name}",
                    'status' => 'active',
                ]);
            }

            // 2. Create Property record
            $property = Property::create([
                'name' => $request->name,
                'address' => $request->address,
                'type' => $request->type,
                'units_count' => $request->units_count,
                'cost_center_id' => $costCenter->id,
            ]);

            // 3. Auto-provision N Unit records numbered 1 .. N with status 'vacant' (UC-26 Rule 2)
            $unitsCount = (int) $request->units_count;
            $unitType = $request->unit_type;
            $area = $request->input('default_area_sqm', null);

            for ($i = 1; $i <= $unitsCount; $i++) {
                Unit::create([
                    'property_id' => $property->id,
                    'unit_number' => (string) $i,
                    'type' => $unitType,
                    'area_sqm' => $area,
                    'status' => 'vacant',
                ]);
            }

            return response()->json([
                'message' => 'تم إنشاء العقار ووحداته ومركز التكلفة المرتبط بنجاح',
                'property' => $property->load(['costCenter', 'units']),
            ], 201);
        });
    }

    /**
     * Update property (UC-27)
     */
    public function update(Request $request, $id): JsonResponse
    {
        if (!$this->authorizeDataEntry($request)) {
            return response()->json(['message' => 'غير مصرح لك بتعديل العقارات'], 403);
        }

        $property = Property::find($id);
        if (!$property) {
            return response()->json(['message' => 'العقار غير موجود'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:3|max:100',
            'address' => 'required|string|max:255',
            'type' => 'required|in:residential,commercial,mixed',
        ], [
            'name.required' => 'اسم العقار إلزامي',
            'address.required' => 'العنوان إلزامي',
            'type.required' => 'نوع العقار إلزامي',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check duplicate name excluding self
        $nameExists = Property::where('name', $request->name)->where('id', '!=', $id)->exists();
        if ($nameExists) {
            return response()->json(['message' => 'اسم العقار مستخدم بالفعل'], 422);
        }

        $property->name = $request->name;
        $property->address = $request->address;
        $property->type = $request->type;
        $property->save();

        // Update cost center name if it matches old name
        if ($property->costCenter) {
            $costCenterNameExists = CostCenter::where('name', $request->name)->where('id', '!=', $property->cost_center_id)->exists();
            if (!$costCenterNameExists) {
                $property->costCenter->name = $request->name;
                $property->costCenter->save();
            }
        }

        return response()->json([
            'message' => 'تم تحديث بيانات العقار بنجاح',
            'property' => $property->load(['costCenter', 'units']),
        ], 200);
    }

    /**
     * Delete property (UC-28)
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        if (!$this->authorizeDataEntry($request)) {
            return response()->json(['message' => 'غير مصرح لك بحذف العقارات'], 403);
        }

        $property = Property::find($id);
        if (!$property) {
            return response()->json(['message' => 'العقار غير موجود'], 404);
        }

        // Business Rule: Cannot delete property with active rental contracts (UC-28 Alternative 1)
        $hasActiveContracts = DB::connection('tenant')->table('rental_contracts')
            ->where('property_id', $property->id)
            ->where('status', 'active')
            ->exists();

        if ($hasActiveContracts) {
            return response()->json(['message' => 'لا يمكن حذف العقار لوجود عقود نشطة'], 422);
        }

        // Check if any contracts exist at all (including expired/cancelled)
        $hasAnyContracts = DB::connection('tenant')->table('rental_contracts')
            ->where('property_id', $property->id)
            ->exists();

        if ($hasAnyContracts) {
            return response()->json(['message' => 'لا يمكن حذف العقار لوجود عقود مرتبطة به'], 422);
        }

        return DB::connection('tenant')->transaction(function () use ($property) {
            $costCenterId = $property->cost_center_id;

            // Delete units and property
            Unit::where('property_id', $property->id)->delete();
            $property->delete();

            // Delete cost center if no other records link to it
            if ($costCenterId) {
                $hasVouchers = DB::connection('tenant')->table('vouchers')->where('cost_center_id', $costCenterId)->exists();
                $hasJournal = DB::connection('tenant')->table('journal_entry_items')->where('cost_center_id', $costCenterId)->exists();

                if (!$hasVouchers && !$hasJournal) {
                    CostCenter::where('id', $costCenterId)->delete();
                }
            }

            return response()->json(['message' => 'تم حذف العقار ووحداته بنجاح'], 200);
        });
    }
}

