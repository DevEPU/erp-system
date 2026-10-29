<?php

namespace Modules\Budget\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\Budget\Entities\MasterBudget;
use Carbon\Carbon;

class BudgetCheckController extends Controller
{
    /**
     * Cek budget per category berdasarkan input PR items.
     * Menerima array items: [{category_id: 1, sum_amount: 110000}]
     */
    public function checkCategoryBudget(Request $request)
    {
        $request->validate([
            'department_id' => 'required|integer',
            'date' => 'required|date',
            'items' => 'required|array',
            'items.*.category_id' => 'required|integer',
            'items.*.sum_amount' => 'required|numeric',
        ]);

        $purchaseDate = Carbon::parse($request->date);
        $month = $purchaseDate->month;
        $year = $purchaseDate->year;
        $deptId = $request->department_id;

        $monthPad = str_pad($month, 2, '0', STR_PAD_LEFT);

        $baseQuery = MasterBudget::with(['details', 'department'])
            ->where('department_id', $deptId)
            ->where(function ($q) use ($month, $monthPad) {
                $q->where('bulan', $month)->orWhere('bulan', $monthPad);
            })
            ->whereYear('periode_awal', $year)
            ->whereIn('status', ['Approved', 'approved']); // Case-insensitive match

        $mandatoryBudget = (clone $baseQuery)->where('is_mandatory', true)->orderBy('id', 'desc')->first();
        $othersBudget = (clone $baseQuery)->where('is_mandatory', false)->orderBy('id', 'desc')->first();

        // Get Department Name safely
        $dept = \Modules\Department\Entities\Departments::find($deptId);
        $deptName = $dept ? ($dept->id == 0 ? 'Direksi' : $dept->department_name) : 'Unknown';

        $overBudgetCategories = [];
        $isOverBudget = false;

        $checkFunc = function ($budget, $items, $typeLabel) use (&$overBudgetCategories, &$isOverBudget, $deptName) {
            if (empty($items))
                return;

            if (!$budget) {
                $isOverBudget = true;
                foreach ($items as $item) {
                    $catId = $item['category_id'];
                    $overBudgetCategories[] = [
                        'category_id' => $catId,
                        'category_name' => $this->getCategoryName($catId) . " ($typeLabel)",
                        'department_name' => $deptName,
                        'required' => $item['sum_amount'],
                        'available' => 0,
                        'reason' => "Master Budget tipe $typeLabel belum tersedia untuk periode ini."
                    ];
                }
                return;
            }

            $categoryBudgets = $budget->details->keyBy('category_id');
            $allCategoryBudget = $categoryBudgets->get(0);

            // Use 'remaining' attribute which handles budget - used - reserved
            $availableAllCategory = $allCategoryBudget ? (float) $allCategoryBudget->remaining : 0;

            foreach ($items as $item) {
                $catId = $item['category_id'];
                $sumAmount = (float) $item['sum_amount'];
                $detail = $categoryBudgets->get($catId);
                $catName = $this->getCategoryName($catId) . " ($typeLabel)";

                if (!$detail) {
                    // Cek 'All Category' fallback
                    if ($availableAllCategory >= $sumAmount && $catId != 0) {
                        $availableAllCategory -= $sumAmount;
                        continue;
                    }

                    $isOverBudget = true;
                    $overBudgetCategories[] = [
                        'category_id' => $catId,
                        'category_name' => $catName,
                        'department_name' => $deptName,
                        'required' => $sumAmount,
                        'available' => 0,
                        'reason' => 'Kategori ini tidak terdaftar dalam budget.'
                    ];
                    continue;
                }

                // Use 'remaining' attribute for precision (includes pending requests)
                $available = (float) $detail->remaining;

                if ($sumAmount > $available) {
                    $shortfall = $sumAmount - $available;

                    // Fallback to All Category if not enough
                    if ($availableAllCategory >= $shortfall && $catId != 0) {
                        $availableAllCategory -= $shortfall;
                        continue;
                    }

                    $isOverBudget = true;
                    $overBudgetCategories[] = [
                        'category_id' => $catId,
                        'category_name' => $catName,
                        'department_name' => $deptName,
                        'required' => $sumAmount,
                        'available' => $available,
                        'shortfall' => $shortfall,
                        'reason' => 'Sisa budget (termasuk antrian PR) tidak mencukupi.'
                    ];
                }
            }
        };

        $mandatoryItems = array_filter($request->items, fn($i) => !empty($i['is_mandatory']));
        $othersItems = array_filter($request->items, fn($i) => empty($i['is_mandatory']));

        $checkFunc($mandatoryBudget, $mandatoryItems, 'Mandatory');
        $checkFunc($othersBudget, $othersItems, 'Others');

        return response()->json([
            'success' => true,
            'is_over_budget' => $isOverBudget,
            'over_budget_details' => $overBudgetCategories
        ]);
    }

    private function getCategoryName($id)
    {
        if ($id == 0)
            return 'All Category';
        $cat = \DB::table('categories')->where('id', $id)->first();
        return $cat ? $cat->category_name : 'Unknown';
    }

    /**
     * Menampilkan daftar category/department yang memiliki sisa budget untuk dipinjam
     */
    public function availableBorrowSources(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'department_id' => 'nullable|integer',
        ]);

        $purchaseDate = Carbon::parse($request->date);
        $month = $purchaseDate->month;
        $year = $purchaseDate->year;

        // Ambil SEMUA master budget approved pada periode tersebut
        $masterBudgets = MasterBudget::with(['department', 'details'])
            ->where('bulan', $month)
            ->whereYear('periode_awal', $year)
            ->where('status', 'Approved')
            ->where('is_mandatory', false)
            ->get();

        $sources = [];

        foreach ($masterBudgets as $mb) {
            $isInternal = ($mb->department_id == $request->department_id);
            $deptName = $mb->department_id == 0 ? 'Direksi (All)' : ($mb->department ? $mb->department->department_name : 'Unknown');

            foreach ($mb->details as $detail) {
                $available = (float) $detail->budget - (float) $detail->used_amount;

                if ($available > 0) {
                    $sources[] = [
                        'master_budget_id' => $mb->id,
                        'budget_detail_id' => $detail->id,
                        'department_id' => $mb->department_id,
                        'department_name' => $deptName,
                        'category_id' => $detail->category_id,
                        'category_name' => $detail->category_name ?: 'All Category',
                        'available_amount' => $available,
                        'type' => $detail->category_id == 0 ? 'All Category' : ($isInternal ? 'Internal Department' : 'External Department')
                    ];
                }
            }
        }

        // Sort priority: Internal > All Category > External
        usort($sources, function ($a, $b) {
            $rankA = $a['type'] === 'Internal Department' ? 1 : ($a['type'] === 'All Category' ? 2 : 3);
            $rankB = $b['type'] === 'Internal Department' ? 1 : ($b['type'] === 'All Category' ? 2 : 3);
            return $rankA <=> $rankB;
        });

        return response()->json([
            'success' => true,
            'sources' => $sources
        ]);
    }
}
