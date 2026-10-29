"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Tag, X } from "lucide-react";
import api from "@/lib/api";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";

type TipeCustomer = {
  id?: number;
  name: string;
  description?: string;
  discount_pct: number;
};

export default function TipeCustomerPage() {
  const [data, setData] = useState<TipeCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { isOpen, type, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading } = useStatusModal();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TipeCustomer | null>(null);
  const [formData, setFormData] = useState<TipeCustomer>({ name: "", description: "", discount_pct: 0 });

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.express.get("/tipe-customer", { page: p, search });
      setData(res.data.data || []); setPage(res.data.current_page || 1); setTotalPages(res.data.last_page || 1);
    } catch { setData([]); } finally { setLoading(false); }
  };

  useEffect(() => { const t = setTimeout(() => fetchData(1), 400); return () => clearTimeout(t); }, [search]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return showError("Validation", "Nama wajib diisi.");
    try {
      if (selectedItem?.id) await api.express.put(`/tipe-customer/${selectedItem.id}`, formData);
      else await api.express.post("/tipe-customer", formData);
      showSuccess("Success", "Data berhasil disimpan.");
      setIsModalOpen(false); fetchData(page);
    } catch (err: any) { showError("Error", err.response?.data?.message || err.message); }
  };

  const handleDelete = (id: number) => {
    showConfirm("Confirm Delete", "Hapus data ini?", async () => {
      try { await api.express.delete(`/tipe-customer/${id}`); showSuccess("Success", "Berhasil dihapus."); fetchData(page); }
      catch (err: any) { showError("Error", err.message); }
    });
  };

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <StatusModal isOpen={isOpen} type={type} title={title} message={message} onConfirm={onConfirm} onClose={closeModal} isLoading={isActionLoading} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-pink-600 rounded-2xl shadow-lg shadow-pink-200"><Tag className="text-white" size={28} /></div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">Tipe <span className="text-pink-600">Customer</span></h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">Kelola kategori/tipe customer dan diskon persentase default-nya.</p>
        </div>
        <button onClick={() => { setFormData({ name: "", description: "", discount_pct: 0 }); setSelectedItem(null); setIsModalOpen(true); }}
          className="flex items-center gap-3 bg-gray-900 hover:bg-pink-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95">
          <Plus size={20} strokeWidth={3} /><span>Tambah Baru</span>
        </button>
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<Tag size={20} />} iconBgColor="bg-pink-50" iconColor="text-pink-600" label="TOTAL TIPE" value={data.length} />
      </div>

      <div className="mb-8"><FilterBar searchPlaceholder="Cari tipe customer..." searchValue={search} onSearchChange={setSearch} /></div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100">
                {["No", "Tipe", "Deskripsi", "Diskon (%)", "Aksi"].map(h => (
                  <th key={h} className={`px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest ${h === "Aksi" ? "text-center" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
              ) : data.length > 0 ? (
                data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">{(page - 1) * 10 + idx + 1}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.description || "-"}</td>
                    <td className="px-6 py-4 text-sm font-black text-pink-600">{Number(item.discount_pct)}%</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setFormData(item); setSelectedItem(item); setIsModalOpen(true); }} className="p-1.5 text-pink-600 hover:bg-pink-50 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id!)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="text-center py-16"><p className="text-gray-400">Belum ada data</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} totalItems={(page - 1) * 10 + data.length} onPageChange={fetchData} />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-black">{selectedItem ? "Edit Tipe" : "Tambah Tipe"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Nama Tipe</label><input type="text" required className="w-full px-4 py-2 border rounded-xl" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
              <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Diskon (%)</label><input type="number" step="0.01" className="w-full px-4 py-2 border rounded-xl" value={formData.discount_pct} onChange={e => setFormData({ ...formData, discount_pct: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Deskripsi</label><textarea rows={3} className="w-full px-4 py-2 border rounded-xl" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 border rounded-xl font-bold text-gray-600 hover:bg-gray-50">Batal</button>
                <button type="submit" className="px-6 py-2 bg-pink-600 text-white rounded-xl font-bold shadow-lg hover:bg-pink-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
