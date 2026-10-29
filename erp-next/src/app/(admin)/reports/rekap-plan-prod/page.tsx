"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Calendar, Loader2, FileSpreadsheet, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface MatrixRow {
  part_name: string;
  part_code: string;
  product_id: number;
  total: number;
  [key: string]: any;
}

export default function RekapPlanProdPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MatrixRow[]>([]);
  const [days, setDays] = useState(31);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [viewMode, setViewMode] = useState<"plan" | "actual">("plan");

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = viewMode === "plan" ? "rekap-plan-prod" : "rekap-actual-prod";
      const res = await api.express.get(`/reports/${endpoint}?year=${year}&month=${month}`);
      if (res.data?.success) {
        setData(res.data.data);
        setDays(res.data.meta.days);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [year, month, viewMode]);

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const grandTotal = data.reduce((s, r) => s + r.total, 0);

  return (
    <div className="min-h-[85vh] flex flex-col p-4 md:p-8 space-y-6 animate-in fade-in duration-500 bg-[#f8fafc]">
      {/* Header */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-500 rounded-[2.5rem] blur opacity-10" />
        <div className="relative bg-white/80 backdrop-blur-xl border border-white/20 p-6 rounded-[2.5rem] shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                <ArrowLeft size={18} />
              </button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <FileSpreadsheet size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Rekap {viewMode === "plan" ? "Rencana" : "Aktual"} Produksi</h1>
                <p className="text-sm text-gray-500 font-medium">Matriks {monthNames[month - 1]} {year} • {data.length} Part</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                <button onClick={() => setViewMode("plan")} className={`px-4 py-2 text-xs font-bold transition ${viewMode === "plan" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                  Plan
                </button>
                <button onClick={() => setViewMode("actual")} className={`px-4 py-2 text-xs font-bold transition ${viewMode === "actual" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                  Aktual
                </button>
              </div>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold bg-white">
                {monthNames.map((n, i) => (<option key={i} value={i + 1}>{n}</option>))}
              </select>
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold" />
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"><FileSpreadsheet size={18} className="text-white" /></div>
          <div><p className="text-lg font-black text-gray-900">{data.length}</p><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total Part</p></div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"><TrendingUp size={18} className="text-white" /></div>
          <div><p className="text-lg font-black text-gray-900">{grandTotal.toLocaleString("id-ID")}</p><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Grand Total</p></div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center"><Calendar size={18} className="text-white" /></div>
          <div><p className="text-lg font-black text-gray-900">{days}</p><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Hari Kerja</p></div>
        </div>
      </div>

      {/* Matrix Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>
      ) : data.length === 0 ? (
        <div className="text-center py-20">
          <FileSpreadsheet size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 font-bold">Belum ada data untuk periode ini</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="sticky left-0 bg-gray-50 z-10 px-3 py-3 text-left font-black text-gray-600 uppercase tracking-wider text-[10px] min-w-[200px]">Part Name</th>
                  {Array.from({ length: days }, (_, i) => (
                    <th key={i} className="px-2 py-3 text-center font-bold text-gray-500 min-w-[50px]">{i + 1}</th>
                  ))}
                  <th className="px-3 py-3 text-center font-black text-gray-700 uppercase tracking-wider text-[10px] bg-indigo-50 min-w-[70px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-sky-50/30 transition">
                    <td className="sticky left-0 bg-white z-10 px-3 py-2 font-bold text-gray-800 truncate max-w-[200px]" title={row.part_name}>
                      {row.part_name}
                      <span className="block text-[9px] text-gray-400 font-medium">{row.part_code}</span>
                    </td>
                    {Array.from({ length: days }, (_, i) => {
                      const val = row[`d${i + 1}`] || 0;
                      return (
                        <td key={i} className={`px-2 py-2 text-center font-medium ${val > 0 ? "text-gray-800" : "text-gray-200"}`}>
                          {val > 0 ? val.toLocaleString("id-ID") : "-"}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-black text-indigo-700 bg-indigo-50/50">{row.total.toLocaleString("id-ID")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-indigo-50 border-t-2 border-indigo-200">
                  <td className="sticky left-0 bg-indigo-50 z-10 px-3 py-3 font-black text-indigo-800 uppercase text-[10px]">Grand Total</td>
                  {Array.from({ length: days }, (_, i) => {
                    const dayTotal = data.reduce((s, r) => s + (r[`d${i + 1}`] || 0), 0);
                    return (
                      <td key={i} className="px-2 py-3 text-center font-bold text-indigo-700">
                        {dayTotal > 0 ? dayTotal.toLocaleString("id-ID") : "-"}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center font-black text-indigo-900 text-sm">{grandTotal.toLocaleString("id-ID")}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
