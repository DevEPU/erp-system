<?php

namespace Modules\Purchase\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Modules\Budget\Entities\MasterBudget;
use Modules\Budget\Entities\BudgetDetail;

class PurchaseBudgetAllocation extends Model
{
    use HasFactory;

    protected $table = 'purchase_budget_allocations';

    protected $fillable = [
        'purchase_id',
        'purchase_detail_id',
        'source_master_budget_id',
        'source_budget_detail_id',
        'amount',
        'target_category_id',
        'is_borrowed_internal',
        'is_borrowed_external',
        'is_applied',
    ];

    public function purchase()
    {
        return $this->belongsTo(Purchase::class, 'purchase_id');
    }

    public function purchaseDetail()
    {
        return $this->belongsTo(PurchaseDetail::class, 'purchase_detail_id');
    }

    public function sourceMasterBudget()
    {
        return $this->belongsTo(MasterBudget::class, 'source_master_budget_id');
    }

    public function sourceBudgetDetail()
    {
        return $this->belongsTo(BudgetDetail::class, 'source_budget_detail_id');
    }

    public function targetCategory()
    {
        return $this->belongsTo(\Modules\Product\Entities\Category::class, 'target_category_id');
    }
}
