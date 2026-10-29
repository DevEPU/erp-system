"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PackageCheck,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowDownLeft,
  FileCheck2,
  Boxes,
  ShieldCheck,
  AlertCircle,
  Truck,
  Layers,
  ChevronRight,
  ClipboardCheck,
  UserCheck,
  X
} from "lucide-react";
import api from "@/lib/api";

export default function PenerimaanMaterialProduksiPage() {
  const router = useRouter();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Checksheet Modal state
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);
  const [isChecksheetModalOpen, setIsChecksheetModalOpen] = useState(false);
  const [receiverName, setReceiverName] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]);
  const [shift, setShift] = useState("Shift 1");
  const [checkPackaging, setCheckPackaging] = useState(true);
  const [checkLabel, setCheckLabel] = useState(true);
  const [checkQuantity, setCheckQuantity] = useState(true);
  const [receiptNotes, setReceiptNotes] = useState("");
  const [itemQuantities, setItemQuantities] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTransfers();
  }, [search, statusFilter]);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/internal-transfers", {
        params: {
          transfer_type: "STORE_TO_PROD",
          status: statusFilter,
          search
        }
      });
      setTransfers(res.data.data || []);
    } catch (err) {
      console.error("Error fetching material transfers to production:", err);
    } finally {
      setLoading(false);
    }
  };

  const openChecksheetModal = (transfer: any) => {
    setSelectedTransfer(transfer);
    // Initialize received quantities
    const initialQty: Record<number, number> = {};
    if (transfer.items) {
      transfer.items.forEach((it: any) => {
        initialQty[it.id] = Number(it.qty_sent);
      });
    }
    setItemQuantities(initialQty);
    setReceiverName("");
    setReceiptNotes("");
    setCheckPackaging(true);
    setCheckLabel(true);
    setCheckQuantity(true);
    setIsChecksheetModalOpen(true);
  };

  const handleConfirmReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;
    if (!receiverName) {
      alert("Mohon isi nama operator / staff penerima.");
      return;
    }

    setSubmitting(true);
    try {
      const itemsPayload = selectedTransfer.items.map((it: any) => ({
        id: it.id,
        qty_received: Number(itemQuantities[it.id] || it.qty_sent),
        qty_rejected: Number(it.qty_sent) - Number(itemQuantities[it.id] || it.qty_sent)
      }));

      const payload = {
        received_by: `${receiverName} (${shift})`,
        received_date: receivedDate,
        checksheet_data: {
          shift,
          packaging_sealed: checkPackaging,
          label_verified: checkLabel,
          quantity_verified: checkQuantity,
          notes: receiptNotes
        },
        notes: receiptNotes,
        items: itemsPayload
      };

      await api.express.post(`/internal-transfers/${selectedTransfer.id}/receive`, payload);

      setIsChecksheetModalOpen(false);
      alert("Checksheet penerimaan bahan baku produksi berhasil disimpan dan stok telah diverifikasi!");
      fetchTransfers();
    } catch (err: any) {
      console.error("Error confirming receipt:", err);
      alert(err.message || "Gagal mengonfirmasi penerimaan material.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen animate-in fade-in duration-500">
      {/* Back button */}
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
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-200">
              <PackageCheck className="text-white" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                  No. 5
                </span>
                <h1 className="text-3xl font-black tracking-tight text-gray-900">
                  Store ke Produksi <span className="text-emerald-600">(IN)</span>
                </h1>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Checksheet Verifikasi Serah-Terima Bahan Baku dari Gudang Material ke Lantai Produksi
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari nomor slip transfer, referensi, atau catatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {["all", "Pending", "Received"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                statusFilter === st
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {st === "all" ? "Semua Status" : st === "Pending" ? "Menunggu Penerimaan" : "Selesai Diterima"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">No. Dokumen / Tanggal</th>
                <th className="px-6 py-4">Asal $\rightarrow$ Tujuan</th>
                <th className="px-6 py-4">Detail Bahan & Kemasan</th>
                <th className="px-6 py-4 text-center">Petugas Serah-Terima</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi Checksheet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-6"><div className="h-8 bg-gray-100 rounded-xl w-full"></div></td>
                  </tr>
                ))
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                    Belum ada dokumen pengiriman bahan baku yang menunggu penerimaan di produksi.
                  </td>
                </tr>
              ) : (
                transfers.map((trf) => (
                  <tr key={trf.id} className="hover:bg-emerald-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 text-sm group-hover:text-emerald-600 transition-colors">
                          {trf.reference_no}
                        </span>
                        {trf.source_reference && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                            WO: {trf.source_reference}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold mt-0.5 flex items-center gap-1">
                        <Calendar size={10} /> {trf.transfer_date}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-700">
                      <span className="text-indigo-600 font-bold">{trf.from_warehouse_name || "Gudang Material (MATKOM)"}</span>
                      <span className="mx-1.5 text-gray-400">$\rightarrow$</span>
                      <span className="text-emerald-600 font-bold">{trf.to_warehouse_name || "Gudang Produksi (PROD)"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {trf.items?.map((it: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="font-extrabold text-gray-800">{it.product_name}</span>
                            <span className="text-[10px] font-black px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {it.qty_sent} {it.unit || "PCS"}
                            </span>
                            {it.package_type && (
                              <span className="text-[10px] font-bold text-gray-400">
                                ({it.package_count} {it.package_type})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="font-semibold text-gray-800">{trf.transferred_by || "-"}</div>
                      {trf.received_by && (
                        <div className="text-[10px] text-emerald-600 font-bold">Diterima: {trf.received_by}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                        trf.status === "Received"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : "bg-amber-50 text-amber-600 border border-amber-200 animate-pulse"
                      }`}>
                        {trf.status === "Received" ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                        {trf.status === "Received" ? "Diterima (Verified)" : "Menunggu Checksheet"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {trf.status === "Received" ? (
                        <button
                          onClick={() => openChecksheetModal(trf)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-all inline-flex items-center gap-1.5"
                        >
                          <ClipboardCheck size={14} /> Lihat Checksheet
                        </button>
                      ) : (
                        <button
                          onClick={() => openChecksheetModal(trf)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-md shadow-emerald-200 transition-all active:scale-95 inline-flex items-center gap-1.5"
                        >
                          <FileCheck2 size={14} /> Konfirmasi Penerimaan
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CHECKSHEET PENERIMAAN */}
      {isChecksheetModalOpen && selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl border border-gray-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-8 pb-4 border-b border-gray-100 flex justify-between items-center shrink-0 bg-emerald-50/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Checksheet Penerimaan Bahan Baku Produksi</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">
                    No. Dokumen: <span className="text-emerald-600 font-extrabold">{selectedTransfer.reference_no}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsChecksheetModalOpen(false)}
                className="p-2 rounded-full hover:bg-white text-gray-400 hover:text-gray-700 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmReceipt} className="p-8 pt-4 overflow-y-auto flex-1 space-y-6">
              {/* Petugas Penerima */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tanggal Terima</label>
                  <input
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    required
                    disabled={selectedTransfer.status === "Received"}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nama Penerima (Produksi)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Budi Santoso (Leader Shift)"
                    value={selectedTransfer.status === "Received" ? selectedTransfer.received_by : receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    required
                    disabled={selectedTransfer.status === "Received"}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Shift Kerja</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    disabled={selectedTransfer.status === "Received"}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Shift 1">Shift 1 (Pagi)</option>
                    <option value="Shift 2">Shift 2 (Siang)</option>
                    <option value="Shift 3">Shift 3 (Malam)</option>
                  </select>
                </div>
              </div>

              {/* Checksheet Parameter Inspeksi Fisik */}
              <div className="bg-emerald-50/40 border border-emerald-100 p-5 rounded-2xl space-y-3">
                <p className="text-xs font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1.5">
                  <ClipboardCheck size={14} /> Verifikasi Kondisi Fisik Serah-Terima
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-emerald-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkPackaging}
                      onChange={(e) => setCheckPackaging(e.target.checked)}
                      disabled={selectedTransfer.status === "Received"}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-gray-700">Kemasan & Segel Utuh</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-emerald-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkLabel}
                      onChange={(e) => setCheckLabel(e.target.checked)}
                      disabled={selectedTransfer.status === "Received"}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-gray-700">Lot & Identitas Sesuai</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-emerald-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkQuantity}
                      onChange={(e) => setCheckQuantity(e.target.checked)}
                      disabled={selectedTransfer.status === "Received"}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-gray-700">Jumlah Aktual Pas</span>
                  </label>
                </div>
              </div>

              {/* Items Verification Table */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  Verifikasi Kuantitas Bahan per Item
                </label>
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase">
                        <th className="px-4 py-3">Nama Produk / Material</th>
                        <th className="px-4 py-3 text-center">QTY Kirim Store</th>
                        <th className="px-4 py-3 text-center" style={{ width: "160px" }}>QTY Diterima Produksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {selectedTransfer.items?.map((it: any) => (
                        <tr key={it.id}>
                          <td className="px-4 py-3">
                            <p className="font-extrabold text-gray-900">{it.product_name}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{it.product_code}</p>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-gray-600">
                            {it.qty_sent} {it.unit || "PCS"}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={selectedTransfer.status === "Received" ? it.qty_received : (itemQuantities[it.id] ?? it.qty_sent)}
                              onChange={(e) => setItemQuantities({ ...itemQuantities, [it.id]: Number(e.target.value) })}
                              disabled={selectedTransfer.status === "Received"}
                              min={0}
                              max={it.qty_sent}
                              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-center font-black outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Catatan Tambahan */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Catatan / Temuan Checksheet</label>
                <input
                  type="text"
                  placeholder="Keterangan tambahan jika ada kemasan rusak atau selisih..."
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  disabled={selectedTransfer.status === "Received"}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsChecksheetModalOpen(false)}
                  className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all"
                >
                  Tutup
                </button>
                {selectedTransfer.status !== "Received" && (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <FileCheck2 size={14} />
                    {submitting ? "Menyimpan..." : "Simpan Checksheet & Verifikasi Stok"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
