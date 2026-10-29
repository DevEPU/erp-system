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
        // Add columns to master_budget
        Schema::table('master_budget', function (Blueprint $table) {
            if (!Schema::hasColumn('master_budget', 'total_percentage')) {
                $table->decimal('total_percentage', 8, 2)->default(0)->after('grandtotal');
            }
            if (!Schema::hasColumn('master_budget', 'target_sales_id')) {
                $table->foreignId('target_sales_id')->nullable()->after('total_percentage')->constrained('target_sales')->onDelete('set null');
            }
            if (!Schema::hasColumn('master_budget', 'target_sales_amount')) {
                $table->decimal('target_sales_amount', 15, 2)->default(0)->after('target_sales_id');
            }
        });

        // Add columns to budget_details
        Schema::table('budget_details', function (Blueprint $table) {
            if (!Schema::hasColumn('budget_details', 'percentage')) {
                $table->decimal('percentage', 8, 2)->default(0)->after('budget');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('master_budget', function (Blueprint $table) {
            $table->dropForeign(['target_sales_id']);
            $table->dropColumn(['total_percentage', 'target_sales_id', 'target_sales_amount']);
        });

        Schema::table('budget_details', function (Blueprint $table) {
            $table->dropColumn('percentage');
        });
    }
};
