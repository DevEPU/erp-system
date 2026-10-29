<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up()
    {
        try {
            Schema::table('user_categories', function (Blueprint $table) {
                // $table->unsignedBigInteger('category_id')->nullable()->change();

                if (!Schema::hasColumn('user_categories', 'product_id')) {
                    $table->unsignedBigInteger('product_id')->nullable()->after('category_id');
                    $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
                }
            });
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Migration fellback (add product_id): ' . $e->getMessage());
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('user_categories', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
            $table->dropColumn('product_id');
            $table->unsignedBigInteger('category_id')->nullable(false)->change();
        });
    }
};
