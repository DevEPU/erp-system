<?php

namespace Modules\Purchase\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Modules\Product\Entities\Product;
use Modules\Approval\Entities\ApprovalRequest;

class Purchase extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function purchaseDetails()
    {
        return $this->hasMany(\Modules\Purchase\Entities\PurchaseDetail::class, 'purchase_id');
    }

    public function purchaseBudgetAllocations()
    {
        return $this->hasMany(\Modules\Purchase\Entities\PurchaseBudgetAllocation::class, 'purchase_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function purchasePayments()
    {
        return $this->hasMany(PurchasePayment::class, 'purchase_id', 'id');
    }

    public function department()
    {
        return $this->belongsTo(\Modules\Department\Entities\Departments::class, 'department_id', 'id');
    }

    public function user()
    {
        return $this->belongsTo(\App\Models\User::class, 'users_id', 'id');
    }

    public function approvalRequest()
    {
        return $this->hasOne(\Modules\Approval\Entities\ApprovalRequest::class, 'requestable_id', 'id')
            ->whereIn('requestable_type', [
                self::class,
                'Purchase Request',
                'Over Budget',
                'Modules\Purchase\Entities\Purchase'
            ]);
    }

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($model) {
            if (isset($model->description)) {
                unset($model->description);
            }
            // Also force remove from attributes array just in case
            $attributes = $model->getAttributes();
            if (array_key_exists('description', $attributes)) {
                unset($attributes['description']);
                $model->setRawAttributes($attributes);
            }
        });

        static::creating(function ($model) {
            // Generate Reference ID
            $deptCode = 'GEN';
            if ($model->department_id) {
                $dept = \Modules\Department\Entities\Departments::find($model->department_id);
                if ($dept && $dept->department_code) {
                    $deptCode = $dept->department_code;
                }
            }

            $year = date('y');
            $month = date('m');
            $day = date('d');
            $prefix = "PR/{$deptCode}-EPU/{$year}/{$month}/";

            $latest = self::where('reference', 'like', "{$prefix}{$day}%")
                ->orderByRaw('LENGTH(reference) DESC')
                ->orderBy('reference', 'desc')
                ->first();

            $sequence = 1;
            if ($latest) {
                $parts = explode('/', $latest->reference);
                $daySeq = end($parts);
                if (strlen($daySeq) > 2) {
                    $seqStr = substr($daySeq, 2);
                    $sequence = (int) $seqStr + 1;
                }
            }

            $model->reference = "{$prefix}{$day}{$sequence}";
        });

        static::updated(function ($model) {
            // Handle Budget Impact on Status Change
            if ($model->isDirty('status')) {
                $newStatus = strtolower($model->status);
                $oldStatus = strtolower($model->getOriginal('status'));

                // Transition to Approved
                if ($newStatus === 'approved') {
                    $allocations = $model->purchaseBudgetAllocations()->where('is_applied', false)->get();
                    foreach ($allocations as $alloc) {
                        // Apply to Master Budget
                        if ($alloc->source_master_budget_id) {
                            $mb = \Modules\Budget\Entities\MasterBudget::find($alloc->source_master_budget_id);
                            if ($mb)
                                $mb->increment('used_amount', $alloc->amount);
                        }
                        // Apply to Budget Detail
                        if ($alloc->source_budget_detail_id) {
                            $bd = \Modules\Budget\Entities\BudgetDetail::find($alloc->source_budget_detail_id);
                            if ($bd)
                                $bd->increment('used_amount', $alloc->amount);
                        }
                        $alloc->update(['is_applied' => true]);
                    }
                }
                // Rollback if changed FROM Approved back to something else (Rejected/Pending)
                elseif ($oldStatus === 'approved' && $newStatus !== 'approved') {
                    $allocations = $model->purchaseBudgetAllocations()->where('is_applied', true)->get();
                    foreach ($allocations as $alloc) {
                        // Rollback Master Budget
                        if ($alloc->source_master_budget_id) {
                            $mb = \Modules\Budget\Entities\MasterBudget::find($alloc->source_master_budget_id);
                            if ($mb && $mb->used_amount >= $alloc->amount) {
                                $mb->decrement('used_amount', $alloc->amount);
                            }
                        }
                        // Rollback Budget Detail
                        if ($alloc->source_budget_detail_id) {
                            $bd = \Modules\Budget\Entities\BudgetDetail::find($alloc->source_budget_detail_id);
                            if ($bd && $bd->used_amount >= $alloc->amount) {
                                $bd->decrement('used_amount', $alloc->amount);
                            }
                        }
                        $alloc->update(['is_applied' => false]);
                    }
                }
            }
        });

        static::deleting(function ($model) {
            // Rollback budget impact before deletion if they were applied
            $allocations = \Modules\Purchase\Entities\PurchaseBudgetAllocation::where('purchase_id', $model->id)
                ->where('is_applied', true)
                ->get();

            foreach ($allocations as $alloc) {
                // Rollback Master Budget
                if ($alloc->source_master_budget_id) {
                    $mb = \Modules\Budget\Entities\MasterBudget::find($alloc->source_master_budget_id);
                    if ($mb && $mb->used_amount >= $alloc->amount) {
                        $mb->decrement('used_amount', $alloc->amount);
                    }
                }
                // Rollback Budget Detail
                if ($alloc->source_budget_detail_id) {
                    $bd = \Modules\Budget\Entities\BudgetDetail::find($alloc->source_budget_detail_id);
                    if ($bd && $bd->used_amount >= $alloc->amount) {
                        $bd->decrement('used_amount', $alloc->amount);
                    }
                }
            }

            // Let cascade handle allocation records deletion OR manually delete them
            \Modules\Purchase\Entities\PurchaseBudgetAllocation::where('purchase_id', $model->id)->delete();

            // Delete associated approval requests and logs
            \Modules\Approval\Entities\ApprovalRequest::where('requestable_id', $model->id)
                ->whereIn('requestable_type', [
                    'Purchase Request',
                    'Over Budget',
                    get_class($model),
                    'Purchase'
                ])
                ->get()
                ->each(function ($req) {
                    $req->logs()->delete();
                    $req->delete();
                });

            // Delete details
            $model->purchaseDetails()->delete();
        });
    }

    public function masterBudget()
    {
        return $this->belongsTo(\Modules\Budget\Entities\MasterBudget::class, 'master_budget_id');
    }

    public function borrowedMasterBudget()
    {
        return $this->belongsTo(\Modules\Budget\Entities\MasterBudget::class, 'borrowed_master_budget_id');
    }

    public static function generatePRNumber()
    {
        $prefix = "PR";
        $lastPR = self::orderBy('id', 'desc')->first();

        if (!$lastPR) {
            $number = 1;
        } else {
            // ambil angka dari PR terakhir
            $lastNumber = (int) str_replace($prefix, "", $lastPR->reference);
            $number = $lastNumber + 1;
        }

        return $prefix . str_pad($number, 5, '0', STR_PAD_LEFT);
        // Hasil: PR00001, PR00002, dst.
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'Completed');
    }

    public function getShippingAmountAttribute($value)
    {
        return $value;
    }

    public function getPaidAmountAttribute($value)
    {
        return $value;
    }

    public function getTotalAmountAttribute($value)
    {
        return $value;
    }

    public function getDueAmountAttribute($value)
    {
        return $value;
    }

    public function getTaxAmountAttribute($value)
    {
        return $value;
    }

    public function getDiscountAmountAttribute($value)
    {
        return $value;
    }
}
