<?php

namespace Modules\Product\Http\Controllers;

use Modules\Product\DataTables\ProductDataTable;
use Illuminate\Contracts\Support\Renderable;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Modules\Product\Entities\Product;
use Modules\Product\Http\Requests\StoreProductRequest;
use Modules\Product\Http\Requests\UpdateProductRequest;
use Modules\Upload\Entities\Upload;

class ProductController extends Controller
{

    public function index(ProductDataTable $dataTable)
    {
        abort_if(Gate::denies('access_products'), 403);
        // Logic adapted to support product_id matching
        $user = auth()->user();
        $query = \Modules\Product\Entities\Product::query();

        $userCategories = $user->categories;
        $userProducts = $user->products;

        if ($userCategories->isNotEmpty() || $userProducts->isNotEmpty()) {
            $query->where(function ($q) use ($userCategories, $userProducts) {
                if ($userCategories->isNotEmpty()) {
                    $q->whereIn('category_id', $userCategories->pluck('id'));
                }
                if ($userProducts->isNotEmpty()) {
                    $q->orWhereIn('id', $userProducts->pluck('id'));
                }
            });
        } else if (!$user->hasRole('Super Admin')) {
            // Regular user with no permissions = see nothing
            $query->whereRaw('1=0');
        }

        $products = $query->get();

        return $dataTable->render('product::products.index', compact('products'));
    }


    public function create()
    {
        abort_if(Gate::denies('create_products'), 403);
        $suppliers = \Modules\People\Entities\Supplier::all();

        return view('product::products.create', compact('suppliers'));
    }


    public function store(StoreProductRequest $request)
    {
        $product = Product::create($request->except('document'));

        if ($request->has('document')) {
            foreach ($request->input('document', []) as $file) {
                $product->addMedia(Storage::path('temp/dropzone/' . $file))->toMediaCollection('images');
            }
        }

        toast('Product Created!', 'success');

        return redirect()->route('products.index');
    }


    public function show(Product $product)
    {
        abort_if(Gate::denies('show_products'), 403);

        return view('product::products.show', compact('product'));
    }


    public function edit(Product $product)
    {
        abort_if(Gate::denies('edit_products'), 403);
        $suppliers = \Modules\People\Entities\Supplier::all();

        return view('product::products.edit', compact('product', 'suppliers'));
    }


    public function update(UpdateProductRequest $request, Product $product)
    {
        $product->update($request->except('document'));

        if ($request->has('document')) {
            if (count($product->getMedia('images')) > 0) {
                foreach ($product->getMedia('images') as $media) {
                    if (!in_array($media->file_name, $request->input('document', []))) {
                        $media->delete();
                    }
                }
            }

            $media = $product->getMedia('images')->pluck('file_name')->toArray();

            foreach ($request->input('document', []) as $file) {
                if (count($media) === 0 || !in_array($file, $media)) {
                    $product->addMedia(Storage::path('temp/dropzone/' . $file))->toMediaCollection('images');
                }
            }
        }

        toast('Product Updated!', 'info');

        return redirect()->route('products.index');
    }


    public function destroy(Product $product)
    {
        abort_if(Gate::denies('delete_products'), 403);

        $product->delete();

        toast('Product Deleted!', 'warning');

        return redirect()->route('products.index');
    }

    // ========== API Methods ==========

    public function getFormData()
    {
        $categories = \Modules\Product\Entities\Category::all();
        $units = \Modules\Setting\Entities\Unit::all();
        $suppliers = \Modules\People\Entities\Supplier::all();

        return response()->json([
            'categories' => $categories,
            'units' => $units,
            'suppliers' => $suppliers
        ]);
    }

    public function apiIndex(Request $request)
    {
        // Start query
        $query = Product::with(['category', 'supplier']);

        // Search logic
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                    ->orWhere('product_code', 'like', "%{$search}%");
            });
        }

        // Category filter
        if ($categoryId = $request->query('category_id')) {
            if ($categoryId !== 'all') {
                $query->where('category_id', $categoryId);
            }
        }

        // Asset filter
        if ($isAsset = $request->query('is_asset')) {
            if ($isAsset !== 'all') {
                $query->where('is_asset', $isAsset);
            }
        }

        // Pagination
        $products = $query->orderBy('id', 'desc')->paginate(10); // 10 items per page, frontend expects pagination object

        return response()->json($products); // paginate() returns the structure with data, current_page, etc.
    }

    public function apiStore(Request $request)
    {
        $request->validate([
            'product_name' => 'required|string',
            'category_id' => 'required|exists:categories,id',
            'product_price' => 'required|numeric|min:0',
            // 'product_quantity' => 'required|numeric|min:0',
            'supplier_id' => 'nullable|exists:suppliers,id',
        ]);

        $data = $request->only([
            'product_name',
            'product_code',
            'category_id',
            'product_price',
            // 'product_quantity',
            // 'product_stock_alert',
            'product_unit',
            'product_note',
            'is_asset',
            'is_mandatory',
            'supplier_id'
        ]);
        $data['product_quantity'] = $request->product_quantity ?? 0;
        $data['product_stock_alert'] = $request->product_stock_alert ?? 0;

        $product = Product::create($data);

        return response()->json([
            'message' => 'Product created successfully',
            'data' => $product
        ], 201);
    }

    public function apiUpdate(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $request->validate([
            'product_name' => 'required|string',
            'category_id' => 'required|exists:categories,id',
            'product_price' => 'required|numeric|min:0',
            // 'product_quantity' => 'required|numeric|min:0',
            'supplier_id' => 'nullable|exists:suppliers,id',
        ]);

        $data = $request->only([
            'product_name',
            'product_code',
            'category_id',
            'product_price',
            'product_quantity',
            'product_stock_alert',
            'product_unit',
            'product_note',
            'is_asset',
            'is_mandatory',
            'supplier_id'
        ]);

        $product->update($data);

        return response()->json([
            'message' => 'Product updated successfully',
            'data' => $product
        ]);
    }

    public function apiDestroy($id)
    {
        $product = Product::findOrFail($id);
        $product->delete();

        return response()->json([
            'message' => 'Product deleted successfully'
        ]);
    }
    public function apiStats()
    {
        $totalProducts = Product::count();
        $totalAssets = Product::where('is_asset', 1)->count();
        $totalMandatory = Product::where('is_mandatory', 1)->count();
        $totalZeroPrice = Product::where(function ($q) {
            $q->whereNull('product_price')->orWhere('product_price', 0);
        })->count();
        $totalNoSupplier = Product::whereNull('supplier_id')->count();
        $totalNoUom = Product::where(function ($q) {
            $q->whereNull('product_unit')->orWhere('product_unit', '');
        })->count();

        return response()->json([
            'total_products' => $totalProducts,
            'total_assets' => $totalAssets,
            'total_mandatory' => $totalMandatory,
            'total_zero_price' => $totalZeroPrice,
            'total_no_supplier' => $totalNoSupplier,
            'total_no_uom' => $totalNoUom
        ]);
    }
}
