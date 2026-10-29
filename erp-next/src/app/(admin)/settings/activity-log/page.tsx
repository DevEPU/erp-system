"use client";

import { useState, useEffect } from "react";
import TablePagination from "@/components/ui/TablePagination";
import { History, Search } from "lucide-react";
import api from "@/lib/api";

type ActivityLog = {
  id: number;
  user_name: string;
  tgl: string;
  document_type: string;
  action_type: string;
  action_detail: string | null;
  ip_address: string;
  whid: string | null;
  nama_device: string | null;
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/activity-logs", {
        page,
        limit,
        search: debouncedSearch,
      });
      setLogs(res.data.data);
      setPagination({
        current_page: res.data.current_page,
        last_page: res.data.last_page,
        total: res.data.total,
      });
    } catch (error) {
      console.error("Failed to fetch activity logs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, limit, debouncedSearch]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.last_page) {
      setPage(newPage);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <History className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Activity <span className="text-emerald-600">Log</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Pantau log audit, jejak audit, dan perubahan data aktual yang dilakukan oleh pengguna sistem.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white font-medium outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Pencarian Global"
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-sm bg-white placeholder-gray-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/70">
              <tr className="divide-x divide-gray-100 text-left border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-5 py-4 w-1/12">User</th>
                <th className="px-5 py-4 w-2/12">Tgl.</th>
                <th className="px-5 py-4 w-2/12">Document Type</th>
                <th className="px-5 py-4 w-1/12">Action Type</th>
                <th className="px-5 py-4 w-3/12">Action Detail</th>
                <th className="px-5 py-4 w-1.5/12">IP Address</th>
                <th className="px-5 py-4 w-1/12">WHID</th>
                <th className="px-5 py-4 w-1.5/12">Nama Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse divide-x divide-gray-100">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors divide-x divide-gray-100 text-xs text-gray-600 font-medium">
                    <td className="px-5 py-3.5 text-gray-900 font-bold whitespace-nowrap">{log.user_name}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-gray-500">{formatDate(log.tgl)}</td>
                    <td className="px-5 py-3.5 text-blue-600 font-semibold whitespace-nowrap">{log.document_type}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        log.action_type === 'Delete' ? 'bg-red-50 text-red-600' :
                        log.action_type === 'Edit' ? 'bg-amber-50 text-amber-600' :
                        log.action_type === 'New' ? 'bg-green-50 text-green-600' :
                        log.action_type === 'Login' ? 'bg-blue-50 text-blue-600' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700 max-w-xs truncate" title={log.action_detail || ""}>
                      {log.action_detail || "-"}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{log.ip_address}</td>
                    <td className="px-5 py-3.5 text-gray-800 font-semibold whitespace-nowrap">{log.whid || "-"}</td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{log.nama_device || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400 italic">
                    Tidak ada aktivitas ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/50">
            <TablePagination
              totalItems={pagination.total}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
