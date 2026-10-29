<?php

namespace Modules\TargetSale\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TargetSale extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference', // <--- PASTIKAN INI ADA
        'month', 
        'year', 
        'target_amount', 
        'description', 
        'status', 
        'created_by'
    ];

    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($targetSale) {
            // Hapus approval request dan logs terkait
            $approvalRequest = \Modules\Approval\Entities\ApprovalRequest::where('requestable_type', $targetSale->getMorphClass())
                ->where('requestable_id', $targetSale->id)
                ->first();

            if ($approvalRequest) {
                // Hapus logs terlebih dahulu
                \Modules\Approval\Entities\ApprovalRequestLog::where('approval_request_id', $approvalRequest->id)->delete();
                
                // Hapus approval request
                $approvalRequest->delete();
            }
        });
    }

    // Helper untuk menampilkan nama bulan
    public function getMonthNameAttribute()
    {
        return \Carbon\Carbon::createFromDate(null, $this->month, 1)->translatedFormat('F');
    }

    // Helper untuk format rupiah
    public function getFormattedTargetAttribute()
    {
        return 'Rp ' . number_format($this->target_amount, 0, ',', '.');
    }

    public function creator()
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }

    public function approvalRequest()
    {
        return $this->morphOne(\Modules\Approval\Entities\ApprovalRequest::class, 'requestable');
    }
}