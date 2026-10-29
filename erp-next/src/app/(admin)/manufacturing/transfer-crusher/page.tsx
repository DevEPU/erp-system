"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Cog,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Trash2,
  Send,
  Flame,
  X,
  AlertTriangle,
  FileText,
  Boxes,
  RotateCcw,
  Layers,
  ArrowRight,
  ShieldAlert,
  ChevronRight
} from "lucide-react";
import api from "@/lib/api";

type TabType = "runner" | "ng_production";

export default function TransferCrusherPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("runner");

  // Tab 1: Runner & Sprue
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Tab 2: NG WIP from Production
  const [ngTransfers, setNgTransfers] = useState<any[]>([]);
  const [ngLoading, setNgLoading] = useState(true);
  const [ngSearch, setNgSearch] = useState("");
  const [isNgModalOpen, setIsNgModalOpen] = useState(false);
  const [availableNgList, setAvailableNgList] = useState<any[]>([]);
  const [selectedNgItem, setSelectedNgItem] = useState<any | null>(null);
  const [ngQty, setNgQty] = useState<number>(0);
  const [ngAction, setNgAction] = useState<"Sent_To_Crusher" | "Disposed">("Sent_To_Crusher");
  const [ngReason, setNgReason] = useState("");
  const [ngNotes, setNgNotes] = useState("");
  const [ngSubmitting, setNgSubmitting] = useState(false);

  // Form states for Runner & Sprue
  const [products, setProducts] = useState<any[]>([]);
  const [operatorName, setOperatorName] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [productFilterType, setProductFilterType] = useState<"all" | "crusher" | "raw_material">("all");
  const [submitting, setSubmitting] = useState(false);

  // Fetch Runner Transfers
  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/internal-transfers", {
        params: {
          transfer_type: "PROD_TO_CRUSHER",
          search
        }
      });
      setTransfers(res.data.data || []);
    } catch (err) {
      console.error("Error fetching transfers to Crusher:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Fetch NG Transfers (link WO)
  const fetchNgTransfers = useCallback(async () => {
    setNgLoading(true);
    try {
      const res = await api.express.get("/ng-disposals", {
        params: {
          source_type: "Production",
          search: ngSearch,
          limit: 100
        }
      });
      setNgTransfers(res.data.data || []);
    } catch (err) {
      console.error("Error fetching NG transfers to Crusher:", err);
    } finally {
      setNgLoading(false);
    }
  }, [ngSearch]);

  // Fetch Available NG from Production
  const fetchAvailableNg = async () => {
    try {
      const res = await api.express.get("/ng-disposals/available-production-ng");
      setAvailableNgList(res.data.data || []);
    } catch (err) {
      console.error("Error fetching available NG outputs:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "runner") {
      fetchTransfers();
    } else {
      fetchNgTransfers();
    }
  }, [activeTab, fetchTransfers, fetchNgTransfers]);

  const fetchProducts = async (searchTerm = "") => {
    try {
      // Use dedicated endpoint that returns all Raw Material products without userScope restriction
      const res = await api.express.get("/internal-transfers/regrind-products", {
        params: searchTerm ? { search: searchTerm } : {}
      });
      setProducts(res.data.data || []);
    } catch (err) {
      console.error("Error fetching regrind products:", err);
    }
  };

  useEffect(() => {
    if (isModalOpen) {
      fetchProducts();
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (isNgModalOpen) {
      fetchAvailableNg();
      setSelectedNgItem(null);
      setNgQty(0);
      setNgReason("");
      setNgNotes("");
    }
  }, [isNgModalOpen]);

  const handleAddItem = (prod: any) => {
    const exists = items.some((it) => it.product_id === prod.id);
    if (exists) {
      alert("Material ini sudah ada dalam daftar.");
      return;
    }
    setItems([
      ...items,
      {
        product_id: prod.id,
        product_name: prod.product_name,
        product_code: prod.product_code,
        unit: prod.product_unit || "KG",
        qty_sent: 5,
        scrap_type: "Runner / Sprue"
      }
    ]);
    setProductSearch("");
    setIsDropdownOpen(false);
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert("Mohon pilih minimal 1 item runner/scrap.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        transfer_type: "PROD_TO_CRUSHER",
        type_code: "PRD-CRH",
        from_warehouse_id: 2, // Produksi
        to_warehouse_id: 5, // Crusher
        transferred_by: operatorName,
        transfer_date: transferDate,
        notes: notes || "Pengiriman runner, sprue, dan part NG ke area Crusher",
        items: items.map((it) => ({
          product_id: it.product_id,
          qty_sent: Number(it.qty_sent),
          package_type: it.scrap_type,
          unit: it.unit
        }))
      };
      await api.express.post("/internal-transfers", payload);
      setIsModalOpen(false);
      setItems([]);
      setNotes("");
      alert("Slip transfer runner & part NG ke area Crusher berhasil dibuat!");
      fetchTransfers();
    } catch (err: any) {
      console.error("Error creating transfer to crusher:", err);
      alert(err.message || "Gagal membuat transfer ke Crusher.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectNgItem = (item: any) => {
    setSelectedNgItem(item);
    setNgQty(Number(item.remaining_ng) || 0);
    setNgReason(item.ng_type ? `Reject Produksi (${item.ng_type})` : "Part Reject WIP Produksi");
  };

  const handleCreateNgTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNgItem) {
      alert("Pilih batch NG dari hasil produksi terlebih dahulu.");
      return;
    }
    if (ngQty <= 0 || ngQty > selectedNgItem.remaining_ng) {
      alert(`Qty harus antara 1 sampai ${selectedNgItem.remaining_ng}.`);
      return;
    }

    setNgSubmitting(true);
    try {
      const payload = {
        production_output_id: selectedNgItem.production_output_id,
        work_order_id: selectedNgItem.wo_id,
        product_id: selectedNgItem.product_id,
        qty: Number(ngQty),
        reason: ngReason,
        action_taken: ngAction,
        notes: ngNotes || `Transfer NG WIP dari WO: ${selectedNgItem.wo_reference || "-"}`
      };

      await api.express.post("/ng-disposals/from-production", payload);
      alert(
        ngAction === "Sent_To_Crusher"
          ? "Slip transfer Part NG ke Gudang Crusher berhasil dibuat dan terhubung ke WO!"
          : "Part NG berhasil dicatat sebagai Disposal!"
      );
      setIsNgModalOpen(false);
      fetchNgTransfers();
    } catch (err: any) {
      console.error("Error creating NG transfer:", err);
      alert(err.response?.data?.message || err.message || "Gagal membuat transfer NG.");
    } finally {
      setNgSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/manufacturing")}
          className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
        >
          <ArrowLeft size={14} /> Kembali ke Manufaktur
        </button>

        <button
          onClick={() => router.push("/manufacturing/ng-disposal")}
          className="flex items-center gap-2 text-xs font-black text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-all uppercase tracking-wider"
        >
          <AlertTriangle size={14} /> Buka Menu Penanganan NG & Disposal <ChevronRight size={14} />
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl shadow-lg shadow-purple-200">
              <Cog className="text-white" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700">
                  No. 9 (OUT)
                </span>
                <h1 className="text-3xl font-black tracking-tight text-gray-900">
                  Produksi ke Crusher <span className="text-purple-600">(Transfer Out)</span>
                </h1>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Kirim Runner, Sprue, dan Part NG (WIP) terverifikasi dari WO ke Area Crusher untuk Digiling Ulang
              </p>
            </div>
          </div>
        </div>

        {activeTab === "runner" ? (
          <button
            onClick={() => {
              setTransferDate(new Date().toISOString().split("T")[0]);
              setOperatorName("");
              setItems([]);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-gray-900 hover:bg-purple-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-100 transition-all active:scale-95"
          >
            <Plus size={16} strokeWidth={3} /> Buat Transfer Runner / Scrap
          </button>
        ) : (
          <button
            onClick={() => setIsNgModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-red-100 transition-all active:scale-95"
          >
            <Flame size={16} strokeWidth={3} /> Transfer Part NG ke Crusher (Link WO)
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("runner")}
          className={`pb-4 px-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all relative ${
            activeTab === "runner"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-400 hover:text-gray-700"
          }`}
        >
          <Layers size={16} />
          Runner & Sprue (Standar)
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600 font-bold">
            {transfers.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("ng_production")}
          className={`pb-4 px-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all relative ${
            activeTab === "ng_production"
              ? "text-red-600 border-b-2 border-red-600"
              : "text-gray-400 hover:text-gray-700"
          }`}
        >
          <Flame size={16} />
          Part NG dari Produksi (Link WO)
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-red-100 text-red-600 font-bold">
            {ngTransfers.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: RUNNER & SPRUE */}
      {/* ======================================================== */}
      {activeTab === "runner" && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari slip transfer runner / scrap..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">No. Dokumen / Tanggal</th>
                    <th className="px-6 py-4">Runner / Scrap Material</th>
                    <th className="px-6 py-4">Operator Penyerah</th>
                    <th className="px-6 py-4 text-center">Status Crusher</th>
                    <th className="px-6 py-4 text-center">Petugas Crusher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="px-6 py-6">
                          <div className="h-8 bg-gray-100 rounded-xl w-full"></div>
                        </td>
                      </tr>
                    ))
                  ) : transfers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                        Belum ada transfer runner / scrap ke area Crusher.
                      </td>
                    </tr>
                  ) : (
                    transfers.map((trf) => (
                      <tr key={trf.id} className="hover:bg-purple-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-black text-gray-900 text-sm group-hover:text-purple-600 transition-colors">
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
                                <span className="text-[10px] font-black px-2 py-0.5 bg-purple-50 text-purple-700 rounded">
                                  {it.qty_sent} {it.unit || "KG"}
                                </span>
                                {it.package_type && (
                                  <span className="text-[10px] font-bold text-gray-400">({it.package_type})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700 font-semibold">{trf.transferred_by || "Operator Produksi"}</td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                              trf.status === "Received"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                : "bg-amber-50 text-amber-600 border border-amber-200 animate-pulse"
                            }`}
                          >
                            {trf.status === "Received" ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                            {trf.status === "Received" ? "Diterima di Crusher" : "Proses Kirim"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-gray-600">{trf.received_by || "-"}</td>
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
      {/* TAB 2: PART NG DARI PRODUKSI (LINK WO) */}
      {/* ======================================================== */}
      {activeTab === "ng_production" && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari part NG, nomor WO, atau kode produk..."
                value={ngSearch}
                onChange={(e) => setNgSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Referensi / Tanggal</th>
                    <th className="px-6 py-4">Part WIP NG</th>
                    <th className="px-6 py-4">Work Order (WO) Asal</th>
                    <th className="px-6 py-4 text-center">Jumlah NG</th>
                    <th className="px-6 py-4">Tindakan</th>
                    <th className="px-6 py-4 text-center">Status Crusher</th>
                    <th className="px-6 py-4">Hasil Regrind</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {ngLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={7} className="px-6 py-6">
                          <div className="h-8 bg-gray-100 rounded-xl w-full"></div>
                        </td>
                      </tr>
                    ))
                  ) : ngTransfers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                        Belum ada catatan transfer part NG dari Produksi ke Crusher.
                      </td>
                    </tr>
                  ) : (
                    ngTransfers.map((item) => (
                      <tr key={item.id} className="hover:bg-red-50/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-black text-gray-900 text-sm group-hover:text-red-600 transition-colors">
                            {item.reference_no}
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold mt-0.5 flex items-center gap-1">
                            <Calendar size={10} /> {item.processed_date || item.created_at?.split("T")[0]}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-extrabold text-gray-800">{item.product_name}</div>
                          <div className="text-[10px] text-gray-400 font-bold">{item.product_code}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-purple-50 text-purple-700 inline-flex items-center gap-1 border border-purple-200">
                            <FileText size={12} /> {item.wo_reference || "WO Produksi"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-black text-red-600 text-base">{item.qty}</span>
                          <span className="text-[10px] text-gray-400 font-bold ml-1">Pcs</span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 border ${
                              item.action_taken === "Sent_To_Crusher"
                                ? "bg-purple-50 text-purple-600 border-purple-200"
                                : "bg-red-50 text-red-600 border-red-200"
                            }`}
                          >
                            {item.action_taken === "Sent_To_Crusher" ? <Flame size={10} /> : <Trash2 size={10} />}
                            {item.action_taken === "Sent_To_Crusher" ? "Kirim ke Crusher" : "Disposal"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 border ${
                              item.status === "Completed"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                : item.status === "In_Progress"
                                ? "bg-blue-50 text-blue-600 border-blue-200"
                                : "bg-amber-50 text-amber-600 border-amber-200"
                            }`}
                          >
                            {item.status === "Completed" ? (
                              <CheckCircle2 size={10} />
                            ) : (
                              <RotateCcw size={10} className="animate-spin" />
                            )}
                            {item.status === "Completed"
                              ? "Selesai Digiling"
                              : item.status === "In_Progress"
                              ? "Proses Crusher"
                              : "Menunggu Crusher"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {item.regrind_product_name ? (
                            <div>
                              <div className="font-bold text-purple-700">{item.regrind_product_name}</div>
                              <div className="text-[10px] text-gray-400 font-bold">{item.regrind_product_code}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400 font-bold">-</span>
                          )}
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
      {/* MODAL 1: TRANSFER RUNNER & SPRUE */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl border border-gray-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-4 border-b border-gray-100 flex justify-between items-center shrink-0 bg-purple-50/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-200">
                  <Cog size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Transfer Runner / Scrap ke Crusher</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">
                    Kirim material runner dan part reject untuk digiling di Crusher
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-white text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="p-8 pt-4 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tanggal Transfer</label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    Nama Operator Pengirim
                  </label>
                  <input
                    type="text"
                    placeholder="Nama operator"
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
                  Pilih Part / Material Resin
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Ketik nama part atau jenis resin..."
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
                              Memuat daftar material...
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
                                isCrush ? "hover:bg-purple-50/60 bg-purple-50/10" : "hover:bg-purple-50"
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
                      <th className="px-4 py-3">Material</th>
                      <th className="px-4 py-3 text-center" style={{ width: "130px" }}>
                        Berat (KG)
                      </th>
                      <th className="px-4 py-3 text-center" style={{ width: "160px" }}>
                        Tipe Scrap
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
                          Belum ada item dipilih.
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
                              value={it.qty_sent}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].qty_sent = Number(e.target.value);
                                setItems(newItems);
                              }}
                              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-center font-black outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={it.scrap_type}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].scrap_type = e.target.value;
                                setItems(newItems);
                              }}
                              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold"
                            >
                              <option value="Runner / Sprue">Runner / Sprue</option>
                              <option value="Part Defect (NG)">Part Defect (NG)</option>
                              <option value="Purging Resin">Purging Resin</option>
                            </select>
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
                  className="px-6 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-200 hover:bg-purple-700 flex items-center gap-2"
                >
                  <Send size={14} /> {submitting ? "Menyimpan..." : "Kirim ke Gudang Crusher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: TRANSFER PART NG DARI PRODUKSI (LINK WO) */}
      {/* ======================================================== */}
      {isNgModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl border border-gray-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-4 border-b border-gray-100 flex justify-between items-center shrink-0 bg-red-50/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-200">
                  <Flame size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Transfer Part NG Hasil Produksi ke Crusher</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">
                    Pilih batch NG dari Work Order yang diverifikasi QC untuk digiling kembali atau didisposal
                  </p>
                </div>
              </div>
              <button onClick={() => setIsNgModalOpen(false)} className="p-2 rounded-full hover:bg-white text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateNgTransfer} className="p-8 pt-4 overflow-y-auto flex-1 space-y-6">
              {/* Step 1: Select Output Batch */}
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">
                  1. Pilih Hasil Produksi yang Menghasilkan NG
                </label>
                {availableNgList.length === 0 ? (
                  <div className="p-6 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <ShieldAlert className="mx-auto mb-2 text-gray-300" size={28} />
                    <p className="text-xs font-bold text-gray-500">Tidak ada batch hasil produksi dengan sisa NG.</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Semua NG hasil verifikasi QC telah diproses atau belum ada realisasi NG.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {availableNgList.map((item) => {
                      const isSelected = selectedNgItem?.production_output_id === item.production_output_id;
                      return (
                        <div
                          key={item.production_output_id}
                          onClick={() => handleSelectNgItem(item)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? "bg-red-50/70 border-red-300 ring-2 ring-red-500/20 shadow-sm"
                              : "bg-gray-50/50 border-gray-200/80 hover:bg-gray-50 hover:border-gray-300"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-gray-900 text-sm">{item.product_name}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-700">
                                WO: {item.wo_reference || "-"}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400 font-bold mt-1 flex items-center gap-2">
                              <span>Kode: {item.product_code}</span>
                              {item.ng_type && <span className="text-red-500">• Defect: {item.ng_type}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-gray-400">Sisa NG</div>
                            <div className="font-black text-lg text-red-600">
                              {item.remaining_ng} <span className="text-xs text-gray-400">Pcs</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 2: Action & Details */}
              {selectedNgItem && (
                <div className="space-y-4 pt-2 border-t border-gray-100 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">
                        Tindakan Terhadap Part NG
                      </label>
                      <select
                        value={ngAction}
                        onChange={(e) => setNgAction(e.target.value as any)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-500/20"
                      >
                        <option value="Sent_To_Crusher">Kirim ke Crusher (Digiling Ulang)</option>
                        <option value="Disposed">Disposal Langsung (Tidak Digiling)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">
                        Qty yang Dikirim (Maks: {selectedNgItem.remaining_ng} Pcs)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={selectedNgItem.remaining_ng}
                        value={ngQty}
                        onChange={(e) => setNgQty(Number(e.target.value))}
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-red-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">
                      Alasan / Kategori Defect
                    </label>
                    <input
                      type="text"
                      value={ngReason}
                      onChange={(e) => setNgReason(e.target.value)}
                      placeholder="Contoh: Part Cacat / Kontaminasi Material"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">
                      Catatan Tambahan
                    </label>
                    <textarea
                      value={ngNotes}
                      onChange={(e) => setNgNotes(e.target.value)}
                      rows={2}
                      placeholder="Catatan operator..."
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold resize-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNgModalOpen(false)}
                  className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={ngSubmitting || !selectedNgItem || ngQty <= 0}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-red-200 hover:from-red-700 hover:to-rose-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Send size={14} /> {ngSubmitting ? "Menyimpan..." : "Kirim Part NG"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
