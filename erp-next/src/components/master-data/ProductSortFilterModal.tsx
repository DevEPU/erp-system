"use client";

import {
  X,
  Check,
  SortDesc,
  SortAsc,
  Calendar,
  DollarSign,
  Type,
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

type ProductSortFilterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  // Sort State
  sortConfig: { key: string; order: "asc" | "desc" };
  onSortChange: (config: { key: string; order: "asc" | "desc" }) => void;
  // Filter States
  categoryFilter: string;
  setCategoryFilter: (val: string) => void;
  warehouseFilter: string;
  setWarehouseFilter: (val: string) => void;
  assetFilter: string;
  setAssetFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  // Data
  categories: any[];
  warehouses: any[];
};

const sortOptions: SortOption[] = [
  { key: "id", order: "desc", label: "Terbaru (Default)", icon: Calendar },
  { key: "id", order: "asc", label: "Terlama", icon: Calendar },
  { key: "name", order: "asc", label: "Nama Produk (A-Z)", icon: Type },
  { key: "name", order: "desc", label: "Nama Produk (Z-A)", icon: Type },
  { key: "price", order: "desc", label: "Harga Tertinggi", icon: DollarSign },
  { key: "price", order: "asc", label: "Harga Terendah", icon: DollarSign },
  { key: "code", order: "asc", label: "Kode Produk (A-Z)", icon: Hash },
];

export default function ProductSortFilterModal({
  isOpen,
  onClose,
  sortConfig,
  onSortChange,
  categoryFilter,
  setCategoryFilter,
  warehouseFilter,
  setWarehouseFilter,
  assetFilter,
  setAssetFilter,
  statusFilter,
  setStatusFilter,
  categories,
  warehouses,
}: ProductSortFilterModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
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
                  Customize your product view
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
                    Kategori Produk
                  </span>
                  <SearchableSelect
                    label=""
                    placeholder="Semua Kategori"
                    value={categoryFilter}
                    onChange={(val) => setCategoryFilter(val.toString())}
                    options={[
                      { value: "all", label: "Semua Kategori" },
                      ...categories.map((c) => ({
                        value: c.id,
                        label: c.category_name,
                      })),
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 ml-1">
                    Gudang / Lokasi
                  </span>
                  <SearchableSelect
                    label=""
                    placeholder="Semua Gudang"
                    value={warehouseFilter}
                    onChange={(val) => setWarehouseFilter(val.toString())}
                    options={[
                      { value: "all", label: "Semua Gudang" },
                      ...warehouses.map((w) => ({
                        value: w.id,
                        label: `${w.name} (${w.short_name || w.code})`,
                      })),
                    ]}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-gray-400 ml-1">
                      Status Asset
                    </span>
                    <SearchableSelect
                      label=""
                      placeholder="Semua Status"
                      value={assetFilter}
                      onChange={(val) => setAssetFilter(val.toString())}
                      options={[
                        { value: "all", label: "Semua Status" },
                        { value: "1", label: "Asset Only" },
                        { value: "0", label: "Non-Asset" },
                      ]}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-gray-400 ml-1">
                      Kelengkapan Data
                    </span>
                    <SearchableSelect
                      label=""
                      placeholder="Semua Data"
                      value={statusFilter}
                      onChange={(val) => setStatusFilter(val.toString())}
                      options={[
                        { value: "all", label: "Semua Data" },
                        { value: "no_price", label: "Harga Kosong" },
                        { value: "no_supplier", label: "Tanpa Supplier" },
                        { value: "no_uom", label: "Tanpa UOM" },
                        { value: "incomplete", label: "Data Tidak Lengkap" },
                        { value: "is_mandatory", label: "Mandatory Only" },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-gray-50/50 flex gap-4 border-t border-gray-100">
            <button
              onClick={() => {
                setCategoryFilter("all");
                setWarehouseFilter("all");
                setAssetFilter("all");
                setStatusFilter("all");
                onSortChange({ key: "id", order: "desc" });
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
