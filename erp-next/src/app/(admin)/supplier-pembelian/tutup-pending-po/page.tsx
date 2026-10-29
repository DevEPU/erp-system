"use client";

import { useState, useEffect, useCallback } from "react";
import { XCircle, Search, RefreshCw, ChevronDown } from "lucide-react";
import api from "@/lib/api";

export default function TutupPendingPOPage() {
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);
  const [closingId, setClosingId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showNotif = (type: "success" | "error", msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchPOs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/purchase-orders", {
        params: { all: "true", search: search || undefined },
      });
      const allPOs: any[] = res.data.data || [];
      // Filter: status "Pending" and not closed
      const pending = allPOs.filter(
        (po) =>
          (!po.is_closed || po.is_closed === 0) &&
          (po.status === "Pending" || !po.status || po.received_status === "Pending")
      );
      setPos(pending);
    } catch (e: any) {
      showNotif("error", e.message || "Gagal memuat data PO");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchPOs();
  }, [fetchPOs]);

  const handleClose = async (id: number) => {
    if (!confirm("Tutup PO ini? PO tidak akan bisa diproses lebih lanjut.")) return;
    setClosingId(id);
    try {
      await api.express.post(`/purchase-orders/${id}/close`);
      showNotif("success", "PO berhasil ditutup.");
      fetchPOs();
    } catch (e: any) {
      showNotif("error", e.message || "Gagal menutup PO");
    } finally {
      setClosingId(null);
    }
  };

  const handleReopen = async (id: number) => {
    if (!confirm("Buka kembali PO ini?")) return;
    setClosingId(id);
    try {
      await api.express.post(`/purchase-orders/${id}/reopen`);
      showNotif("success", "PO berhasil dibuka kembali.");
      fetchPOs();
    } catch (e: any) {
      showNotif("error", e.message || "Gagal membuka kembali PO");
    } finally {
      setClosingId(null);
    }
  };

  const displayed = pos.slice(0, limit);

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
            <XCircle className="text-red-500" size={22} />
            Tutup Pending PO
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Kelola dan tutup Purchase Order yang masih berstatus Pending.
          </p>
        </div>
        <button
          onClick={fetchPOs}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-600 transition-all"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-col sm:flex-row gap-3 items-center">
        {/* Per-page select */}
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

        {/* Search */}
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
                  No. PO
                </th>
                <th className="px-5 py-3 text-left font-bold text-gray-500 text-xs uppercase tracking-wide">
                  Tgl. PO
                </th>
                <th className="px-5 py-3 text-left font-bold text-gray-500 text-xs uppercase tracking-wide">
                  Supplier
                </th>
                <th className="px-5 py-3 text-left font-bold text-gray-500 text-xs uppercase tracking-wide">
                  Keterangan
                </th>
                <th className="px-5 py-3 text-right font-bold text-gray-500 text-xs uppercase tracking-wide">
                  Jumlah Akhir
                </th>
                <th className="px-5 py-3 text-center font-bold text-gray-500 text-xs uppercase tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3 text-center font-bold text-gray-500 text-xs uppercase tracking-wide">
                  Tutup / Buka
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-gray-100 rounded-lg" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-gray-400 font-medium">
                    Tidak ada Purchase Order dengan status Pending.
                  </td>
                </tr>
              ) : (
                displayed.map((po) => (
                  <tr key={po.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-3">
                      <span className="text-blue-600 font-semibold hover:underline cursor-pointer text-xs">
                        {po.reference}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-xs">
                      {po.order_date
                        ? new Date(po.order_date).toLocaleDateString("id-ID")
                        : po.date
                        ? new Date(po.date).toLocaleDateString("id-ID")
                        : "-"}
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-800 text-xs">
                      {po.supplier_name || "-"}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs italic">
                      {po.note || "No PO ini masih terbuka"}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-gray-800 text-xs">
                      {parseFloat(po.total_amount || po.grand_total || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] font-bold uppercase">
                        Pending
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {po.is_closed ? (
                        <button
                          onClick={() => handleReopen(po.id)}
                          disabled={closingId === po.id}
                          className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                        >
                          {closingId === po.id ? "..." : "Buka Order"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleClose(po.id)}
                          disabled={closingId === po.id}
                          className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                        >
                          {closingId === po.id ? "..." : "Tutup Order"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && pos.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-400 font-medium">
            Menampilkan {Math.min(limit, pos.length)} dari {pos.length} data
          </div>
        )}
      </div>
    </div>
  );
}
