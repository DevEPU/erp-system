<?php
try {
    DB::table('user_categories')->insert(['user_id' => 1, 'product_id' => 1, 'category_id' => null]);
    echo "Insert Success\n";
} catch (\Exception $e) {
    echo "Insert Failed: " . $e->getMessage() . "\n";
}
