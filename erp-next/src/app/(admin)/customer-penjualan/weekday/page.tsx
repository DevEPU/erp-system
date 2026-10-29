"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Calendar, X } from "lucide-react";
import api from "@/lib/api";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";

type WeekdaySetting = {
  id?: number;
  day_name: string;
  day_number: number;
  is_working: number;
  start_time: string;
  end_time: string;
};

export default function WeekdaySettingsPage() {
  const [data, setData] = useState<WeekdaySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { isOpen, type: modalType, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading } = useStatusModal();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WeekdaySetting | null>(null);
  const [formData, setFormData] = useState<WeekdaySetting>({ day_name: "", day_number: 1, is_working: 1, start_time: "08:00:00", end_time: "17:00:00" });

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.express.get("/weekday-settings", { page: p, search });
      setData(res.data.data || []); setPage(res.data.current_page || 1); setTotalPages(res.data.last_page || 1);
    } catch { setData([]); } finally { setLoading(false); }
  };

  useEffect(() => { const t = setTimeout(() => fetchData(1), 400); return () => clearTimeout(t); }, [search]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedItem?.id) await api.express.put(`/weekday-settings/${selectedItem.id}`, formData);
      else await api.express.post("/weekday-settings", formData);
      showSuccess("Success", "Pengaturan hari berhasil disimpan.");
      setIsModalOpen(false); fetchData(page);
    } catch (err: any) { showError("Error", err.response?.data?.message || err.message); }
  };

  const handleDelete = (id: number) => {
    showConfirm("Confirm Delete", "Hapus data ini?", async () => {
      try { await api.express.delete(`/weekday-settings/${id}`); showSuccess("Success", "Berhasil dihapus."); fetchData(page); }
      catch (err: any) { showError("Error", err.message); }
    });
  };

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <StatusModal isOpen={isOpen} type={modalType} title={title} message={message} onConfirm={onConfirm} onClose={closeModal} isLoading={isActionLoading} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-600 rounded-2xl shadow-lg shadow-cyan-200"><Calendar className="text-white" size={28} /></div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">Weekday <span className="text-cyan-600">Settings</span></h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">Kelola jam operasional dan hari kerja untuk validasi pengiriman.</p>
        </div>
        <button onClick={() => { setFormData({ day_name: "", day_number: 1, is_working: 1, start_time: "08:00:00", end_time: "17:00:00" }); setSelectedItem(null); setIsModalOpen(true); }}
          className="flex items-center gap-3 bg-gray-900 hover:bg-cyan-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95">
          <Plus size={20} strokeWidth={3} /><span>Tambah Hari</span>
        </button>
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<Calendar size={20} />} iconBgColor="bg-cyan-50" iconColor="text-cyan-600" label="HARI KERJA" value={data.filter(d=>d.is_working).length} />
      </div>

      <div className="mb-8"><FilterBar searchPlaceholder="Cari nama hari..." searchValue={search} onSearchChange={setSearch} /></div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100">
                {["No", "Nama Hari", "Nomor Hari", "Status", "Jam Mulai", "Jam Selesai", "Aksi"].map(h => (
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
                    <td className="px-6 py-4 font-bold text-gray-900">{item.day_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.day_number}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.is_working ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{item.is_working ? 'Hari Kerja' : 'Libur'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{item.start_time}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{item.end_time}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setFormData(item); setSelectedItem(item); setIsModalOpen(true); }} className="p-1.5 text-cyan-600 hover:bg-cyan-50 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id!)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="text-center py-16"><p className="text-gray-400">Belum ada data</p></td></tr>
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
              <h3 className="text-xl font-black">{selectedItem ? "Edit Pengaturan Hari" : "Tambah Pengaturan Hari"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Nama Hari</label><input type="text" required className="w-full px-4 py-2 border rounded-xl" value={formData.day_name} onChange={e => setFormData({ ...formData, day_name: e.target.value })} /></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Nomor Hari (1=Senin..)</label><input type="number" required className="w-full px-4 py-2 border rounded-xl" value={formData.day_number} onChange={e => setFormData({ ...formData, day_number: Number(e.target.value) })} /></div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Status Hari</label>
                  <select className="w-full px-4 py-2 border rounded-xl bg-white" value={formData.is_working} onChange={e => setFormData({ ...formData, is_working: Number(e.target.value) })}>
                    <option value={1}>Hari Kerja</option><option value={0}>Libur / Non-Kerja</option>
                  </select>
                </div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Jam Mulai</label><input type="time" required className="w-full px-4 py-2 border rounded-xl" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} /></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Jam Selesai</label><input type="time" required className="w-full px-4 py-2 border rounded-xl" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 border rounded-xl font-bold text-gray-600 hover:bg-gray-50">Batal</button>
                <button type="submit" className="px-6 py-2 bg-cyan-600 text-white rounded-xl font-bold shadow-lg hover:bg-cyan-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
