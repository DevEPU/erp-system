<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddSupplierIdToProductsTable extends Migration
{
    public function up()
    {
        if (!Schema::hasColumn('products', 'supplier_id')) {
            Schema::table('products', function (Blueprint $table) {
                // Removed 'after' clause to avoid potential issues
                $table->unsignedBigInteger('supplier_id')->nullable();
                // $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('set null');
            });
        }
    }

    public function down()
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('supplier_id');
        });
    }
}
