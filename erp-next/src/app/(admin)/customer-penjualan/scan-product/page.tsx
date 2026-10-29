"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, QrCode } from "lucide-react";
import api from "@/lib/api";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";

type ScanLog = {
  id?: number;
  product_id?: number | null;
  product_name: string;
  product_code?: string;
  customer_id?: number | null;
  scan_type: string;
  qty: number;
  scan_date: string;
  note?: string;
};

export default function ScanProductPage() {
  const [data, setData] = useState<ScanLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { isOpen, type: modalType, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading } = useStatusModal();

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.express.get("/scan-product-log", { page: p, search });
      setData(res.data.data || []); setPage(res.data.current_page || 1); setTotalPages(res.data.last_page || 1);
    } catch { setData([]); } finally { setLoading(false); }
  };

  useEffect(() => { const t = setTimeout(() => fetchData(1), 400); return () => clearTimeout(t); }, [search]);

  const handleDelete = (id: number) => {
    showConfirm("Confirm Delete", "Hapus log scan ini?", async () => {
      try { await api.express.delete(`/scan-product-log/${id}`); showSuccess("Success", "Berhasil dihapus."); fetchData(page); }
      catch (err: any) { showError("Error", err.message); }
    });
  };

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <StatusModal isOpen={isOpen} type={modalType} title={title} message={message} onConfirm={onConfirm} onClose={closeModal} isLoading={isActionLoading} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200"><QrCode className="text-white" size={28} /></div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">Scan <span className="text-indigo-600">Product Log</span></h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">Lihat riwayat scan barcode produk pada modul pengiriman dan packing.</p>
        </div>
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<QrCode size={20} />} iconBgColor="bg-indigo-50" iconColor="text-indigo-600" label="TOTAL SCAN LOG" value={data.length} />
      </div>

      <div className="mb-8"><FilterBar searchPlaceholder="Cari nama atau kode produk..." searchValue={search} onSearchChange={setSearch} /></div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100">
                {["No", "Waktu Scan", "Tipe Scan", "Nama Produk", "Kode", "Qty", "Keterangan", "Aksi"].map(h => (
                  <th key={h} className={`px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest ${h === "Aksi" ? "text-center" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
              ) : data.length > 0 ? (
                data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">{(page - 1) * 10 + idx + 1}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{new Date(item.scan_date).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-bold text-indigo-600">{item.scan_type}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{item.product_name || "-"}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-500">{item.product_code || "-"}</td>
                    <td className="px-6 py-4 text-sm font-black">{item.qty}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{item.note || "-"}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleDelete(item.id!)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8} className="text-center py-16"><p className="text-gray-400">Belum ada data scan</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} totalItems={(page - 1) * 10 + data.length} onPageChange={fetchData} />
      </div>
    </div>
  );
}
