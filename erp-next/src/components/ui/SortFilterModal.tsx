"use client";

import {
  X,
  Check,
  SortDesc,
  Calendar,
  DollarSign,
  Hash,
  Filter as FilterIcon,
  RotateCcw,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SearchableSelect from "./SearchableSelect";

export type SortOption = {
  key: string;
  order: "asc" | "desc";
  label: string;
  icon?: any;
};

export type SortFilterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  // Sort State
  sortOptions: SortOption[];
  sortConfig: { key: string; order: "asc" | "desc" };
  onSortChange: (config: { key: string; order: "asc" | "desc" }) => void;
  // Filter States
  statusOptions?: { value: string; label: string }[];
  statusFilter?: string;
  setStatusFilter?: (val: string) => void;
  monthFilter?: string | number;
  setMonthFilter?: (val: string | number) => void;
  yearFilter?: string | number;
  setYearFilter?: (val: string | number) => void;
  customerOptions?: { value: string | number; label: string }[];
  customerFilter?: string | number;
  setCustomerFilter?: (val: string | number) => void;
  // Reset Callback
  onReset?: () => void;
};

export default function SortFilterModal({
  isOpen,
  onClose,
  title = "Sort & Filter",
  subtitle = "Penyesuaian Tampilan & Urutan Data",
  sortOptions,
  sortConfig,
  onSortChange,
  statusOptions,
  statusFilter,
  setStatusFilter,
  monthFilter,
  setMonthFilter,
  yearFilter,
  setYearFilter,
  customerOptions,
  customerFilter,
  setCustomerFilter,
  onReset
}: SortFilterModalProps) {
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100"
        >
          {/* Header */}
          <div className="px-7 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-2xl">
                <FilterIcon size={20} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
                  {title}
                </h2>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                  {subtitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-7 space-y-7 max-h-[72vh] overflow-y-auto custom-scrollbar">
            {/* Sorting Section */}
            <div className="space-y-3">
              <label className="text-xs font-black text-blue-700 uppercase tracking-wider flex items-center gap-2">
                <SortDesc size={15} /> Urutkan Berdasarkan
              </label>
              <div className="grid grid-cols-1 gap-2">
                {sortOptions.map((opt) => {
                  const isSelected =
                    sortConfig.key === opt.key && sortConfig.order === opt.order;
                  const Icon = opt.icon || Calendar;
                  return (
                    <button
                      key={`${opt.key}-${opt.order}`}
                      onClick={() => onSortChange({ key: opt.key, order: opt.order })}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all active:scale-[0.99] ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/60 text-blue-800 shadow-xs"
                          : "border-slate-100 bg-slate-50/50 text-slate-700 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl ${isSelected ? "bg-blue-100 text-blue-700" : "bg-white border border-slate-100 text-slate-500"}`}
                        >
                          <Icon size={16} />
                        </div>
                        <span className="font-bold text-xs tracking-tight">
                          {opt.label}
                        </span>
                      </div>
                      {isSelected && (
                        <Check size={18} className="text-blue-600" strokeWidth={3} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter Section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <label className="text-xs font-black text-blue-700 uppercase tracking-wider flex items-center gap-2">
                <FilterIcon size={15} /> Filter Data Transaksi
              </label>

              <div className="grid grid-cols-1 gap-4">
                {/* Status Filter */}
                {statusOptions && setStatusFilter && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500">
                      Status Transaksi
                    </span>
                    <SearchableSelect
                      label=""
                      placeholder="Semua Status"
                      value={statusFilter || "all"}
                      onChange={(val) => setStatusFilter(val.toString())}
                      options={statusOptions}
                    />
                  </div>
                )}

                {/* Customer Filter */}
                {customerOptions && setCustomerFilter && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500">
                      Filter Customer
                    </span>
                    <SearchableSelect
                      label=""
                      placeholder="Semua Customer"
                      value={customerFilter ? customerFilter.toString() : "all"}
                      onChange={(val) => setCustomerFilter(val)}
                      options={customerOptions}
                    />
                  </div>
                )}

                {/* Month & Year Filter Grid */}
                {(setMonthFilter || setYearFilter) && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {setMonthFilter && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-500">
                          Bulan Periode
                        </span>
                        <SearchableSelect
                          label=""
                          placeholder="Semua Bulan"
                          value={monthFilter ? monthFilter.toString() : "all"}
                          onChange={(val) => setMonthFilter(val.toString() === "all" ? "all" : Number(val))}
                          options={months}
                        />
                      </div>
                    )}

                    {setYearFilter && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-500">
                          Tahun Periode
                        </span>
                        <SearchableSelect
                          label=""
                          placeholder="Semua Tahun"
                          value={yearFilter ? yearFilter.toString() : "all"}
                          onChange={(val) => setYearFilter(val.toString())}
                          options={years}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
            {onReset && (
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                <RotateCcw size={14} />
                <span>Reset Filter</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-2xl font-bold text-xs transition-all shadow-sm active:scale-[0.99] text-center"
            >
              Terapkan & Lihat Data
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
