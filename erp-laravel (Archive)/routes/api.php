<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware('auth:api')->get('/user', function (Request $request) {
    $user = $request->user();
    $permissions = $user->getAllPermissions()->pluck('name');
    $roles = $user->getRoleNames();

    return array_merge($user->toArray(), [
        'permissions' => $permissions,
        'role_names' => $roles,
        'categories' => $user->categories,
        'products' => $user->products
    ]);
});

Route::post('/login', function (Request $request) {
    $credentials = $request->validate([
        'email' => 'required|email',
        'password' => 'required',
    ]);

    if (Auth::attempt($credentials)) {
        $user = Auth::user();

        if ($user->is_active != 1) {
            return response()->json(['message' => 'Your account is deactivated! Please contact with Super Admin.'], 403);
        }

        $user->load('categories');
        $permissions = $user->getAllPermissions()->pluck('name');
        $roles = $user->getRoleNames();

        return response()->json([
            'message' => 'Login successful',
            'user' => array_merge($user->toArray(), [
                'permissions' => $permissions,
                'role_names' => $roles,
                'categories' => $user->categories
            ]),
        ]);
    }

    return response()->json(['message' => 'Invalid credentials'], 401);
});

// Dashboard Stats Routes
Route::get('/home/stats', [App\Http\Controllers\HomeController::class, 'totalBudgetPurchase']);
Route::get('/home/chart/target-vs-purchase', [App\Http\Controllers\HomeController::class, 'targetVsPurchaseChart']);
Route::get('/home/chart/budget-purchases', [App\Http\Controllers\HomeController::class, 'budgetPurchasesChart']);
Route::get('/home/chart/budget-department', [App\Http\Controllers\HomeController::class, 'budgetByDepartmentChart']);
Route::get('/home/chart/budget-category', [App\Http\Controllers\HomeController::class, 'budgetByCategoryChart']);
Route::get('/home/pending-purchases', [App\Http\Controllers\HomeController::class, 'pendingPurchasesList']);

// User Management API
Route::get('/users', function (Request $request) {
    $query = \App\Models\User::with(['department', 'roles', 'media', 'categories', 'products']);

    if ($search = $request->get('search')) {
        $query->where(function ($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%");
        });
    }

    $users = $query->paginate(10);

    return response()->json($users);
});

Route::get('/users/form-data', function () {
    $departments = \Modules\Department\Entities\Departments::select('id', 'department_name')->get();
    $roles = \Spatie\Permission\Models\Role::select('id', 'name')->get();
    $categories = \Modules\Product\Entities\Category::select('id', 'category_name')->get();
    // Fetch products for assignment
    $products = \Modules\Product\Entities\Product::select('id', 'product_name', 'product_code')->get();

    return response()->json([
        'departments' => $departments,
        'roles' => $roles,
        'categories' => $categories,
        'products' => $products
    ]);
});

Route::get('/budgeting/form-data', function (Request $request) {
    $departments = \Modules\Department\Entities\Departments::select('id', 'department_name')->get();

    // Check if Direksi (ID 0) is already in the list, if not add it
    if (!$departments->contains('id', 0)) {
        // Collect results into an array to prepend easily
        $deptArray = $departments->toArray();
        array_unshift($deptArray, ['id' => 0, 'department_name' => 'Direksi']);
        $departments = $deptArray;
    }

    $categories = \Modules\Product\Entities\Category::all();
    $suppliers = \Modules\People\Entities\Supplier::all();

    // Query Produk
    $productsQuery = \Modules\Product\Entities\Product::with('category')->select('id', 'product_name', 'product_code', 'product_price', 'product_unit', 'is_asset', 'is_mandatory', 'category_id');

    // Filter by User's Categories or Products if user_id is provided
    if ($userId = $request->query('user_id')) {
        $user = \App\Models\User::with(['categories', 'products', 'roles'])->find($userId);
        if ($user) {
            $userCategories = $user->categories;
            $userProducts = $user->products;

            if ($userCategories->isNotEmpty() || $userProducts->isNotEmpty()) {
                // If user has specific categories OR products assigned
                $productsQuery->where(function ($q) use ($userCategories, $userProducts) {
                    if ($userCategories->isNotEmpty()) {
                        $q->whereIn('category_id', $userCategories->pluck('id'));
                    }
                    if ($userProducts->isNotEmpty()) {
                        $q->orWhereIn('id', $userProducts->pluck('id'));
                    }
                });
            } else if (!$user->hasRole('Super Admin')) {
                // Regular user with no categories AND no products assigned = see nothing
                $productsQuery->whereRaw('1=0');
            }
            // Super Admin with NO categories/products assigned = see everything
        }
    }

    $products = $productsQuery->get();

    $ppns = \Modules\Setting\Entities\Ppn::all();
    $pphs = \Modules\Setting\Entities\Pph::all();
    $currencies = \Modules\Currency\Entities\Currency::all();

    return response()->json([
        'departments' => $departments,
        'categories' => $categories,
        'suppliers' => $suppliers,
        'products' => $products,
        'ppns' => $ppns,
        'pphs' => $pphs,
        'currencies' => $currencies
    ]);
});

Route::post(
    '/users',
    function (Request $request) {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|max:255|unique:users,email',
                'password' => 'required|string|min:8|max:255', // Password confirmation handled in frontend validation if needed
                'department_id' => 'nullable|exists:departments,id',
                'role' => 'required|exists:roles,name',
                'is_active' => 'boolean'
            ]);

            $user = \App\Models\User::create([
                'department_id' => $request->department_id,
                'name' => $request->name,
                'email' => $request->email,
                'password' => \Illuminate\Support\Facades\Hash::make($request->password),
                'is_active' => $request->is_active ?? 1,
            ]);

            $user->assignRole($request->role);

            if ($request->has('categories')) {
                $user->categories()->sync($request->categories);
            }

            if ($request->has('products')) {
                $user->products()->sync($request->products);
            }


            return response()->json(['message' => 'User created successfully', 'user' => $user], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Server Error: ' . $e->getMessage()], 500);
        }
    }
);

Route::put('/users/{id}', function (Request $request, $id) {
    try {
        $user = \App\Models\User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $id,
            'password' => 'nullable|string|min:8|max:255',
            'department_id' => 'nullable|exists:departments,id',
            'role' => 'required|exists:roles,name',
            'is_active' => 'boolean'
        ]);

        $updateData = [
            'department_id' => $request->department_id,
            'name' => $request->name,
            'email' => $request->email,
            'is_active' => $request->is_active ?? 1,
        ];

        if ($request->filled('password')) {
            $updateData['password'] = \Illuminate\Support\Facades\Hash::make($request->password);
        }

        $user->update($updateData);

        if ($request->has('role')) {
            $user->syncRoles([$request->role]);
        }

        if ($request->has('categories')) {
            $user->categories()->sync($request->categories);
        }

        if ($request->has('products')) {
            $user->products()->sync($request->products);
        }

        return response()->json(['message' => 'User updated successfully', 'user' => $user]);
    } catch (\Illuminate\Validation\ValidationException $e) {
        return response()->json(['errors' => $e->errors()], 422);
    } catch (\Exception $e) {
        return response()->json(['message' => 'Server Error: ' . $e->getMessage()], 500);
    }
});

Route::delete('/users/{id}', function ($id) {
    try {
        $user = \App\Models\User::findOrFail($id);

        // Prevent deleting self? Or Super Admin? 
        // For now, let's just allow it but maybe prevent deleting ID 1 if needed.
        if ($user->id === 1) {
            return response()->json(['message' => 'Cannot delete the main Administrator account.'], 403);
        }

        $user->delete();
        return response()->json(['message' => 'User deleted successfully']);
    } catch (\Exception $e) {
        return response()->json(['message' => 'Server Error: ' . $e->getMessage()], 500);
    }
});

// --- ROLES & PERMISSIONS ---

// Get Roles
Route::get('/roles', function (Request $request) {
    try {
        $roles = \Spatie\Permission\Models\Role::with('permissions')
            ->where('name', '!=', 'Super Admin')
            ->orderBy('id', 'desc')->get();
        return response()->json(['data' => $roles]);
    } catch (\Exception $e) {
        return response()->json(['message' => $e->getMessage()], 500);
    }
});

// Get Permissions
Route::get('/permissions', function () {
    $permissions = \Spatie\Permission\Models\Permission::all();
    return response()->json(['data' => $permissions]);
});

// Create Role
Route::post('/roles', function (Request $request) {
    $request->validate([
        'name' => 'required|unique:roles,name',
        'permissions' => 'array'
    ]);

    $role = \Spatie\Permission\Models\Role::create(['name' => $request->name]);

    if ($request->has('permissions')) {
        $role->syncPermissions($request->permissions);
    }

    return response()->json(['message' => 'Role created successfully', 'data' => $role], 201);
});

// Update Role
Route::put('/roles/{id}', function (Request $request, $id) {
    $role = \Spatie\Permission\Models\Role::findOrFail($id);

    $request->validate([
        'name' => 'required|unique:roles,name,' . $role->id,
        'permissions' => 'array'
    ]);

    $role->update(['name' => $request->name]);

    if ($request->has('permissions')) {
        $role->syncPermissions($request->permissions);
    }

    return response()->json(['message' => 'Role updated successfully', 'data' => $role]);
});

// --- MASTER DATA ---

// 1. Currencies
Route::get('/currencies', function () {
    $data = \Modules\Currency\Entities\Currency::orderBy('id', 'desc')->get();
    return response()->json(['data' => $data]);
});

Route::post('/currencies', function (Request $request) {
    $request->validate([
        'currency_name' => 'required|string',
        'code' => 'required|string',
        'symbol' => 'required|string',
        'thousand_separator' => 'required|string',
        'decimal_separator' => 'required|string',
        'exchange_rate' => 'nullable|numeric'
    ]);

    $currency = \Modules\Currency\Entities\Currency::create([
        'currency_name' => $request->currency_name,
        'code' => Str::upper($request->code),
        'symbol' => $request->symbol,
        'thousand_separator' => $request->thousand_separator,
        'decimal_separator' => $request->decimal_separator,
        'exchange_rate' => $request->exchange_rate
    ]);

    return response()->json(['message' => 'Currency created', 'data' => $currency], 201);
});

Route::put('/currencies/{id}', function (Request $request, $id) {
    $currency = \Modules\Currency\Entities\Currency::findOrFail($id);
    $request->validate([
        'currency_name' => 'required|string',
        'code' => 'required|string',
        'symbol' => 'required|string',
        'thousand_separator' => 'required|string',
        'decimal_separator' => 'required|string',
        'exchange_rate' => 'nullable|numeric'
    ]);

    $currency->update([
        'currency_name' => $request->currency_name,
        'code' => Str::upper($request->code),
        'symbol' => $request->symbol,
        'thousand_separator' => $request->thousand_separator,
        'decimal_separator' => $request->decimal_separator,
        'exchange_rate' => $request->exchange_rate
    ]);

    return response()->json(['message' => 'Currency updated', 'data' => $currency]);
});

Route::delete('/currencies/{id}', function ($id) {
    \Modules\Currency\Entities\Currency::findOrFail($id)->delete();
    return response()->json(['message' => 'Currency deleted']);
});

// 2. Units
Route::get('/units', function () {
    $data = \Modules\Setting\Entities\Unit::orderBy('id', 'desc')->get();
    return response()->json(['data' => $data]);
});

Route::post('/units', function (Request $request) {
    $request->validate(['name' => 'required', 'short_name' => 'required']);
    $unit = \Modules\Setting\Entities\Unit::create($request->all());
    return response()->json(['message' => 'Unit created', 'data' => $unit], 201);
});

Route::put('/units/{id}', function (Request $request, $id) {
    $request->validate(['name' => 'required', 'short_name' => 'required']);
    $unit = \Modules\Setting\Entities\Unit::findOrFail($id);
    $unit->update($request->all());
    return response()->json(['message' => 'Unit updated', 'data' => $unit]);
});

Route::delete('/units/{id}', function ($id) {
    \Modules\Setting\Entities\Unit::findOrFail($id)->delete();
    return response()->json(['message' => 'Unit deleted']);
});

// 3. Product Categories
Route::get('/product-categories', function () {
    $data = \Modules\Product\Entities\Category::withCount('products')->orderBy('id', 'desc')->get();
    return response()->json(['data' => $data]);
});

Route::post('/product-categories', function (Request $request) {
    $request->validate([
        'category_code' => 'required|unique:categories,category_code',
        'category_name' => 'required'
    ]);
    $cat = \Modules\Product\Entities\Category::create($request->only(['category_code', 'category_name']));
    return response()->json(['message' => 'Category created', 'data' => $cat], 201);
});

Route::get('/product-categories/{id}', function ($id) {
    try {
        $cat = \Modules\Product\Entities\Category::with('products')->findOrFail($id);

        // Return structured data for flexibility
        return response()->json([
            'success' => true,
            'data' => $cat,
            'products' => $cat->products,
            'category' => $cat
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => $e->getMessage()
        ], 404);
    }
});

Route::put('/product-categories/{id}', function (Request $request, $id) {
    $cat = \Modules\Product\Entities\Category::findOrFail($id);
    $request->validate([
        'category_code' => 'required|unique:categories,category_code,' . $id,
        'category_name' => 'required'
    ]);
    $cat->update($request->only(['category_code', 'category_name']));
    return response()->json(['message' => 'Category updated', 'data' => $cat]);
});

Route::delete('/product-categories/{id}', function ($id) {
    $cat = \Modules\Product\Entities\Category::findOrFail($id);
    if ($cat->products()->exists()) {
        return response()->json(['message' => 'Cannot delete category with associated products'], 400);
    }
    $cat->delete();
    return response()->json(['message' => 'Category deleted']);
});



Route::get('/suppliers/form-data', function () {
    return response()->json([
        'ppns' => \Modules\Setting\Entities\Ppn::select('id', 'name', 'rate')->get(),
        'pphs' => \Modules\Setting\Entities\Pph::select('id', 'name', 'rate')->get(),
        'currencies' => \Modules\Currency\Entities\Currency::select('id', 'code', 'currency_name', 'symbol')->get()
    ]);
});

// 7. PPN (VAT)
Route::get('/ppn', function () {
    $data = \Modules\Setting\Entities\Ppn::orderBy('id', 'desc')->get();
    return response()->json(['data' => $data]);
});

Route::post('/ppn', function (Request $request) {
    $request->validate(['name' => 'required', 'rate' => 'required|numeric']);
    $ppn = \Modules\Setting\Entities\Ppn::create($request->all());
    return response()->json(['message' => 'PPN created', 'data' => $ppn], 201);
});

Route::put('/ppn/{id}', function (Request $request, $id) {
    $request->validate(['name' => 'required', 'rate' => 'required|numeric']);
    $ppn = \Modules\Setting\Entities\Ppn::findOrFail($id);
    $ppn->update($request->all());
    return response()->json(['message' => 'PPN updated', 'data' => $ppn]);
});

Route::delete('/ppn/{id}', function ($id) {
    \Modules\Setting\Entities\Ppn::findOrFail($id)->delete();
    return response()->json(['message' => 'PPN deleted']);
});

// 8. PPH (Income Tax)
Route::get('/pph', function () {
    $data = \Modules\Setting\Entities\Pph::orderBy('id', 'desc')->get();
    return response()->json(['data' => $data]);
});

Route::post('/pph', function (Request $request) {
    $request->validate(['name' => 'required', 'rate' => 'required|numeric']);
    $pph = \Modules\Setting\Entities\Pph::create($request->all());
    return response()->json(['message' => 'PPH created', 'data' => $pph], 201);
});

Route::put('/pph/{id}', function (Request $request, $id) {
    $request->validate(['name' => 'required', 'rate' => 'required|numeric']);
    $pph = \Modules\Setting\Entities\Pph::findOrFail($id);
    $pph->update($request->all());
    return response()->json(['message' => 'PPH updated', 'data' => $pph]);
});

Route::delete('/pph/{id}', function ($id) {
    \Modules\Setting\Entities\Pph::findOrFail($id)->delete();
    return response()->json(['message' => 'PPH deleted']);
});

Route::get('/suppliers', [\Modules\People\Http\Controllers\SuppliersController::class, 'apiIndex']);
Route::post('/suppliers', [\Modules\People\Http\Controllers\SuppliersController::class, 'store']);
Route::put('/suppliers/{supplier}', [\Modules\People\Http\Controllers\SuppliersController::class, 'update']);
Route::delete('/suppliers/{supplier}', [\Modules\People\Http\Controllers\SuppliersController::class, 'destroy']);



// 5. Departments
Route::get('/departments', function () {
    $data = \Modules\Department\Entities\Departments::orderBy('id', 'desc')->get();
    return response()->json(['data' => $data]);
});

Route::post('/departments', function (Request $request) {
    $request->validate([
        'department_code' => 'required|unique:departments,department_code',
        'department_name' => 'required'
    ]);
    $dept = \Modules\Department\Entities\Departments::create($request->all());
    return response()->json(['message' => 'Department created', 'data' => $dept], 201);
});

Route::put('/departments/{id}', function (Request $request, $id) {
    $dept = \Modules\Department\Entities\Departments::findOrFail($id);
    $request->validate([
        'department_code' => 'required|unique:departments,department_code,' . $id,
        'department_name' => 'required'
    ]);
    $dept->update($request->all());
    return response()->json(['message' => 'Department updated', 'data' => $dept]);
});

Route::delete('/departments/{id}', function ($id) {
    \Modules\Department\Entities\Departments::findOrFail($id)->delete();
    return response()->json(['message' => 'Department deleted']);
});

// 6. Approval Settings
Route::get('/approval-types', function () {
    $data = \Modules\Approval\Entities\ApprovalType::orderBy('id', 'desc')->get();
    return response()->json(['data' => $data]);
});

Route::post('/approval-types', function (Request $request) {
    $request->validate([
        'approval_code' => 'required|unique:approval_types,approval_code',
        'approval_name' => 'required',
    ]);
    $type = \Modules\Approval\Entities\ApprovalType::create($request->all());
    return response()->json(['message' => 'Type created', 'data' => $type], 201);
});

Route::put('/approval-types/{id}', function (Request $request, $id) {
    $type = \Modules\Approval\Entities\ApprovalType::findOrFail($id);
    $request->validate([
        'approval_code' => 'required|unique:approval_types,approval_code,' . $id,
        'approval_name' => 'required',
    ]);
    $type->update($request->all());
    return response()->json(['message' => 'Type updated', 'data' => $type]);
});

Route::delete('/approval-types/{id}', function ($id) {
    \Modules\Approval\Entities\ApprovalType::findOrFail($id)->delete();
    return response()->json(['message' => 'Type deleted']);
});

Route::get('/approval-rules', function () {
    $data = \Modules\Approval\Entities\ApprovalRule::with(['type', 'levels.users.user'])->orderBy('id', 'desc')->get();
    return response()->json(['data' => $data]);
});

Route::post('/approval-rules', function (Request $request) {
    $request->validate([
        'approval_types_id' => 'required|exists:approval_types,id',
        'rule_name' => 'nullable|string|max:255',
        'is_active' => 'nullable|boolean',
        'levels' => 'nullable|array',
    ]);

    DB::beginTransaction();
    try {
        $rule = \Modules\Approval\Entities\ApprovalRule::create([
            'approval_types_id' => $request->approval_types_id,
            'rule_name' => $request->rule_name,
            'is_active' => $request->is_active ?? 1,
        ]);

        if ($request->has('levels') && is_array($request->levels)) {
            foreach ($request->levels as $lvl) {
                $level = \Modules\Approval\Entities\ApprovalRuleLevel::create([
                    'approval_rules_id' => $rule->id,
                    'level' => $lvl['level'],
                    'amount_limit' => $lvl['amount_limit'] ?? 0,
                    'is_active' => 1,
                ]);

                if (!empty($lvl['pairs']) && is_array($lvl['pairs'])) {
                    foreach ($lvl['pairs'] as $pairIdx => $pair) {
                        if (!empty($pair['requester']) && is_array($pair['requester'])) {
                            foreach ($pair['requester'] as $uid) {
                                \Modules\Approval\Entities\ApprovalRuleUser::create([
                                    'approval_rule_levels_id' => $level->id,
                                    'user_id' => $uid,
                                    'role' => 'requester',
                                    'sequence' => $pairIdx,
                                ]);
                            }
                        }
                        if (!empty($pair['approver']) && is_array($pair['approver'])) {
                            foreach ($pair['approver'] as $uid) {
                                \Modules\Approval\Entities\ApprovalRuleUser::create([
                                    'approval_rule_levels_id' => $level->id,
                                    'user_id' => $uid,
                                    'role' => 'approver',
                                    'sequence' => $pairIdx,
                                ]);
                            }
                        }
                    }
                }
            }
        }
        DB::commit();
        return response()->json(['message' => 'Rule created', 'data' => $rule], 201);
    } catch (\Exception $e) {
        DB::rollBack();
        return response()->json(['message' => $e->getMessage()], 500);
    }
});

Route::put('/approval-rules/{id}', function (Request $request, $id) {
    $rule = \Modules\Approval\Entities\ApprovalRule::findOrFail($id);
    $request->validate([
        'approval_types_id' => 'required|exists:approval_types,id',
        'rule_name' => 'nullable|string|max:255',
        'is_active' => 'nullable|boolean',
        'levels' => 'nullable|array',
    ]);

    DB::beginTransaction();
    try {
        $rule->update([
            'approval_types_id' => $request->approval_types_id,
            'rule_name' => $request->rule_name,
            'is_active' => $request->is_active ?? 1,
        ]);

        foreach ($rule->levels as $lvl) {
            $lvl->users()->delete();
        }
        $rule->levels()->delete();

        if ($request->has('levels') && is_array($request->levels)) {
            foreach ($request->levels as $lvl) {
                $level = \Modules\Approval\Entities\ApprovalRuleLevel::create([
                    'approval_rules_id' => $rule->id,
                    'level' => $lvl['level'],
                    'amount_limit' => $lvl['amount_limit'] ?? 0,
                    'is_active' => 1,
                ]);

                if (!empty($lvl['pairs']) && is_array($lvl['pairs'])) {
                    foreach ($lvl['pairs'] as $pairIdx => $pair) {
                        if (!empty($pair['requester']) && is_array($pair['requester'])) {
                            foreach ($pair['requester'] as $uid) {
                                \Modules\Approval\Entities\ApprovalRuleUser::create([
                                    'approval_rule_levels_id' => $level->id,
                                    'user_id' => $uid,
                                    'role' => 'requester',
                                    'sequence' => $pairIdx,
                                ]);
                            }
                        }
                        if (!empty($pair['approver']) && is_array($pair['approver'])) {
                            foreach ($pair['approver'] as $uid) {
                                \Modules\Approval\Entities\ApprovalRuleUser::create([
                                    'approval_rule_levels_id' => $level->id,
                                    'user_id' => $uid,
                                    'role' => 'approver',
                                    'sequence' => $pairIdx,
                                ]);
                            }
                        }
                    }
                }
            }
        }
        DB::commit();
        return response()->json(['message' => 'Rule updated']);
    } catch (\Exception $e) {
        DB::rollBack();
        return response()->json(['message' => $e->getMessage()], 500);
    }
});

Route::delete('/approval-rules/{id}', function ($id) {
    \Modules\Approval\Entities\ApprovalRule::findOrFail($id)->delete();
    return response()->json(['message' => 'Rule deleted']);
});

Route::get('/approval-rules/form-data', function () {
    return response()->json([
        'types' => \Modules\Approval\Entities\ApprovalType::all(),
        'users' => \App\Models\User::all(),
    ]);
});


Route::get('/master-budgets', function (Request $request) {
    $activeStatus = $request->query('status', 'all');
    $year = $request->query('year');
    $query = \Modules\Budget\Entities\MasterBudget::with(['department', 'details', 'approvalRequest.logs.user', 'targetSale']);

    if ($activeStatus !== 'all') {
        $query->where('status', strtolower($activeStatus));
    }

    if ($year) {
        $query->whereYear('tgl_penyusunan', $year);
    }

    return response()->json(['data' => $query->orderBy('tgl_penyusunan', 'desc')->get()]);
});

Route::post('/master-budgets', function (Request $request) {
    $request->validate([
        'tgl_penyusunan' => 'required|date',
        'bulan' => 'required',
        // 'periode_awal' => 'required|date',
        // 'periode_akhir' => 'required|date',
        'department_id' => 'required',
        'grandtotal' => 'required|numeric',
        'description' => 'nullable|string',
        'is_mandatory' => 'nullable|boolean',
        'items' => 'nullable|array',
        'target_sales_id' => 'nullable|exists:target_sales,id',
        'target_sales_amount' => 'nullable|numeric',
        'total_percentage' => 'nullable|numeric',
    ]);

    // Auto-calculate period dates
    $dateObj = \Carbon\Carbon::parse($request->tgl_penyusunan);
    $year = $dateObj->year;
    $month = $request->bulan;
    $calculatedStart = \Carbon\Carbon::createFromDate($year, $month, 1)->startOfMonth()->format('Y-m-d');
    $calculatedEnd = \Carbon\Carbon::createFromDate($year, $month, 1)->endOfMonth()->format('Y-m-d');

    DB::beginTransaction();
    try {
        // Generate number
        $lastBudget = \Modules\Budget\Entities\MasterBudget::orderBy('id', 'desc')->first();
        $nextNumber = $lastBudget ? (int) str_replace('BDGT', '', $lastBudget->no_budgeting) + 1 : 1;
        $noBudgeting = 'BDGT' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);

        $master = \Modules\Budget\Entities\MasterBudget::create([
            'no_budgeting' => $noBudgeting,
            'tgl_penyusunan' => $request->tgl_penyusunan,
            'bulan' => $request->bulan,
            'periode_awal' => $calculatedStart,
            'periode_akhir' => $calculatedEnd,
            'department_id' => $request->department_id,
            'description' => $request->description,
            'grandtotal' => $request->grandtotal,
            'status' => 'Pending',
            'is_mandatory' => $request->is_mandatory ?? false,
            'used_amount' => 0,
            'reserved_amount' => 0,
            'target_sales_id' => $request->target_sales_id,
            'target_sales_amount' => $request->target_sales_amount,
            'total_percentage' => $request->total_percentage,
        ]);

        if ($request->has('items')) {
            foreach ($request->items as $item) {
                \Modules\Budget\Entities\BudgetDetail::create([
                    'master_budget_id' => $master->id,
                    'category_id' => $item['category_id'] ?? null,
                    'category_name' => $item['category_name'] ?? null,
                    'budget' => $item['budget'] ?? 0,
                    'percentage' => $item['percentage'] ?? 0,
                ]);
            }
        }


        // Create Approval Request
        $type = \Modules\Approval\Entities\ApprovalType::where('approval_code', 'Budget')->first();
        if ($type) {
            app(\Modules\Approval\Services\ApprovalEngine::class)->createRequest(
                \Modules\Budget\Entities\MasterBudget::class,
                $master->id,
                $type->id,
                $master->grandtotal,
                auth()->id() ?? $request->input('user_id', 1)
            );
        }

        DB::commit();
        return response()->json(['message' => 'Budget created', 'data' => $master], 201);
    } catch (\Exception $e) {
        DB::rollBack();
        return response()->json(['message' => $e->getMessage()], 500);
    }
});

Route::put('/master-budgets/{id}', function (Request $request, $id) {
    $master = \Modules\Budget\Entities\MasterBudget::findOrFail($id);

    if (strtolower($master->status) !== 'pending') {
        return response()->json(['message' => 'Hanya Master Budget dengan status "Pending" yang dapat diedit.'], 403);
    }

    $request->validate([
        'tgl_penyusunan' => 'required|date',
        'bulan' => 'required',
        // 'periode_awal' => 'required|date',
        // 'periode_akhir' => 'required|date',
        'department_id' => 'required',
        'grandtotal' => 'required|numeric',
        'description' => 'nullable|string',
        'is_mandatory' => 'nullable|boolean',
        'items' => 'nullable|array',
        'target_sales_id' => 'nullable|exists:target_sales,id',
        'target_sales_amount' => 'nullable|numeric',
        'total_percentage' => 'nullable|numeric',
    ]);

    // Auto-calculate period dates
    $dateObj = \Carbon\Carbon::parse($request->tgl_penyusunan);
    $year = $dateObj->year;
    $month = $request->bulan;
    $calculatedStart = \Carbon\Carbon::createFromDate($year, $month, 1)->startOfMonth()->format('Y-m-d');
    $calculatedEnd = \Carbon\Carbon::createFromDate($year, $month, 1)->endOfMonth()->format('Y-m-d');

    DB::beginTransaction();
    try {
        $master->update([
            'tgl_penyusunan' => $request->tgl_penyusunan,
            'bulan' => $request->bulan,
            'periode_awal' => $calculatedStart,
            'periode_akhir' => $calculatedEnd,
            'department_id' => $request->department_id,
            'description' => $request->description,
            'grandtotal' => $request->grandtotal,
            'is_mandatory' => $request->is_mandatory ?? false,
            'target_sales_id' => $request->target_sales_id,
            'target_sales_amount' => $request->target_sales_amount,
            'total_percentage' => $request->total_percentage,
        ]);

        $master->details()->delete();
        if ($request->has('items')) {
            foreach ($request->items as $item) {
                \Modules\Budget\Entities\BudgetDetail::create([
                    'master_budget_id' => $master->id,
                    'category_id' => $item['category_id'] ?? null,
                    'category_name' => $item['category_name'] ?? null,
                    'budget' => $item['budget'] ?? 0,
                    'percentage' => $item['percentage'] ?? 0,
                ]);
            }
        }

        DB::commit();
        return response()->json(['message' => 'Budget updated']);
    } catch (\Exception $e) {
        DB::rollBack();
        return response()->json(['message' => $e->getMessage()], 500);
    }
});

Route::delete('/master-budgets/{id}', function ($id) {
    $master = \Modules\Budget\Entities\MasterBudget::findOrFail($id);
    $master->details()->delete();
    $master->delete();
    return response()->json(['message' => 'Budget deleted']);
});

Route::get('/budgeting/check-budget', function (Request $request) {
    $department_id = $request->query('department_id');
    $date = $request->query('date', now()->toDateString());
    $amount = (float) $request->query('amount', 0);
    $excludePurchaseId = $request->query('exclude_purchase_id');

    $purchaseDate = \Carbon\Carbon::parse($date);
    $month = $purchaseDate->month;
    $year = $purchaseDate->year;

    $budget = \Modules\Budget\Entities\MasterBudget::where('department_id', $department_id)
        ->where('bulan', $month)
        ->whereYear('periode_awal', $year)
        ->where('status', 'Approved')
        ->first();

    if (!$budget) {
        return response()->json([
            'sufficient' => false,
            'message' => 'Budget tidak ditemukan untuk departemen ini pada periode tersebut.',
            'remaining' => 0
        ]);
    }

    // Calculate reserved amount properly:
    // 1. Get Pending Purchases
    // 2. Sum NON-ASSET details (because is_asset is on purchase_details table)
    // 3. Subtract borrowed amount

    $pendingPurchases = \Modules\Purchase\Entities\Purchase::where('master_budget_id', $budget->id)
        ->whereIn('status', ['Pending', 'Menunggu', 'pending', 'menunggu'])
        ->when($excludePurchaseId, function ($q) use ($excludePurchaseId) {
            $q->where('id', '!=', $excludePurchaseId);
        })
        ->get();

    $pendingPurchaseIds = $pendingPurchases->pluck('id');

    // Sum NON-ASSET details sub_total
    $reservedDetails = \Modules\Purchase\Entities\PurchaseDetail::whereIn('purchase_id', $pendingPurchaseIds)
        ->where(function ($q) {
            $q->where('is_asset', 0)->orWhereNull('is_asset');
        })
        ->sum('sub_total');

    $totalBorrowed = $pendingPurchases->sum('borrowed_amount');

    $reserved = (float) $reservedDetails - (float) $totalBorrowed;

    $remaining = (float) $budget->grandtotal - (float) $budget->used_amount - $reserved;

    return response()->json([
        'sufficient' => $remaining >= $amount,
        'remaining' => $remaining,
        'budget_id' => $budget->id,
        'department_name' => $budget->department->department_name ?? 'Unknown'
    ]);
});

Route::get('/budgeting/available-budgets', function (Request $request) {
    $date = $request->query('date', now()->toDateString());
    $purchaseDate = \Carbon\Carbon::parse($date);

    $budgets = \Modules\Budget\Entities\MasterBudget::with('department')
        ->where('bulan', $purchaseDate->month)
        ->whereYear('periode_awal', $purchaseDate->year)
        ->where('status', 'Approved')
        ->get()
        ->map(function ($b) {
            return [
                'id' => $b->id,
                'no_budgeting' => $b->no_budgeting,
                'department_id' => $b->department_id,
                'department_name' => $b->department->department_name ?? 'Unknown',
                'is_mandatory' => (bool) $b->is_mandatory,
                'bulan' => $b->bulan,
                'remaining' => (float) $b->grandtotal - (float) $b->used_amount
            ];
        })
        ->values();

    return response()->json(['data' => $budgets]);
});


// Purchase & Report Routes (Reverted auth:api middleware due to session-based auth mismatch)
Route::get('/purchases', function (Request $request) {
    $activeStatus = $request->query('status', 'all');
    $departmentId = $request->query('department_id', 'all');
    $query = \Modules\Purchase\Entities\Purchase::with(['department', 'user', 'purchaseDetails.product.category', 'approvalRequest.logs.user', 'masterBudget.department', 'borrowedMasterBudget.department', 'purchaseBudgetAllocations.sourceBudgetDetail', 'purchaseBudgetAllocations.sourceMasterBudget.department']);

    // Get authenticated user
    $user = auth()->user();

    // Check if user has all_departments permission or is Super Admin
    $canViewAllDepartments = false;
    if ($user) {
        $isSuperAdmin = $user->hasRole('Super Admin');
        $hasAllDepartmentsPermission = $user->hasPermissionTo('all_departments');
        $canViewAllDepartments = $isSuperAdmin || $hasAllDepartmentsPermission;
    }

    // If user cannot view all departments, filter by their department
    if (!$canViewAllDepartments && $user && $user->department_id) {
        $query->where('department_id', $user->department_id);
    } elseif ($departmentId !== 'all') {
        // If user can view all departments and filter is set, apply it
        $query->where('department_id', $departmentId);
    }

    if ($activeStatus !== 'all') {
        $query->where('status', strtolower($activeStatus));
    }

    $results = $query->orderBy('date', 'desc')->get();

    return response()->json([
        'data' => $results,
        'can_view_all_departments' => $canViewAllDepartments,
    ]);
});

Route::post('/purchases', function (Request $request) {
    $request->validate([
        'date' => 'required|date',
        'department_id' => 'required',
        'total_amount' => 'required|numeric',
        'items' => 'required|array',
    ]);

    DB::beginTransaction();
    try {
        // 1. Prepare Category Mapping & Group Required Budget
        $productIds = collect($request->items)->pluck('product_id')->unique();
        $productsMap = \Modules\Product\Entities\Product::whereIn('id', $productIds)->get()->keyBy('id');

        $calculatedTotal = 0;
        $budgetRequiredTotal = 0;
        $mandatoryAmount = 0;
        $nonMandatoryAmount = 0;
        $budgetByCategoryMandatory = [];
        $budgetByCategoryOthers = [];

        foreach ($request->items as $item) {
            $lineTotal = ($item['price'] * $item['quantity']);
            $calculatedTotal += $lineTotal;

            $product = $productsMap->get($item['product_id']);
            $isItemMandatory = $product ? (bool) $product->is_mandatory : false;

            if ($isItemMandatory) {
                $mandatoryAmount += $lineTotal;
            } else {
                $nonMandatoryAmount += $lineTotal;
            }

            if (empty($item['is_asset'])) {
                $budgetRequiredTotal += $lineTotal;
                $catId = $product ? ($product->category_id ?? 0) : 0;
                if ($isItemMandatory) {
                    $budgetByCategoryMandatory[$catId] = ($budgetByCategoryMandatory[$catId] ?? 0) + $lineTotal;
                } else {
                    $budgetByCategoryOthers[$catId] = ($budgetByCategoryOthers[$catId] ?? 0) + $lineTotal;
                }
            }
        }

        // 2. Find Own Department's Budgets
        $purchaseDate = \Carbon\Carbon::parse($request->date);
        $baseQuery = \Modules\Budget\Entities\MasterBudget::with('details')
            ->where('department_id', $request->department_id)
            ->where('bulan', $purchaseDate->month)
            ->whereYear('periode_awal', $purchaseDate->year)
            ->where('status', 'Approved');

        $ownMandatoryBudget = (clone $baseQuery)->where('is_mandatory', true)->first();
        $ownOthersBudget = (clone $baseQuery)->where('is_mandatory', false)->first();

        $borrowedMasterBudgetId = $request->source_master_budget_id;
        $borrowedBudgetDetailId = $request->source_budget_detail_id;
        $borrowedAmountTotal = 0;
        $shortfallsPerCategory = [];
        $allocationsToCreate = [];

        // 3. Process Mandatory Item Budgets
        foreach ($budgetByCategoryMandatory as $catId => $required) {
            $budget = $ownMandatoryBudget;
            if (!$budget) {
                $borrowedAmountTotal += $required;
                $shortfallsPerCategory[$catId] = ($shortfallsPerCategory[$catId] ?? 0) + $required;
                continue;
            }
            $details = $budget->details->keyBy('category_id');
            $detail = $details->get($catId);
            $available = $detail ? (float) $detail->budget - (float) $detail->used_amount - (float) ($detail->reserved_amount ?? 0) : 0;

            if ($required > $available) {
                $shortfall = $required - $available;
                $borrowedAmountTotal += $shortfall;
                $shortfallsPerCategory[$catId] = ($shortfallsPerCategory[$catId] ?? 0) + $shortfall;
                if ($available > 0) {
                    $allocationsToCreate[] = [
                        'm_id' => $budget->id,
                        'd_id' => $detail->id,
                        'amt' => $available,
                        't_cat_id' => $catId,
                    ];
                }
            } else {
                $allocationsToCreate[] = [
                    'm_id' => $budget->id,
                    'd_id' => $detail ? $detail->id : null,
                    'amt' => $required,
                    't_cat_id' => $catId,
                ];
            }
        }

        // 4. Process Non-Mandatory Item Budgets
        foreach ($budgetByCategoryOthers as $catId => $required) {
            $budget = $ownOthersBudget;
            if (!$budget) {
                $borrowedAmountTotal += $required;
                $shortfallsPerCategory[$catId] = ($shortfallsPerCategory[$catId] ?? 0) + $required;
                continue;
            }
            $details = $budget->details->keyBy('category_id');
            $detail = $details->get($catId);
            $available = $detail ? (float) $detail->budget - (float) $detail->used_amount - (float) ($detail->reserved_amount ?? 0) : 0;

            if ($required > $available) {
                $shortfall = $required - $available;
                $borrowedAmountTotal += $shortfall;
                $shortfallsPerCategory[$catId] = ($shortfallsPerCategory[$catId] ?? 0) + $shortfall;
                if ($available > 0) {
                    $allocationsToCreate[] = [
                        'm_id' => $budget->id,
                        'd_id' => $detail->id,
                        'amt' => $available,
                        't_cat_id' => $catId,
                    ];
                }
            } else {
                $allocationsToCreate[] = [
                    'm_id' => $budget->id,
                    'd_id' => $detail ? $detail->id : null,
                    'amt' => $required,
                    't_cat_id' => $catId,
                ];
            }
        }

        // 5. Validate Borrowing
        if ($borrowedAmountTotal > 0) {
            if (!$borrowedMasterBudgetId) {
                return response()->json(['message' => 'Budget tidak mencukupi. Silahkan pilih sumber pinjaman.'], 400);
            }
            $sourceBudget = \Modules\Budget\Entities\MasterBudget::find($borrowedMasterBudgetId);
            if (!$sourceBudget)
                return response()->json(['message' => 'Budget pinjaman tidak ditemukan.'], 400);
            if ($sourceBudget->is_mandatory)
                return response()->json(['message' => 'Mandatory Budget tidak boleh dipinjam.'], 400);

            $isInternal = ($ownOthersBudget && $sourceBudget->department_id == $ownOthersBudget->department_id);

            foreach ($shortfallsPerCategory as $targetCatId => $amount) {
                $allocationsToCreate[] = [
                    'm_id' => $borrowedMasterBudgetId,
                    'd_id' => $borrowedBudgetDetailId,
                    'amt' => $amount,
                    't_cat_id' => $targetCatId,
                    'is_int' => $isInternal ? 1 : 0,
                    'is_ext' => $isInternal ? 0 : 1
                ];
            }
        }

        $purchase = \Modules\Purchase\Entities\Purchase::create([
            'date' => $request->date,
            'department_id' => $request->department_id,
            'total_amount' => $calculatedTotal,
            'budget_amount' => $budgetRequiredTotal,
            'mandatory_amount' => $mandatoryAmount,
            'non_mandatory_amount' => $nonMandatoryAmount,
            'master_budget_id' => $ownOthersBudget ? $ownOthersBudget->id : ($ownMandatoryBudget ? $ownMandatoryBudget->id : null),
            'borrowed_master_budget_id' => $borrowedMasterBudgetId,
            'borrowed_amount' => $borrowedAmountTotal,
            'status' => 'Pending',
            'users_id' => $request->users_id ?? (auth()->id() ?? 1),
        ]);

        foreach ($request->items as $item) {
            \Modules\Purchase\Entities\PurchaseDetail::create([
                'purchase_id' => $purchase->id,
                'product_id' => $item['product_id'],
                'product_name' => $item['product_name'] ?? 'Product',
                'quantity' => $item['quantity'],
                'price' => $item['price'],
                'sub_total' => $item['price'] * $item['quantity'],
                'product_code' => $item['product_code'] ?? '-',
                'product_unit' => $item['product_unit'] ?? 'Unit',
                'unit_price' => $item['price'],
                'is_asset' => $item['is_asset'] ?? false,
            ]);
        }

        foreach ($allocationsToCreate as $alloc) {
            \Modules\Purchase\Entities\PurchaseBudgetAllocation::create([
                'purchase_id' => $purchase->id,
                'purchase_detail_id' => 0,
                'source_master_budget_id' => $alloc['m_id'],
                'source_budget_detail_id' => $alloc['d_id'],
                'target_category_id' => $alloc['t_cat_id'] ?? null,
                'amount' => $alloc['amt'],
                'is_borrowed_internal' => $alloc['is_int'] ?? 0,
                'is_borrowed_external' => $alloc['is_ext'] ?? 0,
                'is_applied' => 0
            ]);
        }

        // Create Approval Request
        $type = \Modules\Approval\Entities\ApprovalType::where('approval_code', 'PR')->first();
        if ($type) {
            app(\Modules\Approval\Services\ApprovalEngine::class)->createRequest(
                \Modules\Purchase\Entities\Purchase::class,
                $purchase->id,
                $type->id,
                $purchase->total_amount,
                $request->users_id ?? (auth()->id() ?? 1)
            );
        }

        DB::commit();
        return response()->json(['message' => 'Purchase created', 'data' => $purchase], 201);
    } catch (\Exception $e) {
        DB::rollBack();
        return response()->json(['message' => $e->getMessage()], 500);
    }
});

Route::put('/purchases/{id}', function (Request $request, $id) {
    $purchase = \Modules\Purchase\Entities\Purchase::findOrFail($id);

    if (strtolower($purchase->status) !== 'pending') {
        return response()->json(['message' => 'Hanya Purchase Request dengan status "Pending" yang dapat diedit.'], 403);
    }

    $request->validate([
        'date' => 'required|date',
        'department_id' => 'required',
        'total_amount' => 'required|numeric',
        'items' => 'required|array',
    ]);

    DB::beginTransaction();

    try {
        $purchase = \Modules\Purchase\Entities\Purchase::findOrFail($id);

        // 1. Prepare Category Mapping & Group Required Budget by Mandatory Type
        $productIds = collect($request->items)->pluck('product_id')->unique();
        $productsMap = \Modules\Product\Entities\Product::whereIn('id', $productIds)->get()->keyBy('id');

        $calculatedTotal = 0;
        $budgetRequiredTotal = 0;
        $mandatoryAmount = 0;
        $nonMandatoryAmount = 0;
        $budgetByCategoryMandatory = [];
        $budgetByCategoryOthers = [];

        foreach ($request->items as $item) {
            $lineTotal = ($item['price'] * $item['quantity']);
            $calculatedTotal += $lineTotal;
            $product = $productsMap->get($item['product_id']);
            $isItemMandatory = $product ? (bool) $product->is_mandatory : false;

            if ($isItemMandatory)
                $mandatoryAmount += $lineTotal;
            else
                $nonMandatoryAmount += $lineTotal;

            if (empty($item['is_asset'])) {
                $budgetRequiredTotal += $lineTotal;
                $catId = $product ? ($product->category_id ?? 0) : 0;
                if ($isItemMandatory)
                    $budgetByCategoryMandatory[$catId] = ($budgetByCategoryMandatory[$catId] ?? 0) + $lineTotal;
                else
                    $budgetByCategoryOthers[$catId] = ($budgetByCategoryOthers[$catId] ?? 0) + $lineTotal;
            }
        }

        // 2. Find Own Department's Budgets
        $purchaseDate = \Carbon\Carbon::parse($request->date);
        $baseQuery = \Modules\Budget\Entities\MasterBudget::with('details')
            ->where('department_id', $request->department_id)
            ->where('bulan', $purchaseDate->month)
            ->whereYear('periode_awal', $purchaseDate->year)
            ->where('status', 'Approved');

        $ownMandatoryBudget = (clone $baseQuery)->where('is_mandatory', true)->first();
        $ownOthersBudget = (clone $baseQuery)->where('is_mandatory', false)->first();

        $borrowedMasterBudgetId = $request->source_master_budget_id;
        $borrowedBudgetDetailId = $request->source_budget_detail_id;
        $borrowedAmountTotal = 0;
        $shortfallsPerCategory = [];
        $allocationsToCreate = [];

        // 3. Helper to process allocations with "add back"
        $processFunc = function ($budget, $budgetByCategory, $purchase) use (&$borrowedAmountTotal, &$allocationsToCreate, &$shortfallsPerCategory) {
            if (!$budget) {
                $borrowedAmountTotal += array_sum($budgetByCategory);
                foreach ($budgetByCategory as $catId => $required) {
                    $shortfallsPerCategory[$catId] = ($shortfallsPerCategory[$catId] ?? 0) + $required;
                }
                return;
            }
            $details = $budget->details->keyBy('category_id');
            foreach ($budgetByCategory as $catId => $required) {
                $detail = $details->get($catId);
                $available = $detail ? (float) $detail->budget - (float) $detail->used_amount - (float) ($detail->reserved_amount ?? 0) : 0;

                // Add back existing allocation for this PR
                $oldAlloc = \Modules\Purchase\Entities\PurchaseBudgetAllocation::where('purchase_id', $purchase->id)
                    ->where('source_master_budget_id', $budget->id)
                    ->where('source_budget_detail_id', $detail ? $detail->id : null)
                    ->first();
                if ($oldAlloc)
                    $available += (float) $oldAlloc->amount;

                if ($required > $available) {
                    $shortfall = $required - $available;
                    $borrowedAmountTotal += $shortfall;
                    $shortfallsPerCategory[$catId] = ($shortfallsPerCategory[$catId] ?? 0) + $shortfall;
                    if ($available > 0)
                        $allocationsToCreate[] = ['m_id' => $budget->id, 'd_id' => $detail->id, 'amt' => $available, 't_cat_id' => $catId];
                } else {
                    $allocationsToCreate[] = ['m_id' => $budget->id, 'd_id' => $detail ? $detail->id : null, 'amt' => $required, 't_cat_id' => $catId];
                }
            }
        };

        $processFunc($ownMandatoryBudget, $budgetByCategoryMandatory, $purchase);
        $processFunc($ownOthersBudget, $budgetByCategoryOthers, $purchase);

        // 4. Validate Borrowing
        if ($borrowedAmountTotal > 0) {
            if (!$borrowedMasterBudgetId) {
                return response()->json(['message' => 'Budget tidak mencukupi untuk update ini. Pilih sumber pinjaman.'], 400);
            }
            $sourceBudget = \Modules\Budget\Entities\MasterBudget::find($borrowedMasterBudgetId);
            if (!$sourceBudget)
                return response()->json(['message' => 'Budget pinjaman tidak ditemukan.'], 400);
            if ($sourceBudget->is_mandatory)
                return response()->json(['message' => 'Mandatory Budget tidak boleh dipinjam.'], 400);

            $isInternal = ($ownOthersBudget && $sourceBudget->department_id == $ownOthersBudget->department_id);

            foreach ($shortfallsPerCategory as $targetCatId => $amount) {
                $allocationsToCreate[] = [
                    'm_id' => $borrowedMasterBudgetId,
                    'd_id' => $borrowedBudgetDetailId,
                    'amt' => $amount,
                    't_cat_id' => $targetCatId,
                    'is_int' => $isInternal ? 1 : 0,
                    'is_ext' => $isInternal ? 0 : 1
                ];
            }
        }

        $purchase->update([
            'date' => $request->date,
            'department_id' => $request->department_id,
            'total_amount' => $calculatedTotal,
            'budget_amount' => $budgetRequiredTotal,
            'mandatory_amount' => $mandatoryAmount,
            'non_mandatory_amount' => $nonMandatoryAmount,
            'master_budget_id' => $ownOthersBudget ? $ownOthersBudget->id : ($ownMandatoryBudget ? $ownMandatoryBudget->id : null),
            'borrowed_master_budget_id' => $borrowedMasterBudgetId,
            'borrowed_amount' => $borrowedAmountTotal,
        ]);

        $purchase->purchaseDetails()->delete();
        foreach ($request->items as $item) {
            $product = $productsMap->get($item['product_id']);
            \Modules\Purchase\Entities\PurchaseDetail::create([
                'purchase_id' => $purchase->id,
                'product_id' => $item['product_id'],
                'product_name' => $item['product_name'] ?? ($product ? $product->product_name : 'Product'),
                'quantity' => $item['quantity'],
                'price' => $item['price'],
                'sub_total' => $item['price'] * $item['quantity'],
                'product_code' => $item['product_code'] ?? ($product ? $product->product_code : '-'),
                'product_unit' => $item['product_unit'] ?? ($product ? $product->product_unit : 'Unit'),
                'unit_price' => $item['price'],
                'is_asset' => $item['is_asset'] ?? ($product ? (bool) $product->is_asset : false),
            ]);
        }

        \Modules\Purchase\Entities\PurchaseBudgetAllocation::where('purchase_id', $purchase->id)->delete();
        foreach ($allocationsToCreate as $alloc) {
            \Modules\Purchase\Entities\PurchaseBudgetAllocation::create([
                'purchase_id' => $purchase->id,
                'purchase_detail_id' => 0,
                'source_master_budget_id' => $alloc['m_id'],
                'source_budget_detail_id' => $alloc['d_id'],
                'target_category_id' => $alloc['t_cat_id'] ?? null,
                'amount' => $alloc['amt'],
                'is_borrowed_internal' => $alloc['is_int'] ?? 0,
                'is_borrowed_external' => $alloc['is_ext'] ?? 0,
                'is_applied' => 0
            ]);
        }

        // Update related Approval Request amount if exists
        $approvalRequest = \Modules\Approval\Entities\ApprovalRequest::where('requestable_id', $purchase->id)
            ->where('requestable_type', \Modules\Purchase\Entities\Purchase::class)
            ->first();

        if ($approvalRequest) {
            $approvalRequest->update(['amount' => $calculatedTotal]);
        }

        DB::commit();
        return response()->json(['message' => 'Purchase updated', 'data' => $purchase]);
    } catch (\Exception $e) {
        DB::rollBack();
        return response()->json(['message' => $e->getMessage()], 500);
    }
});

Route::patch('/purchases/{id}/update-source-budget', function (Request $request, $id) {
    $request->validate([
        'master_budget_id' => 'required|exists:master_budgets,id'
    ]);

    $purchase = \Modules\Purchase\Entities\Purchase::findOrFail($id);
    // Optional: Validate that the new budget has enough funds?
    // For now we allow approver to override.

    $purchase->update([
        'master_budget_id' => $request->master_budget_id
    ]);

    return response()->json(['message' => 'Budget source updated']);
});

Route::delete('/purchases/{id}', function ($id) {
    $purchase = \Modules\Purchase\Entities\Purchase::findOrFail($id);
    $purchase->delete(); // Validasi Budget & Delete Details handled by Model Event
    return response()->json(['message' => 'Purchase deleted']);
});

Route::patch('/purchases/{id}/update-borrowing-source', function (Request $request, $id) {
    $request->validate([
        'borrowed_master_budget_id' => 'nullable|exists:master_budgets,id'
    ]);

    DB::beginTransaction();
    try {
        $purchase = \Modules\Purchase\Entities\Purchase::with(['purchaseDetails', 'masterBudget.details'])->findOrFail($id);
        $borrowedMasterBudgetId = $request->borrowed_master_budget_id;
        $borrowedBudgetDetailId = $request->borrowed_budget_detail_id; // Try to get from request if exists, though UI might not send it yet in PATCH

        // 1. Map Purchase Details & Group Required Budget by Mandatory Type
        $productIds = $purchase->purchaseDetails->pluck('product_id')->unique();
        $productsMap = \Modules\Product\Entities\Product::whereIn('id', $productIds)->get()->keyBy('id');

        $budgetByCategoryMandatory = [];
        $budgetByCategoryOthers = [];
        foreach ($purchase->purchaseDetails as $detail) {
            if (empty($detail->is_asset)) {
                $product = $productsMap->get($detail->product_id);
                $isItemMandatory = $product ? (bool) $product->is_mandatory : false;
                $catId = $product ? ($product->category_id ?? 0) : 0;
                if ($isItemMandatory)
                    $budgetByCategoryMandatory[$catId] = ($budgetByCategoryMandatory[$catId] ?? 0) + $detail->sub_total;
                else
                    $budgetByCategoryOthers[$catId] = ($budgetByCategoryOthers[$catId] ?? 0) + $detail->sub_total;
            }
        }

        // 2. Find Own Department's Budgets
        $purchaseDate = \Carbon\Carbon::parse($purchase->date);
        $baseQuery = \Modules\Budget\Entities\MasterBudget::with('details')
            ->where('department_id', $purchase->department_id)
            ->where('bulan', $purchaseDate->month)
            ->whereYear('periode_awal', $purchaseDate->year)
            ->where('status', 'Approved');

        $ownMandatoryBudget = (clone $baseQuery)->where('is_mandatory', true)->first();
        $ownOthersBudget = (clone $baseQuery)->where('is_mandatory', false)->first();

        $borrowedAmountTotal = 0;
        $shortfallsPerCategory = [];
        $allocationsToCreate = [];

        // 3. Helper to process allocations
        $processFunc = function ($budget, $budgetByCategory, $purchase) use (&$borrowedAmountTotal, &$allocationsToCreate, &$shortfallsPerCategory) {
            if (!$budget) {
                $borrowedAmountTotal += array_sum($budgetByCategory);
                foreach ($budgetByCategory as $catId => $required) {
                    $shortfallsPerCategory[$catId] = ($shortfallsPerCategory[$catId] ?? 0) + $required;
                }
                return;
            }
            $details = $budget->details->keyBy('category_id');
            foreach ($budgetByCategory as $catId => $required) {
                $detail = $details->get($catId);
                $available = $detail ? (float) $detail->budget - (float) $detail->used_amount - (float) ($detail->reserved_amount ?? 0) : 0;
                $oldAlloc = \Modules\Purchase\Entities\PurchaseBudgetAllocation::where('purchase_id', $purchase->id)
                    ->where('source_master_budget_id', $budget->id)
                    ->where('source_budget_detail_id', $detail ? $detail->id : null)
                    ->first();
                if ($oldAlloc)
                    $available += (float) $oldAlloc->amount;

                if ($required > $available) {
                    $shortfall = $required - $available;
                    $borrowedAmountTotal += $shortfall;
                    $shortfallsPerCategory[$catId] = ($shortfallsPerCategory[$catId] ?? 0) + $shortfall;
                    if ($available > 0)
                        $allocationsToCreate[] = ['m_id' => $budget->id, 'd_id' => $detail->id, 'amt' => $available, 't_cat_id' => $catId];
                } else {
                    $allocationsToCreate[] = ['m_id' => $budget->id, 'd_id' => $detail ? $detail->id : null, 'amt' => $required, 't_cat_id' => $catId];
                }
            }
        };

        $processFunc($ownMandatoryBudget, $budgetByCategoryMandatory, $purchase);
        $processFunc($ownOthersBudget, $budgetByCategoryOthers, $purchase);

        // 4. Update Borrowing Info
        if ($borrowedAmountTotal > 0) {
            if ($borrowedMasterBudgetId) {
                $sourceBudget = \Modules\Budget\Entities\MasterBudget::find($borrowedMasterBudgetId);
                if (!$sourceBudget)
                    return response()->json(['message' => 'Budget pinjaman tidak ditemukan.'], 400);
                if ($sourceBudget->is_mandatory)
                    return response()->json(['message' => 'Mandatory Budget tidak boleh dipinjam.'], 400);

                $isInternal = ($ownOthersBudget && $sourceBudget->department_id == $ownOthersBudget->department_id);

                foreach ($shortfallsPerCategory as $targetCatId => $amount) {
                    $allocationsToCreate[] = [
                        'm_id' => $borrowedMasterBudgetId,
                        'd_id' => $borrowedBudgetDetailId,
                        'amt' => $amount,
                        't_cat_id' => $targetCatId,
                        'is_int' => $isInternal ? 1 : 0,
                        'is_ext' => $isInternal ? 0 : 1
                    ];
                }
            }
        }

        $purchase->update([
            'borrowed_master_budget_id' => $borrowedMasterBudgetId,
            'borrowed_amount' => $borrowedMasterBudgetId ? $borrowedAmountTotal : 0
        ]);

        \Modules\Purchase\Entities\PurchaseBudgetAllocation::where('purchase_id', $purchase->id)->delete();
        foreach ($allocationsToCreate as $alloc) {
            \Modules\Purchase\Entities\PurchaseBudgetAllocation::create([
                'purchase_id' => $purchase->id,
                'purchase_detail_id' => 0,
                'source_master_budget_id' => $alloc['m_id'],
                'source_budget_detail_id' => $alloc['d_id'],
                'target_category_id' => $alloc['t_cat_id'] ?? null,
                'amount' => $alloc['amt'],
                'is_borrowed_internal' => $alloc['is_int'] ?? 0,
                'is_borrowed_external' => $alloc['is_ext'] ?? 0,
                'is_applied' => 0
            ]);
        }

        DB::commit();
        return response()->json([
            'message' => 'Borrowing source updated',
            'borrowed_amount' => $borrowedAmountTotal
        ]);
    } catch (\Exception $e) {
        DB::rollBack();
        return response()->json(['message' => $e->getMessage()], 500);
    }
});

Route::get('/purchases/unpaid-approved', function (Request $request) {
    // Check permission
    // if (!auth()->check() || !auth()->user()->can('update_actual_prices')) {
    //     return response()->json(['message' => 'Unauthorized'], 403);
    // }

    $purchases = \Modules\Purchase\Entities\Purchase::with(['department', 'purchaseDetails', 'masterBudget.department', 'borrowedMasterBudget.department'])
        ->where('status', 'Approved')
        // ->where('payment_status', 'Unpaid')
        ->latest()
        ->get();

    return response()->json(['data' => $purchases]);
});

Route::post('/purchases/{id}/update-actual', function (Request $request, $id) {
    // Check permission
    // if (!auth()->check() || !auth()->user()->can('update_actual_prices')) {
    //     return response()->json(['message' => 'Unauthorized'], 403);
    // }

    $request->validate([
        'items' => 'required|array',
        'items.*.id' => 'required|exists:purchase_details,id',
        'items.*.actual_price' => 'required|numeric|min:0',
        'items.*.quantity' => 'required|numeric|min:1',
        'is_paid' => 'required|boolean'
    ]);

    DB::beginTransaction();
    try {
        $purchase = \Modules\Purchase\Entities\Purchase::with(['purchaseDetails', 'masterBudget', 'borrowedMasterBudget'])
            ->findOrFail($id);

        // Only allow updating if status is Approved
        if ($purchase->status !== 'approved') {
            return response()->json(['message' => 'Only approved purchases can be updated'], 400);
        }

        $oldTotal = $purchase->total_amount;
        $newTotal = 0;
        $budgetItemsOldTotal = 0;
        $budgetItemsNewTotal = 0;

        // Update each purchase detail with actual price & quantity
        foreach ($request->items as $itemData) {
            $detail = \Modules\Purchase\Entities\PurchaseDetail::findOrFail($itemData['id']);

            // Verify this detail belongs to this purchase
            if ($detail->purchase_id != $purchase->id) {
                throw new \Exception('Invalid purchase detail');
            }

            $actualPrice = $itemData['actual_price'];
            $actualQty = $itemData['quantity'];
            $newSubTotal = $actualPrice * $actualQty;
            $oldSubTotal = $detail->sub_total;

            $detail->update([
                'price' => $actualPrice,
                'unit_price' => $actualPrice,
                'quantity' => $actualQty,
                'sub_total' => $newSubTotal
            ]);

            $newTotal += $newSubTotal;

            // Only count non-asset items for budget
            if (empty($detail->is_asset)) {
                $budgetItemsOldTotal += $oldSubTotal;
                $budgetItemsNewTotal += $newSubTotal;
            }
        }

        // Calculate difference for budget adjustment
        $budgetDelta = $budgetItemsNewTotal - $budgetItemsOldTotal;

        if ($budgetDelta != 0) {
            $allocations = \Modules\Purchase\Entities\PurchaseBudgetAllocation::where('purchase_id', $purchase->id)->get();

            // Prioritize borrowed allocations
            $alloc = $allocations->filter(function ($al) {
                return $al->is_borrowed_internal || $al->is_borrowed_external;
            })->sortByDesc('amount')->first();

            // Fallback to any active allocation
            if (!$alloc) {
                $alloc = $allocations->sortByDesc('amount')->first();
            }

            if ($alloc) {
                $alloc->amount += $budgetDelta;
                if ($alloc->amount < 0)
                    $alloc->amount = 0;
                $alloc->save();

                if ($alloc->is_applied) {
                    if ($alloc->source_master_budget_id) {
                        $mb = \Modules\Budget\Entities\MasterBudget::find($alloc->source_master_budget_id);
                        if ($mb) {
                            $mb->used_amount += $budgetDelta;
                            if ($mb->used_amount < 0)
                                $mb->used_amount = 0;
                            $mb->save();
                        }
                    }
                    if ($alloc->source_budget_detail_id) {
                        $bd = \Modules\Budget\Entities\BudgetDetail::find($alloc->source_budget_detail_id);
                        if ($bd) {
                            $bd->used_amount += $budgetDelta;
                            if ($bd->used_amount < 0)
                                $bd->used_amount = 0;
                            $bd->save();
                        }
                    }
                }
            }
        }

        // RECALCULATE PURCHASE COLUMNS
        $sumAsset = 0;
        $sumMandatory = 0;
        $sumOthers = 0;

        foreach ($purchase->purchaseDetails()->get() as $detail) {
            $subTot = $detail->sub_total;
            if ($detail->is_asset) {
                $sumAsset += $subTot;
            } else {
                $product = $detail->product ? clone $detail->product : null;
                if (!$product) {
                    $product = \Modules\Product\Entities\Product::find($detail->product_id);
                }
                if ($product && $product->is_mandatory) {
                    $sumMandatory += $subTot;
                } else {
                    $sumOthers += $subTot;
                }
            }
        }

        $currentAllocations = \Modules\Purchase\Entities\PurchaseBudgetAllocation::where('purchase_id', $purchase->id)->get();
        $sumBudget = $currentAllocations->sum('amount');
        $sumBorrowed = $currentAllocations->where('is_borrowed_internal', 1)->sum('amount') + $currentAllocations->where('is_borrowed_external', 1)->sum('amount');

        // Update purchase total, breakdown logic, and payment status
        $purchase->update([
            'total_amount' => $newTotal,
            'budget_amount' => $sumBudget,
            'mandatory_amount' => $sumMandatory,
            'non_mandatory_amount' => $sumOthers,
            'borrowed_amount' => $sumBorrowed,
            'asset_amount' => $sumAsset,
            'payment_status' => $request->is_paid ? 'Paid' : 'Unpaid'
        ]);

        DB::commit();
        return response()->json([
            'message' => 'Purchase updated successfully',
            'data' => $purchase->fresh(['purchaseDetails', 'masterBudget', 'borrowedMasterBudget'])
        ]);
    } catch (\Exception $e) {
        DB::rollBack();
        return response()->json(['message' => $e->getMessage()], 500);
    }
});

Route::get('/budget-summary', function (Request $request) {
    $year = $request->query('year', date('Y'));
    $month = $request->query('month', date('m'));

    // Create first and last day of the requested month
    $firstDay = "$year-$month-01";
    $lastDay = date('Y-m-t', strtotime($firstDay)); // Last day of the month

    // Get all departments
    $departments = \Modules\Department\Entities\Departments::all();

    $summary = [];

    foreach ($departments as $dept) {
        $masterBudgets = \Modules\Budget\Entities\MasterBudget::with('details')
            ->where('department_id', $dept->id)
            ->where('bulan', (int) $month)
            ->whereYear('periode_awal', $year)
            ->where('status', 'Approved')
            ->get();

        $deptName = $dept->id == 0 ? 'Direksi' : $dept->department_name;

        // Borrowing (Over Budget)
        $overBudgetItems = \Modules\Purchase\Entities\PurchaseBudgetAllocation::whereHas('purchase', function ($q) use ($dept, $month, $year) {
            $q->where('department_id', $dept->id)
                ->whereMonth('date', $month)
                ->whereYear('date', $year)
                ->where('status', 'Approved');
        })
            ->where(function ($q) {
                $q->where('is_borrowed_internal', 1)->orWhere('is_borrowed_external', 1);
            })
            ->with(['sourceMasterBudget.department', 'sourceBudgetDetail', 'targetCategory'])
            ->get();

        $overBudgetTotalInternal = $overBudgetItems->where('is_borrowed_internal', 1)->sum('amount');
        $overBudgetTotalExternal = $overBudgetItems->where('is_borrowed_external', 1)->sum('amount');

        // Lending (Dipinjam)
        $lentItems = \Modules\Purchase\Entities\PurchaseBudgetAllocation::whereHas('sourceMasterBudget', function ($q) use ($dept, $month, $year) {
            $q->where('department_id', $dept->id)
                ->where('bulan', (int) $month)
                ->whereYear('periode_awal', $year)
                ->where('status', 'Approved');
        })
            ->whereHas('purchase', function ($q) {
                $q->where('status', 'Approved');
            })
            ->where(function ($q) {
                $q->where('is_borrowed_internal', 1)->orWhere('is_borrowed_external', 1);
            })
            ->with(['purchase.department', 'sourceBudgetDetail', 'targetCategory'])
            ->get();

        $lentTotalInternal = $lentItems->where('is_borrowed_internal', 1)->sum('amount');
        $lentTotalExternal = $lentItems->where('is_borrowed_external', 1)->sum('amount');

        $totalGT = 0;
        $totalUsed = 0;

        $mandatoryGT = 0;
        $mandatoryUsed = 0;

        $othersGT = 0;
        $othersUsed = 0;

        $budgetBreakdown = [];

        foreach ($masterBudgets as $mb) {
            $totalGT += (float) $mb->grandtotal;
            $totalUsed += (float) $mb->used_amount;

            if ($mb->is_mandatory) {
                $mandatoryGT += (float) $mb->grandtotal;
                $mandatoryUsed += (float) $mb->used_amount;
            } else {
                $othersGT += (float) $mb->grandtotal;
                $othersUsed += (float) $mb->used_amount;
            }

            $budgetBreakdown[] = [
                'id' => $mb->id,
                'no_budgeting' => $mb->no_budgeting,
                'is_mandatory' => (bool) $mb->is_mandatory,
                'grandtotal' => (float) $mb->grandtotal,
                'used_amount' => (float) $mb->used_amount,
                'remaining' => (float) $mb->grandtotal - (float) $mb->used_amount,
                'details' => $mb->details->map(function ($d) {
                    return [
                        'category_name' => $d->category_name,
                        'budget' => (float) $d->budget,
                        'used_amount' => (float) $d->used_amount,
                        'remaining' => (float) $d->budget - (float) $d->used_amount
                    ];
                })
            ];
        }

        $summary[] = [
            'department_id' => $dept->id,
            'department_name' => $deptName,
            'grandtotal' => $totalGT,
            'used_amount' => $totalUsed,
            'remaining' => $totalGT - $totalUsed,
            'mandatory_grandtotal' => $mandatoryGT,
            'mandatory_used' => $mandatoryUsed,
            'mandatory_remaining' => $mandatoryGT - $mandatoryUsed,
            'others_grandtotal' => $othersGT,
            'others_used' => $othersUsed,
            'others_remaining' => $othersGT - $othersUsed,
            'over_budget_internal' => (float) $overBudgetTotalInternal,
            'over_budget_external' => (float) $overBudgetTotalExternal,
            'over_budget_total' => (float) $overBudgetTotalInternal + (float) $overBudgetTotalExternal,
            'lent_internal' => (float) $lentTotalInternal,
            'lent_external' => (float) $lentTotalExternal,
            'lent_total' => (float) $lentTotalInternal + (float) $lentTotalExternal,
            'over_budget_details' => $overBudgetItems->map(fn($item) => [
                'amount' => (float) $item->amount,
                'is_internal' => (bool) $item->is_borrowed_internal,
                'source' => $item->is_borrowed_internal
                    ? ($item->sourceBudgetDetail->category_name ?? 'All Category')
                    : ($item->sourceMasterBudget->department->department_name ?? 'Other Dept'),
                'target_category' => $item->targetCategory->category_name ?? ($item->is_borrowed_internal ? 'General' : null),
                'source_category' => $item->sourceBudgetDetail->category_name ?? 'All Category'
            ]),
            'lent_details' => $lentItems->map(fn($item) => [
                'amount' => (float) $item->amount,
                'is_internal' => (bool) $item->is_borrowed_internal,
                'target' => $item->is_borrowed_internal
                    ? ($item->targetCategory->category_name ?? 'General')
                    : ($item->purchase->department->department_name ?? 'Other Dept'),
                'target_category' => $item->targetCategory->category_name ?? ($item->is_borrowed_internal ? 'General' : null),
                'source_category' => $item->sourceBudgetDetail->category_name ?? 'All Category'
            ]),
            'budgets' => $budgetBreakdown
        ];
    }

    return response()->json(['data' => $summary]);
});

Route::get('/reports/purchase-requests', function (Request $request) {
    $startDate = $request->query('start_date');
    $endDate = $request->query('end_date');
    $departmentId = $request->query('department_id');
    $status = $request->query('status');

    $query = \Modules\Purchase\Entities\Purchase::with(['department', 'purchaseDetails', 'masterBudget', 'borrowedMasterBudget']);

    // Auth Check
    $user = auth()->user();
    $canViewAllDepartments = false;
    if ($user) {
        $isSuperAdmin = $user->hasRole('Super Admin');
        $hasAllDepartmentsPermission = $user->hasPermissionTo('all_departments');
        $canViewAllDepartments = $isSuperAdmin || $hasAllDepartmentsPermission;
    }

    // Enforce department filter for non-privileged users
    if (!$canViewAllDepartments && $user && $user->department_id) {
        $query->where('department_id', $user->department_id);
    } elseif ($departmentId) {
        $query->where('department_id', $departmentId);
    }

    // Filter by date range (using tgl_pengajuan)
    if ($startDate) {
        $query->where('date', '>=', $startDate);
    }
    if ($endDate) {
        $query->where('date', '<=', $endDate);
    }

    // Filter by status
    if ($status) {
        $query->where('status', $status);
    }

    $purchases = $query->orderBy('date', 'desc')->get();

    // Calculate statistics
    $stats = [
        'total_count' => $purchases->count(),
        'total_amount' => $purchases->sum(function ($p) {
            return $p->purchaseDetails->sum('sub_total');
        }),
        'total_asset_amount' => $purchases->sum(function ($p) {
            return $p->purchaseDetails->where('is_asset', 1)->sum('sub_total');
        }),
        'total_non_asset_amount' => $purchases->sum(function ($p) {
            return $p->purchaseDetails->where('is_asset', 0)->sum('sub_total');
        }),
        'by_status' => $purchases->groupBy('status')->map(fn($items) => [
            'count' => $items->count(),
            'amount' => $items->sum(function ($p) {
                return $p->purchaseDetails->sum('sub_total');
            }),
            'asset_amount' => $items->sum(function ($p) {
                return $p->purchaseDetails->where('is_asset', 1)->sum('sub_total');
            })
        ]),
        'by_department' => $purchases->groupBy(function ($item) {
            return $item->department ? ($item->department->id === 0 ? 'Direksi' : $item->department->department_name) : 'Unknown';
        })->map(fn($items) => [
                'count' => $items->count(),
                'amount' => $items->sum(function ($p) {
                    return $p->purchaseDetails->sum('sub_total');
                }),
                'asset_amount' => $items->sum(function ($p) {
                    return $p->purchaseDetails->where('is_asset', 1)->sum('sub_total');
                })
            ]),
    ];

    return response()->json([
        'data' => $purchases,
        'stats' => $stats
    ]);
});

Route::get('/reports/master-budgets', function (Request $request) {
    $startDate = $request->query('start_date');
    $endDate = $request->query('end_date');
    $departmentId = $request->query('department_id');
    $status = $request->query('status');

    $query = \Modules\Budget\Entities\MasterBudget::with(['department']);

    // Auth Check
    $user = auth()->user();
    $canViewAllDepartments = false;
    if ($user) {
        $isSuperAdmin = $user->hasRole('Super Admin');
        $hasAllDepartmentsPermission = $user->hasPermissionTo('all_departments');
        $canViewAllDepartments = $isSuperAdmin || $hasAllDepartmentsPermission;
    }

    // Enforce department filter for non-privileged users
    if (!$canViewAllDepartments && $user && $user->department_id) {
        $query->where('department_id', $user->department_id);
    } elseif ($departmentId) {
        $query->where('department_id', $departmentId);
    }

    // Filter by date range (using periode_awal and periode_akhir)
    if ($startDate && $endDate) {
        $query->where(function ($q) use ($startDate, $endDate) {
            $q->where('periode_awal', '<=', $endDate)
                ->where('periode_akhir', '>=', $startDate);
        });
    } elseif ($startDate) {
        $query->where('periode_akhir', '>=', $startDate);
    } elseif ($endDate) {
        $query->where('periode_awal', '<=', $endDate);
    }

    // Filter by status
    if ($status) {
        $query->where('status', $status);
    }

    $budgets = $query->orderBy('periode_awal', 'desc')->get();

    // Calculate statistics
    $stats = [
        'total_count' => $budgets->count(),
        'total_budget' => $budgets->sum('grandtotal'),
        'total_used' => $budgets->sum('used_amount'),
        'total_reserved' => $budgets->sum('reserved_amount'),
        'total_remaining' => $budgets->sum(fn($b) => $b->grandtotal - $b->used_amount - $b->reserved_amount),
        'by_status' => $budgets->groupBy('status')->map(fn($items) => [
            'count' => $items->count(),
            'total_budget' => $items->sum('grandtotal'),
            'total_used' => $items->sum('used_amount')
        ]),
        'by_department' => $budgets->groupBy(function ($item) {
            return $item->department ? ($item->department->id === 0 ? 'Direksi' : $item->department->department_name) : 'Unknown';
        })->map(fn($items) => [
                'count' => $items->count(),
                'total_budget' => $items->sum('grandtotal'),
                'total_used' => $items->sum('used_amount')
            ]),
    ];

    return response()->json([
        'data' => $budgets,
        'stats' => $stats
    ]);
});

// End of Report Routes

Route::apiResource('target-sales', '\Modules\TargetSale\Http\Controllers\TargetSalesController');
Route::post('/target-sales/{id}/approve', '\Modules\TargetSale\Http\Controllers\TargetSalesController@approve');
Route::post('/target-sales/{id}/reject', '\Modules\TargetSale\Http\Controllers\TargetSalesController@reject');
// Budget Controls
Route::post('/budgeting/check-category-budget', [\Modules\Budget\Http\Controllers\BudgetCheckController::class, 'checkCategoryBudget']);
Route::get('/budgeting/available-borrow-sources', [\Modules\Budget\Http\Controllers\BudgetCheckController::class, 'availableBorrowSources']);

Route::get('/budgeting/master-budget-summary', function (Request $request) {

    $year = $request->get('year', date('Y'));

    $budgets = \Modules\Budget\Entities\MasterBudget::with('department')
        ->whereYear('tgl_penyusunan', $year)
        ->where('status', 'Approved')
        ->get();

    $months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'Mei',
        'Jun',
        'Jul',
        'Agt',
        'Sep',
        'Okt',
        'Nov',
        'Des'
    ];

    $chartData = [];
    for ($m = 1; $m <= 12; $m++) {
        $row = ['name' => $months[$m - 1]];

        $monthlyBudgets = $budgets->where('bulan', $m);
        foreach ($monthlyBudgets as $b) {
            $deptName = ($b->department_id == 0 || $b->department_id === "0") ? 'Direksi' : ($b->department->department_name ?? 'Dept ' . $b->department_id);
            $row[$deptName] = ($row[$deptName] ?? 0) + (float) $b->grandtotal;
        }

        $chartData[] = $row;
    }

    // Get unique department names for the lines in the frontend
    $depts = [];
    foreach ($chartData as $row) {
        foreach (array_keys($row) as $key) {
            if ($key !== 'name' && !in_array($key, $depts)) {
                $depts[] = $key;
            }
        }
    }

    return response()->json([
        'chartData' => $chartData,
        'departments' => $depts
    ]);
});

Route::get('/budgeting/target-sales-summary', function (Request $request) {
    $year = $request->get('year', date('Y'));

    $targets = \Modules\TargetSale\Entities\TargetSale::where('year', $year)
        ->where('status', 'Approved')
        ->get();

    $months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'Mei',
        'Jun',
        'Jul',
        'Agt',
        'Sep',
        'Okt',
        'Nov',
        'Des'
    ];

    $chartData = [];
    for ($m = 1; $m <= 12; $m++) {
        $target = $targets->where('month', $m)->first();
        $chartData[] = [
            'name' => $months[$m - 1],
            'Target' => $target ? (float) $target->target_amount : 0
        ];
    }

    return response()->json([
        'chartData' => $chartData
    ]);
});


Route::get('/approval-requests', function (Request $request) {
    // Determine the morph map class based on type query
    $typeMap = [
        'budget' => [\Modules\Budget\Entities\MasterBudget::class],
        'purchase' => [\Modules\Purchase\Entities\Purchase::class],
        'target' => [\Modules\TargetSale\Entities\TargetSale::class],
        'product' => [\Modules\Product\Entities\ProductRequest::class],
    ];

    // Map untuk filtering kolom requestable_type secara langsung (mendukung friendly names lama)
    $dbTypeMap = [
        'budget' => ['Modules\Budget\Entities\MasterBudget', 'Master Budget', 'Modules\\Budget\\Entities\\MasterBudget'],
        'purchase' => ['Modules\Purchase\Entities\Purchase', 'Purchase Request', 'Over Budget', 'Modules\\Purchase\\Entities\\Purchase'],
        'target' => ['Modules\TargetSale\Entities\TargetSale', 'Target Sales', 'Modules\\TargetSale\\Entities\\TargetSale'],
        'product' => ['Modules\Product\Entities\ProductRequest', 'Product Request', 'Modules\\Product\\Entities\\ProductRequest'],
    ];

    $reqType = $request->query('type');
    // Normalize status to lowercase to match DB 'pending', 'approved', 'rejected'
    $statusInput = $request->query('status', 'pending');
    $status = strtolower($statusInput);

    $query = \Modules\Approval\Entities\ApprovalRequest::with(['requestable', 'creator', 'type', 'logs'])
        ->where('status', $status);

    // Use manual string matching instead of whereHasMorph to avoid polymorphic mapping issues
    if ($reqType && isset($dbTypeMap[$reqType])) {
        $query->whereIn('requestable_type', $dbTypeMap[$reqType]);
    } else {
        // Build a flat list of all allowed types
        $allTypes = [];
        foreach ($dbTypeMap as $types) {
            $allTypes = array_merge($allTypes, $types);
        }
        $query->whereIn('requestable_type', $allTypes);
    }

    // Filter: User must be an approver at the current level
    // OR User is the creator (optional, but usually creators want to track, though the request specifically said "approvers only". 
    // To differ from "Approver Task List", we usually exclude creators if they are not approvers.
    // However, for "Approval Page" it makes sense to only show tasks for approver.

    // Filter: User MUST be the assigned approver for the current level
    // We check the logs table because that's where the actual assignment is recorded.

    $userId = $request->query('user_id');
    if ($userId) {
        $query->whereHas('logs', function ($q) use ($userId) {
            $q->where('user_id', $userId)
                ->where('action', 'assigned')
                ->whereColumn('approval_request_logs.level', 'approval_requests.current_level');
        });
    } else {
        // No user ID provided
        return response()->json(['data' => []]);
    }

    $month = $request->query('month');
    $year = $request->query('year');

    if ($month && $year) {
        $query->where(function ($q) use ($month, $year, $dbTypeMap) {
            // Master Budget specific filtering
            $q->orWhere(function ($sub) use ($month, $year, $dbTypeMap) {
                $sub->whereIn('requestable_type', $dbTypeMap['budget'])
                    ->whereHasMorph('requestable', [\Modules\Budget\Entities\MasterBudget::class], function ($mq) use ($month, $year) {
                        $mq->where('bulan', (int) $month)->whereYear('periode_awal', $year);
                    });
            });

            // Target Sales specific filtering
            $q->orWhere(function ($sub) use ($month, $year, $dbTypeMap) {
                $sub->whereIn('requestable_type', $dbTypeMap['target'])
                    ->whereHasMorph('requestable', [\Modules\TargetSale\Entities\TargetSale::class], function ($mq) use ($month, $year) {
                        $mq->where('month', (int) $month)->where('year', $year);
                    });
            });

            // Purchase Request specific filtering (using created_at)
            $q->orWhere(function ($sub) use ($month, $year, $dbTypeMap) {
                $sub->whereIn('requestable_type', $dbTypeMap['purchase'])
                    ->whereMonth('created_at', $month)
                    ->whereYear('created_at', $year);
            });

            // Product Request specific filtering (using created_at)
            $q->orWhere(function ($sub) use ($month, $year, $dbTypeMap) {
                $sub->whereIn('requestable_type', $dbTypeMap['product'])
                    ->whereMonth('created_at', $month)
                    ->whereYear('created_at', $year);
            });
        });
    }

    if ($reqType && isset($dbTypeMap[$reqType])) {
        $query->whereIn('requestable_type', $dbTypeMap[$reqType]);
    }

    $results = $query->latest()->get();

    // Manual Eager Load for Polymorphic Relations
    $results->each(function ($item) use ($dbTypeMap) {
        // Load department for Budget and Purchase
        if ($item->requestable) {
            $type = $item->requestable_type;
            if (in_array($type, $dbTypeMap['budget'])) {
                $item->requestable->load(['department', 'details']);
            } elseif (in_array($type, $dbTypeMap['purchase'])) {
                $item->requestable->load(['department', 'purchaseDetails.product.category', 'masterBudget.department', 'borrowedMasterBudget.department', 'purchaseBudgetAllocations.sourceBudgetDetail', 'purchaseBudgetAllocations.sourceMasterBudget.department']);
            } elseif (in_array($type, $dbTypeMap['product'])) {
                // ProductRequest usually has 'creator' which is already loaded by ApprovalRequest logic generally, 
                // but if we have other relations to show in the future, load them here.
                // For now, no specific relations needed for the card view other than columns.
            }
        }
    });

    return response()->json(['data' => $results]);
});

Route::post('/approval-requests/{id}/approve', function (Request $request, $id) {
    // Uses Approval Engine to process the request according to rules
    try {
        $approvalReq = \Modules\Approval\Entities\ApprovalRequest::with('requestable')->findOrFail($id);
        $engine = app(\Modules\Approval\Services\ApprovalEngine::class);

        // process(ApprovalRequest $approvalRequest, $userId, $action, $note = null)
        $userId = $request->input('user_id');
        if (!$userId) {
            return response()->json(['message' => 'User ID is required'], 400);
        }
        $engine->process($approvalReq, $userId, 'approved', $request->comment);

        return response()->json(['message' => 'Request approved successfully']);
    } catch (\Exception $e) {
        return response()->json(['message' => $e->getMessage()], 400);
    }
});

Route::post('/approval-requests/{id}/reject', function (Request $request, $id) {
    try {
        $approvalReq = \Modules\Approval\Entities\ApprovalRequest::with('requestable')->findOrFail($id);
        $engine = app(\Modules\Approval\Services\ApprovalEngine::class);

        // process(ApprovalRequest $approvalRequest, $userId, $action, $note = null)
        $userId = $request->input('user_id');
        if (!$userId) {
            return response()->json(['message' => 'User ID is required'], 400);
        }
        $engine->process($approvalReq, $userId, 'rejected', $request->comment);

        return response()->json(['message' => 'Request rejected successfully']);
    } catch (\Exception $e) {
        return response()->json(['message' => $e->getMessage()], 400);
    }
});

// ============================================
// PERMISSION MANAGEMENT ENDPOINTS
// ============================================

// GET all permissions
Route::get('/permissions', function (Request $request) {
    $user = auth()->user();

    // Check if user is Super Admin or has access_permissions permission
    // if (!$user || (!$user->hasRole('Super Admin') && !$user->can('access_permissions'))) {
    //     return response()->json(['message' => 'Unauthorized. Super Admin or access_permissions permission required.'], 403);
    // }

    $permissions = \Spatie\Permission\Models\Permission::orderBy('name', 'asc')->get();

    return response()->json([
        'data' => $permissions,
        'count' => $permissions->count()
    ]);
});

// POST create new permission
Route::post('/permissions', function (Request $request) {
    $user = auth()->user();

    // Check if user is Super Admin or has access_permissions permission
    // if (!$user || (!$user->hasRole('Super Admin') && !$user->can('access_permissions'))) {
    //     return response()->json(['message' => 'Unauthorized. Super Admin or access_permissions permission required.'], 403);
    // }

    $request->validate([
        'name' => 'required|string|unique:permissions,name|regex:/^[a-z_]+$/',
        'guard_name' => 'nullable|string|in:web,api'
    ], [
        'name.required' => 'Permission name is required',
        'name.unique' => 'Permission name already exists',
        'name.regex' => 'Permission name must be lowercase with underscores only'
    ]);

    try {
        $permission = \Spatie\Permission\Models\Permission::create([
            'name' => $request->name,
            'guard_name' => $request->guard_name ?? 'web'
        ]);

        \Log::info('Permission created', [
            'permission_id' => $permission->id,
            'permission_name' => $permission->name,
            'created_by' => $user->id
        ]);

        return response()->json([
            'message' => 'Permission created successfully',
            'data' => $permission
        ], 201);
    } catch (\Exception $e) {
        return response()->json(['message' => $e->getMessage()], 400);
    }
});

// PUT update permission
Route::put('/permissions/{id}', function (Request $request, $id) {
    $user = auth()->user();

    // Check if user is Super Admin or has access_permissions permission
    // if (!$user || (!$user->hasRole('Super Admin') && !$user->can('access_permissions'))) {
    //     return response()->json(['message' => 'Unauthorized. Super Admin or access_permissions permission required.'], 403);
    // }

    $permission = \Spatie\Permission\Models\Permission::find($id);

    if (!$permission) {
        return response()->json(['message' => 'Permission not found'], 404);
    }

    $request->validate([
        'name' => 'required|string|unique:permissions,name,' . $id . '|regex:/^[a-z_]+$/',
    ], [
        'name.required' => 'Permission name is required',
        'name.unique' => 'Permission name already exists',
        'name.regex' => 'Permission name must be lowercase with underscores only'
    ]);

    try {
        $oldName = $permission->name;
        $permission->name = $request->name;
        $permission->save();

        \Log::info('Permission updated', [
            'permission_id' => $permission->id,
            'old_name' => $oldName,
            'new_name' => $permission->name,
            'updated_by' => $user->id
        ]);

        return response()->json([
            'message' => 'Permission updated successfully',
            'data' => $permission
        ]);
    } catch (\Exception $e) {
        return response()->json(['message' => $e->getMessage()], 400);
    }
});

// DELETE permission
Route::delete('/permissions/{id}', function (Request $request, $id) {
    $user = auth()->user();

    // Check if user is Super Admin or has access_permissions permission
    // if (!$user || (!$user->hasRole('Super Admin') && !$user->can('access_permissions'))) {
    //     return response()->json(['message' => 'Unauthorized. Super Admin or access_permissions permission required.'], 403);
    // }

    $permission = \Spatie\Permission\Models\Permission::find($id);

    if (!$permission) {
        return response()->json(['message' => 'Permission not found'], 404);
    }

    // Check if permission is assigned to any roles
    $rolesCount = $permission->roles()->count();
    if ($rolesCount > 0) {
        return response()->json([
            'message' => "Cannot delete permission. It is assigned to {$rolesCount} role(s). Please remove it from all roles first."
        ], 400);
    }

    try {
        $permissionName = $permission->name;
        $permission->delete();

        \Log::info('Permission deleted', [
            'permission_id' => $id,
            'permission_name' => $permissionName,
            'deleted_by' => $user->id
        ]);

        return response()->json([
            'message' => 'Permission deleted successfully'
        ]);
    } catch (\Exception $e) {
        return response()->json(['message' => $e->getMessage()], 400);
    }
});
