"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Edit2, Trash2, BarChart2, X, Trash, ArrowLeft, Eye, Calendar, ShieldCheck, Tag, FileText, CheckCircle2, Layers, TrendingUp, Percent, DollarSign, ArrowUpDown, Filter, PackageCheck, Target, Building2, Calculator, RotateCw, Save, Hash } from "lucide-react";
import api from "@/lib/api";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import SortFilterModal, { SortOption } from "@/components/ui/SortFilterModal";
import ProductSearchDropdown, { type ProductOption } from "@/components/ui/ProductSearchDropdown";

type ForecastDetail = {
  id?: number;
  product_id?: number | null;
  product_name: string;
  product_code?: string | null;
  product_unit?: string | null;
  forecast_qty: number;
  price: number;
  target_date?: string | null;
  confidence_level?: number;
  weighted_amount?: number;
  min_qty?: number;
  max_qty?: number;
  remark?: string | null;
};

type Forecast = {
  id?: number;
  reference?: string;
  forecast_type?: string;
  customer_id: number | "";
  customer_name?: string;
  doc_date: string;
  start_date: string;
  end_date: string;
  salesman_id: number | "";
  salesman_name?: string;
  warehouse_id: number | "";
  warehouse_name?: string;
  currency_id: number | "";
  currency_code?: string;
  exchange_rate: number;
  total_qty?: number;
  total_amount?: number;
  fulfilled_amount?: number;
  fulfilled_qty?: number;
  confidence_level?: number;
  weighted_amount?: number;
  revision_number?: string;
  month?: number;
  year?: number;
  note?: string;
  status: string;
  details: ForecastDetail[];
  created_at?: string;
};

const emptyForecast = (): Forecast => {
  const today = new Date().toISOString().split("T")[0];
  const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
  return {
    forecast_type: "Sales Forecast",
    customer_id: "",
    doc_date: today,
    start_date: today,
    end_date: nextMonth,
    salesman_id: "",
    warehouse_id: "",
    currency_id: "",
    exchange_rate: 1,
    confidence_level: 100,
    revision_number: "V1.0",
    note: "",
    status: "None",
    details: [],
  };
};

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const renderStatusBadge = (status?: string) => {
  switch (status) {
    case "Waiting for Approval":
    case "Pending":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          Waiting for Approval
        </span>
      );
    case "Approved":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Approved
        </span>
      );
    case "Rejected":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          Rejected
        </span>
      );
    case "None":
    default:
      return null;
  }
};

export default function ForecastPage() {
  const [data, setData] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<number | "all">("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string | number>("all");
  const [selectedChartYear, setSelectedChartYear] = useState(new Date().getFullYear());
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; order: "asc" | "desc" }>({ key: "id", order: "desc" });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const { isOpen, type, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading } = useStatusModal();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedForecast, setSelectedForecast] = useState<Forecast | null>(null);
  const [formData, setFormData] = useState<Forecast>(emptyForecast());

  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [currencyRates, setCurrencyRates] = useState<Record<string, number>>({});

  const fetchDropdowns = async () => {
    try {
      const [custRes, prodRes, salesRes, whRes, curRes] = await Promise.all([
        api.express.get("/customers-list"),
        api.express.get("/products", { limit: 9999 }),
        api.express.get("/salesman", { limit: 9999 }),
        api.express.get("/warehouses", { limit: 9999 }),
        api.express.get("/currencies")
      ]);
      setCustomers((custRes.data.data || []).map((c: any) => ({ value: c.id, label: c.customer_name })));
      setProducts(prodRes.data.data || []);
      setSalesmen((salesRes.data.data || []).map((s: any) => ({ value: s.id, label: s.code ? `${s.code} - ${s.name}` : s.name })));
      setWarehouses((whRes.data.data || []).map((w: any) => ({ value: w.id, label: `${w.code} - ${w.name}` })));
      const curList = curRes.data.data || [];
      setCurrencies(curList.map((c: any) => ({ value: c.id, label: `${c.code} - ${c.currency_name}` })));
      setCurrencyRates(Object.fromEntries(curList.map((c: any) => [String(c.id), Number(c.exchange_rate) || 1])));
    } catch (err) {
      console.error("Error fetching dropdown data:", err);
    }
  };

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.express.get("/forecasts", { page: p, search, limit: 9999 });
      setData(res.data.data || []);
      setPage(res.data.current_page || 1);
      setTotalPages(res.data.last_page || 1);
      setTotalItems(res.data.total || (res.data.data ? res.data.data.length : 0));
    } catch { 
      setData([]); 
      setTotalItems(0);
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchDropdowns();
    const t = setTimeout(() => fetchData(1), 400); 
    return () => clearTimeout(t); 
  }, [search]);

  const handleOpenCreate = () => {
    setFormData(emptyForecast());
    setSelectedForecast(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (id: number) => {
    try {
      const res = await api.express.get(`/forecasts/${id}`);
      if (res.data.success) {
        const d = res.data.data;
        const defaultStart = d.start_date ? d.start_date.split("T")[0] : (d.doc_date ? d.doc_date.split("T")[0] : new Date().toISOString().split("T")[0]);
        const defaultEnd = d.end_date ? d.end_date.split("T")[0] : new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
        const getCalculatedRevisionOnEdit = (f: any): string => {
          const rev = f.revision_number || "V1.0";
          const st = f.status || "None";
          const match = rev.match(/^V?(\d+)(\.(\d+))?$/i);
          const major = match ? parseInt(match[1], 10) : 1;
          const minor = match && match[3] !== undefined ? parseInt(match[3], 10) : 0;

          if (st === "Approved" || st === "Approved Direct" || st === "Selesai") {
            // Already approved: increment major version (e.g. V1.0 -> V2.0)
            return `V${major + 1}.0`;
          } else if (st === "Waiting for Approval" || st === "Pending" || st === "Draft") {
            // Pending approval: keep same revision
            return rev;
          } else {
            // No approval system used (None): increment minor version (e.g. V1.0 -> V1.1)
            return `V${major}.${minor + 1}`;
          }
        };

        setFormData({
          ...emptyForecast(),
          ...d,
          doc_date: d.doc_date ? d.doc_date.split("T")[0] : new Date().toISOString().split("T")[0],
          start_date: defaultStart,
          end_date: defaultEnd,
          forecast_type: d.forecast_type || "Sales Forecast",
          confidence_level: Number(d.confidence_level ?? 100),
          revision_number: getCalculatedRevisionOnEdit(d),
          salesman_id: d.salesman_id ?? "",
          warehouse_id: d.warehouse_id ?? "",
          currency_id: d.currency_id ?? "",
          exchange_rate: Number(d.exchange_rate) || 1,
          details: (d.details || []).map((it: any) => ({
            ...it,
            price: Number(it.price) || 0,
            forecast_qty: Number(it.forecast_qty) || 1,
            confidence_level: Number(it.confidence_level ?? 100),
            target_date: it.target_date ? it.target_date.split("T")[0] : "",
          })),
        });
        setSelectedForecast(d);
        setIsModalOpen(true);
      }
    } catch (err: any) {
      showError("Error", err.message || "Failed to load details.");
    }
  };

  const handleOpenDetail = async (id: number) => {
    try {
      const res = await api.express.get(`/forecasts/${id}`);
      if (res.data.success) {
        setSelectedForecast(res.data.data);
        setIsDetailOpen(true);
      }
    } catch (err: any) {
      showError("Error", err.message || "Failed to load details.");
    }
  };

  const isSingleItem = formData.details.length <= 1;

  const grandTotal = formData.details.reduce((s, i) => s + Number(i.forecast_qty || 0) * Number(i.price || 0), 0);
  const totalQty = formData.details.reduce((s, i) => s + Number(i.forecast_qty || 0), 0);
  const totalWeighted = formData.details.reduce((s, i) => {
    const sub = Number(i.forecast_qty || 0) * Number(i.price || 0);
    const conf = Number(i.confidence_level ?? 100);
    return s + (sub * conf) / 100;
  }, 0);

  const computedHeaderConfidence = () => {
    if (isSingleItem) {
      return formData.confidence_level ?? 100;
    }
    if (grandTotal > 0) {
      return Math.round((totalWeighted / grandTotal) * 100);
    }
    if (formData.details.length > 0) {
      const sum = formData.details.reduce((s, i) => s + Number(i.confidence_level ?? 100), 0);
      return Math.round(sum / formData.details.length);
    }
    return 100;
  };

  const handleApplyHeaderConfToAll = () => {
    const targetConf = isSingleItem ? (formData.confidence_level ?? 100) : computedHeaderConfidence();
    setFormData(prev => ({
      ...prev,
      confidence_level: targetConf,
      details: prev.details.map(d => ({ ...d, confidence_level: targetConf }))
    }));
  };

  const handleHeaderConfidenceChange = (val: number) => {
    setFormData(prev => {
      const nextDetails = [...prev.details];
      if (nextDetails.length === 1) {
        nextDetails[0] = { ...nextDetails[0], confidence_level: val };
      }
      return {
        ...prev,
        confidence_level: val,
        details: nextDetails
      };
    });
  };

  const handleAddRow = () => {
    setFormData(prev => ({
      ...prev,
      details: [
        ...prev.details,
        {
          product_id: null,
          product_name: "",
          product_code: "",
          forecast_qty: 0,
          price: 0,
          confidence_level: prev.confidence_level ?? 100,
          remark: ""
        }
      ]
    }));
  };

  const handleRemoveRow = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.filter((_, i) => i !== idx)
    }));
  };

  const handleItemChange = (idx: number, key: string, val: any) => {
    setFormData(prev => {
      const next = [...prev.details];
      next[idx] = {
        ...next[idx],
        [key]: val
      };
      return {
        ...prev,
        details: next
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) return showError("Validation Error", "Pilih customer terlebih dahulu.");
    if (!formData.start_date || !formData.end_date) return showError("Validation Error", "Tanggal Mulai & Akhir Periode Wajib diisi.");
    if (new Date(formData.end_date) < new Date(formData.start_date)) return showError("Validation Error", "Tanggal Akhir Periode tidak boleh lebih awal dari Tanggal Mulai Periode.");
    if (formData.details.length === 0) return showError("Validation Error", "Tambahkan minimal satu item detail forecast.");
    if (formData.details.some(item => !item.product_id)) return showError("Validation Error", "Semua baris item harus memilih produk.");

    const finalHeaderConfidence = isSingleItem ? (formData.confidence_level ?? 100) : computedHeaderConfidence();
    const payload = {
      ...formData,
      warehouse_id: formData.warehouse_id ? Number(formData.warehouse_id) : null,
      salesman_id: formData.salesman_id ? Number(formData.salesman_id) : null,
      customer_id: formData.customer_id ? Number(formData.customer_id) : null,
      confidence_level: finalHeaderConfidence,
      items: formData.details
    };

    try {
      if (selectedForecast?.id) {
        await api.express.put(`/forecasts/${selectedForecast.id}`, payload);
        showSuccess("Success", "Forecast berhasil diperbarui.");
      } else {
        const res = await api.express.post("/forecasts", payload);
        const savedStatus = res.data.status || "None";
        if (savedStatus === "Waiting for Approval") {
          showSuccess("Submitted", "Forecast berhasil disimpan dengan status Waiting for Approval.");
        } else {
          showSuccess("Success", "Forecast berhasil disimpan.");
        }
      }
      setIsModalOpen(false);
      fetchData(page);
    } catch (err: any) {
      console.error("[FORECAST SAVE ERROR]", err);
      showError("Error", err.response?.data?.message || err.message || "Gagal menyimpan data.");
    }
  };

  const handleDelete = (id: number) => {
    showConfirm("Confirm Delete", "Apakah Anda yakin ingin menghapus data forecast ini?", async () => {
      try {
        await api.express.delete(`/forecasts/${id}`);
        showSuccess("Success", "Data forecast berhasil dihapus.");
        fetchData(page);
      } catch (err: any) {
        showError("Error", err.response?.data?.message || err.message || "Gagal menghapus data.");
      }
    });
  };

  const monthlyChartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const mNum = i + 1;
      const itemsInMonth = data.filter((d) => {
        const itemDate = d.start_date ? new Date(d.start_date) : null;
        const itemMonth = itemDate ? itemDate.getMonth() + 1 : Number(d.month || 0);
        const itemYear = itemDate ? itemDate.getFullYear() : Number(d.year || 0);
        const matchesMonth = itemMonth === mNum;
        const matchesYear = selectedChartYear ? itemYear === selectedChartYear : true;
        return matchesMonth && matchesYear;
      });

      const gross = itemsInMonth.reduce((s, d) => s + Number(d.total_amount || 0), 0);
      const weighted = itemsInMonth.reduce((s, d) => s + Number(d.weighted_amount || d.total_amount || 0), 0);
      const fulfilled = itemsInMonth.reduce((s, d) => s + Number(d.fulfilled_amount || 0), 0);

      return {
        monthIndex: mNum,
        monthLabel: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][i],
        fullName: MONTH_NAMES[i],
        gross,
        weighted,
        fulfilled,
        count: itemsInMonth.length,
      };
    });
  }, [data, selectedChartYear]);

  const maxChartVal = useMemo(() => {
    const maxVal = Math.max(...monthlyChartData.map((m) => Math.max(m.gross, m.weighted, m.fulfilled)), 1);
    return maxVal;
  }, [monthlyChartData]);

  const containerFilteredData = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (selectedMonthFilter !== "all") {
        const itemDate = item.start_date ? new Date(item.start_date) : null;
        const itemMonth = itemDate ? itemDate.getMonth() + 1 : Number(item.month || 0);
        if (itemMonth !== selectedMonthFilter) return false;
      }
      return true;
    });
  }, [data, statusFilter, selectedMonthFilter]);

  const totalGrossAmount = useMemo(() => containerFilteredData.reduce((s, d) => s + Number(d.total_amount || 0), 0), [containerFilteredData]);
  const totalWeightedAmount = useMemo(() => containerFilteredData.reduce((s, d) => s + Number(d.weighted_amount || d.total_amount || 0), 0), [containerFilteredData]);
  const totalFulfilledAmount = useMemo(() => containerFilteredData.reduce((s, d) => s + Number(d.fulfilled_amount || 0), 0), [containerFilteredData]);
  const fulfillmentPercentage = useMemo(() => {
    if (totalGrossAmount <= 0) return 0;
    return Math.min(100, Math.round((totalFulfilledAmount / totalGrossAmount) * 100));
  }, [totalGrossAmount, totalFulfilledAmount]);

  const filteredAndSortedData = useMemo(() => {
    let result = data.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (selectedMonthFilter !== "all") {
        const dateStr = item.start_date || item.doc_date || item.created_at;
        const itemDate = dateStr ? new Date(dateStr) : null;
        const itemMonth = itemDate ? itemDate.getMonth() + 1 : 0;
        if (itemMonth !== selectedMonthFilter) return false;
      }
      if (yearFilter !== "all") {
        const dateStr = item.start_date || item.doc_date || item.created_at;
        const itemYear = dateStr ? new Date(dateStr).getFullYear().toString() : "";
        if (itemYear !== yearFilter) return false;
      }
      if (customerFilter !== "all") {
        if (String(item.customer_id) !== String(customerFilter)) return false;
      }
      return true;
    });

    return result.sort((a, b) => {
      let aVal = (a as any)[sortConfig.key];
      let bVal = (b as any)[sortConfig.key];

      if (sortConfig.key === "total_amount" || sortConfig.key === "fulfilled_amount" || sortConfig.key === "id") {
        const numA = Number(aVal || 0);
        const numB = Number(bVal || 0);
        return sortConfig.order === "asc" ? numA - numB : numB - numA;
      }

      aVal = String(aVal || "").toLowerCase();
      bVal = String(bVal || "").toLowerCase();
      return sortConfig.order === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [data, statusFilter, selectedMonthFilter, yearFilter, customerFilter, sortConfig]);

  const activeFilterCount = [
    statusFilter !== "all",
    selectedMonthFilter !== "all",
    yearFilter !== "all",
    customerFilter !== "all",
    sortConfig.key !== "id" || sortConfig.order !== "desc"
  ].filter(Boolean).length;

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-300">
      <StatusModal isOpen={isOpen} type={type} title={title} message={message} onConfirm={onConfirm} onClose={closeModal} isLoading={isActionLoading} />
      <SortFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Sort & Filter Sales Forecast"
        subtitle="Sesuaikan tampilan proyeksi kebutuhan customer"
        sortOptions={[
          { key: "id", order: "desc", label: "Terbaru (Default)", icon: Calendar },
          { key: "id", order: "asc", label: "Terlama", icon: Calendar },
          { key: "total_amount", order: "desc", label: "Proyeksi Demand Tertinggi", icon: DollarSign },
          { key: "total_amount", order: "asc", label: "Proyeksi Demand Terendah", icon: DollarSign },
          { key: "fulfilled_amount", order: "desc", label: "Realisasi PO Tertinggi", icon: TrendingUp },
          { key: "reference", order: "asc", label: "Referensi Kode (A-Z)", icon: Hash }
        ]}
        sortConfig={sortConfig}
        onSortChange={setSortConfig}
        statusOptions={[
          { value: "all", label: "Semua Status" },
          { value: "Approved", label: "Approved" },
          { value: "Draft", label: "Draft" },
          { value: "Waiting for Approval", label: "Menunggu Approval" },
          { value: "Rejected", label: "Rejected" }
        ]}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        monthFilter={selectedMonthFilter}
        setMonthFilter={(val) => setSelectedMonthFilter(val as any)}
        yearFilter={yearFilter}
        setYearFilter={(val) => setYearFilter(String(val))}
        customerOptions={[{ value: "all", label: "Semua Customer" }, ...customers]}
        customerFilter={customerFilter}
        setCustomerFilter={(val) => setCustomerFilter(val as any)}
        onReset={() => {
          setStatusFilter("all");
          setSelectedMonthFilter("all");
          setYearFilter("all");
          setCustomerFilter("all");
          setSortConfig({ key: "id", order: "desc" });
        }}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Forecast</h1>
          <p className="text-sm text-slate-500 mt-0.5">Daftar proyeksi kebutuhan dan estimasi demand produk.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={handleOpenCreate} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm active:scale-95">
            <Plus size={18} />
            <span>Tambah Forecast</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<TrendingUp size={18} />} iconBgColor="bg-slate-100" iconColor="text-slate-700" label="PROYEKSI DEMAND" value={`Rp ${totalGrossAmount.toLocaleString('id-ID')}`} />
        <StatCard icon={<Percent size={18} />} iconBgColor="bg-indigo-50" iconColor="text-indigo-600" label="ESTIMASI TERBOBOT" value={`Rp ${totalWeightedAmount.toLocaleString('id-ID')}`} />
        <StatCard icon={<PackageCheck size={18} />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" label="REALISASI PO" value={`Rp ${totalFulfilledAmount.toLocaleString('id-ID')}`} />
        <StatCard icon={<Target size={18} />} iconBgColor="bg-blue-50" iconColor="text-blue-600" label="PENCAPAIAN" value={`${fulfillmentPercentage}%`} />
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full">
            {[
              { key: "all", label: `Semua (${data.length})` },
              { key: "Approved", label: `Approved (${data.filter(d => d.status === 'Approved').length})` },
              { key: "Draft", label: `Draft (${data.filter(d => d.status === 'Draft').length})` },
              { key: "Waiting for Approval", label: `Menunggu Approval (${data.filter(d => d.status === 'Waiting for Approval' || d.status === 'Pending').length})` },
              { key: "Rejected", label: `Rejected (${data.filter(d => d.status === 'Rejected').length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  statusFilter === tab.key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <FilterBar
          searchPlaceholder="Cari referensi forecast atau nama customer..."
          searchValue={search}
          onSearchChange={setSearch}
          onFilterClick={() => setIsFilterModalOpen(true)}
          filterBadgeCount={activeFilterCount}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[380px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">No</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">No. Referensi</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Customer & Salesman</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Periode Forecast</th>
                <th className="px-5 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Nilai Forecast (Rp)</th>
                <th className="px-5 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Realisasi (PO)</th>
                <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400 text-sm">Memuat data forecast...</td></tr>
              ) : filteredAndSortedData.length > 0 ? (
                filteredAndSortedData.map((item, idx) => {
                  const grossVal = Number(item.total_amount || 0);
                  const fulfilledVal = Number(item.fulfilled_amount || 0);
                  const fulfilledPct = grossVal > 0 ? Math.min(100, Math.round((fulfilledVal / grossVal) * 100)) : 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-slate-400 font-mono">{(page - 1) * 10 + idx + 1}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 text-sm">{item.reference}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {item.forecast_type || "Sales Forecast"}
                          </span>
                          {item.revision_number && (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                              {item.revision_number}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800 text-sm">{item.customer_name || "-"}</div>
                        <div className="text-xs text-slate-400">{item.salesman_name ? `Sales: ${item.salesman_name}` : "-"}</div>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-slate-700">
                        {item.start_date ? (
                          <span>{item.start_date.split("T")[0]} s.d. {item.end_date ? item.end_date.split("T")[0] : "-"}</span>
                        ) : (
                          <span>{item.month}/{item.year}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900 text-sm">
                        {item.currency_code ? `${item.currency_code} ` : ""}
                        {grossVal.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="font-bold text-emerald-700 text-sm">
                          Rp {fulfilledVal.toLocaleString()}
                        </div>
                        <div className="text-[10px] font-medium text-slate-400">
                          {fulfilledPct}% Terpenuhi
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {renderStatusBadge(item.status)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => handleOpenDetail(item.id!)} title="Lihat Detail" className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"><Eye size={16} /></button>
                          <button onClick={() => handleOpenEdit(item.id!)} title="Edit Forecast" className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(item.id!)} title="Hapus" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <BarChart2 size={32} className="text-slate-300" />
                      <p className="font-semibold text-slate-600">Belum ada data Customer Forecast</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={fetchData} />
      </div>

      {/* FORM MODAL (CREATE / EDIT) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedForecast ? "Edit Customer Forecast" : "Tambah Customer Forecast"}
                </h3>
                <p className="text-xs text-slate-500 font-medium">Isi informasi header forecast dan daftar produk estimasi demand.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg transition-all">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header ERP Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Informasi Header & Periode
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
                  {/* Customer */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-700">Customer *</label>
                    <SearchableSelect
                      options={customers}
                      placeholder="Pilih Customer..."
                      value={formData.customer_id}
                      onChange={(val) => setFormData({ ...formData, customer_id: val })}
                    />
                  </div>

                  {/* Tanggal Dokumen */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Tanggal Dokumen *</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-400"
                      value={formData.doc_date}
                      onChange={(e) => setFormData({ ...formData, doc_date: e.target.value })}
                    />
                  </div>

                  {/* Salesman */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Salesman</label>
                    <SearchableSelect
                      options={salesmen}
                      placeholder="Pilih Salesman..."
                      value={formData.salesman_id}
                      onChange={(val) => setFormData({ ...formData, salesman_id: val })}
                    />
                  </div>

                  {/* Periode Forecast: Tanggal Mulai */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Tanggal Mulai Periode *</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-400"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>

                  {/* Periode Forecast: Tanggal Akhir */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Tanggal Akhir Periode *</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-400"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>

                  {/* Tipe Forecast */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Tipe Forecast</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-400"
                      value={formData.forecast_type || "Sales Forecast"}
                      onChange={(e) => setFormData({ ...formData, forecast_type: e.target.value })}
                    >
                      <option value="Sales Forecast">Sales Forecast</option>
                      <option value="Demand Forecast">Demand Forecast</option>
                      <option value="Production Forecast">Production Forecast</option>
                      <option value="Budget Forecast">Budget Forecast</option>
                    </select>
                  </div>



                  {/* Revision Number */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">No. Revisi Dokumen</label>
                    <input
                      type="text"
                      readOnly
                      placeholder="e.g. V1.0"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-xs font-mono font-bold text-slate-700 outline-none cursor-not-allowed"
                      value={formData.revision_number || "V1.0"}
                    />
                  </div>




                </div>
              </div>

              {/* Keterangan */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Catatan / Memo</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-medium outline-none resize-none"
                  placeholder="Keterangan tambahan forecast..."
                  value={formData.note || ""}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </div>

              {/* Detail Items Section */}
              <div className="border-t border-slate-200 pt-5">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Daftar Item Forecast & Demand
                  </h4>
                  <button type="button" onClick={handleAddRow} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1">
                    <Plus size={14} /> Tambah Item
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-xs min-w-[800px]">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase">
                      <tr>
                        <th className="px-3 py-2.5 text-left">Produk</th>
                        <th className="px-3 py-2.5 text-center w-20">Qty</th>
                        <th className="px-3 py-2.5 text-right w-28">Harga Est (Rp)</th>
                        <th className="px-3 py-2.5 text-right w-28">Subtotal</th>
                        <th className="px-3 py-2.5 text-left w-32">Remark</th>
                        <th className="px-3 py-2.5 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.details.map((item, idx) => {
                        const sub = Number(item.forecast_qty || 0) * Number(item.price || 0);
                        const conf = Number(item.confidence_level ?? (formData.confidence_level ?? 100));
                        const wAmt = (sub * conf) / 100;
                        return (
                          <tr key={idx}>
                            <td className="p-2">
                              <ProductSearchDropdown
                                products={products}
                                value={item.product_id || ""}
                                useSalePrice
                                onChange={(p) => {
                                  if (!p.id) return;
                                  const next = [...formData.details];
                                  next[idx] = {
                                    ...next[idx],
                                    product_id: p.id,
                                    product_name: p.product_name,
                                    product_code: p.product_code || "",
                                    product_unit: p.product_unit || "PCS",
                                    price: Number(p.sell_price_l1 || p.sale_price || p.product_price || 0) || next[idx].price || 0,
                                  };
                                  setFormData({ ...formData, details: next });
                                }}
                              />
                            </td>

                            <td className="p-2 text-center">
                              <input
                                type="number"
                                required
                                min={1}
                                className="w-full px-2 py-1 bg-slate-50 rounded text-center font-bold text-xs border border-slate-200"
                                value={item.forecast_qty}
                                onChange={(e) => handleItemChange(idx, "forecast_qty", Number(e.target.value))}
                              />
                            </td>
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                min={0}
                                className="w-full px-2 py-1 bg-slate-50 rounded text-right font-bold text-xs border border-slate-200"
                                value={item.price}
                                onChange={(e) => handleItemChange(idx, "price", Number(e.target.value))}
                              />
                            </td>
                            <td className="p-2 text-right font-bold text-slate-800 text-xs">
                              {sub.toLocaleString()}
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                placeholder="Remark..."
                                className="w-full px-2 py-1 bg-slate-50 rounded text-xs border border-slate-200"
                                value={item.remark || ""}
                                onChange={(e) => handleItemChange(idx, "remark", e.target.value)}
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button type="button" onClick={() => handleRemoveRow(idx)} className="p-1 text-slate-400 hover:text-red-600 rounded">
                                <Trash size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {formData.details.length === 0 && (
                        <tr>
                          <td colSpan={9} className="text-center py-6 text-slate-400 text-xs">
                            Belum ada item demand. Klik "Tambah Item" di atas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-8 pt-3">
                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-slate-500 block">Total Qty</span>
                    <span className="text-base font-bold text-slate-800">{totalQty.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-slate-500 block">Subtotal (Gross)</span>
                    <span className="text-base font-bold text-slate-900">Rp {grandTotal.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-blue-600 block">Total Terbobot (Weighted)</span>
                    <span className="text-lg font-bold text-blue-700">Rp {totalWeighted.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  Batal
                </button>
                <button type="submit" className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white shadow-sm">
                  Simpan Forecast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL VIEW MODAL */}
      {isDetailOpen && selectedForecast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {selectedForecast.forecast_type || "Sales Forecast"}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedForecast.reference}</h3>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold">Customer</span>
                  <span className="font-bold text-slate-900">{selectedForecast.customer_name || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Tanggal Dokumen</span>
                  <span className="font-bold text-slate-900">{selectedForecast.doc_date || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Periode Forecast</span>
                  <span className="font-bold text-slate-900">
                    {selectedForecast.start_date ? `${selectedForecast.start_date.split("T")[0]} s.d. ${selectedForecast.end_date ? selectedForecast.end_date.split("T")[0] : "-"}` : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Status Dokumen</span>
                  <div className="mt-0.5">{renderStatusBadge(selectedForecast.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-slate-400 block font-semibold">Tipe Forecast</span>
                  <span className="font-bold text-blue-700 text-base">{selectedForecast.forecast_type || "Sales Forecast"}</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-slate-400 block font-semibold">Total Forecast</span>
                  <span className="font-bold text-slate-900 text-base">
                    Rp {Number(selectedForecast.total_amount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50">
                  <span className="text-blue-700 block font-semibold">Realisasi Terpenuhi (PO)</span>
                  <span className="font-bold text-blue-800 text-base">
                    Rp {Number(selectedForecast.fulfilled_amount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Detail Item</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left">Produk</th>
                        <th className="px-3 py-2 text-right w-16">Qty</th>
                        <th className="px-3 py-2 text-right w-24">Harga Est</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedForecast.details?.map((item, idx) => {
                        return (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-semibold text-slate-900">{item.product_name}</td>
                            <td className="px-3 py-2 text-right font-bold">{Number(item.forecast_qty || 0).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">{Number(item.price || 0).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button onClick={() => setIsDetailOpen(false)} className="px-5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
