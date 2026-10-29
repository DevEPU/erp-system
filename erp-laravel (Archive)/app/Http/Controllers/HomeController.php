<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Modules\Purchase\Entities\Purchase;
use Modules\Budget\Entities\MasterBudget;
use Modules\TargetSale\Entities\TargetSale;

class HomeController extends Controller
{
    public function index(Request $request)
    {
        $month = $request->get('month', Carbon::now()->month);
        $year = $request->get('year', Carbon::now()->year);

        // 1. Total Budget Disetujui
        $approved_budget = MasterBudget::where('status', 'Approved')
            ->whereMonth('periode_awal', $month)
            ->whereYear('periode_awal', $year)
            ->sum('grandtotal');

        // 2. Total Pembelian Disetujui (Penggunaan Budget) - Hanya Non-Asset
        $purchases = \Modules\Purchase\Entities\PurchaseDetail::whereHas('purchase', function ($q) use ($month, $year) {
            $q->where('status', 'Approved')
                ->whereMonth('date', $month)
                ->whereYear('date', $year);
        })
            ->where('is_asset', false)
            ->sum('sub_total');

        // 3. Total Asset Disetujui
        $total_assets = \Modules\Purchase\Entities\PurchaseDetail::whereHas('purchase', function ($q) use ($month, $year) {
            $q->where('status', 'Approved')
                ->whereMonth('date', $month)
                ->whereYear('date', $year);
        })
            ->where('is_asset', true)
            ->sum('sub_total');

        // 4. Sisa Budget (Budget - Pembelian Approved Non-Asset)
        $remaining_budget = $approved_budget - $purchases;

        // 4. Total PR Pending (Belum diapprove)
        $pending_purchases = Purchase::where('status', 'Pending')
            ->whereMonth('date', $month)
            ->whereYear('date', $year)
            ->sum('total_amount');

        return view('home', [
            'approved_budget' => $approved_budget,
            'purchases' => $purchases,
            'remaining_budget' => $remaining_budget,
            'total_assets' => $total_assets,
            'pending_purchases' => $pending_purchases,
            'month' => $month,
            'year' => $year,
            'monthName' => Carbon::create()->month($month)->translatedFormat('F'),
        ]);
    }

    public function totalBudgetPurchase(Request $request)
    {
        $month = $request->get('month', now()->month);
        $year = $request->get('year', now()->year);

        $approved_budget = MasterBudget::where('status', 'Approved')
            ->whereMonth('periode_awal', $month)
            ->whereYear('periode_awal', $year)
            ->sum('grandtotal');

        $purchases = \Modules\Purchase\Entities\PurchaseDetail::whereHas('purchase', function ($q) use ($month, $year) {
            $q->where('status', 'Approved')
                ->whereMonth('date', $month)
                ->whereYear('date', $year);
        })
            ->where('is_asset', false)
            ->sum('sub_total');

        $total_assets = \Modules\Purchase\Entities\PurchaseDetail::whereHas('purchase', function ($q) use ($month, $year) {
            $q->where('status', 'Approved')
                ->whereMonth('date', $month)
                ->whereYear('date', $year);
        })
            ->where('is_asset', true)
            ->sum('sub_total');

        // Hitung Data Baru
        $remaining_budget = $approved_budget - $purchases;

        $pending_purchases = Purchase::where('status', 'Pending')
            ->whereMonth('date', $month)
            ->whereYear('date', $year)
            ->sum('total_amount');

        return response()->json([
            'approved_budget' => $approved_budget,
            'purchases' => $purchases,
            'remaining_budget' => $remaining_budget,
            'total_assets' => $total_assets,
            'pending_purchases' => $pending_purchases,
        ]);
    }

    public function budgetPurchasesChart(Request $request)
    {
        $month = $request->get('month', now()->month);
        $year = $request->get('year', now()->year);
        $department_id = $request->get('department_id');

        $daysInMonth = Carbon::createFromDate($year, $month, 1)->daysInMonth;
        $labels = [];
        $approvedBudgets = [];
        $approvedPurchases = [];

        $totalBudgetQuery = MasterBudget::where('status', 'Approved')
            ->whereMonth('periode_awal', $month)
            ->whereYear('periode_awal', $year);

        if ($department_id) {
            $totalBudgetQuery->where('department_id', $department_id);
        }

        $totalBudget = $totalBudgetQuery->sum('grandtotal');

        $cumulativePurchase = 0;

        for ($day = 1; $day <= $daysInMonth; $day++) {
            $labels[] = $day;

            $dailyPurchaseQuery = Purchase::where('status', 'Approved')
                ->whereMonth('date', $month)
                ->whereYear('date', $year)
                ->whereDay('date', $day);

            if ($department_id) {
                $dailyPurchaseQuery->where('department_id', $department_id);
            }

            $dailyPurchase = $dailyPurchaseQuery->sum('total_amount');

            $cumulativePurchase += $dailyPurchase;

            $approvedPurchases[] = $cumulativePurchase;
            $approvedBudgets[] = max($totalBudget - $cumulativePurchase, 0);
        }

        return response()->json([
            'labels' => $labels,
            'approvedBudgets' => $approvedBudgets,
            'approvedPurchases' => $approvedPurchases,
        ]);
    }

    public function budgetByDepartmentChart(Request $request)
    {
        $month = $request->get('month', now()->month);
        $year = $request->get('year', now()->year);

        $budgets = MasterBudget::with('department')
            ->where('status', 'Approved')
            ->whereYear('periode_awal', $year)
            ->whereMonth('periode_awal', $month)
            ->get();

        $grouped = $budgets->groupBy(function ($item) {
            return $item->department ? $item->department->department_name : 'Budget Lain-lain';
        });

        $labels = [];
        $data = [];

        foreach ($grouped as $departmentName => $items) {
            $labels[] = $departmentName;
            $data[] = $items->sum('grandtotal');
        }

        if (empty($labels)) {
            $labels = ['No Data'];
            $data = [1];
        }

        return response()->json([
            'labels' => $labels,
            'data' => $data,
        ]);
    }

    public function currentMonthChart(Request $request)
    {
        abort_if(!request()->ajax(), 404);

        $month = $request->get('month', now()->month);
        $year = $request->get('year', now()->year);

        $budgets = MasterBudget::where('status', 'Approved')
            ->whereMonth('periode_awal', $month)
            ->whereYear('periode_awal', $year)
            ->select('department_id', DB::raw('SUM(grandtotal) as total'))
            ->groupBy('department_id')
            ->with('department')
            ->get();

        $labels = $budgets->map(fn($b) => $b->department->name ?? 'Unknown')->toArray();
        $data = $budgets->pluck('total')->toArray();

        if (empty($labels)) {
            $labels = ['No Data'];
            $data = [1];
        }

        $total = array_sum($data);
        $percentages = array_map(fn($value) => $total > 0 ? round(($value / $total) * 100, 2) : 0, $data);

        return response()->json([
            'labels' => $labels,
            'percentages' => $percentages,
        ]);
    }

    public function targetVsPurchaseChart(Request $request)
    {
        $year = $request->get('year', now()->year);

        $labels = [];
        $targetAmounts = [];
        $limit065s = [];
        $mandatoryPurchases = [];
        $othersPurchases = [];
        $assetPurchases = [];

        for ($month = 1; $month <= 12; $month++) {
            $labels[] = Carbon::createFromDate($year, $month, 1)->translatedFormat('M');

            $targetAmount = TargetSale::where('year', $year)
                ->where('month', $month)
                ->where('status', 'Approved')
                ->sum('target_amount');

            $targetAmounts[] = (float) $targetAmount;
            $limit065s[] = (float) $targetAmount * 0.0065;

            // Get all approved purchase details for this month/year
            $details = \Modules\Purchase\Entities\PurchaseDetail::whereHas('purchase', function ($q) use ($month, $year) {
                $q->where('status', 'Approved')
                    ->whereYear('date', $year)
                    ->whereMonth('date', $month);
            })->with('product')->get();

            // Mandatory: Non-Asset AND Product is Mandatory
            $mandatoryAmt = $details->where('is_asset', false)->filter(fn($d) => $d->product?->is_mandatory)->sum('sub_total');
            $mandatoryPurchases[] = (float) $mandatoryAmt;

            // Others: Non-Asset AND Product is NOT Mandatory
            $othersAmt = $details->where('is_asset', false)->filter(fn($d) => !$d->product?->is_mandatory)->sum('sub_total');
            $othersPurchases[] = (float) $othersAmt;

            // Assets: All Assets
            $assetAmt = $details->where('is_asset', true)->sum('sub_total');
            $assetPurchases[] = (float) $assetAmt;
        }

        return response()->json([
            'labels' => $labels,
            'targetAmounts' => $targetAmounts,
            'limit065s' => $limit065s,
            'mandatoryPurchases' => $mandatoryPurchases,
            'othersPurchases' => $othersPurchases,
            'assetPurchases' => $assetPurchases,
        ]);
    }

    public function budgetByCategoryChart(Request $request)
    {
        $month = $request->get('month', now()->month);
        $year = $request->get('year', now()->year);
        $department_id = $request->get('department_id');

        $query = \Modules\Budget\Entities\BudgetDetail::whereHas('masterBudget', function ($q) use ($month, $year, $department_id) {
            $q->where('status', 'Approved')
                ->whereYear('periode_awal', $year)
                ->whereMonth('periode_awal', $month);

            if ($department_id) {
                $q->where('department_id', $department_id);
            }
        });

        $details = $query->get();

        $grouped = $details->groupBy('category_name');

        $labels = [];
        $data = [];

        foreach ($grouped as $categoryName => $items) {
            $labels[] = $categoryName;
            $data[] = $items->sum('budget');
        }

        if (empty($labels)) {
            $labels = ['No Data'];
            $data = [1];
        }

        return response()->json([
            'labels' => $labels,
            'data' => $data,
        ]);
    }

    public function pendingPurchasesList(Request $request)
    {
        $department_id = $request->get('department_id');

        $query = Purchase::with(['department', 'user'])
            ->where('status', 'Pending');

        if ($department_id) {
            $query->where('department_id', $department_id);
        }

        $pending = $query->orderBy('date', 'desc')->get();

        return response()->json($pending);
    }
}