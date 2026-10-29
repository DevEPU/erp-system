"use client";

import { useState, useEffect, useCallback } from "react";
import { CircleSlash, Search, RefreshCw, ChevronDown } from "lucide-react";
import api from "@/lib/api";

export default function TutupPRPage() {
  const [prs, setPrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);
  const [closingId, setClosingId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showNotif = (type: "success" | "error", msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchPRs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/purchases", { limit: 500 });
      const all: any[] = res.data.data || [];
      // Show all PRs that are not yet closed (open/pending)
      const open = all.filter((pr) => !pr.is_closed || pr.is_closed === 0 || pr.is_closed === false);
      setPrs(open);
    } catch (e: any) {
      showNotif("error", e.message || "Gagal memuat data PR");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPRs();
  }, [fetchPRs]);

  const filtered = prs.filter((pr) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      pr.reference?.toLowerCase().includes(s) ||
      pr.department?.department_name?.toLowerCase().includes(s) ||
      pr.user?.name?.toLowerCase().includes(s)
    );
  });

  const displayed = filtered.slice(0, limit);

  const handleClose = async (id: number) => {
    if (!confirm("Tutup PR ini? PR tidak akan bisa diproses lebih lanjut.")) return;
    setClosingId(id);
    try {
      await api.express.post(`/purchases/${id}/close`);
      showNotif("success", "PR berhasil ditutup.");
      fetchPRs();
    } catch (e: any) {
      showNotif("error", e.message || "Gagal menutup PR");
    } finally {
      setClosingId(null);
    }
  };

  const handleReopen = async (id: number) => {
    if (!confirm("Buka kembali PR ini?")) return;
    setClosingId(id);
    try {
      await api.express.post(`/purchases/${id}/reopen`);
      showNotif("success", "PR berhasil dibuka kembali.");
      fetchPRs();
    } catch (e: any) {
      showNotif("error", e.message || "Gagal membuka kembali PR");
    } finally {
      setClosingId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-white font-semibold text-sm animate-in slide-in-from-top-2 duration-300 ${
            notification.type === "success" ? "bg-emerald-500" : "bg-red-500"
          }`}
        >
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <CircleSlash className="text-orange-500" size={22} />
            Tutup PR
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Kelola dan tutup Purchase Request yang tidak dilanjutkan.
          </p>
        </div>
        <button
          onClick={fetchPRs}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-600 transition-all"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:ring-2 focus:ring-blue-400 outline-none"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pencarian Global"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3 text-left font-bold text-gray-500 text-xs uppercase tracking-wide">
                  No. Permintaan
                </th>
                <th className="px-5 py-3 text-left font-bold text-gray-500 text-xs uppercase tracking-wide">
                  Departemen
                </th>
                <th className="px-5 py-3 text-left font-bold text-gray-500 text-xs uppercase tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3 text-left font-bold text-gray-500 text-xs uppercase tracking-wide">
                  Keterangan
                </th>
                <th className="px-5 py-3 text-center font-bold text-gray-500 text-xs uppercase tracking-wide">
                  Tutup / Buka
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-gray-100 rounded-lg" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-gray-400 font-medium">
                    Tidak ada Purchase Request yang perlu ditutup.
                  </td>
                </tr>
              ) : (
                displayed.map((pr) => (
                  <tr key={pr.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-3">
                      <span className="text-blue-600 font-semibold text-xs hover:underline cursor-pointer">
                        {pr.reference}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-xs">
                      {pr.department?.department_name || "-"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          pr.status?.toLowerCase() === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : pr.status?.toLowerCase() === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {pr.status || "Pending"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs italic">
                      {pr.note || "No PR ini masih terbuka"}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {pr.is_closed ? (
                        <button
                          onClick={() => handleReopen(pr.id)}
                          disabled={closingId === pr.id}
                          className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                        >
                          {closingId === pr.id ? "..." : "Buka Request"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleClose(pr.id)}
                          disabled={closingId === pr.id}
                          className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                        >
                          {closingId === pr.id ? "..." : "Tutup Request"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-400 font-medium">
            Menampilkan {Math.min(limit, filtered.length)} dari {filtered.length} data
          </div>
        )}
      </div>
    </div>
  );
}
