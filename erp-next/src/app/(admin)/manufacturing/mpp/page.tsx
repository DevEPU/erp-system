"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForecastEnabled } from "@/lib/config";
import {
  CalendarDays,
  Plus,
  Search,
  Calendar,
  Clock,
  ArrowLeft,
  ArrowRight,
  Cpu,
  User,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  BarChart3,
  Sliders,
  Sparkles,
  ClipboardList,
  Eye,
  Edit,
  Printer,
  History,
  X,
  Calculator,
  Timer,
  Lock
} from "lucide-react";
import api from "@/lib/api";

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface Plan {
  id: number;
  proCode: string;
  orderSheetId?: number;
  osReference?: string;
  productName: string;
  productCode: string;
  machineName: string;
  machineCode: string;
  operatorLead?: string;
  operatorName: string;
  targetQty: number;
  actualQty: number;
  startDate: string;
  endDate: string;
  shift: string;
  shiftHours?: number;
  uphUsed?: number;
  status: string;
  note?: string;
  moldId?: number;
  moldCode?: string;
  moldName?: string;
  lineSpeed?: string;
}

interface OrderSheet {
  id: number;
  reference: string;
  customer_name?: string;
  details?: {
    id: number;
    product_id: number;
    product_name: string;
    product_code: string;
    product_unit: string;
    os_qty: number;
  }[];
}

interface Mold {
  id: number;
  code: string;
  name: string;
  is_active: boolean | number;
}

interface CapacityLog {
  id: number;
  date: string;
  machine_id: number;
  mold_id: number;
  uph: number;
  shift_1_hours: number;
  shift_2_hours: number;
  shift_3_hours: number;
  shift_1_target: number;
  shift_2_target: number;
  shift_3_target: number;
  working_days: number;
  daily_target: number;
  monthly_target: number;
  notes?: string;
  machine_code: string;
  machine_name: string;
  mold_code: string;
  mold_name: string;
  created_at: string;
}

// ══════════════════════════════════════════════════════════════════════════════
export default function PlanningProduksiPage() {
  const router = useRouter();
  const isForecastEnabled = useForecastEnabled();
  
  // View states
  const [view, setView] = useState<"timeline" | "list" | "balance">("timeline");
  const [timelineFrame, setTimelineFrame] = useState<"week" | "month">("week");
  const [timelineMonth, setTimelineMonth] = useState(new Date().getMonth() + 1);
  const [timelineYear, setTimelineYear] = useState(new Date().getFullYear());
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editOperatorLead, setEditOperatorLead] = useState("");
  const [editOperatorName, setEditOperatorName] = useState("");
  const [editShift, setEditShift] = useState("Shift 1");
  const [editTargetQty, setEditTargetQty] = useState(0);
  const [editMachineId, setEditMachineId] = useState("");
  const [editMoldId, setEditMoldId] = useState("");
  const [editStatus, setEditStatus] = useState("");

  // Detailed History Output State
  const [proOutputLogs, setProOutputLogs] = useState<any[]>([]);
  const [loadingOutputs, setLoadingOutputs] = useState(false);

  // Listing Data States
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("Semua");
  const [selectedMachine, setSelectedMachine] = useState<string>("Semua");

  // Masters & Dropdown States
  const [orderSheets, setOrderSheets] = useState<OrderSheet[]>([]);
  const [customerPOs, setCustomerPOs] = useState<any[]>([]);
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [molds, setMolds] = useState<Mold[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  
  // Form Demand Source & Calculation states (OrderSheet eliminated, default customer_po)
  const [demandSource, setDemandSource] = useState<"customer_po" | "forecast" | "manual">("customer_po");
  const [selectedOsId, setSelectedOsId] = useState("");
  const [selectedPoId, setSelectedPoId] = useState("");
  const [selectedForecastId, setSelectedForecastId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedMoldId, setSelectedMoldId] = useState("");
  const [machineCode, setMachineCode] = useState("");
  const [grossDemandQty, setGrossDemandQty] = useState(0);
  const [stoFgQty, setStoFgQty] = useState(0);
  const [safetyStockFg, setSafetyStockFg] = useState(0);
  const [targetQty, setTargetQty] = useState(700);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [shift, setShift] = useState("Shift 1");
  const [operatorLead, setOperatorLead] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [note, setNote] = useState("");

  // Karyawan / User list for searchable dropdowns
  const [karyawanList, setKaryawanList] = useState<any[]>([]);
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [opSearchQuery, setOpSearchQuery] = useState("");
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [showOpDropdown, setShowOpDropdown] = useState(false);
  // Edit modal karyawan dropdowns
  const [editLeadSearchQuery, setEditLeadSearchQuery] = useState("");
  const [editOpSearchQuery, setEditOpSearchQuery] = useState("");
  const [showEditLeadDropdown, setShowEditLeadDropdown] = useState(false);
  const [showEditOpDropdown, setShowEditOpDropdown] = useState(false);
  const [downtimeReason, setDowntimeReason] = useState("");
  const [editShiftHours, setEditShiftHours] = useState("7");
  const [editDowntimeReason, setEditDowntimeReason] = useState("");

  // Items from selected PO or Forecast
  const [poItems, setPoItems] = useState<any[]>([]);
  const [forecastItems, setForecastItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Realisasi Molding states
  const [isRealisasiModalOpen, setIsRealisasiModalOpen] = useState(false);
  const [qtyOk, setQtyOk] = useState(0);
  const [qtyNg, setQtyNg] = useState(0);
  const [isInsertMolding, setIsInsertMolding] = useState(true);
  const [bomComponents, setBomComponents] = useState<any[]>([]);
  const [componentsNgMap, setComponentsNgMap] = useState<Record<number, number>>({});

  // ─── UPH & Capacity Calculator States ───
  const [activeUph, setActiveUph] = useState(0);
  const [uphLoading, setUphLoading] = useState(false);
  const [uphFound, setUphFound] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [shift1Hours, setShift1Hours] = useState("7");
  const [shift2Hours, setShift2Hours] = useState("7");
  const [shift3Hours, setShift3Hours] = useState("7");
  const [simWorkingDays, setSimWorkingDays] = useState("25");
  const [simNotes, setSimNotes] = useState("");
  const [compatiblePairings, setCompatiblePairings] = useState<any[]>([]);
  const shiftHoursInput = "7"; // Jam kerja shift tetap 7 jam efektif (tidak bisa diubah)

  // Capacity simulation history logs
  const [capacityLogs, setCapacityLogs] = useState<CapacityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // ─── Fetch All Initial Data ───────────────────────────────────────────────
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Order Sheets
      const osRes = await api.express.get("/order-sheets").catch(() => null);
      if (osRes && osRes.data && osRes.data.success) {
        const osList = osRes.data.data;
        const osDetailed = await Promise.all(
          osList.map(async (os: any) => {
            try {
              const detailRes = await api.express.get(`/order-sheets/${os.id}`);
              return detailRes.data.data;
            } catch {
              return os;
            }
          })
        );
        setOrderSheets(osDetailed);
      }

      // 1b. Fetch Customer POs, Forecasts, and Products
      const [poRes, fcRes, prodRes] = await Promise.all([
        api.express.get("/customer-po", { params: { limit: 999 } }).catch(() => null),
        api.express.get("/forecasts", { params: { limit: 999 } }).catch(() => null),
        api.express.get("/products", { params: { limit: 999 } }).catch(() => null)
      ]);
      if (poRes && poRes.data) setCustomerPOs(poRes.data.data || poRes.data || []);
      if (fcRes && fcRes.data) setForecasts(fcRes.data.data || fcRes.data || []);
      if (prodRes && prodRes.data) setAllProducts(prodRes.data.data || prodRes.data || []);

      // 1c. Fetch Karyawan / Users for operator dropdown
      const karyawanRes = await api.express.get("/manufacturing/karyawan").catch(() => null);
      if (karyawanRes && karyawanRes.data && karyawanRes.data.success) {
        setKaryawanList(karyawanRes.data.data || []);
      }

      // 2. Fetch Molds
      const moldRes = await api.express.get("/manufacturing/molds").catch(() => null);
      if (moldRes && moldRes.data && moldRes.data.success) {
        setMolds(moldRes.data.data);
      }

      // 3. Fetch Machines from Database
      const machRes = await api.express.get("/manufacturing/machines").catch(() => null);
      if (machRes && machRes.data && machRes.data.success) {
        setMachines(machRes.data.data);
      }

      // 4. Fetch Planning Produksi (PrO)
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
          operatorLead: p.operator_lead || "-",
          operatorName: p.operator_name || "-",
          targetQty: Number(p.target_qty || 0),
          actualQty: Number(p.actual_qty || 0),
          startDate: p.start_date,
          endDate: p.end_date,
          shift: `Shift ${p.shift}`,
          shiftHours: Number(p.shift_hours || 7),
          uphUsed: p.uph_used,
          status: p.status,
          moldId: p.mold_id,
          moldCode: p.mold_code,
          moldName: p.mold_name,
          lineSpeed: p.uph_used ? `${p.uph_used} Pcs/Jam` : "100 Pcs/Jam"
        }));
        setPlans(mapped);
      }
    } catch (err) {
      console.error("Error loading planning data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch simulation logs history
  const fetchCapacityLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.express.get("/manufacturing/capacity-logs").catch(() => null);
      if (res && res.data && res.data.success) {
        setCapacityLogs(res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching capacity logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Handler for PO selection with automatic single-item selection
  const handleSelectPo = async (poId: string) => {
    setSelectedPoId(poId);
    setSelectedProductId("");
    setSelectedMoldId("");
    setMachineCode("");
    setCompatiblePairings([]);
    setActiveUph(0);
    setUphFound(false);
    setPoItems([]);

    if (!poId) return;

    setLoadingItems(true);
    try {
      const res = await api.express.get(`/customer-po/${poId}`);
      if (res?.data?.success && res.data.data?.details) {
        const items = res.data.data.details || [];
        setPoItems(items);
        if (items.length === 1) {
          const singleProdId = String(items[0].product_id);
          setSelectedProductId(singleProdId);
          fetchCompatiblePairings(singleProdId);
        }
      }
    } catch (err) {
      console.error("Error fetching PO details:", err);
    } finally {
      setLoadingItems(false);
    }
  };

  // Handler for Forecast selection with automatic single-item selection
  const handleSelectForecast = async (fcId: string) => {
    setSelectedForecastId(fcId);
    setSelectedProductId("");
    setSelectedMoldId("");
    setMachineCode("");
    setCompatiblePairings([]);
    setActiveUph(0);
    setUphFound(false);
    setForecastItems([]);

    if (!fcId) return;

    setLoadingItems(true);
    try {
      const res = await api.express.get(`/forecasts/${fcId}`);
      if (res?.data?.success && res.data.data?.details) {
        const items = res.data.data.details || [];
        setForecastItems(items);
        if (items.length === 1) {
          const singleProdId = String(items[0].product_id);
          setSelectedProductId(singleProdId);
          fetchCompatiblePairings(singleProdId);
        }
      }
    } catch (err) {
      console.error("Error fetching forecast details:", err);
    } finally {
      setLoadingItems(false);
    }
  };

  // Handler for Product selection
  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    fetchCompatiblePairings(prodId);
  };

  // Lookup mold, mesin, & UPH yang kompatibel saat item produk dipilih
  const fetchCompatiblePairings = async (productId: string) => {
    if (!productId) {
      setCompatiblePairings([]);
      setSelectedMoldId("");
      setMachineCode("");
      setActiveUph(0);
      setUphFound(false);
      return;
    }
    setUphLoading(true);
    try {
      const res = await api.express.get(`/manufacturing/products-lookup?productId=${productId}`).catch(() => null);
      if (res && res.data && res.data.success) {
        const data = res.data.data || [];
        setCompatiblePairings(data);
        if (data.length > 0) {
          // Otomatis isi mold dan mesin berdasarkan data pairing primer
          setSelectedMoldId(data[0].mold_id.toString());
          setMachineCode(data[0].machine_code);
          const uphVal = Number(data[0].uph) || 100;
          setActiveUph(uphVal);
          setUphFound(true);
          // Target Qty otomatis berdasarkan UPH * 7 jam shift kerja tetap
          setTargetQty(uphVal * 7);
        } else {
          setSelectedMoldId("");
          setMachineCode("");
          setActiveUph(0);
          setUphFound(false);
          setTargetQty(100 * 7);
        }
      } else {
        setCompatiblePairings([]);
      }
    } catch (err) {
      console.error("Error fetching compatible pairings:", err);
      setCompatiblePairings([]);
    } finally {
      setUphLoading(false);
    }
  };

  useEffect(() => {
    if (view === "list") {
      fetchCapacityLogs();
    }
  }, [view]);

  // Real-time UPH lookup ketika user mengganti mold / mesin secara manual
  useEffect(() => {
    const fetchUphLookup = async () => {
      if (machineCode && selectedMoldId) {
        setUphLoading(true);
        try {
          const res = await api.express.get(`/manufacturing/uph-lookup?machineCode=${machineCode}&moldId=${selectedMoldId}`).catch(() => null);
          if (res && res.data && res.data.success && res.data.data) {
            const uphVal = Number(res.data.data.uph) || 100;
            setActiveUph(uphVal);
            setUphFound(true);
            setTargetQty(uphVal * 7);
          } else {
            setActiveUph(0);
            setUphFound(false);
          }
        } catch (err) {
          console.error("Error looking up UPH:", err);
          setActiveUph(0);
          setUphFound(false);
        } finally {
          setUphLoading(false);
        }
      } else {
        setActiveUph(0);
        setUphFound(false);
      }
    };
    fetchUphLookup();
  }, [machineCode, selectedMoldId]);

  // Load outputs history when a plan is selected
  useEffect(() => {
    if (selectedPlan) {
      setLoadingOutputs(true);
      api.express.get("/manufacturing/production-outputs")
        .then(res => {
          if (res.data && res.data.success) {
            const filtered = res.data.data.filter((po: any) => Number(po.pro_id) === Number(selectedPlan.id));
            setProOutputLogs(filtered);
          }
        })
        .catch(err => {
          console.error("Error loading outputs logs for selected PrO:", err);
        })
        .finally(() => {
          setLoadingOutputs(false);
        });
    } else {
      setProOutputLogs([]);
    }
  }, [selectedPlan]);

  // Selected Order Sheet Item Details List
  const selectedOs = orderSheets.find(o => String(o.id) === String(selectedOsId));
  const osItems = selectedOs?.details || [];

  // Computed simulation targets
  const simShift1Target = activeUph * Number(shift1Hours || 0);
  const simShift2Target = activeUph * Number(shift2Hours || 0);
  const simShift3Target = activeUph * Number(shift3Hours || 0);
  const simDailyTarget = simShift1Target + simShift2Target + simShift3Target;
  const simMonthlyTarget = simDailyTarget * Number(simWorkingDays || 0);

  // Save simulator log history
  const handleSaveSimulation = async () => {
    if (!machineCode || !selectedMoldId || activeUph === 0) {
      alert("Pilih mesin, mold, dan pastikan UPH terisi.");
      return;
    }
    const mach = machines.find(m => m.code === machineCode);
    if (!mach) {
      alert("Mesin tidak ditemukan.");
      return;
    }

    const payload = {
      date: new Date().toISOString().substring(0, 10),
      machine_id: mach.id,
      mold_id: Number(selectedMoldId),
      uph: activeUph,
      shift_1_hours: Number(shift1Hours || 0),
      shift_2_hours: Number(shift2Hours || 0),
      shift_3_hours: Number(shift3Hours || 0),
      shift_1_target: simShift1Target,
      shift_2_target: simShift2Target,
      shift_3_target: simShift3Target,
      working_days: Number(simWorkingDays || 25),
      daily_target: simDailyTarget,
      monthly_target: simMonthlyTarget,
      notes: simNotes
    };

    try {
      const res = await api.express.post("/manufacturing/capacity-logs", payload);
      if (res && res.data && res.data.success) {
        alert("Simulasi kapasitas produksi berhasil disimpan ke riwayat!");
        setSimNotes("");
        fetchCapacityLogs();
      }
    } catch (err: any) {
      console.error("Error saving capacity simulation:", err);
      alert(err.response?.data?.message || err.message || "Gagal menyimpan simulasi.");
    }
  };

  // ─── Save Planning Produksi (PrO) ──────────────────────────────────────────
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !machineCode || !operatorLead || !operatorName || !selectedMoldId) {
      alert("Mohon lengkapi data Rencana Produksi (Produk, Mold, Mesin, Operator Lead, & Operator Pelaksana).");
      return;
    }

    const payload = {
      order_sheet_id: null,
      product_id: Number(selectedProductId),
      mold_id: Number(selectedMoldId),
      machine_id: machineCode,
      operator_lead: operatorLead.trim(),
      operator_name: operatorName.trim(),
      shift: shift === "Shift 1" ? 1 : shift === "Shift 2" ? 2 : 3,
      shift_hours: 7, // Terkunci otomatis 7 jam per shift
      uph_used: activeUph || null,
      downtime_reason: downtimeReason || null,
      target_qty: Number(targetQty),
      start_date: startDate,
      end_date: endDate,
      note
    };

    try {
      const res = await api.express.post("/manufacturing/planning-produksi", payload);
      if (res && res.data && res.data.success) {
        alert(`MPP (PrO) ${res.data.pro_code} berhasil dibuat!`);
        setIsModalOpen(false);
        // Reset Form
        setSelectedOsId("");
        setSelectedPoId("");
        setSelectedForecastId("");
        setSelectedProductId("");
        setSelectedMoldId("");
        setMachineCode("");
        setOperatorLead("");
        setOperatorName("");
        setLeadSearchQuery("");
        setOpSearchQuery("");
        setPoItems([]);
        setForecastItems([]);
        setTargetQty(700);
        setNote("");
        setDowntimeReason("");
        setActiveUph(0);
        setUphFound(false);
        setShowCalculator(false);
        fetchAllData();
      }
    } catch (err: any) {
      console.error("Save Error:", err);
      alert(err.response?.data?.message || err.message || "Gagal menyimpan Rencana Produksi");
    }
  };

  // ─── Edit Planning Produksi (PrO) ──────────────────────────────────────────
  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    const payload = {
      operator_lead: editOperatorLead.trim(),
      operator_name: editOperatorName.trim(),
      shift: editShift === "Shift 1" ? 1 : editShift === "Shift 2" ? 2 : 3,
      shift_hours: 7,
      downtime_reason: editDowntimeReason || null,
      target_qty: Number(editTargetQty),
      machine_id: editMachineId,
      mold_id: Number(editMoldId),
      status: editStatus
    };

    try {
      const res = await api.express.put(`/manufacturing/planning-produksi/${editingPlan.id}`, payload);
      if (res && res.data && res.data.success) {
        alert("MPP berhasil diperbarui!");
        setIsEditModalOpen(false);
        setEditingPlan(null);
        fetchAllData();
      }
    } catch (err: any) {
      console.error("Update Error:", err);
      alert(err.response?.data?.message || err.message || "Gagal memperbarui MPP");
    }
  };

  // ─── Delete Planning Produksi (PrO) ──────────────────────────────────────────
  const handleDeletePlan = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus Rencana Produksi (MPP) ini?")) return;
    try {
      const res = await api.express.delete(`/manufacturing/planning-produksi/${id}`);
      if (res && res.data && res.data.success) {
        alert("Rencana produksi berhasil dihapus!");
        setSelectedPlan(null);
        fetchAllData();
      }
    } catch (err: any) {
      console.error("Error deleting plan:", err);
      alert(err.response?.data?.message || err.message || "Gagal menghapus rencana produksi");
    }
  };

  // Open Edit Modal Form
  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setEditOperatorLead(plan.operatorLead || "");
    setEditOperatorName(plan.operatorName || "");
    setEditLeadSearchQuery(plan.operatorLead || "");
    setEditOpSearchQuery(plan.operatorName || "");
    setEditShift(plan.shift);
    setEditTargetQty(plan.targetQty);
    setEditMachineId(plan.machineCode);
    setEditMoldId(plan.moldId ? String(plan.moldId) : "");
    setEditStatus(plan.status);
    setIsEditModalOpen(true);
  };

  // Handle Print SPK
  const handlePrintPlan = (plan: Plan) => {
    const printWindow = window.open("", "_blank", "width=900,height=800");
    if (!printWindow) return;
    const htmlContent = `
      <html>
        <head>
          <title>SPK Produksi - ${plan.proCode}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px double #cbd5e1; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
            .code { font-size: 16px; font-weight: bold; color: #64748b; margin-top: 5px; }
            .logo { font-size: 28px; font-weight: 900; color: #10b981; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 40px; }
            .item { border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; }
            .label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; }
            .value { font-size: 14px; font-weight: bold; color: #0f172a; margin-top: 4px; }
            .footer { margin-top: 60px; text-align: center; font-size: 10px; color: #94a3b8; font-weight: bold; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <div>
              <div class="title">SURAT PERINTAH KERJA (SPK)</div>
              <div class="code">${plan.proCode}</div>
            </div>
            <div class="logo">PT ERAN PLASTINDO UTAMA</div>
          </div>
          <div class="grid">
            <div class="item"><div class="label">Produk Target</div><div class="value">${plan.productName} (${plan.productCode})</div></div>
            <div class="item"><div class="label">Mesin Produksi</div><div class="value">${plan.machineName} (${plan.machineCode})</div></div>
            <div class="item"><div class="label">Mold / Cetakan</div><div class="value">${plan.moldName || plan.moldCode || "-"}</div></div>
            <div class="item"><div class="label">Nama Operator Lead</div><div class="value">${plan.operatorLead || "-"}</div></div>
            <div class="item"><div class="label">Operator Pelaksana</div><div class="value">${plan.operatorName || "-"}</div></div>
            <div class="item"><div class="label">Shift / Jam Kerja</div><div class="value">${plan.shift} (7 Jam)</div></div>
            <div class="item"><div class="label">Target Qty Produksi</div><div class="value">${plan.targetQty.toLocaleString()} Pcs</div></div>
            <div class="item"><div class="label">Timeframe Pelaksanaan</div><div class="value">${plan.startDate} s/d ${plan.endDate}</div></div>
          </div>
          <div class="footer">PT Eran Plastindo Utama - Sistem Informasi Manufaktur &copy; 2026</div>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Real-time timeline calculations
  const totalTarget = plans.reduce((sum, p) => sum + p.targetQty, 0);
  const totalActual = plans.reduce((sum, p) => sum + p.actualQty, 0);
  const progressPercent = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
  const planCompleted = plans.filter(p => p.status === "Selesai" || p.status === "Selesai / Done").length;
  const planRunning = plans.filter(p => p.status === "Berjalan" || p.status === "Dalam Produksi").length;
  const planScheduled = plans.filter(p => p.status === "Rencana" || p.status === "Menunggu WO").length;

  // Generate Timeline Dates (Fixed monthly view)
  const getTimelineDates = () => {
    const dates = [];
    const daysInMonth = new Date(timelineYear, timelineMonth, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateString = `${timelineYear}-${String(timelineMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dObj = new Date(timelineYear, timelineMonth - 1, d);
      const label = dObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      const dayName = dObj.toLocaleDateString("id-ID", { weekday: "short" });
      dates.push({ dateString, label, dayName });
    }
    return dates;
  };

  const timelineDates = getTimelineDates();

  const getPlanForMachineOnDate = (mCode: string, dateStr: string) => {
    return plans.find(p => {
      if (p.machineCode !== mCode) return false;
      const start = new Date(p.startDate);
      const end = new Date(p.endDate);
      const current = new Date(dateStr);

      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      current.setHours(12,0,0,0);

      return current >= start && current <= end;
    });
  };

  const filteredMoldsForDropdown = compatiblePairings.length > 0
    ? molds.filter(m => compatiblePairings.some(cp => cp.mold_id === m.id))
    : molds;

  const filteredMachinesForDropdown = compatiblePairings.length > 0
    ? machines.filter(mac => compatiblePairings.some(cp => cp.machine_code === mac.code))
    : machines;

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
              <CalendarDays className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              MPP <span className="text-emerald-600">(Master Production Plan)</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Tarik data dari PO Customer atau Sales Forecast, jadwalkan pencetakan mesin injection molding, alokasikan cetakan (mold), operator lead & pelaksana, serta shift kerja.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Tab Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setView("timeline")}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                view === "timeline" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-700"
              }`}
            >
              Jadwal Induk Produksi
            </button>
            <button
              onClick={() => setView("balance")}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                view === "balance" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-700"
              }`}
            >
              Perimbangan Demand & Stok FG
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                view === "list" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-700"
              }`}
            >
              Simulasi Kapasitas UPH
            </button>
          </div>

          <button
            onClick={() => {
              setDemandSource("customer_po");
              setSelectedPoId("");
              setSelectedForecastId("");
              setSelectedProductId("");
              setSelectedMoldId("");
              setMachineCode("");
              setOperatorLead("");
              setOperatorName("");
              setPoItems([]);
              setForecastItems([]);
              setTargetQty(700);
              setActiveUph(0);
              setUphFound(false);
              setCompatiblePairings([]);
              setIsModalOpen(true);
            }}
            className="group flex items-center gap-3 bg-gray-950 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-100 active:scale-95 overflow-hidden"
          >
            <Plus size={20} strokeWidth={3} />
            <span>Buat MPP</span>
          </button>
        </div>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total MPP Aktif</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><Activity size={18} /></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-950">{plans.length}</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              <span className="font-bold text-blue-600">{planRunning} Running</span> • <span className="font-bold text-amber-500">{planScheduled} Scheduled</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Completion Rate</span>
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><CheckCircle2 size={18} /></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-950">
              {plans.length > 0 ? Math.round((planCompleted / plans.length) * 100) : 0}%
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              <span className="font-bold text-emerald-600">{planCompleted} Selesai</span> dari total {plans.length} rencana
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target VS Realisasi</span>
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600"><BarChart3 size={18} /></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <h3 className="text-xl font-black text-gray-950">{totalActual.toLocaleString()}</h3>
              <span className="text-xs text-gray-400 font-bold">/ {totalTarget.toLocaleString()} Pcs</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="bg-purple-600 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">OEE Rata-rata</span>
            <div className="p-2 bg-orange-50 rounded-xl text-orange-600"><Sliders size={18} /></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-950">84.5%</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Rata-rata utilitas mesin injection hari ini
            </p>
          </div>
        </div>
      </div>

      {/* ─── VIEW 1: TIMELINE JADWAL ────────────────────────────────────────── */}
      {view === "timeline" && (
        <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <Calendar className="text-emerald-600" size={18} />
              <h3 className="font-black text-gray-800 uppercase tracking-widest text-xs">
                Timeline Penjadwalan Mesin Produksi
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={timelineMonth}
                onChange={(e) => setTimelineMonth(Number(e.target.value))}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-black bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((mName, i) => (
                  <option key={i} value={i + 1}>{mName}</option>
                ))}
              </select>
              <input
                type="number"
                value={timelineYear}
                onChange={(e) => setTimelineYear(Number(e.target.value))}
                className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-xs font-black text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-max">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest w-48 text-left sticky left-0 bg-gray-50 z-10 border-r border-gray-100">
                      Mesin / Line
                    </th>
                    {timelineDates.map((d, index) => (
                      <th key={index} className="px-2 py-3 text-[9px] font-black text-center w-24 border-r border-gray-100">
                        <div className="text-gray-400 uppercase">{d.dayName}</div>
                        <div className="text-gray-700 text-xs mt-0.5">{d.label}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {machines.map((machine, machIdx) => (
                    <tr key={machine.code} className="hover:bg-slate-50/50">
                      <td className="px-4 py-4 font-bold text-xs text-gray-700 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                        <p className="font-extrabold text-gray-900">{machine.name}</p>
                        <p className="text-[9px] text-gray-400 uppercase font-black tracking-wider mt-0.5">{machine.code}</p>
                      </td>
                      
                      {timelineDates.map((d, idx) => {
                        const plan = getPlanForMachineOnDate(machine.code, d.dateString);
                        
                        return (
                          <td key={idx} className="p-1 border-r border-gray-100 text-center align-middle h-16 w-24 relative group/cell hover:z-30">
                            {plan ? (
                              <div 
                                className={`h-full w-full rounded-xl p-1.5 flex flex-col justify-between text-left transition-all hover:scale-[1.02] shadow-sm select-none cursor-pointer ${
                                  plan.status === "Selesai" || plan.status === "Selesai / Done"
                                    ? "bg-emerald-500 text-white" 
                                    : plan.status === "Berjalan" || plan.status === "Dalam Produksi"
                                      ? "bg-blue-500 text-white animate-pulse" 
                                      : "bg-amber-400 text-gray-950"
                                }`}
                                onClick={() => router.push(`/manufacturing/mpp/${plan.id}`)}
                              >
                                <span className="text-[8px] font-black uppercase tracking-wider block truncate">
                                  {plan.proCode}
                                </span>
                                <span className="text-[9px] font-bold block truncate leading-tight">
                                  {plan.productCode}
                                </span>
                                <span className="text-[8px] font-black opacity-80 block truncate">
                                  {plan.moldCode || "No Mold"}
                                </span>
                              </div>
                            ) : (
                              <div className="h-full w-full border border-dashed border-gray-100 rounded-xl flex items-center justify-center text-[9px] text-gray-200">
                                Idle
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── VIEW 2: RIWAYAT SIMULASI KAPASITAS ──────────────────────────────── */}
      {view === "list" && (
        <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm p-6 space-y-6">
          <div className="mb-4">
            <h3 className="font-black text-gray-900 text-lg">Riwayat Simulasi Kapasitas Produksi</h3>
            <p className="text-xs text-gray-400 font-bold mt-0.5">Daftar estimasi output target berdasarkan jam shift dan UPH yang telah disimpan</p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-gray-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  <th className="px-6 py-4">Tanggal / Waktu</th>
                  <th className="px-6 py-4">Mesin & Mold</th>
                  <th className="px-6 py-4 text-center">UPH</th>
                  <th className="px-6 py-4 text-center">Durasi Kerja Shift</th>
                  <th className="px-6 py-4 text-center">Target Harian</th>
                  <th className="px-6 py-4 text-center">Hari Kerja</th>
                  <th className="px-6 py-4 text-center">Target Bulanan</th>
                  <th className="px-6 py-4">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-700">
                {loadingLogs ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={8} className="px-6 py-6"><div className="h-10 bg-gray-50 rounded-xl w-full" /></td>
                    </tr>
                  ))
                ) : capacityLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400 font-bold uppercase">Belum ada riwayat simulasi yang disimpan.</td>
                  </tr>
                ) : (
                  capacityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{log.date}</p>
                        <p className="text-[8px] text-gray-400 font-bold mt-0.5">
                          {new Date(log.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-emerald-600">{log.machine_name} ({log.machine_code})</p>
                        <p className="text-[10px] text-gray-500 font-medium mt-0.5">Mold: {log.mold_name} ({log.mold_code})</p>
                      </td>
                      <td className="px-6 py-4 text-center font-black text-gray-900 tabular-nums">
                        {log.uph}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-500">
                        <div className="flex gap-2 justify-center text-[10px]">
                          <span className="px-2 py-0.5 bg-gray-100 rounded">S1: {log.shift_1_hours}j</span>
                          <span className="px-2 py-0.5 bg-gray-100 rounded">S2: {log.shift_2_hours}j</span>
                          <span className="px-2 py-0.5 bg-gray-100 rounded">S3: {log.shift_3_hours}j</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-black text-blue-600 tabular-nums">
                        {log.daily_target.toLocaleString()} Pcs
                      </td>
                      <td className="px-6 py-4 text-center tabular-nums font-bold">
                        {log.working_days} hari
                      </td>
                      <td className="px-6 py-4 text-center font-black text-indigo-600 tabular-nums">
                        {log.monthly_target.toLocaleString()} Pcs
                      </td>
                      <td className="px-6 py-4 text-gray-500 max-w-[200px] truncate">
                        {log.notes || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: DEMAND & INVENTORY BALANCE TAB */}
      {view === "balance" && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-black text-gray-950 flex items-center gap-2">
                <BarChart3 className="text-emerald-600" size={22} />
                Perimbangan Demand & Stok Barang Jadi (FG Balance)
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Kalkulasi perbandingan antara Demand (PO/Forecast) vs Stok Gudang FG (STO) untuk menentukan kebutuhan Rencana Produksi (MPP).
              </p>
            </div>
            <button
              onClick={() => {
                setDemandSource("customer_po");
                setSelectedPoId("");
                setSelectedProductId("");
                setIsModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
            >
              <Plus size={14} /> + Buat MPP dari Demand
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-gray-200 font-extrabold text-gray-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3 text-center">No</th>
                  <th className="px-6 py-3">Produk FG</th>
                  <th className="px-6 py-3 text-right">PO Qty</th>
                  <th className="px-6 py-3 text-right">Forecast Qty</th>
                  <th className="px-6 py-3 text-right">Stok FG (STO)</th>
                  <th className="px-6 py-3 text-right">Terjadwal MPP</th>
                  <th className="px-6 py-3 text-center">Status Supply</th>
                  <th className="px-6 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allProducts.map((prod, idx) => {
                  const poQty = customerPOs.reduce((acc, po) => {
                    const details = po.details || po.items || [];
                    const item = details.find((d: any) => Number(d.product_id) === Number(prod.id));
                    return acc + (item ? Number(item.po_qty || item.quantity || 0) : 0);
                  }, 0);

                  const fcQty = forecasts.reduce((acc, fc) => {
                    const details = fc.details || fc.items || [];
                    const item = details.find((d: any) => Number(d.product_id) === Number(prod.id));
                    return acc + (item ? Number(item.forecast_qty || item.quantity || 0) : 0);
                  }, 0);

                  const scheduledMpp = plans.filter(p => p.productCode === prod.product_code).reduce((acc, p) => acc + p.targetQty, 0);

                  const currentSto = Number(prod.qty_stock || prod.stock || 0);
                  const totalDemand = poQty + fcQty;
                  const netNeed = Math.max(0, totalDemand - currentSto);
                  const isShortage = scheduledMpp < netNeed;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-gray-400 font-mono text-center">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{prod.product_name}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{prod.product_code}</p>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-blue-600">{poQty.toLocaleString()} Pcs</td>
                      <td className="px-6 py-4 text-right font-bold text-indigo-600">{fcQty.toLocaleString()} Pcs</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-700">{currentSto.toLocaleString()} Pcs</td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600">{scheduledMpp.toLocaleString()} Pcs</td>
                      <td className="px-6 py-4 text-center">
                        {isShortage ? (
                          <span className="px-3 py-1 bg-rose-50 text-rose-600 font-extrabold rounded-full text-[10px]">
                            Kurang {(netNeed - scheduledMpp).toLocaleString()} Pcs
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 font-extrabold rounded-full text-[10px]">
                            Aman / Cukup
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setDemandSource("manual");
                            setSelectedProductId(String(prod.id));
                            fetchCompatiblePairings(String(prod.id));
                            setIsModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-all"
                        >
                          + Jadwalkan MPP
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE PLAN MODAL (Buat MPP) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl border border-gray-100 shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CalendarDays size={20} />
                </div>
                <div>
                <h3 className="text-xl font-black text-gray-900">Buat Jadwal Rencana Produksi (PrO)</h3>
                <p className="text-xs text-gray-400 font-bold mt-0.5">Alokasikan cetakan (mold), mesin, operator lead, dan operator pelaksana dari PO Customer / Sales Forecast</p>
              </div>
            </div>
            <button 
              onClick={() => { setIsModalOpen(false); setShowCalculator(false); }}
              className="text-gray-400 hover:text-gray-600 font-bold"
            >
              [X]
            </button>
          </div>

          <form onSubmit={handleCreatePlan} className="space-y-6">
            
            {/* Sumber Demand Picker (Tanpa Order Sheet) */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Sumber Perencanaan (Demand Source)</label>
              <div className={`grid ${isForecastEnabled ? "grid-cols-3" : "grid-cols-2"} gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-150`}>
                <button
                  type="button"
                  onClick={() => {
                    setDemandSource("customer_po");
                    setSelectedPoId("");
                    setSelectedProductId("");
                    setSelectedMoldId("");
                    setMachineCode("");
                    setPoItems([]);
                    setActiveUph(0);
                    setUphFound(false);
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${demandSource === "customer_po" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                >
                  PO Customer
                </button>
                {isForecastEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      setDemandSource("forecast");
                      setSelectedForecastId("");
                      setSelectedProductId("");
                      setSelectedMoldId("");
                      setMachineCode("");
                      setForecastItems([]);
                      setActiveUph(0);
                      setUphFound(false);
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${demandSource === "forecast" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                  >
                    Sales Forecast
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDemandSource("manual");
                    setSelectedProductId("");
                    setSelectedMoldId("");
                    setMachineCode("");
                    setActiveUph(0);
                    setUphFound(false);
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${demandSource === "manual" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                >
                  Manual Input
                </button>
              </div>
            </div>

            {/* PO / Forecast Selection & Item FG Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {demandSource === "customer_po" && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Referensi PO Customer</label>
                  <select
                    value={selectedPoId}
                    onChange={(e) => handleSelectPo(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all appearance-none h-12"
                  >
                    <option value="">-- Pilih PO Customer --</option>
                    {customerPOs.map((po: any) => (
                      <option key={po.id} value={po.id}>
                        {po.no_po_customer || po.reference} {po.customer_name ? `(${po.customer_name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {demandSource === "forecast" && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Referensi Sales Forecast</label>
                  <select
                    value={selectedForecastId}
                    onChange={(e) => handleSelectForecast(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all appearance-none h-12"
                  >
                    <option value="">-- Pilih Sales Forecast --</option>
                    {forecasts.map((fc: any) => (
                      <option key={fc.id} value={fc.id}>
                        {fc.reference || fc.code || `FC-${fc.id}`} {fc.period || fc.customer_name ? `(${fc.customer_name || fc.period})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={`space-y-2 ${demandSource === "manual" ? "md:col-span-2" : ""}`}>
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Item Produk (Finished Good)</label>
                  {loadingItems && (
                    <span className="text-[10px] text-emerald-600 font-bold animate-pulse">Memuat item...</span>
                  )}
                </div>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleSelectProduct(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all appearance-none h-12"
                >
                  <option value="">-- Pilih Barang Jadi (FG) --</option>
                  {demandSource === "customer_po" ? (
                    poItems.length === 0 ? (
                      <option value="" disabled>-- Pilih PO Customer terlebih dahulu --</option>
                    ) : (
                      poItems.map(item => (
                        <option key={item.id} value={item.product_id}>
                          {item.product_name} ({item.product_code}) - PO: {item.po_qty} {item.product_unit}
                        </option>
                      ))
                    )
                  ) : demandSource === "forecast" ? (
                    forecastItems.length === 0 ? (
                      <option value="" disabled>-- Pilih Sales Forecast terlebih dahulu --</option>
                    ) : (
                      forecastItems.map(item => (
                        <option key={item.id} value={item.product_id}>
                          {item.product_name} ({item.product_code}) - Forecast: {item.forecast_qty} {item.product_unit}
                        </option>
                      ))
                    )
                  ) : (
                    allProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.product_name} ({p.product_code})
                      </option>
                    ))
                  )}
                </select>

              </div>
            </div>

            {/* Mold & Machine (Otomatis Terisi & Menyesuaikan Data Mold/Mesin) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Pilih Mold (Cetakan)</label>
                <select
                  value={selectedMoldId}
                  onChange={(e) => setSelectedMoldId(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all appearance-none h-12"
                >
                  <option value="">-- Pilih Mold --</option>
                  {filteredMoldsForDropdown.map(m => (
                    <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Alokasi Mesin Injection</label>
                <select
                  value={machineCode}
                  onChange={(e) => setMachineCode(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all appearance-none h-12"
                >
                  <option value="">-- Pilih Mesin --</option>
                  {filteredMachinesForDropdown.map(m => (
                    <option key={m.code} value={m.code}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Real-time UPH Indicator & Capacity Calculator Trigger */}
            {(machineCode && selectedMoldId) && (
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Timer className="text-emerald-600" size={16} />
                    <span className="text-xs font-black text-gray-800 uppercase tracking-wider">Deteksi UPH Mesin-Mold</span>
                  </div>
                  {uphLoading ? (
                    <span className="text-xs text-gray-400 animate-pulse font-bold">Mencari...</span>
                  ) : uphFound ? (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full uppercase tracking-wider">
                      UPH Terdeteksi: {activeUph} Pcs/Jam
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full uppercase tracking-wider">
                      Belum diset (Default: 100 Pcs/Jam)
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                  Sistem mendeteksi kombinasi mesin <strong className="text-gray-700">{machineCode}</strong> dengan mold terpilih menghasilkan output nominal <strong className="text-gray-700">{uphFound ? activeUph : 100} unit/jam</strong>. Target produksi shift otomatis dihitung: <strong className="text-emerald-700">{(uphFound ? activeUph : 100) * 7} Pcs</strong> (7 Jam Kerja).
                </p>

                <button
                  type="button"
                  onClick={() => {
                    if (!uphFound) {
                      setActiveUph(100);
                    }
                    setShowCalculator(!showCalculator);
                  }}
                  className="flex items-center gap-1.5 text-xs font-black text-emerald-600 hover:text-emerald-800 transition-colors uppercase tracking-widest"
                >
                  <Calculator size={14} /> {showCalculator ? "Sembunyikan" : "Buka"} Kalkulator Kapasitas & Jam Shift
                </button>

                {/* CAPACITY SIMULATOR CARD */}
                {showCalculator && (
                  <div className="bg-white border border-gray-150 p-5 rounded-2xl space-y-4 animate-in slide-in-from-top-4 duration-200 mt-2">
                    <div className="flex items-center gap-1.5 border-b border-gray-100 pb-2">
                      <Sliders size={14} className="text-emerald-500" />
                      <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">Simulasi Jam Kerja Shift Efektif</h4>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs font-bold text-gray-600">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Shift 1 (jam)</label>
                        <input type="number" step="0.5" min="0" max="24" value={shift1Hours} onChange={e => setShift1Hours(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none" />
                        <span className="text-[9px] text-gray-400 font-medium">Est: {simShift1Target.toLocaleString()} pcs</span>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Shift 2 (jam)</label>
                        <input type="number" step="0.5" min="0" max="24" value={shift2Hours} onChange={e => setShift2Hours(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none" />
                        <span className="text-[9px] text-gray-400 font-medium">Est: {simShift2Target.toLocaleString()} pcs</span>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Shift 3 (jam)</label>
                        <input type="number" step="0.5" min="0" max="24" value={shift3Hours} onChange={e => setShift3Hours(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none" />
                        <span className="text-[9px] text-gray-400 font-medium">Est: {simShift3Target.toLocaleString()} pcs</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-xs">Hari Kerja / Bulan</label>
                        <input type="number" min="1" max="31" value={simWorkingDays} onChange={e => setSimWorkingDays(e.target.value)} className="px-3 py-2 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-xs">Catatan Simulasi</label>
                        <input type="text" placeholder="Notes (misal: mesin trouble)" value={simNotes} onChange={e => setSimNotes(e.target.value)} className="px-3 py-2 bg-gray-50 border-none rounded-xl text-xs font-medium outline-none" />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50 flex justify-between items-center text-xs">
                      <div>
                        <p className="text-[9px] text-gray-400 font-black uppercase">Total Target Harian</p>
                        <p className="text-lg font-black text-blue-600 tabular-nums">{simDailyTarget.toLocaleString()} Pcs</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-gray-400 font-black uppercase">Estimasi Output Bulanan</p>
                        <p className="text-lg font-black text-indigo-600 tabular-nums">{simMonthlyTarget.toLocaleString()} Pcs</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setTargetQty(simDailyTarget)}
                        className="py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        Gunakan Target Harian
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetQty(simMonthlyTarget)}
                        className="py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        Gunakan Target Bulanan
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveSimulation}
                        className="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                      >
                        <History size={10} /> Simpan ke History
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Operator Lead & Operator yang Bekerja (Searchable Dropdown dari Data Karyawan) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* OPERATOR LEAD DROPDOWN SEARCH */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-700 uppercase tracking-widest flex items-center gap-1.5">
                  <User size={14} className="text-emerald-600" />
                  Nama Operator Lead (Leader Shift)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari nama leader / pengawas shift..."
                    value={leadSearchQuery || operatorLead}
                    onChange={(e) => {
                      setLeadSearchQuery(e.target.value);
                      setOperatorLead(e.target.value);
                      setShowLeadDropdown(true);
                    }}
                    onFocus={() => setShowLeadDropdown(true)}
                    onBlur={() => setTimeout(() => setShowLeadDropdown(false), 200)}
                    required={!operatorLead}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200/80 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white focus:border-emerald-400 transition-all h-12"
                  />
                  {showLeadDropdown && (
                    <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-2xl shadow-xl mt-1 max-h-48 overflow-y-auto">
                      {karyawanList
                        .filter(k => k.name.toLowerCase().includes((leadSearchQuery || operatorLead).toLowerCase()))
                        .map(k => (
                          <button
                            key={k.id}
                            type="button"
                            onMouseDown={() => {
                              setOperatorLead(k.name);
                              setLeadSearchQuery(k.name);
                              setShowLeadDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-800 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                          >
                            <span className="font-bold">{k.name}</span>
                            {k.department_name && <span className="text-gray-400 ml-2">· {k.department_name}</span>}
                          </button>
                        ))}
                      {karyawanList.filter(k => k.name.toLowerCase().includes((leadSearchQuery || operatorLead).toLowerCase())).length === 0 && (
                        <div className="px-4 py-3 text-xs text-gray-400 font-medium">Tidak ada hasil. Ketik manual untuk input bebas.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* OPERATOR PELAKSANA DROPDOWN SEARCH */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-700 uppercase tracking-widest flex items-center gap-1.5">
                  <User size={14} className="text-blue-600" />
                  Operator yang Bekerja (Pelaksana Mesin)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari nama operator pelaksana mesin..."
                    value={opSearchQuery || operatorName}
                    onChange={(e) => {
                      setOpSearchQuery(e.target.value);
                      setOperatorName(e.target.value);
                      setShowOpDropdown(true);
                    }}
                    onFocus={() => setShowOpDropdown(true)}
                    onBlur={() => setTimeout(() => setShowOpDropdown(false), 200)}
                    required={!operatorName}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200/80 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-400 transition-all h-12"
                  />
                  {showOpDropdown && (
                    <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-2xl shadow-xl mt-1 max-h-48 overflow-y-auto">
                      {karyawanList
                        .filter(k => k.name.toLowerCase().includes((opSearchQuery || operatorName).toLowerCase()))
                        .map(k => (
                          <button
                            key={k.id}
                            type="button"
                            onMouseDown={() => {
                              setOperatorName(k.name);
                              setOpSearchQuery(k.name);
                              setShowOpDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                          >
                            <span className="font-bold">{k.name}</span>
                            {k.department_name && <span className="text-gray-400 ml-2">· {k.department_name}</span>}
                          </button>
                        ))}
                      {karyawanList.filter(k => k.name.toLowerCase().includes((opSearchQuery || operatorName).toLowerCase())).length === 0 && (
                        <div className="px-4 py-3 text-xs text-gray-400 font-medium">Tidak ada hasil. Ketik manual untuk input bebas.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Jadwal Start - End Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all h-12"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all h-12"
                />
              </div>
            </div>

            {/* Shift, Jam Kerja (Terkunci 7 Jam), dan Target Qty Berdasarkan UPH */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Shift Produksi</label>
                <select
                  value={shift}
                  onChange={(e) => {
                    setShift(e.target.value);
                    const uphVal = uphFound ? activeUph : 100;
                    setTargetQty(uphVal * 7);
                  }}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all appearance-none h-12"
                >
                  <option value="Shift 1">Shift 1 (07:00 - 15:00)</option>
                  <option value="Shift 2">Shift 2 (15:00 - 23:00)</option>
                  <option value="Shift 3">Shift 3 (23:00 - 07:00)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <Lock size={12} className="text-amber-500" /> Jam Kerja Shift
                </label>
                <input
                  type="text"
                  value="7 Jam (Efektif)"
                  readOnly
                  disabled
                  className="w-full px-4 py-3 bg-gray-100 text-gray-600 font-extrabold border border-gray-200 rounded-2xl text-xs outline-none cursor-not-allowed h-12"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Target Qty (Pcs)</label>
                <input
                  type="number"
                  min={1}
                  value={targetQty}
                  onChange={(e) => setTargetQty(Number(e.target.value))}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-black text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all h-12"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Instruksi Spesifik</label>
                <input
                  type="text"
                  placeholder="Instruksi cetak..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-amber-600 uppercase tracking-widest">Catatan Kendala / Trouble Mesin (Opsional)</label>
              <input
                type="text"
                placeholder="Misal: Tunggu Material / Ganti Mold / Problem Box..."
                value={downtimeReason}
                onChange={(e) => setDowntimeReason(e.target.value)}
                className="w-full px-4 py-3 bg-amber-50/50 border border-amber-200/50 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500/20 focus:bg-white transition-all h-12"
              />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); setShowCalculator(false); }}
                className="px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-xs font-bold transition-all h-12"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all h-12 shadow-lg shadow-emerald-100"
              >
                Simpan Jadwal Produksi
              </button>
            </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PLAN MODAL */}
      {isEditModalOpen && editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl border border-gray-100 shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">Ubah Rencana MPP</h3>
                <p className="text-xs text-gray-400 font-bold mt-0.5">{editingPlan.proCode} · {editingPlan.productCode}</p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                [X]
              </button>
            </div>

            <form onSubmit={handleUpdatePlan} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* EDIT: Operator Lead Dropdown Search */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-700 uppercase tracking-widest">Nama Operator Lead</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editLeadSearchQuery || editOperatorLead}
                      onChange={(e) => { setEditLeadSearchQuery(e.target.value); setEditOperatorLead(e.target.value); setShowEditLeadDropdown(true); }}
                      onFocus={() => setShowEditLeadDropdown(true)}
                      onBlur={() => setTimeout(() => setShowEditLeadDropdown(false), 200)}
                      placeholder="Cari nama leader shift..."
                      required={!editOperatorLead}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white h-12"
                    />
                    {showEditLeadDropdown && (
                      <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-2xl shadow-xl mt-1 max-h-44 overflow-y-auto">
                        {karyawanList
                          .filter(k => k.name.toLowerCase().includes((editLeadSearchQuery || editOperatorLead).toLowerCase()))
                          .map(k => (
                            <button key={k.id} type="button"
                              onMouseDown={() => { setEditOperatorLead(k.name); setEditLeadSearchQuery(k.name); setShowEditLeadDropdown(false); }}
                              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-800 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                            >
                              <span className="font-bold">{k.name}</span>{k.department_name && <span className="text-gray-400 ml-2">· {k.department_name}</span>}
                            </button>
                          ))}
                        {karyawanList.filter(k => k.name.toLowerCase().includes((editLeadSearchQuery || editOperatorLead).toLowerCase())).length === 0 && (
                          <div className="px-4 py-3 text-xs text-gray-400">Tidak ada hasil.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* EDIT: Operator Pelaksana Dropdown Search */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-700 uppercase tracking-widest">Operator Pelaksana</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editOpSearchQuery || editOperatorName}
                      onChange={(e) => { setEditOpSearchQuery(e.target.value); setEditOperatorName(e.target.value); setShowEditOpDropdown(true); }}
                      onFocus={() => setShowEditOpDropdown(true)}
                      onBlur={() => setTimeout(() => setShowEditOpDropdown(false), 200)}
                      placeholder="Cari nama operator mesin..."
                      required={!editOperatorName}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white h-12"
                    />
                    {showEditOpDropdown && (
                      <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-2xl shadow-xl mt-1 max-h-44 overflow-y-auto">
                        {karyawanList
                          .filter(k => k.name.toLowerCase().includes((editOpSearchQuery || editOperatorName).toLowerCase()))
                          .map(k => (
                            <button key={k.id} type="button"
                              onMouseDown={() => { setEditOperatorName(k.name); setEditOpSearchQuery(k.name); setShowEditOpDropdown(false); }}
                              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                            >
                              <span className="font-bold">{k.name}</span>{k.department_name && <span className="text-gray-400 ml-2">· {k.department_name}</span>}
                            </button>
                          ))}
                        {karyawanList.filter(k => k.name.toLowerCase().includes((editOpSearchQuery || editOperatorName).toLowerCase())).length === 0 && (
                          <div className="px-4 py-3 text-xs text-gray-400">Tidak ada hasil.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Shift Kerja</label>
                  <select
                    value={editShift}
                    onChange={(e) => setEditShift(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold outline-none h-12"
                  >
                    <option value="Shift 1">Shift 1 (07:00 - 15:00)</option>
                    <option value="Shift 2">Shift 2 (15:00 - 23:00)</option>
                    <option value="Shift 3">Shift 3 (23:00 - 07:00)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <Lock size={12} className="text-amber-500" /> Jam Kerja (Terkunci)
                  </label>
                  <input
                    type="text"
                    value="7 Jam (Efektif)"
                    readOnly
                    disabled
                    className="w-full px-4 py-3 bg-gray-100 text-gray-600 font-extrabold border border-gray-200 rounded-2xl text-xs outline-none cursor-not-allowed h-12"
                  />
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
                    {machines.map(m => (
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
                    {molds.map(m => (
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
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all h-12 shadow-lg shadow-emerald-100"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MPP Details Side Panel */}
      {selectedPlan && (
        <div className="fixed inset-y-0 right-0 z-40 w-96 bg-white border-l border-gray-100 shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
            <div>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[8px] font-black rounded uppercase tracking-wider">
                MPP Detail Info
              </span>
              <h3 className="text-lg font-black text-gray-950 mt-1">{selectedPlan.proCode}</h3>
            </div>
            <button 
              onClick={() => setSelectedPlan(null)}
              className="text-gray-400 hover:text-gray-600 font-bold"
            >
              [Tutup]
            </button>
          </div>

          <div className="space-y-6 text-xs font-bold text-gray-600">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Nama Produk:</span>
                <span className="text-gray-800 text-right max-w-[200px] truncate">{selectedPlan.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Kode Produk:</span>
                <span className="text-gray-800">{selectedPlan.productCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Mesin Alokasi:</span>
                <span className="text-gray-800">{selectedPlan.machineCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Mold Terpasang:</span>
                <span className="text-gray-800">{selectedPlan.moldCode || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Operator Lead:</span>
                <span className="text-emerald-700 font-bold">{selectedPlan.operatorLead || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Operator Pelaksana:</span>
                <span className="text-blue-700 font-bold">{selectedPlan.operatorName || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Shift Alokasi:</span>
                <span className="text-gray-800">{selectedPlan.shift} (7 Jam)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Target Qty:</span>
                <span className="text-emerald-600 font-extrabold">{selectedPlan.targetQty.toLocaleString()} Pcs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Start - End Date:</span>
                <span className="text-gray-800">{selectedPlan.startDate} s/d {selectedPlan.endDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className="text-gray-800">{selectedPlan.status}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-2">
              <div className="flex gap-2">
                <button 
                  onClick={() => openEditModal(selectedPlan)}
                  className="flex-1 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-center uppercase tracking-wider text-[10px] font-black"
                >
                  Edit Plan
                </button>
                <button 
                  onClick={() => handlePrintPlan(selectedPlan)}
                  className="flex-1 py-3 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl text-center uppercase tracking-wider text-[10px] font-black"
                >
                  Cetak SPK
                </button>
              </div>

              {/* ERP Integration Buttons */}
              <button
                onClick={() => router.push('/manufacturing/mrp')}
                className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-center uppercase tracking-wider text-[10px] font-black transition-all flex items-center justify-center gap-1.5"
              >
                <Layers size={14} /> Hitung Kebutuhan Material (MRP)
              </button>

              <button
                onClick={() => router.push('/manufacturing/work-order')}
                className="w-full py-3 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-center uppercase tracking-wider text-[10px] font-black transition-all flex items-center justify-center gap-1.5"
              >
                <ClipboardList size={14} /> Release ke Work Order (SPK)
              </button>

              <button 
                onClick={() => handleDeletePlan(selectedPlan.id)}
                className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-center uppercase tracking-wider text-[10px] font-black transition-all"
              >
                Hapus Rencana (Delete)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
