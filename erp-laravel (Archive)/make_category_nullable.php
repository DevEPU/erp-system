<?php
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

try {
    Schema::table('user_categories', function (Blueprint $table) {
        $table->unsignedBigInteger('category_id')->nullable()->change();
    });
    echo "category_id made nullable successfully.\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
