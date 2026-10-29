<?php

use Modules\Product\Entities\ProductRequest;
use Modules\Approval\Entities\ApprovalRequest;
use Modules\Approval\Entities\ApprovalRequestLog;

try {
    DB::beginTransaction();

    echo "Creating dummy Product Request...\n";
    $pr = ProductRequest::create([
        'product_name' => 'Dummy Delete Test',
        'product_unit' => 'Pcs',
        'category_id' => 1,
        'supplier_id' => 1,
        'status' => 'Pending',
        'created_by' => 1
    ]);
    echo "Product Request ID: " . $pr->id . "\n";

    echo "Creating dummy Approval Request...\n";
    $ar = ApprovalRequest::create([
        'approval_types_id' => 1, // Assumed exist
        'approval_rules_id' => 1, // Assumed exist
        'requestable_type' => 'Product Request',
        'requestable_id' => $pr->id,
        'created_by' => 1,
        'amount' => 0,
        'status' => 'pending',
        'current_level' => 1
    ]);
    echo "Approval Request ID: " . $ar->id . "\n";

    echo "Creating dummy Log...\n";
    $log = ApprovalRequestLog::create([
        'approval_request_id' => $ar->id,
        'level' => 1,
        'user_id' => 1,
        'action' => 'assigned'
    ]);
    echo "Log ID: " . $log->id . "\n";

    echo "Deleting Product Request...\n";
    $pr->delete();

    echo "Verifying deletion...\n";
    $prCheck = ProductRequest::find($pr->id);
    $arCheck = ApprovalRequest::find($ar->id);
    $logCheck = ApprovalRequestLog::find($log->id);

    if (!$prCheck)
        echo "Product Request deleted.\n";
    else
        echo "FAILED: Product Request still exists.\n";

    if (!$arCheck)
        echo "Approval Request deleted.\n";
    else
        echo "FAILED: Approval Request still exists.\n";

    if (!$logCheck)
        echo "Log deleted.\n";
    else
        echo "FAILED: Log still exists.\n";

    DB::rollBack(); // Rollback to not pollute DB, but logic runs within transaction
    echo "Test completed (Rolled back cleaning).\n";

} catch (\Exception $e) {
    DB::rollBack();
    echo "Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
