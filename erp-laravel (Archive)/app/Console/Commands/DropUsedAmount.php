<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

class DropUsedAmount extends Command
{
    protected $signature = 'db:drop-used-amount';
    protected $description = 'Drop used_amount column from budget_details';

    public function handle()
    {
        if (Schema::hasColumn('budget_details', 'used_amount')) {
            Schema::table('budget_details', function (Blueprint $table) {
                $table->dropColumn('used_amount');
            });
            $this->info('Dropped used_amount column');
        } else {
            $this->info('Column does not exist');
        }
    }
}
