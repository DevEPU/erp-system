"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Users, Trophy, Target, TrendingUp, TrendingDown } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface LeaderData {
  leader_group: string;
  total_target: number;
  total_actual: number;
  total_ng: number;
  ach_rate_mtd: number;
  days: Record<number, { target: number; actual: number; ng: number; ach: number }>;
}

export default function AchLeaderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LeaderData[]>([]);
  const [days, setDays] = useState(31);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [viewMode, setViewMode] = useState<"ach" | "target" | "actual">("ach");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.express.get(`/reports/ach-leader?year=${year}&month=${month}`);
      if (res.data?.success) { setData(res.data.data); setDays(res.data.meta.days); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [year, month]);
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const getAchColor = (v: number) => {
    if (v >= 100) return "text-emerald-700 bg-emerald-50";
    if (v >= 80) return "text-amber-700 bg-amber-50";
    if (v > 0) return "text-red-700 bg-red-50";
    return "text-gray-400";
  };

  const getBarWidth = (v: number) => `${Math.min(v, 120)}%`;

  return (
    <div className="min-h-[85vh] flex flex-col p-4 md:p-8 space-y-6 animate-in fade-in duration-500 bg-[#f8fafc]">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-500 rounded-[2.5rem] blur opacity-10" />
        <div className="relative bg-white/80 backdrop-blur-xl border border-white/20 p-6 rounded-[2.5rem] shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"><ArrowLeft size={18} /></button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg"><Trophy size={28} className="text-white" /></div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">KPI Leader Group</h1>
                <p className="text-sm text-gray-500 font-medium">{monthNames[month - 1]} {year} • {data.length} Group</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                {[
                  { key: "ach", label: "Ach %" },
                  { key: "target", label: "Target" },
                  { key: "actual", label: "Aktual" },
                ].map((m) => (
                  <button key={m.key} onClick={() => setViewMode(m.key as any)} className={`px-3 py-2 text-[10px] font-bold transition ${viewMode === m.key ? "bg-purple-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                    {m.label}
                  </button>
                ))}
              </div>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold bg-white">
                {monthNames.map((n, i) => (<option key={i} value={i + 1}>{n}</option>))}
              </select>
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold" />
            </div>
          </div>
        </div>
      </div>

      {/* Leader Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-purple-500" /></div>
      ) : data.length === 0 ? (
        <div className="text-center py-20"><Trophy size={48} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-400 font-bold">Belum ada data leader untuk periode ini</p></div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.sort((a, b) => b.ach_rate_mtd - a.ach_rate_mtd).map((leader, idx) => (
              <div key={idx} className={`rounded-2xl border-2 p-5 transition-all hover:shadow-lg ${leader.ach_rate_mtd >= 100 ? "border-emerald-200 bg-white" : leader.ach_rate_mtd >= 80 ? "border-amber-200 bg-white" : "border-red-200 bg-white"}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg ${idx === 0 ? "bg-gradient-to-br from-amber-400 to-yellow-600" : idx === 1 ? "bg-gradient-to-br from-gray-300 to-gray-500" : "bg-gradient-to-br from-amber-600 to-amber-800"}`}>
                      {idx < 3 ? ["🥇", "🥈", "🥉"][idx] : <Users size={20} />}
                    </div>
                    <div>
                      <p className="font-black text-gray-900 text-lg">{leader.leader_group}</p>
                      <p className="text-[10px] text-gray-400 font-bold">Group Leader</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-xl text-sm font-black ${getAchColor(leader.ach_rate_mtd)}`}>
                    {leader.ach_rate_mtd}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-100 rounded-full h-3 mb-3 overflow-hidden">
                  <div className={`h-3 rounded-full transition-all duration-1000 ${leader.ach_rate_mtd >= 100 ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : leader.ach_rate_mtd >= 80 ? "bg-gradient-to-r from-amber-400 to-amber-600" : "bg-gradient-to-r from-red-400 to-red-600"}`}
                    style={{ width: getBarWidth(leader.ach_rate_mtd) }} />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-sky-50 rounded-lg p-2 text-center">
                    <p className="text-sm font-black text-sky-700">{leader.total_target.toLocaleString("id-ID")}</p>
                    <p className="text-[8px] font-bold text-sky-500 uppercase">Target</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2 text-center">
                    <p className="text-sm font-black text-emerald-700">{leader.total_actual.toLocaleString("id-ID")}</p>
                    <p className="text-[8px] font-bold text-emerald-500 uppercase">Aktual</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2 text-center">
                    <p className="text-sm font-black text-red-700">{leader.total_ng.toLocaleString("id-ID")}</p>
                    <p className="text-[8px] font-bold text-red-500 uppercase">NG</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Daily Detail Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-black text-gray-800">Detail Harian per Leader</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-purple-50 border-b border-purple-100">
                    <th className="sticky left-0 bg-purple-50 z-10 px-3 py-3 text-left font-black text-purple-700 uppercase text-[10px] min-w-[120px]">Leader</th>
                    {Array.from({ length: days }, (_, i) => (
                      <th key={i} className="px-2 py-3 text-center font-bold text-purple-500 min-w-[50px]">{i + 1}</th>
                    ))}
                    <th className="px-3 py-3 text-center font-black text-purple-800 bg-purple-100 min-w-[60px]">MTD</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((leader, idx) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-purple-50/20 transition">
                      <td className="sticky left-0 bg-white z-10 px-3 py-2 font-bold text-gray-800">{leader.leader_group}</td>
                      {Array.from({ length: days }, (_, i) => {
                        const dayData = leader.days[i + 1];
                        let cellVal = "-";
                        let cellClass = "text-gray-200";
                        if (dayData) {
                          if (viewMode === "ach") {
                            cellVal = `${dayData.ach}%`;
                            cellClass = dayData.ach >= 100 ? "text-emerald-700 bg-emerald-50 font-bold" : dayData.ach >= 80 ? "text-amber-700 bg-amber-50 font-bold" : "text-red-700 bg-red-50 font-bold";
                          } else if (viewMode === "target") {
                            cellVal = dayData.target.toLocaleString("id-ID");
                            cellClass = "text-gray-700 font-medium";
                          } else {
                            cellVal = dayData.actual.toLocaleString("id-ID");
                            cellClass = dayData.actual > 0 ? "text-emerald-700 font-medium" : "text-gray-300";
                          }
                        }
                        return (<td key={i} className={`px-2 py-2 text-center ${cellClass}`}>{cellVal}</td>);
                      })}
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-black ${getAchColor(leader.ach_rate_mtd)}`}>{leader.ach_rate_mtd}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
