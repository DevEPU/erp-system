"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Truck, Calendar, Search, TrendingUp, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface OSDeliveryRow {
  product_id: number;
  product_name: string;
  product_code: string;
  customer: string;
  total_os: number;
  total_del: number;
  pending: number;
  [key: string]: any;
}

export default function OSDeliveryMatrixPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OSDeliveryRow[]>([]);
  const [days, setDays] = useState(31);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [search, setSearch] = useState("");
  const [viewFilter, setViewFilter] = useState<"both" | "os" | "del">("both");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.express.get(`/reports/os-delivery-matrix?year=${year}&month=${month}`);
      if (res.data?.success) {
        setData(res.data.data);
        setDays(res.data.meta.days);
      }
    } catch (err) {
      console.error("Failed to fetch OS Delivery matrix:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const filtered = data.filter((r) => {
    if (!search) return true;
    return (
      r.product_name.toLowerCase().includes(search.toLowerCase()) ||
      r.customer?.toLowerCase().includes(search.toLowerCase()) ||
      r.product_code?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const totals = {
    os: filtered.reduce((s, r) => s + r.total_os, 0),
    del: filtered.reduce((s, r) => s + r.total_del, 0),
    pending: filtered.reduce((s, r) => s + r.pending, 0),
  };

  return (
    <div className="min-h-[85vh] flex flex-col p-4 md:p-8 space-y-6 animate-in fade-in duration-500 bg-[#f8fafc]">
      {/* Header with Glassmorphism */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-[2.5rem] blur opacity-10" />
        <div className="relative bg-white/80 backdrop-blur-xl border border-white/20 p-6 rounded-[2.5rem] shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
                <Truck size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Matriks Order Sheet vs Delivery</h1>
                <p className="text-sm text-gray-500 font-medium">
                  {monthNames[month - 1]} {year} • {data.length} Part
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                <button
                  onClick={() => setViewFilter("both")}
                  className={`px-3 py-2 text-xs font-bold transition ${viewFilter === "both" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  OS & Del
                </button>
                <button
                  onClick={() => setViewFilter("os")}
                  className={`px-3 py-2 text-xs font-bold transition ${viewFilter === "os" ? "bg-amber-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  OS Saja
                </button>
                <button
                  onClick={() => setViewFilter("del")}
                  className={`px-3 py-2 text-xs font-bold transition ${viewFilter === "del" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  Del Saja
                </button>
              </div>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold bg-white"
              >
                {monthNames.map((n, i) => (
                  <option key={i} value={i + 1}>{n}</option>
                ))}
              </select>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Truck size={18} className="text-white" />
          </div>
          <div>
            <p className="text-lg font-black text-gray-900">{filtered.length}</p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total Part</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Calendar size={18} className="text-white" />
          </div>
          <div>
            <p className="text-lg font-black text-gray-900">{totals.os.toLocaleString("id-ID")}</p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total Order (OS)</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <p className="text-lg font-black text-gray-900">{totals.del.toLocaleString("id-ID")}</p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total Delivery</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center">
            <AlertCircle size={18} className="text-white" />
          </div>
          <div>
            <p className="text-lg font-black text-gray-900">{totals.pending.toLocaleString("id-ID")}</p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Pending / Deviasi</p>
          </div>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Cari part, customer, kode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
      </div>

      {/* Matrix Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Truck size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 font-bold">Tidak ada data order sheet atau pengiriman untuk periode ini</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-blue-50 border-b border-blue-100">
                  <th className="sticky left-0 bg-blue-50 z-10 px-3 py-3 text-left font-black text-blue-700 uppercase text-[10px] min-w-[180px]">
                    Part Name
                  </th>
                  <th className="px-2 py-3 text-left font-bold text-blue-600 min-w-[90px]">Customer</th>
                  <th className="px-2 py-3 text-center font-bold text-blue-600 min-w-[50px]">Type</th>
                  {Array.from({ length: days }, (_, i) => (
                    <th key={i} className="px-2 py-3 text-center font-bold text-blue-500 min-w-[45px]">
                      {i + 1}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-black text-blue-800 bg-blue-100 min-w-[70px]">Total</th>
                  <th className="px-3 py-3 text-center font-black text-rose-700 bg-rose-50 min-w-[60px]">Pending</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <>
                    {(viewFilter === "both" || viewFilter === "os") && (
                      <tr key={`${idx}-os`} className="border-b border-gray-50 hover:bg-amber-50/20 transition">
                        <td className="sticky left-0 bg-white z-10 px-3 py-2 font-bold text-gray-800 truncate max-w-[180px]" title={row.product_name}>
                          {row.product_name}
                          <span className="block text-[9px] text-gray-400">{row.product_code}</span>
                        </td>
                        <td className="px-2 py-2 text-gray-600 font-medium">{row.customer || "-"}</td>
                        <td className="px-2 py-2 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[9px]">OS</span>
                        </td>
                        {Array.from({ length: days }, (_, i) => {
                          const val = row[`os_d${i + 1}`] || 0;
                          return (
                            <td key={i} className={`px-2 py-2 text-center font-medium ${val > 0 ? "text-amber-800 bg-amber-50/50 font-bold" : "text-gray-200"}`}>
                              {val > 0 ? val.toLocaleString("id-ID") : "-"}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center font-black text-amber-700 bg-amber-50">{row.total_os.toLocaleString("id-ID")}</td>
                        <td className={`px-3 py-2 text-center font-black ${row.pending > 0 ? "text-rose-600 bg-rose-50/50" : "text-emerald-600"}`}>
                          {row.pending.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    )}
                    {(viewFilter === "both" || viewFilter === "del") && (
                      <tr key={`${idx}-del`} className="border-b border-gray-100 hover:bg-emerald-50/20 transition bg-gray-50/30">
                        <td className="sticky left-0 bg-gray-50/80 z-10 px-3 py-1.5 font-medium text-gray-500 text-[10px] italic">
                          ↳ Realisasi Pengiriman
                        </td>
                        <td className="px-2 py-1.5 text-gray-400 text-[10px]">{row.customer || "-"}</td>
                        <td className="px-2 py-1.5 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px]">DEL</span>
                        </td>
                        {Array.from({ length: days }, (_, i) => {
                          const val = row[`del_d${i + 1}`] || 0;
                          return (
                            <td key={i} className={`px-2 py-1.5 text-center font-medium ${val > 0 ? "text-emerald-800 bg-emerald-50/50 font-bold" : "text-gray-200"}`}>
                              {val > 0 ? val.toLocaleString("id-ID") : "-"}
                            </td>
                          );
                        })}
                        <td className="px-3 py-1.5 text-center font-black text-emerald-700 bg-emerald-50">{row.total_del.toLocaleString("id-ID")}</td>
                        <td className="px-3 py-1.5 text-center text-gray-300 text-[10px]">-</td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-blue-100 border-t-2 border-blue-300 font-black">
                  <td className="sticky left-0 bg-blue-100 z-10 px-3 py-3 text-blue-900 uppercase text-[10px]" colSpan={3}>
                    Grand Total
                  </td>
                  {Array.from({ length: days }, (_, i) => {
                    const osT = filtered.reduce((s, r) => s + (r[`os_d${i + 1}`] || 0), 0);
                    const delT = filtered.reduce((s, r) => s + (r[`del_d${i + 1}`] || 0), 0);
                    return (
                      <td key={i} className="px-2 py-3 text-center text-[10px]">
                        <span className="block text-amber-800">{osT > 0 ? osT.toLocaleString("id-ID") : "-"}</span>
                        <span className="block text-emerald-800">{delT > 0 ? delT.toLocaleString("id-ID") : "-"}</span>
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center text-blue-900">
                    <span className="block text-amber-800">{totals.os.toLocaleString("id-ID")}</span>
                    <span className="block text-emerald-800">{totals.del.toLocaleString("id-ID")}</span>
                  </td>
                  <td className="px-3 py-3 text-center text-rose-800">{totals.pending.toLocaleString("id-ID")}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
