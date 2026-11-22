<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('central')->create('password_reset_tokens', function (Blueprint $table) {
            $table->id();
            $table->string('email', 100)->index();
            $table->string('token', 64)->index();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::connection('central')->dropIfExists('password_reset_tokens');
    }
};

