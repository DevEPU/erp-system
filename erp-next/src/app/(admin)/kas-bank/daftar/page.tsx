"use client";

import { useState, useEffect } from "react";
import TablePagination from "@/components/ui/TablePagination";
import { Plus, Search, Edit2, Trash2, Landmark, MoreVertical, CheckCircle2, XCircle, Package, Archive, ShieldAlert, Coins, Truck, Tags } from "lucide-react";
import api from "@/lib/api";
import BankAccountModal from "@/components/kas-bank/BankAccountModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import StatusModalUI from "@/components/ui/StatusModal";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  const {
    isOpen: isStatusModalOpen,
    type: modalType,
    title: modalTitle,
    message: modalMessage,
    onConfirm: modalOnConfirm,
    showSuccess,
    showError,
    closeModal,
  } = useStatusModal();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/bank-accounts");
      if (res.data.success) {
        setAccounts(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching bank accounts:", err);
      showError("Gagal", "Terjadi kesalahan saat memuat data kas/bank");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus akun kas/bank ini?")) return;
    try {
      await api.express.delete(`/bank-accounts/${id}`);
      showSuccess("Berhasil", "Akun kas/bank telah dihapus.");
      fetchAccounts();
    } catch (err) {
      showError("Gagal", "Tidak dapat menghapus akun kas/bank.");
    }
  };

  const filteredAccounts = accounts.filter(acc => 
    acc.name.toLowerCase().includes(search.toLowerCase()) || 
    acc.code.toLowerCase().includes(search.toLowerCase()) ||
    acc.account_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 bg-gray-50/50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <Landmark className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Daftar <span className="text-emerald-600">Kas & Bank</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Kelola rekening bank dan saldo kas perusahaan secara terintegrasi.
          </p>
        </div>
        
        <button
          onClick={() => {
            setEditingAccount(null);
            setIsModalOpen(true);
          }}
          className="group relative flex items-center gap-3 bg-gray-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 overflow-hidden"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Tambah Akun Baru</span>
        </button>
      </div>

      {/* Mock Stat Cards */}
      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<Landmark size={20} />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" label="TOTAL AKUN" value={accounts.length} />
        <StatCard icon={<CheckCircle2 size={20} />} iconBgColor="bg-blue-50" iconColor="text-blue-600" label="AKTIF" value={accounts.filter(a => a.status === 'Active').length} />
        <StatCard icon={<XCircle size={20} />} iconBgColor="bg-red-50" iconColor="text-red-600" label="INAKTIF" value={accounts.filter(a => a.status !== 'Active').length} />
      </div>

      <div className="mb-8">
        <FilterBar 
          searchPlaceholder="Cari kode, nama bank, atau nomor rekening..." 
          searchValue={search} 
          onSearchChange={setSearch} 
        />
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white">
              <tr className="border-b border-gray-100 text-left">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Akun & Kode</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Info Rekening</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Mata Uang</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 flex-1">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-4"><div className="h-12 bg-gray-100 rounded-xl w-full"></div></td>
                  </tr>
                ))
              ) : filteredAccounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-emerald-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${acc.account_type === 'Bank' ? 'bg-emerald-50 text-emerald-600' : 'bg-teal-50 text-teal-600'}`}>
                        <Landmark size={20} />
                      </div>
                      <div>
                        <div className="font-black text-gray-900 text-base">{acc.name}</div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{acc.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-1">
                      <div className="font-bold text-gray-700 text-sm">{acc.account_number || '-'}</div>
                      <div className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                        <span>{acc.phone || 'No Phone'}</span>
                        <span>•</span>
                        <span className="truncate max-w-[150px]">{acc.address || 'No Address'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight ${
                      acc.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {acc.status === 'Active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {acc.status}
                    </span>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <div className="inline-block px-3 py-1 bg-gray-100 rounded-lg text-xs font-black text-gray-600">
                      {acc.currency_code}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingAccount(acc);
                          setIsModalOpen(true);
                        }}
                        className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm"
                        title="Edit Data"
                      >
                        <Edit2 size={16} strokeWidth={3} />
                      </button>
                      <button 
                        onClick={() => handleDelete(acc.id)}
                        className="p-2.5 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"
                        title="Hapus Data"
                      >
                        <Trash2 size={16} strokeWidth={3} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredAccounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-6 bg-gray-50 rounded-full text-gray-300">
                        <Landmark size={48} />
                      </div>
                      <div className="text-gray-400 font-bold">Belum ada data kas/bank yang terdaftar.</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination totalItems={filteredAccounts.length} />
      </div>

      <BankAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        accountToEdit={editingAccount}
        onSuccess={() => {
          showSuccess("Berhasil", "Data kas/bank telah diperbarui.");
          fetchAccounts();
        }}
      />

      <StatusModalUI
        isOpen={isStatusModalOpen}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        onConfirm={modalOnConfirm}
        onClose={closeModal}
      />
    </div>
  );
}
