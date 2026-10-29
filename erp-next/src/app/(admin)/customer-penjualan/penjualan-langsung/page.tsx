"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ShoppingBag, X, Trash, Eye } from "lucide-react";
import api from "@/lib/api";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import ProductSearchDropdown, { type ProductOption } from "@/components/ui/ProductSearchDropdown";

type SalesDetail = {
  id?: number;
  product_id?: number | null;
  product_name: string;
  product_code?: string | null;
  product_unit?: string | null;
  qty: number;
  price: number;
};

type PenjualanLangsung = {
  id?: number;
  reference?: string;
  customer_id: number | "";
  customer_name?: string;
  date: string;
  note?: string;
  status: string;
  details: SalesDetail[];
};

export default function PenjualanLangsungPage() {
  const [data, setData] = useState<PenjualanLangsung[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { isOpen, type, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading } = useStatusModal();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PenjualanLangsung | null>(null);
  const [formData, setFormData] = useState<PenjualanLangsung>({
    customer_id: "", date: new Date().toISOString().split("T")[0], note: "", status: "Draft", details: []
  });

  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  const fetchDropdowns = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        api.express.get("/customers-list"),
        api.express.get("/products", { limit: 9999 })
      ]);
      setCustomers((custRes.data.data || []).map((c: any) => ({ value: c.id, label: c.customer_name })));
      setProducts(prodRes.data.data || []);
    } catch {}
  };

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.express.get("/penjualan-langsung", { page: p, search });
      setData(res.data.data || []);
      setPage(res.data.current_page || 1);
      setTotalPages(res.data.last_page || 1);
    } catch { setData([]); } finally { setLoading(false); }
  };

  useEffect(() => { fetchDropdowns(); const t = setTimeout(() => fetchData(1), 400); return () => clearTimeout(t); }, [search]);

  const handleItemChange = (idx: number, key: keyof SalesDetail, val: any) => {
    const next = [...formData.details]; next[idx] = { ...next[idx], [key]: val }; setFormData({ ...formData, details: next });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) return showError("Validation", "Pilih customer terlebih dahulu.");
    if (formData.details.length === 0) return showError("Validation", "Tambahkan minimal satu item.");
    try {
      if (selectedInvoice?.id) {
        await api.express.put(`/penjualan-langsung/${selectedInvoice.id}`, formData);
        showSuccess("Success", "Penjualan Langsung berhasil diperbarui.");
      } else {
        await api.express.post("/penjualan-langsung", formData);
        showSuccess("Success", "Penjualan Langsung berhasil disimpan.");
      }
      setIsModalOpen(false); fetchData(page);
    } catch (err: any) { showError("Error", err.response?.data?.message || err.message); }
  };

  const handleDelete = (id: number) => {
    showConfirm("Confirm Delete", "Hapus data Penjualan Langsung ini?", async () => {
      try { await api.express.delete(`/penjualan-langsung/${id}`); showSuccess("Success", "Berhasil dihapus."); fetchData(page); }
      catch (err: any) { showError("Error", err.message); }
    });
  };

  const grandTotal = formData.details.reduce((s, i) => s + i.qty * i.price, 0);
  const calcTotal = (details: SalesDetail[]) => details.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <StatusModal isOpen={isOpen} type={type} title={title} message={message} onConfirm={onConfirm} onClose={closeModal} isLoading={isActionLoading} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-600 rounded-2xl shadow-lg shadow-violet-200"><ShoppingBag className="text-white" size={28} /></div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">Penjualan <span className="text-violet-600">Langsung</span></h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">Catat transaksi penjualan langsung tanpa melalui dokumen Order Sheet atau Surat Jalan.</p>
        </div>
        <button onClick={() => { setFormData({ customer_id: "", date: new Date().toISOString().split("T")[0], note: "", status: "Draft", details: [] }); setSelectedInvoice(null); setIsModalOpen(true); }}
          className="flex items-center gap-3 bg-gray-900 hover:bg-violet-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95">
          <Plus size={20} strokeWidth={3} /><span>Tambah Baru</span>
        </button>
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<ShoppingBag size={20} />} iconBgColor="bg-violet-50" iconColor="text-violet-600" label="TOTAL PENJUALAN" value={data.length} />
        <StatCard icon={<ShoppingBag size={20} />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" label="TOTAL OMZET" value={`Rp ${data.reduce((s, i: any) => s + calcTotal(i.details || []), 0).toLocaleString()}`} />
      </div>

      <div className="mb-8"><FilterBar searchPlaceholder="Cari data penjualan langsung..." searchValue={search} onSearchChange={setSearch} /></div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100">
                {["No", "No. Faktur", "Customer", "Tanggal", "Grand Total", "Status", "Aksi"].map(h => (
                  <th key={h} className={`px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest ${h === "Aksi" ? "text-center" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
              ) : data.length > 0 ? (
                data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">{(page - 1) * 10 + idx + 1}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{item.reference}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.customer_name || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.date}</td>
                    <td className="px-6 py-4 text-sm font-black text-indigo-600">Rp {calcTotal(item.details || []).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${item.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={async () => { const r = await api.express.get(`/penjualan-langsung/${item.id}`); if (r.data.success) { setSelectedInvoice(r.data.data); setIsDetailOpen(true); } }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Eye size={16} /></button>
                        <button onClick={async () => { const r = await api.express.get(`/penjualan-langsung/${item.id}`); if (r.data.success) { setFormData(r.data.data); setSelectedInvoice(r.data.data); setIsModalOpen(true); } }} className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id!)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center"><ShoppingBag size={28} className="text-violet-600" /></div>
                    <p className="font-semibold">Belum ada data Penjualan Langsung</p>
                    <p className="text-xs text-gray-300">Klik "Tambah Baru" untuk mencatat penjualan pertama</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} totalItems={(page - 1) * 10 + data.length} onPageChange={fetchData} />
      </div>

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-800">{selectedInvoice ? "Edit Penjualan Langsung" : "Tambah Penjualan Langsung Baru"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Customer</label>
                  <SearchableSelect options={customers} placeholder="Pilih Customer..." value={formData.customer_id} onChange={(val) => setFormData({ ...formData, customer_id: val })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Tanggal Penjualan</label>
                  <input type="date" required className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-violet-100 focus:border-violet-500 outline-none text-sm font-semibold" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>
                {selectedInvoice && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Status</label>
                    <div className="flex gap-4 mt-2">
                      {['Draft', 'Approved'].map(st => (
                        <label key={st} className="flex items-center gap-2 cursor-pointer font-bold text-sm text-gray-700">
                          <input type="radio" name="status" value={st} checked={formData.status === st} onChange={() => setFormData({ ...formData, status: st })} className="text-violet-600 focus:ring-violet-500" />
                          {st}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Keterangan</label>
                <textarea rows={2} className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-violet-100 outline-none text-sm" placeholder="Memo..." value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} />
              </div>

              <div className="border-t border-gray-100 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest">Daftar Item Penjualan</h4>
                  <button type="button" onClick={() => setFormData({ ...formData, details: [...formData.details, { product_id: null, product_name: "", product_code: "", product_unit: "PCS", qty: 1, price: 0 }] })}
                    className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1 shadow-md">
                    <Plus size={14} /> Tambah Item
                  </button>
                </div>

                <div className="border border-gray-100 rounded-xl overflow-visible">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-400 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Produk</th>
                        <th className="px-4 py-3 text-center w-24">Unit</th>
                        <th className="px-4 py-3 text-center w-28">Qty</th>
                        <th className="px-4 py-3 text-right w-40">Harga (Rp)</th>
                        <th className="px-4 py-3 text-right w-44">Subtotal</th>
                        <th className="px-4 py-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {formData.details.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-3 space-y-1">
                            <ProductSearchDropdown
                              products={products}
                              value={item.product_id || ""}
                              useSalePrice
                              onChange={(p) => {
                                if (!p.id) return;
                                const next = [...formData.details];
                                next[idx] = {
                                  ...next[idx],
                                  product_id: p.id,
                                  product_name: p.product_name,
                                  product_code: p.product_code || "",
                                  product_unit: p.product_unit || "PCS",
                                  price: Number(p.sale_price || p.product_price || 0),
                                };
                                setFormData({ ...formData, details: next });
                              }}
                            />
                          </td>
                          <td className="p-3"><input type="text" className="w-full px-2 py-1.5 bg-gray-50 rounded-lg text-center font-bold text-xs border-none" value={item.product_unit || ""} onChange={(e) => handleItemChange(idx, "product_unit", e.target.value)} /></td>
                          <td className="p-3"><input type="number" required min={1} className="w-full px-2 py-1.5 bg-gray-50 rounded-lg text-center font-black text-sm border-none" value={item.qty} onChange={(e) => handleItemChange(idx, "qty", Number(e.target.value))} /></td>
                          <td className="p-3"><input type="number" required className="w-full px-3 py-1.5 bg-gray-50 rounded-lg text-right font-black text-sm border-none" value={item.price} onChange={(e) => handleItemChange(idx, "price", Number(e.target.value))} /></td>
                          <td className="p-3 text-right font-black text-sm text-gray-800">Rp {(item.qty * item.price).toLocaleString()}</td>
                          <td className="p-3 text-center"><button type="button" onClick={() => { const n = [...formData.details]; n.splice(idx, 1); setFormData({ ...formData, details: n }); }} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash size={16} /></button></td>
                        </tr>
                      ))}
                      {formData.details.length > 0 && (
                        <tr className="bg-violet-50/30">
                          <td colSpan={4} className="p-4 text-right font-black text-xs uppercase tracking-widest text-gray-400">Grand Total</td>
                          <td className="p-4 text-right font-black text-base text-violet-700">Rp {grandTotal.toLocaleString()}</td>
                          <td></td>
                        </tr>
                      )}
                      {formData.details.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-xs">Belum ada item. Klik "Tambah Item" untuk menambahkan produk yang dijual.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Batal</button>
                <button type="submit" className="px-8 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-sm font-bold text-white shadow-lg active:scale-95">Simpan Penjualan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {isDetailOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl border border-gray-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black tracking-widest text-violet-600 uppercase">Detail Penjualan Langsung</span>
                <h3 className="text-xl font-black text-gray-800 mt-0.5">{selectedInvoice.reference}</h3>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-3 gap-6 bg-violet-50/30 p-6 rounded-2xl border border-violet-50">
                <div><span className="text-[10px] font-black text-gray-400 block uppercase">Customer</span><span className="font-extrabold text-gray-800 text-sm">{selectedInvoice.customer_name || "-"}</span></div>
                <div><span className="text-[10px] font-black text-gray-400 block uppercase">Tanggal</span><span className="font-extrabold text-gray-800 text-sm">{selectedInvoice.date}</span></div>
                <div><span className="text-[10px] font-black text-gray-400 block uppercase">Status</span>
                  <span className={`inline-flex mt-1 items-center px-3 py-1 rounded-full text-xs font-black ${selectedInvoice.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{selectedInvoice.status}</span>
                </div>
              </div>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-400 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left">Produk</th>
                      <th className="px-6 py-3 text-center w-24">Unit</th>
                      <th className="px-6 py-3 text-center w-24">Qty</th>
                      <th className="px-6 py-3 text-right w-36">Harga</th>
                      <th className="px-6 py-3 text-right w-40">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {selectedInvoice.details?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4"><span className="font-bold block text-gray-800">{item.product_name}</span><span className="text-[10px] font-mono text-gray-400">{item.product_code || "-"}</span></td>
                        <td className="px-6 py-4 text-center text-gray-600 font-semibold">{item.product_unit || "PCS"}</td>
                        <td className="px-6 py-4 text-center font-bold">{Number(item.qty).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-mono text-gray-600">Rp {Number(item.price).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-black text-violet-600">Rp {(item.qty * item.price).toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-black">
                      <td colSpan={4} className="px-6 py-4 text-right text-xs uppercase tracking-widest text-gray-400">Grand Total</td>
                      <td className="px-6 py-4 text-right text-base text-violet-700">Rp {calcTotal(selectedInvoice.details || []).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {selectedInvoice.note && (
                <div><span className="text-[10px] font-black text-gray-400 block uppercase mb-1">Keterangan</span><p className="text-gray-700 bg-gray-50 p-4 rounded-xl text-sm border border-gray-100">{selectedInvoice.note}</p></div>
              )}
            </div>
            <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button onClick={() => setIsDetailOpen(false)} className="px-6 py-2 bg-gray-900 text-white text-sm font-bold shadow-md">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
