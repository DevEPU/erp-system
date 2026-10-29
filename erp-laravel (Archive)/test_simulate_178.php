<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$purchase = \Modules\Purchase\Entities\Purchase::find(178);

\Illuminate\Support\Facades\Auth::loginUsingId(1);
$newTotal = 129000;

\Gloudemans\Shoppingcart\Facades\Cart::instance('purchase')->destroy();
foreach ($purchase->purchaseDetails as $detail) {
    \Gloudemans\Shoppingcart\Facades\Cart::instance('purchase')->add([
        'id' => $detail->product_id,
        'name' => $detail->product_name,
        'qty' => $detail->quantity,
        'price' => $detail->price,
        'weight' => 1,
        'options' => [
            'sub_total' => $detail->sub_total + 3000,
            'product_discount' => 0,
            'product_discount_type' => 'fixed',
            'unit_price' => $detail->unit_price,
            'code' => $detail->product_code,
            'unit' => $detail->product_unit,
        ]
    ]);
}

$request = new \Illuminate\Http\Request();
$request->merge([
    'total_amount' => $newTotal,
    'note' => 'Auto-sync from script test PR 178'
]);

$initial135 = \Modules\Budget\Entities\MasterBudget::find(135)->used_amount;
$initial141 = \Modules\Budget\Entities\MasterBudget::find(141)->used_amount;

try {
    app(\Modules\Purchase\Http\Controllers\PurchaseController::class)->updateActual($request, $purchase);
} catch (\Throwable $e) {
    file_put_contents('test_sim_out.txt', "ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString());
}
file_put_contents('test_sim_out.txt', "\nMB 135: $initial135 -> " . \Modules\Budget\Entities\MasterBudget::find(135)->used_amount . "\nMB 141: $initial141 -> " . \Modules\Budget\Entities\MasterBudget::find(141)->used_amount, FILE_APPEND);
