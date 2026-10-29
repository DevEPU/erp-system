"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  FileText,
  UserCheck,
  Send,
  X
} from "lucide-react";
import api from "@/lib/api";

export default function CustomerClaimFgPage() {
  const router = useRouter();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [qtyClaim, setQtyClaim] = useState(1);
  const [claimDate, setClaimDate] = useState(new Date().toISOString().split("T")[0]);
  const [ngType, setNgType] = useState("Visual Defect (Scratch/Dent)");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchClaims();
  }, [search]);

  useEffect(() => {
    if (isModalOpen) {
      fetchMasterData();
    }
  }, [isModalOpen]);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/internal-transfers", {
        params: {
          transfer_type: "CUSTOMER_CLAIM_TO_FG",
          search
        }
      });
      setClaims(res.data.data || []);
    } catch (err) {
      console.error("Error fetching customer claims:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        api.express.get("/customers").catch(() => ({ data: { data: [] } })),
        api.express.get("/products", { params: { limit: 500 } }).catch(() => ({ data: { data: [] } }))
      ]);
      setCustomers(custRes.data.data || []);
      setProducts(prodRes.data.data || []);
    } catch (err) {
      console.error("Error fetching master data:", err);
    }
  };

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !productId) {
      alert("Mohon pilih customer dan produk yang diklaim.");
      return;
    }
    setSubmitting(true);
    try {
      const selectedProd = products.find(p => String(p.id) === String(productId));
      const selectedCust = customers.find(c => String(c.id) === String(customerId));

      const payload = {
        transfer_type: "CUSTOMER_CLAIM_TO_FG",
        type_code: "CLM-WFG",
        from_warehouse_id: null, // Dari Customer
        to_warehouse_id: 3, // Karantina Gudang FG
        transferred_by: selectedCust?.name || "Customer Claim",
        transfer_date: claimDate,
        notes: `Tipe Defect: ${ngType} | Catatan: ${notes}`,
        items: [
          {
            product_id: Number(productId),
            qty_sent: Number(qtyClaim),
            package_type: "Part Klaim Karantina",
            unit: selectedProd?.product_unit || "PCS"
          }
        ]
      };

      const res = await api.express.post("/internal-transfers", payload);
      // Auto receive into quarantine
      if (res.data.id) {
        await api.express.post(`/internal-transfers/${res.data.id}/receive`, {
          received_by: "Staff Karantina FG",
          received_date: claimDate,
          notes: "Masuk area karantina FG menunggu investigasi Quality Gate",
          items: [{ qty_received: Number(qtyClaim), qty_rejected: 0 }]
        });
      }

      setIsModalOpen(false);
      setNotes("");
      alert("Penerimaan barang klaim customer ke area karantina FG berhasil dicatat!");
      fetchClaims();
    } catch (err: any) {
      console.error("Error creating customer claim receipt:", err);
      alert(err.message || "Gagal mencatat penerimaan klaim.");
    } finally {
      setSubmitting(false);
    }
  };

  // Kirim ke QC Gate untuk investigasi
  const handleForwardToQc = async (claim: any) => {
    if (!confirm(`Kirim part klaim ${claim.reference_no} ke Quality Gate untuk proses sortir dan investigasi?`)) return;
    try {
      const it = claim.items?.[0] || {};
      const payload = {
        transfer_type: "FG_TO_QC_CLAIM",
        type_code: "WFG-QCG",
        from_warehouse_id: 3, // Karantina FG
        to_warehouse_id: null, // Pos QC Gate
        source_reference: claim.reference_no,
        transferred_by: "Staff Karantina FG",
        transfer_date: new Date().toISOString().split("T")[0],
        notes: `Transfer part klaim dari ${claim.reference_no} ke pos investigasi QC Gate`,
        items: [
          {
            product_id: it.product_id,
            qty_sent: Number(it.qty_received || it.qty_sent),
            unit: it.unit || "PCS"
          }
        ]
      };
      await api.express.post("/internal-transfers", payload);
      alert("Part klaim berhasil dikirim ke pos Quality Gate untuk diinvestigasi!");
      router.push("/manufacturing/qc-claim-investigasi");
    } catch (err: any) {
      console.error("Error forwarding claim to QC:", err);
      alert(err.message || "Gagal mengirim part klaim ke QC Gate.");
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
            <div className="p-3 bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl shadow-lg shadow-rose-200">
              <ShieldAlert className="text-white" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700">
                  No. 14
                </span>
                <h1 className="text-3xl font-black tracking-tight text-gray-900">
                  Customer Claim ke Gudang FG <span className="text-rose-600">(IN)</span>
                </h1>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Penerimaan Barang Retur / Klaim Cacat dari Customer ke Area Karantina Gudang Finished Goods
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setClaimDate(new Date().toISOString().split("T")[0]);
            setCustomerId("");
            setProductId("");
            setQtyClaim(1);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-gray-900 hover:bg-rose-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-100 transition-all active:scale-95"
        >
          <Plus size={16} strokeWidth={3} /> Catat Barang Klaim Masuk
        </button>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari nomor klaim atau catatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-500/20 focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">No. Dokumen / Tanggal</th>
                <th className="px-6 py-4">Customer Pengklaim</th>
                <th className="px-6 py-4">Part / Produk Cacat</th>
                <th className="px-6 py-4">Status & Lokasi</th>
                <th className="px-6 py-4 text-center">Teruskan ke QC Gate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-6"><div className="h-8 bg-gray-100 rounded-xl w-full"></div></td>
                  </tr>
                ))
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                    Belum ada barang klaim customer di area karantina FG.
                  </td>
                </tr>
              ) : (
                claims.map((clm) => (
                  <tr key={clm.id} className="hover:bg-rose-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-black text-gray-900 text-sm group-hover:text-rose-600 transition-colors">
                        {clm.reference_no}
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold mt-0.5 flex items-center gap-1">
                        <Calendar size={10} /> {clm.transfer_date}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800">
                      {clm.transferred_by || "Customer"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {clm.items?.map((it: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="font-extrabold text-gray-800">{it.product_name}</span>
                            <span className="text-[10px] font-black px-2 py-0.5 bg-rose-50 text-rose-700 rounded">
                              {it.qty_sent} {it.unit || "PCS"}
                            </span>
                          </div>
                        ))}
                        <p className="text-[10px] text-gray-400 font-semibold">{clm.notes}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200 inline-flex items-center gap-1">
                        <AlertTriangle size={10} /> Karantina FG
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleForwardToQc(clm)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-md shadow-indigo-100 transition-all active:scale-95 inline-flex items-center gap-1.5"
                      >
                        <Send size={12} /> Kirim ke QC Gate <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl border border-gray-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-4 border-b border-gray-100 flex justify-between items-center shrink-0 bg-rose-50/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-200">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Penerimaan Barang Klaim Customer</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">Catat part retur klaim ke area karantina Gudang Finished Goods</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-white text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateClaim} className="p-8 pt-4 overflow-y-auto flex-1 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tanggal Penerimaan</label>
                  <input
                    type="date"
                    value={claimDate}
                    onChange={(e) => setClaimDate(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Customer Pengirim Klaim</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="">-- Pilih Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name || c.customer_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Part / Produk Jadi yang Diklaim</label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="">-- Pilih Produk --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.product_name} ({p.product_code})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Jumlah QTY Klaim</label>
                  <input
                    type="number"
                    min={1}
                    value={qtyClaim}
                    onChange={(e) => setQtyClaim(Number(e.target.value))}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black text-center"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Kategori Cacat (NG Type)</label>
                <select
                  value={ngType}
                  onChange={(e) => setNgType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                >
                  <option value="Visual Defect (Scratch/Dent)">Visual Defect (Scratch, Dent, Baret)</option>
                  <option value="Dimensi / Fitting Tidak Pas">Dimensi / Fitting Tidak Pas</option>
                  <option value="Warna Belang / Silver Streak">Warna Belang / Silver Streak</option>
                  <option value="Part Patah / Crack">Part Patah / Crack</option>
                  <option value="Salah Kirim Item (Wrong Item)">Salah Kirim Item (Wrong Item)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Catatan / Bukti Nomor SJ Klaim</label>
                <input
                  type="text"
                  placeholder="Contoh: No. Surat Pengembalian Customer #CLM-892"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-gray-100 rounded-xl text-xs font-bold">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-rose-200">
                  {submitting ? "Menyimpan..." : "Simpan Masuk Karantina FG"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
