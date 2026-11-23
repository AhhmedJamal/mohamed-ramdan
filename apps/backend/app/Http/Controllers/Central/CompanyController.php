<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\Company;
use App\Models\Central\User;
use App\Services\TenantManager;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class CompanyController extends Controller
{
    protected TenantManager $tenantManager;

    public function __construct(TenantManager $tenantManager)
    {
        $this->tenantManager = $tenantManager;
    }

    /**
     * List all companies (UC-08)
     */
    public function index(Request $request): JsonResponse
    {
        $query = Company::query();

        // Search by name
        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        // Filter by status (all, active, frozen)
        if ($status = $request->query('status')) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        }

        $companies = $query->with(['users' => function ($q) {
            $q->wherePivot('is_primary_manager', true);
        }])->latest()->get();

        $data = $companies->map(function ($company) {
            $manager = $company->users->first();
            return [
                'id' => $company->id,
                'uuid' => $company->uuid,
                'name' => $company->name,
                'trade_activity' => $company->trade_activity,
                'address' => $company->address,
                'country' => $company->country,
                'city' => $company->city,
                'tax_number' => $company->tax_number,
                'subdomain' => $company->subdomain,
                'db_name' => $company->db_name,
                'status' => $company->status,
                'manager' => $manager ? [
                    'id' => $manager->id,
                    'name' => $manager->name,
                    'email' => $manager->email,
                    'mobile' => $manager->mobile,
                ] : null,
                'created_at' => $company->created_at->format('Y-m-d H:i'),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Create new company and provision isolated database (UC-07)
     */
    public function store(Request $request): JsonResponse
    {
        // Support field aliases for flexible client integration
        $data = $request->all();
        if (isset($data['activity']) && !isset($data['trade_activity'])) {
            $data['trade_activity'] = $data['activity'];
        }
        if (isset($data['detailed_address']) && !isset($data['address'])) {
            $data['address'] = $data['detailed_address'];
        }
        if (isset($data['manager_password']) && !isset($data['temporary_password'])) {
            $data['temporary_password'] = $data['manager_password'];
        }
        if (isset($data['manager_phone']) && !isset($data['manager_mobile'])) {
            $data['manager_mobile'] = $data['manager_phone'];
        }
        $request->merge($data);

        // 1. Validation per SRS UC-07
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'min:3', 'max:100', 'unique:companies,name'],
            'trade_activity' => ['required', 'string'],
            'address' => ['required', 'string'],
            'country' => ['required', 'string'],
            'city' => ['required', 'string'],
            'tax_number' => ['nullable', 'string'],
            'subdomain' => ['required', 'string', 'regex:/^[a-z0-9_-]+$/', 'unique:companies,subdomain'],
            'manager_name' => ['nullable', 'string', 'min:3', 'max:100'],
            'manager_email' => ['nullable', 'email', 'unique:users,email'],
            'manager_mobile' => ['nullable', 'string', 'regex:/^05[0-9]{8}$/', 'unique:users,mobile'],
            'temporary_password' => ['nullable', 'string', 'min:8', 'max:25'],
        ], [
            'name.required' => 'يرجى إدخال اسم الشركة',
            'name.unique' => 'اسم الشركة مستخدم بالفعل',
            'name.min' => 'اسم الشركة يجب ألا يقل عن 3 أحرف',
            'name.max' => 'اسم الشركة يجب ألا يزيد عن 100 حرف',
            'trade_activity.required' => 'يرجى إدخال النشاط التجاري',
            'address.required' => 'يرجى إدخال العنوان',
            'country.required' => 'يرجى اختيار الدولة',
            'city.required' => 'يرجى اختيار المدينة',
            'subdomain.required' => 'يرجى تحديد النطاق الفرعي',
            'subdomain.unique' => 'اسم الشركة مستخدم بالفعل',
            'subdomain.regex' => 'النطاق الفرعي يجب أن يحتوي على أحرف إنجليزية وأرقام فقط',
            'manager_email.email' => 'صيغة البريد الإلكتروني غير صحيحة',
            'manager_email.unique' => 'البيانات مستخدمة بالفعل',
            'manager_mobile.regex' => 'البيانات مستخدمة بالفعل',
            'manager_mobile.unique' => 'البيانات مستخدمة بالفعل',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        DB::connection('central')->beginTransaction();

        try {
            $subdomain = strtolower(trim($request->input('subdomain')));
            $tempPassword = $request->input('temporary_password') ?? Str::random(10) . '@123';

            // 2. Create Company Record in Central DB
            $company = Company::create([
                'uuid' => (string) Str::uuid(),
                'name' => $request->input('name'),
                'trade_activity' => $request->input('trade_activity'),
                'address' => $request->input('address'),
                'country' => $request->input('country'),
                'city' => $request->input('city'),
                'tax_number' => $request->input('tax_number'),
                'subdomain' => $subdomain,
                'db_name' => "tenant_{$subdomain}_db",
                'status' => 'active',
            ]);

            // 3. Create or Link Branch Manager User (UC-07)
            $mgrName = $request->input('manager_name') ?: ('مدير ' . $company->name);
            $mgrEmail = $request->input('manager_email') ?: ("manager_{$subdomain}@ramadan-group.com");
            $mgrMobile = $request->input('manager_mobile') ?: ('05' . rand(10000000, 99999999));

            $manager = User::where('email', $mgrEmail)->first();
            if (!$manager) {
                $manager = User::create([
                    'name' => $mgrName,
                    'email' => $mgrEmail,
                    'mobile' => $mgrMobile,
                    'password' => Hash::make($tempPassword),
                    'status' => 'active',
                ]);
            }

            // Link Manager in company_user
            $company->users()->syncWithoutDetaching([
                $manager->id => [
                    'role' => 'branch_manager',
                    'is_primary_manager' => true,
                ],
            ]);

            // 4. Provision Tenant Isolated Database & Seed 12 Root Accounts
            $this->tenantManager->provisionTenantDatabase($company);

            // 5. Log Notification in Central DB
            DB::connection('central')->table('notification_logs')->insert([
                'company_id' => $company->id,
                'channel' => 'email',
                'recipient' => $manager->email,
                'subject' => 'بيانات الدخول لفرع الشركة الجديد',
                'message' => "تم إنشاء الشركة {$company->name} بنجاح. كلمة المرور المؤقتة صالحة لمدة 24 ساعة.",
                'status' => 'sent',
                'dispatched_at' => Carbon::now(),
            ]);

            DB::connection('central')->commit();

            return response()->json([
                'success' => true,
                'message' => 'تم إنشاء الشركة بنجاح وتأسيس قاعدة البيانات المعزولة',
                'data' => [
                    'id' => $company->id,
                    'uuid' => $company->uuid,
                    'name' => $company->name,
                    'subdomain' => $company->subdomain,
                    'db_name' => $company->db_name,
                    'manager' => [
                        'id' => $manager->id,
                        'name' => $manager->name,
                        'email' => $manager->email,
                        'mobile' => $manager->mobile,
                        'temporary_password' => $tempPassword,
                    ],
                ],
            ], 201);
        } catch (Exception $e) {
            DB::connection('central')->rollBack();

            return response()->json([
                'success' => false,
                'message' => 'حدث خطأ أثناء إنشاء الشركة، يرجى المحاولة مرة أخرى',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Freeze / Activate Company with Immediate Session Eviction (UC-09)
     */
    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $company = Company::find($id);

        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'الشركة غير موجودة في النظام',
            ], 404);
        }

        $newStatus = $company->status === 'active' ? 'frozen' : 'active';
        $company->status = $newStatus;
        $company->save();

        // Critical Rule: If freezing, terminate active sessions of all company employees immediately
        if ($newStatus === 'frozen') {
            $companyUsers = $company->users()->wherePivot('role', '!=', 'super_admin')->get();
            foreach ($companyUsers as $user) {
                $user->tokens()->delete();
            }

            return response()->json([
                'success' => true,
                'message' => 'تم تجميد الشركة بنجاح وتم إنهاء جميع جلسات موظفيها فوراً',
                'data' => [
                    'id' => $company->id,
                    'status' => 'frozen',
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'تم تفعيل الشركة بنجاح',
            'data' => [
                'id' => $company->id,
                'status' => 'active',
            ],
        ]);
    }

    /**
     * Assign or Change Branch Manager (UC-10)
     */
    public function assignManager(Request $request, int $id): JsonResponse
    {
        $company = Company::find($id);

        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'الشركة غير موجودة في النظام',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'manager_name' => ['required', 'string', 'min:3', 'max:100'],
            'manager_email' => ['required', 'email'],
            'manager_mobile' => ['required', 'string', 'regex:/^05[0-9]{8}$/'],
            'temporary_password' => ['nullable', 'string', 'min:8'],
        ], [
            'manager_name.required' => 'يرجى إدخال اسم المدير',
            'manager_email.required' => 'يرجى إدخال بريد المدير',
            'manager_email.email' => 'صيغة البريد الإلكتروني غير صحيحة',
            'manager_mobile.required' => 'يرجى إدخال رقم جوال المدير',
            'manager_mobile.regex' => 'رقم الجوال يجب أن يتكون من 10 أرقام ويبدأ بـ 05',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $email = $request->input('manager_email');
        $mobile = $request->input('manager_mobile');
        $name = $request->input('manager_name');
        $tempPassword = $request->input('temporary_password') ?? 'Manager@' . rand(1000, 9999);

        // Check if user already exists or create new
        $manager = User::where('email', $email)->first();

        if ($manager) {
            $manager->update([
                'name' => $name,
                'mobile' => $mobile,
            ]);
        } else {
            $manager = User::create([
                'name' => $name,
                'email' => $email,
                'mobile' => $mobile,
                'password' => Hash::make($tempPassword),
                'status' => 'active',
            ]);
        }

        // Unset previous primary manager for this company
        DB::connection('central')->table('company_user')
            ->where('company_id', $company->id)
            ->update(['is_primary_manager' => false]);

        // Attach or update manager as primary
        $company->users()->syncWithoutDetaching([
            $manager->id => [
                'role' => 'branch_manager',
                'is_primary_manager' => true,
            ],
        ]);

        // Log notification to central DB
        DB::connection('central')->table('notification_logs')->insert([
            'company_id' => $company->id,
            'channel' => 'email',
            'recipient' => $email,
            'subject' => "تم تعيينكم مديراً لشركة {$company->name}",
            'message' => "تم تعيينكم مديراً لشركة {$company->name}. كلمة المرور المؤقتة صالحة لمدة 24 ساعة.",
            'status' => 'sent',
            'dispatched_at' => Carbon::now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم تعيين مدير الشركة بنجاح',
            'data' => [
                'company_id' => $company->id,
                'manager' => [
                    'id' => $manager->id,
                    'name' => $manager->name,
                    'email' => $manager->email,
                    'mobile' => $manager->mobile,
                    'temporary_password' => $tempPassword,
                ],
            ],
        ]);
    }
}
