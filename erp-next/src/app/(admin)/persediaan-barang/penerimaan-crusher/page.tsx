"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Recycle,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Boxes,
  Trash2,
  PackageCheck,
  X,
  Flame,
  FileText,
  Layers,
  Scale,
  Sparkles
} from "lucide-react";
import api from "@/lib/api";

type TabType = "transfers" | "crusher_logs";

export default function PenerimaanCrusherPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("transfers");

  // Tab 1: Transfers
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Tab 2: Crusher Logs
  const [crusherLogs, setCrusherLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsSearch, setLogsSearch] = useState("");

  // Form states
  const [products, setProducts] = useState<any[]>([]);
  const [operatorName, setOperatorName] = useState("");
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [productFilterType, setProductFilterType] = useState<"all" | "crusher" | "raw_material">("all");
  const [submitting, setSubmitting] = useState(false);

  // Fetch Transfers
  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/internal-transfers", {
        params: {
          transfer_type: "CRUSHER_TO_MATKOM",
          search
        }
      });
      setTransfers(res.data.data || []);
    } catch (err) {
      console.error("Error fetching crusher receipts:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Fetch Crusher Logs
  const fetchCrusherLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await api.express.get("/ng-disposals/crusher-logs");
      let data = res.data.data || [];
      if (logsSearch) {
        const s = logsSearch.toLowerCase();
        data = data.filter(
          (l: any) =>
            (l.original_product_name || "").toLowerCase().includes(s) ||
            (l.regrind_product_name || "").toLowerCase().includes(s) ||
            (l.wo_reference || "").toLowerCase().includes(s) ||
            (l.disposal_reference || "").toLowerCase().includes(s)
        );
      }
      setCrusherLogs(data);
    } catch (err) {
      console.error("Error fetching crusher logs:", err);
    } finally {
      setLogsLoading(false);
    }
  }, [logsSearch]);

  useEffect(() => {
    if (activeTab === "transfers") {
      fetchTransfers();
    } else {
      fetchCrusherLogs();
    }
  }, [activeTab, fetchTransfers, fetchCrusherLogs]);

  const fetchProducts = async () => {
    try {
      let res;
      try {
        res = await api.express.get("/internal-transfers/regrind-products");
      } catch {
        res = await api.express.get("/products", {
          params: { limit: 500, category_id: 18, parent_only: true }
        });
      }
      setProducts(res.data.data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  useEffect(() => {
    if (isModalOpen) {
      fetchProducts();
    }
  }, [isModalOpen]);

  const handleAddItem = (prod: any) => {
    const exists = items.some((it) => it.product_id === prod.id);
    if (exists) {
      alert("Material regrind ini sudah ada dalam daftar.");
      return;
    }
    setItems([
      ...items,
      {
        product_id: prod.id,
        product_name: prod.product_name,
        product_code: prod.product_code,
        unit: prod.product_unit || "KG",
        qty: 25,
        bag_count: 1
      }
    ]);
    setProductSearch("");
    setIsDropdownOpen(false);
  };

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert("Mohon pilih minimal 1 material hasil gilingan.");
      return;
    }
    setSubmitting(true);
    try {
      // Direct receipt into MATKOM (WH 1)
      const payload = {
        transfer_type: "CRUSHER_TO_MATKOM",
        type_code: "CRH-MAT",
        from_warehouse_id: 5, // Crusher
        to_warehouse_id: 1, // MATKOM
        transferred_by: "Operator Crusher",
        transfer_date: receiptDate,
        notes: notes || "Penerimaan hasil gilingan crusher ke gudang material",
        items: items.map((it) => ({
          product_id: it.product_id,
          qty_sent: Number(it.qty),
          package_type: "Bag / Karung Regrind",
          package_count: Number(it.bag_count),
          unit: it.unit
        }))
      };

      const res = await api.express.post("/internal-transfers", payload);
      // Auto confirm receive in MATKOM
      if (res.data.id) {
        await api.express.post(`/internal-transfers/${res.data.id}/receive`, {
          received_by: operatorName,
          received_date: receiptDate,
          notes: "Telah ditimbang & masuk stok regrind MATKOM",
          items: items.map((it) => ({ qty_received: Number(it.qty), qty_rejected: 0 }))
        });
      }

      setIsModalOpen(false);
      setItems([]);
      setNotes("");
      alert("Penerimaan material regrind dari Crusher berhasil masuk ke stok Gudang MATKOM!");
      fetchTransfers();
    } catch (err: any) {
      console.error("Error creating crusher receipt:", err);
      alert(err.message || "Gagal mencatat penerimaan regrind.");
    } finally {
      setSubmitting(false);
    }
  };

  // Stats calculation
  const totalLogsCount = crusherLogs.length;
  const totalNgPartCrushed = crusherLogs.reduce((acc, cur) => acc + (Number(cur.qty_ng_component) || 0), 0);
  const totalRegrindKg = crusherLogs.reduce((acc, cur) => acc + (Number(cur.qty_regrind_resin) || 0), 0);

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen animate-in fade-in duration-500">
      <button
        onClick={() => router.push("/persediaan-barang")}
        className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
      >
        <ArrowLeft size={14} /> Kembali ke Persediaan Barang
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-600 to-green-700 rounded-2xl shadow-lg shadow-emerald-200">
              <Recycle className="text-white" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                  No. 3 (IN)
                </span>
                <h1 className="text-3xl font-black tracking-tight text-gray-900">
                  Crusher ke MATKOM <span className="text-emerald-600">(Penerimaan Regrind)</span>
                </h1>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Penerimaan Hasil Gilingan (Regrind Resin) dari Area Crusher Masuk ke Stok Gudang MATKOM
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setReceiptDate(new Date().toISOString().split("T")[0]);
            setOperatorName("");
            setItems([]);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-gray-900 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-100 transition-all active:scale-95"
        >
          <Plus size={16} strokeWidth={3} /> Terima Hasil Gilingan
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <Boxes size={24} />
          </div>
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Total Slip Regrind
            </div>
            <div className="text-2xl font-black text-gray-900 mt-0.5">{transfers.length} Slip</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <Flame size={24} />
          </div>
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Part NG Digiling (Crusher)
            </div>
            <div className="text-2xl font-black text-purple-700 mt-0.5">
              {totalNgPartCrushed.toLocaleString()} <span className="text-xs font-bold text-gray-400">Pcs</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-50 text-green-600">
            <Scale size={24} />
          </div>
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Total Regrind Resin Masuk
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">
              {totalRegrindKg.toFixed(1)} <span className="text-xs font-bold text-gray-400">KG</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("transfers")}
          className={`pb-4 px-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all relative ${
            activeTab === "transfers"
              ? "text-emerald-600 border-b-2 border-emerald-600"
              : "text-gray-400 hover:text-gray-700"
          }`}
        >
          <Boxes size={16} />
          Penerimaan Regrind (Slip Transfer)
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 font-bold">
            {transfers.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("crusher_logs")}
          className={`pb-4 px-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all relative ${
            activeTab === "crusher_logs"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-400 hover:text-gray-700"
          }`}
        >
          <Flame size={16} />
          Hasil Gilingan NG (Crusher Logs & WO Link)
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-purple-50 text-purple-700 font-bold">
            {totalLogsCount}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: SLIP PENERIMAAN REGRIND */}
      {/* ======================================================== */}
      {activeTab === "transfers" && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari slip penerimaan regrind..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">No. Penerimaan / Tanggal</th>
                    <th className="px-6 py-4">Material Regrind</th>
                    <th className="px-6 py-4">Petugas Penimbang MATKOM</th>
                    <th className="px-6 py-4 text-center">Status Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={4} className="px-6 py-6">
                          <div className="h-8 bg-gray-100 rounded-xl w-full"></div>
                        </td>
                      </tr>
                    ))
                  ) : transfers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                        Belum ada catatan penerimaan material regrind dari Crusher.
                      </td>
                    </tr>
                  ) : (
                    transfers.map((trf) => (
                      <tr key={trf.id} className="hover:bg-emerald-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-black text-gray-900 text-sm group-hover:text-emerald-600 transition-colors">
                            {trf.reference_no}
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold mt-0.5 flex items-center gap-1">
                            <Calendar size={10} /> {trf.transfer_date}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {trf.items?.map((it: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="font-extrabold text-gray-800">{it.product_name}</span>
                                <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                                  {it.qty_received || it.qty_sent} {it.unit || "KG"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700 font-semibold">{trf.received_by || trf.transferred_by}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle2 size={10} /> Masuk Stok MATKOM
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CRUSHER LOGS & WO LINK */}
      {/* ======================================================== */}
      {activeTab === "crusher_logs" && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari part asal, produk regrind, nomor WO, atau referensi..."
                value={logsSearch}
                onChange={(e) => setLogsSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Tanggal / Ref Disposal</th>
                    <th className="px-6 py-4">Part Asal (WIP NG)</th>
                    <th className="px-6 py-4">WO Asal</th>
                    <th className="px-6 py-4 text-center">Part NG Digiling</th>
                    <th className="px-6 py-4">Produk Regrind Hasil</th>
                    <th className="px-6 py-4 text-center">Qty Regrind Resin</th>
                    <th className="px-6 py-4 text-center">Status Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {logsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={7} className="px-6 py-6">
                          <div className="h-8 bg-gray-100 rounded-xl w-full"></div>
                        </td>
                      </tr>
                    ))
                  ) : crusherLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                        Belum ada log penggilingan part NG dari Crusher.
                      </td>
                    </tr>
                  ) : (
                    crusherLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-purple-50/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-black text-gray-900 text-sm group-hover:text-purple-600 transition-colors">
                            {log.disposal_reference || `CRH-LOG-${log.id}`}
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold mt-0.5 flex items-center gap-1">
                            <Calendar size={10} /> {log.created_at?.split("T")[0]}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-extrabold text-gray-800">{log.original_product_name || "Part WIP"}</div>
                          <div className="text-[10px] text-gray-400 font-bold">{log.original_product_code}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-purple-50 text-purple-700 inline-flex items-center gap-1 border border-purple-200">
                            <FileText size={12} /> {log.wo_reference || "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-black text-red-600 text-base">{log.qty_ng_component}</span>
                          <span className="text-[10px] text-gray-400 font-bold ml-1">Pcs</span>
                        </td>
                        <td className="px-6 py-4">
                          {log.regrind_product_name ? (
                            <div>
                              <div className="font-extrabold text-emerald-700">{log.regrind_product_name}</div>
                              <div className="text-[10px] text-gray-400 font-bold">{log.regrind_product_code}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400 font-bold">Regrind Resin General</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-black text-emerald-700 text-base">
                            {Number(log.qty_regrind_resin || 0).toFixed(1)}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold ml-1">KG</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle2 size={10} /> Masuk Stok MATKOM
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Terima Hasil Gilingan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl border border-gray-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-4 border-b border-gray-100 flex justify-between items-center shrink-0 bg-emerald-50/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
                  <Recycle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Penerimaan Regrind dari Crusher ke MATKOM</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">
                    Catat hasil gilingan resin yang masuk kembali sebagai bahan daur ulang
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-white text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateReceipt} className="p-8 pt-4 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tanggal Terima</label>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    Petugas Penerima MATKOM
                  </label>
                  <input
                    type="text"
                    placeholder="Nama petugas gudang"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Product search */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  Pilih Material Regrind
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Ketik nama regrind resin..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-[300px] overflow-hidden flex flex-col">
                    {/* Filter Category Tabs */}
                    <div className="p-2 border-b border-gray-100 flex items-center gap-1 bg-gray-50/80 text-[11px] font-bold shrink-0">
                      <button
                        type="button"
                        onClick={() => setProductFilterType("all")}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          productFilterType === "all"
                            ? "bg-gray-900 text-white shadow-sm"
                            : "text-gray-500 hover:bg-gray-200/60"
                        }`}
                      >
                        Semua ({products.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductFilterType("crusher")}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                          productFilterType === "crusher"
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-purple-700 hover:bg-purple-50"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                        Crusher ({products.filter((p) => p.product_type === "Crusher" || p.product_name?.toLowerCase().includes("crush")).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductFilterType("raw_material")}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                          productFilterType === "raw_material"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        Raw Material ({products.filter((p) => p.product_type !== "Crusher" && !p.product_name?.toLowerCase().includes("crush")).length})
                      </button>
                    </div>

                    <div className="overflow-y-auto max-h-[240px]">
                      {(() => {
                        const isCrusher = (p: any) =>
                          p.product_type === "Crusher" || p.product_name?.toLowerCase().includes("crush");
                        const filtered = products
                          .filter((p) => {
                            if (productFilterType === "crusher") return isCrusher(p);
                            if (productFilterType === "raw_material") return !isCrusher(p);
                            return true;
                          })
                          .filter(
                            (p) =>
                              !productSearch ||
                              p.product_name?.toLowerCase().includes(productSearch.toLowerCase()) ||
                              p.product_code?.toLowerCase().includes(productSearch.toLowerCase())
                          );

                        if (products.length === 0) {
                          return (
                            <div className="p-4 text-center text-xs text-gray-400 font-bold">
                              Memuat daftar material regrind...
                            </div>
                          );
                        }
                        if (filtered.length === 0) {
                          return (
                            <div className="p-4 text-center text-xs text-gray-400 font-bold">
                              Tidak ada material yang cocok
                            </div>
                          );
                        }
                        return filtered.map((p) => {
                          const isCrush = isCrusher(p);
                          return (
                            <div
                              key={p.id}
                              onClick={() => handleAddItem(p)}
                              className={`p-3 cursor-pointer flex justify-between items-center text-xs border-b border-gray-50 transition-colors ${
                                isCrush ? "hover:bg-purple-50/60 bg-purple-50/10" : "hover:bg-emerald-50/60"
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-gray-900">{p.product_name}</p>
                                  {isCrush ? (
                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                                      Crusher
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                                      Raw Material
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold mt-0.5">{p.product_code}</p>
                              </div>
                              <span className="text-[10px] font-black px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                                {p.product_unit || "KG"}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase">
                      <th className="px-4 py-3">Material Regrind</th>
                      <th className="px-4 py-3 text-center" style={{ width: "130px" }}>
                        Berat (KG)
                      </th>
                      <th className="px-4 py-3 text-center" style={{ width: "120px" }}>
                        Jumlah Karung
                      </th>
                      <th className="px-4 py-3 text-center" style={{ width: "50px" }}>
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-400 font-bold">
                          Belum ada material regrind dipilih.
                        </td>
                      </tr>
                    ) : (
                      items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3">
                            <p className="font-extrabold text-gray-900">{it.product_name}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{it.product_code}</p>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min={0.1}
                              step={0.1}
                              value={it.qty}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].qty = Number(e.target.value);
                                setItems(newItems);
                              }}
                              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-center font-black outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min={1}
                              value={it.bag_count}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].bag_count = Number(e.target.value);
                                setItems(newItems);
                              }}
                              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setItems(items.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || items.length === 0}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-200 hover:bg-emerald-700 flex items-center gap-2"
                >
                  <PackageCheck size={14} /> {submitting ? "Menyimpan..." : "Konfirmasi Masuk Gudang MATKOM"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
