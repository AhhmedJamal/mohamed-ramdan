<?php

use App\Http\Controllers\Central\AdminDashboardController;
use App\Http\Controllers\Central\AuthController;
use App\Http\Controllers\Central\CompanyController;
use App\Http\Controllers\Central\EmployeeController;
use App\Http\Controllers\Central\PasswordResetController;
use App\Http\Controllers\Central\ProfileController;
use App\Http\Controllers\Tenant\AccountController;
use App\Http\Controllers\Tenant\ContractorInvoiceController;
use App\Http\Controllers\Tenant\CostCenterController;
use App\Http\Controllers\Tenant\FinancialReportController;
use App\Http\Controllers\Tenant\FiscalYearClosingController;
use App\Http\Controllers\Tenant\FiscalYearController;
use App\Http\Controllers\Tenant\JournalEntryController;
use App\Http\Controllers\Tenant\NotificationController;
use App\Http\Controllers\Tenant\PropertyController;
use App\Http\Controllers\Tenant\RentalContractController;
use App\Http\Controllers\Tenant\SupplierInvoiceController;
use App\Http\Controllers\Tenant\TenantMasterController;
use App\Http\Controllers\Tenant\VoucherController;
use App\Http\Controllers\Tenant\UnitController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'healthy',
        'system' => 'Mohamed Ramadan Group ERP',
        'version' => '1.0',
        'timestamp' => now()->toIso8601String(),
    ]);
});

// Authentication Routes (Central Context)
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [PasswordResetController::class, 'forgotPassword']);
    Route::post('/reset-password', [PasswordResetController::class, 'resetPassword']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

// Profile Management Routes (UC-05, UC-06)
Route::middleware('auth:sanctum')->prefix('profile')->group(function () {
    Route::get('/', [ProfileController::class, 'getProfile']);
    Route::put('/', [ProfileController::class, 'updateProfile']);
    Route::post('/change-password', [ProfileController::class, 'changePassword']);
});

// Branch Manager Employee Management Routes (UC-12, UC-13, UC-14, UC-15 - Section 1.6)
Route::middleware('auth:sanctum')->prefix('company')->group(function () {
    Route::get('/employees', [EmployeeController::class, 'index']);

    Route::middleware('role:branch_manager')->group(function () {
        Route::post('/employees', [EmployeeController::class, 'store']);
        Route::put('/employees/{id}', [EmployeeController::class, 'update']);
        Route::post('/employees/{id}/toggle-status', [EmployeeController::class, 'toggleStatus']);
        Route::delete('/employees/{id}', [EmployeeController::class, 'destroy']);
    });
});

// Super Admin Company & System Management Routes (UC-07 to UC-11 - Section 1.6)
Route::middleware(['auth:sanctum', 'super_admin'])->prefix('admin')->group(function () {
    Route::get('/dashboard/metrics', [AdminDashboardController::class, 'metrics']);
    Route::get('/metrics', [AdminDashboardController::class, 'metrics']); // Alias for frontend
    Route::get('/companies', [CompanyController::class, 'index']);
    Route::post('/companies', [CompanyController::class, 'store']);
    Route::post('/companies/{id}/toggle-status', [CompanyController::class, 'toggleStatus']);
    Route::post('/companies/{id}/freeze', [CompanyController::class, 'toggleStatus']); // Convenient action alias
    Route::post('/companies/{id}/unfreeze', [CompanyController::class, 'toggleStatus']);
    Route::post('/companies/{id}/assign-manager', [CompanyController::class, 'assignManager']);
});

// Tenant Metadata Route
Route::get('/tenant/info', function (Request $request) {
    /** @var \App\Models\Central\Company|null $company */
    $company = $request->attributes->get('current_company');

    if (!$company) {
        return response()->json([
            'success' => true,
            'is_tenant' => false,
            'connection' => DB::getDefaultConnection(),
            'message' => 'Central context active',
        ]);
    }

    $companyData = [
        'id' => $company->uuid,
        'name_ar' => $company->name,
        'name' => $company->name,
        'name_en' => $company->trade_activity,
        'subdomain' => $company->subdomain,
        'is_active' => $company->status === 'active',
        'status' => $company->status,
        'commercial_registration' => $company->tax_number,
        'database_name' => $company->db_name,
        'connection' => DB::getDefaultConnection(),
    ];

    return response()->json([
        'success' => true,
        'is_tenant' => true,
        'connection' => DB::getDefaultConnection(),
        'database' => config('database.connections.tenant.database'),
        'company' => [
            'id' => $company->id,
            'uuid' => $company->uuid,
            'name' => $company->name,
            'subdomain' => $company->subdomain,
            'status' => $company->status,
        ],
        'data' => $companyData,
    ]);
});

// Tenant Accounting & Financial Operations Routes (Epic 2-8 - Section 1.6 CRUD Matrix)
Route::middleware('auth:sanctum')->group(function () {

    // Chart of Accounts (COA) - General Accountant CRUD, others Read (UC-16 to UC-19)
    Route::get('/accounts', [AccountController::class, 'index']);
    Route::get('/accounts/{id}', [AccountController::class, 'show']);
    Route::middleware('role:general_accountant')->group(function () {
        Route::post('/accounts', [AccountController::class, 'store']);
        Route::put('/accounts/{id}', [AccountController::class, 'update']);
        Route::delete('/accounts/{id}', [AccountController::class, 'destroy']);
    });

    // Cost Centers - General Accountant CRUD, others Read (UC-19B to UC-23)
    Route::get('/cost-centers', [CostCenterController::class, 'index']);
    Route::get('/cost-centers/{id}', [CostCenterController::class, 'show']);
    Route::middleware('role:general_accountant')->group(function () {
        Route::post('/cost-centers', [CostCenterController::class, 'store']);
        Route::put('/cost-centers/{id}', [CostCenterController::class, 'update']);
        Route::delete('/cost-centers/{id}', [CostCenterController::class, 'destroy']);
        Route::post('/cost-centers/{id}/toggle-status', [CostCenterController::class, 'toggleStatus']);
        Route::post('/cost-centers/link-account', [CostCenterController::class, 'configureAccountLinking']);
    });

    // Fiscal Years & Periods - General Accountant CRUD, others Read (UC-24, UC-61)
    Route::get('/fiscal-years', [FiscalYearController::class, 'index']);
    Route::get('/fiscal-years/check-date', [FiscalYearController::class, 'checkDateLock']);
    Route::get('/fiscal-years/{id}', [FiscalYearController::class, 'show']);
    Route::get('/fiscal-years/{id}/closing-summary', [FiscalYearClosingController::class, 'getSummary']);
    Route::middleware('role:general_accountant')->group(function () {
        Route::post('/fiscal-years', [FiscalYearController::class, 'store']);
        Route::post('/fiscal-years/{id}/periods/{periodId}/toggle', [FiscalYearController::class, 'togglePeriodStatus']);
        Route::post('/fiscal-years/{id}/close', [FiscalYearClosingController::class, 'closeYear']);
    });

    // Properties & Real Estate Portfolio - Data Entry CRUD, others Read (UC-25 to UC-28)
    Route::get('/properties', [PropertyController::class, 'index']);
    Route::get('/properties/{id}', [PropertyController::class, 'show']);
    Route::middleware('role:data_entry')->group(function () {
        Route::post('/properties', [PropertyController::class, 'store']);
        Route::put('/properties/{id}', [PropertyController::class, 'update']);
        Route::delete('/properties/{id}', [PropertyController::class, 'destroy']);
    });

    // Property Units - Data Entry CRUD, others Read (UC-29 to UC-32)
    Route::get('/properties/{propertyId}/units', [UnitController::class, 'index']);
    Route::get('/properties/{propertyId}/units/{id}', [UnitController::class, 'show']);
    Route::middleware('role:data_entry')->group(function () {
        Route::post('/properties/{propertyId}/units', [UnitController::class, 'store']);
        Route::put('/properties/{propertyId}/units/{id}', [UnitController::class, 'update']);
        Route::delete('/properties/{propertyId}/units/{id}', [UnitController::class, 'destroy']);
    });

    // Tenants Master Registry - Data Entry CRUD, others Read (UC-33 to UC-36)
    Route::get('/tenants', [TenantMasterController::class, 'index']);
    Route::get('/tenants/{id}', [TenantMasterController::class, 'show']);
    Route::middleware('role:data_entry')->group(function () {
        Route::post('/tenants', [TenantMasterController::class, 'store']);
        Route::put('/tenants/{id}', [TenantMasterController::class, 'update']);
        Route::delete('/tenants/{id}', [TenantMasterController::class, 'destroy']);
    });

    // Rental Contracts Management - Data Entry Create/Update, Branch Manager Approve Cancellation (UC-37 to UC-42)
    Route::get('/contracts', [RentalContractController::class, 'index']);
    Route::get('/contracts/{id}', [RentalContractController::class, 'show']);
    Route::middleware('role:data_entry')->group(function () {
        Route::post('/contracts', [RentalContractController::class, 'store']);
        Route::put('/contracts/{id}', [RentalContractController::class, 'update']);
        Route::post('/contracts/{id}/request-cancellation', [RentalContractController::class, 'requestCancellation']);
        Route::post('/contracts/{id}/attachments', [RentalContractController::class, 'uploadAttachment']);
        Route::delete('/contracts/{id}/attachments/{attachmentId}', [RentalContractController::class, 'deleteAttachment']);
    });
    Route::middleware('role:branch_manager')->group(function () {
        Route::post('/contracts/{id}/approve-cancellation', [RentalContractController::class, 'approveCancellation']);
        Route::post('/contracts/{id}/reject-cancellation', [RentalContractController::class, 'rejectCancellation']);
    });

    // Financial Vouchers (Maker-Checker: Data Entry creates, General Accountant approves/rejects) (UC-43 to UC-48)
    Route::get('/vouchers', [VoucherController::class, 'index']);
    Route::get('/vouchers/{id}', [VoucherController::class, 'show']);
    Route::middleware('role:data_entry')->group(function () {
        Route::post('/vouchers/receipt', [VoucherController::class, 'storeReceipt']);
        Route::post('/vouchers/disbursement', [VoucherController::class, 'storeDisbursement']);
        Route::post('/vouchers', [VoucherController::class, 'storeReceipt']); // Generic helper
        Route::put('/vouchers/{id}', [VoucherController::class, 'update']);
    });
    Route::middleware('role:general_accountant')->group(function () {
        Route::post('/vouchers/{id}/approve', [VoucherController::class, 'approve']);
        Route::post('/vouchers/{id}/reject', [VoucherController::class, 'reject']);
    });

    // General Ledger & Balanced Journal Entries - General Accountant Create/Post, others Read (UC-49 to UC-51)
    Route::get('/journal-entries', [JournalEntryController::class, 'index']);
    Route::get('/journal-entries/{id}', [JournalEntryController::class, 'show']);
    Route::middleware('role:general_accountant')->group(function () {
        Route::post('/journal-entries', [JournalEntryController::class, 'store']);
        Route::delete('/journal-entries/{id}', [JournalEntryController::class, 'destroy']);
    });

    // Contractor Progress Billing - Data Entry drafts, General Accountant approves (UC-52 to UC-54)
    Route::get('/contractor-invoices', [ContractorInvoiceController::class, 'index']);
    Route::get('/contractor-invoices/{id}', [ContractorInvoiceController::class, 'show']);
    Route::middleware('role:data_entry')->group(function () {
        Route::post('/contractor-invoices', [ContractorInvoiceController::class, 'store']);
    });
    Route::middleware('role:general_accountant')->group(function () {
        Route::post('/contractor-invoices/{id}/approve', [ContractorInvoiceController::class, 'approve']);
    });

    // Supplier Invoices - Data Entry drafts, General Accountant approves (UC-55)
    Route::get('/supplier-invoices', [SupplierInvoiceController::class, 'index']);
    Route::middleware('role:data_entry')->group(function () {
        Route::post('/supplier-invoices', [SupplierInvoiceController::class, 'store']);
    });
    Route::middleware('role:general_accountant')->group(function () {
        Route::post('/supplier-invoices/{id}/approve', [SupplierInvoiceController::class, 'approve']);
    });

    // Comprehensive Financial Reports - General Accountant CRUD, Branch Manager Read, Data Entry blocked (UC-56 to UC-60)
    Route::middleware('role:general_accountant,branch_manager')->group(function () {
        Route::get('/reports/trial-balance', [FinancialReportController::class, 'trialBalance']);
        Route::get('/reports/general-ledger', [FinancialReportController::class, 'generalLedger']);
        Route::get('/reports/balance-sheet', [FinancialReportController::class, 'balanceSheet']);
        Route::get('/reports/income-statement', [FinancialReportController::class, 'incomeStatement']);
        Route::get('/reports/building-income-statement', [FinancialReportController::class, 'buildingIncomeStatement']);
        Route::get('/reports/building-income', [FinancialReportController::class, 'buildingIncomeStatement']); // Alias
        Route::get('/reports/export', [FinancialReportController::class, 'export']);
    });

    // In-App Notifications (UC-66 to UC-68)
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
});
