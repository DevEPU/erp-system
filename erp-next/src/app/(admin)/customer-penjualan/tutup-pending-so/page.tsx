"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, FileText, X, Eye } from "lucide-react";
import api from "@/lib/api";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import SearchableSelect from "@/components/ui/SearchableSelect";

type PendingSOClosure = {
  id?: number;
  reference?: string;
  customer_id: number | "";
  customer_name?: string;
  so_reference: string;
  reason: string;
  date: string;
  status: string;
};

export default function TutupPendingSoPage() {
  const [data, setData] = useState<PendingSOClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { isOpen, type, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading } = useStatusModal();

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PendingSOClosure | null>(null);
  const [formData, setFormData] = useState<PendingSOClosure>({
    customer_id: "",
    so_reference: "",
    reason: "",
    date: new Date().toISOString().split("T")[0],
    status: "Approved"
  });

  const [customers, setCustomers] = useState<any[]>([]);

  const fetchCustomers = async () => {
    try {
      const res = await api.express.get("/customers-list");
      setCustomers((res.data.data || []).map((c: any) => ({ value: c.id, label: c.customer_name })));
    } catch (err) {
      console.error("Error fetching customers:", err);
    }
  };

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.express.get("/tutup-pending-so", { page: p, search });
      setData(res.data.data || []);
      setPage(res.data.current_page || 1);
      setTotalPages(res.data.last_page || 1);
    } catch { 
      setData([]); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchCustomers();
    const t = setTimeout(() => fetchData(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleOpenCreate = () => {
    setFormData({
      customer_id: "",
      so_reference: "",
      reason: "",
      date: new Date().toISOString().split("T")[0],
      status: "Approved"
    });
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (id: number) => {
    try {
      const res = await api.express.get(`/tutup-pending-so/${id}`);
      if (res.data.success) {
        setFormData(res.data.data);
        setSelectedItem(res.data.data);
        setIsModalOpen(true);
      }
    } catch (err: any) {
      showError("Error", err.message || "Failed to load details.");
    }
  };

  const handleOpenDetail = async (id: number) => {
    try {
      const res = await api.express.get(`/tutup-pending-so/${id}`);
      if (res.data.success) {
        setSelectedItem(res.data.data);
        setIsDetailOpen(true);
      }
    } catch (err: any) {
      showError("Error", err.message || "Failed to load details.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) return showError("Validation Error", "Pilih customer terlebih dahulu.");
    if (!formData.so_reference) return showError("Validation Error", "Masukkan nomor referensi SO.");

    try {
      if (selectedItem?.id) {
        await api.express.put(`/tutup-pending-so/${selectedItem.id}`, formData);
        showSuccess("Success", "Penutupan Pending SO berhasil diperbarui.");
      } else {
        await api.express.post("/tutup-pending-so", formData);
        showSuccess("Success", "Penutupan Pending SO berhasil disimpan.");
      }
      setIsModalOpen(false);
      fetchData(page);
    } catch (err: any) {
      showError("Error", err.response?.data?.message || err.message || "Gagal menyimpan data.");
    }
  };

  const handleDelete = (id: number) => {
    showConfirm("Confirm Delete", "Apakah Anda yakin ingin menghapus data penutupan pending SO ini?", async () => {
      try {
        await api.express.delete(`/tutup-pending-so/${id}`);
        showSuccess("Success", "Data berhasil dihapus.");
        fetchData(page);
      } catch (err: any) {
        showError("Error", err.response?.data?.message || err.message || "Gagal menghapus data.");
      }
    });
  };

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <StatusModal isOpen={isOpen} type={type} title={title} message={message} onConfirm={onConfirm} onClose={closeModal} isLoading={isActionLoading} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-200">
              <FileText className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Tutup Pending <span className="text-red-600">SO</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">Tutup Sales Order yang masih pending dan tidak dilanjutkan.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-3 bg-gray-900 hover:bg-red-600 hover:shadow-red-200 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Tambah Baru</span>
        </button>
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<FileText size={20} />} iconBgColor="bg-red-50" iconColor="text-red-600" label="TOTAL PENUTUPAN" value={data.length} />
      </div>

      <div className="mb-8">
        <FilterBar searchPlaceholder="Cari data tutup pending so..." searchValue={search} onSearchChange={setSearch} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">No</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">No. Referensi</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">SO Reference</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Tanggal Tutup</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Aksi</th>
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
                    <td className="px-6 py-4 text-sm font-semibold text-red-600">{item.so_reference}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.date}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleOpenDetail(item.id!)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye size={16} /></button>
                        <button onClick={() => handleOpenEdit(item.id!)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id!)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
                        <FileText size={28} className="text-red-600" />
                      </div>
                      <p className="font-semibold">Belum ada data penutupan pending SO</p>
                      <p className="text-xs text-gray-300">Klik tombol "Tambah Baru" untuk menambahkan data pertama</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} totalItems={(page - 1) * 10 + data.length} onPageChange={fetchData} />
      </div>

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-gray-800">
                  {selectedItem ? "Edit Penutupan SO" : "Tambah Penutupan SO Baru"}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Customer</label>
                <SearchableSelect
                  options={customers}
                  placeholder="Pilih Customer..."
                  value={formData.customer_id}
                  onChange={(val) => setFormData({ ...formData, customer_id: val })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">SO Reference</label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan Nomor SO yang ingin ditutup..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none text-sm font-semibold transition-all"
                  value={formData.so_reference}
                  onChange={(e) => setFormData({ ...formData, so_reference: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Tanggal Tutup</label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none text-sm font-semibold transition-all"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Alasan Penutupan</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Keterangan / alasan mengapa SO ini ditutup..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none text-sm font-medium transition-all"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">
                  Batal
                </button>
                <button type="submit" className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-bold text-white shadow-lg transition-all active:scale-95">
                  Simpan Penutupan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {isDetailOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black tracking-widest text-red-600 uppercase font-mono">Detail Penutupan SO</span>
                <h3 className="text-xl font-black text-gray-800 mt-0.5">{selectedItem.reference}</h3>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-4">
              <div>
                <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Customer</span>
                <span className="font-extrabold text-gray-800 text-sm">{selectedItem.customer_name || "-"}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">SO Reference</span>
                <span className="font-extrabold text-red-600 text-sm font-mono">{selectedItem.so_reference}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Tanggal Tutup</span>
                <span className="font-extrabold text-gray-800 text-sm">{selectedItem.date}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Alasan Penutupan</span>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-xl text-sm border border-gray-100 mt-1">{selectedItem.reason}</p>
              </div>
            </div>

            <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button onClick={() => setIsDetailOpen(false)} className="px-6 py-2 bg-gray-900 hover:bg-black text-white text-sm font-bold shadow-md transition-all">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
