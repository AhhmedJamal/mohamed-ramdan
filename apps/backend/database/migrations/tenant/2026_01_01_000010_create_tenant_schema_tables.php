<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Chart of Accounts (COA)
        Schema::connection('tenant')->create('accounts', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->string('name', 100);
            $table->enum('root_type', [
                'assets', 'liabilities', 'equity', 'expenses', 'revenues',
                'purchases', 'sales', 'purchase_returns', 'sales_returns',
                'withdrawals', 'discounts_allowed', 'discounts_earned'
            ]);
            $table->enum('nature', ['debit', 'credit']);
            $table->enum('account_type', ['root', 'sub'])->default('sub');
            $table->foreignId('parent_id')->nullable()->constrained('accounts')->restrictOnDelete();
            $table->boolean('is_cost_center_mandatory')->default(false);
            $table->decimal('opening_balance', 15, 4)->default(0.0000);
            $table->enum('depreciation_method', ['straight_line', 'declining_balance'])->nullable();
            $table->decimal('purchase_price', 15, 4)->nullable();
            $table->decimal('depreciation_rate', 5, 2)->nullable();
            $table->integer('useful_life_years')->nullable();
            $table->decimal('scrap_value', 15, 4)->nullable();
            $table->boolean('is_fixed_root')->default(false);
            $table->timestamps();
        });

        // 2. Cost Centers
        Schema::connection('tenant')->create('cost_centers', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->string('name', 100)->unique();
            $table->enum('type', ['property', 'contracting_project']);
            $table->text('description')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
        });

        // 3. Fiscal Years & Periods
        Schema::connection('tenant')->create('fiscal_years', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
        });

        Schema::connection('tenant')->create('fiscal_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->cascadeOnDelete();
            $table->integer('period_number');
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->timestamps();
        });

        // 4. Properties & Units
        Schema::connection('tenant')->create('properties', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('address', 255);
            $table->enum('type', ['residential', 'commercial', 'mixed']);
            $table->unsignedInteger('units_count');
            $table->foreignId('cost_center_id')->constrained('cost_centers')->restrictOnDelete();
            $table->timestamps();
        });

        Schema::connection('tenant')->create('units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained('properties')->cascadeOnDelete();
            $table->string('unit_number', 50);
            $table->enum('type', ['apartment', 'shop', 'office', 'warehouse']);
            $table->decimal('area_sqm', 8, 2)->nullable();
            $table->enum('status', ['vacant', 'occupied', 'under_maintenance'])->default('vacant');
            $table->timestamps();

            $table->unique(['property_id', 'unit_number']);
        });

        // 5. Tenants Master
        Schema::connection('tenant')->create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->enum('type', ['individual', 'company']);
            $table->string('national_id_or_cr', 50)->unique();
            $table->string('mobile', 15);
            $table->string('email', 100)->unique();
            $table->string('address', 255)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 6. Rental Contracts & Installments
        Schema::connection('tenant')->create('rental_contracts', function (Blueprint $table) {
            $table->id();
            $table->string('contract_number', 50)->unique();
            $table->foreignId('tenant_id')->constrained('tenants');
            $table->foreignId('property_id')->constrained('properties');
            $table->foreignId('unit_id')->constrained('units');
            $table->enum('contract_type', ['owner_to_company', 'company_to_tenant']);
            $table->date('start_date');
            $table->date('end_date');
            $table->unsignedInteger('duration_months');
            $table->decimal('total_rent', 15, 4);
            $table->enum('collection_cycle', ['monthly', 'quarterly', 'semi_annual', 'annual']);
            $table->decimal('first_payment', 15, 4)->default(0.0000);
            $table->enum('status', ['active', 'overdue', 'expired', 'pending_cancellation', 'cancelled'])->default('active');
            $table->text('cancellation_reason')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->timestamps();
        });

        Schema::connection('tenant')->create('installments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contract_id')->constrained('rental_contracts')->cascadeOnDelete();
            $table->integer('installment_number');
            $table->date('due_date');
            $table->decimal('amount', 15, 4);
            $table->decimal('paid_amount', 15, 4)->default(0.0000);
            $table->enum('status', ['due', 'paid', 'overdue', 'cancelled'])->default('due');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });

        // 7. Vouchers (Maker-Checker)
        Schema::connection('tenant')->create('vouchers', function (Blueprint $table) {
            $table->id();
            $table->string('voucher_number', 50)->unique();
            $table->enum('type', ['receipt', 'disbursement']);
            $table->foreignId('contract_id')->nullable()->constrained('rental_contracts');
            $table->foreignId('installment_id')->nullable()->constrained('installments');
            $table->enum('expense_type', ['maintenance', 'electricity', 'water', 'rent', 'salaries', 'other'])->nullable();
            $table->decimal('amount', 15, 4);
            $table->date('date');
            $table->foreignId('cost_center_id')->constrained('cost_centers');
            $table->foreignId('debit_account_id')->constrained('accounts');
            $table->foreignId('credit_account_id')->constrained('accounts');
            $table->enum('payment_method', ['cash', 'bank_transfer', 'cheque']);
            $table->enum('status', ['draft', 'approved', 'rejected'])->default('draft');
            $table->string('rejection_reason', 500)->nullable();
            $table->unsignedBigInteger('created_by');
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->unsignedBigInteger('journal_entry_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 8. General Ledger & Journal Entries
        Schema::connection('tenant')->create('journal_entries', function (Blueprint $table) {
            $table->id();
            $table->string('entry_number', 50)->unique();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years');
            $table->date('date');
            $table->string('explanation', 500);
            $table->decimal('total_debit', 15, 4);
            $table->decimal('total_credit', 15, 4);
            $table->enum('status', ['draft', 'approved', 'posted'])->default('draft');
            $table->foreignId('voucher_id')->nullable()->constrained('vouchers');
            $table->unsignedBigInteger('created_by');
            $table->timestamp('posted_at')->nullable();
            $table->timestamps();
        });

        Schema::connection('tenant')->create('journal_entry_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('journal_entry_id')->constrained('journal_entries')->cascadeOnDelete();
            $table->foreignId('account_id')->constrained('accounts');
            $table->foreignId('cost_center_id')->nullable()->constrained('cost_centers');
            $table->decimal('debit', 15, 4)->default(0.0000);
            $table->decimal('credit', 15, 4)->default(0.0000);
            $table->foreignId('counter_account_id')->nullable()->constrained('accounts');
            $table->string('counter_account_name', 100)->nullable();
            $table->string('line_note', 255)->nullable();
            $table->timestamps();
        });

        // 9. Contracting Progress Billings
        Schema::connection('tenant')->create('contractor_invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number', 50)->unique();
            $table->string('contractor_name', 100);
            $table->foreignId('cost_center_id')->constrained('cost_centers');
            $table->date('date');
            $table->decimal('gross_total', 15, 4);
            $table->decimal('tax_amount', 15, 4)->default(0.0000);
            $table->decimal('grand_total', 15, 4);
            $table->decimal('paid_amount', 15, 4)->default(0.0000);
            $table->enum('status', ['draft', 'approved', 'partially_paid', 'fully_paid'])->default('draft');
            $table->unsignedBigInteger('created_by');
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamps();
        });

        // 10. Supplier Purchase Invoices
        Schema::connection('tenant')->create('supplier_invoices', function (Blueprint $table) {
            $table->id();
            $table->string('supplier_name', 100);
            $table->string('invoice_number', 50)->unique();
            $table->date('date');
            $table->foreignId('cost_center_id')->constrained('cost_centers');
            $table->decimal('gross_amount', 15, 4);
            $table->decimal('discount_earned', 15, 4)->default(0.0000);
            $table->decimal('net_amount', 15, 4);
            $table->enum('tax_type', ['vat', 'excise'])->default('vat');
            $table->decimal('tax_amount', 15, 4)->default(0.0000);
            $table->decimal('total_payable', 15, 4);
            $table->enum('payment_terms', ['cash', 'credit'])->default('cash');
            $table->foreignId('counter_account_id')->nullable()->constrained('accounts');
            $table->enum('status', ['draft', 'approved'])->default('draft');
            $table->unsignedBigInteger('created_by');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('supplier_invoices');
        Schema::connection('tenant')->dropIfExists('contractor_invoices');
        Schema::connection('tenant')->dropIfExists('journal_entry_items');
        Schema::connection('tenant')->dropIfExists('journal_entries');
        Schema::connection('tenant')->dropIfExists('vouchers');
        Schema::connection('tenant')->dropIfExists('installments');
        Schema::connection('tenant')->dropIfExists('rental_contracts');
        Schema::connection('tenant')->dropIfExists('tenants');
        Schema::connection('tenant')->dropIfExists('units');
        Schema::connection('tenant')->dropIfExists('properties');
        Schema::connection('tenant')->dropIfExists('fiscal_periods');
        Schema::connection('tenant')->dropIfExists('fiscal_years');
        Schema::connection('tenant')->dropIfExists('cost_centers');
        Schema::connection('tenant')->dropIfExists('accounts');
    }
};

