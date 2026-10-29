<?php

use Modules\Budget\Entities\MasterBudget;
use Modules\Approval\Entities\ApprovalRequest;
use Modules\Approval\Entities\ApprovalRule;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// 1. Get a Pending Master Budget with Approval Request
$budget = MasterBudget::with('approvalRequest')->where('status', 'Pending')->orderBy('id', 'desc')->first();

if (!$budget) {
    echo "No Pending Master Budget found.\n";
    exit;
}

echo "Checking Budget ID: " . $budget->id . "\n";
$req = $budget->approvalRequest;

if (!$req) {
    echo "No Approval Request linked to this budget.\n";

    // Try manual find
    $req = ApprovalRequest::where('requestable_id', $budget->id)
        ->where('requestable_type', get_class($budget)) // Modules\Budget\Entities\MasterBudget
        ->first();

    if ($req)
        echo "  (Found manually via requestable_type)\n";
    else {
        echo "  (Also not found manually)\n";
        exit;
    }
}

echo "Approval Request ID: " . $req->id . "\n";
echo "Current Level: " . $req->current_level . "\n";
echo "Rule ID: " . $req->approval_rules_id . "\n";

$rule = ApprovalRule::with('levels.users.user')->find($req->approval_rules_id);

if (!$rule) {
    echo "Rule NOT FOUND.\n";
    exit;
}

echo "Rule Name: " . $rule->rule_name . "\n";

// Check Levels
$level = $rule->levels->where('level', $req->current_level)->first();

if (!$level) {
    echo "Level " . $req->current_level . " NOT FOUND in Rule.\n";
    echo "Available Levels: " . $rule->levels->pluck('level')->implode(', ') . "\n";
    exit;
}

echo "Level ID: " . $level->id . "\n";
echo "Approvers:\n";

$approvers = $level->users->where('role', 'approver');

if ($approvers->isEmpty()) {
    echo "  No Approvers found for this level.\n";
} else {
    foreach ($approvers as $u) {
        $user = $u->user;
        echo "  - User ID: " . $u->user_id . " | Name: " . ($user ? $user->name : 'Unknown') . "\n";
    }
}
