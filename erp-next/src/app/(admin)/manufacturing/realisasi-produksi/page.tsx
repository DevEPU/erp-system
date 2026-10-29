"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  History,
  Search,
  Cpu,
  Layers,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Sliders,
  Trash2,
  PackageCheck,
  Warehouse
} from "lucide-react";
import api from "@/lib/api";

interface Plan {
  id: number;
  proCode: string;
  orderSheetId?: number;
  osReference?: string;
  productName: string;
  productCode: string;
  machineName: string;
  machineCode: string;
  operatorName: string;
  targetQty: number;
  actualQty: number;
  startDate: string;
  endDate: string;
  shift: string;
  status: string;
  moldId?: number;
  moldCode?: string;
  moldName?: string;
}

interface ProductionOutput {
  id: number;
  pro_id: number;
  pro_code: string;
  os_reference?: string;
  wo_reference?: string;
  product_name: string;
  product_code: string;
  qty_ok: number;
  qty_ng: number;
  qty_received?: number;
  ng_type?: string | null;
  notes?: string | null;
  ng_category?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function RealisasiProduksiPage() {
  const router = useRouter();

  // Active sub-tab state
  const [activeTab, setActiveTab] = useState<"active-plans" | "output-history" | "terima-fg">("active-plans");

  // Listing Data States
  const [plans, setPlans] = useState<Plan[]>([]);
  const [outputs, setOutputs] = useState<ProductionOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [qtyOk, setQtyOk] = useState<number | "">("");
  const [qtyNg, setQtyNg] = useState<number | "">("");
  const [ngCategory, setNgCategory] = useState<string>("");
  const [ngType, setNgType] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isInsertMolding, setIsInsertMolding] = useState(true);
  const [bomComponents, setBomComponents] = useState<any[]>([]);
  const [componentsNgMap, setComponentsNgMap] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);

  // Receive FG Modal State
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedReceiveOutput, setSelectedReceiveOutput] = useState<ProductionOutput | null>(null);
  const [qtyReceived, setQtyReceived] = useState<number | "">("");
  const [receiveNote, setReceiveNote] = useState("");
  const [isSubmittingReceive, setIsSubmittingReceive] = useState(false);

  // Fetch initial plans and output records
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Plans
      const proRes = await api.express.get("/manufacturing/planning-produksi").catch(() => null);
      if (proRes && proRes.data && proRes.data.success) {
        const mapped = proRes.data.data.map((p: any) => ({
          id: p.id,
          proCode: p.pro_code,
          orderSheetId: p.order_sheet_id,
          osReference: p.os_reference,
          productName: p.product_name,
          productCode: p.product_code,
          machineName: p.machine_id ? `MC-${p.machine_id}` : "-",
          machineCode: p.machine_id || "-",
          operatorName: p.operator_name || "-",
          targetQty: Number(p.target_qty || 0),
          actualQty: Number(p.actual_qty || 0),
          startDate: p.start_date,
          endDate: p.end_date,
          shift: `Shift ${p.shift}`,
          status: p.status,
          moldId: p.mold_id,
          moldCode: p.mold_code,
          moldName: p.mold_name
        }));
        setPlans(mapped);
      }

      // 2. Fetch Production Outputs
      const outputsRes = await api.express.get("/manufacturing/production-outputs").catch(() => null);
      if (outputsRes && outputsRes.data && outputsRes.data.success) {
        setOutputs(outputsRes.data.data || []);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter plans based on search and status (only show active production plans)
  const filteredPlans = plans.filter((p) => {
    const isMoldingStatus = 
      p.status === "Menunggu Molding" || 
      p.status === "Dalam Produksi" ||
      p.status === "Menunggu QC Gate" ||
      p.status === "Menunggu Perbaikan" ||
      p.status === "Berjalan";
      
    if (!isMoldingStatus) return false;

    const matchesSearch =
      p.proCode.toLowerCase().includes(search.toLowerCase()) ||
      (p.osReference && p.osReference.toLowerCase().includes(search.toLowerCase())) ||
      p.productName.toLowerCase().includes(search.toLowerCase()) ||
      p.productCode.toLowerCase().includes(search.toLowerCase()) ||
      p.operatorName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filter output logs based on search
  const filteredOutputs = outputs.filter((o) => {
    const matchesSearch =
      o.pro_code.toLowerCase().includes(search.toLowerCase()) ||
      o.product_name.toLowerCase().includes(search.toLowerCase()) ||
      o.product_code.toLowerCase().includes(search.toLowerCase()) ||
      o.status.toLowerCase().includes(search.toLowerCase());

    return matchesSearch;
  });

  // Filter outputs for FG Reception tab
  const filteredReceiveOutputs = outputs.filter((o) => {
    // Only show Verified_QC and Received_FG
    const isReceiveStatus = o.status === "Verified_QC" || o.status === "Received_FG";
    if (!isReceiveStatus) return false;

    const matchesSearch =
      o.pro_code.toLowerCase().includes(search.toLowerCase()) ||
      o.product_name.toLowerCase().includes(search.toLowerCase()) ||
      o.product_code.toLowerCase().includes(search.toLowerCase()) ||
      (o.os_reference && o.os_reference.toLowerCase().includes(search.toLowerCase())) ||
      (o.wo_reference && o.wo_reference.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "all" || o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const openInputModal = async (plan: Plan) => {
    setSelectedPlan(plan);
    const remaining = Math.max(0, plan.targetQty - plan.actualQty);
    setQtyOk(remaining > 0 ? remaining : "");
    setQtyNg("");
    setNgCategory("");
    setNgType("");
    setNotes("");
    setIsInsertMolding(true);
    setComponentsNgMap({});
    setBomComponents([]);
    setIsModalOpen(true);

    try {
      // Load BOM details for the plan to discover insert components
      const bomsRes = await api.express.get("/manufacturing/boms");
      if (bomsRes && bomsRes.data && bomsRes.data.success) {
        const activeBom = bomsRes.data.data.find(
          (b: any) => b.finished_good_code === plan.productCode && b.status === "Aktif"
        );
        if (activeBom) {
          const bomDetailRes = await api.express.get(`/manufacturing/boms/${activeBom.id}`);
          if (bomDetailRes && bomDetailRes.data && bomDetailRes.data.success) {
            const items = bomDetailRes.data.items || [];
            // Filter insert components: root items excluding resin (which usually has Kg/g/EPPP units/codes and is raw/WIP)
            const components = items.filter(
              (item: any) =>
                item.parent_item_id === null &&
                item.product_code !== plan.productCode &&
                item.item_type !== "WIP" &&
                !(
                  item.unit?.toLowerCase() === "kg" ||
                  item.unit?.toLowerCase() === "g" ||
                  item.product_code.startsWith("EPPP")
                )
            );
            setBomComponents(components);
            setIsInsertMolding(components.length > 0);
          }
        }
      }
    } catch (err) {
      console.error("Error loading BOM components for realization:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    const valOk = Number(qtyOk || 0);
    let valNg = Number(qtyNg || 0);

    const componentNgList: any[] = [];
    if (isInsertMolding) {
      let maxImpliedNg = 0;
      bomComponents.forEach((comp) => {
        const compNgQty = componentsNgMap[comp.id] || 0;
        if (compNgQty > 0 && comp.product_id) {
          componentNgList.push({
            product_id: Number(comp.product_id),
            qty: compNgQty
          });
          const usage = Number(comp.qty || 1);
          const impliedNg = Math.ceil(compNgQty / usage);
          if (impliedNg > maxImpliedNg) {
            maxImpliedNg = impliedNg;
          }
        }
      });
      if (maxImpliedNg > valNg) {
        valNg = maxImpliedNg;
      }
    }

    if (valOk <= 0 && valNg <= 0) {
      alert("Kuantitas hasil OK atau cacat (NG) harus lebih besar dari 0.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        pro_id: selectedPlan.id,
        qty_ok: valOk,
        qty_ng: valNg,
        type: isInsertMolding ? "insert" : "standard",
        component_ng_list: componentNgList,
        ng_type: valNg > 0 ? ngType : null,
        notes: valNg > 0 ? notes : null,
        ng_category: valNg > 0 ? ngCategory : null
      };

      const res = await api.express.post("/manufacturing/production-outputs", payload);
      if (res && res.data && res.data.success) {
        alert("Laporan realisasi hasil produksi berhasil diserahkan!");
        setIsModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      console.error("Error submitting molding output:", err);
      alert(err.response?.data?.message || err.message || "Gagal menyerahkan realisasi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReceive = (output: ProductionOutput) => {
    setSelectedReceiveOutput(output);
    setQtyReceived(""); // Force manual input of actual quantity
    setReceiveNote("");
    setIsReceiveModalOpen(true);
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceiveOutput) return;

    const valReceived = Number(qtyReceived || 0);
    if (valReceived <= 0) {
      alert("Kuantitas masuk aktual harus lebih dari 0!");
      return;
    }

    setIsSubmittingReceive(true);
    try {
      const res = await api.express.post(
        `/manufacturing/production-outputs/${selectedReceiveOutput.id}/fg-receive`,
        {
          qty_received: valReceived,
          notes: receiveNote
        }
      );

      if (res && res.data && res.data.success) {
        alert(`Sukses menerima ${valReceived.toLocaleString()} Pcs ke Gudang Finished Goods (WHFG).`);
        setIsReceiveModalOpen(false);
        setSelectedReceiveOutput(null);
        loadData();
      }
    } catch (err: any) {
      console.error("Error receiving finished goods:", err);
      alert(err.response?.data?.message || err.message || "Gagal menerima barang.");
    } finally {
      setIsSubmittingReceive(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Menunggu Molding":
        return (
          <span className="px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-max">
            <Cpu size={10} /> Menunggu Molding
          </span>
        );
      case "Dalam Produksi":
      case "Berjalan":
        return (
          <span className="px-2.5 py-1 bg-cyan-50 text-cyan-600 border border-cyan-200 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-max">
            <Activity size={10} /> Dalam Produksi
          </span>
        );
      case "Menunggu QC Gate":
        return (
          <span className="px-2.5 py-1 bg-purple-50 text-purple-600 border border-purple-200 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-max">
            <Clock size={10} /> Menunggu QC Gate
          </span>
        );
      case "Menunggu Perbaikan":
        return (
          <span className="px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-max animate-pulse">
            <AlertCircle size={10} /> Menunggu Perbaikan
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[9px] font-black rounded-full uppercase tracking-wider w-max">
            {status}
          </span>
        );
    }
  };

  const getQCStatusBadge = (status: string) => {
    switch (status) {
      case "WIP":
      case "SFG_PENDING_QC":
        return (
          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-max mx-auto">
            <Clock size={10} /> Pending QC Verification
          </span>
        );
      case "Verified_QC":
        return (
          <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-max mx-auto">
            <CheckCircle2 size={10} /> QC Verified
          </span>
        );
      case "Received_FG":
        return (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-max mx-auto">
            <CheckCircle2 size={10} /> FG Received in WH
          </span>
        );
      case "PENDING_REPAIR":
        return (
          <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-max mx-auto animate-pulse">
            <AlertCircle size={10} /> Rejected (Need Repair)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-gray-50 text-gray-500 border border-gray-200 text-[9px] font-black rounded-full uppercase tracking-wider w-max mx-auto">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen animate-in fade-in duration-500">
      
      {/* Back navigation */}
      <button 
        onClick={() => router.push("/manufacturing")}
        className="flex items-center gap-2 text-xs font-black text-emerald-600 hover:text-emerald-800 transition-colors uppercase tracking-widest"
      >
        <ArrowLeft size={14} /> Back to Manufacturing
      </button>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-200">
              <CheckSquare className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Realisasi <span className="text-emerald-600">Hasil Produksi</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Catat yields molding harian (OK, NG, Component defect) sebelum diverifikasi oleh Quality Control Gate.
          </p>
        </div>

        {/* Sub-tab Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
          <button
            onClick={() => {
              setActiveTab("active-plans");
              setSearch("");
              setStatusFilter("all");
            }}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === "active-plans" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-700"
            }`}
          >
            <Cpu size={14} />
            Rencana Cetak Aktif
          </button>
          <button
            onClick={() => {
              setActiveTab("output-history");
              setSearch("");
              setStatusFilter("all");
            }}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === "output-history" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-700"
            }`}
          >
            <History size={14} />
            Riwayat Output Cetak
          </button>
          <button
            onClick={() => {
              setActiveTab("terima-fg");
              setSearch("");
              setStatusFilter("all");
            }}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === "terima-fg" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-700"
            }`}
          >
            <PackageCheck size={14} />
            Terima Barang Jadi
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder={
              activeTab === "active-plans"
                ? "Cari PrO, OS, produk target, operator..."
                : activeTab === "output-history"
                ? "Cari PrO Code, nama produk, status..."
                : "Cari PrO, OS, nama produk..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:bg-white outline-none transition-all"
          />
        </div>

        {activeTab === "active-plans" && (
          <div className="relative w-full md:max-w-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all appearance-none"
            >
              <option value="all">Semua Status Rencana</option>
              <option value="Menunggu Molding">Menunggu Molding</option>
              <option value="Dalam Produksi">Dalam Produksi</option>
              <option value="Menunggu QC Gate">Menunggu QC Gate</option>
              <option value="Menunggu Perbaikan">Menunggu Perbaikan</option>
            </select>
          </div>
        )}

        {activeTab === "terima-fg" && (
          <div className="relative w-full md:max-w-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all appearance-none"
            >
              <option value="all">Semua Status Penerimaan</option>
              <option value="Verified_QC">Menunggu Penerimaan</option>
              <option value="Received_FG">Sudah Diterima</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
        {activeTab === "active-plans" ? (
          /* Active Plans Sub-tab */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">No. PrO / Ref OS</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Produk Target</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mesin / Mold</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Capaian Aktual</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-6"><div className="h-10 bg-gray-50 rounded-xl w-full"></div></td>
                    </tr>
                  ))
                ) : filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-24 text-center font-bold text-gray-400 uppercase tracking-widest text-sm bg-gray-50/10">
                      Tidak ada rencana produksi molding aktif.
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map((plan) => {
                    const percent = plan.targetQty > 0 ? Math.round((plan.actualQty / plan.targetQty) * 100) : 0;
                    return (
                      <tr key={plan.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-5">
                          <div className="font-black text-gray-950 text-sm">{plan.proCode}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{plan.osReference || "-"}</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-bold text-gray-800 text-xs truncate max-w-xs">{plan.productName}</div>
                          <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider mt-0.5">{plan.productCode}</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-bold text-gray-700 text-xs flex items-center gap-1">
                            <Cpu size={12} className="text-gray-400" /> {plan.machineCode}
                          </div>
                          <div className="text-[9px] text-indigo-500 font-black flex items-center gap-1 mt-1">
                            <Layers size={11} /> {plan.moldCode || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="text-xs font-black text-gray-950">
                            {plan.actualQty.toLocaleString()} <span className="text-gray-400 font-semibold">/ {plan.targetQty.toLocaleString()}</span>
                          </div>
                          <div className="w-24 bg-gray-100 h-1.5 rounded-full overflow-hidden mt-1.5 mx-auto">
                            <div 
                              className="h-full rounded-full bg-emerald-500 transition-all duration-350"
                              style={{ width: `${Math.min(100, percent)}%` }} 
                            />
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex justify-center">{getStatusBadge(plan.status)}</div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button
                            onClick={() => openInputModal(plan)}
                            className="bg-gray-950 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all shadow-sm"
                          >
                            Input Hasil Produksi
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === "output-history" ? (
          /* Historical Run Logs Sub-tab */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">No. Run Log</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">PrO Rujukan</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Produk</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty OK</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty NG</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Detail NG</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">QC Gate</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={8} className="px-6 py-6"><div className="h-10 bg-gray-50 rounded-xl w-full"></div></td>
                    </tr>
                  ))
                ) : filteredOutputs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-24 text-center font-bold text-gray-400 uppercase tracking-widest text-sm bg-gray-50/10">
                      Belum ada laporan hasil cetak molding yang terdaftar.
                    </td>
                  </tr>
                ) : (
                  filteredOutputs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-5 font-black text-gray-700 text-xs">
                        #OUT-{log.id}
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-bold text-emerald-600 text-xs">{log.pro_code}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-semibold text-gray-800 text-xs truncate max-w-xs">{log.product_name}</div>
                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{log.product_code}</div>
                      </td>
                      <td className="px-6 py-5 text-center font-black text-emerald-600 text-xs">
                        {log.qty_ok.toLocaleString()}
                      </td>
                      <td className="px-6 py-5 text-center font-black text-red-500 text-xs">
                        {log.qty_ng.toLocaleString()}
                      </td>
                      <td className="px-6 py-5 text-xs">
                        {log.qty_ng > 0 ? (
                          <div className="space-y-0.5">
                            {log.ng_type && (
                              <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded text-[9px] font-bold block w-max">
                                {log.ng_type}
                              </span>
                            )}
                            {log.ng_category && (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[9px] font-bold block w-max mt-1">
                                Kategori: {log.ng_category}
                              </span>
                            )}
                            {log.notes && (
                              <p className="text-[10px] text-gray-500 font-semibold italic max-w-[150px] truncate" title={log.notes}>
                                "{log.notes}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                        {getQCStatusBadge(log.status)}
                      </td>
                      <td className="px-6 py-5 text-center text-[10px] font-bold text-gray-400">
                        {log.created_at}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Terima Finished Goods Sub-tab */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">No. PrO / Ref OS</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Produk Target</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty Lolos QC</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty Masuk WHFG</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Aksi / Penerimaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-6"><div className="h-10 bg-gray-50 rounded-xl w-full"></div></td>
                    </tr>
                  ))
                ) : filteredReceiveOutputs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-24 text-center font-bold text-gray-400 uppercase tracking-widest text-sm bg-gray-50/10">
                      Tidak ada antrean penerimaan barang jadi.
                    </td>
                  </tr>
                ) : (
                  filteredReceiveOutputs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-5">
                        <div className="font-black text-gray-950 text-sm">{log.pro_code}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                          {log.os_reference || log.wo_reference || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-bold text-gray-800 text-xs truncate max-w-xs">{log.product_name}</div>
                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider mt-0.5">{log.product_code}</div>
                      </td>
                      <td className="px-6 py-5 text-center font-bold text-gray-600 text-xs">
                        {log.qty_ok.toLocaleString()} Pcs
                      </td>
                      <td className="px-6 py-5 text-center font-black text-emerald-600 text-xs">
                        {log.qty_received ? `${log.qty_received.toLocaleString()} Pcs` : "-"}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex justify-center">{getQCStatusBadge(log.status)}</div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        {log.status === "Verified_QC" ? (
                          <button
                            onClick={() => handleOpenReceive(log)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all shadow-sm active:scale-95"
                          >
                            Terima Barang Jadi
                          </button>
                        ) : log.status === "Received_FG" ? (
                          <span className="text-xs font-bold text-gray-400">Tersimpan di WHFG</span>
                        ) : (
                          <span className="text-xs font-bold text-gray-300">Menunggu QC</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* POP-UP MODAL FOR INPUT MOLDING REALIZATION */}
      {isModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl border border-gray-100 shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckSquare size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Realisasi Output Produksi</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">{selectedPlan.proCode} - {selectedPlan.productName}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                [X]
              </button>
            </div>

            {/* Progress Summary Card */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50/80 rounded-2xl border border-gray-100 text-center">
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Target Rencana</span>
                <span className="text-base font-black text-gray-800">{selectedPlan.targetQty.toLocaleString()} Pcs</span>
              </div>
              <div className="border-x border-gray-200">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Telah Dicetak</span>
                <span className="text-base font-black text-emerald-600">{selectedPlan.actualQty.toLocaleString()} Pcs</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Sisa Target</span>
                <span className="text-base font-black text-blue-600">
                  {Math.max(0, selectedPlan.targetQty - selectedPlan.actualQty).toLocaleString()} Pcs
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Kuantitas Hasil OK (Pcs)</label>
                    <span className="text-[10px] font-bold text-gray-400">
                      Maks sisa: {Math.max(0, selectedPlan.targetQty - selectedPlan.actualQty)}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={qtyOk}
                    onChange={(e) => setQtyOk(e.target.value === "" ? "" : Number(e.target.value))}
                    required
                    placeholder="Contoh: 250"
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all h-12 text-center text-emerald-600 font-black text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Kuantitas Hasil NG (Pcs)</label>
                  <input
                    type="number"
                    min={0}
                    value={qtyNg}
                    onChange={(e) => {
                      setQtyNg(e.target.value === "" ? "" : Number(e.target.value));
                      setComponentsNgMap({});
                    }}
                    required
                    placeholder="Contoh: 5"
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all h-12 text-center text-red-500 font-black text-lg"
                  />
                </div>
              </div>

              {Number(qtyNg || 0) > 0 && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Kategori NG</label>
                  <select
                    value={ngCategory}
                    onChange={(e) => setNgCategory(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all h-12"
                  >
                    <option value="">-- Pilih Kategori NG --</option>
                    <option value="Material">Material</option>
                    <option value="Component">Component</option>
                    <option value="Material & Component">Material & Component</option>
                  </select>
                </div>
              )}

              {/* NG Type & Notes inputs, visible when qtyNg > 0 or has component NG */}
              {(Number(qtyNg || 0) > 0 || Object.values(componentsNgMap).some(v => v > 0)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-red-50/30 p-4 rounded-3xl border border-red-100/50 animate-in fade-in duration-200">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest block">Pilihan Type NG</label>
                    <select
                      value={ngType}
                      onChange={(e) => setNgType(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-red-500/20 transition-all h-12"
                    >
                      <option value="">-- Pilih Tipe Cacat (NG) --</option>
                      <option value="Flash">Flash (Luber)</option>
                      <option value="Short Shot">Short Shot (Kurang Bahan)</option>
                      <option value="Sink Mark">Sink Mark (Penyusutan)</option>
                      <option value="Bubble">Bubble (Bintik Udara)</option>
                      <option value="Silver Streak">Silver Streak</option>
                      <option value="Flow Mark">Flow Mark</option>
                      <option value="Warping">Warping (Melengkung)</option>
                      <option value="Crack">Crack (Retak)</option>
                      <option value="Color Contamination">Color Contamination (Kontaminasi Warna)</option>
                      <option value="Defect Component">Defect Component (Cacat Komponen)</option>
                      <option value="Lain-lain">Lain-lain</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest block">Catatan Tambahan</label>
                    <textarea
                      placeholder="Detail masalah cacat produksi..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-red-500/20 transition-all h-12 min-h-[48px] resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Dynamic Insert Molding checkbox option */}
              {bomComponents.length > 0 && (
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div>
                    <span className="text-xs font-black text-gray-800 block">Metode Insert Molding</span>
                    <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
                      Aktifkan audit untuk mendata kerusakan sisipan logam (komponen) di hasil NG.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isInsertMolding} 
                      onChange={(e) => setIsInsertMolding(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              )}

              {/* Component Defect Audit Table */}
              {isInsertMolding && Number(qtyNg || 0) > 0 && bomComponents.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest block">
                      Audit Defect Komponen Logam (Dari {qtyNg} NG)
                    </span>
                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">
                      Defect memicu Kirim Ulang Matkom
                    </span>
                  </div>

                  <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="p-3 font-black text-gray-400 uppercase tracking-wider">Nama Komponen</th>
                          <th className="p-3 font-black text-gray-400 uppercase tracking-wider text-center">Komponen Ikut NG (Defect)</th>
                          <th className="p-3 font-black text-gray-400 uppercase tracking-wider text-center">Komponen Selamat (OK / Salvage)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {bomComponents.map((comp) => {
                          const bomUsage = Number(comp.qty || 1);
                          const totalUsedInNg = Number(qtyNg || 0) * bomUsage;
                          const compNgQty = componentsNgMap[comp.id] || 0;
                          const compSalvaged = Math.max(0, totalUsedInNg - compNgQty);

                          return (
                            <tr key={comp.id}>
                              <td className="p-3">
                                <div className="font-bold text-gray-800">{comp.product_name}</div>
                                <div className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">
                                  {comp.product_code} (Usage: {bomUsage} Pcs/run)
                                </div>
                              </td>
                              <td className="p-3 text-center" style={{ width: '130px' }}>
                                <input
                                  type="number"
                                  min={0}
                                  max={totalUsedInNg}
                                  value={compNgQty || ""}
                                  onChange={(e) => {
                                    const val = Math.min(totalUsedInNg, Math.max(0, Number(e.target.value)));
                                    setComponentsNgMap({ ...componentsNgMap, [comp.id]: val });
                                  }}
                                  placeholder="0"
                                  className="w-20 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-black text-center"
                                />
                              </td>
                              <td className="p-3 text-center text-emerald-600 font-black text-sm" style={{ width: '130px' }}>
                                {compSalvaged} Pcs
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold leading-tight">
                    * Komponen insert yang selamat (OK) akan dilebur ulang / disalvage di stasiun produksi secara otomatis (net stok 0). Komponen defect (NG) akan mengaktifkan proses replacements untuk dikirim ulang dari gudang bahan baku MATKOM.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-xs font-bold transition-all h-12"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all h-12 shadow-lg shadow-emerald-100 disabled:opacity-50"
                >
                  {submitting ? "Mengirim..." : "Kirim Realisasi Produksi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIVE FINISHED GOODS MODAL */}
      {isReceiveModalOpen && selectedReceiveOutput && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg border border-gray-100 shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <PackageCheck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Pemasukan Gudang Finished Goods</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">PrO: {selectedReceiveOutput.pro_code} - {selectedReceiveOutput.product_code}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsReceiveModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                [X]
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit} className="space-y-6">
              
              <div className="bg-gray-50 p-4 rounded-2xl space-y-2 text-xs font-bold text-gray-600">
                <div className="flex justify-between">
                  <span>Nama Item:</span>
                  <span className="text-gray-900 text-right max-w-[200px] truncate">{selectedReceiveOutput.product_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kode Item:</span>
                  <span className="text-gray-900">{selectedReceiveOutput.product_code}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                  <span>Kuantitas Lolos QC:</span>
                  <span className="text-emerald-600 text-sm font-black">{selectedReceiveOutput.qty_ok.toLocaleString()} Pcs</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Kuantitas Masuk Aktual (Pcs)</label>
                <input
                  type="number"
                  min={1}
                  max={selectedReceiveOutput.qty_ok}
                  value={qtyReceived}
                  onChange={(e) => setQtyReceived(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                  placeholder={`Maksimal ${selectedReceiveOutput.qty_ok.toLocaleString()} Pcs`}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-base font-black text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all h-12 text-center text-lg"
                />
                <p className="text-[10px] text-gray-400 font-semibold">Tentukan jumlah fisik barang yang masuk ke rak penyimpanan Gudang Jadi.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Catatan Lokasi Rak / Keterangan</label>
                <input
                  type="text"
                  placeholder="Contoh: Rak A2-4, Kondisi Baik..."
                  value={receiveNote}
                  onChange={(e) => setReceiveNote(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all h-12"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-500 py-3 rounded-xl text-xs font-bold transition-all h-12 uppercase tracking-wider"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReceive}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all h-12 shadow-lg shadow-emerald-100"
                >
                  {isSubmittingReceive ? "Menyimpan..." : "Terima & Debet Stok"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
