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
        Schema::create('purchase_budget_allocations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('purchase_id');
            $table->unsignedBigInteger('purchase_detail_id')->nullable();
            $table->unsignedBigInteger('source_master_budget_id')->nullable();
            $table->unsignedBigInteger('source_budget_detail_id')->nullable();
            $table->decimal('amount', 15, 2)->default(0);
            $table->boolean('is_borrowed_internal')->default(false);
            $table->boolean('is_borrowed_external')->default(false);
            $table->boolean('is_applied')->default(false);
            $table->timestamps();

            $table->foreign('purchase_id')->references('id')->on('purchases')->onDelete('cascade');
            $table->foreign('purchase_detail_id')->references('id')->on('purchase_details')->onDelete('cascade');
            $table->foreign('source_master_budget_id')->references('id')->on('master_budget')->onDelete('cascade');
            $table->foreign('source_budget_detail_id')->references('id')->on('budget_details')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_budget_allocations');
    }
};
