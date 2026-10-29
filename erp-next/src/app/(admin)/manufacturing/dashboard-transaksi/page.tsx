"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LayoutDashboard,
  RefreshCw,
  Activity,
  CheckCircle2,
  Package,
  Factory,
  Cpu,
  Layers,
  Target,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Gauge,
  Zap,
  AlertTriangle,
  Clock,
  FileText,
  Clipboard,
  Shield,
  Truck,
  Hammer,
  Trash2,
  BarChart3,
  PieChart as PieChartIcon,
  ChevronRight,
  ListChecks,
  Cog,
  Box,
  Wrench,
  Boxes,
  FileSpreadsheet,
  UsersRound,
  ArrowRight
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
} from "recharts";
import api from "@/lib/api";

const quickActions = [
  { label: "Daily Production Board", icon: BarChart3, iconColor: "text-sky-500", path: "/manufacturing/daily-board" },
  { label: "Rekap Rencana & Aktual", icon: FileSpreadsheet, iconColor: "text-indigo-500", path: "/reports/rekap-plan-prod" },
  { label: "Rekap NG / Reject", icon: AlertTriangle, iconColor: "text-red-500", path: "/reports/rekap-ng" },
  { label: "Control Stock WHFG", icon: Boxes, iconColor: "text-emerald-500", path: "/reports/control-stock-whfg" },
  { label: "Achievement Rate (KPI)", icon: TrendingUp, iconColor: "text-amber-500", path: "/reports/ach-rate" },
  { label: "KPI Leader Group", icon: UsersRound, iconColor: "text-purple-500", path: "/reports/ach-leader" },
  { label: "OS vs Delivery Matrix", icon: Truck, iconColor: "text-blue-500", path: "/reports/os-delivery" },
];

// ─── Types ───────────────────────────────────────────────────────────────────
interface DashboardData {
  kpi: {
    total_bom: number;
    active_bom: number;
    total_mrp: number;
    active_mrp: number;
    total_pro: number;
    active_pro: number;
    completed_pro: number;
    in_production: number;
    waiting_pro: number;
    total_wo: number;
    active_wo: number;
    completed_wo: number;
    total_target: number;
    total_actual: number;
    completion_rate: number;
    first_pass_yield: number;
    total_ok_output: number;
    total_ng_output: number;
    total_material_issued: number;
    material_pending: number;
    total_ng_disposal: number;
    ng_qty: number;
    total_transfers: number;
    transfers_in_transit: number;
    total_machines: number;
    open_claims: number;
    crusher_qty: number;
  };
  modules: {
    bom: { total: number; active: number; draft: number };
    mrp: { total: number; active: number; released: number; net_qty: number; est_cost: number };
    pro: { total: number; active: number; completed: number; in_production: number; target: number; actual: number };
    wo: { total: number; active: number; completed: number; draft: number; target: number };
    material: { total: number; released: number; pending: number };
    output: { records: number; ok: number; ng: number; received: number };
    ng_disposal: { total: number; qty: number; pending: number; in_progress: number; completed: number };
    transfer: { total: number; prod_to_qc: number; qc_to_fg: number; received: number; in_transit: number };
    claims: { total: number; open: number; closed: number };
    crusher: { total: number; qty: number };
  };
  charts: {
    pro_status_breakdown: { status_label: string; count: number }[];
    monthly_trend: { month_key: string; month_label: string; target: number; actual: number }[];
    ng_category_breakdown: { category: string; total_ng: number }[];
    machine_utilization: { machine_code: string; machine_name: string; job_count: number; total_target: number; total_actual: number }[];
    machine_status: { status: string; count: number }[];
    wo_by_type: { tipe: string; count: number; total_target: number }[];
  };
  recent_activity: { module: string; reference: string; status: string; created_at: string; type: string }[];
}

// ─── Color Palettes ──────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  "Menunggu WO": "#94a3b8",
  "Menunggu Realisasi Bahan Baku": "#f97316",
  "Menunggu Molding": "#3b82f6",
  "Menunggu QC Gate": "#8b5cf6",
  "Menunggu Perbaikan": "#ef4444",
  "Menunggu Penarikan FG": "#14b8a6",
  "Dalam Produksi": "#06b6d4",
  "Berjalan": "#06b6d4",
  "Selesai": "#10b981",
  "Selesai / Done": "#10b981"
};

const MACHINE_STATUS_COLORS: Record<string, string> = {
  "Running": "#10b981",
  "Idle": "#94a3b8",
  "Maintenance": "#f97316",
  "Breakdown": "#ef4444",
  "Setup": "#8b5cf6",
  "Unknown": "#cbd5e1"
};

const CHART_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f97316", "#ef4444", "#06b6d4", "#14b8a6", "#eab308", "#ec4899"];

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-950/95 backdrop-blur-xl text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/10">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-sm font-bold" style={{ color: entry.color }}>
            {entry.name}: <span className="text-white">{entry.value?.toLocaleString()}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Module Navigation Card ─────────────────────────────────────────────────
const ModuleCard = ({
  icon: Icon,
  title,
  href,
  mainValue,
  mainLabel,
  subValues,
  gradient,
  accentColor,
  onClick,
}: {
  icon: any;
  title: string;
  href: string;
  mainValue: number | string;
  mainLabel: string;
  subValues: { label: string; value: number | string; color?: string }[];
  gradient: string;
  accentColor: string;
  onClick: (href: string) => void;
}) => (
  <div
    onClick={() => onClick(href)}
    className="group relative bg-white rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300 cursor-pointer overflow-hidden"
  >
    {/* Top accent */}
    <div className={`h-1 w-full ${gradient}`} />
    <div className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${accentColor} transition-transform group-hover:scale-110 duration-300`}>
          <Icon size={18} className="text-white" />
        </div>
        <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all duration-300" />
      </div>

      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{title}</h4>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-black text-gray-950 tabular-nums">{typeof mainValue === 'number' ? mainValue.toLocaleString() : mainValue}</span>
        <span className="text-[10px] font-bold text-gray-400 uppercase">{mainLabel}</span>
      </div>

      <div className="space-y-1.5 pt-3 border-t border-gray-50">
        {subValues.map((sv, idx) => (
          <div key={idx} className="flex justify-between items-center">
            <span className="text-[10px] font-semibold text-gray-400">{sv.label}</span>
            <span className={`text-xs font-black tabular-nums ${sv.color || "text-gray-700"}`}>
              {typeof sv.value === 'number' ? sv.value.toLocaleString() : sv.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
export default function DashboardTransaksiPage() {
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ─── Data Fetching ─────────────────────────────────────────────────────────
  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.express.get("/manufacturing/dashboard-overview");
      console.log("[Dashboard] API response:", res);
      if (res?.data?.success) {
        setData(res.data.data);
        setLastUpdated(new Date());
      } else {
        console.error("[Dashboard] API returned non-success:", res?.data);
      }
    } catch (err: any) {
      console.error("[Dashboard] Error loading dashboard:", err?.message || err);
      // Don't set data to null on refresh failures
      if (!isRefresh) {
        // Try fetching again with a small delay
        setTimeout(async () => {
          try {
            const retryRes = await api.express.get("/manufacturing/dashboard-overview");
            if (retryRes?.data?.success) {
              setData(retryRes.data.data);
              setLastUpdated(new Date());
            }
          } catch (retryErr) {
            console.error("[Dashboard] Retry also failed:", retryErr);
          }
        }, 2000);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const navigateTo = (href: string) => router.push(href);

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getModuleColor = (type: string) => {
    const colors: Record<string, string> = {
      planning: "bg-emerald-500",
      wo: "bg-blue-500",
      mi: "bg-orange-500",
      transfer: "bg-purple-500",
    };
    return colors[type] || "bg-gray-400";
  };

  // ─── Pipeline Steps ────────────────────────────────────────────────────────
  const pipelineSteps = data ? [
    { label: "BOM", icon: FileText, count: data.kpi.total_bom, color: "from-slate-500 to-slate-600", href: "/manufacturing/bom" },
    { label: "MRP", icon: Clipboard, count: data.kpi.total_mrp, color: "from-indigo-500 to-indigo-600", href: "/manufacturing/mrp" },
    { label: "PrO/MPP", icon: Target, count: data.kpi.total_pro, color: "from-emerald-500 to-emerald-600", href: "/manufacturing/mpp" },
    { label: "Work Order", icon: Factory, count: data.kpi.total_wo, color: "from-blue-500 to-blue-600", href: "/manufacturing/work-order" },
    { label: "Material", icon: Package, count: data.kpi.total_material_issued, color: "from-orange-500 to-orange-600", href: "/manufacturing/penerimaan-material-produksi" },
    { label: "Produksi", icon: Cpu, count: data.kpi.total_ok_output + data.kpi.total_ng_output, color: "from-cyan-500 to-cyan-600", href: "/manufacturing/realisasi-produksi" },
    { label: "QC Gate", icon: Shield, count: data.modules.output.records, color: "from-purple-500 to-purple-600", href: "/manufacturing/qc-gate" },
    { label: "Transfer FG", icon: Truck, count: data.kpi.total_transfers, color: "from-teal-500 to-teal-600", href: "/manufacturing/transfer-produksi" },
  ] : [];

  // ─── Loading State ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3.5 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-2xl shadow-lg shadow-emerald-200/50">
            <LayoutDashboard className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">
              Dashboard <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Manufacturing</span>
            </h1>
            <p className="text-gray-400 font-semibold text-sm mt-0.5">Memuat data analitik...</p>
          </div>
        </div>
        {/* Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 animate-pulse">
              <div className="h-3 bg-gray-100 rounded-full w-24 mb-4" />
              <div className="h-8 bg-gray-100 rounded-xl w-20 mb-3" />
              <div className="h-2 bg-gray-50 rounded-full w-full" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 animate-pulse">
              <div className="h-4 bg-gray-100 rounded-full w-40 mb-6" />
              <div className="h-48 bg-gray-50 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={48} className="text-orange-400 mx-auto mb-4" />
          <h2 className="text-xl font-black text-gray-700 mb-2">Gagal Memuat Dashboard</h2>
          <p className="text-gray-400 font-medium mb-6">Tidak dapat terhubung ke server analitik.</p>
          <button onClick={() => fetchDashboard()} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-colors">
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const statusChartData = data.charts.pro_status_breakdown.map(s => ({
    name: s.status_label.replace("Menunggu ", "M. "),
    fullName: s.status_label,
    value: s.count,
    color: STATUS_COLORS[s.status_label] || "#94a3b8"
  }));

  const machineStatusData = data.charts.machine_status.map(m => ({
    name: m.status,
    value: m.count,
    color: MACHINE_STATUS_COLORS[m.status] || "#cbd5e1"
  }));

  const fpy = data.kpi.first_pass_yield;
  const fpyColor = fpy >= 95 ? "#10b981" : fpy >= 85 ? "#f97316" : "#ef4444";

  // OEE/Completion Rate radial data
  const completionRadial = [{ name: "Completion", value: data.kpi.completion_rate, fill: "#10b981" }];

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen">

      {/* Back */}
      <button onClick={() => router.push("/manufacturing")} className="flex items-center gap-2 text-xs font-black text-emerald-600 hover:text-emerald-800 transition-colors uppercase tracking-widest">
        <ArrowLeft size={14} /> Kembali ke Manufacturing
      </button>

      {/* ─── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3.5 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-2xl shadow-lg shadow-emerald-200/50">
              <LayoutDashboard className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900">
                Dashboard <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Manufacturing</span>
              </h1>
              <p className="text-gray-400 font-semibold text-sm mt-0.5">
                Pusat kendali produksi · Analitik real-time · Semua modul terintegrasi
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Update: {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className={`flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-2xl text-xs font-black uppercase tracking-wider text-gray-600 transition-all ${refreshing ? "opacity-50" : ""}`}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={() => router.push("/manufacturing/daily-board")} className="flex items-center gap-2 bg-gray-950 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl active:scale-95">
            <BarChart3 size={16} /> Daily Board
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MANUFACTURING PROCESS PIPELINE                                        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Zap size={16} className="text-yellow-500" />
          <h3 className="font-black text-gray-800 text-sm">Alur Proses Manufaktur</h3>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">End-to-End Pipeline</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {pipelineSteps.map((step, idx) => {
            const StepIcon = step.icon;
            return (
              <div key={idx} className="flex items-center shrink-0">
                <button
                  onClick={() => navigateTo(step.href)}
                  className="group flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-gray-50 transition-all min-w-[100px]"
                >
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${step.color} shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                    <StepIcon size={18} className="text-white" />
                  </div>
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-wider text-center">{step.label}</span>
                  <span className="text-lg font-black text-gray-950 tabular-nums">{step.count}</span>
                </button>
                {idx < pipelineSteps.length - 1 && (
                  <div className="flex items-center px-1">
                    <div className="w-8 h-0.5 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
                    <ChevronRight size={14} className="text-gray-300 -ml-1" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* EXECUTIVE KPI CARDS                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Active Work Orders */}
        <div className="relative bg-white p-5 rounded-3xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo("/manufacturing/work-order")}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full" />
          <div className="relative">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Work Order Aktif</span>
              <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600"><Factory size={14} /></div>
            </div>
            <h3 className="text-3xl font-black text-gray-950">{data.kpi.active_wo}</h3>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[10px] text-gray-400 font-medium">dari {data.kpi.total_wo} total WO</span>
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="relative bg-white p-5 rounded-3xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-50 to-transparent rounded-bl-full" />
          <div className="relative">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pencapaian Output</span>
              <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600"><Target size={14} /></div>
            </div>
            <h3 className="text-3xl font-black text-gray-950">{data.kpi.completion_rate}<span className="text-base text-gray-400 font-bold">%</span></h3>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-2">
              <div className={`h-full rounded-full transition-all duration-700 ${data.kpi.completion_rate >= 80 ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-orange-400 to-amber-400"}`} style={{ width: `${Math.min(data.kpi.completion_rate, 100)}%` }} />
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[10px] text-gray-400 font-medium">{data.kpi.total_actual.toLocaleString()} / {data.kpi.total_target.toLocaleString()} pcs</span>
            </div>
          </div>
        </div>

        {/* First Pass Yield */}
        <div className="relative bg-white p-5 rounded-3xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-50 to-transparent rounded-bl-full" />
          <div className="relative">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">First Pass Yield</span>
              <div className="p-1.5 bg-purple-50 rounded-lg text-purple-600"><Shield size={14} /></div>
            </div>
            <h3 className="text-3xl font-black" style={{ color: fpyColor }}>{fpy}<span className="text-base text-gray-400 font-bold">%</span></h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] font-bold text-emerald-600">{data.kpi.total_ok_output.toLocaleString()} OK</span>
              <span className="text-[10px] text-gray-300">|</span>
              <span className="text-[10px] font-bold text-red-500">{data.kpi.total_ng_output.toLocaleString()} NG</span>
            </div>
          </div>
        </div>

        {/* Machines */}
        <div className="relative bg-white p-5 rounded-3xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo("/manufacturing/daftar-mesin")}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-50 to-transparent rounded-bl-full" />
          <div className="relative">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Mesin Aktif</span>
              <div className="p-1.5 bg-cyan-50 rounded-lg text-cyan-600"><Cpu size={14} /></div>
            </div>
            <h3 className="text-3xl font-black text-gray-950">{data.kpi.total_machines}</h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {data.charts.machine_status.slice(0, 3).map((ms, i) => (
                <span key={i} className="text-[10px] font-bold" style={{ color: MACHINE_STATUS_COLORS[ms.status] || "#94a3b8" }}>
                  {ms.status}: {ms.count}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* CHARTS ROW 1: Production Trend + Status Distribution                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Production Trend */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-black text-gray-800 text-sm">Tren Produksi</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Target vs Realisasi · 6 Bulan Terakhir</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-[10px] font-bold text-gray-500">Target</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-[10px] font-bold text-gray-500">Aktual</span></div>
            </div>
          </div>
          {data.charts.monthly_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.charts.monthly_trend.map(m => ({ ...m, target: Number(m.target), actual: Number(m.actual) }))} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTarget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month_label" tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="target" stroke="#10b981" strokeWidth={2.5} fill="url(#gradTarget)" name="Target" dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }} />
                <Area type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gradActual)" name="Aktual" dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-300 font-bold text-sm">
              Belum ada data tren produksi
            </div>
          )}
        </div>

        {/* Status Distribution Donut */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6">
          <div className="mb-4">
            <h3 className="font-black text-gray-800 text-sm">Distribusi Status PrO</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Planning Produksi</p>
          </div>
          {statusChartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={3} dataKey="value" stroke="none">
                    {statusChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-gray-950/95 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-xl">
                            {d.fullName}: {d.value} transaksi
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5 max-h-[140px] overflow-y-auto">
                {statusChartData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between px-2 py-1 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] font-bold text-gray-600 truncate">{item.fullName}</span>
                    </div>
                    <span className="text-xs font-black text-gray-900 tabular-nums">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-300 font-bold text-sm">
              Belum ada data PrO
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* CHARTS ROW 2: Machine Utilization + Machine Status + Quality Insight  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Machine Utilization Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-black text-gray-800 text-sm">Utilisasi Mesin</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Target vs Realisasi Output per Mesin</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-emerald-500" /><span className="text-[10px] font-bold text-gray-500">Target</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-blue-500" /><span className="text-[10px] font-bold text-gray-500">Aktual</span></div>
            </div>
          </div>
          {data.charts.machine_utilization.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.charts.machine_utilization.map(m => ({
                machine: m.machine_code.length > 14 ? m.machine_code.substring(0, 14) + "…" : m.machine_code,
                fullMachine: m.machine_name,
                target: Number(m.total_target),
                actual: Number(m.total_actual),
              }))} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="machine" tick={{ fontSize: 9, fontWeight: 700, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="target" fill="#10b981" radius={[6, 6, 0, 0]} name="Target" barSize={24} opacity={0.35} />
                <Bar dataKey="actual" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Aktual" barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-gray-300 font-bold text-sm">
              Belum ada data utilisasi mesin
            </div>
          )}
        </div>

        {/* Right Column: Machine Status + Quality */}
        <div className="space-y-6">
          {/* Machine Status Donut */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6">
            <div className="mb-3">
              <h3 className="font-black text-gray-800 text-sm">Status Mesin</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{data.kpi.total_machines} Unit Terdaftar</p>
            </div>
            {machineStatusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={machineStatusData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={4} dataKey="value" stroke="none">
                      {machineStatusData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-gray-950/95 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-xl">
                              {d.name}: {d.value} mesin
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 flex-wrap mt-1">
                  {machineStatusData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] font-bold text-gray-500">{item.name}</span>
                      <span className="text-[10px] font-black text-gray-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[140px] flex items-center justify-center text-gray-300 font-bold text-sm">
                Tidak ada data
              </div>
            )}
          </div>

          {/* Quick Insight Card */}
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 rounded-[2rem] p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-yellow-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Insight Produksi</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400 font-medium">PrO Dalam Produksi</span>
                <span className="text-sm font-black text-cyan-400">{data.kpi.in_production}</span>
              </div>
              <div className="w-full h-px bg-gray-700" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400 font-medium">PrO Menunggu</span>
                <span className="text-sm font-black text-orange-400">{data.kpi.waiting_pro}</span>
              </div>
              <div className="w-full h-px bg-gray-700" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400 font-medium">Klaim Terbuka</span>
                <span className="text-sm font-black text-red-400">{data.kpi.open_claims}</span>
              </div>
              <div className="w-full h-px bg-gray-700" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400 font-medium">NG / Disposal</span>
                <span className="text-sm font-black text-amber-400">{data.kpi.ng_qty.toLocaleString()} pcs</span>
              </div>
              <div className="w-full h-px bg-gray-700" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400 font-medium">Transfer In-Transit</span>
                <span className="text-sm font-black">{data.kpi.transfers_in_transit}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODULE NAVIGATION GRID                                                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-5">
          <ListChecks size={16} className="text-gray-400" />
          <h3 className="font-black text-gray-800 text-sm">Modul Transaksi</h3>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Navigasi Cepat & Ringkasan Data</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <ModuleCard
            icon={FileText}
            title="Bill of Materials"
            href="/manufacturing/bom"
            mainValue={data.modules.bom.total}
            mainLabel="Total BOM"
            subValues={[
              { label: "Aktif / Released", value: data.modules.bom.active, color: "text-emerald-600" },
              { label: "Draft", value: data.modules.bom.draft, color: "text-gray-500" },
            ]}
            gradient="bg-gradient-to-r from-slate-400 to-slate-500"
            accentColor="bg-slate-500"
            onClick={navigateTo}
          />
          <ModuleCard
            icon={Clipboard}
            title="Material Requirements (MRP)"
            href="/manufacturing/mrp"
            mainValue={data.modules.mrp.total}
            mainLabel="Total MRP"
            subValues={[
              { label: "Aktif", value: data.modules.mrp.active, color: "text-indigo-600" },
              { label: "Released", value: data.modules.mrp.released, color: "text-emerald-600" },
              { label: "Est. Cost", value: `Rp ${(data.modules.mrp.est_cost / 1000000).toFixed(1)}jt` },
            ]}
            gradient="bg-gradient-to-r from-indigo-400 to-indigo-500"
            accentColor="bg-indigo-500"
            onClick={navigateTo}
          />
          <ModuleCard
            icon={Target}
            title="Planning Produksi (PrO)"
            href="/manufacturing/mpp"
            mainValue={data.modules.pro.total}
            mainLabel="Total PrO"
            subValues={[
              { label: "Dalam Produksi", value: data.modules.pro.in_production, color: "text-cyan-600" },
              { label: "Selesai", value: data.modules.pro.completed, color: "text-emerald-600" },
              { label: "Target Output", value: `${data.modules.pro.target.toLocaleString()} pcs` },
            ]}
            gradient="bg-gradient-to-r from-emerald-400 to-emerald-500"
            accentColor="bg-emerald-500"
            onClick={navigateTo}
          />
          <ModuleCard
            icon={Factory}
            title="Work Order"
            href="/manufacturing/work-order"
            mainValue={data.modules.wo.total}
            mainLabel="Total WO"
            subValues={[
              { label: "Aktif", value: data.modules.wo.active, color: "text-blue-600" },
              { label: "Selesai", value: data.modules.wo.completed, color: "text-emerald-600" },
              { label: "Draft", value: data.modules.wo.draft },
            ]}
            gradient="bg-gradient-to-r from-blue-400 to-blue-500"
            accentColor="bg-blue-500"
            onClick={navigateTo}
          />
          <ModuleCard
            icon={Package}
            title="Material Issuance"
            href="/manufacturing/penerimaan-material-produksi"
            mainValue={data.modules.material.total}
            mainLabel="Total Issue"
            subValues={[
              { label: "Released", value: data.modules.material.released, color: "text-emerald-600" },
              { label: "Pending", value: data.modules.material.pending, color: "text-orange-600" },
            ]}
            gradient="bg-gradient-to-r from-orange-400 to-orange-500"
            accentColor="bg-orange-500"
            onClick={navigateTo}
          />
          <ModuleCard
            icon={Activity}
            title="Realisasi Produksi"
            href="/manufacturing/realisasi-produksi"
            mainValue={data.modules.output.records}
            mainLabel="Total Record"
            subValues={[
              { label: "Output OK", value: `${data.modules.output.ok.toLocaleString()} pcs`, color: "text-emerald-600" },
              { label: "Output NG", value: `${data.modules.output.ng.toLocaleString()} pcs`, color: "text-red-500" },
              { label: "Diterima FG", value: `${data.modules.output.received.toLocaleString()} pcs` },
            ]}
            gradient="bg-gradient-to-r from-cyan-400 to-cyan-500"
            accentColor="bg-cyan-500"
            onClick={navigateTo}
          />
          <ModuleCard
            icon={Shield}
            title="QC Gate"
            href="/manufacturing/qc-gate"
            mainValue={data.modules.claims.total}
            mainLabel="Total Klaim"
            subValues={[
              { label: "Klaim Terbuka", value: data.modules.claims.open, color: "text-red-500" },
              { label: "Klaim Selesai", value: data.modules.claims.closed, color: "text-emerald-600" },
            ]}
            gradient="bg-gradient-to-r from-purple-400 to-purple-500"
            accentColor="bg-purple-500"
            onClick={navigateTo}
          />
          <ModuleCard
            icon={Truck}
            title="Transfer Internal"
            href="/manufacturing/transfer-produksi"
            mainValue={data.modules.transfer.total}
            mainLabel="Total Transfer"
            subValues={[
              { label: "Prod → QC", value: data.modules.transfer.prod_to_qc, color: "text-purple-600" },
              { label: "QC → FG", value: data.modules.transfer.qc_to_fg, color: "text-teal-600" },
              { label: "In Transit", value: data.modules.transfer.in_transit, color: "text-orange-600" },
            ]}
            gradient="bg-gradient-to-r from-teal-400 to-teal-500"
            accentColor="bg-teal-500"
            onClick={navigateTo}
          />
          <ModuleCard
            icon={Trash2}
            title="NG & Disposal"
            href="/manufacturing/ng-disposal"
            mainValue={data.modules.ng_disposal.total}
            mainLabel="Total NG"
            subValues={[
              { label: "Total Qty NG", value: `${data.modules.ng_disposal.qty.toLocaleString()} pcs`, color: "text-red-500" },
              { label: "Pending", value: data.modules.ng_disposal.pending, color: "text-orange-600" },
              { label: "Selesai", value: data.modules.ng_disposal.completed, color: "text-emerald-600" },
            ]}
            gradient="bg-gradient-to-r from-red-400 to-red-500"
            accentColor="bg-red-500"
            onClick={navigateTo}
          />
          <ModuleCard
            icon={Hammer}
            title="Crusher"
            href="/manufacturing/transfer-crusher"
            mainValue={data.modules.crusher.total}
            mainLabel="Log Crusher"
            subValues={[
              { label: "Total Qty Crush", value: `${data.modules.crusher.qty.toLocaleString()} pcs` },
            ]}
            gradient="bg-gradient-to-r from-amber-400 to-amber-500"
            accentColor="bg-amber-500"
            onClick={navigateTo}
          />
          <ModuleCard
            icon={Cpu}
            title="Daftar Mesin"
            href="/manufacturing/daftar-mesin"
            mainValue={data.kpi.total_machines}
            mainLabel="Unit Mesin"
            subValues={
              data.charts.machine_status.slice(0, 3).map(ms => ({
                label: ms.status, value: ms.count, color: ms.status === "Running" ? "text-emerald-600" : ms.status === "Idle" ? "text-gray-500" : "text-orange-600"
              }))
            }
            gradient="bg-gradient-to-r from-gray-400 to-gray-500"
            accentColor="bg-gray-600"
            onClick={navigateTo}
          />
          <ModuleCard
            icon={Box}
            title="Daftar Mold"
            href="/manufacturing/daftar-mold"
            mainValue="-"
            mainLabel="Kelola Mold"
            subValues={[
              { label: "Lihat Data Mold", value: "→" },
            ]}
            gradient="bg-gradient-to-r from-pink-400 to-pink-500"
            accentColor="bg-pink-500"
            onClick={navigateTo}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* QUICK ACTIONS & RECENT ACTIVITY                                       */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions Card */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 shadow-sm">
                <Wrench size={22} />
              </div>
              <div>
                <h4 className="font-black text-gray-900 text-base">Quick Actions</h4>
                <p className="text-xs text-gray-400 font-bold">Standard manufacturing operations</p>
              </div>
            </div>

            <div className="space-y-2">
              {quickActions.map((act, idx) => {
                const IconComp = act.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => navigateTo(act.path)}
                    className="w-full p-3 px-4 rounded-2xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/20 flex items-center justify-between transition-all group cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3.5">
                      <IconComp size={16} className={act.iconColor} />
                      <span className="font-bold text-xs text-gray-800 group-hover:text-gray-950 transition-colors">
                        {act.label}
                      </span>
                    </div>
                    <ArrowRight size={14} className="text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Recent Activity Stream (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-black text-gray-800 text-sm">Aktivitas Terbaru</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Live Stream · Semua Modul Manufaktur</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Live</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Modul</th>
                    <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Referensi</th>
                    <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.recent_activity.length > 0 ? data.recent_activity.map((act, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getModuleColor(act.type)}`} />
                          <span className="text-xs font-black text-gray-700">{act.module}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-bold text-gray-800">{act.reference || "-"}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2.5 py-1 text-[9px] font-black rounded-full uppercase tracking-wider inline-block ${
                          act.status?.includes("Selesai") || act.status?.includes("Completed") || act.status?.includes("Received")
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : act.status?.includes("Berjalan") || act.status?.includes("Running") || act.status?.includes("In Progress")
                            ? "bg-cyan-50 text-cyan-600 border border-cyan-200"
                            : act.status?.includes("Draft")
                            ? "bg-gray-100 text-gray-500 border border-gray-200"
                            : "bg-orange-50 text-orange-600 border border-orange-200"
                        }`}>
                          {act.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-[10px] font-bold text-gray-400">{formatDateTime(act.created_at)}</span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-sm font-bold text-gray-300 uppercase tracking-widest">
                        Belum ada aktivitas tercatat
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
          PT Eran Plastindo Utama · Sistem Informasi Manufaktur © 2026
        </p>
      </div>
    </div>
  );
}
