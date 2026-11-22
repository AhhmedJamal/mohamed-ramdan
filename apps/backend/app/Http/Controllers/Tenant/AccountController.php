<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class AccountController extends Controller
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
     * List Chart of Accounts (hierarchical tree and flat list)
     * UC-16
     */
    public function index(Request $request): JsonResponse
    {
        $accounts = Account::with(['allowedCostCenters', 'parent'])
            ->orderBy('code', 'asc')
            ->get();

        if ($accounts->isEmpty()) {
            return response()->json([
                'message' => 'لم يتم إنشاء حسابات بعد',
                'tree' => [],
                'flat' => [],
            ], 200);
        }

        // Attach current calculated balance and arabic labels
        $enriched = $accounts->map(function ($account) {
            $data = $account->toArray();
            $data['current_balance'] = $account->calculateBalance();
            $data['nature_label'] = $account->nature === 'debit' ? 'مدين' : 'دائن';
            $data['root_arabic'] = Account::$rootArabicNames[$account->root_type] ?? $account->root_type;
            return $data;
        });

        // Build hierarchical tree
        $tree = $this->buildTree($enriched);

        return response()->json([
            'tree' => $tree,
            'flat' => $enriched,
        ], 200);
    }

    /**
     * Recursively nest accounts by parent_id
     */
    protected function buildTree($accounts, $parentId = null): array
    {
        $branch = [];

        foreach ($accounts as $account) {
            if ($account['parent_id'] == $parentId) {
                $children = $this->buildTree($accounts, $account['id']);
                if (!empty($children)) {
                    $account['children'] = $children;
                } else {
                    $account['children'] = [];
                }
                $branch[] = $account;
            }
        }

        return $branch;
    }

    /**
     * Get single account details
     */
    public function show($id): JsonResponse
    {
        $account = Account::with(['parent', 'children', 'allowedCostCenters'])->find($id);

        if (!$account) {
            return response()->json(['message' => 'الحساب غير موجود'], 404);
        }

        $data = $account->toArray();
        $data['current_balance'] = $account->calculateBalance();
        $data['nature_label'] = $account->nature === 'debit' ? 'مدين' : 'دائن';
        $data['root_arabic'] = Account::$rootArabicNames[$account->root_type] ?? $account->root_type;

        return response()->json($data, 200);
    }

    /**
     * Create new sub-account with recursive nature inheritance
     * UC-17
     */
    public function store(Request $request): JsonResponse
    {
        if (!$this->authorizeAccountant($request)) {
            return response()->json(['message' => 'غير مصرح لك بإضافة حسابات'], 403);
        }

        // Fixed roots cannot be added dynamically
        if ($request->input('account_type') === 'root') {
            return response()->json(['message' => 'الحسابات الرئيسية ثابتة ولا يمكن إضافتها'], 422);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:3|max:100',
            'root_type' => 'required|in:' . implode(',', array_keys(Account::$rootNatures)),
            'parent_id' => 'nullable|integer',
            'opening_date' => 'nullable|date',
            'opening_balance' => 'nullable|numeric|min:0',
            'code' => 'nullable|string|max:20',
            // Asset depreciation fields
            'depreciation_method' => 'nullable|in:straight_line,declining_balance',
            'purchase_price' => 'nullable|numeric|min:0',
            'depreciation_rate' => 'nullable|numeric|min:0|max:100',
            'useful_life_years' => 'nullable|integer|min:1',
            'scrap_value' => 'nullable|numeric|min:0',
        ], [
            'name.required' => 'اسم الحساب إلزامي',
            'name.min' => 'اسم الحساب يجب أن يكون بين 3 و100 حرف',
            'name.max' => 'اسم الحساب يجب أن يكون بين 3 و100 حرف',
            'root_type.required' => 'الحساب الرئيسي إلزامي',
            'opening_balance.min' => 'الرصيد الافتتاحي لا يمكن أن يقل عن 0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check unique name in tenant DB
        $nameExists = Account::where('name', $request->name)->exists();
        if ($nameExists) {
            return response()->json(['message' => 'اسم الحساب مستخدم بالفعل'], 422);
        }

        // Resolve parent and inherit root_type and nature
        $parentId = $request->parent_id;
        $parent = null;

        if ($parentId) {
            $parent = Account::find($parentId);
            if (!$parent) {
                return response()->json(['message' => 'الحساب الأب غير موجود'], 422);
            }
            $rootType = $parent->root_type;
            $nature = Account::$rootNatures[$rootType] ?? $parent->nature;
        } else {
            // Find root account matching root_type
            $rootAccount = Account::where('root_type', $request->root_type)->where('is_fixed_root', true)->first();
            if ($rootAccount) {
                $parentId = $rootAccount->id;
                $parent = $rootAccount;
                $rootType = $rootAccount->root_type;
                $nature = Account::$rootNatures[$rootType];
            } else {
                $rootType = $request->root_type;
                $nature = Account::$rootNatures[$rootType];
            }
        }

        // Generate account code if not provided
        $code = $request->code;
        if (empty($code)) {
            $code = $this->generateAccountCode($parent, $rootType);
        } else {
            $codeExists = Account::where('code', $code)->exists();
            if ($codeExists) {
                return response()->json(['message' => 'كود الحساب مستخدم بالفعل'], 422);
            }
        }

        // Create account
        $account = Account::create([
            'code' => $code,
            'name' => $request->name,
            'root_type' => $rootType,
            'nature' => $nature,
            'account_type' => 'sub',
            'parent_id' => $parentId,
            'is_cost_center_mandatory' => $request->boolean('is_cost_center_mandatory', false),
            'opening_balance' => $request->input('opening_balance', 0.0000),
            'opening_date' => $request->input('opening_date', now()->toDateString()),
            'depreciation_method' => $rootType === 'assets' ? $request->depreciation_method : null,
            'purchase_price' => $rootType === 'assets' ? $request->purchase_price : null,
            'depreciation_rate' => $rootType === 'assets' ? $request->depreciation_rate : null,
            'useful_life_years' => $rootType === 'assets' ? $request->useful_life_years : null,
            'scrap_value' => $rootType === 'assets' ? $request->scrap_value : null,
            'is_fixed_root' => false,
        ]);

        return response()->json([
            'message' => 'تم إنشاء الحساب بنجاح',
            'account' => $account,
        ], 201);
    }

    /**
     * Update account
     * UC-18
     */
    public function update(Request $request, $id): JsonResponse
    {
        if (!$this->authorizeAccountant($request)) {
            return response()->json(['message' => 'غير مصرح لك بتعديل شجرة الحسابات'], 403);
        }

        $account = Account::find($id);
        if (!$account) {
            return response()->json(['message' => 'الحساب غير موجود'], 404);
        }

        // Fixed root accounts cannot be renamed or re-classified
        if ($account->is_fixed_root) {
            return response()->json(['message' => 'لا يمكن تعديل الحسابات الرئيسية الثابتة'], 422);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:3|max:100',
            'is_cost_center_mandatory' => 'nullable|boolean',
            'depreciation_method' => 'nullable|in:straight_line,declining_balance',
            'purchase_price' => 'nullable|numeric|min:0',
            'depreciation_rate' => 'nullable|numeric|min:0|max:100',
            'useful_life_years' => 'nullable|integer|min:1',
            'scrap_value' => 'nullable|numeric|min:0',
        ], [
            'name.required' => 'اسم الحساب إلزامي',
            'name.min' => 'اسم الحساب يجب أن يكون بين 3 و100 حرف',
            'name.max' => 'اسم الحساب يجب أن يكون بين 3 و100 حرف',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check unique name excluding self
        $nameExists = Account::where('name', $request->name)->where('id', '!=', $id)->exists();
        if ($nameExists) {
            return response()->json(['message' => 'اسم الحساب مستخدم بالفعل'], 422);
        }

        // Check if nature modification is attempted and posted entries exist
        if ($request->has('nature') && $request->nature !== $account->nature) {
            $hasPosted = DB::connection('tenant')->table('journal_entry_items')
                ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_items.journal_entry_id')
                ->where('journal_entries.status', 'posted')
                ->where('journal_entry_items.account_id', $account->id)
                ->exists();

            if ($hasPosted) {
                return response()->json(['message' => 'لا يمكن تغيير طبيعة الحساب لوجود قيود مرحّلة مرتبطة به'], 422);
            }
        }

        $account->name = $request->name;

        if ($request->has('is_cost_center_mandatory')) {
            $account->is_cost_center_mandatory = $request->boolean('is_cost_center_mandatory');
        }

        if ($account->root_type === 'assets') {
            $account->depreciation_method = $request->input('depreciation_method', $account->depreciation_method);
            $account->purchase_price = $request->input('purchase_price', $account->purchase_price);
            $account->depreciation_rate = $request->input('depreciation_rate', $account->depreciation_rate);
            $account->useful_life_years = $request->input('useful_life_years', $account->useful_life_years);
            $account->scrap_value = $request->input('scrap_value', $account->scrap_value);
        }

        $account->save();

        return response()->json([
            'message' => 'تم تحديث الحساب بنجاح',
            'account' => $account,
        ], 200);
    }

    /**
     * Delete account
     * UC-19
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        if (!$this->authorizeAccountant($request)) {
            return response()->json(['message' => 'غير مصرح لك بحذف حسابات'], 403);
        }

        $account = Account::find($id);
        if (!$account) {
            return response()->json(['message' => 'الحساب غير موجود'], 404);
        }

        // Check 1: Fixed root accounts cannot be deleted (Alternative 2)
        if ($account->is_fixed_root) {
            return response()->json(['message' => 'لا يمكن حذف الحساب الرئيسي'], 422);
        }

        // Check 2: Account has sub-accounts
        $hasChildren = Account::where('parent_id', $account->id)->exists();
        if ($hasChildren) {
            return response()->json(['message' => 'لا يمكن حذف حساب لديه حسابات فرعية'], 422);
        }

        // Check 3: Account has linked journal entries or vouchers (Alternative 1)
        $hasJournalEntries = DB::connection('tenant')->table('journal_entry_items')
            ->where('account_id', $account->id)
            ->exists();

        $hasVouchers = DB::connection('tenant')->table('vouchers')
            ->where('debit_account_id', $account->id)
            ->orWhere('credit_account_id', $account->id)
            ->exists();

        if ($hasJournalEntries || $hasVouchers) {
            return response()->json(['message' => 'لا يمكن حذف الحساب لوجود قيود مرتبطة به'], 422);
        }

        $account->delete();

        return response()->json(['message' => 'تم حذف الحساب بنجاح'], 200);
    }

    /**
     * Helper to generate a sequential hierarchical account code
     */
    protected function generateAccountCode(?Account $parent, string $rootType): string
    {
        if ($parent) {
            $prefix = $parent->code;
            $seq = 1;
            do {
                $candidate = $prefix . str_pad((string) $seq, 2, '0', STR_PAD_LEFT);
                $seq++;
            } while (Account::where('code', $candidate)->exists());

            return $candidate;
        }

        // Fallback root prefix
        $rootPrefixes = [
            'assets' => '1', 'liabilities' => '2', 'equity' => '3',
            'expenses' => '4', 'revenues' => '5', 'purchases' => '6',
            'sales' => '7', 'purchase_returns' => '8', 'sales_returns' => '9',
            'withdrawals' => '31', 'discounts_allowed' => '41', 'discounts_earned' => '51',
        ];

        $prefix = $rootPrefixes[$rootType] ?? '1';
        $seq = 1;
        do {
            $candidate = $prefix . str_pad((string) $seq, 3, '0', STR_PAD_LEFT);
            $seq++;
        } while (Account::where('code', $candidate)->exists());

        return $candidate;
    }
}
