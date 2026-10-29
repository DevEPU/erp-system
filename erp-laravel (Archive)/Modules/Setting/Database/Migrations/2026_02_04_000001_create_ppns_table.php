<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreatePpnsTable extends Migration
{
    public function up()
    {
        Schema::create('ppns', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->double('rate', 15, 2)->default(0);
            $table->string('description')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('ppns');
    }
}
