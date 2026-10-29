<?php

namespace Modules\Product\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\User;

class ProductRequest extends Model
{
    use HasFactory;

    protected $guarded = [];
    protected $with = ['product'];

    // Map 'status' to allow mass assignment
    // Table has: product_name, product_code, category_id, product_unit, is_asset, product_price, supplier_id, is_verify, status, reason, created_by

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function supplier()
    {
        // Assuming Supplier model is in Modules\People\Entities\Supplier
        return $this->belongsTo(\Modules\People\Entities\Supplier::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvalRequest()
    {
        return $this->morphOne(\Modules\Approval\Entities\ApprovalRequest::class, 'requestable')->latest();
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($model) {
            // Cari Approval Request yang terkait
            // Kita cari berdasarkan requestable_id DAN requestable_type
            // Tipe bisa 'Product Request' (string) atau Class Name.
            // Sesuai temuan, system menggunakan 'Product Request'.
            // Tapi untuk aman, kita cari keduanya atau gunakan polymorphic query jika memungkinkan.
            // Namun karena morphOne relationship 'approvalRequest' sudah ada, kita bisa pakai itu.

            if ($model->approvalRequest) {
                // Delete logs first (hasMany in ApprovalRequest)
                $model->approvalRequest->logs()->delete();

                // Delete the request itself
                $model->approvalRequest->delete();
            }

            // Fallback manual query jika relationship tidak recover (misal beda type string)
            \Modules\Approval\Entities\ApprovalRequest::where('requestable_id', $model->id)
                ->whereIn('requestable_type', ['Product Request', self::class])
                ->get()
                ->each(function ($req) {
                    $req->logs()->delete();
                    $req->delete();
                });
        });
    }
}
