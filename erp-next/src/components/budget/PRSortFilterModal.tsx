"use client";

import {
  X,
  Check,
  SortDesc,
  SortAsc,
  Calendar,
  DollarSign,
  Hash,
  Filter as FilterIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SearchableSelect from "../ui/SearchableSelect";

type SortOption = {
  key: string;
  order: "asc" | "desc";
  label: string;
  icon: any;
};

type PRSortFilterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  // Sort State
  sortConfig: { key: string; order: "asc" | "desc" };
  onSortChange: (config: { key: string; order: "asc" | "desc" }) => void;
  // Filter States
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  deptFilter: string;
  setDeptFilter: (val: string) => void;
  monthFilter: string;
  setMonthFilter: (val: string) => void;
  yearFilter: string;
  setYearFilter: (val: string) => void;
  // Data
  departments: any[];
  canViewAllDepartments: boolean;
};

const sortOptions: SortOption[] = [
  { key: "id", order: "desc", label: "Terbaru (Default)", icon: Calendar },
  { key: "id", order: "asc", label: "Terlama", icon: Calendar },
  {
    key: "total_amount",
    order: "desc",
    label: "Nominal Tertinggi",
    icon: DollarSign,
  },
  {
    key: "total_amount",
    order: "asc",
    label: "Nominal Terendah",
    icon: DollarSign,
  },
  { key: "reference", order: "asc", label: "Referensi (A-Z)", icon: Hash },
];

export default function PRSortFilterModal({
  isOpen,
  onClose,
  sortConfig,
  onSortChange,
  statusFilter,
  setStatusFilter,
  deptFilter,
  setDeptFilter,
  monthFilter,
  setMonthFilter,
  yearFilter,
  setYearFilter,
  departments,
  canViewAllDepartments,
}: PRSortFilterModalProps) {
  if (!isOpen) return null;

  const months = [
    { value: "all", label: "Semua Bulan" },
    { value: "1", label: "Januari" },
    { value: "2", label: "Februari" },
    { value: "3", label: "Maret" },
    { value: "4", label: "April" },
    { value: "5", label: "Mei" },
    { value: "6", label: "Juni" },
    { value: "7", label: "Juli" },
    { value: "8", label: "Agustus" },
    { value: "9", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" },
  ];

  const currentYear = new Date().getFullYear();
  const years = [
    { value: "all", label: "Semua Tahun" },
    ...Array.from({ length: 5 }, (_, i) => ({
      value: (currentYear - 2 + i).toString(),
      label: (currentYear - 2 + i).toString(),
    })),
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100"
        >
          <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-2xl">
                <FilterIcon size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-800 tracking-tight">
                  Sort & Filter
                </h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                  Customize your PR view
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* Sorting Section */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 px-1">
                <SortDesc size={14} /> Urutkan Berdasarkan
              </label>
              <div className="grid grid-cols-1 gap-2">
                {sortOptions.map((opt) => {
                  const isSelected =
                    sortConfig.key === opt.key &&
                    sortConfig.order === opt.order;
                  return (
                    <button
                      key={`${opt.key}-${opt.order}`}
                      onClick={() =>
                        onSortChange({ key: opt.key, order: opt.order })
                      }
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                          : "border-gray-50 bg-gray-50/50 text-gray-600 hover:border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl ${isSelected ? "bg-emerald-100" : "bg-white border border-gray-100"}`}
                        >
                          <opt.icon size={16} />
                        </div>
                        <span className="font-bold text-sm tracking-tight">
                          {opt.label}
                        </span>
                      </div>
                      {isSelected && (
                        <Check
                          size={18}
                          className="text-emerald-500"
                          strokeWidth={3}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter Section */}
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 px-1 mt-2">
                <FilterIcon size={14} /> Filter Data
              </label>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 ml-1">
                    Status Transaksi
                  </span>
                  <SearchableSelect
                    label=""
                    placeholder="Semua Status"
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val.toString())}
                    options={[
                      { value: "all", label: "Semua Status" },
                      { value: "Approved", label: "Approved" },
                      { value: "Pending", label: "Pending" },
                      { value: "Rejected", label: "Rejected" },
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 ml-1">
                    Departemen
                  </span>
                  <SearchableSelect
                    label=""
                    placeholder="Semua Departemen"
                    value={deptFilter}
                    onChange={(val) => setDeptFilter(val.toString())}
                    disabled={!canViewAllDepartments}
                    options={[
                      { value: "all", label: "Semua Dept." },
                      ...departments.map((dept) => ({
                        value: dept.id,
                        label: dept.department_name,
                      })),
                    ]}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-gray-400 ml-1">
                      Bulan
                    </span>
                    <SearchableSelect
                      label=""
                      placeholder="Semua Bulan"
                      value={monthFilter}
                      onChange={(val) => setMonthFilter(val.toString())}
                      options={months}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-gray-400 ml-1">
                      Tahun
                    </span>
                    <SearchableSelect
                      label=""
                      placeholder="Semua Tahun"
                      value={yearFilter}
                      onChange={(val) => setYearFilter(val.toString())}
                      options={years}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-gray-50/50 flex gap-4 border-t border-gray-100">
            <button
              onClick={() => {
                setStatusFilter("all");
                setDeptFilter(canViewAllDepartments ? "all" : deptFilter);
                setMonthFilter("all");
                setYearFilter("all");
                onSortChange({ key: "date", order: "desc" });
              }}
              className="flex-1 px-6 py-3.5 rounded-2xl bg-white border-2 border-gray-100 text-gray-500 font-bold hover:bg-gray-100 transition-all text-xs uppercase tracking-widest active:scale-95"
            >
              Reset Filters
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3.5 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 text-xs uppercase tracking-widest active:scale-95"
            >
              Terapkan
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
