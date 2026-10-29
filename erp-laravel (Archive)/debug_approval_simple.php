<?php

use Modules\Budget\Entities\MasterBudget;
use Modules\Approval\Entities\ApprovalRequest;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$budgets = MasterBudget::with('approvalRequest')->orderBy('id', 'desc')->take(3)->get();

foreach ($budgets as $budget) {
    echo "ID: " . $budget->id . "\n";
    $req = $budget->approvalRequest;
    if ($req) {
        echo "Relation Loaded: YES\n";
        echo "Type: " . $req->requestable_type . "\n";
    } else {
        echo "Relation Loaded: NO\n";
        // Manual check
        $manual = ApprovalRequest::where('requestable_id', $budget->id)->first();
        if ($manual) {
            echo "Manual Found Type: " . $manual->requestable_type . "\n";
        } else {
            echo "Manual Found: NO\n";
        }
    }
    echo "---\n";
}
