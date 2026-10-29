<?php

namespace Modules\TargetSale\Http\Controllers;

use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Auth;
use Modules\TargetSale\DataTables\TargetSalesDataTable;
use Modules\TargetSale\Entities\TargetSale;
use Modules\TargetSale\Http\Requests\StoreTargetSaleRequest;
use Modules\TargetSale\Http\Requests\UpdateTargetSaleRequest;
use Modules\Approval\Services\ApprovalEngine;
// use Modules\Approval\Entities\ApprovalRequest; // Tidak dipakai sementara
// use Modules\Approval\Entities\ApprovalRule; // Tidak dipakai sementara
// use Modules\Approval\Entities\ApprovalRuleLevel; // Tidak dipakai sementara
// use Modules\Approval\Entities\ApprovalRuleUser; // Tidak dipakai sementara
use PDF;

class TargetSalesController extends Controller
{
    protected $approvalEngine;

    public function __construct(ApprovalEngine $approvalEngine)
    {
        $this->approvalEngine = $approvalEngine;
    }

    public function index(Request $request, TargetSalesDataTable $dataTable)
    {
        // Jika request dari Next.js (ingin JSON) atau via API
        if ($request->wantsJson() || $request->is('api/*') || $request->query('year') || $request->query('status')) {
            $year = $request->query('year');
            $status = $request->query('status');
            $query = TargetSale::with(['creator', 'approvalRequest.logs.user']);

            if ($year) {
                $query->where('year', $year);
            }

            if ($status) {
                $query->where(function ($q) use ($status) {
                    $q->where('status', $status)
                        ->orWhere('status', strtolower($status))
                        ->orWhere('status', ucfirst(strtolower($status)));
                });
            }

            return response()->json([
                'data' => $query->orderBy('year', 'desc')->orderBy('month', 'desc')->get()
            ]);
        }

        // Default logic untuk Blade (Backend)
        abort_if(Gate::denies('access_target_sales'), 403);
        return $dataTable->render('targetsale::index');
    }

    public function create(Request $request)
    {
        // Jika request dari Next.js (ingin JSON)
        if ($request->wantsJson()) {
            return response()->json([
                'reference' => $this->generateReference()
            ]);
        }

        abort_if(Gate::denies('create_target_sales'), 403);

        $reference = $this->generateReference();

        return view('targetsale::create', compact('reference'));
    }

    private function generateReference($year = null, $month = null)
    {
        $year = $year ?: date('Y');
        $month = $month ?: date('n');

        $yy = substr($year, -2);
        $mm = str_pad($month, 2, '0', STR_PAD_LEFT);

        return "TRGT/EPU/{$yy}/{$mm}";
    }

    public function store(Request $request)
    {
        // 1. Bersihkan Format Rupiah SEBELUM Validasi
        $rawAmount = $request->target_amount;
        // Hapus semua karakter kecuali angka
        $cleanAmount = (float) preg_replace('/[^0-9]/', '', $rawAmount);

        // Ganti input request dengan angka bersih
        $request->merge(['target_amount' => $cleanAmount]);

        // 2. Validasi Input
        $request->validate([
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer',
            'target_amount' => 'required|numeric|min:1',
        ]);

        // 3. Cek Duplikasi (Agar tidak ada double data di bulan & tahun yang sama)
        $exists = TargetSale::where('month', $request->month)
            ->where('year', $request->year)
            ->exists();

        if ($exists) {
            return back()->withErrors(['month' => 'Target Sales untuk periode bulan & tahun ini sudah ada.'])->withInput();
        }

        // 4. Proses Simpan
        try {
            DB::transaction(function () use ($request, $cleanAmount) {

                // A. Generate Reference
                $reference = $this->generateReference($request->year, $request->month);

                $userId = Auth::id() ?: $request->user_id;

                // B. Create Data
                $targetSale = TargetSale::create([
                    'reference' => $reference,
                    'month' => $request->month,
                    'year' => $request->year,
                    'target_amount' => $cleanAmount,
                    'description' => $request->description,
                    'status' => 'Pending',
                    'created_by' => $userId,
                ]);

                // 🔗 Integrasi Approval
                // Cari ID Tipe Approval 'Sales'
                $approvalType = \Modules\Approval\Entities\ApprovalType::where('approval_code', 'Sales')->first();

                if (!$approvalType) {
                    throw new \Exception("Tipe Approval 'Sales' tidak ditemukan.");
                }

                $approval = $this->approvalEngine->createRequest(
                    $targetSale->getMorphClass(),
                    $targetSale->id,
                    $approvalType->id,
                    $targetSale->target_amount,
                    $userId
                );

                // Update status TargetSale sesuai hasil dari engine (jika auto-approve dsb)
                if ($targetSale->status !== $approval->status) {
                    $targetSale->update(['status' => $approval->status]);
                }

                return response()->json([
                    'message' => 'Target Sales berhasil dibuat dan sedang menunggu approval.',
                    'data' => $targetSale
                ], 201);
            });

        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal menyimpan: ' . $e->getMessage()], 422);
        }
    }

    public function show(Request $request, $id)
    {
        if ($request->wantsJson()) {
            $targetSale = TargetSale::with(['creator', 'approvalRequest.logs.user'])->findOrFail($id);
            return response()->json(['data' => $targetSale]);
        }

        abort_if(Gate::denies('show_target_sales'), 403);

        $targetSale = TargetSale::with(['creator', 'approvalRequest.logs.user'])->findOrFail($id);
        $approvalLogs = $targetSale->approvalRequest ? $targetSale->approvalRequest->logs : collect();

        return view('targetsale::show', compact('targetSale', 'approvalLogs'));
    }

    public function edit(Request $request, $id)
    {
        $targetSale = TargetSale::findOrFail($id);

        if (!in_array(strtolower($targetSale->status), ['pending', 'approved'])) {
            return response()->json(['message' => 'Hanya Target Sales dengan status Pending atau Approved yang dapat diedit.'], 403);
        }

        if ($request->wantsJson()) {
            return response()->json(['data' => $targetSale]);
        }

        abort_if(Gate::denies('edit_target_sales'), 403);

        return view('targetsale::edit', compact('targetSale'));
    }

    public function update(Request $request, $id)
    {
        $targetSale = TargetSale::findOrFail($id);

        if (!in_array(strtolower($targetSale->status), ['pending', 'approved'])) {
            return response()->json(['message' => 'Hanya Target Sales dengan status Pending atau Approved yang dapat diupdate.'], 403);
        }

        // Validasi input manual karena tidak pakai Request Class khusus
        $request->validate([
            'month' => 'required|integer',
            'year' => 'required|integer',
            'target_amount' => 'required',
        ]);

        // --- TAMBAHAN: Cek Duplikasi saat Update ---
        $exists = TargetSale::where('month', $request->month)
            ->where('year', $request->year)
            ->where('id', '!=', $id)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Gagal update: Target Sales untuk periode bulan & tahun ini sudah ada.'], 422);
        }

        try {
            DB::transaction(function () use ($request, $targetSale) {
                // Bersihkan format rupiah
                $amount = preg_replace('/[^0-9]/', '', $request->target_amount);
                $oldStatus = strtolower($targetSale->status);
                $userId = Auth::id() ?: $request->user_id;

                $targetSale->update([
                    'month' => $request->month,
                    'year' => $request->year,
                    'target_amount' => (float) $amount,
                    'description' => $request->description,
                    'status' => 'Pending', // Selalu reset ke Pending jika di-update
                ]);

                // 🔗 Cek apakah perlu (ulang) Approval
                $approvalRequest = $targetSale->approvalRequest;

                if ($oldStatus === 'pending' && $approvalRequest) {
                    // Jika masih pending, tidak perlu buat baru, cukup refresh data & restart flow
                    $this->approvalEngine->refreshRequest($approvalRequest, $targetSale->target_amount, $userId);
                } else {
                    // Jika sebelumnya sudah Approved, atau belum ada request sama sekali
                    if ($approvalRequest) {
                        $approvalRequest->logs()->delete();
                        $approvalRequest->delete();
                    }

                    // Cari ID Tipe Approval 'Sales'
                    $approvalType = \Modules\Approval\Entities\ApprovalType::where('approval_code', 'Sales')->first();

                    if (!$approvalType) {
                        throw new \Exception("Tipe Approval 'Sales' tidak ditemukan.");
                    }

                    $approval = $this->approvalEngine->createRequest(
                        $targetSale->getMorphClass(),
                        $targetSale->id,
                        $approvalType->id,
                        $targetSale->target_amount,
                        $userId
                    );

                    // Update status TargetSale sesuai hasil dari engine (jika auto-approve dsb)
                    if ($targetSale->status !== $approval->status) {
                        $targetSale->update(['status' => $approval->status]);
                    }
                }
            });

            return response()->json(['message' => 'Target Sales berhasil diperbarui.', 'data' => $targetSale]);

        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gagal update: ' . $e->getMessage()], 422);
        }
    }

    public function destroy(Request $request, $id)
    {
        $targetSale = TargetSale::findOrFail($id);

        // if (strtolower($targetSale->status) !== 'pending') {
        //     return response()->json(['message' => 'Hanya Target Sales dengan status Pending yang dapat dihapus.'], 403);
        // }

        try {
            DB::transaction(function () use ($targetSale) {
                // Deletion of approval requests should ideally be handled by model events
                $targetSale->delete();
            });

            return response()->json(['message' => 'Target Sales berhasil dihapus.']);

        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gagal menghapus: ' . $e->getMessage()], 422);
        }
    }

    public function pending(Request $request)
    {
        $pendingTargets = TargetSale::where('status', 'Pending')->get();
        return response()->json(['data' => $pendingTargets]);
    }

    public function approve(Request $request, $id)
    {
        try {
            $targetSale = TargetSale::findOrFail($id);
            $approvalRequest = $targetSale->approvalRequest;

            if (!$approvalRequest) {
                throw new \Exception("Approval request tidak ditemukan.");
            }

            $userId = Auth::id() ?: $request->user_id;
            $this->approvalEngine->process($approvalRequest, $userId, 'approved', $request->comment);

            return response()->json([
                'success' => true,
                'message' => 'Target Sales berhasil di-approve.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal approve: ' . $e->getMessage()
            ], 422);
        }
    }

    public function reject(Request $request, $id)
    {
        try {
            $targetSale = TargetSale::findOrFail($id);
            $approvalRequest = $targetSale->approvalRequest;

            if (!$approvalRequest) {
                throw new \Exception("Approval request tidak ditemukan.");
            }

            $userId = Auth::id() ?: $request->user_id;
            $this->approvalEngine->process($approvalRequest, $userId, 'rejected', $request->comment);

            return response()->json([
                'success' => true,
                'message' => 'Target Sales berhasil di-reject.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal reject: ' . $e->getMessage()
            ], 422);
        }
    }

    public function printAll(Request $request)
    {
        $query = TargetSale::query();

        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->where('year', 'LIKE', "%{$search}%")
                ->orWhere('status', 'LIKE', "%{$search}%");
        }

        $targets = $query->orderBy('year', 'desc')->orderBy('month', 'desc')->get();

        $pdf = PDF::loadView('targetsale::print_all', compact('targets'))
            ->setPaper('a4', 'landscape');

        return $pdf->stream('semua-target-sales.pdf');
    }
}