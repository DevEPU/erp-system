"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCcw,
  Plus,
  Search,
  Calendar,
  Warehouse,
  ClipboardList,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  FileText,
  FileCheck,
  Send,
  Sliders,
  AlertCircle,
  X,
  Edit2,
  Lock,
  Package,
  TrendingUp,
  TrendingDown,
  Layers,
  Check,
  Filter
} from "lucide-react";
import api from "@/lib/api";
import usePermission from "@/hooks/usePermission";
import PrintButton from "@/components/ui/PrintButton";

export default function StockOpnamePage() {
  const router = useRouter();
  const { user } = usePermission();
  
  const [opnames, setOpnames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // View state: null = list view, object = full detail view
  const [selectedOpname, setSelectedOpname] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"items" | "journal">("items");
  const [detailItemSearch, setDetailItemSearch] = useState("");

  // Modal states (Create & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingStoId, setEditingStoId] = useState<number | null>(null);

  // Form State
  const [stoDate, setStoDate] = useState(new Date().toISOString().split("T")[0]);
  const [stoWarehouseId, setStoWarehouseId] = useState("");
  const [stoNote, setStoNote] = useState("");
  const [stoItems, setStoItems] = useState<any[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [modalItemSearch, setModalItemSearch] = useState("");

  // Master Data
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Form Headers
  const [stoDeptId, setStoDeptId] = useState("");
  const [stoCategoryId, setStoCategoryId] = useState("");
  const [stoCoaId, setStoCoaId] = useState("");
  const [stoReference, setStoReference] = useState("");
  const [savingSto, setSavingSto] = useState(false);

  useEffect(() => {
    fetchOpnames();
    fetchWarehouses();
    fetchFormOptions();
  }, [search]);

  const fetchFormOptions = async () => {
    try {
      const [deptRes, catRes, coaRes] = await Promise.all([
        api.express.get("/departments"),
        api.express.get("/product-categories"),
        api.express.get("/chart-of-accounts")
      ]);
      setDepartments(deptRes.data.data || []);
      setCategories(catRes.data.data || []);
      setAccounts(coaRes.data.data || []);
    } catch (err) {
      console.error("Error fetching form options:", err);
    }
  };

  const fetchNextRef = async (deptId: string) => {
    try {
      const res = await api.express.get("/references/next-reference", {
        params: { type: "STO", department_id: deptId || undefined }
      });
      if (res.data.success) {
        setStoReference(res.data.reference);
      }
    } catch (err) {
      console.error("Error fetching next STO reference:", err);
    }
  };

  const fetchOpnames = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/stock-opnames", {
        params: { search }
      });
      setOpnames(res.data.data || []);
    } catch (err) {
      console.error("Error fetching stock opnames:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await api.express.get("/warehouses");
      setWarehouses(res.data.data || []);
    } catch (err) {
      console.error("Error fetching warehouses:", err);
    }
  };

  const viewOpnameDetails = async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await api.express.get(`/stock-opnames/${id}`);
      setSelectedOpname(res.data.data);
      setActiveTab("items");
      setDetailItemSearch("");
    } catch (err) {
      console.error("Error loading opname details:", err);
      alert("Gagal memuat detail Stock Opname.");
    } finally {
      setDetailLoading(false);
    }
  };

  // Fetch system stocks based on selected warehouse & category (or all if empty)
  const fetchSystemStocks = async (whId: string, catId: string) => {
    setItemsLoading(true);
    try {
      const res = await api.express.get("/stock-opnames/system-stock", {
        params: { 
          warehouse_id: whId ? Number(whId) : undefined,
          category_id: catId ? Number(catId) : undefined
        }
      });
      
      const items = (res.data.data || []).map((item: any) => ({
        ...item,
        qty_physical: item.qty_system
      }));
      
      setStoItems(items);
    } catch (err) {
      console.error("Error loading system stocks:", err);
      alert("Gagal memuat stock sistem.");
    } finally {
      setItemsLoading(false);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setIsEditMode(false);
    setEditingStoId(null);
    setStoDate(new Date().toISOString().split("T")[0]);
    setStoWarehouseId("");
    setStoCategoryId("");
    setStoNote("");
    setStoCoaId("");
    setModalItemSearch("");
    
    if (user && user.department_id) {
      setStoDeptId(user.department_id.toString());
      fetchNextRef(user.department_id.toString());
    } else {
      setStoDeptId("");
      fetchNextRef("");
    }

    setIsModalOpen(true);
    // Load all data by default (warehouse_id: "", category_id: "")
    fetchSystemStocks("", "");
  };

  // Open Edit Modal (Draft Only)
  const handleOpenEditModal = async (sto: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (sto.status === "Adjusted") {
      alert("Stock Opname sudah direkonsiliasi (Adjusted) dan tidak dapat diedit kembali.");
      return;
    }

    setIsEditMode(true);
    setEditingStoId(sto.id);
    setStoReference(sto.reference || "");
    setStoDate(sto.date ? String(sto.date).split("T")[0] : new Date().toISOString().split("T")[0]);
    setStoWarehouseId(sto.warehouse_id ? sto.warehouse_id.toString() : "");
    setStoCategoryId(sto.category_id ? sto.category_id.toString() : "");
    setStoDeptId(sto.department_id ? sto.department_id.toString() : "");
    setStoCoaId(sto.coa_id ? sto.coa_id.toString() : "");
    setStoNote(sto.note || "");
    setModalItemSearch("");
    setIsModalOpen(true);
    setItemsLoading(true);

    try {
      const res = await api.express.get(`/stock-opnames/${sto.id}`);
      const data = res.data.data;
      if (data && data.details) {
        setStoItems(data.details.map((d: any) => ({
          product_id: d.product_id,
          product_name: d.product_name,
          product_code: d.product_code,
          product_unit: d.product_unit,
          supplier_id: d.supplier_id,
          supplier_name: d.supplier_name,
          qty_system: Number(d.qty_system),
          qty_physical: Number(d.qty_physical)
        })));
      }
    } catch (err) {
      console.error("Error loading STO details for edit:", err);
      alert("Gagal memuat rincian Stock Opname untuk diedit.");
    } finally {
      setItemsLoading(false);
    }
  };

  const handleWarehouseFilterChange = (whId: string) => {
    setStoWarehouseId(whId);
    if (!isEditMode) {
      fetchSystemStocks(whId, stoCategoryId);
    }
  };

  const handleCategoryFilterChange = (catId: string) => {
    setStoCategoryId(catId);
    if (!isEditMode) {
      fetchSystemStocks(stoWarehouseId, catId);
    }
  };

  const handleQtyPhysicalChange = (product_id: number, supplier_id: number | null, value: number) => {
    setStoItems(prev => prev.map(item => {
      const sameProduct = item.product_id === product_id;
      const sameSupplier = (item.supplier_id || null) === (supplier_id || null);
      if (sameProduct && sameSupplier) {
        return { ...item, qty_physical: value };
      }
      return item;
    }));
  };

  const handleSaveStockOpname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stoItems.length === 0) {
      alert("Tidak ada item persediaan yang dimuat untuk disimpan.");
      return;
    }

    setSavingSto(true);
    try {
      const payload = {
        reference: stoReference,
        date: stoDate,
        warehouse_id: stoWarehouseId ? Number(stoWarehouseId) : null,
        note: stoNote,
        department_id: stoDeptId ? Number(stoDeptId) : null,
        category_id: stoCategoryId ? Number(stoCategoryId) : null,
        coa_id: stoCoaId ? Number(stoCoaId) : null,
        items: stoItems.map(item => ({
          product_id: item.product_id,
          supplier_id: item.supplier_id || null,
          qty_system: Number(item.qty_system),
          qty_physical: Number(item.qty_physical)
        }))
      };

      if (isEditMode && editingStoId) {
        const res = await api.express.put(`/stock-opnames/${editingStoId}`, payload);
        alert(res.data.message || "Draft Stock Opname berhasil diperbarui!");
        if (selectedOpname && selectedOpname.id === editingStoId) {
          viewOpnameDetails(editingStoId);
        }
      } else {
        const res = await api.express.post("/stock-opnames", payload);
        alert(res.data.message || "Draft Stock Opname berhasil disimpan!");
      }

      setIsModalOpen(false);
      fetchOpnames();
    } catch (err: any) {
      console.error("Error saving stock opname:", err);
      alert(err.response?.data?.message || err.message || "Gagal menyimpan Stock Opname");
    } finally {
      setSavingSto(false);
    }
  };

  const handleAdjustStockOpname = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin merekonsiliasi stock opname ini? Stok sistem dan fisik akan disinkronkan secara permanen, dan status akan berubah menjadi Reconciled (tidak dapat diedit lagi).")) {
      return;
    }

    try {
      const res = await api.express.put(`/stock-opnames/${id}/adjust`);
      alert(res.data.message || "Rekonsiliasi stok berhasil dilakukan!");
      if (selectedOpname) {
        viewOpnameDetails(selectedOpname.id);
      }
      fetchOpnames();
    } catch (err: any) {
      console.error("Error adjusting stock opname:", err);
      alert(err.response?.data?.message || err.message || "Gagal melakukan rekonsiliasi stok.");
    }
  };

  // Filter items in modal
  const filteredModalItems = useMemo(() => {
    if (!modalItemSearch.trim()) return stoItems;
    const q = modalItemSearch.toLowerCase();
    return stoItems.filter(item => 
      (item.product_name && item.product_name.toLowerCase().includes(q)) ||
      (item.product_code && item.product_code.toLowerCase().includes(q)) ||
      (item.supplier_name && item.supplier_name.toLowerCase().includes(q))
    );
  }, [stoItems, modalItemSearch]);

  // Filter items in detail view
  const filteredDetailItems = useMemo(() => {
    if (!selectedOpname?.details) return [];
    if (!detailItemSearch.trim()) return selectedOpname.details;
    const q = detailItemSearch.toLowerCase();
    return selectedOpname.details.filter((item: any) =>
      (item.product_name && item.product_name.toLowerCase().includes(q)) ||
      (item.product_code && item.product_code.toLowerCase().includes(q)) ||
      (item.supplier_name && item.supplier_name.toLowerCase().includes(q))
    );
  }, [selectedOpname?.details, detailItemSearch]);

  // Calculations for detail view metrics
  const detailMetrics = useMemo(() => {
    if (!selectedOpname?.details) return { total: 0, matched: 0, surplus: 0, shortage: 0, totalDiffVal: 0 };
    let total = selectedOpname.details.length;
    let matched = 0;
    let surplus = 0;
    let shortage = 0;
    let totalDiffVal = 0;

    selectedOpname.details.forEach((item: any) => {
      const diff = Number(item.qty_difference || 0);
      const price = Number(item.product_price || 0);
      if (diff === 0) matched++;
      else if (diff > 0) surplus++;
      else shortage++;

      totalDiffVal += diff * price;
    });

    return { total, matched, surplus, shortage, totalDiffVal };
  }, [selectedOpname]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Draft":
        return (
          <span className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-200/60 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1.5 w-max">
            <Clock size={11} /> Draft
          </span>
        );
      case "Adjusted":
        return (
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1.5 w-max">
            <CheckCircle2 size={11} /> Reconciled / Adjusted
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-slate-50 text-slate-600 border border-slate-200/60 text-[10px] font-black rounded-full uppercase tracking-wider w-max">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#f8fafc] min-h-screen animate-in fade-in duration-300">
      
      {/* ============================================================== */}
      {/* VIEW 1: FULL DETAIL VIEW (When a transaction is clicked)       */}
      {/* ============================================================== */}
      {selectedOpname ? (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          {/* Top Return & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <button 
              onClick={() => setSelectedOpname(null)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all border border-gray-200/60 shadow-sm active:scale-95 w-max"
            >
              <ArrowLeft size={16} /> Kembali ke Daftar STO
            </button>

            <div className="flex items-center flex-wrap gap-2.5">
              <PrintButton
                moduleKey="stok_opname"
                moduleName="Stok Opname"
                data={{
                  ...selectedOpname,
                  opname_number: selectedOpname.reference || `#STO-${selectedOpname.id}`,
                  warehouse_name: selectedOpname.warehouse_name || "Semua Gudang",
                  opname_date: selectedOpname.date || "-",
                  pic_name: selectedOpname.user_name || "-",
                  status: selectedOpname.status || "Draft",
                  items: selectedOpname.details || [],
                }}
              />

              {/* Edit draft button (if Draft) */}
              {selectedOpname.status === "Draft" ? (
                <>
                  <button
                    onClick={() => handleOpenEditModal(selectedOpname)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-200 active:scale-95"
                  >
                    <Edit2 size={14} /> Edit Draft
                  </button>
                  <button
                    onClick={() => handleAdjustStockOpname(selectedOpname.id)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-purple-200 active:scale-95"
                  >
                    <Send size={14} /> Reconcile Stok
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Stok Telah Direkonsiliasi (Terkunci)</span>
                </div>
              )}
            </div>
          </div>

          {/* Main Transaction Header Card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-gray-100">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="px-3.5 py-1.5 bg-purple-100 text-purple-700 text-[10px] font-black rounded-xl uppercase tracking-wider">
                    Detail Mutasi Stok Opname
                  </span>
                  {getStatusBadge(selectedOpname.status)}
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                  {selectedOpname.reference}
                </h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={13} className="text-purple-500" /> Tanggal: {selectedOpname.date}
                </p>
              </div>

              {/* Status Alert for Draft */}
              {selectedOpname.status === "Draft" && (
                <div className="bg-amber-50/80 border border-amber-200/80 p-4 rounded-2xl max-w-md">
                  <div className="flex gap-2.5">
                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-amber-900 uppercase tracking-wide">Status Masih Draft</p>
                      <p className="text-xs text-amber-700 leading-relaxed font-medium">
                        Hasil hitungan fisik belum disinkronkan ke master inventaris. Anda masih dapat mengedit atau langsung menekan tombol &quot;Reconcile Stok&quot; di atas.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Information Badges / Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-gray-50/70 rounded-2xl border border-gray-100 text-xs">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lokasi Gudang</p>
                <p className="font-black text-gray-900 mt-1 flex items-center gap-1.5">
                  <Warehouse size={13} className="text-gray-400" />
                  {selectedOpname.warehouse_name || "Semua Gudang"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Departemen</p>
                <p className="font-black text-gray-900 mt-1">
                  {selectedOpname.department_name || "-"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kategori Produk</p>
                <p className="font-black text-gray-900 mt-1">
                  {selectedOpname.category_name || "Semua Kategori"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Akun Jurnal (COA)</p>
                <p className="font-black text-gray-900 mt-1 truncate">
                  {selectedOpname.coa_name ? `${selectedOpname.coa_code} - ${selectedOpname.coa_name}` : "Akun Standar Selisih (51100)"}
                </p>
              </div>
            </div>

            {/* Note if present */}
            {selectedOpname.note && (
              <div className="p-4 bg-purple-50/40 border border-purple-100 rounded-2xl">
                <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Catatan Penyesuaian</p>
                <p className="text-sm font-medium text-gray-700 mt-1">{selectedOpname.note}</p>
              </div>
            )}

            {/* Statistical Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider">Total Item</span>
                  <Package size={15} />
                </div>
                <div className="text-2xl font-black text-gray-900">{detailMetrics.total}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Barang Diperiksa</div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between text-emerald-500 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider">Sesuai (Cocok)</span>
                  <Check size={15} />
                </div>
                <div className="text-2xl font-black text-emerald-600">{detailMetrics.matched}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Tanpa Selisih</div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between text-blue-500 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider">Surplus (+)</span>
                  <TrendingUp size={15} />
                </div>
                <div className="text-2xl font-black text-blue-600">{detailMetrics.surplus}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Stok Fisik Lebih</div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between text-red-500 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider">Defisit (-)</span>
                  <TrendingDown size={15} />
                </div>
                <div className="text-2xl font-black text-red-600">{detailMetrics.shortage}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Stok Fisik Kurang</div>
              </div>
            </div>
          </div>

          {/* Details Table Tabs Card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
            {/* Tabs & Search Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab("items")}
                  className={`py-3 px-6 text-xs font-black uppercase tracking-wider rounded-2xl transition-all ${
                    activeTab === "items"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  Rincian Transaksi Persediaan ({selectedOpname.details?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab("journal")}
                  className={`py-3 px-6 text-xs font-black uppercase tracking-wider rounded-2xl transition-all ${
                    activeTab === "journal"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  Rincian Jurnal Akun
                </button>
              </div>

              {activeTab === "items" && (
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input
                    type="text"
                    placeholder="Filter nama produk / kode..."
                    value={detailItemSearch}
                    onChange={(e) => setDetailItemSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500/20 focus:bg-white outline-none transition-all"
                  />
                </div>
              )}
            </div>

            {/* TAB 1: ITEMS TABLE */}
            {activeTab === "items" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-center w-12">No</th>
                      <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest">Kode / Part</th>
                      <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest">Nama Produk</th>
                      <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest">Vendor / Supplier</th>
                      <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-center">UoM</th>
                      <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-center">Stok Sistem</th>
                      <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-center">Hitungan Fisik</th>
                      <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-center">Selisih</th>
                      <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-medium">
                    {filteredDetailItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-12 text-center text-gray-400 font-bold uppercase tracking-wider bg-gray-50/20">
                          Tidak ada rincian item yang sesuai filter.
                        </td>
                      </tr>
                    ) : (
                      filteredDetailItems.map((item: any, idx: number) => {
                        const diff = Number(item.qty_difference || 0);
                        const isZero = diff === 0;
                        const isPositive = diff > 0;

                        return (
                          <tr key={item.id || idx} className="hover:bg-purple-50/20 transition-colors">
                            <td className="px-5 py-3.5 text-center font-bold text-gray-400">{idx + 1}</td>
                            <td className="px-5 py-3.5 font-black text-gray-900">{item.product_code}</td>
                            <td className="px-5 py-3.5 text-gray-800 font-bold">{item.product_name}</td>
                            <td className="px-5 py-3.5">
                              {item.supplier_name ? (
                                <span className="inline-block px-2.5 py-1 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                  {item.supplier_name}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic text-[11px]">-</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-center font-bold text-gray-400 uppercase">{item.product_unit}</td>
                            <td className="px-5 py-3.5 text-center font-bold text-gray-600">{item.qty_system}</td>
                            <td className="px-5 py-3.5 text-center font-black text-gray-900 bg-gray-50/50">{item.qty_physical}</td>
                            <td className="px-5 py-3.5 text-center">
                              <span className={`inline-block px-3 py-1 rounded-xl text-xs font-black ${
                                isZero 
                                  ? "bg-slate-100 text-slate-600" 
                                  : isPositive 
                                    ? "bg-emerald-50 text-emerald-700 font-black border border-emerald-200" 
                                    : "bg-red-50 text-red-600 font-black border border-red-200"
                              }`}>
                                {isZero ? "0" : isPositive ? `+${diff}` : diff}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              {isZero ? (
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Cocok</span>
                              ) : isPositive ? (
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Surplus</span>
                              ) : (
                                <span className="text-[10px] font-black text-red-600 uppercase tracking-wider">Defisit</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: JOURNAL TABLE */}
            {activeTab === "journal" && (() => {
              const inventoryAccount = { code: "11200", name: "Persediaan Barang" };
              const targetAccount = {
                code: selectedOpname.coa_code || "51100",
                name: selectedOpname.coa_name || "Selisih Persediaan"
              };

              let totalInventoryDebit = 0;
              let totalInventoryCredit = 0;
              let totalTargetDebit = 0;
              let totalTargetCredit = 0;

              selectedOpname.details?.forEach((item: any) => {
                const diff = Number(item.qty_difference || 0);
                const price = Number(item.product_price || 0);
                const value = Math.abs(diff) * price;
                if (value > 0) {
                  if (diff > 0) {
                    totalInventoryDebit += value;
                    totalTargetCredit += value;
                  } else {
                    totalTargetDebit += value;
                    totalInventoryCredit += value;
                  }
                }
              });

              const groupedLines = [];
              if (totalInventoryDebit > 0) {
                groupedLines.push({
                  code: inventoryAccount.code,
                  name: inventoryAccount.name,
                  debit: totalInventoryDebit,
                  credit: 0
                });
              }
              if (totalTargetDebit > 0) {
                groupedLines.push({
                  code: targetAccount.code,
                  name: targetAccount.name,
                  debit: totalTargetDebit,
                  credit: 0
                });
              }
              if (totalInventoryCredit > 0) {
                groupedLines.push({
                  code: inventoryAccount.code,
                  name: inventoryAccount.name,
                  debit: 0,
                  credit: totalInventoryCredit
                });
              }
              if (totalTargetCredit > 0) {
                groupedLines.push({
                  code: targetAccount.code,
                  name: targetAccount.name,
                  debit: 0,
                  credit: totalTargetCredit
                });
              }

              const totalDebitAll = groupedLines.reduce((acc, l) => acc + l.debit, 0);
              const totalCreditAll = groupedLines.reduce((acc, l) => acc + l.credit, 0);

              return (
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-6 py-3.5 font-black text-gray-400 uppercase tracking-widest">Kode Akun</th>
                          <th className="px-6 py-3.5 font-black text-gray-400 uppercase tracking-widest">Nama Akun Jurnal</th>
                          <th className="px-6 py-3.5 font-black text-gray-400 uppercase tracking-widest text-right">Debit (Rp)</th>
                          <th className="px-6 py-3.5 font-black text-gray-400 uppercase tracking-widest text-right">Kredit (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 font-medium">
                        {groupedLines.map((line, idx) => (
                          <tr key={idx} className="hover:bg-purple-50/10">
                            <td className="px-6 py-3.5 font-black text-gray-800">{line.code}</td>
                            <td className="px-6 py-3.5 text-gray-700">{line.name}</td>
                            <td className="px-6 py-3.5 text-right font-black text-emerald-600">
                              {line.debit > 0 ? `Rp ${line.debit.toLocaleString("id-ID")}` : "-"}
                            </td>
                            <td className="px-6 py-3.5 text-right font-black text-purple-600">
                              {line.credit > 0 ? `Rp ${line.credit.toLocaleString("id-ID")}` : "-"}
                            </td>
                          </tr>
                        ))}
                        {groupedLines.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-bold uppercase tracking-wider">
                              Tidak ada selisih stok fisik vs sistem (Jurnal penyesuaian nihil).
                            </td>
                          </tr>
                        ) : (
                          <tr className="bg-gray-50/90 font-black border-t-2 border-gray-200">
                            <td colSpan={2} className="px-6 py-4 uppercase tracking-wider text-gray-900 text-right">
                              Total Jurnal Rekonsiliasi:
                            </td>
                            <td className="px-6 py-4 text-right text-emerald-600">
                              Rp {totalDebitAll.toLocaleString("id-ID")}
                            </td>
                            <td className="px-6 py-4 text-right text-purple-600">
                              Rp {totalCreditAll.toLocaleString("id-ID")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* VIEW 2: FULL-WIDTH LIST VIEW                                  */
        /* ============================================================== */
        <div className="space-y-6">
          {/* Back navigation */}
          <button 
            onClick={() => router.push("/persediaan-barang")}
            className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
          >
            <ArrowLeft size={14} /> Back to Inventory Dashboard
          </button>

          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg shadow-purple-200">
                  <RefreshCcw className="text-white animate-spin-slow" size={28} />
                </div>
                <h1 className="text-4xl font-black tracking-tight text-gray-900">
                  Stock <span className="text-purple-600">Opname</span>
                </h1>
              </div>
              <p className="text-gray-500 font-medium ml-1">
                Lakukan rekonsiliasi berkala dengan mencocokkan stok fisik dengan pencatatan sistem (Multi-vendor di MATKOM, Parent-only di PROD).
              </p>
            </div>
            
            <button
              onClick={handleOpenCreateModal}
              className="group relative flex items-center gap-3 bg-gray-900 hover:bg-purple-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-purple-200 active:scale-95 overflow-hidden"
            >
              <Plus size={20} strokeWidth={3} />
              <span>Buat Stock Opname</span>
            </button>
          </div>

          {/* Full-width Opnames Table */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari kode opname, gudang, departemen..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-purple-500/20 focus:bg-white outline-none transition-all"
                />
              </div>

              <div className="text-xs font-bold text-gray-400">
                Total: <span className="text-gray-900 font-black">{opnames.length}</span> transaksi
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">No</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Referensi / Tanggal</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Lokasi Gudang</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kategori & Departemen</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={7} className="px-6 py-4"><div className="h-10 bg-gray-50 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : opnames.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center font-bold text-gray-400 uppercase tracking-widest text-sm bg-gray-50/30">
                        Tidak Ada Data Stock Opname
                      </td>
                    </tr>
                  ) : opnames.map((sto, idx) => (
                    <tr 
                      key={sto.id} 
                      onClick={() => viewOpnameDetails(sto.id)}
                      className="cursor-pointer transition-colors group hover:bg-purple-50/30"
                    >
                      <td className="px-6 py-4 text-xs font-bold text-gray-400 text-center w-12">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-black text-gray-900 group-hover:text-purple-600 transition-colors text-sm">
                          {sto.reference}
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1"><Calendar size={10} /> {sto.date}</span>
                          {sto.department_code && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-black text-[9px]">{sto.department_code}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-bold text-gray-800 text-sm">
                          <Warehouse size={14} className="text-gray-400" />
                          <span>{sto.warehouse_name || "Semua Gudang"}</span>
                        </div>
                        <div className="text-xs font-black text-gray-400 uppercase tracking-wider">{sto.warehouse_short_name || "ALL"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-gray-700">
                          {sto.category_name || "Semua Kategori"}
                        </div>
                        <div className="text-[10px] text-gray-400 font-semibold">
                          {sto.department_name || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-500 text-xs italic truncate max-w-[220px]">{sto.note || "-"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {getStatusBadge(sto.status)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <PrintButton
                            moduleKey="stok_opname"
                            moduleName="Stok Opname"
                            data={{
                              ...sto,
                              opname_number: sto.reference || `#STO-${sto.id}`,
                              warehouse_name: sto.warehouse_name || "Semua Gudang",
                              opname_date: sto.date || "-",
                              pic_name: sto.user_name || "-",
                              status: sto.status || "Draft",
                              items: sto.items || [],
                            }}
                          />

                          {/* Edit button: Active for Draft, Disabled for Reconciled */}
                          {sto.status === "Draft" ? (
                            <button
                              onClick={(e) => handleOpenEditModal(sto, e)}
                              title="Edit Draft Opname"
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                            >
                              <Edit2 size={13} />
                            </button>
                          ) : (
                            <span
                              title="Sudah Rekonsiliasi - Tidak dapat diedit kembali"
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-300 cursor-not-allowed"
                            >
                              <Lock size={13} />
                            </span>
                          )}

                          {/* Direct View Transaction button */}
                          <button
                            onClick={() => viewOpnameDetails(sto.id)}
                            title="Tampilkan Detail Transaksi"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white transition-all shadow-sm"
                          >
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CREATE & EDIT STOCK OPNAME                              */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-5xl border border-gray-100 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 md:p-8 pb-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isEditMode ? "bg-amber-100 text-amber-600" : "bg-purple-100 text-purple-600"}`}>
                  {isEditMode ? <Edit2 size={22} /> : <Sliders size={22} />}
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-gray-900">
                    {isEditMode ? "Edit Draft Stock Opname" : "Buat Formulir Stock Opname"}
                  </h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">
                    {isEditMode 
                      ? "Perbarui hitungan fisik atau informasi draft sebelum rekonsiliasi dilakukan"
                      : "Pilih gudang & kategori (atau biarkan kosong untuk semua data), lalu sesuaikan fisik"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all active:scale-95 shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 pt-4 overflow-y-auto flex-1 space-y-6">
              <form onSubmit={handleSaveStockOpname} className="space-y-6">
              
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
                  {/* Row 1: Departemen & Jurnal */}
                  <div className="md:col-span-6 space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Departemen</label>
                    <select
                      value={stoDeptId}
                      onChange={(e) => {
                        setStoDeptId(e.target.value);
                        if (!isEditMode) fetchNextRef(e.target.value);
                      }}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 outline-none"
                    >
                      <option value="">Pilih Departemen</option>
                      {departments.map((d: any) => (
                        <option key={d.id} value={d.id.toString()}>{d.department_name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="md:col-span-6 space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Jurnal / Akun Selisih</label>
                    <select
                      value={stoCoaId}
                      onChange={(e) => setStoCoaId(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 outline-none"
                    >
                      <option value="">Pilih Jurnal (Default: 51100 Selisih Persediaan)</option>
                      {accounts.map((acc: any) => (
                        <option key={acc.id} value={acc.id.toString()}>{acc.code} - {acc.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Row 2: No Transaksi, Tgl Trn, Gudang, Kategori */}
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">No. Transaksi</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={stoReference}
                        onChange={(e) => setStoReference(e.target.value)}
                        placeholder="Auto"
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 outline-none"
                      />
                      {!isEditMode && (
                        <button
                          type="button"
                          onClick={() => fetchNextRef(stoDeptId)}
                          title="Generate Ulang Referensi"
                          className="p-3 bg-purple-50 text-purple-600 rounded-2xl hover:bg-purple-100 transition-all shrink-0"
                        >
                          <RefreshCcw size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Tgl. Transaksi</label>
                    <input
                      type="date"
                      value={stoDate}
                      onChange={(e) => setStoDate(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 outline-none"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Gudang</label>
                    <select
                      value={stoWarehouseId}
                      onChange={(e) => handleWarehouseFilterChange(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 outline-none"
                    >
                      <option value="">- Semua Gudang -</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id.toString()}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Kategori</label>
                    <select
                      value={stoCategoryId}
                      onChange={(e) => handleCategoryFilterChange(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 outline-none"
                    >
                      <option value="">- Semua Kategori -</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id.toString()}>
                          {c.category_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Row 3: Keterangan */}
                  <div className="md:col-span-12 space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Keterangan / Catatan</label>
                    <textarea
                      placeholder="Catatan / keterangan penyesuaian..."
                      value={stoNote}
                      onChange={(e) => setStoNote(e.target.value)}
                      rows={2}
                      className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-semibold focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Items Section Header with Search filter */}
                <div className="pt-2 border-t border-gray-100 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                        <span>Lembar Perhitungan Fisik</span>
                        <span className="px-2.5 py-0.5 bg-purple-50 text-purple-600 rounded-full text-[10px]">
                          {stoWarehouseId === "1" ? "Gudang MATKOM (Multi-vendor)" : stoWarehouseId ? "Gudang Terpilih" : "Semua Gudang"}
                          {stoCategoryId ? " • Filter Kategori" : " • Semua Kategori"}
                        </span>
                      </h4>
                      <p className="text-[11px] text-gray-400 font-medium">
                        Total {stoItems.length} item dimuat dari sistem. Masukkan kuantitas hasil opname fisik.
                      </p>
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        placeholder="Cari dalam lembar hitung..."
                        value={modalItemSearch}
                        onChange={(e) => setModalItemSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200/60 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500/20 focus:bg-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Items Table */}
                  {itemsLoading ? (
                    <div className="text-center py-20 bg-gray-50/50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center gap-3">
                      <RefreshCcw className="animate-spin text-purple-600" size={24} />
                      <span className="font-black text-gray-500 uppercase tracking-widest text-xs">
                        Mengambil Saldo Stok Sistem...
                      </span>
                    </div>
                  ) : stoItems.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">
                      Tidak ada data produk ditemukan untuk kriteria ini.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-gray-100 rounded-2xl max-h-[380px]">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 z-10 bg-gray-100 shadow-sm">
                          <tr className="border-b border-gray-200">
                            <th className="px-5 py-3 font-black text-gray-500 uppercase tracking-widest w-12 text-center">No</th>
                            <th className="px-5 py-3 font-black text-gray-500 uppercase tracking-widest">Kode / Part</th>
                            <th className="px-5 py-3 font-black text-gray-500 uppercase tracking-widest">Nama Produk (Vendor)</th>
                            <th className="px-5 py-3 font-black text-gray-500 uppercase tracking-widest text-center">UoM</th>
                            <th className="px-5 py-3 font-black text-gray-500 uppercase tracking-widest text-center">Stok Sistem</th>
                            <th className="px-5 py-3 font-black text-gray-500 uppercase tracking-widest text-center" style={{ width: "160px" }}>Hitungan Fisik</th>
                            <th className="px-5 py-3 font-black text-gray-500 uppercase tracking-widest text-center">Selisih</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium">
                          {filteredModalItems.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-5 py-10 text-center text-gray-400 font-bold uppercase tracking-wider">
                                Tidak ada produk yang cocok dengan pencarian &quot;{modalItemSearch}&quot;.
                              </td>
                            </tr>
                          ) : (
                            filteredModalItems.map((item, idx) => {
                              const diff = Number(item.qty_physical) - Number(item.qty_system);
                              return (
                                <tr key={`${item.product_id}_${item.supplier_id || 'null'}`} className="hover:bg-purple-50/20">
                                  <td className="px-5 py-2.5 text-center font-bold text-gray-400">{idx + 1}</td>
                                  <td className="px-5 py-2.5 font-black text-gray-800">{item.product_code}</td>
                                  <td className="px-5 py-2.5 text-gray-700">
                                    <div className="font-bold">{item.product_name}</div>
                                    {item.supplier_name && (
                                      <span className="text-[10px] text-orange-600 font-black uppercase">
                                        Vendor: {item.supplier_name}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-5 py-2.5 text-center text-gray-400 font-bold uppercase">{item.product_unit}</td>
                                  <td className="px-5 py-2.5 text-center font-black text-gray-700 bg-gray-50/50">{item.qty_system}</td>
                                  <td className="px-5 py-2">
                                    <input
                                      type="number"
                                      min={0}
                                      value={item.qty_physical}
                                      onChange={(e) => handleQtyPhysicalChange(item.product_id, item.supplier_id || null, Number(e.target.value))}
                                      required
                                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-center font-black outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                    />
                                  </td>
                                  <td className="px-5 py-2.5 text-center">
                                    <span className={`inline-block px-2.5 py-0.5 rounded-md font-black text-xs ${
                                      diff === 0 
                                        ? "text-gray-400" 
                                        : diff > 0 
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                          : "bg-red-50 text-red-600 border border-red-200"
                                    }`}>
                                      {diff > 0 ? `+${diff}` : diff}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Submit / Action buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-xs font-bold transition-all h-12"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={stoItems.length === 0 || savingSto}
                    className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all h-12 shadow-lg flex items-center gap-2 disabled:opacity-50 text-white ${
                      isEditMode 
                        ? "bg-amber-500 hover:bg-amber-600 shadow-amber-200" 
                        : "bg-purple-600 hover:bg-purple-700 shadow-purple-200"
                    }`}
                  >
                    <FileCheck size={16} /> 
                    {savingSto 
                      ? "Menyimpan..." 
                      : isEditMode 
                        ? "Simpan Perubahan Draft" 
                        : "Simpan Draft Opname"}
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
