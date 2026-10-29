<?php
use App\Models\User;
use Modules\Product\Entities\Product;

try {
    // 1. Setup Data
    $product = Product::first();
    if (!$product) {
        throw new Exception("No products found to test with.");
    }
    $product2 = Product::skip(1)->first();

    echo "Testing with Product ID: " . $product->id . "\n";

    // 2. Create User via Request Simulation (Simplified: just testing Model sync logic which acts as proxy)
    // Actually, let's test the Model's relationship sync first, as that's what the Controller uses.

    $user = User::create([
        'name' => 'Test Product User',
        'email' => 'test_product_user_' . time() . '@example.com',
        'password' => bcrypt('password'),
        'role' => 'Staff' // Assuming Staff role exists, otherwise might fail if role invalid but we ignore permission checks here
    ]);

    echo "User created: " . $user->id . "\n";

    // 3. Sync Products
    echo "Assigning product " . $product->id . "...\n";
    $user->products()->sync([$product->id]);

    // 4. Verify
    $user->refresh();
    $count = $user->products()->count();
    $hasProduct = $user->products->contains('id', $product->id);

    echo "Product Count: " . $count . "\n";
    echo "Has Product " . $product->id . ": " . ($hasProduct ? 'YES' : 'NO') . "\n";

    if ($count !== 1 || !$hasProduct) {
        throw new Exception("Failed to assign product.");
    }

    // 5. Update (Add another)
    if ($product2) {
        echo "Updating to include product " . $product2->id . "...\n";
        $user->products()->sync([$product->id, $product2->id]);
        $user->refresh();
        $count = $user->products()->count();
        echo "Product Count after update: " . $count . "\n";
        if ($count !== 2)
            throw new Exception("Failed to update products.");
    }

    // 6. Cleanup
    echo "Cleaning up...\n";
    $user->delete(); // Should cascade delete user_categories
    echo "Test PASSED.\n";

} catch (\Exception $e) {
    echo "Test FAILED: " . $e->getMessage() . "\n";
}
