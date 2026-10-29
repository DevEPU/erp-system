<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$purchase = \Modules\Purchase\Entities\Purchase::with('purchaseDetails')->find(178);
if (!$purchase)
    die("Purchase 178 not found");

$items = [];
foreach ($purchase->purchaseDetails as $detail) {
    $items[] = [
        'id' => $detail->id,
        'actual_price' => $detail->price + 3000 // simulate a +3000 increment in actuals
    ];
}

$request = \Illuminate\Http\Request::create('/api/purchases/178/update-actual', 'POST', [
    'items' => $items,
    'is_paid' => true
]);

echo "Initial MB 135: " . \Modules\Budget\Entities\MasterBudget::find(135)->used_amount . "\n";
echo "Initial MB 141: " . \Modules\Budget\Entities\MasterBudget::find(141)->used_amount . "\n";

$response = app()->handle($request);

echo "\nResponse Status: " . $response->getStatusCode() . "\n";
echo "Response Content: " . $response->getContent() . "\n";

echo "\nAfter update MB 135: " . \Modules\Budget\Entities\MasterBudget::find(135)->used_amount . "\n";
echo "After update MB 141: " . \Modules\Budget\Entities\MasterBudget::find(141)->used_amount . "\n";

// Undo
echo "\n--- UNDOING CHANGES ---\n";
$itemsRevert = [];
foreach ($purchase->purchaseDetails as $detail) {
    $itemsRevert[] = [
        'id' => $detail->id,
        'actual_price' => $detail->price - 3000 // revert back
    ];
}

$requestRevert = \Illuminate\Http\Request::create('/api/purchases/178/update-actual', 'POST', [
    'items' => $itemsRevert,
    'is_paid' => true
]);
app()->handle($requestRevert);
echo "Final MB 135: " . \Modules\Budget\Entities\MasterBudget::find(135)->used_amount . "\n";
echo "Final MB 141: " . \Modules\Budget\Entities\MasterBudget::find(141)->used_amount . "\n";
