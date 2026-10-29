"use client";

import { useState, useEffect } from "react";
import {
  Warehouse,
  Search,
  Package,
  Boxes,
  Loader2,
  AlertTriangle,
  Calendar,
  X,
  ChevronDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import api from "@/lib/api";
import ProductDetailModal from "@/components/master-data/ProductDetailModal";

type Product = {
  id: number;
  product_name: string;
  product_code: string;
  product_type?: string;
  category_id: number;
  category?: { category_name: string };
  supplier?: { supplier_name: string; supplier_code: string };
  product_price: number;
  product_quantity: number;
  product_unit: string;
  min_qty: number;
  max_qty: number;
  locations?: {
    warehouse_id: number | string;
    warehouse_name: string;
    warehouse_code: string;
    stock: number;
    aisle: string;
    min_qty: number;
    max_qty: number;
    hpp?: number;
  }[];
};

type WarehouseType = {
  id: number;
  name: string;
  code: string;
  short_name?: string;
};

const getCurrentMonthString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const getSelectableMonths = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${year}-${month}`);
  }
  return months;
};

export default function StokGudangPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [isMounted, setIsMounted] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<any | null>(null);

  // Selected month state (default to current month dynamically)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);

  // Stats list states
  const [statsLists, setStatsLists] = useState({
    under_stock_list: [] as any[],
    over_stock_list: [] as any[],
    optimal_stock_list: [] as any[],
    all_items_list: [] as any[],
  });

  // Modal states for stats cards
  const [activeModal, setActiveModal] = useState<"total" | "under" | "over" | "optimal" | null>(null);
  const [modalSearch, setModalSearch] = useState("");

  // Modal states for chart bar clicks
  const [selectedChartDay, setSelectedChartDay] = useState<string | null>(null);
  const [dayStats, setDayStats] = useState<any>(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [dayModalTab, setDayModalTab] = useState<"total" | "under" | "over" | "optimal">("total");
  const [daySearch, setDaySearch] = useState("");

  const visibleWarehouses = selectedWarehouse !== "all"
    ? warehouses.filter(w => String(w.id) === String(selectedWarehouse))
    : warehouses;

  const colSpanCount = selectedWarehouse === "3"
    ? 6 + visibleWarehouses.length
    : 7 + visibleWarehouses.length + (selectedWarehouse === "all" ? 1 : 0);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalResults, setTotalResults] = useState(0);

  // Stats Card state
  const [stats, setStats] = useState({
    total_items: 0,
    over_stock: 0,
    under_stock: 0,
    optimal_stock: 0,
    top_under_stock: [] as any[],
    top_over_stock: [] as any[],
    trend_data: [] as any[],
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Track mount state for Recharts hydration safety
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const params: Record<string, any> = { month: selectedMonth };
      if (selectedWarehouse !== "all") {
        params.warehouse_id = selectedWarehouse;
      }
      const res = await api.express.get("/products/stock-stats", params);
      if (res.data.success) {
        setStats({
          total_items: res.data.total_items || 0,
          over_stock: res.data.over_stock || 0,
          under_stock: res.data.under_stock || 0,
          optimal_stock: res.data.optimal_stock || 0,
          top_under_stock: res.data.top_under_stock || [],
          top_over_stock: res.data.top_over_stock || [],
          trend_data: res.data.trend_data || [],
        });
        setStatsLists({
          under_stock_list: res.data.under_stock_list || [],
          over_stock_list: res.data.over_stock_list || [],
          optimal_stock_list: res.data.optimal_stock_list || [],
          all_items_list: res.data.all_items_list || [],
        });
      }
    } catch (error) {
      console.error("Failed to fetch stock stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchWarehousesAndCategories = async () => {
    try {
      const res = await api.express.get("/products/form-data");
      setWarehouses(res.data.warehouses || []);
    } catch (error) {
      console.error("Failed to fetch warehouses:", error);
    }
  };

  const fetchProducts = async (currentPage = 1) => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
        search: search,
        parent_only: "false", // Expand sub-items per supplier exactly like products table
        month: selectedMonth,
      };

      if (selectedWarehouse !== "all") {
        params.warehouse_id = selectedWarehouse;
      }

      const res = await api.express.get("/products", params);
      setProducts(res.data.data || []);
      setPage(res.data.current_page || 1);
      setTotalPages(res.data.last_page || 1);
      setTotalResults(res.data.total || 0);
    } catch (error) {
      console.error("Failed to fetch products stock:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehousesAndCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(1);
      fetchStats();
    }, 400);
    return () => clearTimeout(timer);
  }, [search, selectedWarehouse, pageSize, selectedMonth]);

  const handleOpenStatsModal = (type: "total" | "under" | "over" | "optimal") => {
    setActiveModal(type);
    setModalSearch("");
  };

  const handleCloseModal = () => {
    setActiveModal(null);
  };

  const handleOpenChartDayModal = async (dayLabel: string) => {
    setSelectedChartDay(dayLabel);
    setDayLoading(true);
    setDayStats(null);
    setDayModalTab("total");
    setDaySearch("");
    
    const dayNum = parseInt(dayLabel.split(" ")[0]);
    if (isNaN(dayNum)) {
      setDayLoading(false);
      return;
    }
    
    try {
      const params: Record<string, any> = {
        month: selectedMonth,
        day: dayNum
      };
      if (selectedWarehouse !== "all") {
        params.warehouse_id = selectedWarehouse;
      }
      const res = await api.express.get("/products/stock-stats", params);
      if (res.data.success) {
        setDayStats(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch day stock stats:", error);
    } finally {
      setDayLoading(false);
    }
  };

  const getMonthLabel = (m: string) => {
    const parts = m.split("-");
    if (parts.length !== 2) return m;
    const year = parts[0];
    const monthNum = parseInt(parts[1]);
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return `${months[monthNum - 1]} ${year}`;
  };

  const getStatusBadge = (actual: number, min: number, max: number) => {
    if (actual < min) {
      return (
        <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl text-xs font-black bg-red-50 text-red-600 border border-red-200/50 uppercase tracking-widest min-w-[120px] text-center shadow-sm">
          UNDER STOCK
        </span>
      );
    }
    if (max > 0 && actual > max) {
      return (
        <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl text-xs font-black bg-amber-50 text-amber-600 border border-amber-200/50 uppercase tracking-widest min-w-[120px] text-center shadow-sm">
          OVER STOCK
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl text-xs font-black bg-emerald-50 text-emerald-600 border border-emerald-200/50 uppercase tracking-widest min-w-[120px] text-center shadow-sm">
        OK
      </span>
    );
  };

  const renderStatsModal = () => {
    if (!activeModal) return null;

    let title = "";
    let bgColor = "";
    let textColor = "";
    let icon = null;
    let list: any[] = [];

    if (activeModal === "total") {
      title = "Daftar Semua Produk";
      bgColor = "bg-blue-50 text-blue-600 border-blue-200/50";
      textColor = "text-blue-600";
      icon = <Boxes size={22} />;
      list = statsLists.all_items_list;
    } else if (activeModal === "under") {
      title = "Daftar Produk Under Stock";
      bgColor = "bg-red-50 text-red-600 border-red-200/50";
      textColor = "text-red-600";
      icon = <AlertTriangle size={22} />;
      list = statsLists.under_stock_list;
    } else if (activeModal === "over") {
      title = "Daftar Produk Over Stock";
      bgColor = "bg-amber-50 text-amber-600 border-amber-200/50";
      textColor = "text-amber-600";
      icon = <AlertTriangle size={22} />;
      list = statsLists.over_stock_list;
    } else if (activeModal === "optimal") {
      title = "Daftar Produk Optimal Stock";
      bgColor = "bg-emerald-50 text-emerald-600 border-emerald-200/50";
      textColor = "text-emerald-600";
      icon = <Package size={22} />;
      list = statsLists.optimal_stock_list;
    }

    const filteredList = list.filter((item) => {
      if (!modalSearch) return true;
      const s = modalSearch.toLowerCase();
      return (
        (item.product_name && item.product_name.toLowerCase().includes(s)) ||
        (item.product_code && item.product_code.toLowerCase().includes(s))
      );
    });

    const isFG = selectedWarehouse === "3";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
          onClick={handleCloseModal}
        />
        
        {/* Modal Content */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-250">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${bgColor}`}>
                {icon}
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">{title}</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Total: {filteredList.length} dari {list.length} Item
                </p>
              </div>
            </div>
            <button 
              onClick={handleCloseModal}
              className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search bar inside Modal */}
          <div className="p-4 border-b border-gray-100 bg-white">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari berdasarkan nama atau kode barang..."
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/30 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-bold transition-all text-xs placeholder:text-gray-400"
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto min-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50 sticky top-0 z-10 border-b border-gray-100">
                {isFG ? (
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Part No</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Part Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Customer</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Min Qty</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Max Qty</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Current Qty</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Material No</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Min Qty</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Max Qty</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Current Qty</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.length > 0 ? (
                  filteredList.map((item, idx) => {
                    const cleanName = item.product_name.replace(/\s*\([^)]+\)\s*$/, '');
                    const actualQty = item.actual_qty || 0;
                    const minQty = item.min_qty || 0;
                    const maxQty = item.max_qty || 0;

                    let stockColorClass = "text-gray-900";
                    let statusBadge = (
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200/50 uppercase tracking-wider min-w-[100px] text-center shadow-sm">
                        OK
                      </span>
                    );

                    if (actualQty < minQty) {
                      stockColorClass = "text-red-500 font-bold";
                      statusBadge = (
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black bg-red-50 text-red-600 border border-red-200/50 uppercase tracking-wider min-w-[100px] text-center shadow-sm">
                          UNDER STOCK
                        </span>
                      );
                    } else if (maxQty > 0 && actualQty > maxQty) {
                      stockColorClass = "text-blue-500 font-bold";
                      statusBadge = (
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-200/50 uppercase tracking-wider min-w-[100px] text-center shadow-sm">
                          OVER STOCK
                        </span>
                      );
                    }

                    if (isFG) {
                      return (
                        <tr key={`${item.id}_modal_${idx}`} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-800 text-center font-mono">{item.product_code}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-800 text-center max-w-xs truncate">{cleanName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-800 text-center uppercase">{item.supplier_name || "-"}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-bold text-slate-700">
                            <div className="inline-block px-2 py-1 bg-white border border-gray-150 rounded-lg min-w-[80px] text-right font-mono font-bold">
                              {minQty.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-bold text-slate-700">
                            <div className="inline-block px-2 py-1 bg-white border border-gray-150 rounded-lg min-w-[80px] text-right font-mono font-bold">
                              {maxQty.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="inline-block px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg min-w-[90px] text-right font-mono font-bold">
                              <span className={stockColorClass}>
                                {actualQty.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">{statusBadge}</td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={`${item.id}_modal_${idx}`} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-gray-900">
                          {item.product_type || item.category_name || "Raw Material"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-900 font-mono">{item.product_code}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-gray-900 max-w-xs truncate">{item.product_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-bold uppercase tracking-wider">{item.supplier_name || "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="inline-block px-2 py-1 bg-white border border-gray-150 rounded-lg min-w-[80px] text-right font-mono font-bold text-xs text-gray-600">
                            {minQty.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="inline-block px-2 py-1 bg-white border border-gray-150 rounded-lg min-w-[80px] text-right font-mono font-bold text-xs text-gray-600">
                            {maxQty.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="inline-block px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg min-w-[90px] text-right font-mono font-bold text-xs">
                            <span className={stockColorClass}>
                              {actualQty.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-xs">{statusBadge}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={isFG ? 7 : 8} className="px-6 py-16 text-center text-gray-400 font-bold italic bg-gray-50/5">
                      Tidak ada data produk ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end">
            <button
              onClick={handleCloseModal}
              className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-black text-gray-700 hover:bg-gray-50 shadow-sm transition-all active:scale-95"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderChartDayModal = () => {
    if (!selectedChartDay) return null;

    let dayTitle = `Detail Stok - ${selectedChartDay}`;
    let list: any[] = [];
    
    if (dayStats) {
      if (dayModalTab === "total") list = dayStats.all_items_list || [];
      else if (dayModalTab === "under") list = dayStats.under_stock_list || [];
      else if (dayModalTab === "over") list = dayStats.over_stock_list || [];
      else if (dayModalTab === "optimal") list = dayStats.optimal_stock_list || [];
    }

    const filteredList = list.filter((item) => {
      if (!daySearch) return true;
      const s = daySearch.toLowerCase();
      return (
        (item.product_name && item.product_name.toLowerCase().includes(s)) ||
        (item.product_code && item.product_code.toLowerCase().includes(s))
      );
    });

    const isFG = selectedWarehouse === "3";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
          onClick={() => setSelectedChartDay(null)}
        />
        
        {/* Modal Content */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-250">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner border border-emerald-100">
                <Calendar size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">{dayTitle}</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Data Simulasi Stok Harian
                </p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedChartDay(null)}
              className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {dayLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-20 space-y-4">
              <Loader2 className="animate-spin text-emerald-500" size={36} />
              <p className="text-sm font-bold text-gray-400 italic">Mengambil data detail stok harian...</p>
            </div>
          ) : dayStats ? (
            <>
              {/* Day Modal Stats Summary / Tab Switchers */}
              <div className="p-5 bg-gray-50/30 border-b border-gray-100 grid grid-cols-4 gap-4">
                {/* Total */}
                <button
                  onClick={() => setDayModalTab("total")}
                  className={`p-4 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-95 ${
                    dayModalTab === "total"
                      ? "bg-blue-50/50 border-blue-200 text-blue-900 shadow-sm"
                      : "bg-white border-gray-200/60 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <p className="text-xl font-black">{dayStats.total_items}</p>
                  <p className="text-[9px] font-black uppercase tracking-wider mt-0.5">Total Item</p>
                </button>
                
                {/* Over */}
                <button
                  onClick={() => setDayModalTab("over")}
                  className={`p-4 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-95 ${
                    dayModalTab === "over"
                      ? "bg-amber-50/50 border-amber-200 text-amber-900 shadow-sm"
                      : "bg-white border-gray-200/60 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <p className="text-xl font-black">{dayStats.over_stock}</p>
                  <p className="text-[9px] font-black uppercase tracking-wider mt-0.5">Over Stock</p>
                </button>

                {/* Under */}
                <button
                  onClick={() => setDayModalTab("under")}
                  className={`p-4 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-95 ${
                    dayModalTab === "under"
                      ? "bg-red-50/50 border-red-200 text-red-900 shadow-sm"
                      : "bg-white border-gray-200/60 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <p className="text-xl font-black">{dayStats.under_stock}</p>
                  <p className="text-[9px] font-black uppercase tracking-wider mt-0.5">Under Stock</p>
                </button>

                {/* Optimal */}
                <button
                  onClick={() => setDayModalTab("optimal")}
                  className={`p-4 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-95 ${
                    dayModalTab === "optimal"
                      ? "bg-emerald-50/50 border-emerald-200 text-emerald-900 shadow-sm"
                      : "bg-white border-gray-200/60 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <p className="text-xl font-black">{dayStats.optimal_stock}</p>
                  <p className="text-[9px] font-black uppercase tracking-wider mt-0.5">Optimal Stock</p>
                </button>
              </div>

              {/* Search Inside Day Modal */}
              <div className="p-4 border-b border-gray-100 bg-white">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Cari berdasarkan nama atau kode barang..."
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/30 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-bold transition-all text-xs placeholder:text-gray-400"
                    value={daySearch}
                    onChange={(e) => setDaySearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Day Modal Table */}
              <div className="flex-1 overflow-y-auto min-h-[300px]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/50 sticky top-0 z-10 border-b border-gray-100">
                    {isFG ? (
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Part No</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Part Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Customer</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Min Qty</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Max Qty</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Current Qty</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Material No</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Vendor</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Min Qty</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Max Qty</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Current Qty</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredList.length > 0 ? (
                      filteredList.map((item, idx) => {
                        const cleanName = item.product_name.replace(/\s*\([^)]+\)\s*$/, '');
                        const actualQty = item.actual_qty || 0;
                        const minQty = item.min_qty || 0;
                        const maxQty = item.max_qty || 0;

                        let stockColorClass = "text-gray-900";
                        let statusBadge = (
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200/50 uppercase tracking-wider min-w-[100px] text-center shadow-sm">
                            OK
                          </span>
                        );

                        if (actualQty < minQty) {
                          stockColorClass = "text-red-500 font-bold";
                          statusBadge = (
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black bg-red-50 text-red-600 border border-red-200/50 uppercase tracking-wider min-w-[100px] text-center shadow-sm">
                              UNDER STOCK
                            </span>
                          );
                        } else if (maxQty > 0 && actualQty > maxQty) {
                          stockColorClass = "text-blue-500 font-bold";
                          statusBadge = (
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-200/50 uppercase tracking-wider min-w-[100px] text-center shadow-sm">
                              OVER STOCK
                            </span>
                          );
                        }

                        if (isFG) {
                          return (
                            <tr key={`${item.id}_day_${idx}`} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-800 text-center font-mono">{item.product_code}</td>
                              <td className="px-6 py-4 text-xs font-bold text-slate-800 text-center max-w-xs truncate">{cleanName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-800 text-center uppercase">{item.supplier_name || "-"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-bold text-slate-700">
                                <div className="inline-block px-2 py-1 bg-white border border-gray-150 rounded-lg min-w-[80px] text-right font-mono font-bold">
                                  {minQty.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-bold text-slate-700">
                                <div className="inline-block px-2 py-1 bg-white border border-gray-150 rounded-lg min-w-[80px] text-right font-mono font-bold">
                                  {maxQty.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="inline-block px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg min-w-[90px] text-right font-mono font-bold">
                                  <span className={stockColorClass}>
                                    {actualQty.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">{statusBadge}</td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={`${item.id}_day_${idx}`} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-gray-900">
                              {item.product_type || item.category_name || "Raw Material"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-900 font-mono">{item.product_code}</td>
                            <td className="px-6 py-4 text-xs font-semibold text-gray-900 max-w-xs truncate">{item.product_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-bold uppercase tracking-wider">{item.supplier_name || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="inline-block px-2 py-1 bg-white border border-gray-150 rounded-lg min-w-[80px] text-right font-mono font-bold text-xs text-gray-600">
                                {minQty.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="inline-block px-2 py-1 bg-white border border-gray-150 rounded-lg min-w-[80px] text-right font-mono font-bold text-xs text-gray-600">
                                {maxQty.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="inline-block px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg min-w-[90px] text-right font-mono font-bold text-xs">
                                <span className={stockColorClass}>
                                  {actualQty.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs">{statusBadge}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={isFG ? 7 : 8} className="px-6 py-16 text-center text-gray-400 font-bold italic bg-gray-50/5">
                          Tidak ada data produk ditemukan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-20">
              <p className="text-sm font-bold text-red-500">Gagal mengambil data detail stok harian.</p>
            </div>
          )}

          {/* Footer */}
          <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end">
            <button
              onClick={() => setSelectedChartDay(null)}
              className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-black text-gray-700 hover:bg-gray-50 shadow-sm transition-all active:scale-95"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {/* Page Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3.5 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl shadow-lg shadow-emerald-200">
              <Warehouse className="text-white animate-pulse" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">
                  Stok <span className="text-emerald-600">Gudang</span>
                </h1>
                <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest hidden sm:inline-block">
                  Enterprise ERP Standard
                </span>
              </div>
              <p className="text-gray-500 font-semibold text-xs md:text-sm mt-0.5">
                Monitoring level persediaan material, barang setengah jadi (WIP), dan finished goods per lokasi gudang.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Warehouse Selector Container */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Boxes className="text-emerald-600" size={16} />
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Pilih Loksasi Gudang Inventori</h3>
          </div>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">
            {warehouses.length} Gudang Terhubung
          </span>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar">
          <button
            onClick={() => setSelectedWarehouse("all")}
            className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 whitespace-nowrap shadow-sm border ${
              selectedWarehouse === "all"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-lg shadow-emerald-600/20 scale-100"
                : "bg-white text-gray-500 border-gray-200/60 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
            }`}
          >
            <Boxes size={15} />
            <span>Semua Gudang ({warehouses.length})</span>
          </button>
          {warehouses.map((w) => (
            <button
              key={w.id}
              onClick={() => setSelectedWarehouse(String(w.id))}
              className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 whitespace-nowrap shadow-sm border ${
                selectedWarehouse === String(w.id)
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-lg shadow-emerald-600/20 scale-100"
                  : "bg-white text-gray-500 border-gray-200/60 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
              }`}
            >
              <Warehouse size={15} />
              <span>Gudang {w.short_name || w.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Item */}
        <div 
          onClick={() => handleOpenStatsModal("total")}
          className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md cursor-pointer hover:-translate-y-1 hover:border-blue-200 transition-all duration-300"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
            <Boxes size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900 tracking-tight">
              {statsLoading ? (
                <Loader2 className="animate-spin text-gray-400" size={20} />
              ) : (
                stats.total_items.toLocaleString("id-ID")
              )}
            </p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Item</p>
          </div>
        </div>

        {/* Over Stock */}
        <div 
          onClick={() => handleOpenStatsModal("over")}
          className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md cursor-pointer hover:-translate-y-1 hover:border-amber-200 transition-all duration-300"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900 tracking-tight">
              {statsLoading ? (
                <Loader2 className="animate-spin text-gray-400" size={20} />
              ) : (
                stats.over_stock.toLocaleString("id-ID")
              )}
            </p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Over Stock</p>
          </div>
        </div>

        {/* Under Stock */}
        <div 
          onClick={() => handleOpenStatsModal("under")}
          className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md cursor-pointer hover:-translate-y-1 hover:border-red-200 transition-all duration-300"
        >
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-inner">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900 tracking-tight">
              {statsLoading ? (
                <Loader2 className="animate-spin text-gray-400" size={20} />
              ) : (
                stats.under_stock.toLocaleString("id-ID")
              )}
            </p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Under Stock</p>
          </div>
        </div>

        {/* Optimal Stock */}
        <div 
          onClick={() => handleOpenStatsModal("optimal")}
          className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md cursor-pointer hover:-translate-y-1 hover:border-emerald-200 transition-all duration-300"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
            <Package size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900 tracking-tight">
              {statsLoading ? (
                <Loader2 className="animate-spin text-gray-400" size={20} />
              ) : (
                stats.optimal_stock.toLocaleString("id-ID")
              )}
            </p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Optimal Stock</p>
          </div>
        </div>
      </div>

      {/* Month Selector Dropdown */}
      <div className="flex items-center justify-between mt-2">
        <div className="relative">
          <button 
            onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200/80 rounded-2xl bg-white text-xs font-black text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95"
          >
            <Calendar className="text-gray-400" size={14} />
            <span>{getMonthLabel(selectedMonth)}</span>
            <ChevronDown size={12} className="text-gray-400 ml-1" />
          </button>
          
          {isMonthDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsMonthDropdownOpen(false)}
              />
              <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                {getSelectableMonths().map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setSelectedMonth(m);
                      setIsMonthDropdownOpen(false);
                      setPage(1);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-gray-50 ${
                      selectedMonth === m ? "text-emerald-600 bg-emerald-50/50" : "text-gray-700"
                    }`}
                  >
                    {getMonthLabel(m)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Total Stock Trend Chart Card */}
      <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-gray-800 tracking-tight">Total Stock Trend</h3>
          <select className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-black text-gray-550 bg-white outline-none focus:ring-1 focus:ring-emerald-500">
            <option>All Material</option>
            <option>Component</option>
            <option>Raw Material</option>
            <option>Finished Goods</option>
          </select>
        </div>

        <div className="h-[240px] w-full">
          {isMounted && stats.trend_data && stats.trend_data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={stats.trend_data} 
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                onClick={(state) => {
                  if (state && state.activeLabel) {
                    handleOpenChartDayModal(String(state.activeLabel));
                  }
                }}
                className="cursor-pointer"
              >
                <XAxis 
                  dataKey="day" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} 
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="under_stock" name="Under Stock" stackId="a" fill="#f43f5e" />
                <Bar dataKey="optimal_stock" name="Optimal Stock" stackId="a" fill="#10b981" />
                <Bar dataKey="over_stock" name="Over Stock" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              {statsLoading ? (
                <Loader2 className="animate-spin text-emerald-500" size={28} />
              ) : (
                <span className="text-sm text-gray-400 font-bold italic">Tidak ada data tren stok.</span>
              )}
            </div>
          )}
        </div>

        {/* Custom Legend underneath chart */}
        <div className="flex justify-center items-center gap-6 pt-2 border-t border-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#f43f5e]" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Under Stock</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#10b981]" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Optimal Stock</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#f59e0b]" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Over Stock</span>
          </div>
        </div>
      </div>

      {/* Side-by-side Top 5 Lists widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top 5 Under Stock */}
        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm space-y-6 flex flex-col justify-between min-h-[300px]">
          <h3 className="text-base font-black text-gray-800 tracking-tight">Top 5 Under Stock</h3>
          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {statsLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="animate-spin text-red-500" size={24} />
              </div>
            ) : stats.top_under_stock && stats.top_under_stock.length > 0 ? (
              stats.top_under_stock.map((item, idx) => {
                const cleanName = item.product_name.replace(/\s*\([^)]+\)\s*$/, '');
                const widthPercent = item.min_qty > 0 ? Math.min(((item.min_qty - item.actual_qty) / item.min_qty) * 100, 100) : 100;
                return (
                  <div key={`${item.id}_under_${idx}`} className="flex items-center justify-between gap-4 text-xs">
                    <div className="w-1/3 font-bold text-gray-700 truncate" title={item.product_name}>
                      {cleanName}
                    </div>
                    <div className="flex-1 bg-red-50/50 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-red-200 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                    <div className="w-24 text-right font-black text-gray-400">
                      {item.actual_qty.toLocaleString("id-ID")} ({item.days} day)
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-400 font-bold italic py-10">
                Tidak ada data under stock.
              </div>
            )}
          </div>
        </div>

        {/* Top 5 Over Stock */}
        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm space-y-6 flex flex-col justify-between min-h-[300px]">
          <h3 className="text-base font-black text-gray-800 tracking-tight">Top 5 Over Stock</h3>
          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {statsLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="animate-spin text-amber-500" size={24} />
              </div>
            ) : stats.top_over_stock && stats.top_over_stock.length > 0 ? (
              stats.top_over_stock.map((item, idx) => {
                const cleanName = item.product_name.replace(/\s*\([^)]+\)\s*$/, '');
                const widthPercent = Math.min((item.days / 15) * 100, 100);
                return (
                  <div key={`${item.id}_over_${idx}`} className="flex items-center justify-between gap-4 text-xs">
                    <div className="w-1/3 font-bold text-gray-700 truncate" title={item.product_name}>
                      {cleanName}
                    </div>
                    <div className="flex-1 bg-amber-50/30 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                    <div className="w-24 text-right font-black text-gray-400">
                      {item.actual_qty.toLocaleString("id-ID")} ({item.days} day)
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-400 font-bold italic py-10">
                Tidak ada data over stock.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Search Input Box */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search
            className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500"
            size={18}
          />
          <input
            type="text"
            placeholder="Cari material berdasarkan nama atau kode barang..."
            className="w-full pl-14 pr-6 py-4 rounded-2xl border-none bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-bold transition-all placeholder:text-gray-400 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Mockup-Accurate Table Grid */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {selectedWarehouse === "3" ? (
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-5.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                    Part No
                  </th>
                  <th className="px-6 py-5.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                    Part Name
                  </th>
                  <th className="px-6 py-5.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                    Customer
                  </th>
                  {visibleWarehouses.map(w => (
                    <th key={w.id} className="px-4 py-3 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center bg-emerald-50/30 min-w-[100px]">
                      <div className="flex flex-col items-center">
                        <span>{w.short_name || w.code}</span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase mt-0.5 tracking-wider">Qty</span>
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-5.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                    MIN Quantity
                  </th>
                  <th className="px-6 py-5.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                    MAX Quantity
                  </th>
                  <th className="px-6 py-5.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                    Status
                  </th>
                </tr>
              ) : (
                <tr className="bg-gray-50/50 text-left border-b border-gray-100">
                  <th className="px-6 py-5.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Material Category
                  </th>
                  <th className="px-6 py-5.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Material No
                  </th>
                  <th className="px-6 py-5.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Material Description
                  </th>
                  <th className="px-6 py-5.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Vendor
                  </th>
                  {visibleWarehouses.map(w => (
                    <th key={w.id} className="px-4 py-3 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center bg-emerald-50/30 min-w-[100px]">
                      <div className="flex flex-col items-center">
                        <span>{w.short_name || w.code}</span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase mt-0.5 tracking-wider">Qty</span>
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-5.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                    MIN Quantity
                  </th>
                  <th className="px-6 py-5.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                    MAX Quantity
                  </th>
                  <th className="px-6 py-5.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    UoM
                  </th>
                  {selectedWarehouse === "all" && (
                    <th className="px-6 py-5.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                      Total QTY
                    </th>
                  )}
                  <th className="px-6 py-5.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                    Status
                  </th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: colSpanCount }).map((_, j) => (
                      <td key={j} className="px-6 py-5">
                        <div className="h-4 bg-gray-100 rounded-lg w-full"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : products.length > 0 ? (
                products.map((p, idx) => {
                  // If specific warehouse is filtered, show warehouse specific stock & thresholds
                  let actualQty = p.product_quantity || 0;
                  let minQty = p.min_qty || 0;
                  let maxQty = p.max_qty || 0;

                  if (selectedWarehouse !== "all" && p.locations) {
                    const loc = p.locations.find(
                      (l) => String(l.warehouse_id) === String(selectedWarehouse)
                    );
                    actualQty = loc ? loc.stock : 0;
                    minQty = loc ? loc.min_qty : (p.min_qty || 0);
                    maxQty = loc ? loc.max_qty : (p.max_qty || 0);
                  }

                  // Determine background shading for rows matching mockup colors
                  // E.g., soft pink for UNDER STOCK, soft orange for OVER STOCK, white/light-gray for OK
                  let rowBg = "hover:bg-gray-50/50";
                  if (actualQty < minQty) {
                    rowBg = "bg-red-50/20 hover:bg-red-50/30";
                  } else if (maxQty > 0 && actualQty > maxQty) {
                    rowBg = selectedWarehouse === "3"
                      ? "bg-[#FFF9F2] hover:bg-[#FFF3E6]" // Warm cream background for FG
                      : "bg-amber-50/20 hover:bg-amber-50/30";
                  }

                  if (selectedWarehouse === "3") {
                    // Strip the trailing customer suffix in parentheses to keep name clean
                    const cleanName = p.product_name.replace(/\s*\([^)]+\)\s*$/, '');
                    return (
                      <tr
                        key={`${p.id}_${idx}`}
                        onClick={() => {
                          setSelectedDetailProduct(p);
                          setIsDetailModalOpen(true);
                        }}
                        className={`transition-colors duration-200 ${rowBg} cursor-pointer hover:bg-emerald-50/50`}
                      >
                        {/* Part No */}
                        <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-slate-800 text-center font-mono">
                          {p.product_code}
                        </td>

                        {/* Part Name */}
                        <td className="px-6 py-5 text-sm font-bold text-slate-800 text-center max-w-xs truncate">
                          {cleanName}
                        </td>

                        {/* Customer */}
                        <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-slate-800 text-center uppercase">
                          {p.supplier?.supplier_name || "-"}
                        </td>

                        {/* Warehouse columns */}
                        {visibleWarehouses.map(w => {
                          const loc = p.locations?.find(l => String(l.warehouse_id) === String(w.id));
                          const stock = loc ? Number(loc.stock) : 0;
                          
                          let stockColorClass = "text-gray-900";
                          if (stock > 0) {
                            stockColorClass = "text-emerald-600 font-bold";
                            if (loc && loc.min_qty > 0 && stock < loc.min_qty) {
                              stockColorClass = "text-red-500 font-bold";
                            } else if (loc && loc.max_qty > 0 && stock > loc.max_qty) {
                              stockColorClass = "text-blue-500 font-bold";
                            }
                          } else {
                            stockColorClass = "text-gray-300";
                          }

                          return (
                            <td key={w.id} className="px-4 py-3 whitespace-nowrap text-center bg-emerald-50/[0.02]">
                              <div className="flex flex-col items-center justify-center">
                                <div className="inline-block px-3 py-1.5 bg-white border border-gray-200 rounded-lg min-w-[90px] text-right font-mono font-bold">
                                  <span className={stockColorClass}>
                                    {stock.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                {loc?.hpp !== undefined && (
                                  <span className="text-[9px] text-blue-600 font-bold mt-1">
                                    HPP: Rp {Number(loc.hpp).toLocaleString("id-ID", { maximumFractionDigits: 0 })}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* MIN Quantity */}
                        <td className="px-6 py-5 whitespace-nowrap text-center text-sm font-bold text-slate-700">
                          {minQty.toLocaleString("id-ID")}
                        </td>

                        {/* MAX Quantity */}
                        <td className="px-6 py-5 whitespace-nowrap text-center text-sm font-bold text-slate-700">
                          {maxQty.toLocaleString("id-ID")}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-5 whitespace-nowrap text-center">
                          {getStatusBadge(actualQty, minQty, maxQty)}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={`${p.id}_${idx}`}
                      onClick={() => {
                        setSelectedDetailProduct(p);
                        setIsDetailModalOpen(true);
                      }}
                      className={`transition-colors duration-200 ${rowBg} cursor-pointer hover:bg-emerald-50/50`}
                    >
                      {/* Material Category */}
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {p.product_type || p.category?.category_name || "Raw Material"}
                      </td>

                      {/* Material No */}
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-gray-900 font-mono">
                        {p.product_code}
                      </td>

                      {/* Material Description */}
                      <td className="px-6 py-5 text-sm font-semibold text-gray-900 max-w-xs truncate">
                        {p.product_name}
                      </td>

                      {/* Vendor */}
                      <td className="px-6 py-5 whitespace-nowrap text-xs text-gray-500 font-bold uppercase tracking-wider">
                        {p.supplier?.supplier_name || "-"}
                      </td>

                      {/* Warehouse columns */}
                      {visibleWarehouses.map(w => {
                        const loc = p.locations?.find(l => String(l.warehouse_id) === String(w.id));
                        const stock = loc ? Number(loc.stock) : 0;
                        
                        let stockColorClass = "text-gray-900";
                        if (stock > 0) {
                          stockColorClass = "text-emerald-600 font-bold";
                          if (loc && loc.min_qty > 0 && stock < loc.min_qty) {
                            stockColorClass = "text-red-500 font-bold";
                          } else if (loc && loc.max_qty > 0 && stock > loc.max_qty) {
                            stockColorClass = "text-blue-500 font-bold";
                          }
                        } else {
                          stockColorClass = "text-gray-300";
                        }

                        return (
                          <td key={w.id} className="px-4 py-3 whitespace-nowrap text-center bg-emerald-50/[0.02]">
                            <div className="flex flex-col items-center justify-center">
                              <div className="inline-block px-3 py-1.5 bg-white border border-gray-200 rounded-lg min-w-[90px] text-right font-mono font-bold">
                                <span className={stockColorClass}>
                                  {stock.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              {loc?.hpp !== undefined && (
                                <span className="text-[9px] text-blue-600 font-bold mt-1">
                                  HPP: Rp {Number(loc.hpp).toLocaleString("id-ID", { maximumFractionDigits: 0 })}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* MIN Quantity */}
                      <td className="px-6 py-5 whitespace-nowrap text-center text-sm font-black text-gray-700">
                        {minQty.toLocaleString("id-ID")}
                      </td>

                      {/* MAX Quantity */}
                      <td className="px-6 py-5 whitespace-nowrap text-center text-sm font-black text-gray-700">
                        {maxQty.toLocaleString("id-ID")}
                      </td>

                      {/* UoM */}
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500 font-bold">
                        {p.product_unit || "pcs"}
                      </td>

                      {/* Total QTY (only for semuagudang/all) */}
                      {selectedWarehouse === "all" && (
                        <td className="px-6 py-5 whitespace-nowrap text-center text-sm font-black text-gray-900">
                          {p.product_quantity.toLocaleString("id-ID")}
                        </td>
                      )}

                      {/* Status */}
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        {getStatusBadge(actualQty, minQty, maxQty)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={colSpanCount}
                    className="px-6 py-20 text-center text-gray-400 font-bold italic border-b border-gray-50 bg-gray-50/10"
                  >
                    Tidak ada data stok produk ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 font-semibold">
              Tampilkan
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-bold"
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-500 font-medium">
              Menampilkan {totalResults > 0 ? (page - 1) * pageSize + 1 : 0} sampai{" "}
              {Math.min(page * pageSize, totalResults)} dari {totalResults} SKU
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => fetchProducts(page - 1)}
              className="px-4 py-2 text-sm font-bold rounded-xl bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                if (
                  totalPages > 7 &&
                  pageNum !== 1 &&
                  pageNum !== totalPages &&
                  (pageNum < page - 1 || pageNum > page + 1)
                ) {
                  if (pageNum === page - 2 || pageNum === page + 2)
                    return (
                      <span key={pageNum} className="text-gray-300">
                        ...
                      </span>
                    );
                  return null;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => fetchProducts(pageNum)}
                    className={`w-9 h-9 flex items-center justify-center text-sm font-black rounded-xl transition-all shadow-sm ${
                      page === pageNum
                        ? "bg-emerald-600 text-white border-transparent"
                        : "bg-white border border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-600 active:scale-90"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              disabled={page === totalPages}
              onClick={() => fetchProducts(page + 1)}
              className="px-4 py-2 text-sm font-bold rounded-xl bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      {renderStatsModal()}
      {renderChartDayModal()}
      <ProductDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        product={selectedDetailProduct}
      />
    </div>
  );
}
