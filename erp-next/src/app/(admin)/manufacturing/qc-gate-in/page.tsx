"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ClipboardCheck,
  FileCheck2,
  AlertCircle,
  X
} from "lucide-react";
import api from "@/lib/api";

export default function QcGateInPage() {
  const router = useRouter();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Checksheet state
  const [inspectorName, setInspectorName] = useState("");
  const [inspectDate, setInspectDate] = useState(new Date().toISOString().split("T")[0]);
  const [checkVisual, setCheckVisual] = useState(true);
  const [checkDimension, setCheckDimension] = useState(true);
  const [checkPacking, setCheckPacking] = useState(true);
  const [notes, setNotes] = useState("");
  const [itemQuantities, setItemQuantities] = useState<Record<number, { ok: number; ng: number }>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTransfers();
  }, [search]);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/internal-transfers", {
        params: {
          transfer_type: "PROD_TO_QC",
          search
        }
      });
      setTransfers(res.data.data || []);
    } catch (err) {
      console.error("Error fetching inbound transfers to QC:", err);
    } finally {
      setLoading(false);
    }
  };

  const openInspectionModal = (transfer: any) => {
    setSelectedTransfer(transfer);
    const initialQty: Record<number, { ok: number; ng: number }> = {};
    if (transfer.items) {
      transfer.items.forEach((it: any) => {
        initialQty[it.id] = { ok: Number(it.qty_sent), ng: 0 };
      });
    }
    setItemQuantities(initialQty);
    setInspectorName("");
    setNotes("");
    setIsModalOpen(true);
  };

  const handleConfirmInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;
    setSubmitting(true);
    try {
      const itemsPayload = selectedTransfer.items.map((it: any) => {
        const counts = itemQuantities[it.id] || { ok: Number(it.qty_sent), ng: 0 };
        return {
          id: it.id,
          qty_received: counts.ok,
          qty_rejected: counts.ng
        };
      });

      const payload = {
        received_by: inspectorName,
        received_date: inspectDate,
        checksheet_data: {
          inspector: inspectorName,
          visual_ok: checkVisual,
          dimension_ok: checkDimension,
          packaging_ok: checkPacking,
          notes
        },
        notes: `Inspeksi QC Gate: ${notes || 'Lolos visual & dimensi'}`,
        items: itemsPayload
      };

      await api.express.post(`/internal-transfers/${selectedTransfer.id}/receive`, payload);

      // Auto generate OUT transfer to FG if there are OK parts (Alur 12)
      const totalOk = itemsPayload.reduce((acc: number, it: any) => acc + it.qty_received, 0);
      if (totalOk > 0) {
        await api.express.post("/internal-transfers", {
          transfer_type: "QC_TO_FG",
          type_code: "QCG-WFG",
          from_warehouse_id: null, // QC Gate
          to_warehouse_id: 3, // Gudang Jadi (FG)
          source_reference: selectedTransfer.reference_no,
          transferred_by: inspectorName,
          transfer_date: inspectDate,
          notes: `Hasil inspeksi lolos QC dari ${selectedTransfer.reference_no} siap serah-terima ke FG`,
          items: selectedTransfer.items
            .filter((it: any) => (itemQuantities[it.id]?.ok || 0) > 0)
            .map((it: any) => ({
              product_id: it.product_id,
              qty_sent: itemQuantities[it.id]?.ok || it.qty_sent,
              unit: it.unit || "PCS",
              package_type: it.package_type
            }))
        });
      }

      setIsModalOpen(false);
      alert("Checksheet inspeksi QC Gate berhasil dicatat, dan slip serah-terima ke Gudang FG otomatis dibuat!");
      fetchTransfers();
    } catch (err: any) {
      console.error("Error confirming QC inspection:", err);
      alert(err.message || "Gagal menyimpan inspeksi QC.");
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
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg shadow-cyan-200">
              <ShieldCheck className="text-white" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-100 text-cyan-700">
                  No. 10
                </span>
                <h1 className="text-3xl font-black tracking-tight text-gray-900">
                  Produksi ke Quality Gate <span className="text-cyan-600">(IN)</span>
                </h1>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Penerimaan Fisik & Checksheet Inspeksi Mutu Barang Datang dari Lantai Produksi di Pos QC Gate
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
            placeholder="Cari slip serah-terima produksi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-cyan-500/20 focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">No. Serah-Terima / Tanggal</th>
                <th className="px-6 py-4">Pengirim (Produksi)</th>
                <th className="px-6 py-4">Part / Produk Datang</th>
                <th className="px-6 py-4 text-center">Status Inspeksi</th>
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
                    Belum ada serah-terima part dari produksi yang menunggu inspeksi.
                  </td>
                </tr>
              ) : (
                transfers.map((trf) => (
                  <tr key={trf.id} className="hover:bg-cyan-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 text-sm group-hover:text-cyan-600 transition-colors">
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
                    <td className="px-6 py-4 text-gray-700 font-semibold">{trf.transferred_by || "Operator Produksi"}</td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {trf.items?.map((it: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="font-extrabold text-gray-800">{it.product_name}</span>
                            <span className="text-[10px] font-black px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded">
                              {it.qty_sent} {it.unit || "PCS"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                        trf.status === "Received"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : "bg-amber-50 text-amber-600 border border-amber-200 animate-pulse"
                      }`}>
                        {trf.status === "Received" ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                        {trf.status === "Received" ? "Lolos & Diterima QC" : "Menunggu Inspeksi QC"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => openInspectionModal(trf)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 mx-auto ${
                          trf.status === "Received"
                            ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-200"
                        }`}
                      >
                        <FileCheck2 size={14} />
                        {trf.status === "Received" ? "Lihat Checksheet" : "Inspeksi Checksheet"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECTION CHECKSHEET MODAL */}
      {isModalOpen && selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl border border-gray-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-4 border-b border-gray-100 flex justify-between items-center shrink-0 bg-cyan-50/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shadow-md shadow-cyan-200">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">
                    {selectedTransfer.status === "Received" ? "Hasil Inspeksi QC Gate" : "Checksheet Inspeksi QC Gate"}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-400 font-bold">Dokumen: {selectedTransfer.reference_no}</p>
                    {selectedTransfer.source_reference && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                        WO: {selectedTransfer.source_reference}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-white text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmInspection} className="p-8 pt-4 overflow-y-auto flex-1 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tanggal Inspeksi</label>
                  <input
                    type="date"
                    value={inspectDate}
                    onChange={(e) => setInspectDate(e.target.value)}
                    required
                    disabled={selectedTransfer.status === "Received"}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nama Inspektor QC</label>
                  <input
                    type="text"
                    placeholder="Nama inspektor"
                    value={selectedTransfer.status === "Received" ? selectedTransfer.received_by : inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    required
                    disabled={selectedTransfer.status === "Received"}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Checklist Parameters */}
              <div className="bg-cyan-50/40 border border-cyan-100 p-4 rounded-2xl space-y-3">
                <p className="text-xs font-black text-cyan-800 uppercase tracking-widest flex items-center gap-1.5">
                  <ClipboardCheck size={14} /> Kriteria Kelulusan Mutu QC Gate
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-cyan-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkVisual}
                      onChange={(e) => setCheckVisual(e.target.checked)}
                      disabled={selectedTransfer.status === "Received"}
                      className="rounded text-cyan-600 focus:ring-cyan-500"
                    />
                    <span className="text-xs font-bold text-gray-700">Visual Bebas Flash / Baret</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-cyan-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkDimension}
                      onChange={(e) => setCheckDimension(e.target.checked)}
                      disabled={selectedTransfer.status === "Received"}
                      className="rounded text-cyan-600 focus:ring-cyan-500"
                    />
                    <span className="text-xs font-bold text-gray-700">Dimensi / Jangka Sorong Sesuai Drawing</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-cyan-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkPacking}
                      onChange={(e) => setCheckPacking(e.target.checked)}
                      disabled={selectedTransfer.status === "Received"}
                      className="rounded text-cyan-600 focus:ring-cyan-500"
                    />
                    <span className="text-xs font-bold text-gray-700">Kemasan Bersih & Label Terpasang</span>
                  </label>
                </div>
              </div>

              {/* Quantity Verification Table */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase">
                      <th className="px-4 py-3">Produk</th>
                      <th className="px-4 py-3 text-center" style={{ width: "110px" }}>QTY Serah</th>
                      <th className="px-4 py-3 text-center" style={{ width: "120px" }}>QTY OK (Lolos)</th>
                      <th className="px-4 py-3 text-center" style={{ width: "120px" }}>QTY NG (Reject)</th>
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
                            min={0}
                            max={it.qty_sent}
                            value={selectedTransfer.status === "Received" ? it.qty_received : (itemQuantities[it.id]?.ok ?? it.qty_sent)}
                            onChange={(e) => {
                              const okVal = Number(e.target.value);
                              const ngVal = Math.max(0, it.qty_sent - okVal);
                              setItemQuantities({
                                ...itemQuantities,
                                [it.id]: { ok: okVal, ng: ngVal }
                              });
                            }}
                            disabled={selectedTransfer.status === "Received"}
                            className="w-full px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 font-black rounded-lg text-center"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            max={it.qty_sent}
                            value={selectedTransfer.status === "Received" ? it.qty_rejected : (itemQuantities[it.id]?.ng ?? 0)}
                            onChange={(e) => {
                              const ngVal = Number(e.target.value);
                              const okVal = Math.max(0, it.qty_sent - ngVal);
                              setItemQuantities({
                                ...itemQuantities,
                                [it.id]: { ok: okVal, ng: ngVal }
                              });
                            }}
                            disabled={selectedTransfer.status === "Received"}
                            className="w-full px-3 py-1.5 bg-white border border-red-200 text-red-600 font-black rounded-lg text-center"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Catatan Tambahan</label>
                <input
                  type="text"
                  placeholder="Keterangan hasil inspeksi..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={selectedTransfer.status === "Received"}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-gray-100 rounded-xl text-xs font-bold">
                  Tutup
                </button>
                {selectedTransfer.status !== "Received" && (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-cyan-600 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-cyan-200 hover:bg-cyan-700 flex items-center gap-2"
                  >
                    <FileCheck2 size={14} /> {submitting ? "Menyimpan..." : "Simpan Checksheet & Rilis ke FG"}
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
