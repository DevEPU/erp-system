<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$purchase = \Modules\Purchase\Entities\Purchase::find(175);
if (!$purchase)
    die("Purchase 175 not found");

// Setup Request
$request = new \Illuminate\Http\Request();
$request->merge([
    'total_amount' => 84000,
    'note' => 'Auto-sync from script'
]);

\Gloudemans\Shoppingcart\Facades\Cart::instance('purchase')->destroy();
foreach ($purchase->purchaseDetails as $detail) {
    \Gloudemans\Shoppingcart\Facades\Cart::instance('purchase')->add([
        'id' => $detail->product_id,
        'name' => $detail->product_name,
        'qty' => $detail->quantity,
        'price' => $detail->price,
        'weight' => 1,
        'options' => [
            'sub_total' => $detail->quantity * $detail->price, // 84000
            'product_discount' => 0,
            'product_discount_type' => 'fixed',
            'unit_price' => $detail->unit_price,
            'code' => $detail->product_code,
            'unit' => $detail->product_unit,
        ]
    ]);
}

echo "Before updateActual:\n";
echo "MB 135 used_amount: " . \Modules\Budget\Entities\MasterBudget::find(135)->used_amount . "\n";
echo "MB 145 used_amount: " . \Modules\Budget\Entities\MasterBudget::find(145)->used_amount . "\n";

\Illuminate\Support\Facades\Auth::loginUsingId(1);
$newTotal = 84000;
$delta = $newTotal - $purchase->total_amount;
$purchase->update([
    'total_amount' => $newTotal,
    'master_budget_remaining' => $purchase->master_budget_remaining - $delta,
    'note' => $request->note ?? '',
]);
$currentAllocations = \Modules\Purchase\Entities\PurchaseBudgetAllocation::where('purchase_id', $purchase->id)->get();
$hasOverrideAllocations = $currentAllocations->contains(function ($al) {
    return empty($al->purchase_detail_id) || $al->purchase_detail_id == 0 || $al->purchase_detail_id === '0';
});
if ($hasOverrideAllocations) {
    $oldBudgetSum = $currentAllocations->sum('amount');
    $allocationDelta = $newTotal - $oldBudgetSum;
    echo "hasOverride=TRUE, delta=$allocationDelta\n";
    if ($allocationDelta !== 0) {
        $alloc = $currentAllocations->filter(function ($al) {
            return (bool) $al->is_borrowed_internal || (bool) $al->is_borrowed_external; })->sortByDesc('amount')->first();
        if (!$alloc)
            $alloc = $currentAllocations->sortByDesc('amount')->first();
        if ($alloc) {
            echo "Modifying Alloc ID: {$alloc->id} SourceMB: {$alloc->source_master_budget_id}\n";
            $alloc->amount += $allocationDelta;
            if ($alloc->amount < 0)
                $alloc->amount = 0;
            $alloc->save();
            if ($alloc->is_applied) {
                if ($alloc->source_master_budget_id) {
                    $mb = \Modules\Budget\Entities\MasterBudget::find($alloc->source_master_budget_id);
                    if ($mb) {
                        echo "Incrementing MB {$mb->id} by $allocationDelta\n";
                        $mb->used_amount += $allocationDelta;
                        if ($mb->used_amount < 0)
                            $mb->used_amount = 0;
                        $mb->save();
                    }
                }
            }
        }
    }
}

echo "After updateActual:\n";
echo "MB 135 used_amount: " . \Modules\Budget\Entities\MasterBudget::find(135)->used_amount . "\n";
echo "MB 145 used_amount: " . \Modules\Budget\Entities\MasterBudget::find(145)->used_amount . "\n";
