"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Wrench,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ShieldAlert,
  FileCheck2,
  AlertTriangle,
  ClipboardCheck,
  RotateCcw,
  X
} from "lucide-react";
import api from "@/lib/api";

export default function PenerimaanReworkQcPage() {
  const router = useRouter();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [operatorName, setOperatorName] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]);
  const [reworkAction, setReworkAction] = useState("Deburring / Trimming Ulang");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTransfers();
  }, [search]);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/internal-transfers", {
        params: {
          transfer_type: "QC_TO_PROD_REWORK",
          search
        }
      });
      setTransfers(res.data.data || []);
    } catch (err) {
      console.error("Error fetching rework transfers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;
    setSubmitting(true);
    try {
      const payload = {
        received_by: operatorName,
        received_date: receivedDate,
        checksheet_data: {
          rework_action_plan: reworkAction,
          notes
        },
        notes: `Rencana Rework: ${reworkAction} | ${notes}`
      };
      await api.express.post(`/internal-transfers/${selectedTransfer.id}/receive`, payload);
      setIsModalOpen(false);
      alert("Penerimaan part reject/rework berhasil diverifikasi!");
      fetchTransfers();
    } catch (err: any) {
      console.error("Error confirming rework receipt:", err);
      alert(err.message || "Gagal mengonfirmasi penerimaan rework.");
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

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg shadow-orange-200">
              <RotateCcw className="text-white" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-700">
                  No. 7
                </span>
                <h1 className="text-3xl font-black tracking-tight text-gray-900">
                  Quality Gate ke Produksi <span className="text-orange-600">(IN)</span>
                </h1>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Checksheet Penerimaan Part Reject/Repair dari QC Gate untuk Dilakukan Rework di Lantai Produksi
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari slip pengembalian rework..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">No. Dokumen / Tanggal</th>
                <th className="px-6 py-4">Part / Produk Rework</th>
                <th className="px-6 py-4">Inspektor QC Pengirim</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi Checksheet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-6"><div className="h-8 bg-gray-100 rounded-xl w-full"></div></td>
                  </tr>
                ))
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                    Tidak ada part reject yang dikembalikan untuk rework saat ini.
                  </td>
                </tr>
              ) : (
                transfers.map((trf) => (
                  <tr key={trf.id} className="hover:bg-orange-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 text-sm group-hover:text-orange-600 transition-colors">
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
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {trf.items?.map((it: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="font-extrabold text-gray-800">{it.product_name}</span>
                            <span className="text-[10px] font-black px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                              {it.qty_sent} {it.unit || "PCS"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-semibold">
                      {trf.transferred_by || "Staff QC"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                        trf.status === "Received"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : "bg-amber-50 text-amber-600 border border-amber-200 animate-pulse"
                      }`}>
                        {trf.status === "Received" ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                        {trf.status === "Received" ? "Sedang Di-Rework" : "Menunggu Penerimaan"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedTransfer(trf);
                          setOperatorName("");
                          setNotes("");
                          setIsModalOpen(true);
                        }}
                        className={`px-4 py-2 rounded-xl font-black text-xs transition-all ${
                          trf.status === "Received"
                            ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            : "bg-orange-600 text-white hover:bg-orange-700 shadow-md shadow-orange-200 active:scale-95"
                        }`}
                      >
                        {trf.status === "Received" ? "Lihat Checksheet" : "Terima Rework"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl border border-gray-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-4 border-b border-gray-100 flex justify-between items-center shrink-0 bg-orange-50/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-200">
                  <Wrench size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Checksheet Penerimaan Part Rework</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">Dokumen: {selectedTransfer.reference_no}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-white text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmRework} className="p-8 pt-4 overflow-y-auto flex-1 space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Operator Rework Penerima</label>
                <input
                  type="text"
                  placeholder="Nama teknisi / operator perbaikan"
                  value={selectedTransfer.status === "Received" ? selectedTransfer.received_by : operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  required
                  disabled={selectedTransfer.status === "Received"}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Rencana Aksi Perbaikan (Rework Action)</label>
                <select
                  value={reworkAction}
                  onChange={(e) => setReworkAction(e.target.value)}
                  disabled={selectedTransfer.status === "Received"}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Deburring / Trimming Ulang">Deburring / Trimming Ulang (Flash/Burr)</option>
                  <option value="Polish & Cleaning Permukaan">Polish & Cleaning Permukaan Part</option>
                  <option value="Repair Perakitan & Clip Replacement">Repair Perakitan & Clip Replacement</option>
                  <option value="Koreksi Dimensi / Re-heating">Koreksi Dimensi / Re-heating</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Catatan Tambahan</label>
                <input
                  type="text"
                  placeholder="Keterangan perbaikan part..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={selectedTransfer.status === "Received"}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold"
                >
                  Tutup
                </button>
                {selectedTransfer.status !== "Received" && (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-200 hover:bg-orange-700 flex items-center gap-2"
                  >
                    <FileCheck2 size={14} /> {submitting ? "Menyimpan..." : "Konfirmasi Mulai Rework"}
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
