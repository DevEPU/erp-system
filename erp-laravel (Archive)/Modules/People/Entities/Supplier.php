<?php

namespace Modules\People\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Supplier extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function ppn()
    {
        return $this->belongsTo(\Modules\Setting\Entities\Ppn::class, 'ppn_id');
    }

    public function pph()
    {
        return $this->belongsTo(\Modules\Setting\Entities\Pph::class, 'pph_id');
    }

    public function currency()
    {
        return $this->belongsTo(\Modules\Currency\Entities\Currency::class, 'currency_id');
    }

    protected static function newFactory()
    {
        return \Modules\People\Database\factories\SupplierFactory::new();
    }
}
