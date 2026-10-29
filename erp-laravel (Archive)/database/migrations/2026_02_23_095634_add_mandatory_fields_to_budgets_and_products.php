<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('master_budget', function (Blueprint $table) {
            $table->boolean('is_mandatory')->default(false)->after('department_id');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->boolean('is_mandatory')->default(false)->after('category_id');
        });

        Schema::table('purchases', function (Blueprint $table) {
            $table->decimal('mandatory_amount', 15, 2)->default(0)->after('budget_amount');
            $table->decimal('non_mandatory_amount', 15, 2)->default(0)->after('mandatory_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('master_budget', function (Blueprint $table) {
            $table->dropColumn('is_mandatory');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('is_mandatory');
        });

        Schema::table('purchases', function (Blueprint $table) {
            $table->dropColumn(['mandatory_amount', 'non_mandatory_amount']);
        });
    }
};
