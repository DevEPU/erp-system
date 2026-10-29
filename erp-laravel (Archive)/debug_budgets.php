<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$rows = DB::table('master_budgets')->where('status', 'Approved')->get();
echo "RAW DATA:\n";
foreach ($rows as $row) {
    echo "ID:{$row->id}|Dept:{$row->department_id}|Bulan:({$row->bulan})|Type:" . gettype($row->bulan) . "|Periode:{$row->periode_awal}\n";
}
