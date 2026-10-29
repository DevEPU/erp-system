"use client";

import { useState, useEffect } from "react";
import TablePagination from "@/components/ui/TablePagination";
import { AlertOctagon, Search, Eye, X, Copy, Check } from "lucide-react";
import api from "@/lib/api";

type ErrorLog = {
  id: number;
  tgl: string;
  user_name: string;
  role_name: string;
  method: string;
  url: string;
  error_type_name: string;
  payload: string | null;
  exception: string | null;
  data_source_type: string | null;
  hit_url_date: string | null;
  response_code: number | null;
  response_message: string | null;
};

export default function ErrorLogsPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
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

  // Details Modal State
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedException, setCopiedException] = useState(false);

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
      const res = await api.express.get("/error-logs", {
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
      console.error("Failed to fetch error logs", error);
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    } catch (e) {
      return dateStr;
    }
  };

  const prettifyJson = (jsonStr: string | null) => {
    if (!jsonStr) return "-";
    try {
      const parsed = JSON.parse(jsonStr);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return jsonStr;
    }
  };

  const handleCopyText = (text: string, type: "payload" | "exception") => {
    navigator.clipboard.writeText(text);
    if (type === "payload") {
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    } else {
      setCopiedException(true);
      setTimeout(() => setCopiedException(false), 2000);
    }
  };

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-200">
              <AlertOctagon className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Error <span className="text-red-600">Logs</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Pantau galat, pengecualian sistem, dan status tanggapan API untuk keperluan diagnostik dan troubleshooting.
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
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white font-medium outline-none focus:ring-1 focus:ring-red-500"
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
            placeholder="Global Search"
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-red-500 outline-none text-sm bg-white placeholder-gray-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/70">
              <tr className="divide-x divide-gray-100 text-left border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-4 py-4 w-1/12">Tgl.</th>
                <th className="px-4 py-4 w-1/12">User</th>
                <th className="px-4 py-4 w-1/12">Role</th>
                <th className="px-4 py-4 w-1/12">Method</th>
                <th className="px-4 py-4 w-2/12">URL</th>
                <th className="px-4 py-4 w-1.5/12">Error Type</th>
                <th className="px-4 py-4 w-1.5/12">Payload</th>
                <th className="px-4 py-4 w-1.5/12">Exception</th>
                <th className="px-4 py-4 w-1/12">Data Source</th>
                <th className="px-4 py-4 w-1/12">Hit URL Date</th>
                <th className="px-4 py-4 w-0.5/12">Resp</th>
                <th className="px-4 py-4 w-1/12">Message</th>
                <th className="px-4 py-4 w-0.5/12 text-center">Hit URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse divide-x divide-gray-100">
                    {Array.from({ length: 13 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-red-50/10 transition-colors divide-x divide-gray-100 text-[11px] text-gray-600 font-medium">
                    <td className="px-4 py-3.5 whitespace-nowrap text-gray-500">{formatDate(log.tgl)}</td>
                    <td className="px-4 py-3.5 font-bold text-gray-800 whitespace-nowrap">{log.user_name}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{log.role_name}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wide ${
                        log.method === 'POST' ? 'bg-blue-50 text-blue-600' :
                        log.method === 'PUT' ? 'bg-amber-50 text-amber-600' :
                        log.method === 'DELETE' ? 'bg-red-50 text-red-600' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 max-w-xs truncate" title={log.url}>
                      {log.url}
                    </td>
                    <td className="px-4 py-3.5 text-red-600 font-bold max-w-xs truncate" title={log.error_type_name}>
                      {log.error_type_name}
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 font-mono text-[9px] max-w-[120px] truncate" title={log.payload || ""}>
                      {log.payload || "-"}
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 font-mono text-[9px] max-w-[120px] truncate" title={log.exception || ""}>
                      {log.exception || "-"}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{log.data_source_type || "-"}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-gray-500">{formatDate(log.hit_url_date)}</td>
                    <td className="px-4 py-3.5 font-bold text-center text-red-500 whitespace-nowrap">{log.response_code ?? "-"}</td>
                    <td className="px-4 py-3.5 text-red-600 max-w-xs truncate" title={log.response_message || ""}>
                      {log.response_message || "-"}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Inspect Log Details"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="px-6 py-12 text-center text-gray-400 italic">
                    Tidak ada log error ditemukan.
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

      {/* Inspect Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl border border-gray-100 shadow-2xl p-6 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded font-black">
                  {selectedLog.response_code || 500} ERROR
                </span>
                <h3 className="text-lg font-black text-gray-900">
                  Inspect Log: {selectedLog.error_type_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-5 custom-scrollbar text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div>
                  <p className="font-bold text-gray-400 uppercase tracking-wider text-[9px]">Timestamp</p>
                  <p className="text-gray-800 font-semibold">{formatDate(selectedLog.tgl)}</p>
                </div>
                <div>
                  <p className="font-bold text-gray-400 uppercase tracking-wider text-[9px]">User / Role</p>
                  <p className="text-gray-800 font-semibold">{selectedLog.user_name} ({selectedLog.role_name})</p>
                </div>
                <div>
                  <p className="font-bold text-gray-400 uppercase tracking-wider text-[9px]">Source Type</p>
                  <p className="text-gray-800 font-semibold">{selectedLog.data_source_type || "-"}</p>
                </div>
                <div className="md:col-span-3">
                  <p className="font-bold text-gray-400 uppercase tracking-wider text-[9px] mb-1">Request Endpoint</p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-black rounded text-[9px]">{selectedLog.method}</span>
                    <span className="text-gray-800 font-mono text-xs">{selectedLog.url}</span>
                  </div>
                </div>
              </div>

              {/* Payload Block */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-gray-700 uppercase tracking-widest text-[10px]">Request Payload</h4>
                  {selectedLog.payload && (
                    <button
                      onClick={() => handleCopyText(prettifyJson(selectedLog.payload), "payload")}
                      className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold hover:bg-emerald-50 px-2 py-1 rounded"
                    >
                      {copiedPayload ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedPayload ? "Copied!" : "Copy Payload"}</span>
                    </button>
                  )}
                </div>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl font-mono text-[10px] overflow-x-auto max-h-48 border border-gray-800">
                  {prettifyJson(selectedLog.payload)}
                </pre>
              </div>

              {/* Exception Block */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-gray-700 uppercase tracking-widest text-[10px] text-red-600">Exception & Stack Trace</h4>
                  {selectedLog.exception && (
                    <button
                      onClick={() => handleCopyText(prettifyJson(selectedLog.exception), "exception")}
                      className="flex items-center gap-1 text-[10px] text-red-600 font-bold hover:bg-red-50 px-2 py-1 rounded"
                    >
                      {copiedException ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedException ? "Copied!" : "Copy Exception"}</span>
                    </button>
                  )}
                </div>
                <pre className="bg-red-950/20 text-red-200 p-4 rounded-xl font-mono text-[10px] overflow-x-auto max-h-60 border border-red-900/30 whitespace-pre-wrap">
                  {prettifyJson(selectedLog.exception)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-100 pt-3 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
