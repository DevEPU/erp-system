"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Calculator, Edit2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";

type RumusRasio = {
  id: number;
  nama_rasio: string;
  jenis_rasio: string;
  formula: string;
  deskripsi: string;
  is_active: boolean;
};

export default function RumusRasioKeuanganPage() {
  const [data, setData] = useState<RumusRasio[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { isOpen, type, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading, setIsLoading: setActionLoading } = useStatusModal();

  const fetchData = async () => {
    setLoading(true);
    setTimeout(() => {
      setData([
        { id: 1, nama_rasio: "Current Ratio", jenis_rasio: "Likuiditas", formula: "(Total Aset Lancar / Total Kewajiban Lancar) * 100", deskripsi: "Mengukur kemampuan perusahaan membayar kewajiban jangka pendek.", is_active: true },
        { id: 2, nama_rasio: "Quick Ratio", jenis_rasio: "Likuiditas", formula: "((Total Aset Lancar - Persediaan) / Total Kewajiban Lancar) * 100", deskripsi: "Mengukur kemampuan bayar kewajiban jangka pendek tanpa menjual persediaan.", is_active: true },
        { id: 3, nama_rasio: "Net Profit Margin", jenis_rasio: "Profitabilitas", formula: "(Laba Bersih / Pendapatan Penjualan) * 100", deskripsi: "Mengukur persentase laba bersih dari total penjualan.", is_active: true },
        { id: 4, nama_rasio: "Debt to Equity Ratio", jenis_rasio: "Solvabilitas", formula: "(Total Utang / Total Ekuitas) * 100", deskripsi: "Mengukur proporsi utang terhadap ekuitas perusahaan.", is_active: true },
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
    showConfirm("Hapus Rumus Rasio?", "Apakah Anda yakin ingin menghapus rumus rasio ini?", () => {
      setActionLoading(true);
      setTimeout(() => {
        setData(prev => prev.filter(item => item.id !== id));
        showSuccess("Berhasil!", "Rumus Rasio berhasil dihapus.");
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
              <Calculator className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Rumus <span className="text-blue-600">Rasio Keuangan</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">Kelola rumus kalkulasi rasio keuangan otomatis untuk analisis laporan keuangan.</p>
        </div>
        <button
          onClick={() => showSuccess("Info", "Fitur tambah rumus rasio akan segera tersedia.")}
          className="flex items-center gap-3 bg-gray-900 hover:bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-blue-200 active:scale-95"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Tambah Rumus Rasio</span>
        </button>
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<Calculator size={20} />} iconBgColor="bg-blue-50" iconColor="text-blue-600" label="TOTAL RUMUS RASIO" value={data.length} />
        <StatCard icon={<CheckCircle2 size={20} />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" label="LIKUIDITAS" value={data.filter(d => d.jenis_rasio === "Likuiditas").length} />
        <StatCard icon={<CheckCircle2 size={20} />} iconBgColor="bg-indigo-50" iconColor="text-indigo-600" label="PROFITABILITAS" value={data.filter(d => d.jenis_rasio === "Profitabilitas").length} />
      </div>

      <div className="mb-8">
        <FilterBar searchPlaceholder="Cari berdasarkan nama atau jenis rasio..." searchValue={search} onSearchChange={setSearch} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Rasio</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Jenis Rasio</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Formula</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400 font-medium">Memuat data...</td></tr>
              ) : data.length > 0 ? (
                data.filter(x => x.nama_rasio.toLowerCase().includes(search.toLowerCase()) || x.jenis_rasio.toLowerCase().includes(search.toLowerCase())).map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{item.nama_rasio}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-indigo-600">{item.jenis_rasio}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-700 bg-gray-50/50 rounded px-2 py-1 max-w-[250px] overflow-x-auto">{item.formula}</td>
                    <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px] truncate">{item.deskripsi}</td>
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
                <tr><td colSpan={6} className="text-center py-16 text-gray-400 font-medium">Belum ada data rumus rasio.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} totalItems={data.length} onPageChange={fetchData} />
      </div>
    </div>
  );
}
