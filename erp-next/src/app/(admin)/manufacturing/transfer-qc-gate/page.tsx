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
  ShieldAlert,
  Boxes,
  Layers,
  FileSpreadsheet,
  FileCheck,
  Truck,
  Trash2,
  X
} from "lucide-react";
import api from "@/lib/api";

export default function TransferQcGatePage() {
  const router = useRouter();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Products and work orders for form
  const [products, setProducts] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [selectedWoId, setSelectedWoId] = useState<string>("");
  const [selectedWoNumber, setSelectedWoNumber] = useState<string>("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
  const [operatorName, setOperatorName] = useState("");
  const [shift, setShift] = useState("Shift 1");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTransfers();
  }, [search]);

  useEffect(() => {
    if (isCreateModalOpen) {
      fetchProducts();
      fetchWorkOrders();
    }
  }, [isCreateModalOpen]);

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
      console.error("Error fetching transfers to QC:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.express.get("/products", { params: { limit: 500 } });
      setProducts(res.data.data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const fetchWorkOrders = async () => {
    try {
      const res = await api.express.get("/manufacturing/work-orders");
      if (res && res.data && res.data.success) {
        setWorkOrders(res.data.data.filter((w: any) => w.status !== "Completed") || []);
      }
    } catch (err) {
      console.error("Error fetching work orders:", err);
    }
  };

  const handleSelectWo = (woId: string) => {
    setSelectedWoId(woId);
    if (!woId) {
      setSelectedWoNumber("");
      return;
    }
    const foundWo = workOrders.find((w) => String(w.id) === String(woId));
    if (foundWo) {
      setSelectedWoNumber(foundWo.wo_number || "");
      // Auto-suggest / pre-populate item if WO has a product linked
      if (foundWo.product_id && items.length === 0) {
        const prod = products.find((p) => p.id === foundWo.product_id) || {
          id: foundWo.product_id,
          product_name: foundWo.product_name || `Produk WO #${foundWo.wo_number}`,
          product_code: foundWo.product_code || "PRD-WO",
          product_unit: foundWo.product_unit || "PCS"
        };
        handleAddItem(prod);
      }
    }
  };

  const handleAddItem = (prod: any) => {
    const exists = items.some(it => it.product_id === prod.id);
    if (exists) {
      alert("Produk ini sudah ada dalam daftar serah-terima.");
      return;
    }
    setItems([
      ...items,
      {
        product_id: prod.id,
        product_name: prod.product_name,
        product_code: prod.product_code,
        unit: prod.product_unit || "PCS",
        qty_sent: 1,
        package_type: "Keranjang / Box",
        package_count: 1
      }
    ]);
    setProductSearch("");
    setIsDropdownOpen(false);
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert("Mohon masukkan minimal 1 produk hasil produksi.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        transfer_type: "PROD_TO_QC",
        type_code: "PRD-QCG",
        from_warehouse_id: 2, // Produksi
        to_warehouse_id: null, // Pos QC Gate (Area Inspeksi)
        source_document_id: selectedWoId ? Number(selectedWoId) : null,
        source_reference: selectedWoNumber || null,
        transferred_by: `${operatorName} (${shift})`,
        transfer_date: transferDate,
        notes: notes || `Serah terima hasil produksi ${selectedWoNumber ? `[WO: ${selectedWoNumber}]` : ""} ke pos Quality Gate`,
        items: items.map(it => ({
          product_id: it.product_id,
          qty_sent: Number(it.qty_sent),
          package_type: it.package_type,
          package_count: Number(it.package_count),
          unit: it.unit
        }))
      };

      await api.express.post("/internal-transfers", payload);

      setIsCreateModalOpen(false);
      setItems([]);
      setSelectedWoId("");
      setSelectedWoNumber("");
      setNotes("");
      alert("Slip serah-terima ke Quality Gate berhasil dibuat!");
      fetchTransfers();
    } catch (err: any) {
      console.error("Error creating transfer to QC:", err);
      alert(err.message || "Gagal membuat slip serah terima.");
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
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl shadow-lg shadow-indigo-200">
              <Send className="text-white" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700">
                  No. 6
                </span>
                <h1 className="text-3xl font-black tracking-tight text-gray-900">
                  Produksi ke Quality Gate <span className="text-indigo-600">(OUT)</span>
                </h1>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Dokumen Serah-Terima Pengiriman Output Produksi untuk Diperiksa di Pos QC Gate
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setTransferDate(new Date().toISOString().split("T")[0]);
            setOperatorName("");
            setItems([]);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-2 bg-gray-900 hover:bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-100 transition-all active:scale-95"
        >
          <Plus size={16} strokeWidth={3} /> Buat Serah-Terima QC
        </button>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari referensi serah terima atau produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
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
                <th className="px-6 py-4">Part / Produk Diserahkan</th>
                <th className="px-6 py-4 text-center">Status di QC Gate</th>
                <th className="px-6 py-4 text-center">Penerima QC</th>
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
                    Belum ada riwayat serah-terima output produksi ke Quality Gate.
                  </td>
                </tr>
              ) : (
                transfers.map((trf) => (
                  <tr key={trf.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">
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
                      {trf.transferred_by || "Operator Produksi"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {trf.items?.map((it: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="font-extrabold text-gray-800">{it.product_name}</span>
                            <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded">
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
                    <td className="px-6 py-4 text-center text-gray-600 font-semibold">
                      {trf.received_by || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl border border-gray-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-4 border-b border-gray-100 flex justify-between items-center shrink-0 bg-indigo-50/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                  <Send size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Buat Serah-Terima Produksi ke QC Gate</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">Serahkan hasil produksi untuk dilakukan inspeksi mutu di Quality Gate</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-full hover:bg-white text-gray-400 hover:text-gray-700 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="p-8 pt-4 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tanggal Serah-Terima</label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Operator / Leader Produksi</label>
                  <input
                    type="text"
                    placeholder="Nama operator penyerah"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Shift Kerja</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Shift 1">Shift 1 (Pagi)</option>
                    <option value="Shift 2">Shift 2 (Siang)</option>
                    <option value="Shift 3">Shift 3 (Malam)</option>
                  </select>
                </div>
              </div>

              {/* Work Order selector */}
              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-blue-900 uppercase tracking-widest">
                    Link ke Work Order (WO) Terkait
                  </label>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-full">
                    Dianjurkan untuk Traceability
                  </span>
                </div>
                <select
                  value={selectedWoId}
                  onChange={(e) => handleSelectWo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Work Order Produksi (Opsional) --</option>
                  {workOrders.map((wo) => (
                    <option key={wo.id} value={wo.id}>
                      {wo.wo_number} | {wo.product_name || "Produk"} ({wo.qty_planned || 0} {wo.product_unit || "PCS"}) - Status: {wo.status}
                    </option>
                  ))}
                </select>
                {selectedWoNumber && (
                  <p className="text-[11px] text-blue-700 font-medium">
                    Output ini akan dihubungkan langsung dengan <b>{selectedWoNumber}</b>.
                  </p>
                )}
              </div>

              {/* Product search */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Pilih Produk Hasil Produksi</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Ketik nama atau kode produk..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-[220px] overflow-y-auto">
                    {products
                      .filter(p => p.product_name?.toLowerCase().includes(productSearch.toLowerCase()) || p.product_code?.toLowerCase().includes(productSearch.toLowerCase()))
                      .slice(0, 10)
                      .map(p => (
                        <div
                          key={p.id}
                          onClick={() => handleAddItem(p)}
                          className="p-3 hover:bg-indigo-50 cursor-pointer flex justify-between items-center text-xs border-b border-gray-50"
                        >
                          <div>
                            <p className="font-bold text-gray-900">{p.product_name}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{p.product_code}</p>
                          </div>
                          <span className="text-[10px] font-black px-2 py-0.5 bg-gray-100 rounded">
                            {p.product_unit || "PCS"}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase">
                      <th className="px-4 py-3">Produk</th>
                      <th className="px-4 py-3 text-center" style={{ width: "140px" }}>QTY Serah</th>
                      <th className="px-4 py-3 text-center" style={{ width: "160px" }}>Jenis Kemasan</th>
                      <th className="px-4 py-3 text-center" style={{ width: "50px" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-400 font-bold">
                          Belum ada item ditambahkan.
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
                              min={1}
                              value={it.qty_sent}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].qty_sent = Number(e.target.value);
                                setItems(newItems);
                              }}
                              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-center font-black outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={it.package_type}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].package_type = e.target.value;
                                setItems(newItems);
                              }}
                              placeholder="Keranjang/Box"
                              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-center text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                            />
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

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Catatan Tambahan</label>
                <input
                  type="text"
                  placeholder="Contoh: Lot cetak mold cavity 1-2, mesin injection #03"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || items.length === 0}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Send size={14} />
                  {submitting ? "Menyimpan..." : "Kirim Serah-Terima ke QC Gate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
