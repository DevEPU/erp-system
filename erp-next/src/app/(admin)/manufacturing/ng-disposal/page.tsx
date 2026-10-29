"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Flame,
  Trash2,
  Package,
  RotateCcw,
  Truck,
  Filter,
  Eye,
  ChevronDown,
  X,
  ArrowRight,
  FileText,
  AlertOctagon
} from "lucide-react";
import api from "@/lib/api";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  Pending: { label: "Menunggu Keputusan", color: "bg-amber-50 text-amber-600 border-amber-200", icon: Clock },
  In_Progress: { label: "Dalam Proses", color: "bg-blue-50 text-blue-600 border-blue-200", icon: RotateCcw },
  Completed: { label: "Selesai", color: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: CheckCircle2 },
};

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  Sent_To_Crusher: { label: "Kirim ke Crusher", color: "bg-purple-50 text-purple-600 border-purple-200", icon: Flame },
  Disposed: { label: "Disposal", color: "bg-red-50 text-red-600 border-red-200", icon: Trash2 },
  Returned_To_Vendor: { label: "Vendor Claim", color: "bg-orange-50 text-orange-600 border-orange-200", icon: Truck },
  Rework: { label: "Rework", color: "bg-cyan-50 text-cyan-600 border-cyan-200", icon: RotateCcw },
  Released_OK: { label: "Dirilis OK", color: "bg-green-50 text-green-600 border-green-200", icon: CheckCircle2 },
};

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  Production: { label: "Produksi", color: "bg-indigo-50 text-indigo-600" },
  Customer_Claim: { label: "Customer Claim", color: "bg-pink-50 text-pink-600" },
  QC_Gate: { label: "QC Gate", color: "bg-sky-50 text-sky-600" },
};

export default function NgDisposalPage() {
  const router = useRouter();
  const [disposals, setDisposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [summary, setSummary] = useState<any>(null);

  // Detail modal
  const [selectedDisposal, setSelectedDisposal] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Process modal (for crusher completion)
  const [isProcessOpen, setIsProcessOpen] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [regrindProducts, setRegrindProducts] = useState<any[]>([]);
  const [selectedRegrindProduct, setSelectedRegrindProduct] = useState("");
  const [qtyRegrindResin, setQtyRegrindResin] = useState("");
  const [processNotes, setProcessNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchDisposals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/ng-disposals", {
        params: { search, status: filterStatus, action_taken: filterAction, source_type: filterSource, limit: 100 }
      });
      setDisposals(res.data.data || []);
    } catch (err) {
      console.error("Error fetching NG disposals:", err);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterAction, filterSource]);

  const fetchSummary = async () => {
    try {
      const res = await api.express.get("/ng-disposals/summary");
      setSummary(res.data.data);
    } catch (err) {
      console.error("Error fetching summary:", err);
    }
  };

  const fetchRegrindProducts = async () => {
    try {
      const res = await api.express.get("/ng-disposals/regrind-products");
      setRegrindProducts(res.data.data || []);
    } catch (err) {
      console.error("Error fetching regrind products:", err);
    }
  };

  useEffect(() => {
    fetchDisposals();
    fetchSummary();
  }, [fetchDisposals]);

  const handleViewDetail = async (id: number) => {
    try {
      const res = await api.express.get(`/ng-disposals/${id}`);
      setSelectedDisposal(res.data.data);
      setIsDetailOpen(true);
    } catch (err) {
      console.error("Error fetching disposal detail:", err);
    }
  };

  const handleOpenProcess = (id: number) => {
    setProcessingId(id);
    setSelectedRegrindProduct("");
    setQtyRegrindResin("");
    setProcessNotes("");
    fetchRegrindProducts();
    setIsProcessOpen(true);
  };

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processingId) return;
    setSubmitting(true);
    try {
      await api.express.post(`/ng-disposals/${processingId}/process`, {
        regrind_product_id: selectedRegrindProduct || null,
        qty_regrind_resin: qtyRegrindResin ? Number(qtyRegrindResin) : 0,
        notes: processNotes
      });
      alert("Proses NG disposal berhasil diselesaikan!");
      setIsProcessOpen(false);
      fetchDisposals();
      fetchSummary();
    } catch (err: any) {
      console.error("Error processing disposal:", err);
      alert(err.response?.data?.message || "Gagal memproses disposal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen animate-in fade-in duration-500">
      <button
        onClick={() => router.push("/manufacturing")}
        className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
      >
        <ArrowLeft size={14} /> Kembali ke Manufaktur
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl shadow-lg shadow-red-200">
              <AlertTriangle className="text-white" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700">
                  NG Management
                </span>
                <h1 className="text-3xl font-black tracking-tight text-gray-900">
                  Penanganan NG & <span className="text-red-600">Disposal</span>
                </h1>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Kelola barang NG dari Produksi & Customer Claim — Kirim ke Crusher atau Disposal
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</div>
            <div className="text-2xl font-black text-gray-900 mt-1">{summary.total || 0}</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm">
            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Pending</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{summary.pending || 0}</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-sm">
            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Proses</div>
            <div className="text-2xl font-black text-blue-600 mt-1">{summary.in_progress || 0}</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-sm">
            <div className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Crusher</div>
            <div className="text-2xl font-black text-purple-600 mt-1">{summary.crusher_count || 0}</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-red-100 shadow-sm">
            <div className="text-[10px] font-black text-red-500 uppercase tracking-widest">Disposal</div>
            <div className="text-2xl font-black text-red-600 mt-1">{summary.disposed_count || 0}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari referensi, produk, WO..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3 bg-gray-50 rounded-xl text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-red-500/20 border-none cursor-pointer"
        >
          <option value="all">Semua Status</option>
          <option value="Pending">Pending</option>
          <option value="In_Progress">Dalam Proses</option>
          <option value="Completed">Selesai</option>
        </select>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-4 py-3 bg-gray-50 rounded-xl text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-red-500/20 border-none cursor-pointer"
        >
          <option value="all">Semua Tindakan</option>
          <option value="Sent_To_Crusher">Crusher</option>
          <option value="Disposed">Disposal</option>
          <option value="Returned_To_Vendor">Vendor Claim</option>
          <option value="Rework">Rework</option>
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="px-4 py-3 bg-gray-50 rounded-xl text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-red-500/20 border-none cursor-pointer"
        >
          <option value="all">Semua Sumber</option>
          <option value="Production">Produksi</option>
          <option value="Customer_Claim">Customer Claim</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">Referensi / Tanggal</th>
                <th className="px-6 py-4">Produk NG</th>
                <th className="px-6 py-4 text-center">Qty</th>
                <th className="px-6 py-4">Sumber</th>
                <th className="px-6 py-4">Tindakan</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">WO Asal</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="px-6 py-6"><div className="h-8 bg-gray-100 rounded-xl w-full"></div></td>
                  </tr>
                ))
              ) : disposals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                    <AlertOctagon className="mx-auto mb-3 text-gray-300" size={32} />
                    Belum ada catatan NG / Disposal.
                  </td>
                </tr>
              ) : (
                disposals.map((d) => {
                  const statusCfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.Pending;
                  const actionCfg = ACTION_CONFIG[d.action_taken] || ACTION_CONFIG.Disposed;
                  const sourceCfg = SOURCE_CONFIG[d.source_type] || SOURCE_CONFIG.Production;
                  const StatusIcon = statusCfg.icon;
                  const ActionIcon = actionCfg.icon;

                  return (
                    <tr key={d.id} className="hover:bg-red-50/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-black text-gray-900 text-sm group-hover:text-red-600 transition-colors">
                          {d.reference_no}
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold mt-0.5 flex items-center gap-1">
                          <Calendar size={10} /> {d.processed_date || d.created_at?.split("T")[0]}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-gray-800">{d.product_name}</div>
                        <div className="text-[10px] text-gray-400 font-bold">{d.product_code}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-black text-gray-900 text-base">{d.qty}</span>
                        <span className="text-[10px] text-gray-400 font-bold ml-1">Pcs</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${sourceCfg.color}`}>
                          {sourceCfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 border ${actionCfg.color}`}>
                          <ActionIcon size={10} /> {actionCfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 border ${statusCfg.color}`}>
                          <StatusIcon size={10} /> {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-600">{d.wo_reference || "-"}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetail(d.id)}
                            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-800 transition-colors"
                            title="Lihat Detail"
                          >
                            <Eye size={14} />
                          </button>
                          {d.status !== "Completed" && d.action_taken === "Sent_To_Crusher" && (
                            <button
                              onClick={() => handleOpenProcess(d.id)}
                              className="p-2 rounded-xl hover:bg-purple-100 text-purple-400 hover:text-purple-700 transition-colors"
                              title="Proses Crusher"
                            >
                              <Flame size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {isDetailOpen && selectedDisposal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">Detail NG Disposal</h2>
                <p className="text-xs font-bold text-gray-400 mt-0.5">{selectedDisposal.reference_no}</p>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Produk</div>
                  <div className="font-bold text-gray-900">{selectedDisposal.product_name}</div>
                  <div className="text-xs text-gray-500">{selectedDisposal.product_code}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Jumlah NG</div>
                  <div className="font-black text-2xl text-red-600">{selectedDisposal.qty} <span className="text-xs text-gray-400">Pcs</span></div>
                </div>
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Sumber</div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${SOURCE_CONFIG[selectedDisposal.source_type]?.color || 'bg-gray-50 text-gray-600'}`}>
                    {SOURCE_CONFIG[selectedDisposal.source_type]?.label || selectedDisposal.source_type}
                  </span>
                </div>
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tindakan</div>
                  {(() => {
                    const acfg = ACTION_CONFIG[selectedDisposal.action_taken] || ACTION_CONFIG.Disposed;
                    const AIcon = acfg.icon;
                    return (
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 border ${acfg.color}`}>
                        <AIcon size={10} /> {acfg.label}
                      </span>
                    );
                  })()}
                </div>
                {selectedDisposal.wo_reference && (
                  <div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Work Order</div>
                    <div className="font-bold text-gray-900 flex items-center gap-1">
                      <FileText size={12} /> {selectedDisposal.wo_reference}
                    </div>
                  </div>
                )}
                {selectedDisposal.production_ng_type && (
                  <div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tipe NG</div>
                    <div className="font-bold text-gray-900">{selectedDisposal.production_ng_type}</div>
                  </div>
                )}
                {selectedDisposal.regrind_product_name && (
                  <div className="col-span-2">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Produk Regrind</div>
                    <div className="font-bold text-purple-700 flex items-center gap-1">
                      <Flame size={12} /> {selectedDisposal.regrind_product_name} ({selectedDisposal.regrind_product_code})
                    </div>
                  </div>
                )}
              </div>
              {selectedDisposal.reason && (
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Alasan NG</div>
                  <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{selectedDisposal.reason}</div>
                </div>
              )}
              {selectedDisposal.notes && (
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Catatan</div>
                  <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{selectedDisposal.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Process Crusher Modal */}
      {isProcessOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">Proses Crusher Selesai</h2>
                <p className="text-xs font-bold text-gray-400 mt-0.5">Catat hasil regrind dari penggilingan</p>
              </div>
              <button onClick={() => setIsProcessOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleProcess} className="p-6 space-y-5">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Produk Regrind yang Dihasilkan
                </label>
                <select
                  value={selectedRegrindProduct}
                  onChange={(e) => setSelectedRegrindProduct(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  required
                >
                  <option value="">Pilih produk regrind...</option>
                  {regrindProducts.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.product_name} ({p.product_code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Qty Regrind Resin (Kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={qtyRegrindResin}
                  onChange={(e) => setQtyRegrindResin(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  placeholder="Contoh: 12.50"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Catatan (Opsional)
                </label>
                <textarea
                  value={processNotes}
                  onChange={(e) => setProcessNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all resize-none"
                  rows={3}
                  placeholder="Catatan tambahan..."
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProcessOpen(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <RotateCcw size={14} className="animate-spin" />
                  ) : (
                    <Flame size={14} />
                  )}
                  {submitting ? "Memproses..." : "Selesaikan Crusher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
