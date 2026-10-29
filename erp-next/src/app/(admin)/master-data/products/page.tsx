"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Package,
  Edit2,
  Trash2,
  ShieldAlert,
  Boxes,
  Coins,
  Truck,
  Tag,
  Filter,
  Factory,
  Layers,
  Building2,
  AlertTriangle,
  X,
  Loader2,
  Cog,
  Upload
} from "lucide-react";
import ProductModal from "@/components/master-data/ProductModal";
import ProductDetailModal from "@/components/master-data/ProductDetailModal";
import usePermission from "@/hooks/usePermission";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import api from "@/lib/api";
import ProductSortFilterModal from "@/components/master-data/ProductSortFilterModal";

type Product = {
  id: number;
  product_name: string;
  product_code: string;
  category_id: number;
  category: { category_name: string };
  supplier?: { supplier_name: string; supplier_code: string };
  product_price: number;
  product_quantity: number;
  product_stock_alert: number;
  product_unit: string;
  product_note?: string;
  is_asset: boolean | number;
  is_mandatory: boolean | number;
  min_qty: number;
  max_qty: number;
  buy_price_l1?: number;
  sell_price_l1?: number;
  locations?: {
    warehouse_id: number | string;
    warehouse_name: string;
    warehouse_code: string;
    stock: number;
    aisle: string;
    min_qty: number;
    max_qty: number;
  }[];
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<{
    total_products?: number;
    total_multi_vendor?: number;
    total_raw_comp_pkg?: number;
    total_raw_material?: number;
    total_component?: number;
    total_consumable_pkg?: number;
    total_wip?: number;
    total_fg?: number;
    total_mandatory?: number;
    total_zero_price?: number;
    total_no_supplier?: number;
    total_low_stock?: number;
  }>({
    total_products: 0,
    total_multi_vendor: 0,
    total_raw_comp_pkg: 0,
    total_wip: 0,
    total_fg: 0,
  });

  // Card drill-down modal state
  const [activeCardType, setActiveCardType] = useState<string | null>(null);
  const [cardModalItems, setCardModalItems] = useState<any[]>([]);
  const [cardModalLoading, setCardModalLoading] = useState(false);
  const [cardModalSearch, setCardModalSearch] = useState("");

  const handleCardClick = async (type: string) => {
    setActiveCardType(type);
    setCardModalSearch("");
    setCardModalLoading(true);
    setCardModalItems([]);
    try {
      const res = await api.express.get("/products/stats-items", { type });
      if (res.data.success) {
        setCardModalItems(res.data.items || []);
      }
    } catch (err) {
      console.error("Failed to fetch card items:", err);
    } finally {
      setCardModalLoading(false);
    }
  };

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal & Filters
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [assetFilter, setAssetFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"produk" | "gudang">("produk");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    order: "asc" | "desc";
  }>({
    key: "id",
    order: "desc",
  });

  const { can } = usePermission();
  const visibleWarehouses = warehouseFilter !== "all"
    ? warehouses.filter(w => String(w.id) === String(warehouseFilter))
    : warehouses;
  const {
    isOpen: isStatusModalOpen,
    type: modalType,
    title: modalTitle,
    message: modalMessage,
    onConfirm: modalOnConfirm,
    showSuccess,
    showError,
    showConfirm,
    closeModal,
    isLoading: isActionLoading,
    setIsLoading: setActionLoading,
  } = useStatusModal();

  const fetchProducts = async (currentPage = 1) => {
    setLoading(true);
    try {
      const res = await api.express.get("/products", {
        page: currentPage,
        limit: pageSize,
        search: search,
        category_id: categoryFilter,
        is_asset: assetFilter,
        filter_status: statusFilter,
        sort_key: sortConfig.key,
        sort_order: sortConfig.order,
        parent_only: activeTab === "gudang" ? "true" : "false",
        warehouse_id: warehouseFilter
      });
      setProducts(res.data.data || []);
      setPage(res.data.current_page || 1);
      setTotalPages(res.data.last_page || 1);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.express.get("/products/stats", {
        parent_only: activeTab === "gudang" ? "true" : "false",
        warehouse_id: warehouseFilter
      });
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.express.get("/products/form-data");
      setCategories(res.data.categories || []);
      setWarehouses(res.data.warehouses || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(1);
      fetchStats();
    }, 500);
    return () => clearTimeout(timer);
  }, [search, categoryFilter, warehouseFilter, assetFilter, statusFilter, pageSize, sortConfig, activeTab]);

  const activeFilterCount = [
    categoryFilter !== "all",
    warehouseFilter !== "all",
    assetFilter !== "all",
    statusFilter !== "all",
    sortConfig.key !== "id" || sortConfig.order !== "desc",
  ].filter(Boolean).length;

  const handleAdd = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (prod: Product) => {
    setSelectedProduct(prod);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    showConfirm(
      "Delete Product?",
      "Are you sure you want to delete this product? This action cannot be undone.",
      () => performDelete(id),
      "Delete Now",
      "Keep it",
    );
  };

  const performDelete = async (id: number) => {
    setActionLoading(true);
    try {
      await api.express.delete(`/products/${id}`);
      showSuccess("Deleted!", "Product has been deleted successfully.");
      fetchProducts(page);
    } catch (error: any) {
      showError("Delete Failed", error.message || "Failed to delete.");
    } finally {
      setActionLoading(false);
    }
  };

  const renderCardModal = () => {
    if (!activeCardType) return null;

    let modalTitle = "Detail Produk Container";
    let icon = <Package size={22} />;
    let iconBg = "bg-emerald-50 text-emerald-600 border-emerald-100";

    if (activeCardType === "total") {
      modalTitle = "Daftar Semua Produk (Total Item)";
      icon = <Package size={22} />;
      iconBg = "bg-emerald-50 text-emerald-600 border-emerald-100";
    } else if (activeCardType === "multi_vendor") {
      modalTitle = "Daftar Produk Multi-Vendor (Quota Arrangement)";
      icon = <Building2 size={22} />;
      iconBg = "bg-indigo-50 text-indigo-600 border-indigo-100";
    } else if (activeCardType === "raw_comp_pkg" || activeCardType === "raw") {
      modalTitle = "Daftar Raw Material, Component, Consumable, Sticker & Packaging";
      icon = <Layers size={22} />;
      iconBg = "bg-blue-50 text-blue-600 border-blue-100";
    } else if (activeCardType === "wip") {
      modalTitle = "Daftar Barang Setengah Jadi (Work in Progress / WIP)";
      icon = <ShieldAlert size={22} />;
      iconBg = "bg-amber-50 text-amber-600 border-amber-100";
    } else if (activeCardType === "fg") {
      modalTitle = "Daftar Barang Jadi (Finished Goods)";
      icon = <Factory size={22} />;
      iconBg = "bg-teal-50 text-teal-600 border-teal-100";
    }

    const filteredItems = cardModalItems.filter((item) => {
      if (!cardModalSearch) return true;
      const s = cardModalSearch.toLowerCase();
      return (
        (item.product_name && item.product_name.toLowerCase().includes(s)) ||
        (item.product_code && item.product_code.toLowerCase().includes(s)) ||
        (item.category_name && item.category_name.toLowerCase().includes(s))
      );
    });

    const isSingleBuyPrice = activeCardType === "raw_comp_pkg" || activeCardType === "raw" || activeCardType === "wip";
    const isSingleSellPrice = activeCardType === "fg";
    const isDualPrice = activeCardType === "total" || activeCardType === "multi_vendor";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          onClick={() => setActiveCardType(null)}
        />

        {/* Modal Window Container */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-5xl z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
          {/* Modal Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm border ${iconBg}`}>
                {icon}
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">{modalTitle}</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Menampilkan {filteredItems.length} dari {cardModalItems.length} Produk
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveCardType(null)}
              className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search Box inside Modal */}
          <div className="p-4 border-b border-gray-100 bg-white">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari item berdasarkan nama, kode, atau kategori..."
                value={cardModalSearch}
                onChange={(e) => setCardModalSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 placeholder-gray-400 outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-y-auto flex-1 p-6">
            {cardModalLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <Loader2 className="animate-spin text-emerald-600" size={32} />
                <p className="text-xs font-bold text-gray-400 italic">Mengambil daftar produk container...</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/80 sticky top-0 z-10 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Part No / Kode</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Nama Produk / Material</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Kategori</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Supplier / Vendor</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Stok Total</th>
                    {isSingleBuyPrice && (
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Harga Beli</th>
                    )}
                    {isSingleSellPrice && (
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Harga Jual</th>
                    )}
                    {isDualPrice && (
                      <>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Harga Beli</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Harga Jual</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item, idx) => {
                      const cleanName = item.product_name ? item.product_name.replace(/\s*\([^)]+\)\s*$/, '') : '-';
                      const vendorDisplay = item.mapped_suppliers && item.mapped_suppliers.length > 1
                        ? `${item.mapped_suppliers.length} Vendor (${item.mapped_suppliers.map((s: any) => s.supplier_name).join(', ')})`
                        : (item.supplier?.supplier_name || (item.mapped_suppliers?.[0]?.supplier_name) || '-');

                      return (
                        <tr
                          key={`${item.id}_modal_${idx}`}
                          onClick={() => {
                            setSelectedDetailProduct(item);
                            setIsDetailModalOpen(true);
                          }}
                          className="hover:bg-emerald-50/40 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-900 font-mono">
                            {item.product_code}
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-gray-900 max-w-xs truncate">
                            {cleanName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs">
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-gray-100 text-gray-700 border border-gray-200 uppercase tracking-wider">
                              {item.category?.category_name || item.product_type || "Raw Material"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-gray-500 max-w-xs truncate">
                            {vendorDisplay}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-black text-gray-800">
                            {(item.product_quantity || 0).toLocaleString("id-ID")} {item.product_unit || 'pcs'}
                          </td>
                          {isSingleBuyPrice && (
                            <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-black">
                              {item.buy_price > 0 ? (
                                <span className="text-emerald-700">Rp {item.buy_price.toLocaleString("id-ID")}</span>
                              ) : (
                                <span className="text-rose-500 font-bold italic">Belum Ada Harga</span>
                              )}
                            </td>
                          )}
                          {isSingleSellPrice && (
                            <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-black">
                              {item.sell_price > 0 ? (
                                <span className="text-emerald-700">Rp {item.sell_price.toLocaleString("id-ID")}</span>
                              ) : (
                                <span className="text-rose-500 font-bold italic">Belum Ada Harga</span>
                              )}
                            </td>
                          )}
                          {isDualPrice && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-black">
                                {item.buy_price > 0 ? (
                                  <span className="text-emerald-700">Rp {item.buy_price.toLocaleString("id-ID")}</span>
                                ) : (
                                  <span className="text-rose-500 font-bold italic">Belum Ada Harga</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-black">
                                {item.sell_price > 0 ? (
                                  <span className="text-blue-700">Rp {item.sell_price.toLocaleString("id-ID")}</span>
                                ) : (
                                  <span className="text-rose-500 font-bold italic">Belum Ada Harga</span>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-xs font-bold text-gray-400 italic">
                        Tidak ada data produk yang sesuai dengan kriteria pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <span>Master Data Produk</span>
            <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full uppercase tracking-wider">
              {stats.total_products || 0} Total Items
            </span>
          </h1>
          <p className="text-xs font-bold text-gray-400 mt-1">
            Kelola katalog produk, multi-vendor, harga beli/jual, dan stok persediaan gudang.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleAdd}
            className="flex-1 sm:flex-none px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            <Plus size={16} />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 gap-8 text-xs font-black">
        <button
          onClick={() => setActiveTab("produk")}
          className={`pb-3 transition-colors border-b-2 ${
            activeTab === "produk"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Data Produk
        </button>
        <button
          onClick={() => setActiveTab("gudang")}
          className={`pb-3 transition-colors border-b-2 ${
            activeTab === "gudang"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Data Gudang
        </button>
      </div>

      {/* Enterprise Recap Statistics Cards Container (5 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* 1. Total Item */}
        <div 
          onClick={() => handleCardClick("total")}
          className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-300 hover:-translate-y-1 cursor-pointer transition-all active:scale-95 group"
        >
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-2.5 border border-emerald-100 group-hover:scale-110 transition-transform">
            <Package size={20} />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Item</p>
          <p className="text-xl font-black text-gray-900 mt-0.5">
            {stats.total_products || 0}
          </p>
        </div>

        {/* 2. Multi Vendor */}
        <div 
          onClick={() => handleCardClick("multi_vendor")}
          className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-300 hover:-translate-y-1 cursor-pointer transition-all active:scale-95 group"
        >
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-2.5 border border-indigo-100 group-hover:scale-110 transition-transform">
            <Building2 size={20} />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Multi Vendor</p>
          <p className="text-xl font-black text-gray-900 mt-0.5">
            {stats.total_multi_vendor || 0}
          </p>
        </div>

        {/* 3. Raw Material, Component, Consumable, Sticker & Packaging */}
        <div 
          onClick={() => handleCardClick("raw_comp_pkg")}
          className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-300 hover:-translate-y-1 cursor-pointer transition-all active:scale-95 group"
        >
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl w-fit mb-2.5 border border-blue-100 group-hover:scale-110 transition-transform">
            <Layers size={20} />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate" title="Raw Material, Component, Sticker & Packaging">
            Raw Material, Component, Packaging
          </p>
          <p className="text-xl font-black text-gray-900 mt-0.5">
            {stats.total_raw_comp_pkg || 0}
          </p>
        </div>

        {/* 4. Work in Progress */}
        <div 
          onClick={() => handleCardClick("wip")}
          className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-300 hover:-translate-y-1 cursor-pointer transition-all active:scale-95 group"
        >
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl w-fit mb-2.5 border border-amber-100 group-hover:scale-110 transition-transform">
            <ShieldAlert size={20} />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Work in Progress</p>
          <p className="text-xl font-black text-gray-900 mt-0.5">
            {stats.total_wip || 0}
          </p>
        </div>

        {/* 5. Finished Goods */}
        <div 
          onClick={() => handleCardClick("fg")}
          className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-teal-300 hover:-translate-y-1 cursor-pointer transition-all active:scale-95 group"
        >
          <div className="p-2.5 bg-teal-50 text-teal-600 rounded-2xl w-fit mb-2.5 border border-teal-100 group-hover:scale-110 transition-transform">
            <Factory size={20} />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Finished Goods</p>
          <p className="text-xl font-black text-gray-900 mt-0.5">
            {stats.total_fg || 0}
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search
            className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500"
            size={18}
          />
          <input
            type="text"
            placeholder="Cari produk berdasarkan nama atau kode..."
            className="w-full pl-14 pr-6 py-4 rounded-2xl border-none bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-bold transition-all placeholder:text-gray-400 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="relative flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 px-8 py-4 rounded-2xl font-bold hover:bg-emerald-100 transition-all active:scale-95 text-xs uppercase tracking-widest border border-emerald-100 whitespace-nowrap group"
        >
          <Filter
            size={16}
            className="group-hover:rotate-12 transition-transform"
          />
          <span>Sort & Filter</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-emerald-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-in zoom-in duration-300">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Main Data Table Container */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 text-left">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Supplier
                </th>
                {visibleWarehouses.map(w => (
                  <th key={w.id} className="px-4 py-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center bg-emerald-50/30 min-w-[80px]">
                    <div className="flex flex-col items-center">
                      <span>{w.short_name || w.code}</span>
                    </div>
                  </th>
                ))}
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center text-orange-400">
                  Min QTY
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center text-blue-400">
                  Max QTY
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Uom
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                  Total QTY
                </th>
                {can("create_products") && (
                  <>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                      Price (Beli / Jual)
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right text-emerald-600">
                      Total Harga
                    </th>
                  </>
                )}
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-6 py-5.5">
                        <div className="h-4 bg-gray-100 rounded-lg w-full"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : products.length > 0 ? (
                products.map((p, idx) => (
                  <tr
                    key={`${p.id}_${idx}`}
                    onClick={() => {
                        setSelectedDetailProduct(p);
                        setIsDetailModalOpen(true);
                    }}
                    className="hover:bg-emerald-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="font-semibold text-gray-900">
                        {p.product_name}
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold">
                        {p.product_code}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wider leading-4">
                        {p.category?.category_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-medium font-mono">
                      {p.supplier?.supplier_name || "-"}
                    </td>
                     {visibleWarehouses.map(w => {
                        const loc = p.locations?.find(l => String(l.warehouse_id) === String(w.id));
                        const isSubItem = !!p.supplier;
                        const isGudangView = activeTab === "gudang";
                        
                        // Check if stock is warning
                        let stockColorClass = "text-gray-300";
                        if (loc && loc.stock > 0) {
                            stockColorClass = "text-emerald-600";
                            if (isGudangView && loc.min_qty > 0 && loc.stock < loc.min_qty) {
                                stockColorClass = "text-red-500 font-bold flex items-center justify-center gap-1 animate-pulse";
                            } else if (isGudangView && loc.max_qty > 0 && loc.stock > loc.max_qty) {
                                stockColorClass = "text-blue-500 font-bold";
                            }
                        }

                        return (
                            <td key={w.id} className="px-4 py-4 whitespace-nowrap text-center text-xs font-black text-gray-500 bg-emerald-50/10">
                                {loc ? (
                                    <div className="flex flex-col items-center justify-center">
                                        <span className={stockColorClass}>
                                            {isGudangView && loc.min_qty > 0 && loc.stock < loc.min_qty && loc.stock > 0 && "⚠️ "}
                                            {loc.stock}
                                        </span>
                                        {isGudangView && (loc.min_qty > 0 || loc.max_qty > 0) && (
                                            <span className="text-[9px] text-gray-400 font-bold uppercase mt-0.5 tracking-wider">
                                                Min: {loc.min_qty} | Max: {loc.max_qty}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-gray-200">-</span>
                                )}
                            </td>
                        );
                    })}
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-black text-orange-600">
                      {activeTab === "gudang" ? (p.min_qty || 0) : (!!p.supplier ? (p.min_qty || 0) : "-")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-black text-blue-600">
                      {activeTab === "gudang" ? (p.max_qty || 0) : (!!p.supplier ? (p.max_qty || 0) : "-")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {p.product_unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-black text-gray-800">
                      {p.product_quantity || 0}
                    </td>
                    {can("create_products") && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex flex-col items-end">
                            {(Number(p.buy_price_l1) > 0 || Number(p.product_price) > 0) ? (
                              <span className="text-sm font-black text-gray-900">Rp {Number(p.buy_price_l1 || p.product_price).toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                            ) : null}
                            {Number(p.sell_price_l1) > 0 ? (
                              <span className="text-sm font-black text-emerald-600">Rp {Number(p.sell_price_l1).toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                            ) : null}
                            {!(Number(p.buy_price_l1) > 0 || Number(p.product_price) > 0) && !(Number(p.sell_price_l1) > 0) && (
                              <span className="text-xs font-bold text-gray-300 italic">No Price</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-black text-emerald-700 text-sm text-right">
                          Rp {(Math.round((p.product_quantity || 0) * (p.buy_price_l1 || p.product_price || 0))).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-center space-y-1">
                      <div className="flex flex-col gap-1 items-center justify-center">
                        {!!p.is_asset ? (
                          <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                            Asset
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-wider border border-gray-100">
                            Others
                          </span>
                        )}

                        {!!p.is_mandatory ? (
                          <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-teal-600 text-[10px] font-bold uppercase tracking-wider border border-teal-100">
                            Mandatory
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {can("edit_products") && (
                          <button
                            onClick={() => handleEdit(p)}
                            className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {can("delete_products") && (
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={10 + visibleWarehouses.length}
                    className="px-6 py-20 text-center text-gray-400 font-bold italic border-b border-gray-50"
                  >
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              Show
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
              Showing {(page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, stats.total_products || 0)} of{" "}
              {stats.total_products || 0} results
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => fetchProducts(page - 1)}
              className="px-4 py-2 text-sm font-bold rounded-xl bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
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
                    className={`w-9 h-9 flex items-center justify-center text-sm font-black rounded-xl transition-all ${
                      page === pageNum
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
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
              className="px-4 py-2 text-sm font-bold rounded-xl bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <ProductSortFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        sortConfig={sortConfig}
        onSortChange={setSortConfig}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        warehouseFilter={warehouseFilter}
        setWarehouseFilter={setWarehouseFilter}
        assetFilter={assetFilter}
        setAssetFilter={setAssetFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        categories={categories}
        warehouses={warehouses}
      />

      {/* Card Drill-Down Modal */}
      {renderCardModal()}

      {/* Product Detail Modal */}
      <ProductDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedDetailProduct(null);
        }}
        product={selectedDetailProduct}
        onEdit={(prod) => {
          setIsDetailModalOpen(false);
          setSelectedDetailProduct(null);
          handleEdit(prod);
        }}
      />

      {/* Product Create/Edit Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
        onSuccess={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
          fetchProducts(page);
          fetchStats();
        }}
        productToEdit={selectedProduct}
      />

      {/* Status Confirmation Modal */}
      <StatusModal
        isOpen={isStatusModalOpen}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        onClose={closeModal}
        onConfirm={modalOnConfirm}
        isLoading={isActionLoading}
      />
    </div>
  );
}
