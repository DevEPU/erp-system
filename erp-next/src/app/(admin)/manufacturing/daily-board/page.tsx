"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Cpu,
  Search,
  ChevronLeft,
  ChevronRight,
  Activity,
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Wrench,
  BarChart3,
  Loader2,
  ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface MachinePlan {
  id: number;
  pro_code: string;
  machine_id: string;
  shift: number;
  shift_hours: number;
  uph_used: number;
  target_qty: number;
  actual_qty: number;
  downtime_reason: string;
  operator_name: string;
  product_name: string;
  product_code: string;
  mold_name: string;
  actual_ok: number;
  actual_ng: number;
}

interface BoardMachine {
  machine_id: number;
  machine_code: string;
  machine_name: string;
  machine_type: string;
  line: string;
  capacity: string;
  leader_group: string;
  standard_mp: number;
  plans: MachinePlan[];
  total_target: number;
  total_actual: number;
  total_ng: number;
  ach_rate: number;
  has_plans: boolean;
}

export default function DailyBoardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<BoardMachine[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [filterLine, setFilterLine] = useState("all");
  const [filterLeader, setFilterLeader] = useState("all");
  const [expandedMachine, setExpandedMachine] = useState<string | null>(null);

  const fetchBoard = async (d: string) => {
    setLoading(true);
    try {
      const res = await api.express.get(`/reports/daily-board?date=${d}`);
      if (res.data?.success) {
        setBoard(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch daily board:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard(date);
  }, [date]);

  const changeDate = (offset: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().split("T")[0]);
  };

  const lines = useMemo(() => {
    const s = new Set(board.map((m) => m.line).filter(Boolean));
    return Array.from(s).sort();
  }, [board]);

  const leaders = useMemo(() => {
    const s = new Set(board.map((m) => m.leader_group).filter(Boolean));
    return Array.from(s).sort();
  }, [board]);

  const filtered = useMemo(() => {
    return board.filter((m) => {
      if (search && !m.machine_code.toLowerCase().includes(search.toLowerCase()) && !m.machine_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterLine !== "all" && m.line !== filterLine) return false;
      if (filterLeader !== "all" && m.leader_group !== filterLeader) return false;
      return true;
    });
  }, [board, search, filterLine, filterLeader]);

  const summary = useMemo(() => {
    const active = filtered.filter((m) => m.has_plans).length;
    const totalTarget = filtered.reduce((s, m) => s + m.total_target, 0);
    const totalActual = filtered.reduce((s, m) => s + m.total_actual, 0);
    const totalNG = filtered.reduce((s, m) => s + m.total_ng, 0);
    const totalMP = filtered.reduce((s, m) => s + (m.has_plans ? (m.standard_mp || 1) : 0), 0);
    const ach = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 10000) / 100 : 0;
    return { active, total: filtered.length, totalTarget, totalActual, totalNG, totalMP, ach };
  }, [filtered]);

  const getAchColor = (ach: number) => {
    if (ach >= 100) return "text-emerald-600 bg-emerald-50";
    if (ach >= 80) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const getAchBorder = (ach: number, hasPlan: boolean) => {
    if (!hasPlan) return "border-gray-200 bg-gray-50/50";
    if (ach >= 100) return "border-emerald-200 bg-white";
    if (ach >= 80) return "border-amber-200 bg-white";
    return "border-red-200 bg-white";
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div className="min-h-[85vh] flex flex-col p-4 md:p-8 space-y-6 animate-in fade-in duration-500 bg-[#f8fafc]">
      {/* Header */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-sky-600 to-indigo-500 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000" />
        <div className="relative bg-white/80 backdrop-blur-xl border border-white/20 p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-sky-900/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push("/manufacturing")} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                <ArrowLeft size={18} />
              </button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <BarChart3 size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Daily Production Board</h1>
                <p className="text-sm text-gray-500 font-medium">{formatDate(date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => changeDate(-1)} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                <ChevronLeft size={18} />
              </button>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold" />
              <button onClick={() => changeDate(1)} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                <ChevronRight size={18} />
              </button>
              <button onClick={() => setDate(new Date().toISOString().split("T")[0])} className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 transition">
                Hari Ini
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        {[
          { label: "Mesin Aktif", value: `${summary.active}/${summary.total}`, icon: Cpu, color: "from-sky-500 to-blue-600" },
          { label: "Total Target", value: summary.totalTarget.toLocaleString("id-ID"), icon: Target, color: "from-indigo-500 to-violet-600" },
          { label: "Total Aktual", value: summary.totalActual.toLocaleString("id-ID"), icon: CheckCircle2, color: "from-emerald-500 to-teal-600" },
          { label: "Total NG", value: summary.totalNG.toLocaleString("id-ID"), icon: XCircle, color: "from-red-500 to-rose-600" },
          { label: "Achievement", value: `${summary.ach}%`, icon: Activity, color: summary.ach >= 100 ? "from-emerald-500 to-teal-600" : summary.ach >= 80 ? "from-amber-500 to-orange-600" : "from-red-500 to-rose-600" },
          { label: "Total MP", value: summary.totalMP.toString(), icon: Users, color: "from-purple-500 to-pink-600" },
          { label: "Deviasi", value: (summary.totalActual - summary.totalTarget).toLocaleString("id-ID"), icon: AlertTriangle, color: summary.totalActual >= summary.totalTarget ? "from-emerald-500 to-teal-600" : "from-red-500 to-rose-600" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <div className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow`}>
              <s.icon size={18} className="text-white" />
            </div>
            <div className="overflow-hidden">
              <p className="text-lg font-black text-gray-900 tracking-tight truncate">{s.value}</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Cari mesin..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" />
        </div>
        <select value={filterLine} onChange={(e) => setFilterLine(e.target.value)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold bg-white">
          <option value="all">Semua Line</option>
          {lines.map((l) => (<option key={l} value={l}>{l}</option>))}
        </select>
        <select value={filterLeader} onChange={(e) => setFilterLeader(e.target.value)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold bg-white">
          <option value="all">Semua Leader</option>
          {leaders.map((l) => (<option key={l} value={l}>{l}</option>))}
        </select>
      </div>

      {/* Machine Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-sky-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((m) => (
            <div
              key={m.machine_code}
              onClick={() => setExpandedMachine(expandedMachine === m.machine_code ? null : m.machine_code)}
              className={`rounded-2xl border-2 p-4 cursor-pointer transition-all duration-300 hover:shadow-lg ${getAchBorder(m.ach_rate, m.has_plans)}`}
            >
              {/* Machine Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.has_plans ? "bg-sky-100 text-sky-600" : "bg-gray-100 text-gray-400"}`}>
                    <Cpu size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">{m.machine_code}</p>
                    <p className="text-[10px] font-bold text-gray-400 truncate max-w-[120px]">{m.machine_name}</p>
                  </div>
                </div>
                {m.has_plans && (
                  <span className={`px-2 py-1 rounded-lg text-xs font-black ${getAchColor(m.ach_rate)}`}>
                    {m.ach_rate}%
                  </span>
                )}
              </div>

              {!m.has_plans ? (
                <div className="text-center py-4">
                  <Clock size={20} className="mx-auto text-gray-300 mb-1" />
                  <p className="text-xs font-bold text-gray-400">Tidak ada jadwal</p>
                </div>
              ) : (
                <>
                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-sky-50 rounded-lg p-2 text-center">
                      <p className="text-xs font-black text-sky-700">{m.total_target.toLocaleString("id-ID")}</p>
                      <p className="text-[8px] font-bold text-sky-500 uppercase">Target</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2 text-center">
                      <p className="text-xs font-black text-emerald-700">{m.total_actual.toLocaleString("id-ID")}</p>
                      <p className="text-[8px] font-bold text-emerald-500 uppercase">Aktual</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2 text-center">
                      <p className="text-xs font-black text-red-700">{m.total_ng.toLocaleString("id-ID")}</p>
                      <p className="text-[8px] font-bold text-red-500 uppercase">NG</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${m.ach_rate >= 100 ? "bg-emerald-500" : m.ach_rate >= 80 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${Math.min(m.ach_rate, 100)}%` }}
                    />
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                    {m.leader_group && <span className="flex items-center gap-1"><Users size={10} /> {m.leader_group}</span>}
                    {m.line && <span className="flex items-center gap-1"><Wrench size={10} /> {m.line}</span>}
                    <span className="flex items-center gap-1"><Users size={10} /> {m.standard_mp || 1} MP</span>
                  </div>

                  {/* Expanded: Shift Details */}
                  {expandedMachine === m.machine_code && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 animate-in slide-in-from-top-2 duration-200">
                      {m.plans.map((p, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-sky-600 uppercase">Shift {p.shift}</span>
                            <span className="text-[10px] font-bold text-gray-500">{p.pro_code}</span>
                          </div>
                          <p className="text-xs font-bold text-gray-800 truncate">{p.product_name}</p>
                          <p className="text-[10px] text-gray-500">{p.mold_name} • UPH: {p.uph_used || '-'} • {p.shift_hours || 7}h</p>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-gray-600">Target: {Number(p.target_qty).toLocaleString("id-ID")}</span>
                            <span className="font-bold text-emerald-600">OK: {Number(p.actual_ok).toLocaleString("id-ID")}</span>
                            <span className="font-bold text-red-600">NG: {Number(p.actual_ng).toLocaleString("id-ID")}</span>
                          </div>
                          {p.downtime_reason && (
                            <p className="text-[10px] font-medium text-amber-600 bg-amber-50 rounded-lg px-2 py-1 mt-1">
                              <AlertTriangle size={10} className="inline mr-1" />{p.downtime_reason}
                            </p>
                          )}
                          {p.operator_name && (
                            <p className="text-[10px] text-gray-400">Operator: {p.operator_name}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
