<?php

namespace Modules\Product\Http\Controllers;

use Illuminate\Contracts\Support\Renderable;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\Product\Entities\ProductRequest;
use Modules\Product\Entities\Product;
use Modules\Approval\Services\ApprovalEngine;
use Modules\Approval\Entities\ApprovalType;
use Illuminate\Support\Facades\DB;
use Modules\People\Entities\Supplier;
use Modules\Product\Entities\Category;
use Modules\Setting\Entities\Unit;
use Illuminate\Support\Facades\Auth;

class ProductRequestController extends Controller
{
    protected $approvalEngine;

    public function __construct(ApprovalEngine $approvalEngine)
    {
        $this->approvalEngine = $approvalEngine;
    }

    public function index(Request $request)
    {
        // Permission check can be done via middleware or here if needed
        // abort_if(!auth()->user()->can('access_request_products'), 403);

        $query = ProductRequest::with(['category', 'creator', 'supplier', 'product', 'approvalRequest.logs.user']);

        // Filter by search
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                    ->orWhere('product_code', 'like', "%{$search}%");
            });
        }

        // Filter by status if needed
        if ($status = $request->query('status')) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        }

        // Filter by verified status
        if ($isVerify = $request->query('is_verify')) {
            if ($isVerify !== 'all') {
                $query->where('is_verify', $isVerify === '1' ? 1 : 0);
            }
        }

        // Filter by input status
        if ($isInput = $request->query('is_input')) {
            if ($isInput !== 'all') {
                if ($isInput === '1') {
                    $query->whereNotNull('product_id');
                } else {
                    $query->whereNull('product_id');
                }
            }
        }

        // Ordering
        $sort = $request->query('sort', 'newest');
        if ($sort === 'oldest') {
            $query->orderBy('created_at', 'asc');
        } else if ($sort === 'name_asc') {
            $query->orderBy('product_name', 'asc');
        } else if ($sort === 'name_desc') {
            $query->orderBy('product_name', 'desc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $requests = $query->paginate(10);

        $requests->getCollection()->transform(function ($req) {
            $approvers = [];
            if ($req->approvalRequest && $req->approvalRequest->status === 'pending') {
                $currentLevel = $req->approvalRequest->current_level;

                // Cari assignees dari log untuk level aktif saat ini
                $activeLogs = $req->approvalRequest->logs->where('level', $currentLevel)->where('action', 'assigned');

                foreach ($activeLogs as $log) {
                    if ($log->user) {
                        $approvers[] = $log->user->name;
                    }
                }
            }
            $req->current_approvers = array_unique($approvers);
            return $req;
        });

        return response()->json($requests);
    }

    public function store(Request $request)
    {
        $request->validate([
            'product_name' => 'required|string|max:255',
            'product_unit' => 'required|string',
            'category_id' => 'nullable|exists:categories,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'description' => 'nullable|string',
            'product_price' => 'nullable|numeric',
            'is_mandatory' => 'nullable|boolean'
        ]);

        try {
            DB::beginTransaction();

            $userId = Auth::id() ?: $request->user_id;

            $productRequest = ProductRequest::create([
                'product_name' => $request->product_name,
                'product_unit' => $request->product_unit,
                'category_id' => $request->category_id,
                'supplier_id' => $request->supplier_id,
                // 'description' => $request->description,
                'product_price' => $request->product_price, // Asumsi ada field price di table product_requests
                'is_mandatory' => $request->boolean('is_mandatory'),
                'status' => 'Pending',
                'created_by' => $userId
            ]);

            // Create Approval
            $type = ApprovalType::where('approval_code', 'Product')->first();
            if (!$type) {
                throw new \Exception("Approval Type 'Product' not found");
            }

            $approval = $this->approvalEngine->createRequest(
                'Product Request', // Or $productRequest->getMorphClass()
                $productRequest->id,
                $type->id,
                0, // Amount 0 for product request (unless priced?)
                $userId
            );

            if ($productRequest->status !== $approval->status) {
                $productRequest->update(['status' => $approval->status]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Product Request created successfully',
                'data' => $productRequest
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create request: ' . $e->getMessage()], 500);
        }
    }

    public function getVerificationData()
    {
        $categories = Category::select('id', 'category_name')->get();
        // Return suppliers with id, name and code
        $suppliers = Supplier::select('id', 'supplier_name', 'supplier_code')->get();
        // Return units - assuming simple list or from a table.
        // Based on previous snippets, Unit model exists in Modules\Setting\Entities\Unit
        // And usually we want name and short_name
        $units = Unit::select('id', 'name', 'short_name')->get();

        return response()->json([
            'categories' => $categories,
            'suppliers' => $suppliers,
            'units' => $units
        ]);
    }


    public function update(Request $request, $id)
    {
        $productRequest = ProductRequest::findOrFail($id);

        if (strtolower($productRequest->status) !== 'pending') {
            return response()->json(['message' => 'Only pending requests can be edited'], 403);
        }

        $request->validate([
            'product_name' => 'required|string|max:255',
            'product_unit' => 'required|string',
            'category_id' => 'nullable|exists:categories,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'product_price' => 'nullable|numeric',
            'is_mandatory' => 'nullable|boolean'
        ]);

        $productRequest->update([
            'product_name' => $request->product_name,
            'product_unit' => $request->product_unit,
            'category_id' => $request->category_id,
            'supplier_id' => $request->supplier_id,
            'product_price' => $request->product_price,
            'is_mandatory' => $request->boolean('is_mandatory'),
        ]);

        return response()->json([
            'message' => 'Product Request updated successfully',
            'data' => $productRequest
        ]);
    }

    public function destroy($id)
    {
        $productRequest = ProductRequest::findOrFail($id);

        // Allow deletion regardless of status as requested
        // if (strtolower($productRequest->status) !== 'pending') {
        //     return response()->json(['message' => 'Only pending requests can be deleted'], 403);
        // }

        // Delete associated approval request if it exists
        if ($productRequest->approvalRequest) {
            $productRequest->approvalRequest->delete();
        }

        $productRequest->delete();

        return response()->json(['message' => 'Product Request deleted successfully']);
    }


    public function inputToProduct(Request $request, $id)
    {
        // Permission: input_request_product
        // abort_if(!auth()->user()->can('input_request_product'), 403);

        try {
            return DB::transaction(function () use ($id) {
                $productRequest = ProductRequest::findOrFail($id);

                if (!$productRequest->is_verify) {
                    return response()->json(['message' => 'Request must be verified first'], 400);
                }

                if ($productRequest->status !== 'approved' && $productRequest->status !== 'Approved') {
                    return response()->json(['message' => 'Request must be approved first'], 400);
                }

                // Check if product exists - Check by name OR code.
                // NOTE: If product_id is already set, we should probably stop?
                if ($productRequest->product_id) {
                    return response()->json(['message' => 'Product has already been input.'], 400);
                }

                $exists = Product::where('product_name', $productRequest->product_name)
                    ->orWhere(function ($q) use ($productRequest) {
                        if ($productRequest->product_code) {
                            $q->where('product_code', $productRequest->product_code);
                        }
                    })
                    ->exists();

                if ($exists) {
                    return response()->json(['message' => 'Product already exists in database'], 400);
                }

                // Create Product
                $product = Product::create([
                    'product_name' => $productRequest->product_name,
                    'product_code' => $productRequest->product_code,
                    'category_id' => $productRequest->category_id,
                    'product_unit' => $productRequest->product_unit,
                    'is_asset' => $productRequest->is_asset,
                    'product_price' => $productRequest->product_price ?? 0,
                    'product_quantity' => 0,
                    'product_stock_alert' => 0,
                    'supplier_id' => $productRequest->supplier_id
                ]);

                // Update Request with product_id
                $productRequest->update([
                    'product_id' => $product->id
                ]);

                return response()->json([
                    'message' => 'Product successfully added to Master Data',
                    'data' => $product
                ]);
            });
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Input to Product Error: ' . $e->getMessage());
            // Return JSON error even if exception occurs
            return response()->json(['message' => 'Server Error: ' . $e->getMessage()], 500);
        }
    }

    public function verify(Request $request, $id)
    {
        // Permission check
        // abort_if(!auth()->user()->can('verify_request_products'), 403);

        $request->validate([
            'product_code' => 'required|string|max:255',
            'product_price' => 'required|numeric|min:0',
            'category_id' => 'required|exists:categories,id',
            'supplier_id' => 'required|exists:suppliers,id',
            'product_unit' => 'required|string',
            'is_asset' => 'nullable|boolean',
            'is_mandatory' => 'nullable|boolean'
        ]);

        $productRequest = ProductRequest::findOrFail($id);

        $productRequest->update([
            'product_code' => $request->product_code,
            'product_price' => $request->product_price,
            'category_id' => $request->category_id,
            'supplier_id' => $request->supplier_id,
            'product_unit' => $request->product_unit,
            'is_asset' => $request->has('is_asset') ? $request->is_asset : $productRequest->is_asset,
            'is_mandatory' => $request->has('is_mandatory') ? $request->is_mandatory : $productRequest->is_mandatory,
            'is_verify' => $request->boolean('is_verify'),
            // 'verified_at' => $request->boolean('is_verify') ? now() : null,
            // 'verified_by' => $request->boolean('is_verify') ? auth()->id() : null,
        ]);

        return response()->json([
            'message' => 'Product Request verified successfully',
            'data' => $productRequest
        ]);
    }

    public function apiStats()
    {
        $totalRequests = ProductRequest::count();
        $totalPending = ProductRequest::whereIn('status', ['Pending', 'pending'])->count();
        $totalApproved = ProductRequest::whereIn('status', ['Approved', 'approved'])->count();
        $totalRejected = ProductRequest::whereIn('status', ['Rejected', 'rejected'])->count();
        $totalVerified = ProductRequest::where('is_verify', 1)->count();
        $totalUnverified = ProductRequest::where(function ($q) {
            $q->whereNull('is_verify')->orWhere('is_verify', 0);
        })->count();
        $totalInput = ProductRequest::whereNotNull('product_id')->count();
        $totalNotInput = ProductRequest::whereNull('product_id')->count();

        return response()->json([
            'total_requests' => $totalRequests,
            'total_pending' => $totalPending,
            'total_approved' => $totalApproved,
            'total_rejected' => $totalRejected,
            'total_verified' => $totalVerified,
            'total_unverified' => $totalUnverified,
            'total_input' => $totalInput,
            'total_not_input' => $totalNotInput
        ]);
    }
}
