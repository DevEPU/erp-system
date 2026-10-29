"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, BookOpen, X } from "lucide-react";
import api from "@/lib/api";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import SearchableSelect from "@/components/ui/SearchableSelect";

type JurnalPenjualan = {
  id?: number;
  reference?: string;
  customer_id: number | "";
  invoice_reference: string;
  debit: number;
  credit: number;
  date: string;
  description?: string;
};

export default function JurnalPenjualanPage() {
  const [data, setData] = useState<JurnalPenjualan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { isOpen, type, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading } = useStatusModal();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<JurnalPenjualan | null>(null);
  const [formData, setFormData] = useState<JurnalPenjualan>({ customer_id: "", invoice_reference: "", debit: 0, credit: 0, date: new Date().toISOString().split("T")[0], description: "" });
  const [customers, setCustomers] = useState<any[]>([]);

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.express.get("/jurnal-penjualan", { page: p, search });
      setData(res.data.data || []); setPage(res.data.current_page || 1); setTotalPages(res.data.last_page || 1);
    } catch { setData([]); } finally { setLoading(false); }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.express.get("/customers-list");
      setCustomers((res.data.data || []).map((c: any) => ({ value: c.id, label: c.customer_name })));
    } catch {}
  };

  useEffect(() => { fetchCustomers(); }, []);
  useEffect(() => { const t = setTimeout(() => fetchData(1), 400); return () => clearTimeout(t); }, [search]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedItem?.id) await api.express.put(`/jurnal-penjualan/${selectedItem.id}`, formData);
      else await api.express.post("/jurnal-penjualan", formData);
      showSuccess("Success", "Data jurnal berhasil disimpan.");
      setIsModalOpen(false); fetchData(page);
    } catch (err: any) { showError("Error", err.response?.data?.message || err.message); }
  };

  const handleDelete = (id: number) => {
    showConfirm("Confirm Delete", "Hapus data jurnal ini?", async () => {
      try { await api.express.delete(`/jurnal-penjualan/${id}`); showSuccess("Success", "Berhasil dihapus."); fetchData(page); }
      catch (err: any) { showError("Error", err.message); }
    });
  };

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <StatusModal isOpen={isOpen} type={type} title={title} message={message} onConfirm={onConfirm} onClose={closeModal} isLoading={isActionLoading} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-600 rounded-2xl shadow-lg shadow-violet-200"><BookOpen className="text-white" size={28} /></div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">Jurnal <span className="text-violet-600">Penjualan</span></h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">Kelola pencatatan jurnal khusus penjualan.</p>
        </div>
        <button onClick={() => { setFormData({ customer_id: "", invoice_reference: "", debit: 0, credit: 0, date: new Date().toISOString().split("T")[0], description: "" }); setSelectedItem(null); setIsModalOpen(true); }}
          className="flex items-center gap-3 bg-gray-900 hover:bg-violet-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95">
          <Plus size={20} strokeWidth={3} /><span>Tambah Jurnal</span>
        </button>
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<BookOpen size={20} />} iconBgColor="bg-violet-50" iconColor="text-violet-600" label="TOTAL JURNAL" value={data.length} />
        <StatCard icon={<BookOpen size={20} />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" label="TOTAL DEBIT" value={`Rp ${data.reduce((s, i) => s + Number(i.debit), 0).toLocaleString()}`} />
        <StatCard icon={<BookOpen size={20} />} iconBgColor="bg-red-50" iconColor="text-red-600" label="TOTAL KREDIT" value={`Rp ${data.reduce((s, i) => s + Number(i.credit), 0).toLocaleString()}`} />
      </div>

      <div className="mb-8"><FilterBar searchPlaceholder="Cari referensi jurnal..." searchValue={search} onSearchChange={setSearch} /></div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100">
                {["No", "No. Jurnal", "Tgl Jurnal", "Ref Invoice", "Debit", "Kredit", "Deskripsi", "Aksi"].map(h => (
                  <th key={h} className={`px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest ${h === "Aksi" ? "text-center" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
              ) : data.length > 0 ? (
                data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">{(page - 1) * 10 + idx + 1}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{item.reference || `JP-${item.id}`}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.date ? new Date(item.date).toLocaleDateString() : "-"}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-500">{item.invoice_reference || "-"}</td>
                    <td className="px-6 py-4 text-sm font-black text-emerald-600">Rp {Number(item.debit).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-black text-red-600">Rp {Number(item.credit).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{item.description || "-"}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setFormData({ ...item, date: item.date?.split("T")[0] } as any); setSelectedItem(item); setIsModalOpen(true); }} className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id!)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8} className="text-center py-16"><p className="text-gray-400">Belum ada data jurnal</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} totalItems={(page - 1) * 10 + data.length} onPageChange={fetchData} />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl flex flex-col">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-black">{selectedItem ? "Edit Jurnal Penjualan" : "Tambah Jurnal Penjualan"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Customer (Opsional)</label>
                  <SearchableSelect options={customers} placeholder="Pilih Customer..." value={formData.customer_id} onChange={(val) => setFormData({ ...formData, customer_id: val })} />
                </div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Tgl Jurnal</label><input type="date" required className="w-full px-4 py-2 border rounded-xl" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} /></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Ref Invoice</label><input type="text" className="w-full px-4 py-2 border rounded-xl" value={formData.invoice_reference} onChange={e => setFormData({ ...formData, invoice_reference: e.target.value })} /></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Debit (Rp)</label><input type="number" required className="w-full px-4 py-2 border rounded-xl" value={formData.debit} onChange={e => setFormData({ ...formData, debit: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Kredit (Rp)</label><input type="number" required className="w-full px-4 py-2 border rounded-xl" value={formData.credit} onChange={e => setFormData({ ...formData, credit: Number(e.target.value) })} /></div>
                <div className="space-y-1.5 col-span-2"><label className="text-xs font-bold text-gray-500 uppercase">Deskripsi</label><textarea rows={2} className="w-full px-4 py-2 border rounded-xl" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 border rounded-xl font-bold text-gray-600 hover:bg-gray-50">Batal</button>
                <button type="submit" className="px-6 py-2 bg-violet-600 text-white rounded-xl font-bold shadow-lg hover:bg-violet-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
