"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Truck,
  X,
  Trash,
  Eye,
  CalendarCheck,
  Calendar,
  FileText,
  Building2,
  UserCheck,
  CheckCircle2,
  Clock,
  ClipboardList,
  FileCheck2,
  Factory,
  Wrench,
  Sparkles
} from "lucide-react";
import api from "@/lib/api";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import ProductSearchDropdown, { type ProductOption } from "@/components/ui/ProductSearchDropdown";
import PrintButton from "@/components/ui/PrintButton";

type SJDetail = {
  id?: number;
  product_id?: number | null;
  product_name: string;
  product_code?: string | null;
  product_unit?: string | null;
  qty_delivered: number;
};

type SuratJalan = {
  id?: number;
  reference?: string;
  customer_id: number | "";
  customer_name?: string;
  source_type?: "PO_CUSTOMER" | "PRO" | "WO" | "MANUAL" | string;
  source_ref?: string;
  customer_po_id?: number | null;
  no_po_customer?: string;
  po_reference?: string;
  po_cust_no?: string;
  order_sheet_ref: string;
  driver_name: string;
  vehicle_no: string;
  delivery_date: string;
  returned_date?: string | null;
  received_by_customer?: string | null;
  return_notes?: string | null;
  note?: string;
  status: string;
  details: SJDetail[];
};

export default function SuratJalanPage() {
  const [data, setData] = useState<SuratJalan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { isOpen, type, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading } = useStatusModal();

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedSJ, setSelectedSJ] = useState<SuratJalan | null>(null);
  
  // Pull Source Selection state in Modal (PO Customer / PrO / WO)
  const [activeSourceType, setActiveSourceType] = useState<"PO_CUSTOMER" | "PRO" | "WO">("PO_CUSTOMER");
  const [selectedSourceId, setSelectedSourceId] = useState<string | number>("");

  const [formData, setFormData] = useState<SuratJalan>({
    customer_id: "",
    source_type: "PO_CUSTOMER",
    source_ref: "",
    customer_po_id: null,
    no_po_customer: "",
    order_sheet_ref: "",
    driver_name: "",
    vehicle_no: "",
    delivery_date: new Date().toISOString().split("T")[0],
    returned_date: "",
    received_by_customer: "",
    return_notes: "",
    note: "",
    status: "Draft",
    details: []
  });

  // Return Date Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedSJForReturn, setSelectedSJForReturn] = useState<SuratJalan | null>(null);
  const [returnForm, setReturnForm] = useState({
    returned_date: new Date().toISOString().split("T")[0],
    received_by_customer: "",
    return_notes: ""
  });
  const [isSavingReturn, setIsSavingReturn] = useState(false);

  // Dropdown States
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerPOs, setCustomerPOs] = useState<any[]>([]);
  const [proList, setProList] = useState<any[]>([]);
  const [woList, setWoList] = useState<any[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  const fetchDropdowns = async () => {
    try {
      const [custRes, prodRes, poRes, proRes, woRes] = await Promise.all([
        api.express.get("/customers-list").catch(() => ({ data: { data: [] } })),
        api.express.get("/products", { limit: 9999 }).catch(() => ({ data: { data: [] } })),
        api.express.get("/customer-po", { limit: 1000 }).catch(() => ({ data: { data: [] } })),
        api.express.get("/manufacturing/planning-produksi", { limit: 1000 }).catch(() => ({ data: { data: [] } })),
        api.express.get("/manufacturing/work-orders", { limit: 1000 }).catch(() => ({ data: { data: [] } }))
      ]);

      setCustomers((custRes.data.data || []).map((c: any) => ({ value: c.id, label: c.customer_name })));
      setProducts(prodRes.data.data || []);
      
      // PO Customer options
      setCustomerPOs((poRes.data.data || []).map((p: any) => ({
        value: p.id,
        label: `${p.no_po_customer || p.reference} — ${p.customer_name || "Customer"}`,
        raw: p
      })));

      // PrO options
      setProList((proRes.data.data || []).map((pr: any) => ({
        value: pr.id,
        label: `${pr.pro_code} — ${pr.product_name || "Item"} (Target: ${Number(pr.target_qty || 0).toLocaleString()} ${pr.product_unit || "PCS"})${pr.customer_name ? ` — [${pr.customer_name}]` : ""}`,
        raw: pr
      })));

      // Work Order options
      setWoList((woRes.data.data || []).map((w: any) => ({
        value: w.id,
        label: `${w.reference} — ${w.product_name || "Finished Good"} (Target: ${Number(w.target_qty || 0).toLocaleString()} ${w.product_unit || "PCS"})${w.customer_name ? ` — [${w.customer_name}]` : ""}`,
        raw: w
      })));
    } catch (err) {
      console.error("Error loading dropdown data:", err);
    }
  };

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.express.get("/surat-jalan", { page: p, search });
      setData(res.data.data || []);
      setPage(res.data.current_page || 1);
      setTotalPages(res.data.last_page || 1);
    } catch { 
      setData([]); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchDropdowns();
    const t = setTimeout(() => fetchData(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Handle Pull data based on selected Source Type (PO Customer / PrO / WO)
  const handlePullSourceData = async (sourceId: string | number) => {
    if (!sourceId) return;
    setSelectedSourceId(sourceId);

    try {
      if (activeSourceType === "PO_CUSTOMER") {
        // 1. PO CUSTOMER
        const res = await api.express.get(`/customer-po/${sourceId}`);
        if (res.data.success) {
          const po = res.data.data;
          const poDetails = po.details || [];
          const newDetails: SJDetail[] = poDetails.map((i: any) => ({
            product_id: i.product_id,
            product_name: i.product_name,
            product_code: i.product_code || "",
            product_unit: i.product_unit || "PCS",
            qty_delivered: Number(i.po_qty || 0)
          }));

          setFormData(prev => ({
            ...prev,
            customer_id: po.customer_id || prev.customer_id,
            source_type: "PO_CUSTOMER",
            source_ref: po.reference,
            customer_po_id: po.id,
            no_po_customer: po.no_po_customer || po.reference || "",
            order_sheet_ref: prev.order_sheet_ref || "",
            note: prev.note || (po.note ? `PO Customer: ${po.no_po_customer || po.reference} - ${po.note}` : `PO Customer: ${po.no_po_customer || po.reference}`),
            details: newDetails.length > 0 ? newDetails : prev.details
          }));

          showSuccess(
            "Data PO Berhasil Ditarik",
            `Berhasil mengisi Customer, No PO Customer (${po.no_po_customer || po.reference}), dan ${newDetails.length} detail item barang.`
          );
        }
      } else if (activeSourceType === "PRO") {
        // 2. PrO (Planning Produksi)
        let found = proList.find(p => String(p.value) === String(sourceId))?.raw;
        if (!found) {
          const res = await api.express.get("/manufacturing/planning-produksi");
          if (res.data.success) {
            found = (res.data.data || []).find((p: any) => String(p.id) === String(sourceId));
          }
        }
        if (found) {
          const newDetails: SJDetail[] = [{
            product_id: found.product_id || null,
            product_name: found.product_name || "Produk PrO",
            product_code: found.product_code || "",
            product_unit: found.product_unit || "PCS",
            qty_delivered: Number(found.target_qty || found.actual_qty || 1)
          }];

          setFormData(prev => ({
            ...prev,
            customer_id: found.customer_id || prev.customer_id,
            source_type: "PRO",
            source_ref: found.pro_code,
            no_po_customer: found.no_po_customer || prev.no_po_customer || "",
            order_sheet_ref: found.os_reference || found.pro_code || prev.order_sheet_ref || "",
            note: prev.note || `PrO Ref: ${found.pro_code}${found.wo_reference ? ` (WO: ${found.wo_reference})` : ""}`,
            details: newDetails
          }));

          showSuccess(
            "Data PrO Berhasil Ditarik",
            `Berhasil mengisi ${found.customer_name ? `Customer (${found.customer_name}), ` : ""}${found.no_po_customer ? `No PO (${found.no_po_customer}), ` : ""}Order Sheet (${found.os_reference || found.pro_code}), dan detail produk ${found.product_name || "Item"}.`
          );
        }
      } else if (activeSourceType === "WO") {
        // 3. WORK ORDER (WO)
        const res = await api.express.get(`/manufacturing/work-orders/${sourceId}`);
        if (res.data.success) {
          const wo = res.data.data;
          const newDetails: SJDetail[] = [{
            product_id: wo.parent_product_id || null,
            product_name: wo.product_name || "Finished Good",
            product_code: wo.product_code || "",
            product_unit: wo.product_unit || "PCS",
            qty_delivered: Number(wo.target_qty || 1)
          }];

          setFormData(prev => ({
            ...prev,
            customer_id: wo.customer_id || prev.customer_id,
            source_type: "WO",
            source_ref: wo.reference,
            no_po_customer: wo.no_po_customer || prev.no_po_customer || "",
            order_sheet_ref: wo.order_sheet_ref || wo.reference || prev.order_sheet_ref || "",
            note: prev.note || `Realisasi Pengiriman Work Order: ${wo.reference}`,
            details: newDetails
          }));

          showSuccess(
            "Data WO Berhasil Ditarik",
            `Berhasil mengisi ${wo.customer_name ? `Customer (${wo.customer_name}), ` : ""}${wo.no_po_customer ? `No PO (${wo.no_po_customer}), ` : ""}Order Sheet/WO (${wo.order_sheet_ref || wo.reference}), dan Finished Good ${wo.product_name || "Item"}.`
          );
        }
      }
    } catch (err: any) {
      console.error("Error pulling source data:", err);
      showError("Error", "Gagal menarik data dari sumber dokumen yang dipilih.");
    }
  };

  const handleOpenCreate = () => {
    setSelectedSourceId("");
    setActiveSourceType("PO_CUSTOMER");
    setFormData({
      customer_id: "",
      source_type: "PO_CUSTOMER",
      source_ref: "",
      customer_po_id: null,
      no_po_customer: "",
      order_sheet_ref: "",
      driver_name: "",
      vehicle_no: "",
      delivery_date: new Date().toISOString().split("T")[0],
      returned_date: "",
      received_by_customer: "",
      return_notes: "",
      note: "",
      status: "Draft",
      details: []
    });
    setSelectedSJ(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (id: number) => {
    try {
      const res = await api.express.get(`/surat-jalan/${id}`);
      if (res.data.success) {
        const sj = res.data.data;
        setFormData({
          ...sj,
          delivery_date: sj.delivery_date ? sj.delivery_date.split("T")[0] : "",
          returned_date: sj.returned_date ? sj.returned_date.split("T")[0] : "",
          details: sj.details || []
        });
        setSelectedSJ(sj);
        setIsModalOpen(true);
      }
    } catch (err: any) {
      showError("Error", err.message || "Failed to load details.");
    }
  };

  const handleOpenDetail = async (id: number) => {
    try {
      const res = await api.express.get(`/surat-jalan/${id}`);
      if (res.data.success) {
        setSelectedSJ(res.data.data);
        setIsDetailOpen(true);
      }
    } catch (err: any) {
      showError("Error", err.message || "Failed to load details.");
    }
  };

  // Open Tanggal Kembali SJ Modal
  const handleOpenReturnModal = (sj: SuratJalan) => {
    setSelectedSJForReturn(sj);
    setReturnForm({
      returned_date: sj.returned_date ? sj.returned_date.split("T")[0] : new Date().toISOString().split("T")[0],
      received_by_customer: sj.received_by_customer || "",
      return_notes: sj.return_notes || ""
    });
    setIsReturnModalOpen(true);
  };

  // Save Tanggal Kembali SJ
  const handleSaveReturnDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSJForReturn?.id) return;
    if (!returnForm.returned_date) {
      return showError("Validation Error", "Silakan pilih Tanggal Kembali Surat Jalan.");
    }

    setIsSavingReturn(true);
    try {
      await api.express.put(`/surat-jalan/${selectedSJForReturn.id}/return`, {
        returned_date: returnForm.returned_date,
        received_by_customer: returnForm.received_by_customer,
        return_notes: returnForm.return_notes,
        status: "Returned"
      });
      showSuccess("Sukses", `Tanggal kembali untuk Surat Jalan ${selectedSJForReturn.reference} berhasil disimpan.`);
      setIsReturnModalOpen(false);
      setSelectedSJForReturn(null);
      fetchData(page);
    } catch (err: any) {
      showError("Error", err.response?.data?.message || err.message || "Gagal menyimpan tanggal kembali.");
    } finally {
      setIsSavingReturn(false);
    }
  };

  const handleAddRow = () => {
    setFormData({
      ...formData,
      details: [
        ...formData.details,
        { product_id: null, product_name: "", product_code: "", product_unit: "PCS", qty_delivered: 1 }
      ]
    });
  };

  const handleRemoveRow = (idx: number) => {
    const next = [...formData.details];
    next.splice(idx, 1);
    setFormData({ ...formData, details: next });
  };

  const handleItemChange = (idx: number, key: keyof SJDetail, val: any) => {
    const next = [...formData.details];
    next[idx] = { ...next[idx], [key]: val };
    setFormData({ ...formData, details: next });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) return showError("Validation Error", "Pilih customer terlebih dahulu.");
    if (formData.details.length === 0) return showError("Validation Error", "Tambahkan minimal satu detail item pengiriman.");
    if (formData.details.some(item => !item.product_id && !item.product_name)) {
      return showError("Validation Error", "Semua baris item harus memiliki nama produk / produk terpilih.");
    }

    try {
      if (selectedSJ?.id) {
        await api.express.put(`/surat-jalan/${selectedSJ.id}`, formData);
        showSuccess("Success", "Surat Jalan berhasil diperbarui.");
      } else {
        await api.express.post("/surat-jalan", formData);
        showSuccess("Success", "Surat Jalan baru berhasil disimpan.");
      }
      setIsModalOpen(false);
      fetchData(page);
    } catch (err: any) {
      showError("Error", err.response?.data?.message || err.message || "Gagal menyimpan data.");
    }
  };

  const handleDelete = (id: number) => {
    showConfirm("Confirm Delete", "Apakah Anda yakin ingin menghapus Surat Jalan ini?", async () => {
      try {
        await api.express.delete(`/surat-jalan/${id}`);
        showSuccess("Success", "Surat Jalan berhasil dihapus.");
        fetchData(page);
      } catch (err: any) {
        showError("Error", err.response?.data?.message || err.message || "Gagal menghapus data.");
      }
    });
  };

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <StatusModal isOpen={isOpen} type={type} title={title} message={message} onConfirm={onConfirm} onClose={closeModal} isLoading={isActionLoading} />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-600 rounded-2xl shadow-lg shadow-amber-200">
              <Truck className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900">
                Surat <span className="text-amber-600">Jalan</span>
              </h1>
              <p className="text-xs text-gray-500 font-semibold mt-0.5">
                Kelola surat jalan pengiriman barang dengan opsi penarikan data dari <b>PO Customer</b>, <b>PrO</b>, atau <b>Work Order (WO)</b>.
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2.5 bg-gray-900 hover:bg-amber-600 hover:shadow-amber-200 text-white px-6 py-3.5 rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95 shrink-0"
        >
          <Plus size={18} strokeWidth={3} />
          <span>Buat Surat Jalan Baru</span>
        </button>
      </div>

      {/* Stats */}
      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<Truck size={20} />} iconBgColor="bg-amber-50" iconColor="text-amber-600" label="TOTAL SURAT JALAN" value={data.length} />
        <StatCard
          icon={<FileCheck2 size={20} />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
          label="SJ KEMBALI / SELESAI"
          value={data.filter(d => !!d.returned_date || d.status === "Returned").length}
        />
        <StatCard
          icon={<Clock size={20} />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
          label="BELUM KEMBALI"
          value={data.filter(d => !d.returned_date && d.status !== "Returned").length}
        />
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <FilterBar searchPlaceholder="Cari no. SJ, customer, PO customer, order sheet, driver..." searchValue={search} onSearchChange={setSearch} />
      </div>

      {/* Table List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50/70">
              <tr className="border-b border-gray-100">
                <th className="px-5 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">No</th>
                <th className="px-5 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">No. Surat Jalan</th>
                <th className="px-5 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                <th className="px-5 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Sumber / Ref</th>
                <th className="px-5 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Sheet</th>
                <th className="px-5 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Driver / Nopol</th>
                <th className="px-5 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Tgl Kirim</th>
                <th className="px-5 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Tgl Kembali SJ</th>
                <th className="px-5 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-5 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
              ) : data.length > 0 ? (
                data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-4 text-xs text-gray-400 font-mono">{(page - 1) * 10 + idx + 1}</td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-gray-900 text-sm">{item.reference}</span>
                      {item.source_type && item.source_type !== "PO_CUSTOMER" && (
                        <span className="block text-[9px] font-black text-amber-600 uppercase tracking-wider">
                          Sumber: {item.source_type}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-800 font-semibold">{item.customer_name || "-"}</td>
                    <td className="px-5 py-4 text-xs font-mono text-gray-600">
                      {item.no_po_customer || item.po_cust_no || item.po_reference || item.source_ref || "-"}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-amber-700 font-semibold">
                      {item.order_sheet_ref || "-"}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-600">
                      <div className="font-medium">{item.driver_name || "-"}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{item.vehicle_no || ""}</div>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-600 font-mono">
                      {item.delivery_date ? String(item.delivery_date).split("T")[0] : "-"}
                    </td>
                    <td className="px-5 py-4">
                      {item.returned_date ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={12} className="shrink-0" />
                          <span>{String(item.returned_date).split("T")[0]}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                          <Clock size={12} className="shrink-0" />
                          <span>Belum Kembali</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        item.status === "Returned" || item.returned_date
                          ? "bg-emerald-100 text-emerald-800"
                          : item.status === "Approved"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {item.status === "Returned" || item.returned_date ? "Returned" : item.status || "Draft"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Tombol Input Tanggal Kembali SJ */}
                        <button
                          onClick={() => handleOpenReturnModal(item)}
                          title="Input Tanggal Kembali Surat Jalan"
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200 shadow-sm"
                        >
                          <CalendarCheck size={16} />
                        </button>
                        <PrintButton
                          moduleKey="surat_jalan"
                          moduleName="Surat Jalan"
                          data={item}
                        />
                        <button
                          onClick={() => handleOpenDetail(item.id!)}
                          title="Lihat Detail"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item.id!)}
                          title="Edit"
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id!)}
                          title="Hapus"
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
                        <Truck size={28} className="text-amber-600" />
                      </div>
                      <p className="font-semibold text-gray-700">Belum ada data Surat Jalan</p>
                      <p className="text-xs text-gray-400">Klik tombol "Buat Surat Jalan Baru" untuk memulai pembuatan pengiriman.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} totalItems={(page - 1) * 10 + data.length} onPageChange={fetchData} />
      </div>

      {/* ==================== MODAL 1: FORM TAMBAH / EDIT SURAT JALAN ==================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            <div className="px-8 py-5 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Surat Jalan / Delivery Order</span>
                <h3 className="text-xl font-black text-gray-800">
                  {selectedSJ ? `Edit Surat Jalan: ${selectedSJ.reference}` : "Buat Surat Jalan Baru"}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-6">
              {/* ── CARD TARIK DATA DARI SUMBER (PO Customer / PrO / WO) ── */}
              <div className="bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-slate-50 p-5 rounded-2xl border border-amber-100/90 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={16} className="text-amber-600" />
                    <span>Tarik Data Otomatis (Auto-Populate Fields & Items)</span>
                  </span>
                  {/* Source Type Selector Tabs */}
                  <div className="flex flex-wrap gap-1.5 bg-white/90 p-1 rounded-xl border border-amber-200/60 shadow-inner">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSourceType("PO_CUSTOMER");
                        setSelectedSourceId("");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                        activeSourceType === "PO_CUSTOMER"
                          ? "bg-amber-600 text-white shadow-md"
                          : "text-gray-600 hover:text-amber-700 hover:bg-amber-50"
                      }`}
                    >
                      <ClipboardList size={13} />
                      <span>PO Customer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSourceType("PRO");
                        setSelectedSourceId("");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                        activeSourceType === "PRO"
                          ? "bg-amber-600 text-white shadow-md"
                          : "text-gray-600 hover:text-amber-700 hover:bg-amber-50"
                      }`}
                    >
                      <Factory size={13} />
                      <span>PrO (Planning Produksi)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSourceType("WO");
                        setSelectedSourceId("");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                        activeSourceType === "WO"
                          ? "bg-amber-600 text-white shadow-md"
                          : "text-gray-600 hover:text-amber-700 hover:bg-amber-50"
                      }`}
                    >
                      <Wrench size={13} />
                      <span>Work Order (WO)</span>
                    </button>
                  </div>
                </div>

                {/* Dropdown for the Selected Source */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-amber-950 uppercase tracking-widest">
                    {activeSourceType === "PO_CUSTOMER" && "Pilih Dokumen PO Customer:"}
                    {activeSourceType === "PRO" && "Pilih Dokumen PrO (Planning Produksi):"}
                    {activeSourceType === "WO" && "Pilih Dokumen Work Order (WO):"}
                  </label>
                  {activeSourceType === "PO_CUSTOMER" && (
                    <SearchableSelect
                      options={customerPOs}
                      placeholder="Ketik / pilih No. PO Customer..."
                      value={selectedSourceId}
                      onChange={(val) => handlePullSourceData(val)}
                    />
                  )}
                  {activeSourceType === "PRO" && (
                    <SearchableSelect
                      options={proList}
                      placeholder="Ketik / pilih Dokumen PrO..."
                      value={selectedSourceId}
                      onChange={(val) => handlePullSourceData(val)}
                    />
                  )}
                  {activeSourceType === "WO" && (
                    <SearchableSelect
                      options={woList}
                      placeholder="Ketik / pilih Dokumen Work Order..."
                      value={selectedSourceId}
                      onChange={(val) => handlePullSourceData(val)}
                    />
                  )}
                </div>
              </div>

              {/* Header Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Customer */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 pl-1 uppercase tracking-widest">
                    Customer <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={customers}
                    placeholder="Pilih Customer..."
                    value={formData.customer_id}
                    onChange={(val) => setFormData({ ...formData, customer_id: val })}
                  />
                </div>

                {/* Text Field: No. PO Customer */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 pl-1 uppercase tracking-widest">
                    No. PO Customer
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: PO-CUST/2026/001..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none text-sm font-semibold transition-all"
                    value={formData.no_po_customer || ""}
                    onChange={(e) => setFormData({ ...formData, no_po_customer: e.target.value })}
                  />
                </div>

                {/* Text Field: Order Sheet */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 pl-1 uppercase tracking-widest">
                    Order Sheet / No. Lembar Kerja
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: OS/26/09/0001..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none text-sm font-semibold transition-all"
                    value={formData.order_sheet_ref || ""}
                    onChange={(e) => setFormData({ ...formData, order_sheet_ref: e.target.value })}
                  />
                </div>

                {/* Tanggal Kirim */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 pl-1 uppercase tracking-widest">
                    Tanggal Kirim <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none text-sm font-semibold transition-all"
                    value={formData.delivery_date}
                    onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                  />
                </div>

                {/* Nama Driver */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 pl-1 uppercase tracking-widest">
                    Nama Driver / Ekspedisi
                  </label>
                  <input
                    type="text"
                    placeholder="Nama Pengemudi / Supir..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none text-sm font-semibold transition-all"
                    value={formData.driver_name || ""}
                    onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                  />
                </div>

                {/* Plat No Kendaraan */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 pl-1 uppercase tracking-widest">
                    No. Polisi Kendaraan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: B 1234 ABC..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none text-sm font-semibold transition-all"
                    value={formData.vehicle_no || ""}
                    onChange={(e) => setFormData({ ...formData, vehicle_no: e.target.value })}
                  />
                </div>
              </div>

              {/* Balikan / Proof of Delivery Fields (Opsional) */}
              <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <CalendarCheck size={14} className="text-emerald-600" />
                  <span>Informasi Tanggal Kembali Surat Jalan (Proof of Delivery / Balikan SJ)</span>
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Tanggal Kembali SJ</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-xs font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                      value={formData.returned_date || ""}
                      onChange={(e) => setFormData({ ...formData, returned_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Diterima Oleh (Nama / Cap Customer)</label>
                    <input
                      type="text"
                      placeholder="Nama Penerima di Lokasi..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-xs font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                      value={formData.received_by_customer || ""}
                      onChange={(e) => setFormData({ ...formData, received_by_customer: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Catatan Balikan SJ</label>
                    <input
                      type="text"
                      placeholder="Catatan kondisi penerimaan..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-xs font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                      value={formData.return_notes || ""}
                      onChange={(e) => setFormData({ ...formData, return_notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Memo / Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 pl-1 uppercase tracking-widest">Keterangan / Memo Pengiriman</label>
                <textarea
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none text-sm font-medium transition-all"
                  placeholder="Keterangan pengiriman tambahan..."
                  value={formData.note || ""}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </div>

              {/* Table Items */}
              <div className="border-t border-gray-100 pt-5">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest">Daftar Item Pengiriman</h4>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                  >
                    <Plus size={14} /> <span>Tambah Baris Item</span>
                  </button>
                </div>

                <div className="border border-gray-100 rounded-xl overflow-visible">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-400 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Produk / Part Description</th>
                        <th className="px-4 py-3 text-center w-28">Unit</th>
                        <th className="px-4 py-3 text-center w-36">Qty Dikirim</th>
                        <th className="px-4 py-3 text-center w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {formData.details.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-3 space-y-1">
                            <ProductSearchDropdown
                              products={products}
                              value={item.product_id || ""}
                              onChange={(p) => {
                                if (!p.id) return;
                                const next = [...formData.details];
                                next[idx] = {
                                  ...next[idx],
                                  product_id: p.id,
                                  product_name: p.product_name,
                                  product_code: p.product_code || "",
                                  product_unit: p.product_unit || "PCS",
                                };
                                setFormData({ ...formData, details: next });
                              }}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 bg-gray-50 rounded-lg text-center font-bold text-xs border-none"
                              value={item.product_unit || "PCS"}
                              onChange={(e) => handleItemChange(idx, "product_unit", e.target.value)}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              required
                              min={1}
                              className="w-full px-2 py-1.5 bg-gray-50 rounded-lg text-center font-black text-sm border-none shadow-inner"
                              value={item.qty_delivered}
                              onChange={(e) => handleItemChange(idx, "qty_delivered", Number(e.target.value))}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <Trash size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {formData.details.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-gray-400 text-xs">
                            Belum ada item pengiriman. Pilih salah satu tab sumber (<b>PO Customer / PrO / WO</b>) di atas atau klik <b>"Tambah Baris Item"</b> manual.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-5 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-sm font-bold text-white shadow-lg transition-all active:scale-95"
                >
                  Simpan Surat Jalan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 2: INPUT TANGGAL KEMBALI SURAT JALAN ==================== */}
      {isReturnModalOpen && selectedSJForReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md">
                  <CalendarCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Input Tanggal Kembali SJ</h3>
                  <span className="text-xs font-mono text-emerald-700 font-bold">{selectedSJForReturn.reference}</span>
                </div>
              </div>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveReturnDate} className="p-6 space-y-5">
              {/* Info Card */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1.5 text-xs text-emerald-900">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Customer:</span>
                  <span className="font-bold">{selectedSJForReturn.customer_name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">No. PO / Ref:</span>
                  <span className="font-mono font-bold">{selectedSJForReturn.no_po_customer || selectedSJForReturn.po_cust_no || selectedSJForReturn.source_ref || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Tanggal Kirim:</span>
                  <span className="font-bold">{selectedSJForReturn.delivery_date ? String(selectedSJForReturn.delivery_date).split("T")[0] : "-"}</span>
                </div>
              </div>

              {/* Tanggal Kembali Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} className="text-emerald-600" />
                  <span>Tanggal Kembali Surat Jalan <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none text-sm font-bold text-gray-800"
                  value={returnForm.returned_date}
                  onChange={(e) => setReturnForm({ ...returnForm, returned_date: e.target.value })}
                />
              </div>

              {/* Diterima Oleh */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={14} className="text-emerald-600" />
                  <span>Diterima Oleh (Nama Penerima / Stempel)</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pak Budi (Security PT ABC)..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none text-sm font-medium"
                  value={returnForm.received_by_customer}
                  onChange={(e) => setReturnForm({ ...returnForm, received_by_customer: e.target.value })}
                />
              </div>

              {/* Catatan Balikan */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} className="text-emerald-600" />
                  <span>Catatan Balikan / Status Fisik Dokumen</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Surat Jalan asli telah diterima kembali lengkap bertanda tangan & stempel basah."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none text-xs font-medium"
                  value={returnForm.return_notes}
                  onChange={(e) => setReturnForm({ ...returnForm, return_notes: e.target.value })}
                />
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingReturn}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-lg transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  <span>{isSavingReturn ? "Menyimpan..." : "Simpan Tanggal Kembali"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 3: DETAIL VIEW SURAT JALAN ==================== */}
      {isDetailOpen && selectedSJ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="px-8 py-5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black tracking-widest text-amber-600 uppercase">Detail Surat Jalan</span>
                <h3 className="text-xl font-black text-gray-800 mt-0.5">{selectedSJ.reference}</h3>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-amber-50/40 p-5 rounded-2xl border border-amber-100 text-xs">
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Customer</span>
                  <span className="font-extrabold text-gray-800 text-sm">{selectedSJ.customer_name || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Sumber / No. Ref</span>
                  <span className="font-extrabold text-gray-800 text-sm font-mono">{selectedSJ.no_po_customer || selectedSJ.po_cust_no || selectedSJ.source_ref || selectedSJ.po_reference || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Order Sheet Ref</span>
                  <span className="font-extrabold text-amber-800 text-sm font-mono">{selectedSJ.order_sheet_ref || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Tanggal Kirim</span>
                  <span className="font-extrabold text-gray-800 text-sm">{selectedSJ.delivery_date ? String(selectedSJ.delivery_date).split("T")[0] : "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Driver / Nopol</span>
                  <span className="font-bold text-gray-700">{selectedSJ.driver_name || "-"} ({selectedSJ.vehicle_no || "-"})</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Tanggal Kembali SJ</span>
                  <span className={`font-bold text-sm ${selectedSJ.returned_date ? "text-emerald-700 font-mono" : "text-amber-600"}`}>
                    {selectedSJ.returned_date ? String(selectedSJ.returned_date).split("T")[0] : "Belum Kembali"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Diterima Oleh</span>
                  <span className="font-bold text-gray-700">{selectedSJ.received_by_customer || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">Status SJ</span>
                  <span className="font-bold text-emerald-800 uppercase text-xs">{selectedSJ.status}</span>
                </div>
              </div>

              {/* Notes */}
              {(selectedSJ.note || selectedSJ.return_notes) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {selectedSJ.note && (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider mb-1">Catatan Pengiriman</span>
                      <p className="text-gray-700">{selectedSJ.note}</p>
                    </div>
                  )}
                  {selectedSJ.return_notes && (
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                      <span className="text-[10px] font-black text-emerald-600 block uppercase tracking-wider mb-1">Catatan Balikan SJ</span>
                      <p className="text-emerald-900">{selectedSJ.return_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Detail Items Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest">Daftar Item Pengiriman</h4>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-400 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="px-6 py-3 text-left">Nama Produk / Part</th>
                        <th className="px-6 py-3 text-center w-32">Unit</th>
                        <th className="px-6 py-3 text-center w-36">Qty Dikirim</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {selectedSJ.details?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-bold block text-gray-800 text-sm">{item.product_name}</span>
                            <span className="text-[10px] font-mono text-gray-400">{item.product_code || "-"}</span>
                          </td>
                          <td className="px-6 py-4 text-center text-gray-600 font-semibold">{item.product_unit || "PCS"}</td>
                          <td className="px-6 py-4 text-center text-gray-850 font-black text-amber-700">{Number(item.qty_delivered).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-6 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-md transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
