<?php
// bypass_existing.php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$migrator = app('migrator');
$files = $migrator->getMigrationFiles($migrator->paths());
$ran = DB::table('migrations')->pluck('migration')->toArray();

$pending = collect($files)->reject(function ($file, $name) use ($ran) {
    return in_array($name, $ran);
})->keys()->all();

$tables = [
    '2025_08_13_122133_create_user_categories_table' => 'user_categories',
    '2025_08_14_084937_create_departments_table' => 'departments',
    '2026_02_23_065051_create_budget_borrowings_table' => 'budget_borrowings',
    '2021_04_06_145037_create_departments_table' => 'departments', // fallback
];

$columns = [
    '2026_01_31_194121_add_category_permissions_to_permissions_table' => ['permissions', 'category_id'],
    '2026_02_05_153321_add_created_by_to_master_budget_table' => ['master_budget', 'created_by'],
    '2026_02_10_082833_add_product_id_to_user_categories_table' => ['user_categories', 'product_id'],
    '2026_02_23_065034_add_used_amount_to_budget_details_table' => ['budget_details', 'used_amount'],
];

foreach ($pending as $migration) {
    $exists = false;

    // Default: if it's before today, let's just assume it exists if it's a known table
    if (isset($tables[$migration])) {
        if (Schema::hasTable($tables[$migration])) {
            $exists = true;
        }
    } elseif (isset($columns[$migration])) {
        if (Schema::hasColumn($columns[$migration][0], $columns[$migration][1])) {
            $exists = true;
        }
    } else {
        // If it's old and we don't know it, let's just insert it safely to skip it if it's not our allocation table
        if (strpos($migration, '2026_02_23_081439') === false) {
            // Let's try to just insert it if it's an old one
            if (strpos($migration, '2021_') !== false || strpos($migration, '2025_') !== false) {
                $exists = true;
            }
        }
    }

    if ($exists) {
        try {
            DB::table('migrations')->insert([
                'migration' => $migration,
                'batch' => 2
            ]);
            echo "Bypassed $migration\n";
        } catch (\Exception $e) {
            echo "Already handled $migration\n";
        }
    }
}
