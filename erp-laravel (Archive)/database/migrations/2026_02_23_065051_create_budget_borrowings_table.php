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
            $table->unsignedBigInteger('purchase_detail_id'); // if tracking per item, or nullable if per PR
            $table->unsignedBigInteger('source_master_budget_id');
            $table->unsignedBigInteger('source_budget_detail_id')->nullable(); // detail level tracking
            $table->decimal('amount', 15, 2)->default(0);
            $table->boolean('is_borrowed_internal')->default(false); // another category, same dept
            $table->boolean('is_borrowed_external')->default(false); // another dept
            $table->boolean('is_applied')->default(false); // set true when approved and used_amount incremented

            $table->foreign('purchase_id')->references('id')->on('purchases')->onDelete('cascade');
            $table->timestamps();
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
