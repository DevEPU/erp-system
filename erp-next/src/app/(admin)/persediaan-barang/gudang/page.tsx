"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Warehouse,
  MoreHorizontal,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import api from "@/lib/api";
import TablePagination from "@/components/ui/TablePagination";
import FilterBar from "@/components/ui/FilterBar";
import StatCard from "@/components/ui/StatCard";
import WarehouseModal from "@/components/master-data/WarehouseModal";

export default function WarehouseListPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, [page, pageSize, search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/warehouses", {
        params: { search, page, limit: pageSize }
      });
      setData(res.data.data || []);
      setTotalItems(res.data.total || 0);
    } catch (err) {
      console.error("Error fetching warehouses:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus gudang ini?")) {
      try {
        await api.express.delete(`/warehouses/${id}`);
        fetchData();
      } catch (err) {
        console.error("Error deleting warehouse:", err);
        alert("Gagal menghapus gudang. Mungkin masih ada data yang terkait.");
      }
    }
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50/50 min-h-screen animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3.5 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl shadow-lg shadow-emerald-200">
              <Warehouse className="text-white animate-pulse" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">
                  Master <span className="text-emerald-600">Gudang</span>
                </h1>
                <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest hidden sm:inline-block">
                  Enterprise ERP Standard
                </span>
              </div>
              <p className="text-gray-500 font-semibold text-xs md:text-sm mt-0.5">
                Kelola data lokasi gudang penyimpanan persediaan material, WIP, dan finished goods.
              </p>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => {
            setSelectedItem(null);
            setIsModalOpen(true);
          }}
          className="group relative flex items-center gap-3 bg-gray-950 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 overflow-hidden"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Tambah Gudang Baru</span>
        </button>
      </div>

      {/* Stats Summary */}
      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 hide-scrollbar">
        <StatCard 
          icon={<Warehouse size={20} />} 
          iconBgColor="bg-blue-50" 
          iconColor="text-blue-600" 
          label="TOTAL GUDANG" 
          value={totalItems} 
        />
        <StatCard 
          icon={<CheckCircle2 size={20} />} 
          iconBgColor="bg-emerald-50" 
          iconColor="text-emerald-600" 
          label="AKTIF" 
          value={data.filter(w => w.is_active).length} 
        />
        <StatCard 
          icon={<AlertCircle size={20} />} 
          iconBgColor="bg-orange-50" 
          iconColor="text-orange-600" 
          label="TRANSIT" 
          value={data.filter(w => w.is_transit).length} 
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-32">
          <select 
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="w-full px-4 py-4 bg-white rounded-[2rem] border border-gray-100 shadow-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-gray-700 appearance-none text-center h-full"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
        <div className="flex-1">
          <FilterBar 
            searchPlaceholder="Cari Kode atau Nama Gudang..." 
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
              <tr className="border-b border-gray-100">
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kode</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Gudang</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipe Gudang</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">PIC & Telepon</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Department</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Transit</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 flex-1">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="px-6 py-4"><div className="h-10 bg-gray-50 rounded-xl w-full"></div></td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center font-bold text-gray-400 uppercase tracking-widest text-sm bg-gray-50/30">
                    Tidak Ada Data Gudang
                  </td>
                </tr>
              ) : data.map((item) => (
                <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-black text-gray-900 group-hover:text-emerald-600 transition-colors">{item.code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-700">{item.name}</div>
                    {item.short_name && <div className="text-[10px] font-black text-gray-400 uppercase">{item.short_name}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                      {item.warehouse_type || "INTERNAL"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-gray-800">{item.pic_name || "-"}</div>
                    {item.pic_phone && <div className="text-[10px] text-gray-400 font-medium">{item.pic_phone}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-500 font-medium text-xs">
                      <Building2 size={14} className="text-gray-300" />
                      <span>{item.department_name || "-"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-500 text-xs italic truncate max-w-[180px]">{item.description || "-"}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {item.is_transit ? (
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase">Transit</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {item.is_active ? (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase">Aktif</span>
                    ) : (
                      <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black rounded-full uppercase">Non-Aktif</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(item)}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-auto border-t border-gray-100">
          <TablePagination totalItems={totalItems} />
        </div>
      </div>

      {/* Modal */}
      <WarehouseModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        itemToEdit={selectedItem}
      />
    </div>
  );
}
