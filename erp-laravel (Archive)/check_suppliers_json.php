<?php
use Modules\People\Entities\Supplier;
$suppliers = Supplier::all();
echo "JSON: " . json_encode($suppliers);
