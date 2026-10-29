"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Package, AlertTriangle, ArrowDown, ArrowUp, TrendingDown } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface StockRow {
  product_id: number;
  product_name: string;
  product_code: string;
  current_stock: number;
  min_qty: number;
  max_qty: number;
  [key: string]: any;
}

export default function ControlStockWHFGPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StockRow[]>([]);
  const [days, setDays] = useState(31);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.express.get(`/reports/control-stock-whfg?year=${year}&month=${month}`);
      if (res.data?.success) { setData(res.data.data); setDays(res.data.meta.days); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [year, month]);
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const getCellColor = (val: number, min: number, max: number) => {
    if (min <= 0 && max <= 0) return "";
    if (val <= 0) return "bg-red-200 text-red-900 font-black";
    if (val < min) return "bg-red-100 text-red-800 font-bold";
    if (val > max) return "bg-amber-100 text-amber-800 font-bold";
    return "bg-emerald-50 text-emerald-800";
  };

  const lowStockCount = data.filter(r => r.current_stock > 0 && r.min_qty > 0 && r.current_stock < r.min_qty).length;
  const outOfStockCount = data.filter(r => r.current_stock <= 0).length;

  return (
    <div className="min-h-[85vh] flex flex-col p-4 md:p-8 space-y-6 animate-in fade-in duration-500 bg-[#f8fafc]">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-[2.5rem] blur opacity-10" />
        <div className="relative bg-white/80 backdrop-blur-xl border border-white/20 p-6 rounded-[2.5rem] shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"><ArrowLeft size={18} /></button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg"><Package size={28} className="text-white" /></div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Control Stock Finished Goods</h1>
                <p className="text-sm text-gray-500 font-medium">Proyeksi Saldo Harian {monthNames[month - 1]} {year}</p>
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

      {/* Legend & Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"><Package size={18} className="text-white" /></div>
          <div><p className="text-lg font-black text-gray-900">{data.length}</p><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total Part</p></div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center"><TrendingDown size={18} className="text-white" /></div>
          <div><p className="text-lg font-black text-gray-900">{lowStockCount}</p><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Below Min</p></div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center"><AlertTriangle size={18} className="text-white" /></div>
          <div><p className="text-lg font-black text-gray-900">{outOfStockCount}</p><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Out of Stock</p></div>
        </div>
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-[10px] font-black text-gray-500 uppercase mb-2">Legend</p>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold">
            <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">Normal (Min ≤ Stok ≤ Max)</span>
            <span className="px-2 py-1 rounded bg-red-100 text-red-700">Di Bawah Min</span>
            <span className="px-2 py-1 rounded bg-red-200 text-red-900">Stockout (0)</span>
            <span className="px-2 py-1 rounded bg-amber-100 text-amber-700">Di Atas Max</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-emerald-500" /></div>
      ) : data.length === 0 ? (
        <div className="text-center py-20"><Package size={48} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-400 font-bold">Tidak ada data stok FG</p></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-emerald-50 border-b border-emerald-100">
                  <th className="sticky left-0 bg-emerald-50 z-10 px-3 py-3 text-left font-black text-emerald-700 uppercase text-[10px] min-w-[180px]">Part Name</th>
                  <th className="px-2 py-3 text-center font-bold text-emerald-600 min-w-[50px]">Min</th>
                  <th className="px-2 py-3 text-center font-bold text-emerald-600 min-w-[50px]">Max</th>
                  {Array.from({ length: days }, (_, i) => (
                    <th key={i} className="px-2 py-3 text-center font-bold text-emerald-500 min-w-[50px]">{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-emerald-50/20 transition">
                    <td className="sticky left-0 bg-white z-10 px-3 py-2 font-bold text-gray-800 truncate max-w-[180px]" title={row.product_name}>
                      {row.product_name}
                      <span className="block text-[9px] text-gray-400">{row.product_code}</span>
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-sky-600">{Number(row.min_qty).toLocaleString("id-ID")}</td>
                    <td className="px-2 py-2 text-center font-bold text-sky-600">{Number(row.max_qty).toLocaleString("id-ID")}</td>
                    {Array.from({ length: days }, (_, i) => {
                      const val = row[`d${i + 1}`] || 0;
                      const cellColor = getCellColor(val, Number(row.min_qty), Number(row.max_qty));
                      return (
                        <td key={i} className={`px-2 py-2 text-center font-medium ${cellColor}`}>
                          {val !== 0 ? Number(val).toLocaleString("id-ID") : "-"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
