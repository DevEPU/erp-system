"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  PackageCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ClipboardCheck,
  ShieldCheck,
  Activity,
  Layers,
  ArrowRight,
  User,
  Cpu,
  Package,
  Plus,
  Warehouse
} from "lucide-react";
import api from "@/lib/api";
import PrintButton from "@/components/ui/PrintButton";

interface ProductionOutput {
  id: string;
  pro_id: string;
  pro_code: string;
  os_reference?: string;
  wo_reference?: string;
  product_name: string;
  product_code: string;
  qty_ok: number;
  qty_ng: number;
  qty_received?: number;
  status: "WIP" | "Verified_QC" | "Rejected" | "Received_FG";
  created_at: string;
}

export default function PenerimaanFGPage() {
  const router = useRouter();

  // State
  const [outputs, setOutputs] = useState<ProductionOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("Verified_QC"); // Default show QC-verified pending receipt

  // Receive Modal
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedOutput, setSelectedOutput] = useState<ProductionOutput | null>(null);
  const [qtyReceived, setQtyReceived] = useState<number>(0);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOutputs = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/manufacturing/production-outputs").catch(() => null);
      if (res && res.data && res.data.success) {
        setOutputs(res.data.data);
        localStorage.setItem("erp_epu_production_outputs", JSON.stringify(res.data.data));
      } else {
        // Fallback from localStorage or mock
        const stored = localStorage.getItem("erp_epu_production_outputs");
        if (stored) {
          setOutputs(JSON.parse(stored));
        } else {
          const mock = [
            { id: "1", pro_id: "1", pro_code: "PRO/EPU/26/06/0001", os_reference: "OS/26/06/0001", product_name: "HOLDER MIRROR RH 29702-C0100 SAPTA SC", product_code: "HD-MIR-RH-29702", qty_ok: 950, qty_ng: 50, status: "Verified_QC", created_at: "2026-06-14" },
            { id: "2", pro_id: "2", pro_code: "PRO/EPU/26/06/0002", os_reference: "OS/26/06/0001", product_name: "MIRROR BRACKET LH 29701-C0100 SAPTA SC", product_code: "BRK-MIR-LH-29701", qty_ok: 800, qty_ng: 0, status: "Received_FG", qty_received: 800, created_at: "2026-06-12" },
            { id: "3", pro_id: "3", pro_code: "PRO/EPU/26/06/0003", os_reference: "OS/26/06/0002", product_name: "HOUSING MIRROR OUT LH PLASTIC", product_code: "HS-MIR-LH-PL", qty_ok: 2500, qty_ng: 100, status: "WIP", created_at: "2026-06-15" }
          ] as ProductionOutput[];
          setOutputs(mock);
          localStorage.setItem("erp_epu_production_outputs", JSON.stringify(mock));
        }
      }
    } catch (err) {
      console.error("Error fetching production outputs:", err);
      const stored = localStorage.getItem("erp_epu_production_outputs");
      if (stored) setOutputs(JSON.parse(stored));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutputs();
  }, []);

  const handleOpenReceive = (output: ProductionOutput) => {
    setSelectedOutput(output);
    setQtyReceived(output.qty_ok); // default to Qty OK verified by QC
    setNote("");
    setIsReceiveModalOpen(true);
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutput) return;

    if (qtyReceived <= 0) {
      alert("Kuantitas masuk aktual harus lebih dari 0!");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.express.post(`/manufacturing/production-outputs/${selectedOutput.id}/fg-receive`, {
        qty_received: qtyReceived
      }).catch(() => null);

      if (res && res.data && res.data.success) {
        alert(`Sukses menerima ${qtyReceived.toLocaleString()} Pcs item ke Gudang Finished Goods.`);
      } else {
        // Fallback local simulation update
        const updatedOutputs = outputs.map(o => {
          if (o.id === selectedOutput.id) {
            return {
              ...o,
              status: "Received_FG" as const,
              qty_received: qtyReceived
            };
          }
          return o;
        });
        setOutputs(updatedOutputs);
        localStorage.setItem("erp_epu_production_outputs", JSON.stringify(updatedOutputs));
        alert(`[Simulasi] Sukses menerima ${qtyReceived.toLocaleString()} Pcs ke Gudang Finished Goods.`);
      }

      setIsReceiveModalOpen(false);
      setSelectedOutput(null);
      fetchOutputs();
    } catch (err: any) {
      alert("Gagal menerima barang: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter list
  const filteredOutputs = outputs.filter(o => {
    const matchesSearch = 
      o.pro_code.toLowerCase().includes(search.toLowerCase()) ||
      o.product_name.toLowerCase().includes(search.toLowerCase()) ||
      o.product_code.toLowerCase().includes(search.toLowerCase()) ||
      (o.os_reference && o.os_reference.toLowerCase().includes(search.toLowerCase())) ||
      (o.wo_reference && o.wo_reference.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = selectedStatus === "Semua" || o.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  // KPI math
  const pendingReceiptCount = outputs.filter(o => o.status === "Verified_QC").length;
  const totalReceivedCount = outputs.filter(o => o.status === "Received_FG").length;
  const totalReceivedQty = outputs
    .filter(o => o.status === "Received_FG" && o.qty_received)
    .reduce((acc, o) => acc + (o.qty_received || 0), 0);

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen animate-in fade-in duration-500">
      
      {/* Back navigation */}
      <button 
        onClick={() => router.push("/persediaan-barang")}
        className="flex items-center gap-2 text-xs font-black text-emerald-600 hover:text-emerald-800 transition-colors uppercase tracking-widest"
      >
        <ArrowLeft size={14} /> Back to Persediaan Barang
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-lg shadow-indigo-200">
              <Warehouse className="text-white" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700">
                  No. 13
                </span>
                <h1 className="text-4xl font-black tracking-tight text-gray-900">
                  Quality Gate ke Warehouse FG <span className="text-indigo-600">(IN)</span>
                </h1>
              </div>
              <p className="text-gray-500 font-medium ml-1 mt-1 text-xs">
                Penerimaan Fisik Barang Jadi yang Lolos Verifikasi QC ke Persediaan Gudang Finished Goods (WHFG).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Menunggu Penerimaan</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600"><Clock size={18} /></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-amber-600">{pendingReceiptCount}</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Produk telah lolos verifikasi QC, siap disimpan ke rak.
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaksi Selesai</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><CheckCircle2 size={18} /></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-emerald-600">{totalReceivedCount}</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Penerimaan selesai dibukukan di Gudang Jadi.
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Qty Diterima (Actual)</span>
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Package size={18} /></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-indigo-600">{totalReceivedQty.toLocaleString()} <span className="text-xs text-gray-400 font-bold">Pcs</span></h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Akumulasi kuantitas aktual di Gudang Finished Goods.
            </p>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] space-y-4">
        
        {/* Filters and search */}
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-gray-50 rounded-2xl w-max overflow-x-auto">
            {[
              { status: "Verified_QC", label: "Menunggu Penerimaan" },
              { status: "Received_FG", label: "Sudah Diterima" },
              { status: "Semua", label: "Semua Transaksi" }
            ].map((tab) => (
              <button
                key={tab.status}
                onClick={() => setSelectedStatus(tab.status)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  selectedStatus === tab.status 
                    ? "bg-white text-indigo-600 shadow-sm border border-indigo-100/50" 
                    : "text-gray-400 hover:text-gray-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Cari PrO, Order Sheet, produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition-all"
            />
          </div>
        </div>

        {/* Table data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">No. PrO / Ref Order Sheet</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Produk / Part</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty Lolos QC</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty Masuk Aktual</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Tindakan Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-6"><div className="h-10 bg-gray-50 rounded-xl w-full"></div></td>
                  </tr>
                ))
              ) : filteredOutputs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center font-bold text-gray-400 uppercase tracking-widest text-sm bg-gray-50/10">
                    Tidak Ada Data Penerimaan
                  </td>
                </tr>
              ) : filteredOutputs.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="font-black text-gray-950 text-sm">{o.pro_code}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{o.os_reference || o.wo_reference || "-"}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-bold text-gray-800 text-xs truncate max-w-[220px]">{o.product_name}</div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{o.product_code}</div>
                  </td>
                  <td className="px-6 py-5 text-center font-bold text-gray-600 text-xs">
                    {o.qty_ok.toLocaleString()} Pcs
                  </td>
                  <td className="px-6 py-5 text-center font-black text-indigo-600 text-sm">
                    {o.qty_received ? `${o.qty_received.toLocaleString()} Pcs` : "-"}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex justify-center">
                      {o.status === "WIP" && (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-600 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-0.5">
                          <Clock size={10} /> WIP (Menunggu QC)
                        </span>
                      )}
                      {o.status === "Verified_QC" && (
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-0.5">
                          <ShieldCheck size={10} /> Verified (Siap Masuk FG)
                        </span>
                      )}
                      {o.status === "Received_FG" && (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-0.5">
                          <CheckCircle2 size={10} /> Diterima Gudang FG
                        </span>
                      )}
                      {o.status === "Rejected" && (
                        <span className="px-2.5 py-1 bg-red-50 text-red-600 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-0.5">
                          <XCircle size={10} /> Ditolak QC
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <PrintButton
                        moduleKey="penerimaan_fg"
                        moduleName="Penerimaan Gudang Jadi"
                        data={{
                          reference: `#RCV-FG-${o.id}`,
                          wo_number: o.wo_reference || o.pro_code,
                          product_name: o.product_name,
                          qty: o.qty_received || o.qty_ok,
                          date: o.created_at || "-",
                          status: o.status,
                          items: [{
                            product_code: o.product_code,
                            product_name: o.product_name,
                            qty: o.qty_received || o.qty_ok,
                            unit: "PCS",
                          }],
                        }}
                      />
                      {o.status === "Verified_QC" ? (
                        <button
                          onClick={() => handleOpenReceive(o)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95"
                        >
                          <PackageCheck size={14} /> Terima
                        </button>
                      ) : o.status === "Received_FG" ? (
                        <span className="text-xs font-bold text-gray-400">Tersimpan WHFG</span>
                      ) : (
                        <span className="text-xs font-bold text-gray-300">Menunggu QC</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECEIVE MODAL */}
      {isReceiveModalOpen && selectedOutput && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg border border-gray-100 shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <PackageCheck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Pemasukan Gudang Finished Goods</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">PrO: {selectedOutput.pro_code} - {selectedOutput.product_code}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsReceiveModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                [X]
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit} className="space-y-6">
              
              <div className="bg-gray-50 p-4 rounded-2xl space-y-2 text-xs font-bold text-gray-600">
                <div className="flex justify-between">
                  <span>Nama Item:</span>
                  <span className="text-gray-900 text-right max-w-[200px] truncate">{selectedOutput.product_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kode Item:</span>
                  <span className="text-gray-900">{selectedOutput.product_code}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                  <span>Kuantitas Lolos QC:</span>
                  <span className="text-emerald-600 text-sm font-black">{selectedOutput.qty_ok.toLocaleString()} Pcs</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Kuantitas Masuk Aktual (Pcs)</label>
                <input
                  type="number"
                  min={1}
                  value={qtyReceived}
                  onChange={(e) => setQtyReceived(Number(e.target.value))}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-base font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all h-12"
                />
                <p className="text-[10px] text-gray-400 font-semibold">Tentukan jumlah fisik barang yang masuk ke rak penyimpanan Gudang Jadi.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Catatan Lokasi Rak / Keterangan</label>
                <input
                  type="text"
                  placeholder="Contoh: Rak A2-4, Kondisi Baik..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all h-12"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-500 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all h-12"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all h-12 shadow-lg shadow-indigo-100"
                >
                  {isSubmitting ? "Menyimpan..." : "Terima & Debet Stok"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
