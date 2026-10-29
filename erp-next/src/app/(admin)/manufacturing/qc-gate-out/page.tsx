"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  Boxes,
  ShieldCheck,
  PackageCheck,
  X
} from "lucide-react";
import api from "@/lib/api";

interface ProductionOutput {
  id: string;
  pro_id: string;
  pro_code: string;
  wo_reference?: string;
  product_name: string;
  product_code: string;
  qty_ok: number;
  qty_ng: number;
  status: "WIP" | "Verified_QC" | "Rejected" | "Received_FG";
  created_at: string;
}

export default function QcGateOutPage() {
  const router = useRouter();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [outputs, setOutputs] = useState<ProductionOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<"pending" | "history">("pending");
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trfRes, poRes] = await Promise.all([
        api.express.get("/internal-transfers", {
          params: { transfer_type: "QC_TO_FG", search }
        }).catch(() => null),
        api.express.get("/manufacturing/production-outputs").catch(() => null)
      ]);

      setTransfers(trfRes?.data?.data || []);
      if (poRes?.data && poRes.data.success) {
        setOutputs(poRes.data.data);
        try {
          localStorage.setItem("erp_epu_production_outputs", JSON.stringify(poRes.data.data));
        } catch {}
      } else {
        try {
          const stored = localStorage.getItem("erp_epu_production_outputs");
          if (stored) setOutputs(JSON.parse(stored));
        } catch {}
      }
    } catch (err) {
      console.error("Error fetching transfers from QC to FG:", err);
      try {
        const stored = localStorage.getItem("erp_epu_production_outputs");
        if (stored) setOutputs(JSON.parse(stored));
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const handleTransferToFg = async (output: ProductionOutput) => {
    if (!confirm(`Konfirmasi penyerahan ${Number(output.qty_ok).toLocaleString()} Pcs item ${output.product_name} ke Gudang Finished Goods?`)) {
      return;
    }
    setSubmittingId(output.id);
    try {
      const res = await api.express.post(`/manufacturing/production-outputs/${output.id}/fg-receive`, {
        qty_received: Number(output.qty_ok)
      });
      if (res && res.data && res.data.success) {
        alert(`Sukses! ${Number(output.qty_ok).toLocaleString()} Pcs part telah berhasil diterima ke Gudang Finished Goods (WHFG).`);
        fetchData();
      }
    } catch (err: any) {
      alert("Gagal memproses serah-terima ke FG: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingId(null);
    }
  };

  const isVerifiedStatus = (status: string) =>
    status === "Verified_QC" || status === "VERIFIED (SIAP MASUK FG)" || status?.toLowerCase().includes("verified");

  const verifiedPending = outputs.filter(
    (o) =>
      isVerifiedStatus(o.status) &&
      (o.pro_code?.toLowerCase().includes(search.toLowerCase()) ||
        o.product_name?.toLowerCase().includes(search.toLowerCase()) ||
        o.product_code?.toLowerCase().includes(search.toLowerCase()) ||
        o.wo_reference?.toLowerCase().includes(search.toLowerCase()))
  );

  const receivedOutputs = outputs.filter(
    (o) =>
      (o.status === "Received_FG" || o.status?.toLowerCase().includes("received")) &&
      (o.pro_code?.toLowerCase().includes(search.toLowerCase()) ||
        o.product_name?.toLowerCase().includes(search.toLowerCase()) ||
        o.product_code?.toLowerCase().includes(search.toLowerCase()) ||
        o.wo_reference?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen animate-in fade-in duration-500">
      <button
        onClick={() => router.push("/manufacturing/qc-gate?tab=alur12")}
        className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
      >
        <ArrowLeft size={14} /> Kembali ke Quality Control Hub
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-teal-600 to-emerald-700 rounded-2xl shadow-lg shadow-teal-200">
              <Send className="text-white" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-700">
                  No. 12
                </span>
                <h1 className="text-3xl font-black tracking-tight text-gray-900">
                  Quality Gate ke Warehouse FG <span className="text-teal-600">(OUT)</span>
                </h1>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Dokumen Serah-Terima Pengeluaran Part yang Lolos Uji Mutu (OK) dari Quality Gate ke Gudang Finished Goods
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/persediaan-barang/penerimaan-fg")}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-100 transition-all active:scale-95"
          >
            <PackageCheck size={16} strokeWidth={3} /> Buka Penerimaan FG <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Sub-tab pills */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab("pending")}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeSubTab === "pending"
                ? "bg-teal-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Siap Masuk FG ({outputs.filter((o) => o.status === "Verified_QC").length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("history")}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeSubTab === "history"
                ? "bg-teal-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Riwayat Selesai ({outputs.filter((o) => o.status === "Received_FG").length + transfers.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari referensi PrO, part, atau kode WO..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        {activeSubTab === "pending" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">No. PrO & Work Order</th>
                  <th className="px-6 py-4">Produk / Part</th>
                  <th className="px-6 py-4 text-center">Qty Lolos QC</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Tindakan Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-6"><div className="h-8 bg-gray-100 rounded-xl w-full"></div></td>
                    </tr>
                  ))
                ) : verifiedPending.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                      Tidak ada part lolos QC yang menunggu diserahkan ke Gudang Jadi.
                    </td>
                  </tr>
                ) : (
                  verifiedPending.map((o) => (
                    <tr key={o.id} className="hover:bg-teal-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-gray-900">{o.pro_code}</div>
                        {o.wo_reference && (
                          <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                            WO: {o.wo_reference}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-black text-gray-900">{o.product_name}</div>
                        <div className="text-[10px] text-gray-400 font-bold">{o.product_code}</div>
                      </td>
                      <td className="px-6 py-4 text-center font-black text-emerald-600 text-sm">
                        {Number(o.qty_ok).toLocaleString()} Pcs
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200">
                          <CheckCircle2 size={10} />
                          Verified (Siap Masuk FG)
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleTransferToFg(o)}
                          disabled={submittingId === o.id}
                          className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white shadow-md shadow-blue-200 transition-all inline-flex items-center gap-1.5"
                        >
                          <PackageCheck size={14} />
                          <span>{submittingId === o.id ? "Memproses..." : "Terima Barang Jadi"}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">No. Dokumen / Tanggal</th>
                  <th className="px-6 py-4">Referensi WO / Batch</th>
                  <th className="px-6 py-4">Part Lolos Uji Mutu (OK)</th>
                  <th className="px-6 py-4 text-center">Qty Diterima</th>
                  <th className="px-6 py-4 text-center">Status di Gudang FG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {receivedOutputs.length === 0 && transfers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                      Belum ada riwayat part yang dibukukan di Gudang Finished Goods.
                    </td>
                  </tr>
                ) : (
                  <>
                    {receivedOutputs.map((o) => (
                      <tr key={`po-${o.id}`} className="hover:bg-teal-50/20 transition-colors">
                        <td className="px-6 py-4 font-black text-gray-900">{o.pro_code}</td>
                        <td className="px-6 py-4 font-bold text-gray-700">
                          {o.wo_reference ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                              WO: {o.wo_reference}
                            </span>
                          ) : "-"}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-800">{o.product_name}</td>
                        <td className="px-6 py-4 text-center font-black text-emerald-600">
                          {Number(o.qty_ok).toLocaleString()} Pcs
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <CheckCircle2 size={10} /> Diterima di Gudang FG
                          </span>
                        </td>
                      </tr>
                    ))}
                    {transfers.map((trf) => (
                      <tr key={`trf-${trf.id}`} className="hover:bg-teal-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-black text-gray-900 text-sm group-hover:text-teal-600 transition-colors">
                            {trf.reference_no}
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold mt-0.5 flex items-center gap-1">
                            <Calendar size={10} /> {trf.transfer_date}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-700">{trf.source_reference || "-"}</td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {trf.items?.map((it: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="font-extrabold text-gray-800">{it.product_name}</span>
                                <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                                  {it.qty_sent} {it.unit || "PCS"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-black text-emerald-600">
                          {trf.items?.reduce((acc: number, it: any) => acc + Number(it.qty_sent || 0), 0)} Pcs
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <CheckCircle2 size={10} /> Diterima di Gudang FG
                          </span>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
