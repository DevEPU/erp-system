<?php

namespace Modules\Budget\Http\Controllers;

use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Modules\Budget\DataTables\MasterBudgetsDataTable;
use Modules\Budget\Entities\MasterBudget;
use Modules\Budget\Entities\BudgetDetail;
use Modules\Approval\Entities\ApprovalRequest;
use Modules\Approval\Services\ApprovalEngine;
use Illuminate\Support\Facades\Auth;
use Modules\Approval\Entities\ApprovalType;
use Modules\Approval\Entities\ApprovalRule;
use Modules\Approval\Entities\ApprovalRuleLevel;
use Modules\Approval\Entities\ApprovalRequestLog;
use Modules\Approval\Entities\ApprovalRuleUser;
use PDF;

class MasterBudgetsController extends Controller
{
    protected $approvalEngine;

    public function __construct(ApprovalEngine $approvalEngine)
    {
        $this->approvalEngine = $approvalEngine;
    }

    public function index(MasterBudgetsDataTable $dataTable)
    {
        abort_if(Gate::denies('access_budget'), 403);
        return $dataTable->render('budget::master_budget.index');
    }

    public function create()
    {
        abort_if(Gate::denies('create_budget'), 403);
        // $lastBudget = MasterBudget::orderBy('id', 'desc')->first();
        // $nextNumber = $lastBudget ? (int) str_replace('BDGT', '', $lastBudget->no_budgeting) + 1 : 1;
        // $noBudgeting = 'BDGT' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
        $noBudgeting = 'Auto Generated'; // Display placeholder

        $departments = \Modules\Department\Entities\Departments::all();
        $categories = \Modules\Product\Entities\Category::all();

        return view('budget::master_budget.create', compact('categories', 'departments', 'noBudgeting'));
    }

    public function store(Request $request)
    {
        $request->validate([
            'tgl_penyusunan' => 'required|date',
            'bulan' => 'required',
            'department_id' => [
                'required',
                'integer',
                function ($attribute, $value, $fail) {
                    if ($value != 0 && !\DB::table('departments')->where('id', $value)->exists()) {
                        $fail('Departemen tidak valid.');
                    }
                },
            ],
            'grandtotal' => 'required',
            'description' => 'nullable|string',
            'user_id' => 'required|integer',
        ]);

        $rule = ApprovalRule::whereHas('type', function ($query) {
            $query->where('approval_name', 'Master Budget');
        })->first();

        if (!$rule) {
            // Jika tidak ditemukan, berarti tidak ada aturan yang terhubung dengan tipe tersebut
            return back()->withErrors(['error' => 'Aturan Approval (Approval Rule) untuk "Master Budget" tidak ditemukan atau belum dikonfigurasi.'])->withInput();
        }

        $approvalTypesId = $rule->approval_types_id;

        // Buat nomor budgeting otomatis
        // $lastBudget = MasterBudget::orderBy('id', 'desc')->first();
        // $nextNumber = $lastBudget ? (int) str_replace('BDGT', '', $lastBudget->no_budgeting) + 1 : 1;
        // $noBudgeting = 'BDGT' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
        $noBudgeting = null; // Auto-generated

        try {
            DB::transaction(function () use ($request, $noBudgeting, $approvalTypesId) {

                // Pastikan nilai grandtotal numerik (hapus format "Rp" atau koma)
                $grandtotal = preg_replace('/[^0-9.]/', '', $request->grandtotal);

                \Log::info('Master Budget Store Request:', $request->all());
                \Log::info('User ID override:', ['user_id' => $request->user_id, 'auth_id' => auth()->id()]);


                // Calculate Period Dates based on Input
                $year = \Carbon\Carbon::parse($request->tgl_penyusunan)->year;
                $month = $request->bulan;

                $periodeAwal = \Carbon\Carbon::createFromDate($year, $month, 1)->startOfMonth()->format('Y-m-d');
                $periodeAkhir = \Carbon\Carbon::createFromDate($year, $month, 1)->endOfMonth()->format('Y-m-d');

                $master = MasterBudget::create([
                    'no_budgeting' => $noBudgeting,
                    'tgl_penyusunan' => $request->tgl_penyusunan,
                    'bulan' => $request->bulan,
                    'periode_awal' => $periodeAwal,
                    'periode_akhir' => $periodeAkhir,
                    'department_id' => $request->department_id,
                    'description' => $request->description,
                    'grandtotal' => (float) $grandtotal,
                    'status' => 'Pending',
                    'used_amount' => 0,
                    'reserved_amount' => 0,
                    'created_by' => $request->input('user_id'), // Save creator ID
                ]);

                // Simpan detail
                if ($request->filled('items')) {
                    foreach ($request->items as $item) {
                        BudgetDetail::create([
                            'master_budget_id' => $master->id,
                            'category_id' => $item['category_id'] ?? null,
                            'category_name' => $item['category_name'] ?? null,
                            'budget' => (float) preg_replace('/[^0-9.]/', '', $item['budget'] ?? 0),
                        ]);
                    }
                }

                // 🔗 Integrasi Approval
                $creatorId = $request->input('user_id');
                \Log::info('Approval Creator ID (Forced):', ['creator_id' => $creatorId]);

                $approval = $this->approvalEngine->createRequest( // Gunakan $this->approvalEngine
                    'Master Budget',
                    $master->id,
                    $approvalTypesId,
                    $master->grandtotal,
                    $creatorId
                );

                // (Opsional) Update status MasterBudget sesuai hasil dari engine
                if ($master->status !== $approval->status) {
                    $master->update(['status' => $approval->status]);
                }

                $master->update(['approval_request_id' => $approval->id]);
            });

            return redirect()
                ->route('master_budget.index')
                ->with('success', 'Budget berhasil disimpan.');
        } catch (\Throwable $e) { // <-- BLOK CATCH AKAN MENANGKAP ERROR

            // Kirim pengguna kembali ke form dengan pesan error
            return back()->withErrors(['error' => $e->getMessage()])->withInput();
        }
    }

    public function show($id)
    {
        abort_if(Gate::denies('show_budget'), 403);
        // Ambil data MasterBudget
        $budget = MasterBudget::with('details', 'department')->findOrFail($id);

        // 2. Ambil Approval Logs sesuai alur yang Anda minta:
        //    Mulai dari ApprovalRequestLog -> cek relasi approvalRequest -> cocokkan ID & Tipe
        $approvalLogs = ApprovalRequestLog::with('approver') // Ambil juga data user approver
            ->whereHas('approvalRequest', function ($query) use ($id) {
                // Filter relasi 'approvalRequest'
                $query->whereIn('requestable_type', ['Master Budget', \Modules\Budget\Entities\MasterBudget::class]) // Sesuaikan string 'Master Budget'
                    ->where('requestable_id', $id); // Cocokkan dengan ID MasterBudget
            })
            ->get(); // Ambil semua log yang cocok

        // 3. Kirim kedua data ke view
        return view('budget::master_budget.show', compact('budget', 'approvalLogs'));
    }

    public function edit($id)
    {
        abort_if(Gate::denies('edit_budget'), 403);
        $masterBudget = MasterBudget::with('details')->findOrFail($id);

        if (strtolower($masterBudget->status) !== 'pending') {
            return redirect()->route('master_budget.show', $masterBudget->id)
                ->withErrors(['error' => 'Hanya Master Budget dengan status "Pending" yang dapat diedit.']);
        }

        $departments = \Modules\Department\Entities\Departments::all();
        $categories = \Modules\Product\Entities\Category::all();

        return view('budget::master_budget.edit', compact('masterBudget', 'departments', 'categories'));
    }

    public function update(Request $request, $id)
    {
        $masterBudget = MasterBudget::with('details')->findOrFail($id);

        if (strtolower($masterBudget->status) !== 'pending') {
            return redirect()
                ->route('master_budget.show', $masterBudget->id) // Arahkan kembali ke halaman 'show'
                ->withErrors(['error' => 'Hanya Master Budget dengan status "Pending" yang dapat diedit.']);
        }

        // Validasi input
        $request->validate([
            'tgl_penyusunan' => 'required|date',
            'bulan' => 'required',
            'periode_awal' => 'required|date',
            'periode_akhir' => 'required|date',
            'department_id' => 'required|exists:departments,id',
            'grandtotal' => 'required',
            'description' => 'nullable|string',
        ]);

        DB::transaction(function () use ($request, $masterBudget) {
            // Bersihkan format angka (hilangkan Rp dan tanda koma)
            $grandtotal = preg_replace('/[^0-9.]/', '', $request->grandtotal);

            // Update data master tanpa mengubah approval_status, used_amount, dan reserved_amount
            $masterBudget->update([
                'tgl_penyusunan' => $request->tgl_penyusunan,
                'bulan' => $request->bulan,
                'periode_awal' => $request->periode_awal,
                'periode_akhir' => $request->periode_akhir,
                'department_id' => $request->department_id,
                'description' => $request->description,
                'grandtotal' => (float) $grandtotal,
            ]);

            // 🔄 Update detail — hapus dulu lalu isi ulang, bisa juga pakai upsert kalau mau lebih efisien
            $masterBudget->details()->delete();

            if ($request->filled('items')) {
                foreach ($request->items as $item) {
                    BudgetDetail::create([
                        'master_budget_id' => $masterBudget->id,
                        'category_id' => $item['category_id'] ?? null,
                        'category_name' => $item['category_name'] ?? null,
                        'budget' => (float) preg_replace('/[^0-9.]/', '', $item['budget'] ?? 0),
                    ]);
                }
            }
        });

        return redirect()
            ->route('master_budget.index')
            ->with('success', 'Data master budget berhasil diperbarui.');
    }

    public function destroy($id)
    {
        abort_if(Gate::denies('delete_budget'), 403);
        $budget = MasterBudget::findOrFail($id);

        try {
            DB::transaction(function () use ($budget) {

                $budget->delete();

            });

            return redirect()->route('master_budget.index')->with('success', 'Budget berhasil dihapus.');

        } catch (\Throwable $e) {
            return back()->withErrors(['error' => 'Gagal menghapus Master Budget: ' . $e->getMessage()]);
        }
    }

    public function approve($id)
    {
        $budget = MasterBudget::findOrFail($id);

        if (!Gate::allows('approve-budget', $budget)) {
            return response()->json(['error' => 'Anda tidak punya akses untuk approve.'], 403);
        }

        try {
            $userId = Auth::id();
            $approvalRequest = ApprovalRequest::whereIn('requestable_type', ['Master Budget', \Modules\Budget\Entities\MasterBudget::class])
                ->where('requestable_id', $budget->id)
                ->first();

            if (!$approvalRequest) {
                // Fallback direct update if no request found (legacy data integrity)
                $budget->update(['status' => 'Approved']);
                return response()->json(['success' => true, 'message' => 'Budget berhasil disetujui (Direct).']);
            }

            // Gunakan Approval Engine untuk memproses
            $this->approvalEngine->process($approvalRequest, $userId, 'approved');

            return response()->json(['success' => true, 'message' => 'Budget berhasil disetujui.']);

        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function reject(Request $request, $id)
    {
        $request->validate([
            'notes' => 'required|string|min:5',
        ]);

        $budget = MasterBudget::findOrFail($id);

        if (!Gate::allows('approve-budget', $budget)) {
            return response()->json(['error' => 'Anda tidak punya akses untuk reject.'], 403);
        }

        try {
            $userId = Auth::id();
            $approvalRequest = ApprovalRequest::whereIn('requestable_type', ['Master Budget', \Modules\Budget\Entities\MasterBudget::class])
                ->where('requestable_id', $budget->id)
                ->first();

            if ($approvalRequest) {
                // Gunakan Approval Engine
                $this->approvalEngine->process($approvalRequest, $userId, 'rejected', $request->notes);

                // Note: Approval Engine syncs 'status' => 'rejected'. 
                // Kita perlu update 'notes' manually jika ApprovalRequest tidak menyimpan notes di model induk secara otomatis (engine hanya sync status).
                $budget->update(['notes' => $request->notes]);

            } else {
                // Fallback
                $budget->update([
                    'status' => 'Rejected',
                    'notes' => $request->notes
                ]);
            }

            return response()->json(['success' => true, 'message' => 'Budget berhasil ditolak.']);

        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function updateStatus(Request $request, $id)
    {
        $budget = MasterBudget::findOrFail($id);

        $status = $request->input('status');
        $reason = $request->input('reason');

        // Update status
        $budget->status = $status;

        // Jika rejected, simpan alasan di kolom notes
        if ($status === 'rejected') {
            // $budget->notes = $reason;
        }

        $budget->save();

        return response()->json(['success' => true]);
    }

    public function pending(Request $request)
    {
        // 1. Ambil status dari URL (default 'pending')
        $activeStatus = $request->query('status', 'pending');

        // 2. Mulai query, muat relasi
        $query = MasterBudget::with(['department', 'approvalRequest.logs.approver']);

        // 3. Ambil data user login
        $user = auth()->user();

        // 4. Jika user bukan admin (department_id ≠ 0)
        if ($user->department_id != 0) {
            $query->where(function ($q) use ($user) {
                $q->where('department_id', $user->department_id)
                    ->orWhere('department_id', 0);
            });
            // Hanya tampilkan data milik departemennya
            // $query->where('department_id', $user->department_id);
        }

        // 5. Terapkan filter status (jika bukan 'all')
        if ($activeStatus !== 'all') {
            $query->where('status', ucfirst($activeStatus));
        }

        // 6. Urutkan dan ambil data
        $allBudgets = $query->orderBy('tgl_penyusunan', 'desc')->get();

        // 7. Kirim data dan status aktif ke view
        return view('budget::master_budget.pending', [
            'pendingBudgets' => $allBudgets,
            'activeStatus' => $activeStatus,
        ]);
    }

    public function printAll(Request $request)
    {
        // 1. Mulai query dasar (sama seperti di query() DataTable)
        $query = MasterBudget::with('department');

        // 2. Tiru filter search dari DataTable
        if ($request->has('search') && $request->search != '') {
            $search = $request->search;

            // Sesuaikan ini agar cocok dengan kolom yang bisa dicari
            $query->where(function ($q) use ($search) {
                $q->where('no_budgeting', 'LIKE', "%{$search}%")
                    ->orWhere('description', 'LIKE', "%{$search}%")
                    ->orWhere('status', 'LIKE', "%{$search}%")
                    ->orWhereHas('department', function ($dq) use ($search) {
                        $dq->where('department_name', 'LIKE', "%{$search}%");
                    });
            });
        }

        $budgets = $query->orderBy('tgl_penyusunan', 'desc')->get();

        // 3. Muat view 'print_all' dengan data
        $pdf = PDF::loadView('budget::master_budget.print_all', compact('budgets'))
            ->setPaper('a4', 'portrait')
            ->setOption('margin-top', 0)
            ->setOption('margin-right', 0)
            ->setOption('margin-bottom', 0)
            ->setOption('margin-left', 0);

        return $pdf->stream('semua-master-budget.pdf');
    }
}