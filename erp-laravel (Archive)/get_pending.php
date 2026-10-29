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

echo json_encode($pending);
