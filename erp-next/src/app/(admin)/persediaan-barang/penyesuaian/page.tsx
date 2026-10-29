"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCcw,
  Plus,
  Search,
  Calendar,
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
  TrendingUp,
  TrendingDown,
  Trash2,
  Check,
  Notebook,
  X
} from "lucide-react";
import api from "@/lib/api";
import PrintButton from "@/components/ui/PrintButton";

export default function StockAdjustmentPage() {
  const router = useRouter();
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<any | null>(null);

  // New Adjustment Form State
  const [adjDate, setAdjDate] = useState(new Date().toISOString().split("T")[0]);
  const [adjNote, setAdjNote] = useState("");
  const [adjItems, setAdjItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("1");
  
  // Master Products for selection
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

  useEffect(() => {
    fetchAdjustments();
    fetchWarehouses();
  }, [search]);

  useEffect(() => {
    if (isCreateModalOpen) {
      fetchProducts();
    }
  }, [isCreateModalOpen]);

  const fetchWarehouses = async () => {
    try {
      const res = await api.express.get("/warehouses");
      const list = res.data.data || [];
      setWarehouses(list);
      if (list.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(String(list[0].id));
      }
    } catch (err) {
      console.error("Error fetching warehouses:", err);
    }
  };

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/adjustments", {
        params: { search }
      });
      setAdjustments(res.data.data || []);
    } catch (err) {
      console.error("Error fetching stock adjustments:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      // Get products with a high limit to allow quick local search in dropdown
      const res = await api.express.get("/products", {
        params: { limit: 1000 }
      });
      setProducts(res.data.data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setProductsLoading(false);
    }
  };

  const viewAdjustmentDetails = async (id: number) => {
    try {
      const res = await api.express.get(`/adjustments/${id}`);
      setSelectedAdjustment(res.data.data);
    } catch (err) {
      console.error("Error loading adjustment details:", err);
    }
  };

  const handleAddProduct = (product: any) => {
    // Avoid duplicate additions
    const exists = adjItems.some(item => item.product_id === product.id);
    if (exists) {
      alert("Produk ini sudah ada di dalam daftar penyesuaian.");
      return;
    }

    const whLoc = product.locations?.find((l: any) => String(l.warehouse_id) === String(selectedWarehouseId));
    const currentWhStock = whLoc ? Number(whLoc.stock) : Number(product.product_quantity || 0);

    setAdjItems([
      ...adjItems,
      {
        product_id: product.id,
        product_name: product.product_name,
        product_code: product.product_code,
        product_unit: product.product_unit || "PCS",
        warehouse_id: Number(selectedWarehouseId),
        qty_system: currentWhStock,
        quantity: 1,
        type: "addition" // default type is addition
      }
    ]);

    setProductSearch("");
    setIsProductDropdownOpen(false);
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...adjItems];
    updated.splice(index, 1);
    setAdjItems(updated);
  };

  const handleItemPropChange = (index: number, prop: string, value: any) => {
    const updated = [...adjItems];
    updated[index][prop] = value;
    setAdjItems(updated);
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adjItems.length === 0) {
      alert("Mohon tambahkan minimal satu produk untuk disesuaikan.");
      return;
    }

    // Verify quantity values are positive
    const hasInvalidQty = adjItems.some(item => Number(item.quantity) <= 0);
    if (hasInvalidQty) {
      alert("Jumlah penyesuaian harus lebih besar dari 0.");
      return;
    }

    try {
      const payload = {
        date: adjDate,
        note: adjNote,
        warehouse_id: Number(selectedWarehouseId),
        items: adjItems.map(item => ({
          product_id: item.product_id,
          warehouse_id: Number(item.warehouse_id || selectedWarehouseId),
          quantity: Number(item.quantity),
          type: item.type
        }))
      };

      await api.express.post("/adjustments", payload);

      setIsCreateModalOpen(false);
      // Reset form
      setAdjNote("");
      setAdjItems([]);
      fetchAdjustments();
      fetchProducts();
      alert("Penyesuaian stok berhasil disimpan dan stok gudang telah diperbarui!");
    } catch (err: any) {
      console.error("Error creating stock adjustment:", err);
      alert(err.message || "Gagal membuat penyesuaian stok");
    }
  };

  // Filter products for dropdown
  const filteredProducts = products.filter(p => {
    const nameMatch = p.product_name?.toLowerCase().includes(productSearch.toLowerCase());
    const codeMatch = p.product_code?.toLowerCase().includes(productSearch.toLowerCase());
    return nameMatch || codeMatch;
  }).slice(0, 10); // show top 10 matches for neatness

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen animate-in fade-in duration-500">
      
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
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl shadow-lg shadow-indigo-200">
              <RefreshCcw className="text-white animate-spin-slow" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Penyesuaian <span className="text-indigo-600">Stok</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Catat penyesuaian saldo produk secara instan. Menambah (Addition) atau mengurangi (Subtraction) kuantitas persediaan global dan sinkronisasi otomatis ke Gudang Utama.
          </p>
        </div>
        
        <button
          onClick={() => {
            setAdjDate(new Date().toISOString().split("T")[0]);
            setAdjNote("");
            setAdjItems([]);
            setIsCreateModalOpen(true);
          }}
          className="group relative flex items-center gap-3 bg-gray-900 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-indigo-200 active:scale-95 overflow-hidden"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Buat Penyesuaian</span>
        </button>
      </div>

      {/* Main Content Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Adjustments Master List Table */}
        <div className={`bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[500px] flex flex-col transition-all duration-300 ${selectedAdjustment ? "lg:col-span-6" : "lg:col-span-12"}`}>
          <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari referensi penyesuaian atau catatan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Referensi / Tanggal</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan Catatan</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={4} className="px-6 py-4"><div className="h-10 bg-gray-50 rounded-xl w-full"></div></td>
                    </tr>
                  ))
                ) : adjustments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center font-bold text-gray-400 uppercase tracking-widest text-sm bg-gray-50/30">
                      Tidak Ada Data Penyesuaian Stok
                    </td>
                  </tr>
                ) : adjustments.map((adj) => (
                  <tr 
                    key={adj.id} 
                    onClick={() => viewAdjustmentDetails(adj.id)}
                    className={`cursor-pointer transition-colors group ${selectedAdjustment?.id === adj.id ? "bg-indigo-50/40 hover:bg-indigo-50/60" : "hover:bg-gray-50/60"}`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors text-sm">{adj.reference}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                        <Calendar size={10} /> {adj.date}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-700 text-xs font-semibold max-w-[300px] truncate">{adj.note || "-"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-max">
                          <CheckCircle2 size={10} /> Approved & Realized
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <PrintButton
                          moduleKey="penyesuaian_stok"
                          moduleName="Penyesuaian Stok"
                          data={{
                            ...adj,
                            adjustment_number: adj.reference || `#ADJ-${adj.id}`,
                            warehouse_name: adj.warehouse_name || "-",
                            date: adj.date || "-",
                            reason: adj.note || "Penyesuaian Stok",
                            status: "Approved",
                            items: adj.details || [],
                          }}
                        />
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-indigo-600 hover:text-white transition-all">
                          <ArrowRight size={14} />
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Adjustment Detail Sidebar */}
        {selectedAdjustment && (
          <div className="lg:col-span-6 bg-white border border-gray-100 rounded-3xl shadow-sm p-6 space-y-8 animate-in slide-in-from-right duration-300">
            
            {/* Header Info */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-6 gap-4">
              <div>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-600 text-[9px] font-black rounded-full uppercase tracking-wider">
                  Detail Mutasi Penyesuaian
                </span>
                <h2 className="text-2xl font-black text-gray-900 mt-2">{selectedAdjustment.reference}</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                  <Calendar size={12} /> Realized on {selectedAdjustment.date}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <PrintButton
                  moduleKey="penyesuaian_stok"
                  moduleName="Penyesuaian Stok"
                  data={{
                    ...selectedAdjustment,
                    adjustment_number: selectedAdjustment.reference || `#ADJ-${selectedAdjustment.id}`,
                    warehouse_name: selectedAdjustment.warehouse_name || "-",
                    date: selectedAdjustment.date || "-",
                    reason: selectedAdjustment.note || "Penyesuaian Stok",
                    status: "Approved",
                    items: selectedAdjustment.details || [],
                  }}
                />
                <button 
                  onClick={() => setSelectedAdjustment(null)}
                  className="px-3 py-1 bg-gray-100 text-gray-400 hover:bg-gray-200 rounded-lg text-xs font-bold transition-all"
                >
                  Tutup [X]
                </button>
              </div>
            </div>

            {/* Note */}
            {selectedAdjustment.note && (
              <div className="bg-indigo-50/30 border border-indigo-100/50 p-4 rounded-2xl">
                <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">Catatan Penyesuaian</p>
                <p className="text-sm font-medium text-gray-700 mt-1">{selectedAdjustment.note}</p>
              </div>
            )}

            {/* Reconciliation items list */}
            <div className="space-y-4">
              <h3 className="font-black text-gray-800 uppercase tracking-wider text-xs border-b border-gray-100 pb-2">
                Daftar Produk yang Disesuaikan
              </h3>

              <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2">
                {selectedAdjustment.details?.map((item: any) => {
                  const isAddition = item.type === "addition";

                  return (
                    <div key={item.id} className="border border-gray-100 p-4 rounded-2xl space-y-2 hover:border-gray-200 transition-colors">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-gray-700 text-sm">{item.product_name}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{item.product_code}</p>
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-[8px] font-black rounded-md uppercase tracking-wider mt-1">
                            UoM: {item.product_unit}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            isAddition ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                          }`}>
                            {isAddition ? "Penambahan" : "Pengurangan"}
                          </div>

                          <div className={`px-4 py-2 rounded-xl text-sm font-black min-w-[70px] text-center ${
                            isAddition 
                              ? "bg-emerald-50 text-emerald-600" 
                              : "bg-red-50 text-red-600"
                          }`}>
                            {isAddition ? "+" : "-"}{item.quantity}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* MODAL: CREATE PENYESUAIAN STOK */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl border border-gray-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-8 pb-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Buat Penyesuaian Stok Baru</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">Catat penambahan atau pengurangan stok secara manual</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all active:scale-95 shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 pt-4 overflow-y-auto flex-1 space-y-6">
              <form onSubmit={handleCreateAdjustment} className="space-y-6">
              
              {/* Form Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tanggal Mutasi</label>
                  <input
                    type="date"
                    value={adjDate}
                    onChange={(e) => setAdjDate(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Gudang Target</label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => {
                      const newWhId = e.target.value;
                      setSelectedWarehouseId(newWhId);
                      setAdjItems(prev => prev.map(it => {
                        const p = products.find(prod => prod.id === it.product_id);
                        const whLoc = p?.locations?.find((l: any) => String(l.warehouse_id) === String(newWhId));
                        return {
                          ...it,
                          warehouse_id: Number(newWhId),
                          qty_system: whLoc ? Number(whLoc.stock) : Number(p?.product_quantity || 0)
                        };
                      }));
                    }}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all h-12 cursor-pointer"
                  >
                    {warehouses.map((w: any) => (
                      <option key={w.id} value={w.id}>
                        {w.code} - {w.name} ({w.short_name || w.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Catatan / Alasan Penyesuaian</label>
                  <input
                    type="text"
                    placeholder="Contoh: Penyesuaian stok produk rusak / selisih barang masuk"
                    value={adjNote}
                    onChange={(e) => setAdjNote(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all h-12"
                  />
                </div>

              </div>

              {/* Product Picker Dropdown Search */}
              <div className="space-y-2 relative">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Pilih Produk Untuk Disesuaikan</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Ketik nama atau kode produk untuk memfilter..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setIsProductDropdownOpen(true);
                    }}
                    onFocus={() => setIsProductDropdownOpen(true)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all h-12"
                  />
                </div>

                {/* Dropdown Options */}
                {isProductDropdownOpen && (
                  <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-[300px] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                    {productsLoading ? (
                      <div className="p-4 text-center text-xs font-bold text-gray-400 animate-pulse">MEMUAT PRODUK...</div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-xs font-bold text-gray-400">PRODUK TIDAK DITEMUKAN</div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {filteredProducts.map((p) => {
                          const isAlreadyAdded = adjItems.some(item => item.product_id === p.id);
                          const whLoc = p.locations?.find((l: any) => String(l.warehouse_id) === String(selectedWarehouseId));
                          const currentWhStock = whLoc ? Number(whLoc.stock) : Number(p.product_quantity || 0);
                          return (
                            <div
                              key={p.id}
                              onClick={() => !isAlreadyAdded && handleAddProduct(p)}
                              className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${
                                isAlreadyAdded ? "bg-gray-50 cursor-not-allowed opacity-50" : "hover:bg-indigo-50/30"
                              }`}
                            >
                              <div>
                                <p className="font-extrabold text-sm text-gray-800">{p.product_name}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.product_code}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-black text-gray-700">Stok Gudang: {currentWhStock} {p.product_unit || "PCS"}</p>
                                {isAlreadyAdded && (
                                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider flex items-center gap-1 justify-end mt-0.5">
                                    <Check size={10} /> Sudah Ditambahkan
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Items Table List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                    Daftar Item Penyesuaian
                  </h4>
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black rounded-full uppercase tracking-wider">
                    Total: {adjItems.length} Produk
                  </span>
                </div>

                {adjItems.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-gray-200 rounded-3xl text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50 flex flex-col items-center justify-center gap-3">
                    <Notebook size={32} className="text-gray-300 animate-bounce-subtle" />
                    <span>Belum ada produk ditambahkan. Cari produk di atas untuk memulai penyesuaian.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-100 rounded-2xl max-h-[350px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-6 py-3 font-black text-gray-400 uppercase tracking-widest">Produk</th>
                          <th className="px-6 py-3 font-black text-gray-400 uppercase tracking-widest text-center">Stok Sistem</th>
                          <th className="px-6 py-3 font-black text-gray-400 uppercase tracking-widest text-center" style={{ width: "200px" }}>Tipe Penyesuaian</th>
                          <th className="px-6 py-3 font-black text-gray-400 uppercase tracking-widest text-center" style={{ width: "120px" }}>Jumlah</th>
                          <th className="px-6 py-3 font-black text-gray-400 uppercase tracking-widest text-center">Hapus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 font-medium">
                        {adjItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-indigo-50/10">
                            <td className="px-6 py-3">
                              <p className="font-extrabold text-gray-900 text-sm">{item.product_name}</p>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{item.product_code}</p>
                            </td>
                            <td className="px-6 py-3 text-center font-bold text-gray-500">
                              {item.qty_system} {item.product_unit}
                            </td>
                            <td className="px-6 py-2 text-center">
                              <div className="inline-flex p-0.5 bg-gray-100 rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => handleItemPropChange(idx, "type", "addition")}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                    item.type === "addition" 
                                      ? "bg-emerald-600 text-white shadow-sm" 
                                      : "text-gray-400 hover:text-gray-600"
                                  }`}
                                >
                                  <TrendingUp size={10} /> Tambah
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleItemPropChange(idx, "type", "subtraction")}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                    item.type === "subtraction" 
                                      ? "bg-red-600 text-white shadow-sm" 
                                      : "text-gray-400 hover:text-gray-600"
                                  }`}
                                >
                                  <TrendingDown size={10} /> Kurang
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-2">
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => handleItemPropChange(idx, "quantity", Number(e.target.value))}
                                required
                                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-center font-black outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                              />
                            </td>
                            <td className="px-6 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center mx-auto"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Submit / Action buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-xs font-bold transition-all h-12"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adjItems.length === 0}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all h-12 shadow-lg shadow-indigo-100 flex items-center gap-2 disabled:opacity-50"
                >
                  <FileCheck size={14} /> Simpan Penyesuaian
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
