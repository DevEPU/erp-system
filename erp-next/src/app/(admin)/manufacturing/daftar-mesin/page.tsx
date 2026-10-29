"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Cog,
  Plus,
  Search,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Sliders,
  Play,
  RotateCcw,
  Gauge,
  Thermometer,
  Wrench,
  Cpu,
  Calendar,
  Layers,
  Sparkles,
  Trash2,
  Check,
  Eye,
  Edit,
  X
} from "lucide-react";
import api from "@/lib/api";
import SearchableSelect from "@/components/ui/SearchableSelect";
import usePermission from "@/hooks/usePermission";

interface Machine {
  id: number;
  code: string;
  name: string;
  type: string; // "Injection" | "CNC" | "Assembly"
  line: string;
  capacity: string; // e.g. "120 pcs/hr"
  status: string;
  leader_group?: string;
  standard_mp?: number;
  oee?: number;
}

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
  moldCode?: string;
}

interface Mold {
  id: number;
  code: string;
  name: string;
  is_active: boolean | number;
  product_names?: string;
  product_ids?: string | number[];
}

interface MachineMoldUph {
  id: number;
  machine_id: number;
  mold_id: number;
  product_id?: number;
  product_code?: string;
  product_name?: string;
  uph: number;
  cavity: number;
  is_primary: number;
  mold_code: string;
  mold_name: string;
  product_names?: string;
}

interface ProductionLine {
  id: number;
  code: string;
  name: string;
  description?: string;
}


export default function DaftarMesinPage() {
  const router = useRouter();
  const { user, hasRole } = usePermission();
  const isAdmin = hasRole("Super Admin") || hasRole("Administrator") || hasRole("Admin") || user?.role_names?.some((r: string) => r.toLowerCase().includes("admin")) || false;

  // State
  const [machines, setMachines] = useState<Machine[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("Semua");
  const [selectedStatus, setSelectedStatus] = useState<string>("Semua");
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Category states
  const [categories, setCategories] = useState<string[]>(["Injection", "CNC", "Assembly"]);
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  // Production Line states
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([
    { id: 1, code: 'LINE-INJ1', name: 'Line Injection 1' },
    { id: 2, code: 'LINE-INJ2', name: 'Line Injection 2' },
    { id: 3, code: 'LINE-WKM', name: 'Line Workshop Mold' },
    { id: 4, code: 'LINE-ASM1', name: 'Line Assembly 1' }
  ]);
  const [isManageLinesOpen, setIsManageLinesOpen] = useState(false);
  const [newLineName, setNewLineName] = useState("");

  // Leader Groups states
  const [leaderGroups, setLeaderGroups] = useState<any[]>([
    { id: 1, name: 'Asep' },
    { id: 2, name: 'Sarmadi' },
    { id: 3, name: 'Yusuf' }
  ]);

  // Modal Pop-Up states for View and Edit
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);

  // Edit form states
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("Injection");
  const [editLine, setEditLine] = useState("Line Injection 1");
  const [editCapacity, setEditCapacity] = useState("100 Pcs/Jam");
  const [editStatus, setEditStatus] = useState("Running");
  const [editLeaderGroup, setEditLeaderGroup] = useState("");
  const [editStandardMp, setEditStandardMp] = useState(1);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const catName = newCatName.trim();
    try {
      await api.express.post("/manufacturing/machine-categories", {
        name: catName,
        code: `CAT-${catName.toUpperCase().replace(/\s+/g, '-').slice(0, 8)}`,
        description: `Kategori ${catName}`
      }).catch(() => null);

      if (!categories.includes(catName)) {
        setCategories(prev => [...prev, catName]);
      }
      setNewCatName("");
      setIsAddCatModalOpen(false);
      fetchCategoriesList();
    } catch (err) {
      console.error("Error adding category:", err);
    }
  };

  const fetchCategoriesList = async () => {
    try {
      const res = await api.express.get("/manufacturing/machine-categories").catch(() => null);
      if (res && res.data && res.data.success && Array.isArray(res.data.data)) {
        const catNames = res.data.data.map((c: any) => c.name);
        if (catNames.length > 0) setCategories(catNames);
      }
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  const handleDeleteCategory = (catToDelete: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus kategori "${catToDelete}"?`)) {
      setCategories(prev => prev.filter(c => c !== catToDelete));
      if (selectedType === catToDelete) setSelectedType("Semua");
    }
  };

  const fetchProductionLinesList = async () => {
    try {
      const res = await api.express.get("/manufacturing/production-lines").catch(() => null);
      if (res && res.data && res.data.success && Array.isArray(res.data.data)) {
        setProductionLines(res.data.data);
      }
    } catch (err) {
      console.error("Error loading production lines:", err);
    }
  };

  const handleAddProductionLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLineName.trim()) return;
    const name = newLineName.trim();
    try {
      const res = await api.express.post("/manufacturing/production-lines", {
        name,
        code: `LINE-${name.toUpperCase().replace(/\s+/g, '-').slice(0, 8)}`,
        description: `Line Produksi ${name}`
      });
      if (res && res.data && res.data.success) {
        setNewLineName("");
        fetchProductionLinesList();
        alert("Line produksi baru berhasil ditambahkan!");
      } else {
        alert(res?.data?.message || "Gagal menambahkan line produksi.");
      }
    } catch (err: any) {
      console.error("Error adding production line:", err);
      alert(err.response?.data?.message || err.message || "Gagal menambahkan line produksi.");
    }
  };

  const handleDeleteProductionLine = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus line produksi ini?")) return;
    try {
      const res = await api.express.delete(`/manufacturing/production-lines/${id}`);
      if (res && res.data && res.data.success) {
        fetchProductionLinesList();
      } else {
        alert(res?.data?.message || "Gagal menghapus line produksi.");
      }
    } catch (err: any) {
      console.error("Error deleting production line:", err);
      alert(err.response?.data?.message || err.message || "Gagal menghapus line produksi.");
    }
  };


  const handleOpenEditModal = (machine: Machine) => {
    setEditingMachine(machine);
    setEditCode(machine.code);
    setEditName(machine.name);
    setEditType(machine.type || "Injection");
    setEditLine(machine.line || "Line Injection 1");
    setEditCapacity(machine.capacity || "100 Pcs/Jam");
    setEditStatus(machine.status || "Running");
    setEditLeaderGroup(machine.leader_group || "Asep");
    setEditStandardMp(machine.standard_mp || 1);
    setIsEditModalOpen(true);
  };

  const handleUpdateMachineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMachine) return;
    try {
      const payload = {
        code: editCode.toUpperCase().trim(),
        name: editName.trim(),
        type: editType,
        line: editLine,
        capacity: editCapacity,
        status: editStatus,
        leader_group: editLeaderGroup || null,
        standard_mp: Number(editStandardMp) || 1,
        is_active: 1
      };

      const res = await api.express.put(`/manufacturing/machines/${editingMachine.id}`, payload);
      if (res && res.data && res.data.success) {
        alert("Data mesin berhasil diperbarui!");
        setIsEditModalOpen(false);
        setEditingMachine(null);
        fetchMachinesData();
      }
    } catch (err: any) {
      console.error("Update Machine Error:", err);
      alert(err.response?.data?.message || err.message || "Gagal memperbarui mesin.");
    }
  };

  const handleDeleteMachine = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus unit mesin ini?")) return;
    try {
      const res = await api.express.delete(`/manufacturing/machines/${id}`);
      if (res && res.data && res.data.success) {
        alert("Mesin berhasil dihapus!");
        if (selectedMachine?.id === id) setSelectedMachine(null);
        fetchMachinesData();
      }
    } catch (err: any) {
      console.error("Delete Machine Error:", err);
      alert(err.response?.data?.message || err.message || "Gagal menghapus mesin.");
    }
  };

  // Tab View States
  const [activeTab, setActiveTab] = useState<"data" | "timeline">("data");
  const [timelineFrame, setTimelineFrame] = useState<"week" | "month">("week");

  // Detail Panel tab: "telemetry" | "uph"
  const [detailTab, setDetailTab] = useState<"telemetry" | "uph">("telemetry");

  // Mold lists for UPH configuration
  const [allMolds, setAllMolds] = useState<Mold[]>([]);
  const [allFinishedGoods, setAllFinishedGoods] = useState<any[]>([]);
  const [machineMolds, setMachineMolds] = useState<MachineMoldUph[]>([]);
  const [moldLoading, setMoldLoading] = useState(false);

  // Form states - Machine
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Injection");
  const [newLine, setNewLine] = useState("");
  const [newCapacity, setNewCapacity] = useState("100 Pcs/Jam");
  const [newLeaderGroup, setNewLeaderGroup] = useState("Asep");
  const [newStandardMp, setNewStandardMp] = useState(1);
  const [newSelectedMoldIds, setNewSelectedMoldIds] = useState<number[]>([]);
  
  // State for storing configurations of each selected mold in the modal
  const [moldConfigs, setMoldConfigs] = useState<{
    [moldId: number]: {
      uph: string;
      cavity: string;
      isPrimary: boolean;
      productIds: number[];
    }
  }>({});

  // Form states - UPH
  const [selectedMoldId, setSelectedMoldId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [inputUph, setInputUph] = useState("0");
  const [inputCavity, setInputCavity] = useState("4");
  const [isPrimaryPair, setIsPrimaryPair] = useState(true);

  // Sync mold configurations when mold selection changes
  useEffect(() => {
    setMoldConfigs(prev => {
      const next = { ...prev };
      newSelectedMoldIds.forEach(id => {
        if (!next[id]) {
          const m = allMolds.find(x => x.id === id);
          const pIds = m && m.product_ids ? String(m.product_ids).split(',').map(Number) : [];
          next[id] = {
            uph: "0",
            cavity: "4",
            isPrimary: true,
            productIds: pIds
          };
        }
      });
      Object.keys(next).forEach(key => {
        const id = Number(key);
        if (!newSelectedMoldIds.includes(id)) {
          delete next[id];
        }
      });
      return next;
    });
  }, [newSelectedMoldIds, allMolds]);


  // Fetch all machines & plans
  const fetchMachinesData = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/manufacturing/machines").catch(() => null);
      if (res && res.data && res.data.success) {
        setMachines(res.data.data);
      } else {
        // Fallback
        const stored = localStorage.getItem("erp_epu_machines");
        if (stored) setMachines(JSON.parse(stored));
      }

      // Fetch plans for timeline
      const plansRes = await api.express.get("/manufacturing/planning-produksi").catch(() => null);
      if (plansRes && plansRes.data && plansRes.data.success) {
        const mapped = plansRes.data.data.map((p: any) => ({
          id: p.id,
          proCode: p.pro_code,
          orderSheetId: p.order_sheet_id,
          osReference: p.os_reference,
          productName: p.product_name,
          productCode: p.product_code,
          machineName: p.machine_id,
          machineCode: p.machine_id,
          operatorName: p.operator_name,
          targetQty: p.target_qty,
          actualQty: p.actual_qty,
          startDate: p.start_date ? p.start_date.substring(0, 10) : "",
          endDate: p.end_date ? p.end_date.substring(0, 10) : "",
          shift: `Shift ${p.shift}`,
          status: p.status
        }));
        setPlans(mapped);
      }

      // Fetch molds for UPH mapping dropdown
      const moldsRes = await api.express.get("/manufacturing/molds").catch(() => null);
      if (moldsRes && moldsRes.data && moldsRes.data.success) {
        setAllMolds(moldsRes.data.data || []);
      }

      // Fetch finished goods
      const productsRes = await api.express.get("/products?limit=1000&warehouse_id=3").catch(() => null);
      if (productsRes && productsRes.data && productsRes.data.success) {
        setAllFinishedGoods(productsRes.data.data || []);
      }
    } catch (err) {
      console.error("Error loading machines data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachinesData();
    fetchCategoriesList();
    fetchProductionLinesList();
  }, []);

  useEffect(() => {
    if (productionLines.length > 0 && !newLine) {
      setNewLine(productionLines[0].name);
    }
  }, [productionLines, newLine]);


  // Fetch mold-uph for selected machine
  const fetchMachineMoldUph = async (machineId: number) => {
    setMoldLoading(true);
    try {
      const res = await api.express.get(`/manufacturing/machines/${machineId}/molds`).catch(() => null);
      if (res && res.data && res.data.success) {
        setMachineMolds(res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching machine molds:", err);
    } finally {
      setMoldLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMachine) {
      fetchMachineMoldUph(selectedMachine.id);
      // Reset UPH config form to default values when machine selection changes
      setSelectedMoldId("");
      setSelectedProductId("");
      setInputUph("0");
      setInputCavity("4");
      setIsPrimaryPair(true);
    }
  }, [selectedMachine]);

  // Look up existing pairing UPH & cavity when mold or product is selected
  useEffect(() => {
    if (selectedMoldId && selectedProductId && machineMolds.length > 0) {
      const existing = machineMolds.find(
        m => String(m.mold_id) === String(selectedMoldId) && String(m.product_id) === String(selectedProductId)
      );
      if (existing) {
        setInputUph(String(existing.uph));
        setInputCavity(String(existing.cavity));
        setIsPrimaryPair(existing.is_primary === 1);
      } else {
        setInputUph("0");
        setInputCavity("4");
        setIsPrimaryPair(true);
      }
    } else {
      setInputUph("0");
      setInputCavity("4");
      setIsPrimaryPair(true);
    }
  }, [selectedMoldId, selectedProductId, machineMolds]);

  // Add Machine
  const handleAddMachineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName || !newType) {
      alert("Mohon lengkapi data mesin.");
      return;
    }

    const primaryMoldId = newSelectedMoldIds.find(id => moldConfigs[id]?.isPrimary);
    const capacityVal = primaryMoldId ? `${moldConfigs[primaryMoldId].uph} Pcs/Jam` : "";

    const payload = {
      code: newCode.toUpperCase().trim(),
      name: newName.trim(),
      type: newType,
      line: newLine,
      capacity: capacityVal,
      status: "Idle",
      leader_group: newLeaderGroup || null,
      standard_mp: Number(newStandardMp) || 1,
      molds: newSelectedMoldIds.flatMap(id => {
        const config = moldConfigs[id];
        const selectedProds = config?.productIds || [];
        if (selectedProds.length === 0) {
          return [{
            mold_id: id,
            product_id: null as number | null,
            uph: Number(config?.uph || 0),
            cavity: Number(config?.cavity || 4),
            is_primary: config?.isPrimary ? 1 : 0
          }];
        }
        return selectedProds.map(prodId => ({
          mold_id: id,
          product_id: prodId as number | null,
          uph: Number(config?.uph || 0),
          cavity: Number(config?.cavity || 4),
          is_primary: config?.isPrimary ? 1 : 0
        }));
      })
    };

    try {
      const res = await api.express.post("/manufacturing/machines", payload);
      if (res && res.data && res.data.success) {
        alert("Mesin berhasil didaftarkan!");
        setIsCreateModalOpen(false);
        setNewCode("");
        setNewName("");
        setNewSelectedMoldIds([]);
        setMoldConfigs({});
        fetchMachinesData();
      }
    } catch (err: any) {
      console.error("Error creating machine:", err);
      alert(err.response?.data?.message || err.message || "Gagal membuat mesin.");
    }
  };

  // Add or Update Mold UPH
  const handleSaveUphSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine || !selectedMoldId || !selectedProductId || !inputUph) {
      alert("Pilih mold, produk, dan masukkan UPH.");
      return;
    }

    const payload = {
      mold_id: Number(selectedMoldId),
      product_id: Number(selectedProductId),
      uph: Number(inputUph),
      shadow_uph: Number(inputUph), // backwards compat
      cavity: Number(inputCavity),
      is_primary: isPrimaryPair ? 1 : 0
    };

    try {
      const res = await api.express.post(`/manufacturing/machines/${selectedMachine.id}/molds`, payload);
      if (res && res.data && res.data.success) {
        alert("Konfigurasi UPH berhasil disimpan!");
        setSelectedMoldId("");
        setSelectedProductId("");
        fetchMachineMoldUph(selectedMachine.id);
        // Refresh machine list to update capacities
        const machRes = await api.express.get("/manufacturing/machines").catch(() => null);
        if (machRes && machRes.data && machRes.data.success) {
          setMachines(machRes.data.data);
          // Sync selected machine
          const updated = machRes.data.data.find((m: any) => m.id === selectedMachine.id);
          if (updated) setSelectedMachine(updated);
        }
      }
    } catch (err: any) {
      console.error("Error mapping UPH:", err);
      alert(err.response?.data?.message || err.message || "Gagal menyimpan UPH.");
    }
  };

  // Delete Mold UPH pairing
  const handleDeleteUph = async (moldId: number, productId?: number) => {
    if (!selectedMachine) return;
    if (!confirm("Hapus konfigurasi UPH untuk mold ini?")) return;

    try {
      const url = `/manufacturing/machines/${selectedMachine.id}/molds/${moldId}${productId ? `?product_id=${productId}` : ""}`;
      const res = await api.express.delete(url);
      if (res && res.data && res.data.success) {
        alert("Konfigurasi UPH berhasil dihapus.");
        fetchMachineMoldUph(selectedMachine.id);
      }
    } catch (err: any) {
      console.error("Error deleting UPH:", err);
      alert(err.response?.data?.message || err.message || "Gagal menghapus UPH.");
    }
  };

  // Toggle machine status (simulation)
  const toggleMachineStatus = async (id: number, status: string) => {
    const target = machines.find(m => m.id === id);
    if (!target) return;

    const payload = {
      ...target,
      status
    };

    try {
      const res = await api.express.put(`/manufacturing/machines/${id}`, payload);
      if (res && res.data && res.data.success) {
        // Sync selected machine status
        const next = { ...target, status };
        setMachines(machines.map(m => m.id === id ? next : m));
        if (selectedMachine?.id === id) {
          setSelectedMachine(next);
        }
      }
    } catch (err) {
      console.error("Error updating machine status:", err);
    }
  };

  // Filter list
  const filteredMachines = machines.filter(m => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase()) ||
      (m.line && m.line.toLowerCase().includes(search.toLowerCase()));

    const matchesType = selectedType === "Semua" || m.type === selectedType;
    const matchesStatus = selectedStatus === "Semua" || m.status === selectedStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  // KPI calculations
  const totalCount = machines.length;
  const runningCount = machines.filter(m => m.status === "Running").length;
  const maintCount = machines.filter(m => m.status === "Maintenance").length;
  const avgOee = 84.5; // simulated default OEE

  // Generate Timeline Dates
  const getTimelineDates = () => {
    const dates = [];
    const count = timelineFrame === "week" ? 7 : 30;
    const today = new Date();

    for (let i = 0; i < count; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateString = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      const dayName = d.toLocaleDateString("id-ID", { weekday: "short" });
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
              <Cog className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Daftar <span className="text-emerald-600">Mesin Produksi</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Pantau status operasional mesin secara real-time, pantau OEE, log maintenance, dan kapasitas output line.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setActiveTab("data")}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === "data" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-700"
              }`}
            >
              Data Cards
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === "timeline" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-700"
              }`}
            >
              Dashboard Timeline
            </button>
          </div>

          <button
            onClick={() => {
              setNewCode("");
              setNewName("");
              setNewType("Injection");
              setNewLine("Line Injection 1");
              setNewCapacity("100 Pcs/Jam");
              setNewSelectedMoldIds([]);
              setIsCreateModalOpen(true);
            }}
            className="group flex items-center gap-3 bg-gray-950 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-100 active:scale-95 overflow-hidden"
          >
            <Plus size={20} strokeWidth={3} />
            <span>Tambah Mesin</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Unit Mesin</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><Cpu size={18} /></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-950">{totalCount}</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Semua mesin terdaftar di ERP
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mesin Running</span>
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><Activity size={18} /></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-3xl font-black text-gray-950">{runningCount}</h3>
              <span className="flex h-3.5 w-3.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Aktif memproses MPP
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mesin Downtime</span>
            <div className="p-2 bg-red-50 rounded-xl text-red-600"><ShieldAlert size={18} /></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-950">{maintCount}</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Sedang dalam maintenance/trouble
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rata-rata OEE</span>
            <div className="p-2 bg-orange-50 rounded-xl text-orange-600"><Gauge size={18} /></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <h3 className="text-3xl font-black text-gray-950">{avgOee}%</h3>
              <span className="text-xs text-emerald-600 font-black">Target: 85%</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 bg-emerald-500`}
                style={{ width: `${avgOee}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── TAB A: DATA CARDS LISTING ───────────────────────────────────── */}
      {activeTab === "data" && (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-1.5 p-1 bg-gray-50 rounded-2xl w-max overflow-x-auto">
              <button
                onClick={() => setSelectedType("Semua")}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  selectedType === "Semua"
                    ? "bg-white text-emerald-600 shadow-sm border border-emerald-100/50"
                    : "text-gray-400 hover:text-gray-800"
                }`}
              >
                Semua
              </button>
              {categories.map((cat) => (
                <div key={cat} className="relative group/cat flex items-center">
                  <button
                    onClick={() => setSelectedType(cat)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                      selectedType === cat
                        ? "bg-white text-emerald-600 shadow-sm border border-emerald-100/50"
                        : "text-gray-400 hover:text-gray-800"
                    }`}
                  >
                    {cat}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                    className="opacity-0 group-hover/cat:opacity-100 text-rose-400 hover:text-rose-600 p-1 text-[10px] transition-all ml-[-8px] mr-1"
                    title={`Hapus kategori ${cat}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setIsAddCatModalOpen(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-all flex items-center gap-1"
              >
                <Plus size={14} /> Kategori
              </button>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-3 flex-1 lg:max-w-2xl justify-end">
              <div className="relative w-full md:max-w-[200px]">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all appearance-none font-semibold text-gray-700"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Running">Running</option>
                  <option value="Idle">Idle</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>

              <div className="relative w-full md:flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari kode, nama mesin, operator..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:bg-white outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm animate-pulse h-48"></div>
                ))
              ) : filteredMachines.length === 0 ? (
                <div className="col-span-full bg-white rounded-3xl border border-gray-100 shadow-sm p-20 text-center font-bold text-gray-400 uppercase tracking-widest text-sm">
                  Tidak Ada Mesin yang Ditemukan
                </div>
              ) : filteredMachines.map((machine) => (
                <div
                  key={machine.id}
                  onClick={() => { setSelectedMachine(machine); setDetailTab("telemetry"); }}
                  className={`bg-white rounded-3xl p-6 border transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between h-56 hover:shadow-lg ${
                    selectedMachine?.id === machine.id ? "border-emerald-500 ring-2 ring-emerald-500/10" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[8px] font-black rounded uppercase tracking-wider">
                        {machine.type} • {machine.line || "-"}
                      </span>
                      <h3 className="text-lg font-black text-gray-950 mt-1.5 group-hover:text-emerald-600 transition-colors">
                        {machine.name}
                      </h3>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        {machine.code}
                      </p>
                    </div>

                    <div>
                      {machine.status === "Running" && (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                          Running
                        </span>
                      )}
                      {machine.status === "Idle" && (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                          Idle
                        </span>
                      )}
                      {machine.status === "Maintenance" && (
                        <span className="px-2.5 py-1 bg-red-50 text-red-600 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                          Trouble
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="py-2 text-xs font-semibold text-gray-400">
                    Mesin siap jalan. Klik untuk melihat detail & matriks UPH.
                  </div>

                  <div className="border-t border-gray-100 pt-4 flex justify-between items-center text-xs font-bold text-gray-500">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">OEE Rate</span>
                        <p className="font-black text-sm mt-0.5 text-emerald-600">84%</p>
                      </div>
                      <div className="h-6 w-px bg-gray-100" />
                      <div>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Kapasitas</span>
                        <p className="text-gray-700 font-black text-xs mt-0.5">{machine.capacity || "100 Pcs/J"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMachine(machine);
                          setDetailTab("telemetry");
                          setIsViewModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 border border-emerald-100 shadow-sm"
                        title="View Detail Mesin"
                      >
                        <Eye size={12} /> View
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(machine);
                        }}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 border border-blue-100 shadow-sm"
                        title="Edit Machine"
                      >
                        <Edit size={12} /> Edit
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMachine(machine.id);
                        }}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 border border-rose-100 shadow-sm"
                        title="Hapus Mesin"
                      >
                        <Trash2 size={12} /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* VIEW MACHINE POP-UP MODAL */}
      {isViewModalOpen && selectedMachine && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl border border-gray-100 shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded-full uppercase tracking-wider">
                  Machine Workstation Panel
                </span>
                <h2 className="text-2xl font-black text-gray-900 mt-2">{selectedMachine.name}</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                  Kode: {selectedMachine.code} · Tipe: {selectedMachine.type} · Line: {selectedMachine.line}
                </p>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-3 py-1.5 bg-gray-100 text-gray-400 hover:bg-gray-200 rounded-xl text-xs font-black uppercase transition-all"
              >
                Tutup [X]
              </button>
            </div>

            {/* Sub Tab Switcher inside detailed panel */}
            <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200">
              <button
                onClick={() => setDetailTab("telemetry")}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  detailTab === "telemetry" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-700"
                }`}
              >
                <Activity size={14} /> Telemetri & Status
              </button>
              <button
                onClick={() => setDetailTab("uph")}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  detailTab === "uph" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-700"
                }`}
              >
                <Layers size={14} /> Matriks Mold & UPH
              </button>
            </div>

            {/* Sub-Tab 1: Telemetry & status control */}
            {detailTab === "telemetry" && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-2 border-b border-gray-50 pb-2">
                    <Gauge size={14} className="text-emerald-500" /> Sensor Telemetri Mesin
                  </h3>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 p-3.5 rounded-2xl text-center space-y-1.5">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center gap-0.5"><Thermometer size={10} /> Temp C</span>
                      <p className={`text-xl font-black ${selectedMachine.status === "Running" ? "text-orange-600" : "text-gray-700"}`}>
                        {selectedMachine.status === "Running" ? "215" : "25"}°C
                      </p>
                      <span className="text-[8px] text-gray-400 font-bold block">Nozzle Heat</span>
                    </div>

                    <div className="bg-gray-50 p-3.5 rounded-2xl text-center space-y-1.5">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center gap-0.5"><Activity size={10} /> Pressure</span>
                      <p className="text-xl font-black text-gray-700">
                        {selectedMachine.status === "Running" ? "175" : "0"} <span className="text-[10px] font-semibold text-gray-400">bar</span>
                      </p>
                      <span className="text-[8px] text-gray-400 font-bold block">Hydraulic</span>
                    </div>

                    <div className="bg-gray-50 p-3.5 rounded-2xl text-center space-y-1.5">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center gap-0.5"><Gauge size={10} /> Load</span>
                      <p className="text-xl font-black text-gray-700">
                        {selectedMachine.status === "Running" ? "82" : "0"}%
                      </p>
                      <span className="text-[8px] text-gray-400 font-bold block">Motor Load</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl space-y-3 border border-gray-100">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Atur Status Operasional (Simulasi)</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => toggleMachineStatus(selectedMachine.id, "Running")}
                      className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                        selectedMachine.status === "Running" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 hover:bg-emerald-50"
                      }`}
                    >
                      <Play size={10} /> Run
                    </button>
                    <button
                      onClick={() => toggleMachineStatus(selectedMachine.id, "Idle")}
                      className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                        selectedMachine.status === "Idle" ? "bg-slate-600 text-white" : "bg-white text-gray-600 hover:bg-slate-50"
                      }`}
                    >
                      <RotateCcw size={10} /> Idle
                    </button>
                    <button
                      onClick={() => toggleMachineStatus(selectedMachine.id, "Maintenance")}
                      className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                        selectedMachine.status === "Maintenance" ? "bg-red-600 text-white" : "bg-white text-red-600 hover:bg-red-50"
                      }`}
                    >
                      <Wrench size={10} /> Trouble
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 2: Mold UPH Matrix Mapping */}
            {detailTab === "uph" && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-2 border-b border-gray-50 pb-2">
                    <Layers size={14} className="text-emerald-500" /> Mold yang Kompatibel & UPH
                  </h3>

                  {moldLoading ? (
                    <div className="text-center py-8 text-xs text-gray-400 font-bold uppercase animate-pulse">Memuat Matriks UPH...</div>
                  ) : machineMolds.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-400 font-bold uppercase tracking-widest bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                      Belum ada Mold terhubung ke Mesin ini
                    </div>
                  ) : (
                    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm max-h-60 overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                            <th className="px-4 py-3">Mold / Cetakan</th>
                            <th className="px-4 py-3 text-center">UPH</th>
                            <th className="px-4 py-3 text-center">Cavity</th>
                            <th className="px-4 py-3 text-center">Tipe</th>
                            <th className="px-4 py-3 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs">
                          {machineMolds.map((mmu) => (
                            <tr key={mmu.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3">
                                <p className="font-bold text-gray-900">{mmu.mold_name}</p>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider mt-0.5">{mmu.mold_code}</p>
                                <p className="text-[8px] text-indigo-600 font-bold mt-1 leading-tight">
                                  Produk: {mmu.product_name ? `[${mmu.product_code || "TANPA KODE"}] ${mmu.product_name}` : (mmu.product_names || "Semua Produk")}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-center font-black text-gray-800 tabular-nums">
                                {mmu.uph} <span className="text-[9px] text-gray-400 font-bold">/jam</span>
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-gray-700 tabular-nums">
                                {mmu.cavity}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {mmu.is_primary ? (
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black rounded uppercase tracking-wider">Utama</span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded uppercase tracking-wider">Backup</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleDeleteUph(mmu.mold_id, mmu.product_id)}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Hapus"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50/50 border border-gray-100 p-5 rounded-[2rem] space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                    <Sparkles size={14} className="text-emerald-500" />
                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">Simpan / Edit Pasangan Mold & UPH</h4>
                  </div>

                  <form onSubmit={handleSaveUphSubmit} className="space-y-4 text-xs font-bold text-gray-600">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pilih Mold / Cetakan</label>
                      <select
                        value={selectedMoldId}
                        onChange={(e) => {
                          setSelectedMoldId(e.target.value);
                          setSelectedProductId("");
                        }}
                        required
                        className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="">-- Pilih Mold --</option>
                        {allMolds.map(m => (
                          <option key={m.id} value={m.id}>[{m.code}] {m.name}</option>
                        ))}
                      </select>
                    </div>

                    {selectedMoldId && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pilih Produk yang Diproduksi</label>
                        <select
                          value={selectedProductId}
                          onChange={(e) => setSelectedProductId(e.target.value)}
                          required
                          className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="">-- Pilih Produk --</option>
                          {(() => {
                            const selMold = allMolds.find(m => m.id === Number(selectedMoldId));
                            const moldProductIds = selMold && selMold.product_ids ? String(selMold.product_ids).split(',').map(Number) : [];
                            const compatibleProducts = allFinishedGoods.filter(p => moldProductIds.includes(p.id));
                            return compatibleProducts.map(p => (
                              <option key={p.id} value={p.id}>[{p.product_code || "TANPA KODE"}] {p.product_name}</option>
                            ));
                          })()}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Unit Per Hour (UPH)</label>
                        <input
                          type="number"
                          value={inputUph}
                          onChange={(e) => setInputUph(e.target.value)}
                          min="1"
                          required
                          className="px-4 py-3 bg-white border border-gray-100 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Jumlah Cavity</label>
                        <input
                          type="number"
                          value={inputCavity}
                          onChange={(e) => setInputCavity(e.target.value)}
                          min="1"
                          required
                          className="px-4 py-3 bg-white border border-gray-100 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 py-1.5">
                      <input
                        type="checkbox"
                        id="chkPrimary"
                        checked={isPrimaryPair}
                        onChange={(e) => setIsPrimaryPair(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 border-gray-200 rounded focus:ring-emerald-500/20"
                      />
                      <label htmlFor="chkPrimary" className="text-xs text-gray-600 font-bold select-none cursor-pointer">
                        Jadikan sebagai Mold Utama untuk mesin ini
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest transition-all shadow-md"
                    >
                      Simpan Pasangan UPH
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT MACHINE POP-UP MODAL */}
      {isEditModalOpen && editingMachine && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl border border-gray-100 shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Edit size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Ubah Data Mesin</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">Edit spesifikasi, line, dan status unit mesin</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                [X]
              </button>
            </div>

            <form onSubmit={handleUpdateMachineSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Kode Mesin</label>
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nama Mesin</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all h-12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Kategori / Tipe</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold outline-none"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Line Produksi</label>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setIsManageLinesOpen(true)}
                        className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-0.5"
                      >
                        <Cog size={12} /> Kelola
                      </button>
                    )}
                  </div>
                  <select
                    value={editLine}
                    onChange={(e) => setEditLine(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold outline-none h-12 appearance-none"
                  >
                    {productionLines.map(line => (
                      <option key={line.id} value={line.name}>{line.name}</option>
                    ))}
                  </select>
                </div>


                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold outline-none"
                  >
                    <option value="Running">Running</option>
                    <option value="Idle">Idle</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Group Leader</label>
                  <input
                    type="text"
                    placeholder="Contoh: Asep / Sarmadi / Yusuf"
                    value={editLeaderGroup}
                    onChange={(e) => setEditLeaderGroup(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Standar Manpower (MP)</label>
                  <input
                    type="number"
                    min="1"
                    value={editStandardMp}
                    onChange={(e) => setEditStandardMp(Number(e.target.value) || 1)}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all h-12"
                  />
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
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all h-12 shadow-lg shadow-blue-100"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CATEGORY POP-UP MODAL */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md border border-gray-100 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-gray-900">Tambah Kategori Mesin</h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <input
                type="text"
                placeholder="Nama Kategori (misal: Blow Molding)..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCatModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase"
                >
                  Tambah Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE PRODUCTION LINES POP-UP MODAL */}
      {isManageLinesOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md border border-gray-100 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-base font-black text-gray-900 uppercase tracking-wider">Kelola Line Produksi</h3>
              <button
                onClick={() => setIsManageLinesOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xs"
              >
                [X]
              </button>
            </div>
            
            {/* List of current lines */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {productionLines.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-4">Belum ada line produksi.</p>
              ) : (
                productionLines.map((line) => (
                  <div key={line.id} className="flex justify-between items-center bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
                    <span className="text-xs font-bold text-gray-700">{line.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteProductionLine(line.id)}
                      className="text-rose-500 hover:text-rose-700 transition-all p-1"
                      title={`Hapus ${line.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Form to add a new line */}
            <form onSubmit={handleAddProductionLine} className="space-y-3 pt-3 border-t border-gray-100">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Tambah Line Baru</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nama Line (misal: Line Injection 3)..."
                  value={newLineName}
                  onChange={(e) => setNewLineName(e.target.value)}
                  required
                  className="flex-1 px-4 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Tambah
                </button>
              </div>
            </form>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsManageLinesOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ─── TAB B: TIMELINE DASHBOARD VIEW ───────────────────────────────── */}
      {activeTab === "timeline" && (
        <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <Calendar className="text-emerald-600" size={18} />
              <h3 className="font-black text-gray-800 uppercase tracking-widest text-xs">
                Timeline Penggunaan Mesin Produksi
              </h3>
            </div>

            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
              <button
                onClick={() => setTimelineFrame("week")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  timelineFrame === "week" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-700"
                }`}
              >
                1 Minggu
              </button>
              <button
                onClick={() => setTimelineFrame("month")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  timelineFrame === "month" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-700"
                }`}
              >
                1 Bulan
              </button>
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
                                title={`${plan.proCode}: ${plan.productName}`}
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

      {/* CREATE MACHINE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl border border-gray-100 shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">

            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Cog size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Tambah Unit Mesin Baru</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">Registrasi kode dan kapasitas mesin baru ke dalam sistem ERP</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                [X]
              </button>
            </div>

            <form onSubmit={handleAddMachineSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Kode Mesin</label>
                  <input
                    type="text"
                    placeholder="Contoh: MC-INJ-500T"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nama / Merk Mesin</label>
                  <input
                    type="text"
                    placeholder="Contoh: Injection 500T - Nissei"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all h-12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tipe Mesin</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all appearance-none"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Alokasi Line Produksi</label>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setIsManageLinesOpen(true)}
                        className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-0.5"
                      >
                        <Cog size={12} /> Kelola Line
                      </button>
                    )}
                  </div>
                  <select
                    value={newLine}
                    onChange={(e) => setNewLine(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all appearance-none"
                  >
                    {productionLines.map(line => (
                      <option key={line.id} value={line.name}>{line.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Group Leader</label>
                  <input
                    type="text"
                    placeholder="Contoh: Asep / Sarmadi / Yusuf"
                    value={newLeaderGroup}
                    onChange={(e) => setNewLeaderGroup(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Standar Manpower (MP)</label>
                  <input
                    type="number"
                    min="1"
                    value={newStandardMp}
                    onChange={(e) => setNewStandardMp(Number(e.target.value) || 1)}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all h-12"
                  />
                </div>
              </div>



              {/* Mold Selection (Multi-select) */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-1.5 pb-1">
                  <Layers size={14} className="text-emerald-500" />
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">Pilih Mold yang Kompatibel</h4>
                </div>

                <SearchableSelect
                  options={allMolds.map(m => ({
                    value: m.id,
                    label: `[${m.code}] ${m.name}`
                  }))}
                  value={newSelectedMoldIds}
                  onChange={(val: any) => setNewSelectedMoldIds(val || [])}
                  isMulti={true}
                  placeholder="Pilih satu atau beberapa mold..."
                />

                {/* Display selected molds with their products & configuration */}
                {newSelectedMoldIds.length > 0 && (
                  <div className="space-y-4 max-h-80 overflow-y-auto mt-2 pr-1 border border-gray-150 p-4 bg-gray-50/50 rounded-2xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pb-1 border-b border-gray-200">Konfigurasi Mold & UPH</p>
                    
                    {newSelectedMoldIds.map(id => {
                      const m = allMolds.find(x => x.id === id);
                      if (!m || !moldConfigs[id]) return null;
                      
                      const config = moldConfigs[id];
                      const moldProductIds = m.product_ids ? String(m.product_ids).split(',').map(Number) : [];
                      const linkedProducts = allFinishedGoods.filter(p => moldProductIds.includes(p.id));

                      return (
                        <div key={id} className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-sm space-y-3.5 text-left">
                          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                            <span className="text-xs font-black text-emerald-600 uppercase tracking-wider">[{m.code}] {m.name}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3.5">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Unit Per Hour (UPH)</label>
                              <input
                                type="number"
                                value={config.uph}
                                onChange={(e) => setMoldConfigs(prev => ({
                                  ...prev,
                                  [id]: { ...prev[id], uph: e.target.value }
                                }))}
                                required
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all h-9"
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Jumlah Cavity</label>
                              <input
                                type="number"
                                value={config.cavity}
                                onChange={(e) => setMoldConfigs(prev => ({
                                  ...prev,
                                  [id]: { ...prev[id], cavity: e.target.value }
                                }))}
                                required
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all h-9"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 py-0.5">
                            <input
                              type="checkbox"
                              id={`chkPrimary-${id}`}
                              checked={config.isPrimary}
                              onChange={(e) => setMoldConfigs(prev => ({
                                ...prev,
                                [id]: { ...prev[id], isPrimary: e.target.checked }
                              }))}
                              className="w-4 h-4 text-emerald-600 border-gray-250 rounded focus:ring-emerald-500/20 cursor-pointer"
                            />
                            <label htmlFor={`chkPrimary-${id}`} className="text-[11px] text-gray-600 font-bold select-none cursor-pointer">
                              Jadikan sebagai Mold Utama untuk mesin ini
                            </label>
                          </div>

                          {/* Compatible Products Checkbox List */}
                          <div className="space-y-1.5 pt-2 border-t border-gray-150">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Produk yang Diproduksi dengan Mold ini:</label>
                            {linkedProducts.length === 0 ? (
                              <p className="text-[10px] text-gray-400 italic">Belum ada produk yang dipetakan untuk mold ini.</p>
                            ) : (
                              <div className="grid grid-cols-1 gap-1.5 max-h-24 overflow-y-auto pr-1">
                                {linkedProducts.map(prod => {
                                  const isChecked = config.productIds.includes(prod.id);
                                  return (
                                    <label key={prod.id} className="flex items-start gap-2 cursor-pointer text-[11px] text-gray-600 font-semibold select-none">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          setMoldConfigs(prev => {
                                            const currentPids = prev[id].productIds;
                                            const newPids = currentPids.includes(prod.id)
                                              ? currentPids.filter(x => x !== prod.id)
                                              : [...currentPids, prod.id];
                                            return {
                                              ...prev,
                                              [id]: { ...prev[id], productIds: newPids }
                                            };
                                          });
                                        }}
                                        className="w-3.5 h-3.5 text-emerald-600 border-gray-250 rounded mt-0.5"
                                      />
                                      <span>[{prod.product_code || "TANPA KODE"}] {prod.product_name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-xs font-bold transition-all h-12"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all h-12 shadow-lg shadow-emerald-100"
                >
                  Simpan Unit Mesin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
