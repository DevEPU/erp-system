"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Target, TrendingUp, TrendingDown, Award, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface AchRow {
  product_id: number;
  product_name: string;
  product_code: string;
  customer: string;
  po_qty: number;
  plan_qty: number;
  actual_prod: number;
  actual_ng: number;
  delivery_qty: number;
  deviasi: number;
  ach_vs_plan: number;
  ach_vs_po: number;
}

export default function AchRatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AchRow[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.express.get(`/reports/ach-rate?year=${year}&month=${month}`);
      if (res.data?.success) setData(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [year, month]);
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const filtered = data.filter(r => {
    if (!search) return true;
    return r.product_name.toLowerCase().includes(search.toLowerCase()) || r.customer?.toLowerCase().includes(search.toLowerCase());
  });

  const totals = {
    po: filtered.reduce((s, r) => s + r.po_qty, 0),
    plan: filtered.reduce((s, r) => s + r.plan_qty, 0),
    actual: filtered.reduce((s, r) => s + r.actual_prod, 0),
    ng: filtered.reduce((s, r) => s + r.actual_ng, 0),
    delivery: filtered.reduce((s, r) => s + r.delivery_qty, 0),
  };
  const overallAch = totals.plan > 0 ? Math.round((totals.actual / totals.plan) * 10000) / 100 : 0;

  const getAchColor = (v: number) => {
    if (v >= 100) return "text-emerald-700 bg-emerald-50";
    if (v >= 80) return "text-amber-700 bg-amber-50";
    return "text-red-700 bg-red-50";
  };

  return (
    <div className="min-h-[85vh] flex flex-col p-4 md:p-8 space-y-6 animate-in fade-in duration-500 bg-[#f8fafc]">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-600 to-orange-500 rounded-[2.5rem] blur opacity-10" />
        <div className="relative bg-white/80 backdrop-blur-xl border border-white/20 p-6 rounded-[2.5rem] shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"><ArrowLeft size={18} /></button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg"><Award size={28} className="text-white" /></div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Achievement Rate</h1>
                <p className="text-sm text-gray-500 font-medium">{monthNames[month - 1]} {year} • {data.length} Part</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold bg-white">
                {monthNames.map((n, i) => (<option key={i} value={i + 1}>{n}</option>))}
              </select>
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold" />
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: "PO Customer", value: totals.po.toLocaleString("id-ID"), color: "from-blue-500 to-indigo-600", icon: Target },
          { label: "Plan Produksi", value: totals.plan.toLocaleString("id-ID"), color: "from-indigo-500 to-violet-600", icon: Target },
          { label: "Aktual Produksi", value: totals.actual.toLocaleString("id-ID"), color: "from-emerald-500 to-teal-600", icon: TrendingUp },
          { label: "Total NG", value: totals.ng.toLocaleString("id-ID"), color: "from-red-500 to-rose-600", icon: TrendingDown },
          { label: "Delivery", value: totals.delivery.toLocaleString("id-ID"), color: "from-sky-500 to-blue-600", icon: TrendingUp },
          { label: "Achievement", value: `${overallAch}%`, color: overallAch >= 100 ? "from-emerald-500 to-teal-600" : "from-amber-500 to-orange-600", icon: Award },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}><s.icon size={18} className="text-white" /></div>
            <div><p className="text-lg font-black text-gray-900 truncate">{s.value}</p><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p></div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Cari part atau customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full max-w-md pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-amber-500" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-amber-50 border-b border-amber-100">
                  <th className="px-3 py-3 text-left font-black text-amber-700 uppercase text-[10px]">No</th>
                  <th className="px-3 py-3 text-left font-black text-amber-700 uppercase text-[10px]">Customer</th>
                  <th className="px-3 py-3 text-left font-black text-amber-700 uppercase text-[10px] min-w-[180px]">Part Name</th>
                  <th className="px-3 py-3 text-right font-black text-amber-700 uppercase text-[10px]">PO Cust</th>
                  <th className="px-3 py-3 text-right font-black text-amber-700 uppercase text-[10px]">Plan</th>
                  <th className="px-3 py-3 text-right font-black text-amber-700 uppercase text-[10px]">Act Prod</th>
                  <th className="px-3 py-3 text-right font-black text-amber-700 uppercase text-[10px]">NG</th>
                  <th className="px-3 py-3 text-right font-black text-amber-700 uppercase text-[10px]">Delivery</th>
                  <th className="px-3 py-3 text-right font-black text-amber-700 uppercase text-[10px]">Deviasi</th>
                  <th className="px-3 py-3 text-center font-black text-amber-700 uppercase text-[10px]">Ach vs Plan</th>
                  <th className="px-3 py-3 text-center font-black text-amber-700 uppercase text-[10px]">Ach vs PO</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-amber-50/30 transition">
                    <td className="px-3 py-2 font-bold text-gray-500">{idx + 1}</td>
                    <td className="px-3 py-2 font-bold text-gray-600">{r.customer || "-"}</td>
                    <td className="px-3 py-2 font-bold text-gray-800 truncate max-w-[180px]" title={r.product_name}>
                      {r.product_name}
                      <span className="block text-[9px] text-gray-400">{r.product_code}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-700">{r.po_qty.toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-700">{r.plan_qty.toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-700">{r.actual_prod.toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2 text-right font-bold text-red-600">{r.actual_ng.toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2 text-right font-medium text-sky-700">{r.delivery_qty.toLocaleString("id-ID")}</td>
                    <td className={`px-3 py-2 text-right font-bold ${r.deviasi >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {r.deviasi >= 0 ? "+" : ""}{r.deviasi.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-black ${getAchColor(r.ach_vs_plan)}`}>{r.ach_vs_plan}%</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-black ${getAchColor(r.ach_vs_po)}`}>{r.ach_vs_po}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-amber-100 border-t-2 border-amber-300 font-black">
                  <td className="px-3 py-3" colSpan={3}>TOTAL</td>
                  <td className="px-3 py-3 text-right">{totals.po.toLocaleString("id-ID")}</td>
                  <td className="px-3 py-3 text-right">{totals.plan.toLocaleString("id-ID")}</td>
                  <td className="px-3 py-3 text-right text-emerald-800">{totals.actual.toLocaleString("id-ID")}</td>
                  <td className="px-3 py-3 text-right text-red-800">{totals.ng.toLocaleString("id-ID")}</td>
                  <td className="px-3 py-3 text-right">{totals.delivery.toLocaleString("id-ID")}</td>
                  <td className="px-3 py-3 text-right">{(totals.actual - totals.plan).toLocaleString("id-ID")}</td>
                  <td className="px-3 py-3 text-center"><span className={`px-2 py-0.5 rounded-lg text-[10px] ${getAchColor(overallAch)}`}>{overallAch}%</span></td>
                  <td className="px-3 py-3 text-center">-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
