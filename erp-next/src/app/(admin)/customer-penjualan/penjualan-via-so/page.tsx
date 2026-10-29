"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, FileText, X, Trash, Eye } from "lucide-react";
import api from "@/lib/api";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import ProductSearchDropdown, { type ProductOption } from "@/components/ui/ProductSearchDropdown";
import PrintButton from "@/components/ui/PrintButton";

type SalesDetail = {
  id?: number;
  product_id?: number | null;
  product_name: string;
  product_code?: string | null;
  product_unit?: string | null;
  qty: number;
  price: number;
};

type PenjualanViaSo = {
  id?: number;
  reference?: string;
  customer_id: number | "";
  customer_name?: string;
  order_sheet_ref: string;
  date: string;
  note?: string;
  status: string;
  details: SalesDetail[];
};

export default function PenjualanViaSoPage() {
  const [data, setData] = useState<PenjualanViaSo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { isOpen, type, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading } = useStatusModal();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PenjualanViaSo | null>(null);
  const [formData, setFormData] = useState<PenjualanViaSo>({
    customer_id: "", order_sheet_ref: "", date: new Date().toISOString().split("T")[0], note: "", status: "Draft", details: []
  });

  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [orderSheets, setOrderSheets] = useState<any[]>([]);

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

  const loadOrderSheets = async (customerId: number) => {
    try {
      const res = await api.express.get("/order-sheets", { customer_id: customerId, limit: 1000 });
      setOrderSheets((res.data.data || []).map((o: any) => ({ value: o.reference, label: o.reference })));
    } catch {}
  };

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.express.get("/penjualan-via-so", { page: p, search });
      setData(res.data.data || []);
      setPage(res.data.current_page || 1);
      setTotalPages(res.data.last_page || 1);
    } catch { setData([]); } finally { setLoading(false); }
  };

  useEffect(() => { fetchDropdowns(); const t = setTimeout(() => fetchData(1), 400); return () => clearTimeout(t); }, [search]);
  useEffect(() => { if (formData.customer_id) loadOrderSheets(Number(formData.customer_id)); else setOrderSheets([]); }, [formData.customer_id]);

  const handlePullSOItems = async (osRef: string) => {
    if (!osRef) return;
    setFormData(prev => ({ ...prev, order_sheet_ref: osRef }));
    try {
      const res = await api.express.get("/order-sheets", { limit: 9999 });
      const found = (res.data.data || []).find((o: any) => o.reference === osRef);
      if (found) {
        const detRes = await api.express.get(`/order-sheets/${found.id}`);
        if (detRes.data.success) {
          const newDetails = (detRes.data.data.details || []).map((i: any) => ({
            product_id: i.product_id, product_name: i.product_name,
            product_code: i.product_code, product_unit: i.product_unit || "PCS",
            qty: Number(i.os_qty || 0), price: 0
          }));
          setFormData(prev => ({ ...prev, details: newDetails }));
          showSuccess("Success", `Berhasil memuat ${newDetails.length} item dari Order Sheet ${osRef}.`);
        }
      }
    } catch {}
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) return showError("Validation", "Pilih customer terlebih dahulu.");
    if (formData.details.length === 0) return showError("Validation", "Tambahkan minimal satu item.");
    try {
      if (selectedInvoice?.id) {
        await api.express.put(`/penjualan-via-so/${selectedInvoice.id}`, formData);
        showSuccess("Success", "Faktur Penjualan (S.O.) berhasil diperbarui.");
      } else {
        await api.express.post("/penjualan-via-so", formData);
        showSuccess("Success", "Faktur Penjualan (S.O.) berhasil disimpan.");
      }
      setIsModalOpen(false); fetchData(page);
    } catch (err: any) { showError("Error", err.response?.data?.message || err.message); }
  };

  const handleDelete = (id: number) => {
    showConfirm("Confirm Delete", "Hapus Faktur Penjualan Via S.O. ini?", async () => {
      try { await api.express.delete(`/penjualan-via-so/${id}`); showSuccess("Success", "Berhasil dihapus."); fetchData(page); }
      catch (err: any) { showError("Error", err.message); }
    });
  };

  const handleItemChange = (idx: number, key: keyof SalesDetail, val: any) => {
    const next = [...formData.details]; next[idx] = { ...next[idx], [key]: val }; setFormData({ ...formData, details: next });
  };

  const grandTotal = formData.details.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <StatusModal isOpen={isOpen} type={type} title={title} message={message} onConfirm={onConfirm} onClose={closeModal} isLoading={isActionLoading} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200"><FileText className="text-white" size={28} /></div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">Penjualan Via <span className="text-blue-600">S.O.</span></h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">Fakturkan penjualan langsung dari Sales Order (Order Sheet).</p>
        </div>
        <button onClick={() => { setFormData({ customer_id: "", order_sheet_ref: "", date: new Date().toISOString().split("T")[0], note: "", status: "Draft", details: [] }); setSelectedInvoice(null); setIsModalOpen(true); }}
          className="flex items-center gap-3 bg-gray-900 hover:bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95">
          <Plus size={20} strokeWidth={3} /><span>Tambah Baru</span>
        </button>
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<FileText size={20} />} iconBgColor="bg-blue-50" iconColor="text-blue-600" label="TOTAL INVOICE S.O." value={data.length} />
      </div>

      <div className="mb-8"><FilterBar searchPlaceholder="Cari penjualan via s.o...." searchValue={search} onSearchChange={setSearch} /></div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100">
                {["No", "No. Faktur", "Customer", "Order Sheet Ref", "Tanggal", "Aksi"].map(h => (
                  <th key={h} className={`px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest ${h === "Aksi" ? "text-center" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
              ) : data.length > 0 ? (
                data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">{(page - 1) * 10 + idx + 1}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{item.reference}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.customer_name || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{item.order_sheet_ref || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.date}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <PrintButton
                          moduleKey="sales_invoice"
                          moduleName="Faktur Penjualan"
                          data={{
                            ...item,
                            invoice_number: item.reference || `#INV-${item.id}`,
                            customer_name: item.customer_name || "-",
                            invoice_date: item.date || "-",
                            items: item.details || [],
                          }}
                        />
                        <button onClick={async () => { const r = await api.express.get(`/penjualan-via-so/${item.id}`); if (r.data.success) { setSelectedInvoice(r.data.data); setIsDetailOpen(true); } }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Lihat Detail"><Eye size={16} /></button>
                        <button onClick={async () => { const r = await api.express.get(`/penjualan-via-so/${item.id}`); if (r.data.success) { setFormData(r.data.data); setSelectedInvoice(r.data.data); setIsModalOpen(true); } }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit Data"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id!)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Hapus"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center"><FileText size={28} className="text-blue-600" /></div>
                    <p className="font-semibold">Belum ada Faktur Penjualan Via S.O.</p>
                    <p className="text-xs text-gray-300">Klik "Tambah Baru" untuk membuat faktur pertama</p>
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
          <div className="bg-white rounded-[2rem] w-full max-w-5xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-800">{selectedInvoice ? "Edit Faktur Via S.O." : "Tambah Faktur Via S.O. Baru"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Customer</label>
                  <SearchableSelect options={customers} placeholder="Pilih Customer..." value={formData.customer_id} onChange={(val) => setFormData({ ...formData, customer_id: val })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Tarik dari Order Sheet</label>
                  <SearchableSelect options={orderSheets} disabled={!formData.customer_id} placeholder={formData.customer_id ? "Pilih Order Sheet..." : "Pilih Customer Dahulu"} value={formData.order_sheet_ref} onChange={(val) => handlePullSOItems(String(val))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Tanggal Faktur</label>
                  <input type="date" required className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm font-semibold" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Keterangan</label>
                <textarea rows={2} className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-100 outline-none text-sm" placeholder="Memo..." value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} />
              </div>

              <div className="border-t border-gray-100 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest">Daftar Item</h4>
                  <button type="button" onClick={() => setFormData({ ...formData, details: [...formData.details, { product_id: null, product_name: "", product_code: "", product_unit: "PCS", qty: 1, price: 0 }] })}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1 shadow-md">
                    <Plus size={14} /> Tambah Manual
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
                        <tr className="bg-gray-50/50">
                          <td colSpan={4} className="p-4 text-right font-black text-xs uppercase tracking-widest text-gray-400">Grand Total</td>
                          <td className="p-4 text-right font-black text-base text-indigo-600">Rp {grandTotal.toLocaleString()}</td>
                          <td></td>
                        </tr>
                      )}
                      {formData.details.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-xs">Belum ada item. Tarik dari Order Sheet atau tambah manual.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Batal</button>
                <button type="submit" className="px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-bold text-white shadow-lg active:scale-95">Simpan Faktur</button>
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
                <span className="text-[9px] font-black tracking-widest text-blue-600 uppercase">Detail Faktur Via S.O.</span>
                <h3 className="text-xl font-black text-gray-800 mt-0.5">{selectedInvoice.reference}</h3>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-3 gap-6 bg-blue-50/30 p-6 rounded-2xl border border-blue-50">
                <div><span className="text-[10px] font-black text-gray-400 block uppercase">Customer</span><span className="font-extrabold text-gray-800 text-sm">{selectedInvoice.customer_name || "-"}</span></div>
                <div><span className="text-[10px] font-black text-gray-400 block uppercase">Order Sheet Ref</span><span className="font-extrabold text-gray-800 text-sm font-mono">{selectedInvoice.order_sheet_ref || "-"}</span></div>
                <div><span className="text-[10px] font-black text-gray-400 block uppercase">Tanggal</span><span className="font-extrabold text-gray-800 text-sm">{selectedInvoice.date}</span></div>
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
                        <td className="px-6 py-4 text-right font-black text-indigo-600">Rp {(item.qty * item.price).toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-black">
                      <td colSpan={4} className="px-6 py-4 text-right text-xs uppercase tracking-widest text-gray-400">Grand Total</td>
                      <td className="px-6 py-4 text-right text-base text-indigo-600">Rp {(selectedInvoice.details || []).reduce((s, i) => s + i.qty * i.price, 0).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
