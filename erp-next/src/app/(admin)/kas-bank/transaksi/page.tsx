"use client";

import { useState, useEffect } from "react";
import TablePagination from "@/components/ui/TablePagination";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye, 
  Printer, 
  BookOpen, 
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Package,
  Archive,
  ShieldAlert,
  Coins,
  Truck,
  Tags
} from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";

export default function TransaksiKasListPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Mocking fetch or use real API if available
      // const res = await api.express.get("/cash-transactions");
      // if (res.data.success) setData(res.data.data);
      setData([]); // Initial empty state as per image
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50/50 min-h-screen animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-600 rounded-2xl shadow-lg shadow-teal-200">
              <ArrowLeftRight className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Daftar <span className="text-teal-600">Transaksi Kas</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Riwayat penerimaan, pengeluaran, dan mutasi kas/bank.
          </p>
        </div>
        
        <button
          onClick={() => router.push("/kas-bank/transaksi/baru")}
          className="group relative flex items-center gap-3 bg-gray-900 hover:bg-teal-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-teal-200 active:scale-95 overflow-hidden"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Tambah Transaksi</span>
        </button>
      </div>

      {/* Mock Stat Cards */}
      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<ArrowLeftRight size={20} />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" label="TOTAL TRANSAKSI" value={data.length} />
        <StatCard icon={<Plus size={20} />} iconBgColor="bg-blue-50" iconColor="text-blue-600" label="PEMASUKAN" value={data.filter(t => t.tipe_transaksi?.toLowerCase().includes('masuk') || t.type === 'in').length} />
        <StatCard icon={<MoreVertical size={20} />} iconBgColor="bg-red-50" iconColor="text-red-600" label="PENGELUARAN" value={data.filter(t => t.tipe_transaksi?.toLowerCase().includes('keluar') || t.type === 'out').length} />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="w-full md:w-32">
          <select 
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="w-full px-4 py-4 bg-white rounded-[2rem] border border-gray-100 shadow-sm focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all font-bold text-gray-700 appearance-none text-center h-full"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <div className="flex-1">
          <FilterBar 
            searchPlaceholder="Pencarian Global..." 
            searchValue={search} 
            onSearchChange={setSearch} 
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white">
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">No. Transaksi</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tgl. Trn.</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipe Transaksi</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Dibayar kepada / terima dari</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Jumlah</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Mata Uang</th>
                <th className="px-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Lihat</th>
                <th className="px-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Cetak</th>
                <th className="px-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center leading-tight">Lihat G.L.</th>
                <th className="px-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center leading-tight">Cetak G.L.</th>
                <th className="px-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Ubah</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Hapus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 flex-1">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={13} className="px-8 py-6"><div className="h-8 bg-gray-100 rounded-lg w-full"></div></td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-8 py-20 text-center font-bold text-gray-400 uppercase tracking-widest text-sm bg-gray-50/30">
                    Tidak Ada Data
                  </td>
                </tr>
              ) : data.map((item) => (
                <tr key={item.id} className="hover:bg-teal-50/30 transition-colors">
                  {/* Map data here */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination totalItems={data.length} />
      </div>
    </div>
  );
}
