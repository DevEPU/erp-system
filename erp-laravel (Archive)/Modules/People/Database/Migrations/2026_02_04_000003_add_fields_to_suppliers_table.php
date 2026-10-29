<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddFieldsToSuppliersTable extends Migration
{
    public function up()
    {
        Schema::table('suppliers', function (Blueprint $table) {
            if (!Schema::hasColumn('suppliers', 'supplier_code')) {
                $table->string('supplier_code')->nullable();
            }
            if (!Schema::hasColumn('suppliers', 'fax')) {
                $table->string('fax')->nullable();
            }
            if (!Schema::hasColumn('suppliers', 'contact_person')) {
                $table->string('contact_person')->nullable();
            }
            if (!Schema::hasColumn('suppliers', 'npwp')) {
                $table->string('npwp')->nullable();
            }
            if (!Schema::hasColumn('suppliers', 'ppn_id')) {
                $table->unsignedBigInteger('ppn_id')->nullable();
            }
            if (!Schema::hasColumn('suppliers', 'pph_id')) {
                $table->unsignedBigInteger('pph_id')->nullable();
            }
            if (!Schema::hasColumn('suppliers', 'is_active')) {
                $table->boolean('is_active')->default(true);
            }
            if (!Schema::hasColumn('suppliers', 'currency_id')) {
                $table->unsignedBigInteger('currency_id')->nullable();
            }
            if (!Schema::hasColumn('suppliers', 'region')) {
                $table->string('region')->nullable();
            }
        });
    }

    public function down()
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropColumn([
                'supplier_code',
                'fax',
                'contact_person',
                'npwp',
                'ppn_id',
                'pph_id',
                'is_active',
                'currency_id',
                'region'
            ]);
        });
    }
}
