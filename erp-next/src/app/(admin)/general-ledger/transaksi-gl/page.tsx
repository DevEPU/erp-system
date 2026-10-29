"use client";

import { useState, useEffect } from "react";
import { Plus, Search, ArrowLeftRight, Edit2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";

type TransaksiGl = {
  id: number;
  no_jurnal: string;
  tanggal: string;
  tipe_jurnal: string;
  keterangan: string;
  debit: number;
  kredit: number;
  is_active: boolean;
};

export default function TransaksiGLPage() {
  const [data, setData] = useState<TransaksiGl[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { isOpen, type, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading, setIsLoading: setActionLoading } = useStatusModal();

  const fetchData = async () => {
    setLoading(true);
    setTimeout(() => {
      setData([
        { id: 1, no_jurnal: "JV-260520-0001", tanggal: "2026-05-20", tipe_jurnal: "Jurnal Umum", keterangan: "Biaya logistik pengapalan impor suku cadang.", debit: 154900, kredit: 154900, is_active: true },
        { id: 2, no_jurnal: "JV-260519-0001", tanggal: "2026-05-19", tipe_jurnal: "Jurnal Kas/Bank", keterangan: "Pembayaran tagihan invoice supplier Toko Sembako.", debit: 25000000, kredit: 25000000, is_active: true },
        { id: 3, no_jurnal: "JV-260518-0001", tanggal: "2026-05-18", tipe_jurnal: "Jurnal Penyesuaian", keterangan: "Penyesuaian stok inventori akhir bulan.", debit: 4500000, kredit: 4500000, is_active: true },
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
    showConfirm("Hapus Transaksi?", "Apakah Anda yakin ingin menghapus transaksi jurnal GL ini?", () => {
      setActionLoading(true);
      setTimeout(() => {
        setData(prev => prev.filter(item => item.id !== id));
        showSuccess("Berhasil!", "Transaksi GL berhasil dihapus.");
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
              <ArrowLeftRight className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Transaksi <span className="text-blue-600">G.L.</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">Kelola dan review riwayat jurnal transaksi serta posting buku besar.</p>
        </div>
        <button
          onClick={() => showSuccess("Info", "Fitur tambah transaksi jurnal GL akan segera tersedia.")}
          className="flex items-center gap-3 bg-gray-900 hover:bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-blue-200 active:scale-95"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Tambah Transaksi GL</span>
        </button>
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<ArrowLeftRight size={20} />} iconBgColor="bg-blue-50" iconColor="text-blue-600" label="TOTAL TRANSAKSI" value={data.length} />
        <StatCard icon={<ArrowLeftRight size={20} />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" label="TOTAL DEBIT JURNAL" value={`Rp ${data.reduce((a, b) => a + b.debit, 0).toLocaleString("id-ID")}`} />
        <StatCard icon={<ArrowLeftRight size={20} />} iconBgColor="bg-indigo-50" iconColor="text-indigo-600" label="TOTAL KREDIT JURNAL" value={`Rp ${data.reduce((a, b) => a + b.kredit, 0).toLocaleString("id-ID")}`} />
      </div>

      <div className="mb-8">
        <FilterBar searchPlaceholder="Cari berdasarkan nomor jurnal atau tipe jurnal..." searchValue={search} onSearchChange={setSearch} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">No Jurnal</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tanggal</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipe Jurnal</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Debit</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Kredit</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 font-medium">Memuat data...</td></tr>
              ) : data.length > 0 ? (
                data.filter(x => x.no_jurnal.toLowerCase().includes(search.toLowerCase()) || x.tipe_jurnal.toLowerCase().includes(search.toLowerCase())).map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-gray-800">{item.no_jurnal}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-400">{new Date(item.tanggal).toLocaleDateString("id-ID")}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-indigo-600">{item.tipe_jurnal}</td>
                    <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px] truncate">{item.keterangan}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">Rp {item.debit.toLocaleString("id-ID")}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">Rp {item.kredit.toLocaleString("id-ID")}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-1.5 text-blue-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400 font-medium">Belum ada data transaksi jurnal.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} totalItems={data.length} onPageChange={fetchData} />
      </div>
    </div>
  );
}
