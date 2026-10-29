"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Activity, Edit2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";

type CostCenter = {
  id: number;
  kode_cc: string;
  nama_cc: string;
  pic: string;
  anggaran: number;
  realisasi: number;
  is_active: boolean;
};

export default function CostCenterPage() {
  const [data, setData] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { isOpen, type, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading, setIsLoading: setActionLoading } = useStatusModal();

  const fetchData = async () => {
    setLoading(true);
    setTimeout(() => {
      setData([
        { id: 1, kode_cc: "CC-PROD", nama_cc: "Pusat Biaya Produksi Utama", pic: "Andi", anggaran: 1200000000, realisasi: 850000000, is_active: true },
        { id: 2, kode_cc: "CC-LOG", nama_cc: "Pusat Biaya Logistik & Pengiriman", pic: "Budi", anggaran: 450000000, realisasi: 310000000, is_active: true },
        { id: 3, kode_cc: "CC-HR", nama_cc: "Pusat Biaya Training & Rec", pic: "Citra", anggaran: 150000000, realisasi: 142000000, is_active: true },
        { id: 4, kode_cc: "CC-ITD", nama_cc: "Pusat Biaya R&D Hardware", pic: "Dedi", anggaran: 300000000, realisasi: 215000000, is_active: true },
        { id: 5, kode_cc: "CC-MKT", nama_cc: "Pusat Biaya Promosi & Iklan", pic: "Elisa", anggaran: 600000000, realisasi: 420000000, is_active: true },
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
    showConfirm("Hapus Cost Center?", "Apakah Anda yakin ingin menghapus cost center ini?", () => {
      setActionLoading(true);
      setTimeout(() => {
        setData(prev => prev.filter(item => item.id !== id));
        showSuccess("Berhasil!", "Cost Center berhasil dihapus.");
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
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
              <Activity className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Cost <span className="text-blue-600">Center</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">Kelola pusat biaya untuk pemantauan alokasi dan efisiensi pengeluaran operasional.</p>
        </div>
        <button
          onClick={() => showSuccess("Info", "Fitur tambah cost center akan segera tersedia.")}
          className="flex items-center gap-3 bg-gray-900 hover:bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-blue-200 active:scale-95"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Tambah Cost Center</span>
        </button>
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<Activity size={20} />} iconBgColor="bg-blue-50" iconColor="text-blue-600" label="TOTAL COST CENTER" value={data.length} />
        <StatCard icon={<CheckCircle2 size={20} />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" label="TOTAL ANGGARAN" value={`Rp ${data.reduce((a, b) => a + b.anggaran, 0).toLocaleString("id-ID")}`} />
        <StatCard icon={<CheckCircle2 size={20} />} iconBgColor="bg-indigo-50" iconColor="text-indigo-600" label="TOTAL REALISASI" value={`Rp ${data.reduce((a, b) => a + b.realisasi, 0).toLocaleString("id-ID")}`} />
      </div>

      <div className="mb-8">
        <FilterBar searchPlaceholder="Cari berdasarkan kode atau nama cost center..." searchValue={search} onSearchChange={setSearch} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kode CC</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Cost Center</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">PIC</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Anggaran</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Realisasi</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 font-medium">Memuat data...</td></tr>
              ) : data.length > 0 ? (
                data.filter(x => x.nama_cc.toLowerCase().includes(search.toLowerCase()) || x.kode_cc.includes(search)).map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-gray-800">{item.kode_cc}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{item.nama_cc}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.pic}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">Rp {item.anggaran.toLocaleString("id-ID")}</td>
                    <td className="px-6 py-4 text-right font-bold text-cyan-600">Rp {item.realisasi.toLocaleString("id-ID")}</td>
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
                <tr><td colSpan={7} className="text-center py-16 text-gray-400 font-medium">Belum ada data cost center.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} totalItems={data.length} onPageChange={fetchData} />
      </div>
    </div>
  );
}
