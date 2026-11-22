<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::connection('tenant')->hasTable('accounts') && !Schema::connection('tenant')->hasColumn('accounts', 'opening_date')) {
            Schema::connection('tenant')->table('accounts', function (Blueprint $table) {
                $table->date('opening_date')->nullable()->after('opening_balance');
            });
        }

        if (!Schema::connection('tenant')->hasTable('account_cost_centers')) {
            Schema::connection('tenant')->create('account_cost_centers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('account_id')->constrained('accounts')->cascadeOnDelete();
                $table->foreignId('cost_center_id')->constrained('cost_centers')->cascadeOnDelete();
                $table->timestamps();

                $table->unique(['account_id', 'cost_center_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('account_cost_centers');

        if (Schema::connection('tenant')->hasTable('accounts') && Schema::connection('tenant')->hasColumn('accounts', 'opening_date')) {
            Schema::connection('tenant')->table('accounts', function (Blueprint $table) {
                $table->dropColumn('opening_date');
            });
        }
    }
};

