<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TenantMasterController extends Controller
{
    /**
     * Helper to verify Data Entry permission for tenant mutations (CRUD matrix Section 1.6)
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
     * List all tenants with active contract counts (UC-33)
     */
    public function index(Request $request): JsonResponse
    {
        $query = Tenant::withCount([
            'contracts',
            'activeContracts',
        ]);

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('national_id_or_cr', 'like', "%{$s}%")
                    ->orWhere('mobile', 'like', "%{$s}%")
                    ->orWhere('email', 'like', "%{$s}%");
            });
        }

        $tenants = $query->orderBy('id', 'desc')->get();

        $enriched = $tenants->map(function ($tenant) {
            $data = $tenant->toArray();
            $data['full_name'] = $tenant->name;
            $data['national_id'] = $tenant->national_id_or_cr;
            $data['is_corporate'] = ($tenant->type === 'company');
            $data['company_name'] = ($tenant->type === 'company' ? $tenant->name : null);
            $data['cr_number'] = ($tenant->type === 'company' ? $tenant->national_id_or_cr : null);
            $data['type_label'] = Tenant::$typeArabicLabels[$tenant->type] ?? $tenant->type;
            return $data;
        });

        return response()->json([
            'status' => 'success',
            'data' => $enriched,
            'tenants' => $enriched,
            'count' => $enriched->count(),
        ]);
    }

    /**
     * Show single tenant details with contract history (UC-33)
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $tenant = Tenant::with(['contracts.property', 'contracts.unit'])->find($id);

        if (!$tenant) {
            return response()->json([
                'status' => 'error',
                'message' => 'المستأجر غير موجود',
            ], 404);
        }

        $data = $tenant->toArray();
        $data['full_name'] = $tenant->name;
        $data['national_id'] = $tenant->national_id_or_cr;
        $data['is_corporate'] = ($tenant->type === 'company');
        $data['company_name'] = ($tenant->type === 'company' ? $tenant->name : null);
        $data['cr_number'] = ($tenant->type === 'company' ? $tenant->national_id_or_cr : null);
        $data['type_label'] = Tenant::$typeArabicLabels[$tenant->type] ?? $tenant->type;

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Add new tenant (UC-34)
     */
    public function store(Request $request): JsonResponse
    {
        if (!$this->authorizeDataEntry($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك بإضافة مستأجر، الصلاحية لمدخل البيانات فقط',
            ], 403);
        }

        // Support frontend aliases
        if (!$request->filled('name') && $request->filled('full_name')) {
            $request->merge(['name' => $request->full_name]);
        }
        if (!$request->filled('national_id_or_cr')) {
            if ($request->filled('national_id')) {
                $request->merge(['national_id_or_cr' => $request->national_id]);
            } elseif ($request->filled('cr_number')) {
                $request->merge(['national_id_or_cr' => $request->cr_number]);
            }
        }
        if (!$request->filled('type')) {
            if ($request->has('is_corporate')) {
                $request->merge(['type' => filter_var($request->is_corporate, FILTER_VALIDATE_BOOLEAN) ? 'company' : 'individual']);
            } else {
                $request->merge(['type' => 'individual']);
            }
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:3|max:100',
            'type' => 'required|in:individual,company',
            'national_id_or_cr' => 'required|string|max:50|unique:tenant.tenants,national_id_or_cr',
            'mobile' => ['required', 'string', 'regex:/^05[0-9]{8}$/'],
            'email' => 'required|email|max:100|unique:tenant.tenants,email',
            'address' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:500',
        ], [
            'national_id_or_cr.unique' => 'رقم الهوية مستخدم بالفعل',
            'email.unique' => 'البريد الإلكتروني مستخدم بالفعل',
            'mobile.regex' => 'يرجى إدخال رقم جوال صحيح يبدأ بـ 05 ويتكون من 10 أرقام',
            'name.min' => 'اسم المستأجر يجب أن يكون 3 أحرف على الأقل',
            'name.max' => 'اسم المستأجر لا يجب أن يتجاوز 100 حرف',
            'notes.max' => 'الملاحظات لا يجب أن تتجاوز 500 حرف',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $tenant = Tenant::create([
            'name' => $request->name,
            'type' => $request->type,
            'national_id_or_cr' => $request->national_id_or_cr,
            'mobile' => $request->mobile,
            'email' => $request->email,
            'address' => $request->address,
            'notes' => $request->notes,
        ]);

        $data = $tenant->toArray();
        $data['full_name'] = $tenant->name;
        $data['national_id'] = $tenant->national_id_or_cr;
        $data['is_corporate'] = ($tenant->type === 'company');
        $data['company_name'] = ($tenant->type === 'company' ? $tenant->name : null);
        $data['cr_number'] = ($tenant->type === 'company' ? $tenant->national_id_or_cr : null);
        $data['type_label'] = Tenant::$typeArabicLabels[$tenant->type] ?? $tenant->type;

        return response()->json([
            'status' => 'success',
            'message' => 'تم إضافة المستأجر بنجاح',
            'data' => $data,
        ], 201);
    }

    /**
     * Update tenant details (UC-35)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        if (!$this->authorizeDataEntry($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك بتعديل بيانات المستأجر، الصلاحية لمدخل البيانات فقط',
            ], 403);
        }

        $tenant = Tenant::find($id);
        if (!$tenant) {
            return response()->json([
                'status' => 'error',
                'message' => 'المستأجر غير موجود',
            ], 404);
        }

        // Support frontend aliases
        if (!$request->filled('name') && $request->filled('full_name')) {
            $request->merge(['name' => $request->full_name]);
        }
        if (!$request->filled('national_id_or_cr')) {
            if ($request->filled('national_id')) {
                $request->merge(['national_id_or_cr' => $request->national_id]);
            } elseif ($request->filled('cr_number')) {
                $request->merge(['national_id_or_cr' => $request->cr_number]);
            }
        }
        if (!$request->filled('type') && $request->has('is_corporate')) {
            $request->merge(['type' => filter_var($request->is_corporate, FILTER_VALIDATE_BOOLEAN) ? 'company' : 'individual']);
        }

        // Business Rule UC-35: لا يمكن تغيير رقم الهوية إذا كانت هناك عقود مرتبطة
        if ($request->has('national_id_or_cr') && $request->national_id_or_cr !== $tenant->national_id_or_cr) {
            if ($tenant->contracts()->exists()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'لا يمكن تغيير رقم الهوية لوجود عقود مرتبطة',
                ], 422);
            }
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|min:3|max:100',
            'type' => 'sometimes|required|in:individual,company',
            'national_id_or_cr' => 'sometimes|required|string|max:50|unique:tenant.tenants,national_id_or_cr,' . $tenant->id,
            'mobile' => ['sometimes', 'required', 'string', 'regex:/^05[0-9]{8}$/'],
            'email' => 'sometimes|required|email|max:100|unique:tenant.tenants,email,' . $tenant->id,
            'address' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:500',
        ], [
            'national_id_or_cr.unique' => 'رقم الهوية مستخدم بالفعل',
            'email.unique' => 'البريد الإلكتروني مستخدم بالفعل',
            'mobile.regex' => 'يرجى إدخال رقم جوال صحيح يبدأ بـ 05 ويتكون من 10 أرقام',
            'name.min' => 'اسم المستأجر يجب أن يكون 3 أحرف على الأقل',
            'name.max' => 'اسم المستأجر لا يجب أن يتجاوز 100 حرف',
            'notes.max' => 'الملاحظات لا يجب أن تتجاوز 500 حرف',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $tenant->update($request->only([
            'name',
            'type',
            'national_id_or_cr',
            'mobile',
            'email',
            'address',
            'notes',
        ]));

        $data = $tenant->fresh()->toArray();
        $data['full_name'] = $data['name'];
        $data['national_id'] = $data['national_id_or_cr'];
        $data['is_corporate'] = ($data['type'] === 'company');
        $data['company_name'] = ($data['type'] === 'company' ? $data['name'] : null);
        $data['cr_number'] = ($data['type'] === 'company' ? $data['national_id_or_cr'] : null);
        $data['type_label'] = Tenant::$typeArabicLabels[$data['type']] ?? $data['type'];

        return response()->json([
            'status' => 'success',
            'message' => 'تم تحديث بيانات المستأجر بنجاح',
            'data' => $data,
        ]);
    }

    /**
     * Delete tenant (UC-36)
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        if (!$this->authorizeDataEntry($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح لك بحذف المستأجر، الصلاحية لمدخل البيانات فقط',
            ], 403);
        }

        $tenant = Tenant::find($id);
        if (!$tenant) {
            return response()->json([
                'status' => 'error',
                'message' => 'المستأجر غير موجود',
            ], 404);
        }

        // Business Rule UC-36: لا يمكن حذف مستأجر له عقود إيجار (نشطة أو منتهية)
        if ($tenant->contracts()->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'لا يمكن حذف المستأجر لوجود عقود إيجار مرتبطة به',
            ], 422);
        }

        $tenant->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'تم حذف المستأجر بنجاح',
        ]);
    }
}

