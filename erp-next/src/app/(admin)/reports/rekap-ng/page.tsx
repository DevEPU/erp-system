"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Calendar, Loader2, XCircle, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface NGRow {
  part_name: string;
  part_code: string;
  product_id: number;
  total: number;
  [key: string]: any;
}

export default function RekapNGPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<NGRow[]>([]);
  const [days, setDays] = useState(31);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.express.get(`/reports/rekap-ng?year=${year}&month=${month}`);
      if (res.data?.success) { setData(res.data.data); setDays(res.data.meta.days); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [year, month]);
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const grandTotal = data.reduce((s, r) => s + r.total, 0);

  return (
    <div className="min-h-[85vh] flex flex-col p-4 md:p-8 space-y-6 animate-in fade-in duration-500 bg-[#f8fafc]">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-rose-500 rounded-[2.5rem] blur opacity-10" />
        <div className="relative bg-white/80 backdrop-blur-xl border border-white/20 p-6 rounded-[2.5rem] shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"><ArrowLeft size={18} /></button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg"><XCircle size={28} className="text-white" /></div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Rekap Produk NG / Reject</h1>
                <p className="text-sm text-gray-500 font-medium">Matriks {monthNames[month - 1]} {year} • {data.length} Part</p>
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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center"><XCircle size={18} className="text-white" /></div>
          <div><p className="text-lg font-black text-gray-900">{data.length}</p><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Part Defect</p></div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center"><AlertTriangle size={18} className="text-white" /></div>
          <div><p className="text-lg font-black text-gray-900">{grandTotal.toLocaleString("id-ID")}</p><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total NG</p></div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center"><Calendar size={18} className="text-white" /></div>
          <div><p className="text-lg font-black text-gray-900">{days}</p><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Hari</p></div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-red-500" /></div>
      ) : data.length === 0 ? (
        <div className="text-center py-20"><XCircle size={48} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-400 font-bold">Tidak ada data NG untuk periode ini</p></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-red-50 border-b border-red-100">
                  <th className="sticky left-0 bg-red-50 z-10 px-3 py-3 text-left font-black text-red-700 uppercase tracking-wider text-[10px] min-w-[200px]">Part Name</th>
                  {Array.from({ length: days }, (_, i) => (
                    <th key={i} className="px-2 py-3 text-center font-bold text-red-400 min-w-[45px]">{i + 1}</th>
                  ))}
                  <th className="px-3 py-3 text-center font-black text-red-800 bg-red-100 min-w-[70px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-red-50/30 transition">
                    <td className="sticky left-0 bg-white z-10 px-3 py-2 font-bold text-gray-800 truncate max-w-[200px]" title={row.part_name}>
                      {row.part_name}
                      <span className="block text-[9px] text-gray-400">{row.part_code}</span>
                    </td>
                    {Array.from({ length: days }, (_, i) => {
                      const val = row[`d${i + 1}`] || 0;
                      return (
                        <td key={i} className={`px-2 py-2 text-center font-medium ${val > 0 ? "text-red-700 bg-red-50 font-bold" : "text-gray-200"}`}>
                          {val > 0 ? val.toLocaleString("id-ID") : "-"}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-black text-red-800 bg-red-50">{row.total.toLocaleString("id-ID")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-red-100 border-t-2 border-red-300">
                  <td className="sticky left-0 bg-red-100 z-10 px-3 py-3 font-black text-red-900 uppercase text-[10px]">Grand Total</td>
                  {Array.from({ length: days }, (_, i) => {
                    const dt = data.reduce((s, r) => s + (r[`d${i + 1}`] || 0), 0);
                    return (<td key={i} className="px-2 py-3 text-center font-bold text-red-800">{dt > 0 ? dt.toLocaleString("id-ID") : "-"}</td>);
                  })}
                  <td className="px-3 py-3 text-center font-black text-red-900 text-sm">{grandTotal.toLocaleString("id-ID")}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
