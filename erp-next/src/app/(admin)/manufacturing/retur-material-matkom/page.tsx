"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Undo2,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Boxes,
  Trash2,
  Send,
  X
} from "lucide-react";
import api from "@/lib/api";

export default function ReturMaterialMatkomPage() {
  const router = useRouter();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [products, setProducts] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [selectedWoId, setSelectedWoId] = useState<string>("");
  const [selectedWoNumber, setSelectedWoNumber] = useState<string>("");
  const [operatorName, setOperatorName] = useState("");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTransfers();
  }, [search]);

  useEffect(() => {
    if (isModalOpen) {
      fetchProducts();
      fetchWorkOrders();
    }
  }, [isModalOpen]);

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
      console.error("Error fetching material returns:", err);
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
    }
  };

  const handleAddItem = (prod: any) => {
    const exists = items.some(it => it.product_id === prod.id);
    if (exists) {
      alert("Material ini sudah ada dalam daftar pengembalian.");
      return;
    }
    setItems([
      ...items,
      {
        product_id: prod.id,
        product_name: prod.product_name,
        product_code: prod.product_code,
        unit: prod.product_unit || "KG",
        qty_sent: 1,
        notes: selectedWoNumber ? `Sisa kelebihan produksi WO #${selectedWoNumber}` : "Sisa kelebihan produksi"
      }
    ]);
    setProductSearch("");
    setIsDropdownOpen(false);
  };

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert("Mohon pilih minimal 1 material yang akan dikembalikan.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        transfer_type: "PROD_TO_MATKOM_RETURN",
        type_code: "PRD-MAT",
        from_warehouse_id: 2, // Produksi
        to_warehouse_id: 1, // MATKOM
        source_document_id: selectedWoId ? Number(selectedWoId) : null,
        source_reference: selectedWoNumber || null,
        transferred_by: operatorName,
        transfer_date: returnDate,
        notes: notes || `Pengembalian sisa bahan baku produksi ${selectedWoNumber ? `[WO: ${selectedWoNumber}]` : ""} ke MATKOM`,
        items: items.map(it => ({
          product_id: it.product_id,
          qty_sent: Number(it.qty_sent),
          unit: it.unit,
          notes: it.notes
        }))
      };
      await api.express.post("/internal-transfers", payload);
      setIsModalOpen(false);
      setItems([]);
      setSelectedWoId("");
      setSelectedWoNumber("");
      setNotes("");
      alert("Slip pengembalian sisa material ke MATKOM berhasil dibuat!");
      fetchTransfers();
    } catch (err: any) {
      console.error("Error creating material return:", err);
      alert(err.message || "Gagal membuat slip pengembalian material.");
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
            <div className="p-3 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl shadow-lg shadow-rose-200">
              <Undo2 className="text-white" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700">
                  No. 8
                </span>
                <h1 className="text-3xl font-black tracking-tight text-gray-900">
                  Produksi ke MATKOM <span className="text-rose-600">(OUT)</span>
                </h1>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Pengembalian Sisa Bahan Baku yang Tidak Terpakai dari Lantai Produksi ke Gudang Material
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setReturnDate(new Date().toISOString().split("T")[0]);
            setOperatorName("");
            setItems([]);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-gray-900 hover:bg-rose-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-100 transition-all active:scale-95"
        >
          <Plus size={16} strokeWidth={3} /> Buat Pengembalian Bahan
        </button>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari slip pengembalian bahan..."
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
                <th className="px-6 py-4">No. Pengembalian / Tanggal</th>
                <th className="px-6 py-4">Material Dikembalikan</th>
                <th className="px-6 py-4">Pengirim (Produksi)</th>
                <th className="px-6 py-4 text-center">Status di MATKOM</th>
                <th className="px-6 py-4 text-center">Penerima MATKOM</th>
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
                    Belum ada riwayat pengembalian bahan baku dari produksi ke MATKOM.
                  </td>
                </tr>
              ) : (
                transfers.map((trf) => (
                  <tr key={trf.id} className="hover:bg-rose-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 text-sm group-hover:text-rose-600 transition-colors">
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
                            <span className="text-[10px] font-black px-2 py-0.5 bg-rose-50 text-rose-700 rounded">
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
                        {trf.status === "Received" ? "Diterima di MATKOM" : "Menunggu Konfirmasi"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-gray-600">{trf.received_by || "-"}</td>
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
                  <Undo2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Form Pengembalian Sisa Bahan ke MATKOM</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">Kembalikan sisa bahan baku dari lantai produksi ke Gudang Material</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-white text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateReturn} className="p-8 pt-4 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tanggal Pengembalian</label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nama Operator Pengembali</label>
                  <input
                    type="text"
                    placeholder="Nama operator penyerah"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Work Order selector */}
              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-blue-900 uppercase tracking-widest">
                    Asal Work Order (WO) Produksi
                  </label>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-full">
                    Opsional / Traceability
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
                      {wo.wo_number} | {wo.product_name || "Produk"} - Status: {wo.status}
                    </option>
                  ))}
                </select>
                {selectedWoNumber && (
                  <p className="text-[11px] text-blue-700 font-medium">
                    Sisa material ini dicatat kembali dari pelaksanaan WO: <b>{selectedWoNumber}</b>.
                  </p>
                )}
              </div>

              {/* Product search */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Pilih Bahan Baku Sisa</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Ketik nama atau kode material..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-rose-500"
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
                          className="p-3 hover:bg-rose-50 cursor-pointer flex justify-between items-center text-xs border-b border-gray-50"
                        >
                          <div>
                            <p className="font-bold text-gray-900">{p.product_name}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{p.product_code}</p>
                          </div>
                          <span className="text-[10px] font-black px-2 py-0.5 bg-gray-100 rounded">
                            {p.product_unit || "KG"}
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
                      <th className="px-4 py-3">Material</th>
                      <th className="px-4 py-3 text-center" style={{ width: "140px" }}>QTY Kembali</th>
                      <th className="px-4 py-3 text-center" style={{ width: "50px" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-gray-400 font-bold">
                          Belum ada material dipilih.
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
                              min={0.1}
                              step={0.1}
                              value={it.qty_sent}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].qty_sent = Number(e.target.value);
                                setItems(newItems);
                              }}
                              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-center font-black outline-none focus:ring-2 focus:ring-rose-500"
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

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || items.length === 0}
                  className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-200 hover:bg-rose-700 flex items-center gap-2"
                >
                  <Send size={14} /> {submitting ? "Menyimpan..." : "Kirim Pengembalian ke MATKOM"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
