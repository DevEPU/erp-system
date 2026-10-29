<?php

// app/Models/MasterBudget.php
namespace Modules\Budget\Entities;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Modules\Approval\Entities\ApprovalRequest;
class MasterBudget extends Model
{
    use HasFactory;

    protected $table = 'master_budget';
    protected $fillable = [
        'no_budgeting',
        'tgl_penyusunan',
        'bulan',
        'periode_awal',
        'periode_akhir',
        'department_id',
        'description',
        'grandtotal',
        'status',
        'used_amount',
        'reserved_amount',
        'is_mandatory',
        'approval_request_id',
        'created_by',
        'total_percentage',
        'target_sales_id',
        'target_sales_amount',
    ];

    public static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            $deptCode = 'GEN';
            if ($model->department_id) {
                $dept = \Modules\Department\Entities\Departments::find($model->department_id);
                if ($dept && $dept->department_code) {
                    $deptCode = $dept->department_code;
                }
            }

            $date = $model->tgl_penyusunan ? $model->tgl_penyusunan : date('Y-m-d');
            $year = date('y', strtotime($date));
            $month = $model->bulan ? str_pad($model->bulan, 2, '0', STR_PAD_LEFT) : date('m');

            $typeCode = $model->is_mandatory ? 'MAN' : 'NON';

            // Calculate sequence
            $count = static::where('department_id', $model->department_id)
                ->where('is_mandatory', $model->is_mandatory)
                ->where('no_budgeting', 'like', "BDGT/{$deptCode}-EPU/{$typeCode}/{$year}/{$month}%")
                ->count();
            $sequence = $count + 1;

            $model->no_budgeting = "BDGT/{$deptCode}-EPU/{$typeCode}/{$year}/{$month}{$sequence}";
        });

        static::deleting(function ($model) {
            // Delete associated approval requests and logs
            \Modules\Approval\Entities\ApprovalRequest::where('requestable_id', $model->id)
                ->whereIn('requestable_type', [
                    'Master Budget',
                    get_class($model),
                    'Budget'
                ])
                ->get()
                ->each(function ($req) {
                    $req->logs()->delete();
                    $req->delete();
                });

            // Delete details
            $model->details()->delete();
        });
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'Approved');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'Pending');
    }

    public function details()
    {
        return $this->hasMany(BudgetDetail::class, 'master_budget_id');
    }

    public function getGrandtotalFormattedAttribute()
    {
        return 'Rp ' . number_format($this->grandtotal, 0, ',', '.');
    }

    public function getUsedAmountFormattedAttribute()
    {
        return 'Rp ' . number_format($this->used_amount ?? 0, 0, ',', '.');
    }

    public function getRemainingFormattedAttribute()
    {
        return 'Rp ' . number_format($this->remaining ?? 0, 0, ',', '.');
    }
    public function getBulanTextAttribute()
    {
        // kalau bulan disimpan sebagai angka (1 = Januari)
        return \Carbon\Carbon::create(null, $this->bulan, 1)->translatedFormat('F Y');
    }

    // Relasi ke Department
    public function department()
    {
        return $this->belongsTo(\Modules\Department\Entities\Departments::class, 'department_id');
    }
    public function budgetdetail()
    {
        return $this->hasMany(BudgetDetail::class, 'master_budget_id');
    }

    public function approvalRequest()
    {
        // Fallback or explicit check because morphOne is failing
        return $this->hasOne(\Modules\Approval\Entities\ApprovalRequest::class, 'requestable_id', 'id')
            ->where('requestable_type', self::class);
    }

    public function creator()
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }

    public function isApproved()
    {
        return $this->status === 'approved';
    }

    public function getReservedAmountAttribute()
    {
        $pendingStatuses = ['pending', 'menunggu', 'waiting', 'menunggu approval'];

        return (float) \Modules\Purchase\Entities\PurchaseBudgetAllocation::where('source_master_budget_id', $this->id)
            ->where('is_applied', false)
            ->whereHas('purchase', function ($q) use ($pendingStatuses) {
                $q->whereIn(\DB::raw('LOWER(status)'), $pendingStatuses);
            })
            ->sum('amount');
    }

    public function getRemainingAttribute()
    {
        return (float) $this->grandtotal - (float) $this->used_amount;
    }

    public function process(ApprovalRequest $request, $action, $user)
    {
        // proses approval...
        $request->update(['status' => $action]);
        $this->syncStatusToSource($request);
    }

    public function purchases()
    {
        return $this->hasMany(\Modules\Purchase\Entities\Purchase::class, 'master_budget_id', 'id');
    }

    public function targetSale()
    {
        return $this->belongsTo(\Modules\TargetSale\Entities\TargetSale::class, 'target_sales_id');
    }
}