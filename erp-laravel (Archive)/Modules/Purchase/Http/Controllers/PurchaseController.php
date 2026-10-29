<?php

namespace Modules\Purchase\Http\Controllers;

use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Gloudemans\Shoppingcart\Facades\Cart;
use Modules\Purchase\DataTables\PurchaseDataTable;
use Modules\Purchase\Entities\Purchase;
use Modules\Purchase\Entities\PurchaseDetail;
use Modules\Purchase\Entities\PurchasePayment;
use Modules\Purchase\Http\Requests\StorePurchaseRequest;
use Modules\Purchase\Http\Requests\UpdatePurchaseRequest;
use Modules\Product\Entities\Product;
use Modules\People\Entities\Supplier;
use Modules\Budget\Entities\MasterBudget;
use Modules\Department\Entities\Department;
use Carbon\Carbon;
use Modules\Approval\Services\ApprovalEngine;
use Illuminate\Support\Facades\Auth;
use Modules\Approval\Entities\ApprovalRule;
use Modules\Approval\Entities\ApprovalRequest;
use Modules\Approval\Entities\ApprovalRuleLevel;
use Modules\Approval\Entities\ApprovalRequestLog;
use Modules\Approval\Entities\ApprovalRuleUser;
use Illuminate\Support\Facades\Log;
use PDF;

class PurchaseController extends Controller
{
    // protected $approvalEngine;

    // public function __construct(ApprovalEngine $approvalEngine)
    // {
    //     $this->approvalEngine = $approvalEngine;
    // }

    /**
     * Menampilkan daftar pembelian.
     */
    public function index(PurchaseDataTable $dataTable)
    {
        abort_if(Gate::denies('access_purchases'), 403);

        return $dataTable->render('purchase::index');
    }

    /**
     * Form untuk membuat purchase baru.
     */
    public function create()
    {
        // abort_if(Gate::denies('create_purchases'), 403);

        Cart::instance('purchase')->destroy();

        // $prNumber = Purchase::generatePRNumber();
        $prNumber = 'Auto Generated'; // Display placeholder
        $budgets = MasterBudget::all();


        return view('purchase::create', compact('prNumber', 'budgets'));
    }


    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,approved,rejected',
        ]);

        $purchase = Purchase::findOrFail($id);

        // contoh otorisasi (bisa kamu sesuaikan)
        if (!auth()->user()->can('approve_purchases')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $purchase->status = ucfirst($request->status);
        $purchase->save();

        return response()->json(['success' => true, 'status' => $purchase->status]);
    }

    public function approve($id)
    {
        $purchase = Purchase::with('purchaseBudgetAllocations')->findOrFail($id);

        if (!Gate::allows('approve_purchases', $purchase)) {
            return response()->json(['error' => 'Anda tidak punya akses untuk approve.'], 403);
        }

        try {
            DB::transaction(function () use ($purchase) {

                // --- Cari Approval Request TERKAIT DENGAN PURCHASE INI (Apapun Type-nya) ---
                $approvalRequest = ApprovalRequest::where('requestable_id', $purchase->id)
                    ->whereIn('requestable_type', ['Purchase Request', 'Over Budget', \Modules\Purchase\Entities\Purchase::class])
                    ->first();

                if (!$approvalRequest) {
                    // Fallback jika tidak ada Approval Request
                    $purchase->update([
                        'status' => 'approved',
                    ]);
                    $this->applyBudgetAllocations($purchase);
                    Log::warning("No ApprovalRequest found for Purchase ID: {$purchase->id} during approval. Default budget updated via allocations.");
                    return;
                }

                // --- Proses Approval Log ---
                $log = $approvalRequest->logs()
                    ->where('user_id', Auth::id())
                    ->where('level', $approvalRequest->current_level)
                    ->where('action', 'assigned')
                    ->first();

                if (!$log) {
                    throw new \Exception('Anda tidak berwenang memproses permintaan ini di level saat ini.');
                }

                $log->update([
                    'action' => 'approved',
                    'comment' => 'Approved: ' . now()->format('d-m-Y H:i:s'),
                ]);

                // --- Cek Penyelesaian Level ---
                $pendingCount = $approvalRequest->logs()
                    ->where('level', $approvalRequest->current_level)
                    ->where('action', 'assigned')
                    ->count();

                // --- Jika Level Selesai ---
                if ($pendingCount == 0) {
                    $nextLevelNumber = $approvalRequest->current_level + 1;
                    $nextLevelData = ApprovalRuleLevel::where('approval_rules_id', $approvalRequest->approval_rules_id)
                        ->where('level', $nextLevelNumber)
                        ->first();

                    if ($nextLevelData) {
                        // MASIH ADA LEVEL BERIKUTNYA
                        $requesterId = $approvalRequest->created_by;
                        $requesterRule = ApprovalRuleUser::where('approval_rule_levels_id', $nextLevelData->id)
                            ->where('role', 'requester')
                            ->where('user_id', $requesterId)
                            ->first();

                        if (!$requesterRule) {
                            // Jika requester tidak ditemukan, anggap alur approval selesai
                            $purchase->update(['status' => 'approved']);
                            $approvalRequest->update(['status' => 'approved']);

                            $this->applyBudgetAllocations($purchase);

                        } else {
                            // LANJUTKAN ALUR SEQUENCE
                            $targetSequence = $requesterRule->sequence;

                            $approvers = ApprovalRuleUser::where('approval_rule_levels_id', $nextLevelData->id)
                                ->where('role', 'approver')
                                ->where('sequence', $targetSequence)
                                ->get();

                            if ($approvers->isEmpty()) {
                                throw new \Exception("Tidak ada approver yang ditemukan untuk sequence {$targetSequence} di level {$nextLevelNumber}.");
                            }

                            foreach ($approvers as $nextUser) {
                                $approvalRequest->logs()->create([
                                    'level' => $nextLevelNumber,
                                    'user_id' => $nextUser->user_id,
                                    'action' => 'assigned',
                                ]);
                            }

                            $approvalRequest->update(['current_level' => $nextLevelNumber]);
                        }

                    } else {
                        // INI ADALAH LEVEL APPROVAL TERAKHIR
                        $purchase->update(['status' => 'approved']);
                        $approvalRequest->update(['status' => 'approved']);

                        $this->applyBudgetAllocations($purchase);
                    }
                }

            });

            return response()->json(['success' => true, 'message' => 'Purchase Request berhasil disetujui.']);

        } catch (\Throwable $e) {
            Log::error("Error approving purchase ID {$id}: " . $e->getMessage() . "\n" . $e->getTraceAsString());
            return response()->json(['error' => 'Gagal menyetujui: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Terapkan potongan budget dari tabel alokasi saat final approval.
     */
    private function applyBudgetAllocations(Purchase $purchase)
    {
        $allocations = \Modules\Purchase\Entities\PurchaseBudgetAllocation::where('purchase_id', $purchase->id)
            ->where('is_applied', false)
            ->get();

        foreach ($allocations as $alloc) {
            // Update Master Budget
            if ($alloc->source_master_budget_id) {
                $mb = MasterBudget::find($alloc->source_master_budget_id);
                if ($mb) {
                    $mb->increment('used_amount', $alloc->amount);
                }
            }

            // Update Budget Detail
            if ($alloc->source_budget_detail_id) {
                $bd = \Modules\Budget\Entities\BudgetDetail::find($alloc->source_budget_detail_id);
                if ($bd) {
                    $bd->increment('used_amount', $alloc->amount);
                }
            }

            // Tandai sudah diaplikasikan
            $alloc->update(['is_applied' => true]);
        }
    }

    /**
     * Kembalikan potongan budget jika di-reject setelah (atau membatalkan reserve).
     * Saat ini reserve dilakukan per alloc? Tidak, alloc hanya record intention.
     * Jika reject, pastikan kita rollback JIKA is_applied = true (walaupun reject biasanya terjadi sblm applied).
     */
    private function rollbackBudgetAllocations(Purchase $purchase)
    {
        $allocations = \Modules\Purchase\Entities\PurchaseBudgetAllocation::where('purchase_id', $purchase->id)
            ->where('is_applied', true)
            ->get();

        foreach ($allocations as $alloc) {
            // Rollback Master Budget
            if ($alloc->source_master_budget_id) {
                $mb = MasterBudget::find($alloc->source_master_budget_id);
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

            // Tandai dibatalkan
            $alloc->update(['is_applied' => false]);
        }
    }


    /**
     * Menolak Purchase Request.
     */
    public function reject(Request $request, $id)
    {
        $request->validate([
            'notes' => 'required|string|min:5',
        ]);

        $purchase = Purchase::findOrFail($id);

        if (!Gate::allows('approve_purchases', $purchase)) {
            return response()->json(['error' => 'Anda tidak punya akses untuk reject.'], 403);
        }

        try {
            DB::transaction(function () use ($purchase, $request) {

                // --- 1. Cari Approval Request TERKAIT ---
                $approvalRequest = ApprovalRequest::where('requestable_id', $purchase->id)
                    ->whereIn('requestable_type', ['Purchase Request', 'Over Budget']) // Cari salah satu
                    ->first();

                if ($approvalRequest) {

                    // --- 2. Update Log Approval ---
                    $log = $approvalRequest->logs()
                        ->where('user_id', Auth::id())
                        ->where('level', $approvalRequest->current_level)
                        ->where('action', 'assigned')
                        ->first();

                    if (!$log) {
                        throw new \Exception('Anda tidak berwenang memproses permintaan ini di level saat ini.');
                    }

                    $log->update([
                        'action' => 'rejected',
                        'comment' => $request->notes,
                    ]);

                    $purchase->update([
                        'status' => 'rejected',
                    ]);
                    $approvalRequest->update(['status' => 'rejected']);

                    // Rollback jika kebetulan sudah applied (biasanya reject tidak mengubah is_applied karena belum final approve, tp sbg pengaman)
                    $this->rollbackBudgetAllocations($purchase);

                } else {
                    $purchase->update([
                        'status' => 'rejected',
                    ]);
                    $this->rollbackBudgetAllocations($purchase);
                }
            });

            return response()->json(['success' => true, 'message' => 'Purchase Request berhasil ditolak.']);

        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Simpan data purchase baru.
     */
    public function store(StorePurchaseRequest $request)
    {
        // Cek Gate Authorization
        abort_if(Gate::denies('create_purchases'), 403);

        try {
            DB::transaction(function () use ($request) {
                // ==============================================================
                // 1. DATA PREPARATION
                // ==============================================================
                $purchaseDate = Carbon::parse($request->date);
                $total_amount = $request->total_amount ?? 0;
                $paid_amount = $request->paid_amount ?? 0;
                $due_amount = $total_amount - $paid_amount;

                $payment_status = 'Unpaid';
                if ($due_amount > 0 && $due_amount < $total_amount) {
                    $payment_status = 'Partial';
                } elseif ($due_amount <= 0) {
                    $payment_status = 'Paid';
                }

                $deptId = $request->department_id ?? optional(auth()->user())->department_id;

                // Cek Master Budget Utama untuk departemen ini (Mandatory & Others)
                $budgets = MasterBudget::where('department_id', $deptId)
                    ->where('bulan', $purchaseDate->month)
                    ->whereYear('periode_awal', $purchaseDate->year)
                    ->whereIn('status', ['Approved', 'approved'])
                    ->get();

                $mandatoryMaster = $budgets->where('is_mandatory', true)->sortByDesc('id')->first();
                $othersMaster = $budgets->where('is_mandatory', false)->sortByDesc('id')->first();

                if ($budgets->isEmpty()) {
                    throw new \Exception('Tidak ditemukan Master Budget yang disetujui (Approved) untuk departemen dan periode ini.');
                }

                // ==============================================================
                // 2. CREATE PURCHASE HEADER
                // ==============================================================
                $newPurchase = Purchase::create([
                    'date' => $request->date ?? now(),
                    'supplier_id' => $request->supplier_id ?? null,
                    'users_id' => $request->users_id ?? auth()->id(),
                    'department_id' => $deptId,
                    'master_budget_id' => $mandatoryMaster->id ?? ($othersMaster->id ?? null),
                    'total_amount' => $total_amount,
                    'mandatory_amount' => 0, // Will be updated
                    'non_mandatory_amount' => 0, // Will be updated
                    'master_budget_value' => $request->master_budget_value ?? 0,
                    'master_budget_remaining' => $request->master_budget_remaining ?? 0,
                    'due_amount' => $due_amount,
                    'status' => 'Pending',
                    'payment_status' => $payment_status,
                    'note' => $request->note ?? '',
                    'tax_percentage' => $request->tax_percentage ?? 0,
                    'discount_percentage' => $request->discount_percentage ?? 0,
                    'shipping_amount' => $request->shipping_amount ?? 0,
                    'payment_method' => $request->payment_method ?? 'Cash',
                    'tax_amount' => Cart::instance('purchase')->tax() ?? 0,
                    'discount_amount' => Cart::instance('purchase')->discount() ?? 0,
                ]);

                // ==============================================================
                // 3. CREATE PURCHASE DETAILS & GRANULAR ALLOCATIONS
                // ==============================================================
                $sumMandatory = 0;
                $sumOthers = 0;

                foreach (Cart::instance('purchase')->content() as $cart_item) {
                    $product = Product::find($cart_item->id);
                    $isAsset = $cart_item->options->is_asset ?? ($product->is_asset ?? false);
                    $isMandatory = $product->is_mandatory ?? false;
                    $subTotal = (float) ($cart_item->options->sub_total ?? $cart_item->subtotal);

                    $detail = PurchaseDetail::create([
                        'purchase_id' => $newPurchase->id,
                        'product_id' => $cart_item->id,
                        'product_name' => $cart_item->name,
                        'product_code' => $cart_item->options->code,
                        'product_unit' => $cart_item->options->unit ?? '-',
                        'quantity' => $cart_item->qty,
                        'price' => (int) $cart_item->price,
                        'unit_price' => (int) $cart_item->options->unit_price,
                        'sub_total' => (int) $subTotal,
                        'product_discount_amount' => $cart_item->options->product_discount ?? 0,
                        'product_discount_type' => $cart_item->options->product_discount_type ?? 'fixed',
                        'product_tax_amount' => (int) ($cart_item->options->product_tax ?? 0),
                        'is_asset' => $isAsset,
                    ]);

                    if (!$isAsset) {
                        if ($isMandatory) {
                            $sumMandatory += $subTotal;
                        } else {
                            $sumOthers += $subTotal;
                        }

                        // Determine Source for this specific item
                        $targetMaster = $isMandatory ? $mandatoryMaster : $othersMaster;

                        // Link searching by category within target master
                        $sourceDetail = null;
                        if ($targetMaster) {
                            $sourceDetail = \Modules\Budget\Entities\BudgetDetail::where('master_budget_id', $targetMaster->id)
                                ->where('category_id', $product->category_id)
                                ->first()
                                ??
                                \Modules\Budget\Entities\BudgetDetail::where('master_budget_id', $targetMaster->id)
                                    ->whereHas('category', function ($q) {
                                        $q->where('category_name', 'like', '%All Category%');
                                    })
                                    ->first();
                        }

                        \Modules\Purchase\Entities\PurchaseBudgetAllocation::create([
                            'purchase_id' => $newPurchase->id,
                            'purchase_detail_id' => $detail->id,
                            'source_master_budget_id' => $targetMaster->id ?? null,
                            'source_budget_detail_id' => $sourceDetail->id ?? null,
                            'amount' => $subTotal,
                            'is_borrowed_internal' => 0,
                            'is_borrowed_external' => 0,
                            'is_applied' => 0
                        ]);
                    }
                }

                // ==============================================================
                // 4. HANDLE OVERRIDE ALLOCATIONS (BORROWING) & HEADER UPDATE
                // ==============================================================
                // If there are specific allocations (borrowing) passed from frontend, 
                // we might need to adjust the item-level allocations or record them as overrides.
                // For now, if borrowing occurs, the frontend usually sends 'allocations' signals.

                $hasBorrowing = false;
                $hasExternalBorrowing = false;

                if ($request->has('allocations') && is_array($request->allocations)) {
                    // When explicit allocations are provided (borrowing UI used), 
                    // we replace the automatic ones above or mark them accordingly.
                    // For simplicity in this logic: if manual allocations exist, we use them.

                    // First, clear auto allocations if we have manual ones
                    \Modules\Purchase\Entities\PurchaseBudgetAllocation::where('purchase_id', $newPurchase->id)->delete();

                    foreach ($request->allocations as $alloc) {
                        $isInternal = ($alloc['type'] === 'Internal Department' || $alloc['type'] === 'All Category');
                        $isExternal = ($alloc['type'] === 'External Department');

                        if ($isInternal || $isExternal) {
                            $hasBorrowing = true;
                        }
                        if ($isExternal) {
                            $hasExternalBorrowing = true;
                        }

                        \Modules\Purchase\Entities\PurchaseBudgetAllocation::create([
                            'purchase_id' => $newPurchase->id,
                            'purchase_detail_id' => null,
                            'source_master_budget_id' => $alloc['source_master_budget_id'],
                            'source_budget_detail_id' => $alloc['source_budget_detail_id'],
                            'amount' => $alloc['amount'],
                            'is_borrowed_internal' => $isInternal ? 1 : 0,
                            'is_borrowed_external' => $isExternal ? 1 : 0,
                            'is_applied' => 0
                        ]);
                    }
                }

                // Update Header with splits
                $newPurchase->update([
                    'mandatory_amount' => $sumMandatory,
                    'non_mandatory_amount' => $sumOthers,
                ]);

                $approvalEngine = app(ApprovalEngine::class);

                // Tentukan Rule Approval berdasarkan status borrowing
                $ruleName = 'Purchase Request';
                if ($hasExternalBorrowing || $hasBorrowing) {
                    $ruleName = 'Over Budget';
                }

                $rule = ApprovalRule::whereHas('type', function ($query) use ($ruleName) {
                    $query->where('approval_name', $ruleName);
                })->where('is_active', true)->first();

                if (!$rule) {
                    throw new \Exception("Aturan Approval (Approval Rule) untuk '{$ruleName}' tidak ditemukan.");
                }

                $approvalRequest = $approvalEngine->createRequest(
                    $ruleName,
                    $newPurchase->id,
                    $rule->approval_types_id,
                    $newPurchase->total_amount,
                    Auth::id()
                );

                $newPurchase->update([
                    'status' => ucfirst($approvalRequest->status),
                    'note' => $request->note . ($hasBorrowing ? ' | [Diajukan dengan Pinjaman Budget]' : ''),
                ]);

                Cart::instance('purchase')->destroy();

            }); // Akhir Transaksi

            toast('Purchase Request Created Successfully!', 'success');
            return redirect()->route('purchases.index');

        } catch (\Throwable $e) {
            return back()->withErrors(['error' => 'Gagal membuat Purchase Request: ' . $e->getMessage()])->withInput();
        }
    }

    /**
     * Edit Purchase.
     */
    public function edit(Purchase $purchase)
    {
        abort_if(Gate::denies('edit_purchases'), 403);

        if (strtolower($purchase->status) !== 'pending') {
            return redirect()->route('purchases.index')
                ->withErrors(['error' => 'Purchase request yang sudah diproses tidak dapat diedit.']);
        }

        $purchaseDetails = $purchase->purchaseDetails;

        // Ambil data produk dari DB hanya yang ada di purchase details
        $productIds = $purchaseDetails->pluck('product_id')->toArray();
        $products = Product::whereIn('id', $productIds)->get()->keyBy('id');

        $budgets = MasterBudget::all();

        Cart::instance('purchase')->destroy();
        $cart = Cart::instance('purchase');

        foreach ($purchaseDetails as $detail) {
            $product = $products[$detail->product_id] ?? null;

            $cart->add([
                'id' => $detail->product_id,
                'name' => $detail->product_name,
                'qty' => $detail->quantity,
                'price' => $detail->price,
                'weight' => 1,
                'options' => [
                    'product_discount' => $detail->product_discount_amount,
                    'product_discount_type' => $detail->product_discount_type,
                    'sub_total' => $detail->sub_total,
                    'code' => $detail->product_code,
                    'stock' => $product->product_quantity ?? 0, // ambil dari DB
                    'product_tax' => $detail->product_tax_amount,
                    'unit_price' => $detail->unit_price
                ]
            ]);
        }

        return view('purchase::edit', compact('purchase', 'budgets', 'products'));
    }

    public function actual(Purchase $purchase)
    {
        abort_if(Gate::denies('edit_purchases'), 403);

        $purchaseDetails = $purchase->purchaseDetails;

        // Ambil data produk dari DB hanya yang ada di purchase details
        $productIds = $purchaseDetails->pluck('product_id')->toArray();
        $products = Product::whereIn('id', $productIds)->get()->keyBy('id');

        $budgets = MasterBudget::all();

        Cart::instance('purchase')->destroy();
        $cart = Cart::instance('purchase');

        foreach ($purchaseDetails as $detail) {
            $product = $products[$detail->product_id] ?? null;

            $cart->add([
                'id' => $detail->product_id,
                'name' => $detail->product_name,
                'qty' => $detail->quantity,
                'price' => $detail->price,
                'weight' => 1,
                'options' => [
                    'product_discount' => $detail->product_discount_amount,
                    'product_discount_type' => $detail->product_discount_type,
                    'sub_total' => $detail->sub_total,
                    'code' => $detail->product_code,
                    'stock' => $product->product_quantity ?? 0, // ambil dari DB
                    'product_tax' => $detail->product_tax_amount,
                    'unit_price' => $detail->unit_price
                ]
            ]);
        }

        return view('purchase::input-actual', compact('purchase', 'budgets', 'products'));
    }

    /**
     * Update Purchase.
     */
    public function update(UpdatePurchaseRequest $request, Purchase $purchase)
    {
        abort_if(Gate::denies('edit_purchases'), 403);

        $oldStatus = strtolower($purchase->status);

        if ($oldStatus !== 'pending') {
            return redirect()->route('purchases.show', $purchase->id)
                ->withErrors(['error' => 'Hanya PR Pending yang bisa diupdate.']);
        }

        try {
            $approvalEngine = app(ApprovalEngine::class);

            DB::transaction(function () use ($request, $purchase, $approvalEngine, $oldStatus) {

                // ==========================
                // SNAPSHOT DATA LAMA
                // ==========================
                $oldPurchase = $purchase->replicate();

                // ==========================
                // HITUNG ULANG PAYMENT
                // ==========================
                $total_amount = $request->total_amount ?? 0;
                $paid_amount = (int) str_replace(['.', ','], '', $request->paid_amount ?? 0);
                $due_amount = $total_amount - $paid_amount;

                if ($due_amount >= $total_amount) {
                    $payment_status = 'Unpaid';
                } elseif ($due_amount > 0) {
                    $payment_status = 'Partial';
                } else {
                    $payment_status = 'Paid';
                }

                // ==========================
                // UPDATE HEADER
                // ==========================
                $purchase->purchaseDetails()->delete();

                $purchase->update([
                    'date' => $request->date ?? now(),
                    'supplier_id' => $request->supplier_id,
                    'users_id' => $request->users_id ?? auth()->id(),
                    'department_id' => $request->department_id,
                    'total_amount' => $total_amount,
                    'master_budget_value' => $request->master_budget_value ?? 0,
                    'master_budget_remaining' => $request->master_budget_remaining ?? 0,
                    'due_amount' => $due_amount,
                    'payment_status' => $payment_status,
                    'note' => $request->note ?? '',
                ]);

                // ==========================
                // DETAIL ITEM
                // ==========================
                foreach (Cart::instance('purchase')->content() as $cart_item) {
                    PurchaseDetail::create([
                        'purchase_id' => $purchase->id,
                        'product_id' => $cart_item->id,
                        'product_name' => $cart_item->name,
                        'product_code' => $cart_item->options->code,
                        'product_unit' => $cart_item->options->unit ?? '-',
                        'quantity' => $cart_item->qty,
                        'price' => (int) $cart_item->price,
                        'unit_price' => (int) $cart_item->options->unit_price,
                        'sub_total' => (int) $cart_item->options->sub_total,
                        'product_discount_amount' => $cart_item->options->product_discount,
                        'product_discount_type' => $cart_item->options->product_discount_type,
                        'product_tax_amount' => (int) ($cart_item->options->product_tax ?? 0),
                    ]);
                }

                // ==========================
                // LOGIKA APPROVAL & BUDGET
                // ==========================
                if ($oldStatus === 'pending') {

                    // RESET APPROVAL
                    ApprovalRequest::where('requestable_id', $purchase->id)
                        ->whereIn('requestable_type', ['Purchase Request', 'Over Budget'])
                        ->delete();

                    $ruleName = $purchase->master_budget_remaining < 0 ? 'Over Budget' : 'Purchase Request';

                    $rule = ApprovalRule::whereHas('type', function ($q) use ($ruleName) {
                        $q->where('approval_name', $ruleName);
                    })->where('is_active', true)->first();

                    if (!$rule) {
                        throw new \Exception("Approval Rule '{$ruleName}' tidak ditemukan.");
                    }

                    $approvalRequest = $approvalEngine->createRequest(
                        $ruleName,
                        $purchase->id,
                        $rule->approval_types_id,
                        $purchase->total_amount,
                        Auth::id()
                    );

                    $purchase->update(['status' => strtolower($approvalRequest->status)]);

                }
                // ==========================
                // APPROVED → ADJUST BUDGET
                // ==========================
                else {

                    // rollback budget lama
                    $this->rollbackBudgetUsage($oldPurchase);

                    // apply budget baru
                    $this->applyBudgetUsage($purchase);

                    $purchase->update(['status' => 'approved']);
                }

                Cart::instance('purchase')->destroy();
            });

            toast('Purchase Request berhasil diupdate.', 'info');
            return redirect()->route('purchases.index');

        } catch (\Throwable $e) {
            return back()->withErrors([
                'error' => 'Gagal update Purchase: ' . $e->getMessage()
            ])->withInput();
        }
    }

    public function updateActual(Request $request, Purchase $purchase)
    {
        abort_if(Gate::denies('edit_purchases'), 403);

        if (strtolower($purchase->status) !== 'approved') {
            return back()->withErrors([
                'error' => 'Actual hanya bisa diinput untuk PR Approved.'
            ]);
        }

        DB::transaction(function () use ($request, $purchase) {

            $oldTotal = (int) $purchase->total_amount;
            $newTotal = (int) $request->total_amount;
            $delta = $newTotal - $oldTotal;

            // ==========================
            // UPDATE PURCHASE
            // ==========================
            $purchase->update([
                'total_amount' => $newTotal,
                'master_budget_remaining' => $purchase->master_budget_remaining - $delta,
                'note' => $request->note ?? '',
            ]);

            // ==========================
            // INTELLIGENT ALLOCATION & DETAIL UPDATE
            // ==========================
            $currentAllocations = \Modules\Purchase\Entities\PurchaseBudgetAllocation::where('purchase_id', $purchase->id)->get();
            $hasOverrideAllocations = $currentAllocations->contains(function ($al) {
                return empty($al->purchase_detail_id) || $al->purchase_detail_id == 0 || $al->purchase_detail_id === '0';
            });

            if ($hasOverrideAllocations) {
                // FALLBACK GLOBAL LOGIC FOR MANUAL BORROWING OVERRIDES
                $oldBudgetSum = $currentAllocations->sum('amount');
                $allocationDelta = $newTotal - $oldBudgetSum;

                if ($allocationDelta !== 0) {
                    // Try to adjust the borrowed allocation first, as the primary budget is likely exhausted
                    $alloc = $currentAllocations->filter(function ($al) {
                        return $al->is_borrowed_internal || $al->is_borrowed_external;
                    })->sortByDesc('amount')->first();

                    // If no active borrowed allocations, fallback to any available allocation 
                    if (!$alloc) {
                        $alloc = $currentAllocations->sortByDesc('amount')->first();
                    }

                    if ($alloc) {
                        $alloc->amount += $allocationDelta;
                        if ($alloc->amount < 0)
                            $alloc->amount = 0;
                        $alloc->save();

                        if ($alloc->is_applied) {
                            if ($alloc->source_master_budget_id) {
                                $mb = MasterBudget::find($alloc->source_master_budget_id);
                                if ($mb) {
                                    $mb->used_amount += $allocationDelta;
                                    if ($mb->used_amount < 0)
                                        $mb->used_amount = 0;
                                    $mb->save();
                                }
                            }
                            if ($alloc->source_budget_detail_id) {
                                $bd = \Modules\Budget\Entities\BudgetDetail::find($alloc->source_budget_detail_id);
                                if ($bd) {
                                    $bd->used_amount += $allocationDelta;
                                    if ($bd->used_amount < 0)
                                        $bd->used_amount = 0;
                                    $bd->save();
                                }
                            }
                        }
                    }
                }

                // visually update details (wipe and recreate since allocations are global)
                $purchase->purchaseDetails()->delete();
                foreach (Cart::instance('purchase')->content() as $item) {
                    $product = \Modules\Product\Entities\Product::find($item->id);
                    $isAsset = $item->options->is_asset ?? ($product->is_asset ?? false);

                    PurchaseDetail::create([
                        'purchase_id' => $purchase->id,
                        'product_id' => $item->id,
                        'product_name' => $item->name,
                        'product_code' => $item->options->code,
                        'product_unit' => $item->options->unit ?? '-',
                        'quantity' => $item->qty,
                        'price' => (int) $item->price,
                        'unit_price' => (int) $item->options->unit_price,
                        'sub_total' => (int) $item->options->sub_total,
                        'product_discount_amount' => $item->options->product_discount ?? 0,
                        'product_discount_type' => $item->options->product_discount_type ?? 'fixed',
                        'product_tax_amount' => (int) ($item->options->product_tax ?? 0),
                        'is_asset' => $isAsset,
                    ]);
                }

            } else {
                // INTELLIGENT ITEM-LEVEL DIFFING FOR AUTO ALLOCATIONS
                $existingDetails = $purchase->purchaseDetails()->get();
                $cartItems = Cart::instance('purchase')->content();

                $processedDetailIds = [];

                foreach ($cartItems as $cart_item) {
                    $subTotal = (int) ($cart_item->options->sub_total ?? $cart_item->subtotal);

                    $detail = $existingDetails->whereNotIn('id', $processedDetailIds)->firstWhere('product_id', $cart_item->id);
                    $product = \Modules\Product\Entities\Product::find($cart_item->id);
                    $isAsset = $cart_item->options->is_asset ?? ($product->is_asset ?? false);

                    if ($detail) {
                        $processedDetailIds[] = $detail->id;
                        $detail->update([
                            'quantity' => $cart_item->qty,
                            'price' => (int) $cart_item->price,
                            'unit_price' => (int) $cart_item->options->unit_price,
                            'sub_total' => $subTotal,
                            'product_discount_amount' => $cart_item->options->product_discount ?? 0,
                            'product_discount_type' => $cart_item->options->product_discount_type ?? 'fixed',
                            'product_tax_amount' => (int) ($cart_item->options->product_tax ?? 0),
                            'is_asset' => $isAsset,
                        ]);

                        if (!$isAsset) {
                            $alloc = \Modules\Purchase\Entities\PurchaseBudgetAllocation::where('purchase_detail_id', $detail->id)->first();
                            if ($alloc) {
                                $itemDelta = $subTotal - $alloc->amount;

                                if ($itemDelta !== 0) {
                                    $alloc->amount += $itemDelta;
                                    if ($alloc->amount < 0)
                                        $alloc->amount = 0;
                                    $alloc->save();

                                    // Since PR is approved and we're just updating 'actuals', they are already 'is_applied' 
                                    if ($alloc->is_applied) {
                                        if ($alloc->source_master_budget_id) {
                                            $mb = MasterBudget::find($alloc->source_master_budget_id);
                                            if ($mb) {
                                                $mb->used_amount += $itemDelta;
                                                if ($mb->used_amount < 0)
                                                    $mb->used_amount = 0;
                                                $mb->save();
                                            }
                                        }
                                        if ($alloc->source_budget_detail_id) {
                                            $bd = \Modules\Budget\Entities\BudgetDetail::find($alloc->source_budget_detail_id);
                                            if ($bd) {
                                                $bd->used_amount += $itemDelta;
                                                if ($bd->used_amount < 0)
                                                    $bd->used_amount = 0;
                                                $bd->save();
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        // NEW ITEM -> Creates detail and allocation dynamically exactly like store()
                        $newDetail = PurchaseDetail::create([
                            'purchase_id' => $purchase->id,
                            'product_id' => $cart_item->id,
                            'product_name' => $cart_item->name,
                            'product_code' => $cart_item->options->code,
                            'product_unit' => $cart_item->options->unit ?? '-',
                            'quantity' => $cart_item->qty,
                            'price' => (int) $cart_item->price,
                            'unit_price' => (int) $cart_item->options->unit_price,
                            'sub_total' => $subTotal,
                            'product_discount_amount' => $cart_item->options->product_discount ?? 0,
                            'product_discount_type' => $cart_item->options->product_discount_type ?? 'fixed',
                            'product_tax_amount' => (int) ($cart_item->options->product_tax ?? 0),
                            'is_asset' => $isAsset,
                        ]);

                        if (!$isAsset && $product) {
                            $isMandatory = $product->is_mandatory ?? false;

                            if ($purchase->borrowed_master_budget_id) {
                                // If PR is already borrowing a budget, use that specific budget
                                $targetMaster = \Modules\Budget\Entities\MasterBudget::find($purchase->borrowed_master_budget_id);
                                $isBorrowedExternal = $targetMaster && $targetMaster->department_id != $purchase->department_id;
                                $isBorrowedInternal = $targetMaster && $targetMaster->department_id == $purchase->department_id;
                            } else {
                                // Otherwise get standard department budget
                                $dateObj = \Carbon\Carbon::parse($purchase->date ?? now());
                                $year = $dateObj->format('Y');
                                $month = (int) $dateObj->format('m');

                                $masterBudgets = \Modules\Budget\Entities\MasterBudget::where('department_id', $purchase->department_id)
                                    ->where('bulan', $month)
                                    ->whereYear('periode_awal', $year)
                                    ->where('status', 'Approved')
                                    ->get();

                                $mandatoryMaster = $masterBudgets->where('is_mandatory', 1)->first();
                                $othersMaster = $masterBudgets->where('is_mandatory', 0)->first();

                                $targetMaster = $isMandatory ? $mandatoryMaster : $othersMaster;
                                $isBorrowedExternal = false;
                                $isBorrowedInternal = false;
                            }

                            if ($targetMaster) {
                                $sourceDetail = \Modules\Budget\Entities\BudgetDetail::where('master_budget_id', $targetMaster->id)
                                    ->where('category_id', $product->category_id)
                                    ->first()
                                    ??
                                    \Modules\Budget\Entities\BudgetDetail::where('master_budget_id', $targetMaster->id)
                                        ->whereHas('category', function ($q) {
                                            $q->where('category_name', 'like', '%All Category%');
                                        })->first();

                                $newAlloc = \Modules\Purchase\Entities\PurchaseBudgetAllocation::create([
                                    'purchase_id' => $purchase->id,
                                    'purchase_detail_id' => $newDetail->id,
                                    'source_master_budget_id' => $targetMaster->id,
                                    'source_budget_detail_id' => $sourceDetail->id ?? null,
                                    'amount' => $subTotal,
                                    'is_borrowed_internal' => $isBorrowedInternal ? 1 : 0,
                                    'is_borrowed_external' => $isBorrowedExternal ? 1 : 0,
                                    'is_applied' => 1
                                ]);

                                // Since PR is approved, increments Master Budget and Budget Detail immediately
                                MasterBudget::where('id', $newAlloc->source_master_budget_id)->increment('used_amount', $subTotal);
                                if ($newAlloc->source_budget_detail_id) {
                                    \Modules\Budget\Entities\BudgetDetail::where('id', $newAlloc->source_budget_detail_id)->increment('used_amount', $subTotal);
                                }
                            }
                        }
                    }
                }

                // REMOVE OLD ITEMS NOT IN NEW CART
                $detailsToDelete = $existingDetails->whereNotIn('id', $processedDetailIds);
                foreach ($detailsToDelete as $d) {
                    $allocs = \Modules\Purchase\Entities\PurchaseBudgetAllocation::where('purchase_detail_id', $d->id)->get();
                    foreach ($allocs as $a) {
                        if ($a->is_applied) {
                            if ($a->source_master_budget_id) {
                                $mb = MasterBudget::find($a->source_master_budget_id);
                                if ($mb && $mb->used_amount >= $a->amount)
                                    $mb->decrement('used_amount', $a->amount);
                            }
                            if ($a->source_budget_detail_id) {
                                $bd = \Modules\Budget\Entities\BudgetDetail::find($a->source_budget_detail_id);
                                if ($bd && $bd->used_amount >= $a->amount)
                                    $bd->decrement('used_amount', $a->amount);
                            }
                        }
                        $a->delete();
                    }
                    $d->delete();
                }
            }

            // ==========================
            // RECALCULATE PURCHASE COLUMNS
            // ==========================
            $sumTotal = 0;
            $sumAsset = 0;
            $sumMandatory = 0;
            $sumOthers = 0;

            foreach (Cart::instance('purchase')->content() as $cart_item) {
                $subTot = (int) ($cart_item->options->sub_total ?? $cart_item->subtotal);
                $sumTotal += $subTot;

                $product = \Modules\Product\Entities\Product::find($cart_item->id);
                $isAsset = $cart_item->options->is_asset ?? ($product->is_asset ?? false);
                $isMandatory = $product->is_mandatory ?? false;

                if ($isAsset) {
                    $sumAsset += $subTot;
                } else {
                    if ($isMandatory) {
                        $sumMandatory += $subTot;
                    } else {
                        $sumOthers += $subTot;
                    }
                }
            }

            $currentAllocations = \Modules\Purchase\Entities\PurchaseBudgetAllocation::where('purchase_id', $purchase->id)->get();
            $sumBudget = $currentAllocations->sum('amount');
            $sumBorrowed = $currentAllocations->where('is_borrowed_internal', 1)->sum('amount') + $currentAllocations->where('is_borrowed_external', 1)->sum('amount');

            $purchase->update([
                'budget_amount' => $sumBudget,
                'mandatory_amount' => $sumMandatory,
                'non_mandatory_amount' => $sumOthers,
                'borrowed_amount' => $sumBorrowed,
                'asset_amount' => $sumAsset,
            ]);

            Cart::instance('purchase')->destroy();
        });

        toast('Actual Purchase & Budget berhasil diperbarui.', 'success');
        return redirect()->route('purchases.index');
    }


    /**
     * Show detail purchase.
     */
    public function show($id)
    {
        $purchase = Purchase::with(['purchaseDetails.product', 'department', 'user'])->findOrFail($id);

        // --- Inisialisasi Variabel ---
        $currentRemainingBudget = 0; // Ini akan menjadi Total Alokasi Budget Dept
        $sisaBudgetSetelahPRIni = 0; // Ini akan menjadi Sisa Budget Dept Saat Ini
        $sisaBudgetTanpaReserved = 0;
        $saldoOverBudget = 0;         // Ini akan menjadi Sisa Budget Non-Dept
        $purchaseDateObj = null;
        $month = null;
        $year = null;

        // --- Ambil Approval Request (Dibutuhkan untuk cek tipe) ---
        $approvalRequest = ApprovalRequest::where('requestable_id', $id)
            ->whereIn('requestable_type', ['Purchase Request', 'Over Budget'])
            ->first();

        // --- Ambil Logs ---
        $approvalLogs = collect();
        if ($approvalRequest) {
            $approvalLogs = $approvalRequest->logs()->with('approver')->get();
        }

        // --- Kalkulasi Budget (jika data ada) ---
        if ($purchase->department_id && $purchase->date) {
            $purchaseDateObj = Carbon::parse($purchase->date);
            $month = $purchaseDateObj->month;
            $year = $purchaseDateObj->year;

            // 1. Ambil data Budget Departemen
            $result = MasterBudget::where('department_id', $purchase->department_id)
                ->where('bulan', $month)
                ->whereYear('periode_awal', $year)
                ->where('status', 'Approved')
                ->selectRaw('SUM(grandtotal) as total_budget, SUM(used_amount) as total_used, SUM(reserved_amount) as total_reserved')
                ->first();

            $totalAlokasi = $result->total_budget ?? 0;

            $currentRemainingBudget = $result->total_budget ?? 0; // Total Alokasi Dept
            $sisaBudgetSetelahPRIni = $currentRemainingBudget - ($result->total_used ?? 0) - ($result->total_reserved ?? 0); // Sisa Budget Dept Saat Ini

            $sisaBudgetTanpaReserved = $totalAlokasi - ($result->total_used ?? 0);

            // 2. Jika ini Over Budget, ambil juga data Budget Non-Departemen
            if (isset($approvalRequest) && $approvalRequest->requestable_type === 'Over Budget') {
                $nonDeptBudget = MasterBudget::where('department_id', 0) // Asumsi ID 0 untuk non-dept
                    ->where('bulan', $month)
                    ->whereYear('periode_awal', $year)
                    ->where('status', 'Approved')
                    ->selectRaw('SUM(grandtotal) as total, SUM(used_amount) as used, SUM(reserved_amount) as reserved')
                    ->first();

                $saldoOverBudget = ($nonDeptBudget->total ?? 0) - ($nonDeptBudget->used ?? 0) - ($nonDeptBudget->reserved ?? 0);
            }
        }

        // Kirim semua data ke view
        return view('purchase::show', compact(
            'purchase',
            'currentRemainingBudget',
            'sisaBudgetSetelahPRIni',
            'sisaBudgetTanpaReserved',
            'approvalLogs',
            'approvalRequest', // Kirim request utama
            'saldoOverBudget'    // Kirim sisa budget non-dept
        ));
    }

    /**
     * Delete purchase.
     */
    public function destroy(Purchase $purchase)
    {
        abort_if(Gate::denies('delete_purchases'), 403);

        try {
            DB::transaction(function () use ($purchase) {
                // The `deleting` event in the Purchase model handles:
                // 1. Budget rollback via PurchaseBudgetAllocation
                // 2. Deletion of PurchaseBudgetAllocation records
                // 3. Deletion of associated ApprovalRequest and logs
                // 4. Deletion of PurchaseDetail records

                $purchase->delete();
            });

            toast('Purchase Deleted!', 'warning');
            return redirect()->route('purchases.index');

        } catch (\Throwable $e) {
            Log::error("Error deleting purchase ID {$purchase->id}: " . $e->getMessage() . "\n" . $e->getTraceAsString());
            return back()->withErrors(['error' => 'Gagal menghapus Purchase Request: ' . $e->getMessage()]);
        }
    }

    private function getBudgetSnapshot($department_id, $date, $purchaseTotalAmount = 0)
    {
        if (!$department_id || !$date) {
            return (object) ['current_remaining' => 0, 'remaining_after_this_pr' => 0];
        }

        $purchaseDateObj = Carbon::parse($date);
        $month = $purchaseDateObj->month;
        $year = $purchaseDateObj->year;

        // 1. Ambil data budget (HANYA grandtotal dan used_amount, TANPA reserved_amount)
        //    (Sesuai dengan logika di method show() Anda)
        $result = MasterBudget::where('department_id', $department_id)
            ->where('bulan', $month)
            ->whereYear('periode_awal', $year)
            ->where('status', 'Approved') // Pastikan 'Approved'
            ->selectRaw('SUM(grandtotal) as total_budget, SUM(used_amount) as total_used')
            ->first();

        // 2. Hitung Sisa Budget SAAT INI (Total Alokasi - Yang Sudah Dipakai)
        $currentRemainingBudget = ($result->total_budget ?? 0) - ($result->total_used ?? 0);

        // 3. Hitung Sisa Budget SETELAH DIKURANGI PR INI
        $sisaBudgetSetelahPRIni = $currentRemainingBudget - $purchaseTotalAmount;

        return (object) [
            // Ini adalah 'currentRemainingBudget' dari contoh Anda
            'total' => $currentRemainingBudget,

            // Ini adalah 'sisaBudgetSetelahPRIni' dari contoh Anda
            'remaining' => $sisaBudgetSetelahPRIni
        ];
    }

    public function pending(Request $request)
    {
        $status = $request->get('status', 'pending');

        $user = auth()->user();

        $pendingPurchases = Purchase::with([
            'department',
            'user',
            'approvalRequest.logs.approver',
        ])
            // 🔹 Jika user bukan admin (department_id ≠ 0)
            ->when($user->department_id != 0, function ($query) use ($user) {
                // Hanya tampilkan data milik departemennya
                // $query->where('department_id', $user->department_id);
                $query->where(function ($q) use ($user) {
                    $q->where('department_id', $user->department_id)
                        ->orWhere('department_id', 0);
                });
            })
            // 🔹 Filter status (jika bukan 'all')
            ->when($status != 'all', function ($query) use ($status) {
                $query->where('status', $status);
            })
            ->orderByDesc('created_at')
            ->get();

        return view('purchase::pending', [
            'pendingPurchases' => $pendingPurchases,
            'activeStatus' => $status,
        ]);
    }

    public function print($id)
    {
        $purchase = Purchase::findOrFail($id);
        $supplier = null;
        if ($purchase->supplier_id) {
            $supplier = Supplier::find($purchase->supplier_id);
        }

        $purchaseDate = Carbon::parse($purchase->date);
        $day = $purchaseDate->day;
        $month = $purchaseDate->month;
        $year = $purchaseDate->year;

        // Ini adalah cara Dompdf (sintaksnya hampir identik)
        $pdf = PDF::loadView('purchase::print', [
            'purchase' => $purchase,
            'supplier' => $supplier,
        ])->setPaper('a4', 'portrait')
            ->setOption('margin-top', 0)
            ->setOption('margin-right', 0)
            ->setOption('margin-bottom', 0)
            ->setOption('margin-left', 0);

        return $pdf->stream('Purchase Request-' . $purchase->reference . '-(' . $day . '-' . $month . '-' . $year . ').pdf');
    }

    public function printAll(Request $request)
    {
        // 1. Mulai query dasar (sama seperti di query() DataTable)
        $query = Purchase::with(['user', 'department']);

        // 2. Tiru filter search dari DataTable
        if ($request->has('search') && $request->search != '') {
            $search = $request->search;

            // Sesuaikan ini agar cocok dengan kolom yang bisa dicari
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'LIKE', "%{$search}%")
                    ->orWhere('status', 'LIKE', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'LIKE', "%{$search}%");
                    })
                    ->orWhereHas('department', function ($dq) use ($search) {
                        $dq->where('department_name', 'LIKE', "%{$search}%");
                    });
            });
        }

        $purchases = $query->orderBy('date', 'desc')->get();

        // 3. Muat view 'print_all' dengan data
        $pdf = PDF::loadView('purchase::print_all', compact('purchases'))
            ->setPaper('a4', 'portrait')
            ->setOption('margin-top', 0)
            ->setOption('margin-right', 0)
            ->setOption('margin-bottom', 0)
            ->setOption('margin-left', 0);

        return $pdf->stream('semua-purchase-request.pdf');
    }
}