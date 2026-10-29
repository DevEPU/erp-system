"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Edit2, Trash2, ClipboardList, X, Trash, Eye, Download, Calendar, ArrowUpDown, Filter, TrendingUp, Percent, CheckCircle2, PackageCheck, Target, Layers, FileText, FileSpreadsheet, Building2, Calculator, RotateCw, DollarSign, Hash, Save } from "lucide-react";
import api from "@/lib/api";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import SortFilterModal, { SortOption } from "@/components/ui/SortFilterModal";
import ProductSearchDropdown, { type ProductOption } from "@/components/ui/ProductSearchDropdown";
import { useForecastEnabled, usePOCustomerV12Enabled } from "@/lib/config";

type PODetail = {
  id?: number;
  forecast_detail_id?: number | null;
  product_id?: number | null;
  product_name: string;
  product_code?: string | null;
  product_unit?: string | null;
  po_qty: number;
  price: number;
  discount_percent: number;
  discount_amount: number;
  sub_total?: number;
  remark?: string | null;
  forecast_ref?: string;
  remaining_qty?: number;
};

type CustomerPO = {
  id?: number;
  reference?: string;
  customer_id: number | "";
  customer_name?: string;
  customer_address?: string;
  salesman_id: number | "";
  salesman_name?: string;
  no_po_customer: string;
  po_type: string;
  tanggal_po: string;
  delivery_date: string;
  ship_to_address: string;
  shipping_method: string;
  bill_to_address: string;
  contact_person: string;
  contact_phone: string;
  top_days: number;
  due_date: string;
  currency_id: number | "";
  currency_code?: string;
  exchange_rate: number;
  payment_method: string;
  sub_total?: number;
  discount_percent: number;
  discount_amount?: number;
  tax_percent: number;
  tax_amount?: number;
  shipping_cost: number;
  grand_total?: number;
  fulfilled_amount?: number;
  note?: string;
  status: string;
  details: PODetail[];
};

const todayISO = () => new Date().toISOString().split("T")[0];

const emptyPO = (): CustomerPO => ({
  customer_id: "",
  salesman_id: "",
  no_po_customer: "",
  po_type: "Regular Order",
  tanggal_po: todayISO(),
  delivery_date: todayISO(),
  ship_to_address: "",
  shipping_method: "Franco",
  bill_to_address: "",
  contact_person: "",
  contact_phone: "",
  top_days: 0,
  due_date: todayISO(),
  currency_id: "",
  exchange_rate: 1,
  payment_method: "Transfer Bank",
  discount_percent: 0,
  tax_percent: 11,
  shipping_cost: 0,
  note: "",
  status: "None",
  details: [],
});

const addDays = (dateStr: string, days: number) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString().split("T")[0];
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

export default function CustomerPOPage() {
  const isForecastEnabled = useForecastEnabled();
  const isPoCustomerV12Enabled = usePOCustomerV12Enabled();
  const [data, setData] = useState<CustomerPO[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<number | "all">("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [selectedChartYear, setSelectedChartYear] = useState(new Date().getFullYear());
  const [customerFilter, setCustomerFilter] = useState<string | number>("all");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; order: "asc" | "desc" }>({ key: "id", order: "desc" });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const { isOpen, type, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading } = useStatusModal();

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isForecastPullOpen, setIsForecastPullOpen] = useState(false);
  
  const [selectedPO, setSelectedPO] = useState<CustomerPO | null>(null);
  const [formData, setFormData] = useState<CustomerPO>(emptyPO());

  // Dropdown & Pull State
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerMap, setCustomerMap] = useState<Record<string, { name?: string; address?: string; top_days?: number }>>({});
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [currencyRates, setCurrencyRates] = useState<Record<string, number>>({});
  
  // Forecast source list
  const [customerForecasts, setCustomerForecasts] = useState<any[]>([]);
  const [availableForecastItems, setAvailableForecastItems] = useState<any[]>([]);
  const [selectedPullItems, setSelectedPullItems] = useState<number[]>([]);

  const fetchDropdowns = async () => {
    try {
      const [custRes, prodRes, salesRes, curRes] = await Promise.all([
        api.express.get("/customers-list"),
        api.express.get("/products", { limit: 9999 }),
        api.express.get("/salesman", { limit: 9999 }),
        api.express.get("/currencies")
      ]);
      const custList = custRes.data.data || [];
      setCustomers(custList.map((c: any) => ({ value: c.id, label: c.customer_name })));
      setCustomerMap(Object.fromEntries(custList.map((c: any) => [String(c.id), { name: c.customer_name, address: c.address, top_days: c.top_days != null ? Number(c.top_days) : 30 }])));
      setProducts(prodRes.data.data || []);
      setSalesmen((salesRes.data.data || []).map((s: any) => ({ value: s.id, label: s.code ? `${s.code} - ${s.name}` : s.name })));
      const curList = curRes.data.data || curRes.data || [];
      setCurrencies(curList.map((c: any) => ({ value: c.id, label: `${c.code} - ${c.currency_name}` })));
      setCurrencyRates(Object.fromEntries(curList.map((c: any) => [String(c.id), Number(c.exchange_rate) || 1])));
    } catch (err) {
      console.error("Error fetching dropdown data:", err);
    }
  };

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.express.get("/customer-po", { page: p, search, limit: 9999 });
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

  // Load available forecast items & source forecasts when customer is selected
  const loadCustomerForecastSources = async (customerId: number) => {
    try {
      const docsRes = await api.express.get("/forecasts", { params: { customer_id: customerId, limit: 1000 } });
      if (docsRes.data.success) {
        setCustomerForecasts((docsRes.data.data || []).map((d: any) => ({
          value: d.id,
          label: `${d.reference} (${d.start_date ? d.start_date.split("T")[0] : d.month})`
        })));
      }

      const res = await api.express.get(`/customer-po/forecast-items?customer_id=${customerId}`);
      if (res.data.success) {
        setAvailableForecastItems(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load forecast data:", err);
    }
  };

  useEffect(() => {
    if (formData.customer_id) {
      loadCustomerForecastSources(Number(formData.customer_id));
    } else {
      setCustomerForecasts([]);
      setAvailableForecastItems([]);
    }
  }, [formData.customer_id]);

  useEffect(() => {
    if (!formData.customer_id) return;
    const info = customerMap[String(formData.customer_id)];
    if (!info) return;
    if (!formData.ship_to_address && info.address) {
      setFormData(prev => ({
        ...prev,
        ship_to_address: info.address || "",
        bill_to_address: prev.bill_to_address || info.address || ""
      }));
    }
  }, [formData.customer_id, customerMap]);

  useEffect(() => {
    if (formData.tanggal_po) {
      const newDue = addDays(formData.tanggal_po, formData.top_days || 0);
      setFormData(prev => ({ ...prev, due_date: newDue }));
    }
  }, [formData.tanggal_po, formData.top_days]);

  // Form Calculations
  const calculatedTotals = useMemo(() => {
    const rawSubtotal = formData.details.reduce((sum, item) => {
      const qty = Number(item.po_qty || 0);
      const prc = Number(item.price || 0);
      const discP = Number(item.discount_percent || 0);
      const lineRaw = qty * prc;
      const lineDisc = (lineRaw * discP) / 100;
      return sum + (lineRaw - lineDisc);
    }, 0);

    const hdrDiscP = Number(formData.discount_percent || 0);
    const hdrDiscAmt = (rawSubtotal * hdrDiscP) / 100;
    const afterDisc = Math.max(0, rawSubtotal - hdrDiscAmt);

    const taxP = Number(formData.tax_percent || 11);
    const taxAmt = (afterDisc * taxP) / 100;
    const shipCost = Number(formData.shipping_cost || 0);
    const grandTot = afterDisc + taxAmt + shipCost;

    return {
      sub_total: rawSubtotal,
      discount_amount: hdrDiscAmt,
      tax_amount: taxAmt,
      shipping_cost: shipCost,
      grand_total: grandTot,
    };
  }, [formData.details, formData.discount_percent, formData.tax_percent, formData.shipping_cost]);

  // 12-Month Chart Calculations
  const monthlyChartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const mNum = i + 1;
      const itemsInMonth = data.filter((d) => {
        const itemDate = d.tanggal_po ? new Date(d.tanggal_po) : null;
        const itemMonth = itemDate ? itemDate.getMonth() + 1 : 0;
        const itemYear = itemDate ? itemDate.getFullYear() : 0;
        const matchesMonth = itemMonth === mNum;
        const matchesYear = selectedChartYear ? itemYear === selectedChartYear : true;
        return matchesMonth && matchesYear;
      });

      const gross = itemsInMonth.reduce((s, d) => s + Number(d.sub_total || 0), 0);
      const grand = itemsInMonth.reduce((s, d) => s + Number(d.grand_total || 0), 0);
      const fulfilled = itemsInMonth.reduce((s, d) => s + Number(d.fulfilled_amount || 0), 0);

      return {
        monthIndex: mNum,
        monthLabel: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][i],
        fullName: MONTH_NAMES[i],
        gross,
        grand,
        fulfilled,
        count: itemsInMonth.length,
      };
    });
  }, [data, selectedChartYear]);

  const maxChartVal = useMemo(() => {
    return Math.max(...monthlyChartData.map((m) => Math.max(m.grand, m.fulfilled)), 1);
  }, [monthlyChartData]);

  // Dashboard calculations for Summary Container
  const containerFilteredData = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (selectedMonthFilter !== "all") {
        const itemDate = item.tanggal_po ? new Date(item.tanggal_po) : null;
        const itemMonth = itemDate ? itemDate.getMonth() + 1 : 0;
        if (itemMonth !== selectedMonthFilter) return false;
      }
      return true;
    });
  }, [data, statusFilter, selectedMonthFilter]);

  const totalGrossPO = useMemo(() => containerFilteredData.reduce((s, d) => s + Number(d.sub_total || 0), 0), [containerFilteredData]);
  const totalGrandPO = useMemo(() => containerFilteredData.reduce((s, d) => s + Number(d.grand_total || 0), 0), [containerFilteredData]);
  const totalFulfilledPO = useMemo(() => containerFilteredData.reduce((s, d) => s + Number(d.fulfilled_amount || 0), 0), [containerFilteredData]);
  const poFulfillmentPercentage = useMemo(() => {
    if (totalGrossPO <= 0) return 0;
    return Math.min(100, Math.round((totalFulfilledPO / totalGrossPO) * 100));
  }, [totalGrossPO, totalFulfilledPO]);

  // Filtered & Sorted dataset for Table
  const filteredAndSortedData = useMemo(() => {
    let result = data.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (selectedMonthFilter !== "all") {
        const itemDate = item.tanggal_po ? new Date(item.tanggal_po) : null;
        const itemMonth = itemDate ? itemDate.getMonth() + 1 : 0;
        if (itemMonth !== selectedMonthFilter) return false;
      }
      if (yearFilter !== "all") {
        const itemDate = item.tanggal_po ? new Date(item.tanggal_po) : null;
        const itemYear = itemDate ? itemDate.getFullYear().toString() : "";
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

      if (sortConfig.key === "sub_total" || sortConfig.key === "grand_total" || sortConfig.key === "fulfilled_amount" || sortConfig.key === "id") {
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

  const handleOpenCreate = () => {
    setFormData(emptyPO());
    setSelectedPO(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (id: number) => {
    try {
      const res = await api.express.get(`/customer-po/${id}`);
      if (res.data.success) {
        const d = res.data.data;
        setFormData({
          ...emptyPO(),
          ...d,
          po_type: d.po_type || "Regular Order",
          shipping_method: d.shipping_method || "Franco",
          payment_method: d.payment_method || "Transfer Bank",
          shipping_cost: Number(d.shipping_cost) || 0,
          tanggal_po: d.tanggal_po ? d.tanggal_po.split("T")[0] : todayISO(),
          delivery_date: d.delivery_date ? d.delivery_date.split("T")[0] : todayISO(),
          due_date: d.due_date ? d.due_date.split("T")[0] : todayISO(),
          details: (d.details || [])
            .filter((it: any) => Boolean(it.product_id || it.product_name) && Number(it.po_qty) > 0)
            .map((it: any) => ({
              ...it,
              po_qty: Number(it.po_qty) || 0,
              price: Number(it.price) || 0,
              discount_percent: Number(it.discount_percent) || 0,
              discount_amount: Number(it.discount_amount) || 0,
              sub_total: Number(it.sub_total) || 0,
            })),
        });
        setSelectedPO(d);
        setIsModalOpen(true);
      }
    } catch (err: any) {
      showError("Error", err.message || "Gagal memuat detail Customer PO.");
    }
  };

  const handleOpenDetail = async (id: number) => {
    try {
      const res = await api.express.get(`/customer-po/${id}`);
      if (res.data.success) {
        setSelectedPO(res.data.data);
        setIsDetailOpen(true);
      }
    } catch (err: any) {
      showError("Error", err.message || "Gagal memuat detail Customer PO.");
    }
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
          product_unit: "PCS",
          po_qty: 1,
          price: 0,
          discount_percent: 0,
          discount_amount: 0,
          sub_total: 0,
          remark: "",
        }
      ]
    }));
  };

  const handleRemoveRow = (idx: number) => {
    const next = [...formData.details];
    next.splice(idx, 1);
    setFormData(prev => ({ ...prev, details: next }));
  };

  const handleItemChange = (idx: number, key: keyof PODetail, val: any) => {
    const next = [...formData.details];
    const current = { ...next[idx], [key]: val };
    
    if (key === "po_qty" || key === "price" || key === "discount_percent") {
      const q = Number(current.po_qty || 0);
      const p = Number(current.price || 0);
      const dP = Number(current.discount_percent || 0);
      const lineRaw = q * p;
      const lineDisc = (lineRaw * dP) / 100;
      current.discount_amount = lineDisc;
      current.sub_total = lineRaw - lineDisc;
    }
    
    next[idx] = current;
    setFormData(prev => ({ ...prev, details: next }));
  };

  const handleConfirmPullForecast = () => {
    if (selectedPullItems.length === 0) {
      return showError("Validation Error", "Pilih minimal satu item forecast.");
    }
    const itemsToAdd = availableForecastItems.filter(i => selectedPullItems.includes(i.id));
    const newDetails: PODetail[] = itemsToAdd.map(i => {
      const q = Number(i.remaining_qty || i.forecast_qty || 1);
      const prc = Number(i.price || 0);
      return {
        forecast_detail_id: i.id,
        product_id: i.product_id,
        product_name: i.product_name,
        product_code: i.product_code || "",
        product_unit: i.product_unit || "PCS",
        po_qty: q,
        price: prc,
        discount_percent: 0,
        discount_amount: 0,
        sub_total: q * prc,
        remark: i.remark || `Pulled from Forecast ${i.forecast_ref || ""}`,
        forecast_ref: i.forecast_ref,
        remaining_qty: i.remaining_qty,
      };
    });

    const firstItem = itemsToAdd[0];

    // Smart Salesman resolution
    let autoSalesman = firstItem.salesman_id ? String(firstItem.salesman_id) : "";
    if (!autoSalesman && firstItem.salesman_name) {
      const matched = salesmen.find(s => String(s.label).toLowerCase().includes(String(firstItem.salesman_name).toLowerCase()));
      if (matched) autoSalesman = String(matched.value);
    }
    if (!autoSalesman && formData.salesman_id) {
      autoSalesman = String(formData.salesman_id);
    }
    if (!autoSalesman && salesmen.length > 0) {
      autoSalesman = String(salesmen[0].value);
    }

    // Smart Currency resolution
    let autoCurrency = firstItem.currency_id ? String(firstItem.currency_id) : (formData.currency_id ? String(formData.currency_id) : (currencies.length > 0 ? String(currencies[0].value) : ""));
    let autoRate = autoCurrency ? (currencyRates[autoCurrency] || Number(firstItem.exchange_rate) || 1) : 1;

    const autoDelivDate = firstItem.target_date ? firstItem.target_date.split("T")[0] : (firstItem.forecast_end_date ? firstItem.forecast_end_date.split("T")[0] : formData.delivery_date);
    const autoNote = firstItem.forecast_note ? (formData.note ? `${formData.note}\n[Catatan Forecast]: ${firstItem.forecast_note}` : firstItem.forecast_note) : formData.note;

    const finalSalesman: number | "" = autoSalesman ? Number(autoSalesman) : "";
    const finalCurrency: number | "" = autoCurrency ? Number(autoCurrency) : "";

    setFormData(prev => ({
      ...prev,
      salesman_id: finalSalesman,
      currency_id: finalCurrency,
      exchange_rate: autoRate,
      delivery_date: autoDelivDate,
      note: autoNote,
      details: [...prev.details, ...newDetails]
    }));
    setIsForecastPullOpen(false);
    setSelectedPullItems([]);
    showSuccess("Success", `${newDetails.length} item & data header berhasil terisi otomatis dari Forecast.`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) return showError("Validation Error", "Pilih customer terlebih dahulu.");
    if (!formData.no_po_customer) return showError("Validation Error", "Nomor PO Customer Wajib diisi.");
    if (!formData.tanggal_po) return showError("Validation Error", "Tanggal PO Wajib diisi.");
    if (formData.details.length === 0) return showError("Validation Error", "Tambahkan minimal satu item detail PO.");
    if (formData.details.some(item => !item.product_id)) return showError("Validation Error", "Semua baris item harus memilih produk.");

    const payload = {
      ...formData,
      sub_total: calculatedTotals.sub_total,
      discount_amount: calculatedTotals.discount_amount,
      tax_amount: calculatedTotals.tax_amount,
      shipping_cost: calculatedTotals.shipping_cost,
      grand_total: calculatedTotals.grand_total,
      items: formData.details
    };

    try {
      if (selectedPO?.id) {
        await api.express.put(`/customer-po/${selectedPO.id}`, payload);
        showSuccess("Success", "Data Customer PO berhasil diperbarui.");
      } else {
        const res = await api.express.post("/customer-po", payload);
        const savedStatus = res.data.status || "None";
        if (savedStatus === "Waiting for Approval") {
          showSuccess("Submitted", "Customer PO berhasil disimpan dengan status Waiting for Approval.");
        } else {
          showSuccess("Success", "Customer PO baru berhasil disimpan.");
        }
      }
      setIsModalOpen(false);
      fetchData(page);
    } catch (err: any) {
      console.error("[SAVE CUSTOMER PO ERROR]", err);
      showError("Error", err.response?.data?.message || err.message || "Gagal menyimpan Customer PO.");
    }
  };

  const handleDelete = (id: number) => {
    showConfirm("Confirm Delete", "Apakah Anda yakin ingin menghapus data Customer PO ini?", async () => {
      try {
        await api.express.delete(`/customer-po/${id}`);
        showSuccess("Success", "Data Customer PO berhasil dihapus.");
        fetchData(page);
      } catch (err: any) {
        showError("Error", err.response?.data?.message || err.message || "Gagal menghapus data.");
      }
    });
  };

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-300">
      <StatusModal isOpen={isOpen} type={type} title={title} message={message} onConfirm={onConfirm} onClose={closeModal} isLoading={isActionLoading} />
      <SortFilterModal 
        isOpen={isFilterModalOpen} 
        onClose={() => setIsFilterModalOpen(false)} 
        title="Sort & Filter PO Customer"
        subtitle="Sesuaikan tampilan pesanan penjualan pelanggan"
        sortOptions={[
          { key: "id", order: "desc", label: "Tanggal PO Terbaru (Default)", icon: Calendar },
          { key: "id", order: "asc", label: "Tanggal PO Terlama", icon: Calendar },
          { key: "sub_total", order: "desc", label: "Nominal Bruto PO (Highest)", icon: DollarSign },
          { key: "sub_total", order: "asc", label: "Nominal Bruto PO (Lowest)", icon: DollarSign },
          { key: "grand_total", order: "desc", label: "Nominal Netto PO (Highest)", icon: DollarSign },
          { key: "fulfilled_amount", order: "desc", label: "Realisasi Sales (Highest)", icon: TrendingUp },
          { key: "no_po_customer", order: "asc", label: "Nomor PO (A-Z)", icon: Hash }
        ]}
        sortConfig={sortConfig}
        onSortChange={setSortConfig}
        statusOptions={[
          { value: "all", label: "Semua Status" },
          { value: "Approved", label: "Approved" },
          { value: "Waiting for Approval", label: "Waiting for Approval" },
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

      {/* Clean Corporate Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Customer PO (Purchase Order)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Daftar pesanan resmi dari pelanggan dan pemenuhan sales order.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 md:pr-12">
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm active:scale-95"
          >
            <Plus size={18} />
            <span>Tambah PO Customer</span>
          </button>
        </div>
      </div>

      {/* 12-Month Corporate Chart Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Analisis Transaksi Customer PO 12 Bulan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbandingan total nilai PO dan realisasi sales order per bulan.
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-4 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block"></span>
                <span className="font-semibold text-blue-700">Total PO</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>
                <span className="text-emerald-700 font-semibold">Realisasi Sales Order</span>
              </div>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700">
              <Calendar size={14} className="text-slate-500" />
              <select
                className="bg-transparent outline-none cursor-pointer"
                value={selectedChartYear}
                onChange={(e) => setSelectedChartYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    Tahun {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 12-Month Bar Chart */}
        <div className="h-52 sm:h-60 flex items-end justify-between gap-1 sm:gap-2 pt-4 px-1">
          {monthlyChartData.map((m) => {
            const hGrand = Math.max(4, Math.round((m.grand / maxChartVal) * 100));
            const hFulfilled = Math.max(4, Math.round((m.fulfilled / maxChartVal) * 100));
            const isSelected = selectedMonthFilter === m.monthIndex;

            return (
              <div
                key={m.monthIndex}
                onClick={() => setSelectedMonthFilter(m.monthIndex)}
                title={`Klik untuk filter Bulan ${m.fullName}`}
                className={`flex-1 flex flex-col items-center gap-2 group relative cursor-pointer p-1 rounded-lg transition-all ${
                  isSelected ? "bg-blue-50/80 ring-1 ring-blue-300" : "hover:bg-slate-50"
                }`}
              >
                {/* Hover Tooltip Card */}
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-slate-900 text-white text-xs p-3 rounded-lg shadow-lg z-50 min-w-[160px] pointer-events-none">
                  <div className="font-bold text-slate-200 border-b border-slate-700 pb-1 mb-1 text-[11px]">
                    {m.fullName} {selectedChartYear}
                  </div>
                  <div className="text-[11px] space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-blue-300 font-semibold">Total PO:</span>
                      <span className="font-semibold text-blue-300">Rp {m.grand.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-emerald-400 font-semibold">Realisasi Sales:</span>
                      <span className="font-semibold text-emerald-400">Rp {m.fulfilled.toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                </div>

                {/* Bars Duo Container */}
                <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-36 sm:h-44 px-0.5">
                  <div style={{ height: `${hGrand}%` }} className="w-1/2 bg-blue-600 rounded-t-sm transition-all group-hover:brightness-110"></div>
                  <div style={{ height: `${hFulfilled}%` }} className="w-1/2 bg-emerald-500 rounded-t-sm transition-all group-hover:brightness-110"></div>
                </div>

                {/* Month Label */}
                <span className={`text-[11px] font-semibold ${isSelected ? "text-blue-700 font-bold" : "text-slate-600"}`}>
                  {m.monthLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clean Stat Cards Container */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Ringkasan Indikator PO
            </span>
            {selectedMonthFilter !== "all" ? (
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                Bulan: {MONTH_NAMES[Number(selectedMonthFilter) - 1]}
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                Semua Bulan
              </span>
            )}
          </div>
          {selectedMonthFilter !== "all" && (
            <button
              onClick={() => setSelectedMonthFilter("all")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Reset Filter Bulan
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<ClipboardList size={18} />}
            iconBgColor="bg-slate-100"
            iconColor="text-slate-700"
            label="TOTAL DOKUMEN PO"
            value={containerFilteredData.length}
          />
          <StatCard
            icon={<TrendingUp size={18} />}
            iconBgColor="bg-indigo-50"
            iconColor="text-indigo-600"
            label="TOTAL PO"
            value={`Rp ${totalGrandPO.toLocaleString('id-ID')}`}
          />
          <StatCard
            icon={<PackageCheck size={18} />}
            iconBgColor="bg-emerald-50"
            iconColor="text-emerald-600"
            label="REALISASI SALES ORDER"
            value={`Rp ${totalFulfilledPO.toLocaleString('id-ID')}`}
          />
          <StatCard
            icon={<Target size={18} />}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
            label="PENCAPAIAN REALISASI"
            value={`${poFulfillmentPercentage}% Terpenuhi`}
          />
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 mb-6">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full">
            {[
              { key: "all", label: `Semua (${data.length})` },
              { key: "Waiting for Approval", label: `Waiting Approval (${data.filter(d => d.status === 'Waiting for Approval' || d.status === 'Pending').length})` },
              { key: "Approved", label: `Approved (${data.filter(d => d.status === 'Approved').length})` },
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
          searchPlaceholder="Cari referensi PO, nomor PO customer, atau customer..."
          searchValue={search}
          onSearchChange={setSearch}
          onFilterClick={() => setIsFilterModalOpen(true)}
          filterBadgeCount={activeFilterCount}
        />
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[380px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">No</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">No. Referensi & PO Customer</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Customer & PIC</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tgl PO & Delivery</th>
                <th className="px-5 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total PO (Rp)</th>
                <th className="px-5 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Realisasi (SO)</th>
                <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400 text-sm">Memuat data Customer PO...</td></tr>
              ) : filteredAndSortedData.length > 0 ? (
                filteredAndSortedData.map((item, idx) => {
                  const grandVal = Number(item.grand_total || item.sub_total || 0);
                  const fulfilledVal = Number(item.fulfilled_amount || 0);
                  const fulfilledPct = grandVal > 0 ? Math.min(100, Math.round((fulfilledVal / grandVal) * 100)) : 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-slate-400 font-mono">{(page - 1) * 10 + idx + 1}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 text-sm">{item.reference}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            PO: {item.no_po_customer || "-"}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                            {item.po_type || "Regular Order"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800 text-sm">{item.customer_name || "-"}</div>
                        <div className="text-xs text-slate-400">
                          {item.contact_person ? `PIC: ${item.contact_person} (${item.contact_phone || "-"})` : (item.salesman_name ? `Sales: ${item.salesman_name}` : "-")}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-slate-700">
                        <div>PO: {item.tanggal_po ? item.tanggal_po.split("T")[0] : "-"}</div>
                        <div className="text-[11px] text-slate-400">Deliv: {item.delivery_date ? item.delivery_date.split("T")[0] : "-"}</div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900 text-sm">
                        {item.currency_code ? `${item.currency_code} ` : ""}
                        {grandVal.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="font-bold text-emerald-700 text-sm">
                          Rp {fulfilledVal.toLocaleString()}
                        </div>
                        <div className="text-[10px] font-medium text-slate-400">
                          {fulfilledPct}% Realisasi SO
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {renderStatusBadge(item.status)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => handleOpenDetail(item.id!)} title="Lihat Detail" className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"><Eye size={16} /></button>
                          <button onClick={() => handleOpenEdit(item.id!)} title="Edit Customer PO" className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"><Edit2 size={16} /></button>
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
                      <ClipboardList size={32} className="text-slate-300" />
                      <p className="font-semibold text-slate-600">Belum ada data Customer PO</p>
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
          <div className="bg-white rounded-2xl w-full max-w-7xl shadow-xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedPO ? "Edit Customer PO" : "Tambah Customer PO"}
                </h3>
                <p className="text-xs text-slate-500 font-medium">Input informasi pesanan resmi dari customer dan item barang.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Informasi Header & Logistik
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
                  {/* Customer */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-700">Customer *</label>
                    <SearchableSelect
                      options={customers}
                      placeholder="Pilih Customer..."
                      value={formData.customer_id}
                      onChange={(val) => {
                        const custInfo = customerMap[String(val)];
                        const defaultTop = custInfo?.top_days != null ? Number(custInfo.top_days) : 30;
                        const poDateStr = formData.tanggal_po || new Date().toISOString().split("T")[0];
                        const d = new Date(poDateStr);
                        if (!isNaN(d.getTime())) d.setDate(d.getDate() + defaultTop);
                        const calculatedDue = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : formData.due_date;
                        setFormData({
                          ...formData,
                          customer_id: val,
                          top_days: defaultTop,
                          due_date: calculatedDue,
                          ship_to_address: custInfo?.address || formData.ship_to_address
                        });
                        loadCustomerForecastSources(Number(val));
                      }}
                    />
                  </div>

                  {/* No PO Customer */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">No. PO Customer *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PO-CUST-2026/001"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-400"
                      value={formData.no_po_customer}
                      onChange={(e) => setFormData({ ...formData, no_po_customer: e.target.value })}
                    />
                  </div>

                  {/* Tipe PO */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Tipe / Jenis PO</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold outline-none"
                      value={formData.po_type || "Regular Order"}
                      onChange={(e) => setFormData({ ...formData, po_type: e.target.value })}
                    >
                      <option value="Regular Order">Regular Order</option>
                      <option value="Contract PO">Contract PO</option>
                      <option value="Project Order">Project Order</option>
                      <option value="Trial Order">Trial Order</option>
                    </select>
                  </div>

                  {/* Tanggal PO */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Tanggal PO *</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold outline-none"
                      value={formData.tanggal_po}
                      onChange={(e) => {
                        const poDateStr = e.target.value;
                        const topVal = formData.top_days || 30;
                        const d = new Date(poDateStr);
                        if (!isNaN(d.getTime())) d.setDate(d.getDate() + topVal);
                        const calculatedDue = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : formData.due_date;
                        setFormData({ ...formData, tanggal_po: poDateStr, due_date: calculatedDue });
                      }}
                    />
                  </div>

                  {/* Delivery Date */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Target Delivery Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold outline-none"
                      value={formData.delivery_date}
                      onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                    />
                  </div>

                  {/* Salesman Scope */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Salesman Scope</label>
                    <SearchableSelect
                      options={salesmen}
                      placeholder="Pilih Salesman..."
                      value={formData.salesman_id}
                      onChange={(val) => setFormData({ ...formData, salesman_id: val })}
                    />
                  </div>

                  {/* Syarat Pembayaran (TOP Days) */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Hari TOP (Term of Payment)</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold outline-none"
                      value={formData.top_days}
                      onChange={(e) => {
                        const topVal = Number(e.target.value);
                        const poDateStr = formData.tanggal_po || new Date().toISOString().split("T")[0];
                        const d = new Date(poDateStr);
                        if (!isNaN(d.getTime())) d.setDate(d.getDate() + topVal);
                        const calculatedDue = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : formData.due_date;
                        setFormData({ ...formData, top_days: topVal, due_date: calculatedDue });
                      }}
                    />
                  </div>

                  {/* Due Date */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Jatuh Tempo (Due Date)</label>
                    <input
                      type="date"
                      readOnly
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-xs font-semibold text-slate-600 outline-none cursor-not-allowed"
                      value={formData.due_date}
                    />
                  </div>

                  {isPoCustomerV12Enabled && (
                    <>
                      {/* Metode Pembayaran */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Metode Pembayaran</label>
                        <select
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold outline-none"
                          value={formData.payment_method || "Transfer Bank"}
                          onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                        >
                          <option value="Transfer Bank">Transfer Bank</option>
                          <option value="Cek/Giro">Cek / Giro</option>
                          <option value="Cash">Cash</option>
                          <option value="Letter of Credit (LC)">Letter of Credit (LC)</option>
                        </select>
                      </div>

                      {/* Metode Pengiriman */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Metode Pengiriman (Incoterms)</label>
                        <select
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold outline-none"
                          value={formData.shipping_method || "Franco"}
                          onChange={(e) => setFormData({ ...formData, shipping_method: e.target.value })}
                        >
                          <option value="Franco">Franco (Bebas Ongkir)</option>
                          <option value="Loco">Loco (Ambil Sendiri)</option>
                          <option value="FOB">FOB (Free On Board)</option>
                          <option value="CIF">CIF (Cost, Insurance & Freight)</option>
                          <option value="Kurir Ekspedisi">Kurir / Ekspedisi</option>
                        </select>
                      </div>

                      {/* PIC Contact Person */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">PIC Customer (Contact Person)</label>
                        <input
                          type="text"
                          placeholder="Nama PIC..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-medium outline-none"
                          value={formData.contact_person || ""}
                          onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                        />
                      </div>

                      {/* Phone Contact */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">No. Telepon PIC</label>
                        <input
                          type="text"
                          placeholder="e.g. 0812-3456-7890"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-mono font-medium outline-none"
                          value={formData.contact_phone || ""}
                          onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                        />
                      </div>

                      {/* Mata Uang */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Mata Uang</label>
                        <SearchableSelect
                          options={currencies}
                          placeholder="Pilih Mata Uang..."
                          value={formData.currency_id}
                          onChange={(val) => setFormData({ ...formData, currency_id: val, exchange_rate: currencyRates[String(val)] || 1 })}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Nilai Kurs</label>
                        <input
                          type="number"
                          step="0.0001"
                          min={0}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold outline-none"
                          value={formData.exchange_rate}
                          onChange={(e) => setFormData({ ...formData, exchange_rate: Number(e.target.value) })}
                        />
                      </div>
                    </>
                  )}

                  {/* Alamat Pengiriman */}
                  <div className="space-y-1 md:col-span-3">
                    <label className="text-xs font-semibold text-slate-700">Alamat Pengiriman (Ship To)</label>
                    <input
                      type="text"
                      placeholder="Alamat pengiriman barang..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-medium outline-none"
                      value={formData.ship_to_address}
                      onChange={(e) => setFormData({ ...formData, ship_to_address: e.target.value })}
                    />
                  </div>

                  {/* Alamat Penagihan */}
                  <div className="space-y-1 md:col-span-3">
                    <label className="text-xs font-semibold text-slate-700">Alamat Penagihan (Bill To)</label>
                    <input
                      type="text"
                      placeholder="Alamat penagihan faktur..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-medium outline-none"
                      value={formData.bill_to_address || ""}
                      onChange={(e) => setFormData({ ...formData, bill_to_address: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Detail Items Section */}
              <div className="border-t border-slate-200 pt-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Daftar Item Produk PO Customer
                  </h4>
                  <div className="flex items-center gap-2">
                    {isForecastEnabled && formData.customer_id && (
                      <button
                        type="button"
                        onClick={() => setIsForecastPullOpen(true)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                      >
                        <Download size={14} /> Tarik dari Forecast
                      </button>
                    )}
                    <button type="button" onClick={handleAddRow} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1">
                      <Plus size={14} /> Tambah Produk
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-xs min-w-[1000px]">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase">
                      <tr>
                        <th className="px-3 py-2.5 text-left min-w-[360px]">Produk</th>
                        <th className="px-3 py-2.5 text-center w-28 min-w-[110px]">Qty PO</th>
                        <th className="px-3 py-2.5 text-right w-36 min-w-[140px]">Harga Satuan</th>
                        <th className="px-3 py-2.5 text-center w-20 min-w-[80px]">Disc %</th>
                        <th className="px-3 py-2.5 text-right w-36 min-w-[150px]">Subtotal</th>
                        <th className="px-3 py-2.5 text-left w-36">Remark</th>
                        <th className="px-3 py-2.5 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.details.map((item, idx) => {
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
                                  const prc = Number(p.sell_price_l1 || p.sale_price || p.product_price || 0) || next[idx].price || 0;
                                  const q = Number(next[idx].po_qty || 1);
                                  next[idx] = {
                                    ...next[idx],
                                    product_id: p.id,
                                    product_name: p.product_name,
                                    product_code: p.product_code || "",
                                    product_unit: p.product_unit || "PCS",
                                    price: prc,
                                    sub_total: q * prc,
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
                                className="w-full px-2 py-1 bg-slate-50 rounded text-center font-bold text-xs border border-slate-200 min-w-[90px]"
                                value={item.po_qty}
                                onChange={(e) => handleItemChange(idx, "po_qty", Number(e.target.value))}
                              />
                            </td>
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                min={0}
                                className="w-full px-2 py-1 bg-slate-50 rounded text-right font-bold text-xs border border-slate-200 min-w-[120px]"
                                value={item.price}
                                onChange={(e) => handleItemChange(idx, "price", Number(e.target.value))}
                              />
                            </td>
                            <td className="p-2 text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                className="w-full px-2 py-1 bg-slate-50 rounded text-center font-bold text-xs border border-slate-200 min-w-[60px]"
                                value={item.discount_percent}
                                onChange={(e) => handleItemChange(idx, "discount_percent", Number(e.target.value))}
                              />
                            </td>
                            <td className="p-2 text-right font-bold text-slate-800 text-xs whitespace-nowrap min-w-[130px]">
                              {Number(item.sub_total || 0).toLocaleString()}
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
                          <td colSpan={7} className="text-center py-6 text-slate-400 text-xs">
                            {isForecastEnabled ? 'Belum ada item produk. Klik "Tambah Produk" atau "Tarik dari Forecast".' : 'Belum ada item produk. Klik "Tambah Produk".'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Calculation Summary Footer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5 border-t border-slate-200 mt-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Catatan Dokumen / Terms</label>
                    <textarea
                      rows={3}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-medium outline-none resize-none"
                      placeholder="Catatan penyerahan atau syarat khusus PO Customer..."
                      value={formData.note || ""}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    />
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs font-medium">
                    <div className="flex justify-between items-center text-slate-700">
                      <span>Subtotal</span>
                      <span className="font-bold text-slate-900">Rp {calculatedTotals.sub_total.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <span>Diskon Header (%)</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="w-14 px-1.5 py-0.5 border border-slate-300 rounded text-center text-xs font-bold bg-white"
                          value={formData.discount_percent}
                          onChange={(e) => setFormData({ ...formData, discount_percent: Number(e.target.value) })}
                        />
                      </div>
                      <span className="font-bold text-red-600">- Rp {calculatedTotals.discount_amount.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <span>PPN (%)</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="w-14 px-1.5 py-0.5 border border-slate-300 rounded text-center text-xs font-bold bg-white"
                          value={formData.tax_percent}
                          onChange={(e) => setFormData({ ...formData, tax_percent: Number(e.target.value) })}
                        />
                      </div>
                      <span className="font-bold text-indigo-700">+ Rp {calculatedTotals.tax_amount.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-700">
                      <span>Biaya Pengiriman (Rp)</span>
                      <input
                        type="number"
                        min={0}
                        className="w-28 px-2 py-0.5 border border-slate-300 rounded text-right text-xs font-bold bg-white"
                        value={formData.shipping_cost || 0}
                        onChange={(e) => setFormData({ ...formData, shipping_cost: Number(e.target.value) })}
                      />
                    </div>

                    <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                      <span>Total PO</span>
                      <span className="text-base font-bold text-blue-700">Rp {calculatedTotals.grand_total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  Batal
                </button>
                <button type="submit" className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white shadow-sm">
                  Simpan Customer PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORECAST PULL MODAL */}
      {isForecastPullOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Tarik Data dari Forecast</h3>
                <p className="text-xs text-slate-500 font-medium">Pilih item forecast yang akan diserap ke Customer PO ini</p>
              </div>
              <button onClick={() => setIsForecastPullOpen(false)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-3">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase">
                    <tr>
                      <th className="px-3 py-2 text-center w-10">
                        <input
                          type="checkbox"
                          title="Pilih Semua"
                          checked={availableForecastItems.length > 0 && selectedPullItems.length === availableForecastItems.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPullItems(availableForecastItems.map(i => i.id));
                            } else {
                              setSelectedPullItems([]);
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="px-3 py-2 text-left">Forecast Ref</th>
                      <th className="px-3 py-2 text-left">Produk</th>
                      <th className="px-3 py-2 text-right w-24">Harga Est</th>
                      <th className="px-3 py-2 text-right w-24">Sisa Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {availableForecastItems.map((item) => {
                      const isChecked = selectedPullItems.includes(item.id);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPullItems(prev => [...prev, item.id]);
                                } else {
                                  setSelectedPullItems(prev => prev.filter(id => id !== item.id));
                                }
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="p-2 font-bold text-slate-900">{item.forecast_ref || "-"}</td>
                          <td className="p-2 font-semibold text-slate-800">{item.product_name}</td>
                          <td className="p-2 text-right font-semibold">Rp {Number(item.price || 0).toLocaleString()}</td>
                          <td className="p-2 text-right font-bold text-blue-700">{item.remaining_qty || item.forecast_qty || 0}</td>
                        </tr>
                      );
                    })}
                    {availableForecastItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-400 text-xs">
                          Tidak ada item forecast yang tersedia.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setIsForecastPullOpen(false)} className="px-4 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700">
                Batal
              </button>
              <button onClick={handleConfirmPullForecast} className="px-5 py-1.5 rounded-lg bg-slate-900 text-xs font-semibold text-white">
                Tarik {selectedPullItems.length} Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL VIEW MODAL */}
      {isDetailOpen && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {selectedPO.po_type || "Regular Order"}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedPO.reference}</h3>
                <p className="text-xs text-slate-500 font-semibold">No. PO Customer: {selectedPO.no_po_customer || "-"}</p>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold">Customer Target</span>
                  <span className="font-bold text-slate-900">{selectedPO.customer_name || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Tanggal PO Customer</span>
                  <span className="font-bold text-slate-900">{selectedPO.tanggal_po ? selectedPO.tanggal_po.split("T")[0] : "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Target Delivery</span>
                  <span className="font-bold text-slate-900">{selectedPO.delivery_date ? selectedPO.delivery_date.split("T")[0] : "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Pengiriman & TOP</span>
                  <span className="font-bold text-slate-800">{selectedPO.shipping_method || "Franco"} ({selectedPO.top_days || 0} Hari)</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Metode Pembayaran</span>
                  <span className="font-bold text-slate-800">{selectedPO.payment_method || "Transfer Bank"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">PIC Customer</span>
                  <span className="font-bold text-slate-800">{selectedPO.contact_person ? `${selectedPO.contact_person} (${selectedPO.contact_phone || "-"})` : "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Status Dokumen</span>
                  <div className="mt-0.5">{renderStatusBadge(selectedPO.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-400 font-semibold block mb-0.5">Alamat Pengiriman (Ship-To)</span>
                  <p className="font-semibold text-slate-800">{selectedPO.ship_to_address || "-"}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-400 font-semibold block mb-0.5">Alamat Penagihan (Bill-To)</span>
                  <p className="font-semibold text-slate-800">{selectedPO.bill_to_address || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-slate-400 block font-semibold">Total PO</span>
                  <span className="font-bold text-blue-700 text-base">
                    Rp {Number(selectedPO.grand_total || selectedPO.sub_total || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
                  <span className="text-emerald-700 block font-semibold">Realisasi PO</span>
                  <span className="font-bold text-emerald-800 text-base">
                    Rp {Number(selectedPO.fulfilled_amount || 0).toLocaleString()}
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
                        <th className="px-3 py-2 text-center w-16">Unit</th>
                        <th className="px-3 py-2 text-right w-20">Qty PO</th>
                        <th className="px-3 py-2 text-right w-24">Harga</th>
                        <th className="px-3 py-2 text-center w-16">Disc %</th>
                        <th className="px-3 py-2 text-right w-28">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPO.details?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 font-semibold text-slate-900">{item.product_name}</td>
                          <td className="px-3 py-2 text-center text-slate-600">{item.product_unit || "PCS"}</td>
                          <td className="px-3 py-2 text-right font-bold">{Number(item.po_qty || 0).toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{Number(item.price || 0).toLocaleString()}</td>
                          <td className="px-3 py-2 text-center font-semibold text-blue-700">{Number(item.discount_percent || 0)}%</td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900">{Number(item.sub_total || 0).toLocaleString()}</td>
                        </tr>
                      ))}
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
