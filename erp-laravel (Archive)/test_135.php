<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$allocs = \Modules\Purchase\Entities\PurchaseBudgetAllocation::where('source_master_budget_id', 135)->get();
echo "MB 135 ALLOCATIONS:\n";
foreach ($allocs as $a) {
    echo "Purchase ID: {$a->purchase_id} | Amount: {$a->amount} | Applied: {$a->is_applied}\n";
}
