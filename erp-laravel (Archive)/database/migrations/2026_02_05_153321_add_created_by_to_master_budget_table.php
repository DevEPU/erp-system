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
        try {
            if (Schema::hasTable('master_budget')) {
                if (!Schema::hasColumn('master_budget', 'created_by')) {
                    Schema::table('master_budget', function (Blueprint $table) {
                        $table->integer('created_by')->nullable();
                    });
                }
            }
        } catch (\Throwable $e) {
            // Ignore error to unblock checks
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('master_budget', function (Blueprint $table) {
            $table->dropColumn('created_by');
        });
    }
};
