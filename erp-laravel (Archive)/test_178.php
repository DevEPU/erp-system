<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$purchase = \Modules\Purchase\Entities\Purchase::find(178);
if (!$purchase)
    die("Purchase 178 not found");

$allocations = \Modules\Purchase\Entities\PurchaseBudgetAllocation::where('purchase_id', $purchase->id)->get();
$data = [
    'purchase' => $purchase->toArray(),
    'allocations' => $allocations->toArray()
];
file_put_contents('test_178_out.json', json_encode($data, JSON_PRETTY_PRINT));
