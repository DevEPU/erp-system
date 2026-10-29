"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, FileText, X } from "lucide-react";
import api from "@/lib/api";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import SearchableSelect from "@/components/ui/SearchableSelect";

type PenagihanPiutang = {
  id?: number;
  reference?: string;
  customer_id: number | "";
  invoice_reference: string;
  amount: number;
  due_date: string;
  note?: string;
  status: string;
};

export default function PenagihanPiutangPage() {
  const [data, setData] = useState<PenagihanPiutang[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { isOpen, type, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading } = useStatusModal();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PenagihanPiutang | null>(null);
  const [formData, setFormData] = useState<PenagihanPiutang>({ customer_id: "", invoice_reference: "", amount: 0, due_date: new Date().toISOString().split("T")[0], note: "", status: "Pending" });
  const [customers, setCustomers] = useState<any[]>([]);

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.express.get("/penagihan-piutang", { page: p, search });
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
      if (selectedItem?.id) await api.express.put(`/penagihan-piutang/${selectedItem.id}`, formData);
      else await api.express.post("/penagihan-piutang", formData);
      showSuccess("Success", "Data berhasil disimpan.");
      setIsModalOpen(false); fetchData(page);
    } catch (err: any) { showError("Error", err.response?.data?.message || err.message); }
  };

  const handleDelete = (id: number) => {
    showConfirm("Confirm Delete", "Hapus data ini?", async () => {
      try { await api.express.delete(`/penagihan-piutang/${id}`); showSuccess("Success", "Berhasil dihapus."); fetchData(page); }
      catch (err: any) { showError("Error", err.message); }
    });
  };

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <StatusModal isOpen={isOpen} type={type} title={title} message={message} onConfirm={onConfirm} onClose={closeModal} isLoading={isActionLoading} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-200"><FileText className="text-white" size={28} /></div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">Penagihan <span className="text-red-600">Piutang</span></h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">Kelola data tagihan (invoice) piutang pelanggan.</p>
        </div>
        <button onClick={() => { setFormData({ customer_id: "", invoice_reference: "", amount: 0, due_date: new Date().toISOString().split("T")[0], note: "", status: "Pending" }); setSelectedItem(null); setIsModalOpen(true); }}
          className="flex items-center gap-3 bg-gray-900 hover:bg-red-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95">
          <Plus size={20} strokeWidth={3} /><span>Tambah Baru</span>
        </button>
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<FileText size={20} />} iconBgColor="bg-red-50" iconColor="text-red-600" label="TOTAL TAGIHAN" value={data.length} />
        <StatCard icon={<FileText size={20} />} iconBgColor="bg-orange-50" iconColor="text-orange-600" label="TOTAL NILAI (RP)" value={`Rp ${data.reduce((s, i) => s + Number(i.amount), 0).toLocaleString()}`} />
      </div>

      <div className="mb-8"><FilterBar searchPlaceholder="Cari referensi penagihan..." searchValue={search} onSearchChange={setSearch} /></div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100">
                {["No", "No. Penagihan", "Ref Invoice", "Tgl Jatuh Tempo", "Nominal", "Status", "Aksi"].map(h => (
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
                    <td className="px-6 py-4 font-bold text-gray-900">{item.reference || `PNG-${item.id}`}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-500">{item.invoice_reference || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.due_date ? new Date(item.due_date).toLocaleDateString() : "-"}</td>
                    <td className="px-6 py-4 text-sm font-black text-red-600">Rp {Number(item.amount).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setFormData({ ...item, due_date: item.due_date?.split("T")[0] } as any); setSelectedItem(item); setIsModalOpen(true); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Edit2 size={16} /></button>
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
              <h3 className="text-xl font-black">{selectedItem ? "Edit Penagihan" : "Tambah Penagihan"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Customer</label>
                  <SearchableSelect options={customers} placeholder="Pilih Customer..." value={formData.customer_id} onChange={(val) => setFormData({ ...formData, customer_id: val })} />
                </div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Referensi Invoice</label><input type="text" required className="w-full px-4 py-2 border rounded-xl" value={formData.invoice_reference} onChange={e => setFormData({ ...formData, invoice_reference: e.target.value })} /></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Nominal Tagihan (Rp)</label><input type="number" required className="w-full px-4 py-2 border rounded-xl" value={formData.amount} onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Jatuh Tempo</label><input type="date" required className="w-full px-4 py-2 border rounded-xl" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                  <select className="w-full px-4 py-2 border rounded-xl bg-white" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="Pending">Pending</option><option value="Paid">Paid</option>
                  </select>
                </div>
                <div className="space-y-1.5 col-span-2"><label className="text-xs font-bold text-gray-500 uppercase">Keterangan</label><textarea rows={2} className="w-full px-4 py-2 border rounded-xl" value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 border rounded-xl font-bold text-gray-600 hover:bg-gray-50">Batal</button>
                <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold shadow-lg hover:bg-red-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
