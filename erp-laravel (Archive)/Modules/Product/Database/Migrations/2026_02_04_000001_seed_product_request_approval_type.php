<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class SeedProductRequestApprovalType extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Check if exists first to avoid duplicates if re-run
        $exists = DB::table('approval_types')->where('approval_code', 'Product')->exists();

        if (!$exists) {
            DB::table('approval_types')->insert([
                'approval_code' => 'Product',
                'approval_name' => 'Product Request',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        DB::table('approval_types')->where('approval_code', 'Product')->delete();
    }
}
