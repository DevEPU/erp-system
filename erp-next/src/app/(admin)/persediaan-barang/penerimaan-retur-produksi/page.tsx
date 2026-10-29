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
  Boxes,
  FileCheck2,
  X
} from "lucide-react";
import api from "@/lib/api";

export default function PenerimaanReturProduksiPage() {
  const router = useRouter();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receiverName, setReceiverName] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTransfers();
  }, [search]);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/internal-transfers", {
        params: {
          transfer_type: "PROD_TO_MATKOM_RETURN",
          search
        }
      });
      setTransfers(res.data.data || []);
    } catch (err) {
      console.error("Error fetching return transfers to MATKOM:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;
    setSubmitting(true);
    try {
      const payload = {
        received_by: receiverName,
        received_date: receivedDate,
        notes: "Diterima kembali di rak MATKOM"
      };
      await api.express.post(`/internal-transfers/${selectedTransfer.id}/receive`, payload);
      setIsModalOpen(false);
      alert("Material sisa berhasil diterima kembali ke stok Gudang MATKOM!");
      fetchTransfers();
    } catch (err: any) {
      console.error("Error receiving return material:", err);
      alert(err.message || "Gagal mengonfirmasi penerimaan retur.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen animate-in fade-in duration-500">
      <button
        onClick={() => router.push("/persediaan-barang")}
        className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
      >
        <ArrowLeft size={14} /> Kembali ke Persediaan Barang
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl shadow-lg shadow-teal-200">
              <PackageCheck className="text-white" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-700">
                  No. 4
                </span>
                <h1 className="text-3xl font-black tracking-tight text-gray-900">
                  Produksi ke MATKOM <span className="text-teal-600">(IN)</span>
                </h1>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Konfirmasi Penerimaan Kembali Sisa Bahan Baku dari Lantai Produksi ke Stok Gudang Material
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
            placeholder="Cari nomor pengembalian atau nama material..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">No. Pengembalian / Tanggal</th>
                <th className="px-6 py-4">Material yang Dikembalikan</th>
                <th className="px-6 py-4">Pengirim Produksi</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi Penerimaan</th>
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
                    Tidak ada material sisa yang menunggu penerimaan di MATKOM.
                  </td>
                </tr>
              ) : (
                transfers.map((trf) => (
                  <tr key={trf.id} className="hover:bg-teal-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-black text-gray-900 text-sm group-hover:text-teal-600 transition-colors">
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
                            <span className="text-[10px] font-black px-2 py-0.5 bg-teal-50 text-teal-700 rounded">
                              {it.qty_sent} {it.unit || "KG"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-semibold">{trf.transferred_by || "Operator Produksi"}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                        trf.status === "Received"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : "bg-amber-50 text-amber-600 border border-amber-200 animate-pulse"
                      }`}>
                        {trf.status === "Received" ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                        {trf.status === "Received" ? "Masuk Stok MATKOM" : "Menunggu Konfirmasi"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {trf.status === "Received" ? (
                        <span className="text-gray-400 font-bold text-xs">Selesai (Diterima {trf.received_by})</span>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedTransfer(trf);
                            setReceiverName("");
                            setIsModalOpen(true);
                          }}
                          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black text-xs shadow-md shadow-teal-200 transition-all active:scale-95 inline-flex items-center gap-1.5"
                        >
                          <FileCheck2 size={14} /> Konfirmasi Masuk MATKOM
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

      {isModalOpen && selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg border border-gray-100 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-teal-50/40">
              <h3 className="text-lg font-black text-gray-900">Konfirmasi Penerimaan di MATKOM</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-white text-gray-400">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleConfirmReceive} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tanggal Penerimaan</label>
                <input
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Petugas Gudang MATKOM</label>
                <input
                  type="text"
                  placeholder="Nama petugas pemeriksa fisik"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-bold">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-black uppercase shadow-md shadow-teal-200">
                  {submitting ? "Menyimpan..." : "Konfirmasi & Tambah Stok"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
