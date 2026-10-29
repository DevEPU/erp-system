<?php
use Illuminate\Support\Facades\DB;
try {
    $types = DB::table('approval_requests')->select('requestable_type')->distinct()->pluck('requestable_type');
    echo "Requestable Types:\n";
    foreach ($types as $type) {
        echo "- " . $type . "\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
