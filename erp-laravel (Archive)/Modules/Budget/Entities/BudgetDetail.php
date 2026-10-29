<?php

namespace Modules\Budget\Entities;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BudgetDetail extends Model
{
    use HasFactory;

    protected $table = 'budget_details';
    protected $fillable = [
        'master_budget_id',
        'category_id',
        'category_name',
        'budget',
        'used_amount',
        'percentage',
    ];

    public function masterBudget()
    {
        return $this->belongsTo(MasterBudget::class, 'master_budget_id');
    }

    public function getReservedAmountAttribute()
    {
        $pendingStatuses = ['pending', 'menunggu', 'waiting', 'menunggu approval'];
        return \Modules\Purchase\Entities\PurchaseBudgetAllocation::where('source_budget_detail_id', $this->id)
            ->whereHas('purchase', function ($q) use ($pendingStatuses) {
                $q->whereIn(\DB::raw('LOWER(status)'), $pendingStatuses);
            })
            ->sum('amount');
    }

    public function getRemainingAttribute()
    {
        return (float) $this->budget - (float) $this->used_amount;
    }
}
