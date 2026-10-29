<?php
use Modules\People\Entities\Supplier;
echo "Supplier Count: " . Supplier::count() . "\n";
echo "First 5 Suppliers: " . Supplier::limit(5)->get() . "\n";
