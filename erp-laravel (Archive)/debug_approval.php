<?php

use Modules\Budget\Entities\MasterBudget;
use Modules\Approval\Entities\ApprovalRequest;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Checking Master Budgets and Approval Requests...\n";

$budgets = MasterBudget::orderBy('id', 'desc')->take(5)->get();

foreach ($budgets as $budget) {
    echo "Budget ID: " . $budget->id . "\n";
    echo "  Status: " . $budget->status . "\n";

    // Check manual query
    $req = ApprovalRequest::where('requestable_id', $budget->id)
        ->whereIn('requestable_type', [
            'Master Budget',
            'Modules\Budget\Entities\MasterBudget'
        ])->first();

    if ($req) {
        echo "  Found Approval Request via Query:\n";
        echo "    ID: " . $req->id . "\n";
        echo "    Type: " . $req->requestable_type . "\n"; // This is the crucial part
        echo "    Status: " . $req->status . "\n";
    } else {
        echo "  NO Approval Request found via Query.\n";
    }

    // Check relationship
    $rel = $budget->approvalRequest;
    if ($rel) {
        echo "  Relation 'approvalRequest' LOADED successfully.\n";
    } else {
        echo "  Relation 'approvalRequest' FAILED to load.\n";
    }
    echo "--------------------------------------------------\n";
}
