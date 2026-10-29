"use client";

import { useState, useEffect } from "react";
import { Plus, Search, ListTree, Edit2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";

type AkunGL = {
  id: number;
  kode_akun: string;
  nama_akun: string;
  tipe_akun: string;
  level: number;
  saldo: number;
  is_active: boolean;
};

export default function AkunGLPage() {
  const [data, setData] = useState<AkunGL[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { isOpen, type, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading, setIsLoading: setActionLoading } = useStatusModal();

  const fetchData = async () => {
    setLoading(true);
    setTimeout(() => {
      setData([
        { id: 1, kode_akun: "1-1000", nama_akun: "Aset Lancar", tipe_akun: "Asset", level: 1, saldo: 0, is_active: true },
        { id: 2, kode_akun: "1-1100", nama_akun: "Kas Utama", tipe_akun: "Asset", level: 2, saldo: 50000000, is_active: true },
        { id: 3, kode_akun: "1-1200", nama_akun: "Bank Mandiri IDR", tipe_akun: "Asset", level: 2, saldo: 245000000, is_active: true },
        { id: 4, kode_akun: "2-1000", nama_akun: "Kewajiban Lancar", tipe_akun: "Liability", level: 1, saldo: 0, is_active: true },
        { id: 5, kode_akun: "2-1100", nama_akun: "Hutang Dagang", tipe_akun: "Liability", level: 2, saldo: 12500000, is_active: true },
      ]);
      setPage(1);
      setTotalPages(1);
      setLoading(false);
    }, 500);
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const handleDelete = (id: number) => {
    showConfirm("Hapus Akun?", "Apakah Anda yakin ingin menghapus akun GL ini?", () => {
      setActionLoading(true);
      setTimeout(() => {
        setData(prev => prev.filter(item => item.id !== id));
        showSuccess("Berhasil!", "Akun GL berhasil dihapus.");
        setActionLoading(false);
      }, 500);
    });
  };

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <StatusModal isOpen={isOpen} type={type} title={title} message={message} onConfirm={onConfirm} onClose={closeModal} isLoading={isActionLoading} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
              <ListTree className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Akun <span className="text-indigo-600">GL</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">Kelola daftar Bagan Akun (Chart of Accounts) untuk pembukuan akuntansi.</p>
        </div>
        <button
          onClick={() => showSuccess("Info", "Fitur tambah akun GL akan segera tersedia.")}
          className="flex items-center gap-3 bg-gray-900 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-indigo-200 active:scale-95"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Tambah Akun GL</span>
        </button>
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<ListTree size={20} />} iconBgColor="bg-indigo-50" iconColor="text-indigo-600" label="TOTAL AKUN GL" value={data.length} />
        <StatCard icon={<CheckCircle2 size={20} />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" label="AKTIF" value={data.filter(d => d.is_active).length} />
        <StatCard icon={<XCircle size={20} />} iconBgColor="bg-red-50" iconColor="text-red-600" label="TIDAK AKTIF" value={data.filter(d => !d.is_active).length} />
      </div>

      <div className="mb-8">
        <FilterBar searchPlaceholder="Cari berdasarkan kode akun atau nama akun..." searchValue={search} onSearchChange={setSearch} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kode Akun</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Akun</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipe Akun</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Level</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 font-medium">Memuat data...</td></tr>
              ) : data.length > 0 ? (
                data.filter(x => x.nama_akun.toLowerCase().includes(search.toLowerCase()) || x.kode_akun.includes(search)).map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-gray-800">{item.kode_akun}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{item.nama_akun}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.tipe_akun}</td>
                    <td className="px-6 py-4 text-center text-sm font-semibold">{item.level}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">Rp {item.saldo.toLocaleString("id-ID")}</td>
                    <td className="px-6 py-4 text-center">
                      {item.is_active
                        ? <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">Aktif</span>
                        : <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider">Nonaktif</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-1.5 text-blue-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400 font-medium">Belum ada data akun GL.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} totalItems={data.length} onPageChange={fetchData} />
      </div>
    </div>
  );
}
