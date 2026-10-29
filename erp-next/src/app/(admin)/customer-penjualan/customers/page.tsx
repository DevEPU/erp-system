"use client";

import { useState, useEffect } from "react";
import { Plus, Search, UserCircle, Edit2, Trash2, Phone, Mail, MapPin, CheckCircle2, XCircle, Clock, X } from "lucide-react";
import api from "@/lib/api";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";

type Customer = {
  id?: number;
  customer_name: string;
  customer_code?: string;
  customer_email?: string;
  customer_phone?: string;
  city?: string;
  country?: string;
  address?: string;
  top_days?: number;
  is_active?: boolean | number;
};

const emptyCustomer = (): Customer => ({
  customer_name: "",
  customer_email: "",
  customer_phone: "",
  city: "",
  country: "",
  address: "",
  top_days: 45,
  is_active: 1
});

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<Customer>(emptyCustomer());

  const { isOpen, type, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading, setIsLoading: setActionLoading } = useStatusModal();

  const fetchData = async (currentPage = 1) => {
    setLoading(true);
    try {
      const res = await api.express.get("/customers", { page: currentPage, search });
      setCustomers(res.data.data || res.data || []);
      setPage(res.data.current_page || 1);
      setTotalPages(res.data.last_page || 1);
    } catch (e) {
      console.error(e);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchData(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleOpenCreate = () => {
    setSelectedCustomer(null);
    setFormData(emptyCustomer());
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cust: Customer) => {
    setSelectedCustomer(cust);
    setFormData({
      ...cust,
      top_days: cust.top_days ?? 45
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name.trim()) return showError("Validasi Error", "Nama Customer wajib diisi.");

    setActionLoading(true);
    try {
      if (selectedCustomer?.id) {
        await api.express.put(`/customers/${selectedCustomer.id}`, formData);
        showSuccess("Berhasil!", "Data customer berhasil diperbarui.");
      } else {
        await api.express.post("/customers", formData);
        showSuccess("Berhasil!", "Customer baru berhasil ditambahkan.");
      }
      setIsModalOpen(false);
      fetchData(page);
    } catch (err: any) {
      console.error(err);
      showError("Gagal", err.response?.data?.message || err.message || "Gagal menyimpan customer.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    showConfirm("Hapus Customer?", "Data customer akan dihapus permanen.", () => performDelete(id), "Hapus", "Batal");
  };

  const performDelete = async (id: number) => {
    setActionLoading(true);
    try {
      await api.express.delete(`/customers/${id}`);
      showSuccess("Berhasil!", "Customer berhasil dihapus.");
      fetchData(page);
    } catch (e: any) {
      showError("Gagal", e.message || "Gagal menghapus.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <StatusModal isOpen={isOpen} type={type} title={title} message={message} onConfirm={onConfirm} onClose={closeModal} isLoading={isActionLoading} />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
              <UserCircle className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Data <span className="text-blue-600">Customer</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">Kelola database pelanggan, syarat pembayaran TOP, dan lokasi.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-3 bg-gray-900 hover:bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-blue-200 active:scale-95"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Tambah Customer</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<UserCircle size={20} />} iconBgColor="bg-blue-50" iconColor="text-blue-600" label="TOTAL CUSTOMER" value={customers.length} />
        <StatCard icon={<Clock size={20} />} iconBgColor="bg-amber-50" iconColor="text-amber-600" label="RATA-RATA TOP" value="30 Hari" />
        <StatCard icon={<CheckCircle2 size={20} />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" label="STATUS AKTIF" value={customers.length} />
      </div>

      {/* Filter Bar */}
      <div className="mb-8">
        <FilterBar searchPlaceholder="Cari customer berdasarkan nama, kota, atau telepon..." searchValue={search} onSearchChange={setSearch} />
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kontak</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Lokasi</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Hari TOP (Term of Payment)</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400 font-medium">Memuat data customer...</td></tr>
              ) : customers.length > 0 ? (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{c.customer_name}</div>
                      <div className="text-xs text-gray-400 font-mono">{c.address || "-"}</div>
                    </td>
                    <td className="px-6 py-4">
                      {c.customer_email && <div className="flex items-center gap-2 text-xs text-gray-600"><Mail size={13} className="text-gray-400" />{c.customer_email}</div>}
                      {c.customer_phone && <div className="flex items-center gap-2 text-xs text-gray-600 mt-1"><Phone size={13} className="text-gray-400" />{c.customer_phone}</div>}
                    </td>
                    <td className="px-6 py-4">
                      {c.city && <div className="flex items-center gap-2 text-xs text-gray-600 font-medium"><MapPin size={13} className="text-gray-400" />{c.city}</div>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                        {c.top_days ?? 30} Hari
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleOpenEdit(c)} className="p-1.5 text-blue-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        {c.id && (
                          <button onClick={() => handleDelete(c.id!)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="text-center py-16 text-gray-400 font-medium">Belum ada data customer.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} totalItems={(page - 1) * 10 + customers.length} onPageChange={fetchData} />
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">
                {selectedCustomer ? "Edit Data Customer" : "Tambah Customer Baru"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Nama Customer *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama PT / Perusahaan / Customer..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Email Customer</label>
                  <input
                    type="email"
                    placeholder="email@perusahaan.com..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none"
                    value={formData.customer_email || ""}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">No. Telepon / HP</label>
                  <input
                    type="text"
                    placeholder="0812-xxxx-xxxx"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none font-mono"
                    value={formData.customer_phone || ""}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Kota</label>
                  <input
                    type="text"
                    placeholder="e.g. Cikarang, Jakarta..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none"
                    value={formData.city || ""}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                {/* HARI TOP / TERM OF PAYMENT */}
                <div className="space-y-1">
                  <label className="font-bold text-blue-700">Hari TOP (Term of Payment) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={0}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-blue-50/50 font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.top_days}
                      onChange={(e) => setFormData({ ...formData, top_days: Number(e.target.value) })}
                    />
                    <span className="absolute right-3 top-2 text-xs font-semibold text-blue-600">Hari</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  placeholder="Alamat kantor / pabrik customer..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none resize-none"
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md shadow-blue-200"
                >
                  Simpan Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
