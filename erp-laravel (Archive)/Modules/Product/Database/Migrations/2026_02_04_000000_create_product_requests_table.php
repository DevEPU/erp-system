<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateProductRequestsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('product_requests', function (Blueprint $table) {
            $table->id();
            $table->string('product_name');
            $table->string('product_code')->nullable();
            $table->unsignedBigInteger('category_id')->nullable();
            $table->string('product_unit');
            $table->boolean('is_asset')->default(false);
            $table->integer('product_price')->nullable();
            $table->unsignedBigInteger('supplier_id')->nullable();
            $table->boolean('is_verify')->default(false);
            $table->string('status')->default('pending'); // pending, approved, rejected
            $table->text('reason')->nullable(); // For rejection or notes
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            
            // Foreign keys if needed, but keeping it loose effectively as it is a request
            // $table->foreign('category_id')->references('id')->on('categories')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('product_requests');
    }
}
