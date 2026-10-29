<?php

use Modules\Approval\Entities\ApprovalRequest;
use App\Models\User;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "--- Debugging API Logic ---\n";

// 1. Check User Role
$userId = 1;
$user = User::find($userId);
if ($user) {
    echo "User ID $userId found: " . $user->name . "\n";
    $roles = $user->getRoleNames();
    echo "Roles: " . $roles->implode(', ') . "\n";

    if ($user->hasRole('Super Admin')) {
        echo "Check: hasRole('Super Admin') => TRUE\n";
    } else {
        echo "Check: hasRole('Super Admin') => FALSE\n";
        // Check fuzzy match
        foreach ($roles as $role) {
            if (strtolower($role) == 'super admin') {
                echo "  (Found '$role' - Case Mismatch?)\n";
            }
        }
    }
} else {
    echo "User ID $userId NOT FOUND.\n";
}

echo "\n--- Checking Approval Requests ---\n";
// 2. Check Approval Requests Status
$reqs = ApprovalRequest::orderBy('id', 'desc')->take(5)->get();
foreach ($reqs as $req) {
    echo "ID: " . $req->id . " | Status: '" . $req->status . "' (Length: " . strlen($req->status) . ")\n";
}

// 3. Test Query Match
$countPending = ApprovalRequest::where('status', 'Pending')->count();
$countpending = ApprovalRequest::where('status', 'pending')->count();
echo "\nQuery 'Pending' count: $countPending\n";
echo "Query 'pending' count: $countpending\n";
