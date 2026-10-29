<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddBorrowedFieldsToPurchasesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->unsignedBigInteger('borrowed_master_budget_id')->nullable()->after('master_budget_id');
            $table->decimal('borrowed_amount', 15, 2)->default(0)->after('total_amount');

            // Optional: Foreign key if you want strict integrity
            // $table->foreign('borrowed_master_budget_id')->references('id')->on('master_budgets'); 
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropColumn(['borrowed_master_budget_id', 'borrowed_amount']);
        });
    }
}
