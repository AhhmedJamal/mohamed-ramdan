<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::connection('tenant')->hasTable('contractor_invoice_items')) {
            Schema::connection('tenant')->create('contractor_invoice_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('contractor_invoice_id')->constrained('contractor_invoices')->cascadeOnDelete();
                $table->string('item_name', 255);
                $table->decimal('quantity', 12, 4);
                $table->string('unit', 50); // متر، طن، يوم، حبة
                $table->decimal('unit_price', 15, 4);
                $table->decimal('total', 15, 4);
                $table->string('notes', 255)->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('contractor_invoice_items');
    }
};

