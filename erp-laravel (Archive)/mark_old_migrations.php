<?php
// get_pending_migrations.php
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

$tables_to_check = [
    '2021_07_14_145038_create_budget_details_table' => 'budget_details',
    '2021_04_06_145037_create_departments_table' => 'departments',
    // We can just try to run them and if it fails with table exists, we insert it manually.
];

// Instead of guessing, let's just insert ALL of them that start with '2021' or '2022' or '2023' or '2024' or '2025'
// because they are old. We only want to run the newer ones like purchase_budget_allocations.
$inserted = 0;
foreach ($pending as $migration) {
    if (strpos($migration, '2026_02_23') === false) { // Assuming our new ones are from today 2026_02_23
        // Mark as run
        try {
            DB::table('migrations')->insert([
                'migration' => $migration,
                'batch' => 2
            ]);
            $inserted++;
            echo "Inserted $migration\n";
        } catch (\Exception $e) {
            echo "Error $migration: " . $e->getMessage() . "\n";
        }
    }
}
echo "Inserted $inserted old migrations.\n";
