"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Truck,
  Search,
  CheckCircle2,
  Package,
  Calendar,
  Eye,
  X,
  Boxes,
  Building2,
  FileText,
  Clock,
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  Loader2,
  CheckSquare,
  PlusCircle,
  MinusCircle,
  ShieldCheck,
  Tag
} from "lucide-react";
import api from "@/lib/api";
import { useReceiptByScheduleEnabled } from "@/lib/config";

interface ReceiptItem {
  id: string;
  product_id?: string;
  product_name: string;
  product_code: string;
  qty_ordered: number;
  qty_received: number;
  qty_ok?: number;
  qty_ng?: number;
  ng_category?: string;
  ng_note?: string;
  product_unit: string;

  // Local state for receiving form
  has_ng?: boolean;
  input_qty_received?: number;
  input_qty_ng?: number;
  input_ng_category?: string;
}

interface GoodsReceiptSchedule {
  id: string;
  reference: string;
  bpb_number: string;
  date: string;
  supplier_id: string;
  supplier_name: string;
  supplier_code?: string;
  status: "Pending" | "Completed" | string;
  note: string;
  item_count: number;
  total_qty: number;
  total_qty_ok?: number;
  total_qty_ng?: number;
  created_at: string;
  items?: ReceiptItem[];
}

const NG_CATEGORIES = [
  "Cacat Fisik / Baret / Retak",
  "Kemasan Rusak / Bocor",
  "Ukuran / Dimensi Tidak Sesuai",
  "Karat / Kontaminasi",
  "Fungsi Rusak / Defect",
  "Kuantitas Kurang Dari Surat Jalan",
  "Lain-lain"
];

export default function PenerimaanBySchedulePage() {
  const router = useRouter();
  const isEnabled = useReceiptByScheduleEnabled();

  const [receipts, setReceipts] = useState<GoodsReceiptSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceiptSchedule | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "receive">("view");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Receive Form State
  const [receiveItems, setReceiveItems] = useState<ReceiptItem[]>([]);
  const [receiveNote, setReceiveNote] = useState("");
  const [submittingReceive, setSubmittingReceive] = useState(false);
  const [receiveAlert, setReceiveAlert] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/receipt-by-schedule", {
        params: { search, page, limit: 10 }
      });
      if (res && res.data) {
        setReceipts(res.data.data || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalItems(res.data.totalItems || 0);
      }
    } catch (err) {
      console.error("Failed to fetch schedule receipts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEnabled) {
      fetchReceipts();
    }
  }, [isEnabled, search, page]);

  const handleOpenDetailModal = async (receipt: GoodsReceiptSchedule, mode: "view" | "receive" = "view") => {
    setSelectedReceipt(receipt);
    setModalMode(mode);
    setIsModalOpen(true);
    setLoadingDetail(true);
    setReceiveAlert(null);
    setReceiveNote(receipt.note || "");

    try {
      const res = await api.express.get(`/receipt-by-schedule/${receipt.id}`);
      if (res && res.data) {
        const fullData = res.data;
        setSelectedReceipt(fullData);

        // Initialize receive items
        const preparedItems: ReceiptItem[] = (fullData.items || []).map((it: ReceiptItem) => ({
          ...it,
          has_ng: Number(it.qty_ng || 0) > 0,
          input_qty_received: Number(it.qty_received || 0),
          input_qty_ng: Number(it.qty_ng || 0),
          input_ng_category: it.ng_category || NG_CATEGORIES[0]
        }));
        setReceiveItems(preparedItems);
      }
    } catch (err) {
      console.error("Failed to fetch receipt details:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleItemQtyReceivedChange = (index: number, val: number) => {
    setReceiveItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const newRec = Math.max(0, val);
      const newNg = item.has_ng ? Math.min(item.input_qty_ng || 0, newRec) : 0;
      return {
        ...item,
        input_qty_received: newRec,
        input_qty_ng: newNg
      };
    }));
  };

  const handleToggleNG = (index: number) => {
    setReceiveItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const nextHasNg = !item.has_ng;
      return {
        ...item,
        has_ng: nextHasNg,
        input_qty_ng: nextHasNg ? (item.input_qty_ng && item.input_qty_ng > 0 ? item.input_qty_ng : 1) : 0,
        input_ng_category: item.input_ng_category || NG_CATEGORIES[0]
      };
    }));
  };

  const handleItemQtyNgChange = (index: number, val: number) => {
    setReceiveItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const maxNg = item.input_qty_received || 0;
      const newNg = Math.max(0, Math.min(val, maxNg));
      return {
        ...item,
        input_qty_ng: newNg
      };
    }));
  };

  const handleItemNgCategoryChange = (index: number, cat: string) => {
    setReceiveItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      return { ...item, input_ng_category: cat };
    }));
  };

  const handleConfirmSubmitReceive = async () => {
    if (!selectedReceipt) return;

    setSubmittingReceive(true);
    setReceiveAlert(null);

    try {
      const payload = {
        note: receiveNote,
        items: receiveItems.map(it => {
          const qRec = Number(it.input_qty_received || 0);
          const qNg = it.has_ng ? Number(it.input_qty_ng || 0) : 0;
          return {
            detail_id: it.id,
            qty_received: qRec,
            qty_ng: qNg,
            ng_category: it.has_ng ? (it.input_ng_category || NG_CATEGORIES[0]) : null
          };
        })
      };

      const res = await api.express.post(`/receipt-by-schedule/${selectedReceipt.id}/confirm`, payload);
      
      setReceiveAlert({
        type: "success",
        text: res.data.message || "Penerimaan barang berhasil dikonfirmasi & stok terupdate!"
      });

      setTimeout(() => {
        setIsModalOpen(false);
        fetchReceipts();
      }, 1600);

    } catch (err: any) {
      console.error("Failed to confirm receipt:", err);
      setReceiveAlert({
        type: "error",
        text: err.response?.data?.message || err.message || "Gagal memproses penerimaan barang."
      });
    } finally {
      setSubmittingReceive(false);
    }
  };

  if (!isEnabled) {
    return (
      <div className="min-h-screen p-6 md:p-10 bg-slate-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md text-center space-y-4 border border-slate-100">
          <div className="w-16 h-16 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center mx-auto">
            <Truck size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900">Fitur Belum Diaktifkan</h2>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Fitur <b>Penerimaan Barang by Schedule Pengiriman</b> saat ini dinonaktifkan di Konfigurasi Umum. Silakan aktifkan fitur ini untuk mengakses halaman ini.
          </p>
          <button
            onClick={() => router.push("/settings/general")}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white rounded-xl font-bold text-xs shadow-md shadow-cyan-200 transition-all hover:scale-105 active:scale-95"
          >
            Buka Konfigurasi Umum
          </button>
        </div>
      </div>
    );
  }

  const grandTotalQtyOk = receipts.reduce((acc, curr) => acc + Number(curr.total_qty_ok || (curr.status === "Completed" ? curr.total_qty : 0)), 0);
  const pendingCount = receipts.filter(r => r.status === "Pending").length;

  return (
    <div className="min-h-screen p-6 md:p-10 bg-slate-50 space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-teal-600 rounded-[2rem] blur opacity-15"></div>
        <div className="relative bg-white/80 backdrop-blur-xl border border-white/30 p-8 rounded-[2rem] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-xl shadow-cyan-200 text-white">
              <Truck size={30} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Penerimaan Barang by Schedule Pengiriman
                </h1>
                <span className="px-3 py-1 bg-cyan-100 text-cyan-800 text-[10px] font-black uppercase tracking-wider rounded-full border border-cyan-200">
                  Verifikasi Gudang & OK/NG
                </span>
              </div>
              <p className="text-slate-500 text-sm font-medium mt-1">
                Proses penerimaan & verifikasi barang fisik dari Schedule Pengiriman Vendor.
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push("/persediaan-barang/schedule-vendor")}
            className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs transition-all shadow-md active:scale-95 shrink-0"
          >
            <ArrowLeft size={16} />
            <span>Ke Schedule Pengiriman</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Menunggu Penerimaan</span>
            <div className="text-2xl font-black text-amber-600">{pendingCount} Dokumen</div>
          </div>
          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total QTY OK (Masuk Stok)</span>
            <div className="text-2xl font-black text-emerald-600">{grandTotalQtyOk.toLocaleString("id-ID")} PCS</div>
          </div>
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
            <ShieldCheck size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Dokumen BPB</span>
            <div className="text-2xl font-black text-slate-900">{totalItems} Dokumen</div>
          </div>
          <div className="p-4 bg-cyan-50 text-cyan-600 rounded-2xl">
            <FileText size={24} />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari berdasarkan No BPB, Supplier, atau Catatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3 animate-pulse">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 font-bold">Memuat data penerimaan schedule...</p>
          </div>
        ) : receipts.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Boxes className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-500 font-bold">Belum ada dokumen penerimaan barang dari schedule</p>
            <p className="text-xs text-slate-400">
              Gunakan tombol <b>Kirim ke Penerimaan</b> di halaman Schedule Pengiriman Vendor untuk memproses data kedatangan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">No. Referensi BPB</th>
                  <th className="py-4 px-6">Tanggal Kedatangan</th>
                  <th className="py-4 px-6">Supplier / Vendor</th>
                  <th className="py-4 px-6 text-center">Jumlah Item</th>
                  <th className="py-4 px-6 text-right">Qty OK (Stok)</th>
                  <th className="py-4 px-6 text-right">Qty NG (Cacat)</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {receipts.map((r) => {
                  const isPending = r.status === "Pending";
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isPending ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`}></span>
                        {r.reference}
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-slate-400" />
                          <span>{r.date ? new Date(r.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-cyan-600 shrink-0" />
                          <span className="font-bold text-slate-800">{r.supplier_name || "-"}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-[11px]">
                          {r.item_count || 0} Item
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-black text-emerald-600 text-sm">
                        {Number(r.total_qty_ok ?? r.total_qty ?? 0).toLocaleString("id-ID")} PCS
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-rose-600">
                        {Number(r.total_qty_ng || 0) > 0 ? `${r.total_qty_ng} PCS` : "-"}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {isPending ? (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                            <Clock size={12} /> Pending Verification
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle2 size={12} /> Completed & Stock In
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {isPending ? (
                          <button
                            onClick={() => handleOpenDetailModal(r, "receive")}
                            className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-md shadow-cyan-200 transition-all inline-flex items-center gap-1.5 active:scale-95"
                          >
                            <Truck size={14} /> Proses Terima Barang
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenDetailModal(r, "view")}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all inline-flex items-center gap-1.5 active:scale-95"
                          >
                            <Eye size={14} /> Detail
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal View / Receive */}
      {isModalOpen && selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-teal-600 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Truck size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black">{selectedReceipt.reference}</h3>
                  <p className="text-xs text-cyan-100 font-medium">
                    Supplier: <b className="text-white">{selectedReceipt.supplier_name}</b> | Status:{" "}
                    <b className="uppercase">{selectedReceipt.status}</b>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {receiveAlert && (
                <div
                  className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 ${
                    receiveAlert.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {receiveAlert.type === "success" ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-rose-600" />}
                  <span>{receiveAlert.text}</span>
                </div>
              )}

              {loadingDetail ? (
                <div className="py-12 text-center animate-pulse space-y-2">
                  <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-bold text-slate-400">Memuat rincian item barang...</p>
                </div>
              ) : modalMode === "view" ? (
                /* READ-ONLY VIEW MODE */
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl text-xs">
                    <div>
                      <span className="text-slate-400 font-medium block">Tanggal Kedatangan</span>
                      <span className="font-bold text-slate-800">
                        {selectedReceipt.date ? new Date(selectedReceipt.date).toLocaleDateString("id-ID") : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Total Qty Diterima</span>
                      <span className="font-bold text-slate-800">
                        {selectedReceipt.items?.reduce((a, b) => a + Number(b.qty_received || 0), 0).toLocaleString("id-ID")} PCS
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Qty OK (Masuk Stok)</span>
                      <span className="font-black text-emerald-600">
                        {selectedReceipt.items?.reduce((a, b) => a + Number(b.qty_ok ?? b.qty_received ?? 0), 0).toLocaleString("id-ID")} PCS
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Qty NG (Barang Cacat)</span>
                      <span className="font-bold text-rose-600">
                        {selectedReceipt.items?.reduce((a, b) => a + Number(b.qty_ng || 0), 0).toLocaleString("id-ID")} PCS
                      </span>
                    </div>
                  </div>

                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                          <th className="py-3 px-4">Kode Part</th>
                          <th className="py-3 px-4">Nama Part</th>
                          <th className="py-3 px-4 text-right">PO Qty</th>
                          <th className="py-3 px-4 text-right">Diterima</th>
                          <th className="py-3 px-4 text-right bg-emerald-50/50 text-emerald-900">QTY OK (Stok)</th>
                          <th className="py-3 px-4 text-right text-rose-700">QTY NG</th>
                          <th className="py-3 px-4">Kategori NG</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {selectedReceipt.items?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-mono font-bold text-slate-800">{item.product_code || "-"}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{item.product_name}</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-500">{Number(item.qty_ordered || 0).toLocaleString("id-ID")}</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-800">{Number(item.qty_received || 0).toLocaleString("id-ID")}</td>
                            <td className="py-3 px-4 text-right font-black text-emerald-600 text-sm bg-emerald-50/20">
                              {Number(item.qty_ok ?? item.qty_received ?? 0).toLocaleString("id-ID")}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-rose-600">
                              {Number(item.qty_ng || 0) > 0 ? `${item.qty_ng} PCS` : "-"}
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {item.ng_category ? <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-md border border-rose-200 text-[10px] font-bold">{item.ng_category}</span> : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* INTERACTIVE RECEIVE & OK/NG FORM */
                <div className="space-y-6">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs font-medium text-amber-900 flex items-center gap-3">
                    <AlertTriangle size={20} className="text-amber-600 shrink-0" />
                    <div>
                      <p className="font-bold">Verifikasi Fisik & Penginputan Kondisi Barang (OK / NG)</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Isikan kuantitas fisik yang diterima dan tandai barang NG jika ada cacat. <b>Hanya QTY OK yang akan secara otomatis masuk ke Stok Gudang.</b>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {receiveItems.map((item, idx) => {
                      const qtyRec = Number(item.input_qty_received || 0);
                      const qtyNg = item.has_ng ? Number(item.input_qty_ng || 0) : 0;
                      const qtyOk = Math.max(0, qtyRec - qtyNg);

                      return (
                        <div key={item.id || idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-3">
                            <div>
                              <span className="text-[10px] font-mono text-slate-400 font-bold block">{item.product_code}</span>
                              <h4 className="text-sm font-black text-slate-900">{item.product_name}</h4>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="px-3 py-1 bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px]">
                                Total PO: <b>{item.qty_ordered?.toLocaleString("id-ID")} PCS</b>
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                            {/* Input Qty Diterima */}
                            <div>
                              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                Qty Fisik Diterima:
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={item.input_qty_received}
                                onChange={(e) => handleItemQtyReceivedChange(idx, parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-right font-black text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                              />
                            </div>

                            {/* Qty OK Autofill Badge */}
                            <div>
                              <label className="text-[11px] font-bold text-emerald-700 block mb-1">
                                Qty OK (Masuk Stok):
                              </label>
                              <div className="px-4 py-2 bg-emerald-100 border border-emerald-300 rounded-xl font-black text-emerald-800 text-right text-sm shadow-inner">
                                {qtyOk.toLocaleString("id-ID")} PCS
                              </div>
                            </div>

                            {/* NG Toggle Button */}
                            <div className="flex items-end h-full">
                              <button
                                type="button"
                                onClick={() => handleToggleNG(idx)}
                                className={`w-full py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 border ${
                                  item.has_ng
                                    ? "bg-rose-600 text-white border-rose-700 shadow-md"
                                    : "bg-white text-slate-600 hover:bg-slate-100 border-slate-300"
                                }`}
                              >
                                {item.has_ng ? <MinusCircle size={16} /> : <PlusCircle size={16} />}
                                <span>{item.has_ng ? "Barang NG Ditemukan" : "+ Ada Barang NG (Cacat)"}</span>
                              </button>
                            </div>
                          </div>

                          {/* NG Category & Qty NG Sub-Panel */}
                          {item.has_ng && (
                            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                                <AlertCircle size={16} className="text-rose-600" />
                                <span>Rincian Kerusakan / Barang NG (Not Good):</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[11px] font-bold text-rose-900 block mb-1">
                                    Pilih Kategori NG:
                                  </label>
                                  <select
                                    value={item.input_ng_category}
                                    onChange={(e) => handleItemNgCategoryChange(idx, e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                                  >
                                    {NG_CATEGORIES.map((cat) => (
                                      <option key={cat} value={cat}>
                                        {cat}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="text-[11px] font-bold text-rose-900 block mb-1">
                                    Jumlah (QTY) NG:
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.input_qty_received}
                                    value={item.input_qty_ng}
                                    onChange={(e) => handleItemQtyNgChange(idx, parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-right font-black text-rose-700 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Catatan Penerimaan Gudang:</label>
                    <textarea
                      rows={2}
                      value={receiveNote}
                      onChange={(e) => setReceiveNote(e.target.value)}
                      placeholder="Tambahkan catatan khusus pemeriksaan fisik gudang jika ada..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              {modalMode === "receive" ? (
                <>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-slate-500 font-bold">
                      Total QTY OK:{" "}
                      <b className="text-emerald-600 text-sm">
                        {receiveItems
                          .reduce((a, b) => a + Math.max(0, (b.input_qty_received || 0) - (b.has_ng ? (b.input_qty_ng || 0) : 0)), 0)
                          .toLocaleString("id-ID")}{" "}
                        PCS
                      </b>
                    </span>
                    <span className="text-slate-500 font-bold">
                      Total NG:{" "}
                      <b className="text-rose-600 text-sm">
                        {receiveItems
                          .reduce((a, b) => a + (b.has_ng ? Number(b.input_qty_ng || 0) : 0), 0)
                          .toLocaleString("id-ID")}{" "}
                        PCS
                      </b>
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-all"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmSubmitReceive}
                      disabled={submittingReceive}
                      className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-black text-xs shadow-md shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {submittingReceive ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Memproses...
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={16} /> Konfirmasi Terima Barang & Update Stok
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full flex justify-end">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition-all"
                  >
                    Tutup
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
