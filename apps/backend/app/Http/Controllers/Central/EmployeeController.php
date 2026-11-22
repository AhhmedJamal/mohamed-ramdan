<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\Company;
use App\Models\Central\User;
use App\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    protected TenantManager $tenantManager;

    public function __construct(TenantManager $tenantManager)
    {
        $this->tenantManager = $tenantManager;
    }

    /**
     * Resolve company for the authenticated Branch Manager or Super Admin
     */
    protected function getManagerCompany(Request $request): ?Company
    {
        $user = $request->user();

        // If Super Admin, allow company_id from query or header
        if ($user->companies()->wherePivot('role', 'super_admin')->exists() || $user->tokenCan('super_admin')) {
            $companyId = $request->header('X-Company-Id') ?? $request->query('company_id');
            if ($companyId) {
                return Company::find($companyId);
            }
        }

        return $user->companies()->wherePivot('role', 'branch_manager')->first()
            ?? $user->companies()->first();
    }

    /**
     * List all employees belonging to the company (UC-12)
     */
    public function index(Request $request): JsonResponse
    {
        $company = $this->getManagerCompany($request);

        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'غير مصرح لك بالوصول، لم يتم العثور على الشركة المرتبطة',
            ], 403);
        }

        $query = $company->users()
            ->wherePivotIn('role', ['general_accountant', 'data_entry']);

        // Search by Name
        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        // Filter by Role
        if ($role = $request->query('role')) {
            if ($role !== 'all') {
                $query->wherePivot('role', $role);
            }
        }

        // Filter by Status
        if ($status = $request->query('status')) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        }

        $employees = $query->latest('users.id')->get();

        $data = $employees->map(function ($emp) {
            return [
                'id' => $emp->id,
                'name' => $emp->name,
                'email' => $emp->email,
                'mobile' => $emp->mobile,
                'role' => $emp->pivot->role,
                'status' => $emp->status,
                'created_at' => $emp->created_at->format('Y-m-d H:i'),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Add new employee to the company (UC-13)
     */
    public function store(Request $request): JsonResponse
    {
        $company = $this->getManagerCompany($request);

        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'غير مصرح لك بإضافة موظف',
            ], 403);
        }

        // 1. Validation per SRS UC-13
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'min:3', 'max:100'],
            'email' => ['required', 'email', 'unique:users,email'],
            'mobile' => ['required', 'string', 'regex:/^05[0-9]{8}$/', 'unique:users,mobile'],
            'role' => ['required', 'in:general_accountant,data_entry'],
            'temporary_password' => ['nullable', 'string', 'min:8', 'max:25'],
        ], [
            'name.required' => 'يرجى إدخال اسم الموظف',
            'name.min' => 'الاسم يجب ألا يقل عن 3 أحرف',
            'name.max' => 'الاسم يجب ألا يزيد عن 100 حرف',
            'email.required' => 'يرجى إدخال البريد الإلكتروني',
            'email.email' => 'يرجى إدخال بريد إلكتروني صحيح',
            'email.unique' => 'البيانات مستخدمة بالفعل',
            'mobile.required' => 'يرجى إدخال رقم الجوال',
            'mobile.regex' => 'رقم الجوال يجب أن يتكون من 10 أرقام ويبدأ بـ 05',
            'mobile.unique' => 'البيانات مستخدمة بالفعل',
            'role.required' => 'يرجى اختيار دور الموظف',
            'role.in' => 'الدور المحدد غير صالح',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $tempPassword = $request->input('temporary_password') ?? Str::random(10) . '@123';

        // 2. Create User in Central DB
        $user = User::create([
            'name' => $request->input('name'),
            'email' => $request->input('email'),
            'mobile' => $request->input('mobile'),
            'password' => Hash::make($tempPassword),
            'status' => 'active',
        ]);

        // 3. Link Employee to Company
        $company->users()->attach($user->id, [
            'role' => $request->input('role'),
            'is_primary_manager' => false,
        ]);

        // 4. Log Welcome Notification
        DB::connection('central')->table('notification_logs')->insert([
            'company_id' => $company->id,
            'channel' => 'email',
            'recipient' => $user->email,
            'subject' => "حسابكم في نظام شركة {$company->name}",
            'message' => "تم إنشاء حسابكم بدور {$request->input('role')}. كلمة المرور المؤقتة: {$tempPassword}",
            'status' => 'sent',
            'dispatched_at' => Carbon::now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم إضافة الموظف بنجاح',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'mobile' => $user->mobile,
                'role' => $request->input('role'),
                'status' => 'active',
                'temporary_password' => $tempPassword,
            ],
        ], 201);
    }

    /**
     * Edit employee data (UC-14)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $company = $this->getManagerCompany($request);

        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'غير مصرح لك بتعديل الموظف',
            ], 403);
        }

        $employee = $company->users()->where('users.id', $id)->first();

        if (!$employee) {
            return response()->json([
                'success' => false,
                'message' => 'الموظف غير موجود في شركتكم',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'min:3', 'max:100'],
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($id)],
            'mobile' => ['required', 'string', 'regex:/^05[0-9]{8}$/', Rule::unique('users', 'mobile')->ignore($id)],
            'role' => ['required', 'in:general_accountant,data_entry'],
        ], [
            'name.required' => 'يرجى إدخال اسم الموظف',
            'email.required' => 'يرجى إدخال البريد الإلكتروني',
            'email.email' => 'يرجى إدخال بريد إلكتروني صحيح',
            'email.unique' => 'البيانات مستخدمة بالفعل',
            'mobile.required' => 'يرجى إدخال رقم الجوال',
            'mobile.regex' => 'رقم الجوال يجب أن يتكون من 10 أرقام ويبدأ بـ 05',
            'mobile.unique' => 'البيانات مستخدمة بالفعل',
            'role.required' => 'يرجى اختيار دور الموظف',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $oldEmail = $employee->email;
        $oldMobile = $employee->mobile;

        $employee->name = $request->input('name');
        $employee->email = $request->input('email');
        $employee->mobile = $request->input('mobile');
        $employee->save();

        // Update role in pivot
        $company->users()->updateExistingPivot($id, [
            'role' => $request->input('role'),
        ]);

        // Business Rule: Notification when email or mobile changes
        if ($oldEmail !== $employee->email || $oldMobile !== $employee->mobile) {
            DB::connection('central')->table('notification_logs')->insert([
                'company_id' => $company->id,
                'channel' => 'email',
                'recipient' => $employee->email,
                'subject' => 'تحديث بيانات الحساب',
                'message' => 'تم تحديث بيانات حسابكم الوظيفي بنجاح من قبل مدير الشركة',
                'status' => 'sent',
                'dispatched_at' => Carbon::now(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث بيانات الموظف بنجاح',
            'data' => [
                'id' => $employee->id,
                'name' => $employee->name,
                'email' => $employee->email,
                'mobile' => $employee->mobile,
                'role' => $request->input('role'),
                'status' => $employee->status,
            ],
        ]);
    }

    /**
     * Activate / Deactivate employee with immediate session eviction (UC-15)
     */
    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $company = $this->getManagerCompany($request);

        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'غير مصرح لك بتغيير حالة الموظف',
            ], 403);
        }

        $employee = $company->users()->where('users.id', $id)->first();

        if (!$employee) {
            return response()->json([
                'success' => false,
                'message' => 'الموظف غير موجود في شركتكم',
            ], 404);
        }

        $newStatus = $employee->status === 'active' ? 'inactive' : 'active';
        $employee->status = $newStatus;
        $employee->save();

        // Critical Rule: If deactivated, terminate all active sessions immediately
        if ($newStatus === 'inactive') {
            $employee->tokens()->delete();
        }

        // Notification Log
        DB::connection('central')->table('notification_logs')->insert([
            'company_id' => $company->id,
            'channel' => 'email',
            'recipient' => $employee->email,
            'subject' => 'تغيير حالة الحساب',
            'message' => $newStatus === 'inactive' ? 'تم تعطيل حسابكم في النظام' : 'تم تفعيل حسابكم في النظام',
            'status' => 'sent',
            'dispatched_at' => Carbon::now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => $newStatus === 'inactive' ? 'تم تعطيل حساب الموظف وإنهاء جلسته فوراً' : 'تم تفعيل حساب الموظف بنجاح',
            'data' => [
                'id' => $employee->id,
                'status' => $newStatus,
            ],
        ]);
    }

    /**
     * Delete employee (blocked if approved accounting records exist per UC-12)
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $company = $this->getManagerCompany($request);

        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'غير مصرح لك بحذف الموظف',
            ], 403);
        }

        $employee = $company->users()->where('users.id', $id)->first();

        if (!$employee) {
            return response()->json([
                'success' => false,
                'message' => 'الموظف غير موجود في شركتكم',
            ], 404);
        }

        // Audit Rule: Check tenant database if this accountant has posted/created accounting entries
        $this->tenantManager->switchConnection($company);

        $hasVouchers = DB::connection('tenant')->table('vouchers')
            ->where('created_by', $id)
            ->orWhere('approved_by', $id)
            ->exists();

        $hasEntries = DB::connection('tenant')->table('journal_entries')
            ->where('created_by', $id)
            ->exists();

        $this->tenantManager->resetToCentral();

        if ($hasVouchers || $hasEntries) {
            return response()->json([
                'success' => false,
                'message' => 'لا يمكن حذف المحاسب لوجود قيود محاسبية مرتبطة به',
            ], 422);
        }

        // Detach employee from company
        $company->users()->detach($id);

        return response()->json([
            'success' => true,
            'message' => 'تم حذف الموظف من الشركة بنجاح',
        ]);
    }
}

