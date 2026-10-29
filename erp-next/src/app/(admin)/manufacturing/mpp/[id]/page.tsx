"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Cpu, Layers, User, Calendar, Activity,
  CheckCircle2, Clock, AlertCircle, History, ShieldCheck,
  Package, BarChart3, RefreshCw, Edit, Printer, XCircle,
  AlertTriangle, TrendingUp, ClipboardList, Boxes,
  ChevronRight, Sparkles, Truck, RotateCcw, ShieldAlert,
  Wrench, FileText, ChevronDown, ChevronUp, Circle, Trash2
} from "lucide-react";
import api from "@/lib/api";

interface PlanDetail {
  id: number;
  pro_code: string;
  os_reference?: string;
  wo_reference?: string;
  product_name: string;
  product_code: string;
  product_unit?: string;
  machine_code?: string;
  machine_id?: string;
  mold_name?: string;
  mold_code?: string;
  mold_id?: number;
  operator_name: string;
  shift: string | number;
  target_qty: number;
  actual_qty: number;
  start_date: string;
  end_date: string;
  status: string;
  note?: string;
  total_ok: number;
  total_ng: number;
  total_received: number;
  po_count: number;
  wip_count: number;
  repair_count: number;
  verified_count: number;
  outputLogs: OutputLog[];
  bomMaterials: BOMItem[];
  materialIssuances: MaterialIssuance[];
  vendorClaims: VendorClaim[];
  replacements: Replacement[];
}

interface OutputLog {
  id: number;
  qty_ok: number;
  qty_ng: number;
  status: string;
  ng_type?: string;
  notes?: string;
  ng_category?: string;
  created_at: string;
  updated_at: string;
  vc_status?: string;
  replacement_qty?: number;
  replacement_status?: string;
}

interface BOMItem {
  id: number;
  product_name: string;
  product_code: string;
  product_unit: string;
  qty_per_unit: number;
  item_type: string;
}

interface MaterialIssuance {
  id: number;
  reference: string;
  date: string;
  status: string;
  note?: string;
  created_at: string;
  item_count: number;
}

interface VendorClaim {
  id: number;
  production_output_id: number;
  product_name?: string;
  product_code?: string;
  qty_ng_component: number;
  status: string;
  created_at: string;
}

interface Replacement {
  id: number;
  wo_id: number;
  production_output_id: number;
  product_name?: string;
  product_code?: string;
  qty_requested: number;
  status: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d?: string) => d ? d.toString().substring(0, 10) : "-";
const fmtTime = (d?: string) => d ? d.toString().replace("T", " ").substring(0, 16) : "-";

const getStatusBadge = (status: string) => {
  const s = status?.toLowerCase() || "";
  if (s.includes("selesai") || s.includes("done"))
    return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-fit"><CheckCircle2 size={11} /> Selesai</span>;
  if (s.includes("berjalan") || s.includes("wip"))
    return <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-fit"><Activity size={11} /> Berjalan</span>;
  if (s.includes("rencana"))
    return <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-fit"><Clock size={11} /> Rencana</span>;
  return <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-fit"><Clock size={11} /> {status}</span>;
};

type StepStatus = "done" | "active" | "partial" | "pending" | "skipped";

const StepDot = ({ status, icon: Icon }: { status: StepStatus; icon: React.ElementType }) => {
  const cfg: Record<StepStatus, string> = {
    done: "bg-emerald-500 border-emerald-500 text-white shadow-emerald-200 shadow-lg",
    active: "bg-blue-500 border-blue-500 text-white shadow-blue-200 shadow-lg",
    partial: "bg-amber-500 border-amber-500 text-white shadow-amber-200 shadow-lg",
    pending: "bg-white border-gray-200 text-gray-300",
    skipped: "bg-gray-100 border-gray-200 text-gray-300",
  };
  return (
    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${cfg[status]}`}>
      <Icon size={16} />
    </div>
  );
};

const ConnectorLine = ({ status }: { status: "done" | "partial" | "pending" }) => (
  <div className={`w-0.5 h-8 mx-auto mt-1 mb-1 rounded-full transition-all ${
    status === "done" ? "bg-emerald-400" : status === "partial" ? "bg-amber-300" : "bg-gray-100"
  }`} />
);

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PlanningProduksiDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"timeline" | "outputs" | "bom">("timeline");
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});

  // Masters
  const [machines, setMachines] = useState<any[]>([]);
  const [molds, setMolds] = useState<any[]>([]);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editOperatorName, setEditOperatorName] = useState("");
  const [editShift, setEditShift] = useState("Shift 1");
  const [editTargetQty, setEditTargetQty] = useState(0);
  const [editMachineId, setEditMachineId] = useState("");
  const [editMoldId, setEditMoldId] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const toggleStep = (i: number) => setExpandedSteps(p => ({ ...p, [i]: !p[i] }));

  const fetchDetail = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.express.get(`/manufacturing/planning-produksi/${id}`);
      if (res?.data?.success) {
        const d = res.data.data;
        setPlan({
          ...d,
          target_qty: Number(d.target_qty || 0),
          actual_qty: Number(d.actual_qty || 0),
          total_ok: Number(d.total_ok || 0),
          total_ng: Number(d.total_ng || 0),
          total_received: Number(d.total_received || 0),
          po_count: Number(d.po_count || 0),
          wip_count: Number(d.wip_count || 0),
          repair_count: Number(d.repair_count || 0),
          verified_count: Number(d.verified_count || 0),
          materialIssuances: d.materialIssuances || [],
          vendorClaims: d.vendorClaims || [],
          replacements: d.replacements || [],
        });
        setLastRefresh(new Date());
      }
    } catch (err) {
      console.error("Error fetching PrO detail:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
    const interval = setInterval(() => fetchDetail(true), 30000);
    return () => clearInterval(interval);
  }, [fetchDetail]);

  useEffect(() => {
    // Fetch machines
    api.express.get("/manufacturing/machines")
      .then(res => {
        if (res.data && res.data.success) {
          setMachines(res.data.data || []);
        }
      })
      .catch(err => console.error("Error loading machines:", err));

    // Fetch molds
    api.express.get("/manufacturing/molds")
      .then(res => {
        if (res.data && res.data.success) {
          setMolds(res.data.data || []);
        }
      })
      .catch(err => console.error("Error loading molds:", err));
  }, []);

  const openEditModal = () => {
    if (!plan) return;
    setEditOperatorName(plan.operator_name);
    setEditShift(plan.shift ? `Shift ${plan.shift}` : "Shift 1");
    setEditTargetQty(plan.target_qty);
    setEditMachineId(plan.machine_code || plan.machine_id || "");
    setEditMoldId(plan.mold_id ? String(plan.mold_id) : "");
    setEditStatus(plan.status);
    setIsEditModalOpen(true);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;

    setSubmittingEdit(true);
    const payload = {
      operator_name: editOperatorName.trim(),
      shift: editShift.replace("Shift ", ""),
      target_qty: Number(editTargetQty),
      machine_id: editMachineId,
      mold_id: editMoldId ? Number(editMoldId) : null,
      status: editStatus
    };

    try {
      const res = await api.express.put(`/manufacturing/planning-produksi/${plan.id}`, payload);
      if (res && res.data && res.data.success) {
        alert("MPP berhasil diperbarui!");
        setIsEditModalOpen(false);
        fetchDetail();
      }
    } catch (err: any) {
      console.error("Error updating plan:", err);
      alert(err.response?.data?.message || err.message || "Gagal memperbarui MPP.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!plan) return;
    if (!confirm("Apakah Anda yakin ingin menghapus Rencana Produksi (MPP) ini?")) return;

    try {
      const res = await api.express.delete(`/manufacturing/planning-produksi/${plan.id}`);
      if (res && res.data && res.data.success) {
        alert("Rencana produksi berhasil dihapus!");
        router.push("/manufacturing/mpp");
      }
    } catch (err: any) {
      console.error("Error deleting plan:", err);
      alert(err.response?.data?.message || err.message || "Gagal menghapus rencana produksi");
    }
  };

  if (loading) {
    return (
      <div className="p-8 min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Memuat Detail MPP...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-8 min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="text-amber-400 mx-auto" size={40} />
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">MPP Tidak Ditemukan</p>
          <button onClick={() => router.back()} className="text-emerald-600 font-black text-xs uppercase tracking-widest hover:underline">← Kembali</button>
        </div>
      </div>
    );
  }

  const progressPct = plan.target_qty > 0 ? Math.min(100, Math.round((plan.actual_qty / plan.target_qty) * 100)) : 0;
  const totalOutput = plan.total_ok + plan.total_ng;

  // ── Derive timeline step statuses ────────────────────────────────────────────
  const hasIssuances = plan.materialIssuances.length > 0;
  const allIssued = hasIssuances && plan.materialIssuances.every(m => m.status === "Issued");
  const hasOutputs = plan.outputLogs.length > 0;
  const hasNgOutputs = plan.outputLogs.some(o => Number(o.qty_ng) > 0);

  // NG QC: vendor_claims status
  const hasVendorClaims = plan.vendorClaims.length > 0;
  const allNgVerified = hasVendorClaims && plan.vendorClaims.every(vc => vc.status === "VERIFIED");
  const someNgVerified = plan.vendorClaims.some(vc => vc.status === "VERIFIED");
  // NG step is "resolved" if no NG exists, or all NG claims are verified
  const ngStepResolved = !hasNgOutputs || allNgVerified;

  // Replacement
  const hasReplacements = plan.replacements.length > 0;
  const allReplaced = hasReplacements && plan.replacements.every(r => r.status === "SHIPPED");
  // Replacement step is "resolved" if no NG, or all replaced
  const replacementResolved = !hasNgOutputs || allReplaced;

  // QC Gate: only OK-only outputs (qty_ng=0) go here, AFTER NG is resolved
  const qcGateOutputs = plan.outputLogs.filter(o => Number(o.qty_ok) > 0 && Number(o.qty_ng) === 0);
  const hasQcGateOutputs = qcGateOutputs.length > 0;
  const allQcGateVerified = hasQcGateOutputs && qcGateOutputs.every(o =>
    o.status === "Verified_QC" || o.status === "Received_FG"
  );

  // FG received
  const fgReceivedLogs = plan.outputLogs.filter(o => o.status === "Received_FG");
  const hasFgReceived = fgReceivedLogs.length > 0;
  const allFgReceived = hasQcGateOutputs && qcGateOutputs.every(o => o.status === "Received_FG");

  const stepStatus = (step: number): StepStatus => {
    switch (step) {
      case 1: return "done"; // PrO always exists
      case 2: return allIssued ? "done" : hasIssuances ? "partial" : "pending";
      case 3: return hasOutputs ? "done" : "pending";
      // Step 4: Verifikasi NG — skipped if no NG outputs
      case 4: return !hasNgOutputs ? "skipped" : allNgVerified ? "done" : someNgVerified ? "partial" : "active";
      // Step 5: Penggantian Bahan Baku — skipped if no NG, pending until NG verified
      case 5: return !hasNgOutputs ? "skipped" : allReplaced ? "done" : hasReplacements ? "partial" : (allNgVerified ? "active" : "pending");
      // Step 6: QC Gate — skipped if no OK-only outputs. Active only after NG resolved
      case 6:
        if (!hasQcGateOutputs) return "skipped";
        if (!ngStepResolved) return "pending"; // wait for NG to finish first
        return allFgReceived ? "done" : allQcGateVerified ? "partial" : "active";
      // Step 7: Terima Barang Jadi — active after QC Gate verified
      case 7:
        return allFgReceived && hasFgReceived ? "done" : hasFgReceived ? "partial" : (hasQcGateOutputs && allQcGateVerified ? "active" : "pending");
      default: return "pending";
    }
  };

  const connStatus = (from: number): "done" | "partial" | "pending" => {
    const s = stepStatus(from);
    return s === "done" ? "done" : s === "partial" || s === "active" ? "partial" : "pending";
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] print:bg-white">

      {/* ── Sticky Navbar ───────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex items-center justify-between print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-black text-emerald-600 hover:text-emerald-800 transition-colors uppercase tracking-widest"
        >
          <ArrowLeft size={14} /> Back to MPP
        </button>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
            <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
            Terakhir diperbarui: {lastRefresh.toLocaleTimeString("id-ID")}
          </div>
          <button onClick={() => fetchDetail(true)} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 border border-gray-100 rounded-xl text-xs font-black transition-all">
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={openEditModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl text-xs font-black transition-all">
            <Edit size={12} /> Edit
          </button>
          <button onClick={handleDeletePlan}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-black transition-all">
            <Trash2 size={12} /> Hapus
          </button>
          <button onClick={() => router.push("/manufacturing/mpp")}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-xl text-xs font-black transition-all">
            <XCircle size={12} /> Batal / Kembali
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-black transition-all">
            <Printer size={12} /> Cetak SPK
          </button>
        </div>
      </div>

      <div className="p-8 space-y-8 max-w-7xl mx-auto">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-200">
                <ClipboardList className="text-white" size={28} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-black tracking-tight text-gray-900">{plan.pro_code}</h1>
                  {getStatusBadge(plan.status)}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs font-bold text-gray-400">
                  {plan.os_reference && <span className="flex items-center gap-1"><ChevronRight size={12} /> OS: {plan.os_reference}</span>}
                  {plan.wo_reference && <span className="flex items-center gap-1"><ChevronRight size={12} /> WO: {plan.wo_reference}</span>}
                  <span className="flex items-center gap-1"><Calendar size={11} /> {fmtDate(plan.start_date)} — {fmtDate(plan.end_date)}</span>
                </div>
              </div>
            </div>
            {plan.note && (
              <div className="ml-1 px-4 py-2 bg-amber-50 border border-amber-100 rounded-2xl text-xs font-semibold text-amber-700 max-w-xl">
                📝 {plan.note}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
            <Sparkles size={12} /> Data update otomatis setiap 30 detik
          </div>
        </div>

        {/* ── Stats Cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { label: "Target Produksi", val: plan.target_qty.toLocaleString(), sub: plan.product_unit || "Pcs", color: "text-gray-950", icon: <BarChart3 size={14} className="text-slate-500" />, bg: "bg-slate-50" },
            { label: "Total OK (Terealisasi)", val: plan.actual_qty.toLocaleString(), sub: `${progressPct}% dari target`, color: "text-emerald-600", icon: <CheckCircle2 size={14} className="text-emerald-500" />, bg: "bg-emerald-50" },
            { label: "Total NG / Cacat", val: plan.total_ng.toLocaleString(), sub: totalOutput > 0 ? `${Math.round((plan.total_ng / totalOutput) * 100)}% dari output` : "—", color: "text-red-500", icon: <XCircle size={14} className="text-red-400" />, bg: "bg-red-50" },
            { label: "Total Run Output", val: String(plan.po_count), sub: `${plan.wip_count} pending · ${plan.verified_count} verified`, color: "text-gray-950", icon: <Activity size={14} className="text-blue-500" />, bg: "bg-blue-50" },
          ].map((c, i) => (
            <div key={i} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{c.label}</span>
                <div className={`p-1.5 ${c.bg} rounded-lg`}>{c.icon}</div>
              </div>
              <div>
                <p className={`text-3xl font-black ${c.color}`}>{c.val}</p>
                <p className="text-[10px] font-bold text-gray-400 mt-0.5">{c.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Progress Bar ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" /> Progress Capaian Produksi
            </h3>
            <span className="text-2xl font-black text-emerald-600">{progressPct}%</span>
          </div>
          <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${progressPct >= 100 ? "bg-emerald-500" : progressPct > 50 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${progressPct}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center pt-2">
            <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target</p><p className="text-lg font-black text-gray-800 mt-0.5">{plan.target_qty.toLocaleString()} Pcs</p></div>
            <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Terealisasi (OK)</p><p className="text-lg font-black text-emerald-600 mt-0.5">{plan.actual_qty.toLocaleString()} Pcs</p></div>
            <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sisa Target</p><p className="text-lg font-black text-amber-600 mt-0.5">{Math.max(0, plan.target_qty - plan.actual_qty).toLocaleString()} Pcs</p></div>
          </div>
        </div>

        {/* ── Tab Navigation ────────────────────────────────────────────────── */}
        <div className="flex bg-white border border-gray-100 rounded-2xl shadow-sm p-1.5 gap-1 w-fit">
          {([
            { id: "timeline", label: "Proses Produksi", icon: <Activity size={13} /> },
            { id: "outputs", label: "Output Log", icon: <History size={13} /> },
            { id: "bom", label: "Daftar BOM", icon: <Boxes size={13} /> },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === t.id ? "bg-emerald-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: PROSES PRODUKSI (TIMELINE)
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "timeline" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left: Info Plan ─────────────────────────────────────────── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4 h-fit">
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-3">
                <ClipboardList size={15} className="text-emerald-500" /> Informasi Plan
              </h3>
              <div className="space-y-3 text-xs">
                <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Produk Target</p><p className="font-black text-gray-900 mt-0.5">{plan.product_name}</p><p className="font-bold text-gray-400 uppercase mt-0.5">{plan.product_code}</p></div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-50">
                  <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Cpu size={9} /> Mesin</p><p className="font-black text-gray-800 mt-0.5">{plan.machine_id || plan.machine_code || "-"}</p></div>
                  <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Layers size={9} /> Mold</p><p className="font-black text-indigo-600 mt-0.5">{plan.mold_name || plan.mold_code || "-"}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-50">
                  <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><User size={9} /> Operator</p><p className="font-black text-gray-800 mt-0.5">{plan.operator_name}</p></div>
                  <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Shift</p><p className="font-black text-gray-800 mt-0.5">{plan.shift}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-50">
                  <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Calendar size={9} /> Mulai</p><p className="font-black text-gray-800 mt-0.5">{fmtDate(plan.start_date)}</p></div>
                  <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Calendar size={9} /> Selesai</p><p className="font-black text-gray-800 mt-0.5">{fmtDate(plan.end_date)}</p></div>
                </div>
              </div>
            </div>

            {/* ── Right: Timeline ─────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-0">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={15} className="text-emerald-500" /> Proses Produksi PrO
                  </h3>
                  <span className="text-[9px] font-black text-emerald-600 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-100 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles size={9} /> Live Tracking
                  </span>
                </div>

                <div className="space-y-0">

                  {/* ── STEP 1: PrO Dibuat ── */}
                  {(() => {
                    const s = stepStatus(1);
                    const open = expandedSteps[1];
                    return (
                      <div>
                        <button onClick={() => toggleStep(1)} className="w-full flex items-start gap-4 text-left group">
                          <div className="flex flex-col items-center">
                            <StepDot status={s} icon={FileText} />
                            <ConnectorLine status={connStatus(1)} />
                          </div>
                          <div className="flex-1 pb-2 pt-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-gray-900 uppercase tracking-wide">1. PrO Dibuat</span>
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded uppercase">Selesai</span>
                              </div>
                              {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">{plan.pro_code} · Target: {plan.target_qty.toLocaleString()} Pcs</p>
                          </div>
                        </button>
                        {open && (
                          <div className="ml-14 mb-3 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-xs space-y-1">
                            <div className="grid grid-cols-2 gap-3">
                              <div><span className="text-[9px] font-black text-gray-400 uppercase">Produk</span><p className="font-black text-gray-800">{plan.product_name}</p></div>
                              <div><span className="text-[9px] font-black text-gray-400 uppercase">Target Qty</span><p className="font-black text-gray-800">{plan.target_qty.toLocaleString()} Pcs</p></div>
                              <div><span className="text-[9px] font-black text-gray-400 uppercase">Mesin</span><p className="font-black text-gray-800">{plan.machine_id || "-"}</p></div>
                              <div><span className="text-[9px] font-black text-gray-400 uppercase">Operator</span><p className="font-black text-gray-800">{plan.operator_name}</p></div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── STEP 2: Realisasi Bahan Baku ── */}
                  {(() => {
                    const s = stepStatus(2);
                    const open = expandedSteps[2];
                    const badgeMap: Record<StepStatus, string> = { done: "bg-emerald-100 text-emerald-700", active: "bg-blue-100 text-blue-700", partial: "bg-amber-100 text-amber-700", pending: "bg-gray-100 text-gray-400", skipped: "bg-gray-100 text-gray-400" };
                    const labelMap: Record<StepStatus, string> = { done: "Issued", active: "Berjalan", partial: "Sebagian", pending: "Belum Ada", skipped: "N/A" };
                    return (
                      <div>
                        <button onClick={() => toggleStep(2)} className="w-full flex items-start gap-4 text-left group">
                          <div className="flex flex-col items-center">
                            <StepDot status={s} icon={Package} />
                            <ConnectorLine status={connStatus(2)} />
                          </div>
                          <div className="flex-1 pb-2 pt-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-gray-900 uppercase tracking-wide">2. Realisasi Bahan Baku</span>
                                <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase ${badgeMap[s]}`}>{labelMap[s]}</span>
                              </div>
                              {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                              {plan.materialIssuances.length > 0 ? `${plan.materialIssuances.length} pengeluaran material terdaftar` : "Belum ada pengeluaran bahan baku"}
                            </p>
                          </div>
                        </button>
                        {open && (
                          <div className="ml-14 mb-3 space-y-2">
                            {plan.materialIssuances.length === 0 ? (
                              <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-[10px] font-bold text-gray-400 text-center uppercase tracking-widest">Belum ada pengeluaran material</div>
                            ) : plan.materialIssuances.map(mi => (
                              <div key={mi.id} className="p-3 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-black text-gray-800">{mi.reference}</p>
                                  <p className="text-[9px] font-bold text-gray-400">{fmtDate(mi.date)} · {mi.item_count} item</p>
                                </div>
                                <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase ${mi.status === "Issued" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{mi.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── STEP 3: Input Hasil Produksi ── */}
                  {(() => {
                    const s = stepStatus(3);
                    const open = expandedSteps[3];
                    const badgeMap: Record<StepStatus, string> = { done: "bg-emerald-100 text-emerald-700", active: "bg-blue-100 text-blue-700", partial: "bg-amber-100 text-amber-700", pending: "bg-gray-100 text-gray-400", skipped: "bg-gray-100 text-gray-400" };
                    const labelMap: Record<StepStatus, string> = { done: `${plan.po_count} Run`, active: "Berjalan", partial: "Berjalan", pending: "Belum Ada", skipped: "N/A" };
                    return (
                      <div>
                        <button onClick={() => toggleStep(3)} className="w-full flex items-start gap-4 text-left group">
                          <div className="flex flex-col items-center">
                            <StepDot status={s} icon={Activity} />
                            <ConnectorLine status={connStatus(3)} />
                          </div>
                          <div className="flex-1 pb-2 pt-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-gray-900 uppercase tracking-wide">3. Input Hasil Produksi</span>
                                <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase ${badgeMap[s]}`}>{labelMap[s]}</span>
                              </div>
                              {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                              OK: {plan.total_ok.toLocaleString()} Pcs · NG: {plan.total_ng.toLocaleString()} Pcs · {plan.po_count} run
                            </p>
                          </div>
                        </button>
                        {open && (
                          <div className="ml-14 mb-3 space-y-2">
                            {plan.outputLogs.length === 0 ? (
                              <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-[10px] font-bold text-gray-400 text-center uppercase tracking-widest">Belum ada output produksi</div>
                            ) : plan.outputLogs.map(po => (
                              <div key={po.id} className="p-3 bg-gray-50/80 border border-gray-100 rounded-2xl">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-black text-gray-800">#OUT-{po.id}</span>
                                  <span className="text-[9px] font-bold text-gray-400">{fmtTime(po.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px]">
                                  <span className="text-emerald-600 font-black">OK: {Number(po.qty_ok).toLocaleString()} Pcs</span>
                                  {Number(po.qty_ng) > 0 && <span className="text-red-500 font-black">NG: {Number(po.qty_ng).toLocaleString()} Pcs</span>}
                                  {po.ng_type && <span className="text-gray-400 font-bold">· {po.ng_type}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── STEP 4: Verifikasi NG (QC) ── */}
                  {(() => {
                    const s = stepStatus(4);
                    const open = expandedSteps[4];
                    if (s === "skipped") return (
                      <div>
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col items-center">
                            <StepDot status="skipped" icon={ShieldAlert} />
                            <ConnectorLine status="pending" />
                          </div>
                          <div className="flex-1 pt-1 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-gray-300 uppercase tracking-wide">4. Verifikasi NG (QC)</span>
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-300 text-[8px] font-black rounded uppercase">Tidak Ada NG</span>
                            </div>
                            <p className="text-[10px] font-bold text-gray-300 mt-0.5">Tidak ada NG pada hasil produksi — langsung ke QC Gate</p>
                          </div>
                        </div>
                      </div>
                    );
                    const badgeMap: Record<StepStatus, string> = { done: "bg-emerald-100 text-emerald-700", active: "bg-blue-100 text-blue-700", partial: "bg-amber-100 text-amber-700", pending: "bg-gray-100 text-gray-400", skipped: "bg-gray-100 text-gray-400" };
                    const labelMap: Record<StepStatus, string> = { done: "Semua Verified", active: "Perlu Verifikasi", partial: "Sebagian", pending: "Menunggu", skipped: "Tidak Ada NG" };
                    return (
                      <div>
                        <button onClick={() => toggleStep(4)} className="w-full flex items-start gap-4 text-left group">
                          <div className="flex flex-col items-center">
                            <StepDot status={s} icon={ShieldAlert} />
                            <ConnectorLine status={connStatus(4)} />
                          </div>
                          <div className="flex-1 pb-2 pt-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-gray-900 uppercase tracking-wide">4. Verifikasi NG (QC)</span>
                                <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase ${badgeMap[s]}`}>{labelMap[s]}</span>
                              </div>
                              {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                              {plan.vendorClaims.length} komponen NG · Total: {plan.total_ng.toLocaleString()} Pcs
                            </p>
                          </div>
                        </button>
                        {open && (
                          <div className="ml-14 mb-3 space-y-2">
                            {plan.vendorClaims.length === 0 ? (
                              <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-[10px] font-bold text-gray-400 text-center uppercase tracking-widest">Belum ada klaim NG terdaftar</div>
                            ) : plan.vendorClaims.map(vc => (
                              <div key={vc.id} className="p-3 bg-red-50/50 border border-red-100 rounded-2xl flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-black text-gray-800">{vc.product_name || `Product #${vc.production_output_id}`}</p>
                                  <p className="text-[9px] font-bold text-gray-400">{vc.product_code} · OUT-{vc.production_output_id}</p>
                                  <p className="text-[10px] font-black text-red-600 mt-0.5">{Number(vc.qty_ng_component).toLocaleString()} Pcs NG</p>
                                </div>
                                <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase ${
                                  vc.status === "VERIFIED" ? "bg-emerald-100 text-emerald-700" :
                                  vc.status === "QUARANTINED" ? "bg-orange-100 text-orange-700" :
                                  "bg-red-100 text-red-700"
                                }`}>{vc.status === "VERIFIED" ? "Verified" : vc.status === "QUARANTINED" ? "Quarantined" : vc.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── STEP 5: Penggantian Bahan Baku ── */}
                  {(() => {
                    const s = stepStatus(5);
                    const open = expandedSteps[5];
                    if (s === "skipped") return (
                      <div>
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col items-center">
                            <StepDot status="skipped" icon={RotateCcw} />
                            <ConnectorLine status="pending" />
                          </div>
                          <div className="flex-1 pt-1 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-gray-300 uppercase tracking-wide">5. Penggantian Bahan Baku</span>
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-300 text-[8px] font-black rounded uppercase">Tidak Ada NG</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                    const badgeMap: Record<StepStatus, string> = { done: "bg-emerald-100 text-emerald-700", active: "bg-blue-100 text-blue-700", partial: "bg-amber-100 text-amber-700", pending: "bg-gray-100 text-gray-400", skipped: "bg-gray-100 text-gray-400" };
                    const labelMap: Record<StepStatus, string> = { done: "Semua Terkirim", active: "Siap Diproses", partial: "Sebagian Terkirim", pending: "Menunggu Verifikasi NG", skipped: "N/A" };
                    return (
                      <div>
                        <button onClick={() => toggleStep(5)} className="w-full flex items-start gap-4 text-left group">
                          <div className="flex flex-col items-center">
                            <StepDot status={s} icon={RotateCcw} />
                            <ConnectorLine status={connStatus(5)} />
                          </div>
                          <div className="flex-1 pb-2 pt-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-gray-900 uppercase tracking-wide">5. Penggantian Bahan Baku</span>
                                <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase ${badgeMap[s]}`}>{labelMap[s]}</span>
                              </div>
                              {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                              {plan.replacements.length > 0 ? `${plan.replacements.length} penggantian material` : "Belum ada penggantian"}
                            </p>
                          </div>
                        </button>
                        {open && (
                          <div className="ml-14 mb-3 space-y-2">
                            {plan.replacements.length === 0 ? (
                              <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-[10px] font-bold text-gray-400 text-center uppercase tracking-widest">Belum ada penggantian material</div>
                            ) : plan.replacements.map(r => (
                              <div key={r.id} className="p-3 bg-orange-50/50 border border-orange-100 rounded-2xl flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-black text-gray-800">{r.product_name || "—"}</p>
                                  <p className="text-[9px] font-bold text-gray-400">{r.product_code} · {Number(r.qty_requested).toLocaleString()} Pcs</p>
                                </div>
                                <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase ${
                                  r.status === "SHIPPED" ? "bg-emerald-100 text-emerald-700" :
                                  r.status === "PENDING_QC" ? "bg-purple-100 text-purple-700" :
                                  "bg-amber-100 text-amber-700"
                                }`}>{r.status === "SHIPPED" ? "Terkirim" : r.status === "PENDING_QC" ? "Menunggu QC" : r.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── STEP 6: QC Gate (OK Products) — after NG resolved ── */}
                  {(() => {
                    const s = stepStatus(6);
                    const open = expandedSteps[6];
                    const badgeMap: Record<StepStatus, string> = { done: "bg-emerald-100 text-emerald-700", active: "bg-blue-100 text-blue-700", partial: "bg-amber-100 text-amber-700", pending: "bg-gray-100 text-gray-400", skipped: "bg-gray-100 text-gray-400" };
                    const labelMap: Record<StepStatus, string> = { done: "Semua FG Diterima", active: "Menunggu QC", partial: "Sebagian Verified", pending: "Menunggu NG Selesai", skipped: "Tidak Ada OK Murni" };
                    if (s === "skipped") return (
                      <div>
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col items-center">
                            <StepDot status="skipped" icon={ShieldCheck} />
                            <ConnectorLine status="pending" />
                          </div>
                          <div className="flex-1 pt-1 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-gray-300 uppercase tracking-wide">6. QC Gate (Produk OK)</span>
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-300 text-[8px] font-black rounded uppercase">Tidak Ada Batch OK Murni</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                    return (
                      <div>
                        <button onClick={() => toggleStep(6)} className="w-full flex items-start gap-4 text-left group">
                          <div className="flex flex-col items-center">
                            <StepDot status={s} icon={ShieldCheck} />
                            <ConnectorLine status={connStatus(6)} />
                          </div>
                          <div className="flex-1 pb-2 pt-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-gray-900 uppercase tracking-wide">6. QC Gate (Produk OK)</span>
                                <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase ${badgeMap[s]}`}>{labelMap[s]}</span>
                              </div>
                              {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                              {qcGateOutputs.length} batch OK murni · {qcGateOutputs.filter(o => o.status === "Verified_QC" || o.status === "Received_FG").length} verified
                              {s === "pending" && " · Menunggu penyelesaian NG terlebih dahulu"}
                            </p>
                          </div>
                        </button>
                        {open && (
                          <div className="ml-14 mb-3 space-y-2">
                            {s === "pending" && (
                              <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-[10px] font-bold text-amber-700 flex items-center gap-2">
                                <AlertCircle size={12} /> Harap selesaikan Verifikasi NG dan Penggantian Bahan Baku terlebih dahulu
                              </div>
                            )}
                            {qcGateOutputs.length === 0 ? (
                              <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-[10px] font-bold text-gray-400 text-center uppercase tracking-widest">Belum ada batch OK murni</div>
                            ) : qcGateOutputs.map(po => (
                              <div key={po.id} className="p-3 bg-purple-50/50 border border-purple-100 rounded-2xl flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-black text-gray-800">#OUT-{po.id} — {Number(po.qty_ok).toLocaleString()} Pcs OK</p>
                                  <p className="text-[9px] font-bold text-gray-400">{fmtDate(po.updated_at)}</p>
                                </div>
                                <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase ${
                                  po.status === "Received_FG" ? "bg-emerald-100 text-emerald-700" :
                                  po.status === "Verified_QC" ? "bg-purple-100 text-purple-700" :
                                  "bg-amber-100 text-amber-700"
                                }`}>
                                  {po.status === "Received_FG" ? "FG Received" : po.status === "Verified_QC" ? "Verified QC" : "Pending QC"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── STEP 7: Terima Barang Jadi ── */}
                  {(() => {
                    const s = stepStatus(7);
                    const open = expandedSteps[7];
                    const badgeMap: Record<StepStatus, string> = { done: "bg-emerald-100 text-emerald-700", active: "bg-blue-100 text-blue-700", partial: "bg-amber-100 text-amber-700", pending: "bg-gray-100 text-gray-400", skipped: "bg-gray-100 text-gray-400" };
                    const labelMap: Record<StepStatus, string> = { done: "Semua Diterima", active: "Menunggu Penerimaan", partial: "Sebagian Diterima", pending: "Belum Ada", skipped: "N/A" };
                    return (
                      <div>
                        <button onClick={() => toggleStep(7)} className="w-full flex items-start gap-4 text-left group">
                          <div className="flex flex-col items-center">
                            <StepDot status={s} icon={Truck} />
                          </div>
                          <div className="flex-1 pt-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-gray-900 uppercase tracking-wide">7. Terima Barang Jadi</span>
                                <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase ${badgeMap[s]}`}>{labelMap[s]}</span>
                              </div>
                              {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                              {fgReceivedLogs.length > 0
                                ? `${fgReceivedLogs.length} batch diterima · Total OK: ${plan.total_ok.toLocaleString()} Pcs`
                                : "Menunggu QC Gate selesai"}
                            </p>
                          </div>
                        </button>
                        {open && (
                          <div className="ml-14 mt-3 space-y-2">
                            {fgReceivedLogs.length === 0 ? (
                              <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-[10px] font-bold text-gray-400 text-center uppercase tracking-widest">Belum ada barang jadi yang diterima</div>
                            ) : fgReceivedLogs.map(po => (
                              <div key={po.id} className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-black text-gray-800">#OUT-{po.id} — {Number(po.qty_ok).toLocaleString()} Pcs FG</p>
                                  <p className="text-[9px] font-bold text-gray-400">{fmtDate(po.updated_at)}</p>
                                </div>
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded uppercase">Received FG</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: OUTPUT LOG
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "outputs" && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <History size={15} className="text-emerald-500" /> Riwayat Laporan Hasil Cetak
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-emerald-600 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-100 uppercase tracking-widest flex items-center gap-1"><Sparkles size={9} /> Selalu Update</span>
                <span className="text-[9px] font-black text-gray-400">{plan.outputLogs.length} entri</span>
              </div>
            </div>
            {plan.outputLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <Activity className="text-gray-200" size={40} />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Belum Ada Output Run</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-50 bg-gray-50/50">
                      <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">ID Output</th>
                      <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Tanggal / Waktu</th>
                      <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Qty OK</th>
                      <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Qty NG</th>
                      <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Jenis NG / Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...plan.outputLogs].reverse().map(po => (
                      <tr key={po.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4"><span className="font-black text-gray-950 text-sm">#OUT-{po.id}</span></td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-bold text-gray-600">{po.created_at?.split("T")[0] || "-"}</p>
                          <p className="text-[10px] font-bold text-gray-400">{po.created_at?.split("T")[1]?.substring(0, 8) || ""}</p>
                        </td>
                        <td className="px-6 py-4 text-center"><span className="text-sm font-black text-emerald-600">{Number(po.qty_ok).toLocaleString()}</span><span className="text-[10px] font-bold text-gray-400 block">Pcs</span></td>
                        <td className="px-6 py-4 text-center"><span className={`text-sm font-black ${Number(po.qty_ng) > 0 ? "text-red-500" : "text-gray-300"}`}>{Number(po.qty_ng).toLocaleString()}</span><span className="text-[10px] font-bold text-gray-400 block">Pcs</span></td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-wider border ${
                            po.status === "Received_FG" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            po.status === "Verified_QC" ? "bg-purple-50 text-purple-700 border-purple-200" :
                            po.status === "WIP" || po.status === "SFG_PENDING_QC" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-gray-50 text-gray-500 border-gray-200"
                          }`}>
                            {po.status === "Received_FG" ? "FG Received" : po.status === "Verified_QC" ? "Verified QC" : po.status === "WIP" ? "Pending QC" : po.status}
                          </span>
                          {po.replacement_status && (
                            <div className="mt-1"><span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase tracking-wider ${po.replacement_status === "SHIPPED" ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"}`}>REP: {po.replacement_status === "SHIPPED" ? "Terkirim" : "Siap Kirim"}</span></div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {po.ng_type && <p className="text-[10px] font-black text-red-600 uppercase tracking-wider">{po.ng_type}</p>}
                          {po.ng_category && <p className="text-[9px] font-bold text-gray-400">{po.ng_category}</p>}
                          {po.notes && <p className="text-[10px] font-semibold text-gray-500 mt-0.5 max-w-[200px] truncate" title={po.notes}>{po.notes}</p>}
                          {!po.ng_type && !po.notes && !po.ng_category && <span className="text-[10px] font-bold text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {plan.outputLogs.length > 0 && (
              <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/30 flex items-center justify-between">
                <div className="flex items-center gap-6 text-xs font-bold">
                  <span className="text-gray-500">Total Run: <span className="text-gray-900 font-black">{plan.po_count}</span></span>
                  <span className="text-emerald-600">OK: <span className="font-black">{plan.total_ok.toLocaleString()} Pcs</span></span>
                  <span className="text-red-500">NG: <span className="font-black">{plan.total_ng.toLocaleString()} Pcs</span></span>
                  {totalOutput > 0 && <span className="text-gray-400">Efisiensi: <span className={`font-black ${Math.round((plan.total_ok / totalOutput) * 100) >= 90 ? "text-emerald-600" : "text-amber-600"}`}>{Math.round((plan.total_ok / totalOutput) * 100)}%</span></span>}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400"><RefreshCw size={10} className={refreshing ? "animate-spin" : ""} /> Auto-refresh 30s</div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: BOM
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "bom" && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-3">
              <Boxes size={15} className="text-emerald-500" /> Daftar Bahan Baku (BOM Aktif)
            </h3>
            {plan.bomMaterials.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                <Package className="text-gray-200" size={36} />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">BOM Tidak Ditemukan</p>
                <p className="text-[10px] font-semibold text-gray-300">Produk ini belum memiliki BOM aktif</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Komponen</th>
                      <th className="px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Kode</th>
                      <th className="px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Tipe</th>
                      <th className="px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Qty / Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {plan.bomMaterials.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-xs font-black text-gray-800">{item.product_name}</td>
                        <td className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase">{item.product_code}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase ${item.item_type === "WIP" ? "bg-blue-50 text-blue-600" : item.item_type === "FG" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>{item.item_type}</span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="text-xs font-black text-gray-800">{Number(item.qty_per_unit).toLocaleString()}</span>
                          <span className="text-[9px] font-bold text-gray-400 ml-1">{item.product_unit}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

    </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl border border-gray-100 shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">Ubah Rencana MPP</h3>
                <p className="text-xs text-gray-400 font-bold mt-0.5">{plan.pro_code} · {plan.product_code}</p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors border border-gray-150 w-8 h-8 rounded-full"
              >
                X
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Operator Pelaksana</label>
                  <input
                    type="text"
                    value={editOperatorName}
                    onChange={(e) => setEditOperatorName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Shift Kerja</label>
                  <select
                    value={editShift}
                    onChange={(e) => setEditShift(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold outline-none"
                  >
                    <option value="Shift 1">Shift 1</option>
                    <option value="Shift 2">Shift 2</option>
                    <option value="Shift 3">Shift 3</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Target Qty (Pcs)</label>
                  <input
                    type="number"
                    value={editTargetQty}
                    onChange={(e) => setEditTargetQty(Number(e.target.value))}
                    min={1}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Status Transaksi</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold outline-none"
                  >
                    <option value="Menunggu WO">Menunggu WO</option>
                    <option value="Menunggu Realisasi Bahan Baku">Menunggu Realisasi</option>
                    <option value="Menunggu Molding">Menunggu Molding</option>
                    <option value="Menunggu QC Gate">Menunggu QC Gate</option>
                    <option value="Menunggu Perbaikan">Menunggu Perbaikan</option>
                    <option value="Menunggu Penarikan FG">Menunggu Penarikan FG</option>
                    <option value="Dalam Produksi">Dalam Produksi</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Mesin Produksi</label>
                  <select
                    value={editMachineId}
                    onChange={(e) => setEditMachineId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold outline-none"
                  >
                    {machines.map((m: any) => (
                      <option key={m.code} value={m.code}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Mold / Cetakan</label>
                  <select
                    value={editMoldId}
                    onChange={(e) => setEditMoldId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold outline-none"
                  >
                    {molds.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-xs font-bold transition-all h-12"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all h-12 shadow-lg shadow-emerald-100 disabled:opacity-50"
                >
                  {submittingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
