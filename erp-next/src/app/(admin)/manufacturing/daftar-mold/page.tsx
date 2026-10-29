"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  Plus,
  Search,
  ArrowLeft,
  Trash2,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  Check,
  Calendar,
  Clock,
  Activity,
  Layers3
} from "lucide-react";
import api from "@/lib/api";
import SearchableSelect from "@/components/ui/SearchableSelect";

interface Mold {
  id: number;
  code: string;
  name: string;
  description: string;
  is_active: boolean | number;
  product_names?: string;
  product_ids?: string | number[];
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
  status: "Rencana" | "Berjalan" | "Selesai";
  note?: string;
  moldId?: number;
  moldCode?: string;
}

export default function DaftarMoldPage() {
  const router = useRouter();

  // Mode: 'list' | 'form'
  const [view, setView] = useState<"list">("list");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"data" | "timeline">("data");
  const [timelineFrame, setTimelineFrame] = useState<"week" | "month">("week");
  const [editId, setEditId] = useState<number | null>(null);

  // Listing Data States
  const [molds, setMolds] = useState<Mold[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Form State
  const [form, setForm] = useState<Omit<Mold, "id">>({
    code: "",
    name: "",
    description: "",
    is_active: true
  });

  // Product Mapping States
  const [mappedProducts, setMappedProducts] = useState<any[]>([]);
  const [prodSearch, setProdSearch] = useState("");
  const [prodSearchResults, setProdSearchResults] = useState<any[]>([]);
  const [allFinishedGoods, setAllFinishedGoods] = useState<any[]>([]);

  // Mock Molds as Fallback
  const mockMolds: Mold[] = [
    { id: 1, code: "MOLD-HOLDER-RH", name: "Mold Holder Mirror RH 29702", description: "Cetakan untuk Holder Mirror Kanan", is_active: 1 },
    { id: 2, code: "MOLD-BRK-LH", name: "Mold Mirror Bracket LH 29701", description: "Cetakan untuk Mirror Bracket Kiri", is_active: 1 },
    { id: 3, code: "MOLD-HSG-LH", name: "Mold Housing Mirror Out LH", description: "Cetakan untuk Housing Mirror Luar Kiri", is_active: 1 },
    { id: 4, code: "MOLD-LOK-BTN", name: "Mold Lock Button Assy Back Door", description: "Cetakan untuk Tombol Lock Pintu Belakang", is_active: 1 }
  ];

  // ─── Initial Side Effects ──────────────────────────────────────────────────
  useEffect(() => {
    fetchMolds();
    fetchPlans();
    fetchFinishedGoods();
  }, []);

  const fetchFinishedGoods = async () => {
    try {
      const res = await api.express.get("/products", { limit: 1000, warehouse_id: 3 }).catch(() => null);
      if (res && res.data && res.data.success) {
        setAllFinishedGoods(res.data.data || []);
      }
    } catch (err) {
      console.error("Error loading finished goods products:", err);
    }
  };

  // ─── Fetch API ─────────────────────────────────────────────────────────────
  const fetchMolds = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/manufacturing/molds").catch(() => null);
      if (res && res.data && res.data.success) {
        setMolds(res.data.data || []);
        localStorage.setItem("erp_epu_molds", JSON.stringify(res.data.data));
      } else {
        // Fallback from localStorage or mock
        const stored = localStorage.getItem("erp_epu_molds");
        if (stored) {
          setMolds(JSON.parse(stored));
        } else {
          setMolds(mockMolds);
          localStorage.setItem("erp_epu_molds", JSON.stringify(mockMolds));
        }
      }
    } catch (err) {
      console.error("Error fetching molds:", err);
      const stored = localStorage.getItem("erp_epu_molds");
      if (stored) {
        setMolds(JSON.parse(stored));
      } else {
        setMolds(mockMolds);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await api.express.get("/manufacturing/planning-produksi").catch(() => null);
      if (res && res.data && res.data.success) {
        // Map backend keys to frontend model format
        const mappedPlans = res.data.data.map((p: any) => ({
          id: p.id,
          proCode: p.pro_code,
          orderSheetId: p.order_sheet_id,
          osReference: p.os_reference,
          productName: p.product_name,
          productCode: p.product_code,
          machineName: p.machine_id ? `MC-${p.machine_id}` : "-",
          machineCode: p.machine_id ? `MC-${p.machine_id}` : "-",
          operatorName: p.operator_name,
          targetQty: p.target_qty,
          actualQty: p.actual_qty,
          startDate: p.start_date,
          endDate: p.end_date,
          shift: `Shift ${p.shift}`,
          status: p.status,
          moldId: p.mold_id,
          moldCode: p.mold_code
        }));
        setPlans(mappedPlans);
        localStorage.setItem("erp_epu_pro_plans", JSON.stringify(mappedPlans));
      } else {
        const stored = localStorage.getItem("erp_epu_pro_plans");
        if (stored) setPlans(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Error fetching plans:", err);
      const stored = localStorage.getItem("erp_epu_pro_plans");
      if (stored) setPlans(JSON.parse(stored));
    }
  };

  // ─── Save / Update Handler ─────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.code || !form.name) {
      alert("Mohon lengkapi Kode Mold dan Nama Mold!");
      return;
    }

    const payload = {
      code: form.code.toUpperCase().trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      is_active: form.is_active ? 1 : 0,
      product_ids: mappedProducts.map(p => p.id)
    };

    try {
      const res = await (editId
        ? api.express.put(`/manufacturing/molds/${editId}`, payload)
        : api.express.post("/manufacturing/molds", payload)
      ).catch(() => null);

      if (res && res.data && res.data.success) {
        alert(editId ? "Mold berhasil diperbarui!" : "Mold baru berhasil ditambahkan!");
      } else {
        // Local simulation fallback
        const currentMolds = [...molds];
        if (editId) {
          const index = currentMolds.findIndex(m => m.id === editId);
          if (index !== -1) {
            currentMolds[index] = { id: editId, ...payload, product_names: mappedProducts.map(p => p.product_name).join(', ') };
          }
          alert("Mold berhasil diperbarui (Lokal Simulat)");
        } else {
          const newId = currentMolds.length > 0 ? Math.max(...currentMolds.map(m => m.id)) + 1 : 1;
          currentMolds.push({ id: newId, ...payload, product_names: mappedProducts.map(p => p.product_name).join(', ') });
          alert("Mold baru berhasil ditambahkan (Lokal Simulat)");
        }
        localStorage.setItem("erp_epu_molds", JSON.stringify(currentMolds));
      }
      
      setIsModalOpen(false);
      setEditId(null);
      fetchMolds();
    } catch (err: any) {
      console.error("Save Error:", err);
      alert(err.message || "Gagal menyimpan Mold");
    }
  };

  // ─── Edit Load Handler ─────────────────────────────────────────────────────
  const handleEdit = async (moldItem: Mold) => {
    setEditId(moldItem.id || null);
    setForm({
      code: moldItem.code,
      name: moldItem.name,
      description: moldItem.description || "",
      is_active: Number(moldItem.is_active) === 1
    });

    setMappedProducts([]);
    setProdSearch("");
    setProdSearchResults([]);

    if (moldItem.id) {
      const res = await api.express.get(`/manufacturing/molds/${moldItem.id}/products`).catch(() => null);
      if (res && res.data && res.data.success) {
        setMappedProducts(res.data.data || []);
      }
    }
    setIsModalOpen(true);
  };

  const handleSearchProducts = async (q: string) => {
    if (!q || q.trim().length < 2) {
      setProdSearchResults([]);
      return;
    }
    try {
      const res = await api.express.get("/products", { limit: 15, search: q }).catch(() => null);
      if (res && res.data && res.data.success) {
        setProdSearchResults(res.data.data || []);
      }
    } catch (err) {
      console.error("Search products error:", err);
    }
  };

  const handleLinkProduct = async (product: any) => {
    if (!editId) {
      setMappedProducts(prev => {
        if (prev.some(p => p.id === product.id)) return prev;
        return [...prev, product];
      });
      return;
    }
    try {
      const res = await api.express.post(`/manufacturing/molds/${editId}/products`, { product_id: product.id }).catch(() => null);
      if (res && res.data && res.data.success) {
        setMappedProducts(prev => {
          if (prev.some(p => p.id === product.id)) return prev;
          return [...prev, product];
        });
        setProdSearch("");
        setProdSearchResults([]);
        fetchMolds();
      }
    } catch (err) {
      console.error("Link product error:", err);
    }
  };

  const handleUnlinkProduct = (productId: number) => {
    setMappedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleUpdateMappedProducts = (selectedIds: any[]) => {
    const numericIds = (selectedIds || []).map(id => Number(id));
    const newMapped = allFinishedGoods.filter(p => numericIds.includes(p.id));
    setMappedProducts(newMapped);
  };

  // ─── Delete Handler ────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus Mold ini?")) {
      return;
    }

    try {
      const res = await api.express.delete(`/manufacturing/molds/${id}`).catch(() => null);
      if (res && res.data && res.data.success) {
        alert("Mold berhasil dihapus!");
      } else {
        // Fallback local delete
        // Check if mold is used in plans
        const used = plans.some(p => p.moldId === id);
        if (used) {
          alert("Gagal menghapus: Mold sedang dijadwalkan pada MPP.");
          return;
        }
        const updated = molds.filter(m => m.id !== id);
        localStorage.setItem("erp_epu_molds", JSON.stringify(updated));
        alert("Mold berhasil dihapus (Lokal Simulat)");
      }
      fetchMolds();
    } catch (err: any) {
      console.error("Delete Error:", err);
      alert(err.message || "Gagal menghapus Mold");
    }
  };

  // ─── Search & Pagination Math ──────────────────────────────────────────────
  const filteredMolds = molds.filter(m => 
    m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalRecords = filteredMolds.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMolds = filteredMolds.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (isActive: boolean | number) => {
    const active = Number(isActive) === 1;
    return active ? (
      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-max">
        <CheckCircle2 size={10} /> Aktif
      </span>
    ) : (
      <span className="px-3 py-1 bg-rose-50 text-rose-500 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-max">
        <XCircle size={10} /> Non-Aktif
      </span>
    );
  };

  // ─── Generate Timeline Dates ──────────────────────────────────────────────
  const getTimelineDates = () => {
    const dates = [];
    const count = timelineFrame === "week" ? 7 : 30;
    const today = new Date();
    
    for (let i = 0; i < count; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateString = d.toISOString().split("T")[0]; // YYYY-MM-DD
      const label = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      const dayName = d.toLocaleDateString("id-ID", { weekday: "short" });
      dates.push({ dateString, label, dayName });
    }
    return dates;
  };

  const timelineDates = getTimelineDates();

  // Check if a mold is scheduled on a specific date
  const getPlanForMoldOnDate = (mold: Mold, dateStr: string) => {
    return plans.find(p => {
      // Find by moldId or moldCode match
      const isMatch = p.moldId === mold.id || p.moldCode === mold.code;
      if (!isMatch) return false;

      const start = new Date(p.startDate);
      const end = new Date(p.endDate);
      const current = new Date(dateStr);
      
      // Normalize time for comparison
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      current.setHours(12,0,0,0);

      return current >= start && current <= end;
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-violet-700 rounded-2xl shadow-lg shadow-indigo-200">
              <Layers className="text-white" size={26} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">
              Daftar <span className="text-indigo-600">Mold (Cetakan)</span>
            </h1>
          </div>
          <p className="text-gray-500 text-sm font-semibold ml-1">
            Manufacturing &raquo; Kelola master data cetakan (mold) dan pantau jadwal penjadwalannya.
          </p>
        </div>

        {view === "list" ? (
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
              <button
                onClick={() => setActiveTab("data")}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === "data" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-700"
                }`}
              >
                Data List
              </button>
              <button
                onClick={() => setActiveTab("timeline")}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === "timeline" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-700"
                }`}
              >
                Dashboard Timeline
              </button>
            </div>

            <button
              onClick={() => {
                setEditId(null);
                setForm({
                  code: "",
                  name: "",
                  description: "",
                  is_active: true
                });
                setMappedProducts([]);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-100 hover:shadow-indigo-200 active:scale-95 overflow-hidden"
            >
              <Plus size={16} strokeWidth={3} />
              <span>Tambah Mold</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setView("list")}
            className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
          >
            <ArrowLeft size={14} /> Kembali ke Daftar
          </button>
        )}
      </div>

      {/* ─── A. LIST VIEW SCREEN ───────────────────────────────────────────── */}
      {view === "list" && activeTab === "data" && (
        <div className="space-y-6">
          {/* Filter search bar */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari Kode Mold, Nama, atau Keterangan..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-xl">
                Master Data Mold
              </span>
            </div>
          </div>

          {/* Molds CRUD Table */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden min-h-[300px] flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">ID</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-48">Kode Mold</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-64">Nama Mold</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Produk yang Dihasilkan</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-32">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-24">Ubah</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-24">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={8} className="px-6 py-5"><div className="h-10 bg-gray-50 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : paginatedMolds.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-20 text-center font-bold text-gray-400 uppercase tracking-widest text-sm bg-gray-50/30">
                        Tidak Ada Daftar Mold
                      </td>
                    </tr>
                  ) : paginatedMolds.map((moldItem) => (
                    <tr key={moldItem.id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-6 py-4.5 font-bold text-gray-400 text-xs">
                        #{moldItem.id}
                      </td>
                      <td className="px-6 py-4.5">
                        <span 
                          onClick={() => handleEdit(moldItem)}
                          className="font-black text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer text-sm"
                        >
                          {moldItem.code}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 font-bold text-gray-700">
                        {moldItem.name}
                      </td>
                      <td className="px-6 py-4.5 text-xs text-gray-700 font-semibold max-w-xs">
                        {moldItem.product_names ? (
                          <div className="flex flex-wrap gap-1">
                            {moldItem.product_names.split(', ').map((pName: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-bold">
                                {pName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300 italic">Belum ada produk</span>
                        )}
                      </td>
                      <td className="px-6 py-4.5 text-xs text-gray-400 font-semibold max-w-sm truncate" title={moldItem.description}>
                        {moldItem.description || "-"}
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <div className="flex justify-center">
                          {getStatusBadge(moldItem.is_active)}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <button
                          onClick={() => handleEdit(moldItem)}
                          className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-500 hover:text-white transition-all inline-flex items-center justify-center border border-blue-100 shadow-sm shadow-blue-50"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <button
                          onClick={() => moldItem.id && handleDelete(moldItem.id)}
                          className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-500 hover:text-white transition-all inline-flex items-center justify-center border border-rose-100 shadow-sm shadow-rose-50"
                        >
                          <Trash2 size={14} strokeWidth={2.5} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination block */}
            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Total Record: {totalRecords}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-600 uppercase transition-all disabled:opacity-40"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-600 uppercase transition-all disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                  {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => (prev * itemsPerPage < totalRecords ? prev + 1 : prev))}
                  disabled={currentPage * itemsPerPage >= totalRecords}
                  className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-600 uppercase transition-all disabled:opacity-40"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(Math.ceil(totalRecords / itemsPerPage))}
                  disabled={currentPage * itemsPerPage >= totalRecords}
                  className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-600 uppercase transition-all disabled:opacity-40"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── B. TIMELINE VIEW SCREEN ───────────────────────────────────────── */}
      {view === "list" && activeTab === "timeline" && (
        <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-6 space-y-6 overflow-hidden">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <Calendar className="text-indigo-600" size={18} />
              <h3 className="font-black text-gray-800 uppercase tracking-widest text-xs">
                Timeline Penggunaan Mold
              </h3>
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
              <button
                onClick={() => setTimelineFrame("week")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  timelineFrame === "week" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-700"
                }`}
              >
                1 Minggu
              </button>
              <button
                onClick={() => setTimelineFrame("month")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  timelineFrame === "month" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-700"
                }`}
              >
                1 Bulan
              </button>
            </div>
          </div>

          {/* Timeline Grid Table */}
          <div className="overflow-x-auto">
            <div className="min-w-max">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest w-48 text-left sticky left-0 bg-gray-50 z-10 border-r border-gray-100">
                      Mold / Cetakan
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
                  {molds.map((mold, moldIdx) => (
                    <tr key={mold.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-4 font-bold text-xs text-gray-700 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                        <p className="font-extrabold text-gray-900 line-clamp-1">{mold.name}</p>
                        <p className="text-[9px] text-gray-400 uppercase font-black tracking-wider mt-0.5">{mold.code}</p>
                      </td>
                      
                      {timelineDates.map((d, idx) => {
                        const plan = getPlanForMoldOnDate(mold, d.dateString);
                        
                        return (
                          <td key={idx} className="p-1 border-r border-gray-100 text-center align-middle h-16 w-24 relative group/cell hover:z-30">
                            {plan ? (
                              <div 
                                className={`h-full w-full rounded-xl p-1.5 flex flex-col justify-between text-left transition-all hover:scale-[1.02] shadow-sm select-none cursor-pointer ${
                                  plan.status === "Selesai" 
                                    ? "bg-emerald-500 text-white" 
                                    : plan.status === "Berjalan" 
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
                                <span className="text-[7px] font-black opacity-80 uppercase block truncate">
                                  {plan.machineCode}
                                </span>

                                {/* Tooltip popover on hover */}
                                <div className={`absolute hidden group-hover/cell:block left-1/2 -translate-x-1/2 w-56 bg-slate-900 text-white p-3 rounded-xl text-[10px] leading-relaxed shadow-xl z-20 font-semibold border border-slate-800 ${
                                  moldIdx < 2 ? "top-full mt-2" : "bottom-full mb-2"
                                }`}>
                                  <div className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent ${
                                    moldIdx < 2 ? "bottom-full border-b-4 border-b-slate-900" : "top-full border-t-4 border-t-slate-900"
                                  }`}></div>
                                  <p className="font-black text-indigo-400 text-xs border-b border-slate-800 pb-1 mb-1">{plan.proCode}</p>
                                  <p><span className="text-gray-400 font-bold">Item:</span> {plan.productName}</p>
                                  <p><span className="text-gray-400 font-bold">Qty:</span> {plan.targetQty.toLocaleString()} Pcs</p>
                                  <p><span className="text-gray-400 font-bold">Mesin:</span> {plan.machineCode}</p>
                                  <p><span className="text-gray-400 font-bold">Waktu:</span> {plan.startDate} s/d {plan.endDate}</p>
                                  <p><span className="text-gray-400 font-bold">Status:</span> {plan.status}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full w-full border border-dashed border-gray-100 rounded-xl flex items-center justify-center text-[9px] text-gray-200 hover:border-gray-200 transition-colors">
                                Kosong
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

      {/* ─── C. FORM POP-UP MODAL ───────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl border border-gray-100 shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <SlidersHorizontal size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">{editId ? "Ubah Data Mold" : "Tambah Mold Baru"}</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">Kelola informasi cetakan (mold) dan pemetaan produk FG</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                [X]
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kode Mold</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Contoh: MOLD-HOLDER-RH"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Mold</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Contoh: Mold Holder Mirror RH 29702"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan / Spesifikasi</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Tulis deskripsi mold, dimensi, atau nomor cetakan..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold outline-none h-24 resize-none"
                  />
                </div>

                <div className="border-t border-gray-150 pt-4 space-y-4">
                  <div className="flex items-center gap-1.5 pb-1">
                    <Layers3 size={14} className="text-indigo-500" />
                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">Produk yang Dihasilkan Mold Ini</h4>
                  </div>

                  {/* List of mapped products */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {mappedProducts.length === 0 ? (
                      <p className="text-xs text-gray-400 italic font-semibold">Belum ada produk yang dipetakan untuk mold ini.</p>
                    ) : (
                      mappedProducts.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                          <div className="text-left">
                            <p className="text-xs font-black text-gray-800">{p.product_name}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{p.product_code}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUnlinkProduct(p.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Searchable Select component for finished goods products */}
                  <div className="relative">
                    <SearchableSelect
                      options={allFinishedGoods.map(p => ({
                        value: p.id,
                        label: `[${p.product_code || "TANPA KODE"}] ${p.product_name}`
                      }))}
                      value={mappedProducts.map(p => p.id)}
                      isMulti={true}
                      onChange={handleUpdateMappedProducts}
                      placeholder="Pilih & tambah produk finished goods..."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 border-t border-gray-50 pt-4">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status:</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-gray-700">
                      <input
                        type="radio"
                        name="is_active"
                        checked={!!form.is_active}
                        onChange={() => setForm(prev => ({ ...prev, is_active: true }))}
                        className="w-4 h-4 accent-indigo-600 cursor-pointer"
                      />
                      <span>Aktif</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-gray-700">
                      <input
                        type="radio"
                        name="is_active"
                        checked={!form.is_active}
                        onChange={() => setForm(prev => ({ ...prev, is_active: false }))}
                        className="w-4 h-4 accent-indigo-600 cursor-pointer"
                      />
                      <span>Non-Aktif</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 hover:shadow-indigo-200 flex items-center justify-center gap-2"
                >
                  <Check size={14} strokeWidth={3} />
                  <span>Simpan Data Mold</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
