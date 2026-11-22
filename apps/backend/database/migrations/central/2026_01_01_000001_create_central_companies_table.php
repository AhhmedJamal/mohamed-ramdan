<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('central')->create('companies', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name', 100)->unique();
            $table->string('trade_activity', 255);
            $table->string('address', 255);
            $table->string('country', 100);
            $table->string('city', 100);
            $table->string('tax_number', 50)->nullable();
            $table->string('subdomain', 50)->unique();
            $table->string('db_name', 100)->unique();
            $table->enum('status', ['active', 'frozen'])->default('active');
            $table->unsignedInteger('session_epoch')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('central')->dropIfExists('companies');
    }
};

