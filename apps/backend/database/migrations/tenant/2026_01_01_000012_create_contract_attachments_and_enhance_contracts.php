<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add rejection reason and cancellation requested by if not exists
        if (Schema::connection('tenant')->hasTable('rental_contracts')) {
            Schema::connection('tenant')->table('rental_contracts', function (Blueprint $table) {
                if (!Schema::connection('tenant')->hasColumn('rental_contracts', 'rejection_reason')) {
                    $table->string('rejection_reason', 500)->nullable()->after('cancellation_reason');
                }
                if (!Schema::connection('tenant')->hasColumn('rental_contracts', 'cancellation_requested_by')) {
                    $table->unsignedBigInteger('cancellation_requested_by')->nullable()->after('rejection_reason');
                }
            });
        }

        // Contract Attachments (UC-41)
        if (!Schema::connection('tenant')->hasTable('contract_attachments')) {
            Schema::connection('tenant')->create('contract_attachments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('contract_id')->constrained('rental_contracts')->cascadeOnDelete();
                $table->string('file_name', 255);
                $table->string('file_path', 500);
                $table->string('file_type', 50); // pdf, png, jpeg
                $table->unsignedBigInteger('file_size'); // bytes
                $table->unsignedBigInteger('uploaded_by')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('contract_attachments');

        if (Schema::connection('tenant')->hasTable('rental_contracts')) {
            Schema::connection('tenant')->table('rental_contracts', function (Blueprint $table) {
                if (Schema::connection('tenant')->hasColumn('rental_contracts', 'rejection_reason')) {
                    $table->dropColumn('rejection_reason');
                }
                if (Schema::connection('tenant')->hasColumn('rental_contracts', 'cancellation_requested_by')) {
                    $table->dropColumn('cancellation_requested_by');
                }
            });
        }
    }
};

