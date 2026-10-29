"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, FileText } from "lucide-react";
import api from "@/lib/api";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";

type DataItem = {
  id: number;
  [key: string]: any;
};

export default function JurnalPembelianPage() {
  const [data, setData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { isOpen, type, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading, setIsLoading: setActionLoading } = useStatusModal();

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.express.get("/purchase-journals", { page: p, search });
      setData(res.data.data || res.data || []);
      setPage(res.data.current_page || 1);
      setTotalPages(res.data.last_page || 1);
    } catch { setData([]); } finally { setLoading(false); }
  };

  useEffect(() => { const t = setTimeout(() => fetchData(1), 400); return () => clearTimeout(t); }, [search]);

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <StatusModal isOpen={isOpen} type={type} title={title} message={message} onConfirm={onConfirm} onClose={closeModal} isLoading={isActionLoading} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
              <FileText className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Jurnal <span className="text-blue-600">Pembelian</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">Kelola data jurnal pembelian barang.</p>
        </div>
        <button
          onClick={() => showSuccess("Info", "Fitur ini sedang dalam pengembangan.")}
          className="flex items-center gap-3 bg-gray-900 hover:bg-blue-600 hover:shadow-blue-200 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Tambah Baru</span>
        </button>
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<FileText size={20} />} iconBgColor="bg-blue-50" iconColor="text-blue-600" label="TOTAL DATA" value={data.length} />
      </div>

      <div className="mb-8">
        <FilterBar searchPlaceholder="Cari data jurnal pembelian..." searchValue={search} onSearchChange={setSearch} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">No</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Informasi</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
              ) : data.length > 0 ? (
                data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">{(page - 1) * 10 + idx + 1}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {item.name || item.code || item.title || item.no || `ID: ${item.id}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.description || item.keterangan || item.notes || "-"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-1.5 text-blue-600 hover:opacity-70 rounded-lg hover:bg-gray-50 transition-colors"><Edit2 size={16} /></button>
                        <button className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <FileText size={28} className="text-blue-600" />
                      </div>
                      <p className="font-semibold">Belum ada data jurnal pembelian</p>
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
    </div>
  );
}
