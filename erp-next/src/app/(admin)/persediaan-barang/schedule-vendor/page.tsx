"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Plus,
  Search,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Truck,
  Clock,
  Compass,
  FileText,
  XCircle,
  Edit2,
  Upload,
  Download,
  Loader2
} from "lucide-react";
import api from "@/lib/api";

interface Schedule {
  id: string;
  purchase_order_id: string;
  reference_code: string;
  estimated_delivery_date: string;
  actual_delivery_date: string | null;
  status: "Pending" | "In Transit" | "Arrived" | "Cancelled";
  notes: string;
  po_reference: string;
  supplier_name: string;
  supplier_code: string;
  created_at?: string;
}

interface ExcelScheduleItem {
  no: number;
  productId: number;
  partName: string;
  productCode: string;
  po2: number;
  po1: number;
  total: number;
  scheduleTotal: number;
  devTotal: number;
  daily: {
    [dateStr: string]: {
      schedule: number;
      actIn: number;
      dev: number;
    }
  }
}

interface ExcelSheetData {
  supplierId: number;
  vendorName: string;
  dates: string[];
  items: ExcelScheduleItem[];
}

import { useVendorDeliveryCrudEnabled, useReceiptByScheduleEnabled } from "@/lib/config";

export default function ScheduleVendorPage() {
  const router = useRouter();
  const isCrudTabEnabled = useVendorDeliveryCrudEnabled();
  const isReceiptByScheduleEnabled = useReceiptByScheduleEnabled();

  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<"crud" | "excel">("excel");

  useEffect(() => {
    if (!isCrudTabEnabled) {
      setActiveTab("excel");
    }
  }, [isCrudTabEnabled]);

  // Grid Month/Year state (default: bulan & tahun berjalan)
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  // CRUD Schedules States
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Form states
  const [poList, setPoList] = useState<any[]>([]);
  const [selectedPoId, setSelectedPoId] = useState("");
  const [estDate, setEstDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update Status state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<Schedule["status"]>("Pending");
  const [statusNotes, setStatusNotes] = useState("");

  // Excel Grid States
  const [excelData, setExcelData] = useState<ExcelSheetData[]>([]);
  const [excelLoading, setExcelLoading] = useState(false);
  const [activeExcelSheetIdx, setActiveExcelSheetIdx] = useState<number>(0);

  // Send to Goods Receipt Modal State
  const [isSendReceiptModalOpen, setIsSendReceiptModalOpen] = useState(false);
  const [sendReceiptDate, setSendReceiptDate] = useState<string>("");
  const [sendReceiptItems, setSendReceiptItems] = useState<{
    productId: number;
    partName: string;
    productCode: string;
    total: number;
    qtyToReceive: number;
  }[]>([]);
  const [isSubmittingSendReceipt, setIsSubmittingSendReceipt] = useState(false);
  const [sendReceiptMsg, setSendReceiptMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Bulk Send All Vendors State
  const [isBulkSendModalOpen, setIsBulkSendModalOpen] = useState(false);
  const [bulkSendDate, setBulkSendDate] = useState<string>("");
  const [isSubmittingBulkSend, setIsSubmittingBulkSend] = useState(false);
  const [bulkSendMsg, setBulkSendMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // File upload state
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual inline cell editing state
  const [editingCell, setEditingCell] = useState<{
    supplierId: number;
    productId: number;
    dateStr: string;
    type: "schedule" | "actual" | "po1" | "po2";
  } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/vendor-schedules", {
        params: { search, status: selectedStatus }
      });
      if (res && res.data && res.data.success) {
        setSchedules(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching vendor schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOutstandingPOs = async () => {
    try {
      const res = await api.express.get("/purchase-orders").catch(() => null);
      if (res && res.data) {
        const pos = res.data.data || [];
        setPoList(pos.filter((p: any) => !p.is_closed && p.status === "Approved"));
      } else {
        setPoList([
          { id: 1, reference: "PO/GA-EPU/26/06/0002", supplier_name: "PT Lautan Luas Tbk" },
          { id: 2, reference: "PO/PROD-EPU/26/06/0009", supplier_name: "PT Astra Otoparts" }
        ]);
      }
    } catch (err) {
      console.error("Error fetching POs:", err);
    }
  };

  const fetchExcelGrid = async () => {
    setExcelLoading(true);
    try {
      const res = await api.express.get("/vendor-schedules/daily-grid", {
        params: { month: selectedMonth, year: selectedYear }
      });
      if (res && res.data && res.data.success) {
        setExcelData(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching Excel grid:", err);
    } finally {
      setExcelLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "crud") {
      fetchSchedules();
    } else {
      fetchExcelGrid();
    }
  }, [search, selectedStatus, activeTab, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchOutstandingPOs();
  }, []);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoId || !estDate) {
      alert("PO dan Tanggal Estimasi harus diisi.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.express.post("/vendor-schedules", {
        purchase_order_id: selectedPoId,
        estimated_delivery_date: estDate,
        notes
      });
      if (res && res.data && res.data.success) {
        alert("Vendor Delivery Schedule created successfully: " + res.data.reference_code);
        setIsModalOpen(false);
        setSelectedPoId("");
        setNotes("");
        fetchSchedules();
      }
    } catch (err: any) {
      alert("Failed to create schedule: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenStatusUpdate = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setNewStatus(schedule.status);
    setStatusNotes(schedule.notes);
    setIsStatusModalOpen(true);
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule) return;
    try {
      const res = await api.express.put(`/vendor-schedules/${selectedSchedule.id}/status`, {
        status: newStatus,
        notes: statusNotes
      });
      if (res && res.data && res.data.success) {
        alert("Status updated successfully.");
        setIsStatusModalOpen(false);
        setSelectedSchedule(null);
        fetchSchedules();
      }
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  // Handle cell manual saving
  const handleStartEditCell = (supplierId: number, productId: number, dateStr: string, type: "schedule" | "actual" | "po1" | "po2", currentVal: number) => {
    setEditingCell({ supplierId, productId, dateStr, type });
    setEditingValue(String(currentVal || ""));
  };

  const handleSaveCellInline = async () => {
    if (!editingCell) return;
    const { supplierId, productId, dateStr, type } = editingCell;
    const valNum = Number(editingValue) || 0;

    // Fast local optimistic update in state to make UI super smooth
    setExcelData((prevData) => {
      return prevData.map((sheet) => {
        if (sheet.supplierId === supplierId) {
          const updatedItems = sheet.items.map((item) => {
            if (item.productId === productId) {
              const oldDaily = item.daily[dateStr] || { schedule: 0, actIn: 0, dev: 0 };
              const newSched = type === "schedule" ? valNum : oldDaily.schedule;
              const newActIn = type === "actual" ? valNum : oldDaily.actIn;
              const newDev = newActIn - newSched;

              const updatedDaily = {
                ...item.daily,
                [dateStr]: { schedule: newSched, actIn: newActIn, dev: newDev }
              };

              // Recompute totals
              let scheduleTotal = 0;
              let devTotal = 0;
              Object.values(updatedDaily).forEach((d) => {
                scheduleTotal += d.schedule;
                devTotal += d.dev;
              });

              const newPo1 = type === "po1" ? valNum : item.po1;
              const newPo2 = type === "po2" ? valNum : item.po2;
              const newTotal = newPo1 + newPo2;

              return {
                ...item,
                po1: newPo1,
                po2: newPo2,
                total: newTotal,
                daily: updatedDaily,
                scheduleTotal,
                devTotal
              };
            }
            return item;
          });
          return { ...sheet, items: updatedItems };
        }
        return sheet;
      });
    });

    setEditingCell(null);

    // Persist to database in background
    try {
      await api.express.post("/vendor-schedules/save-cell", {
        supplier_id: supplierId,
        product_id: productId,
        dateStr,
        type,
        val: valNum
      });
    } catch (e) {
      console.error("Failed to save cell inline:", e);
      // Re-fetch to get accurate data in case of failure
      fetchExcelGrid();
    }
  };

  const handleDeleteItem = async (supplierId: number, productId: number, partName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus part "${partName}" dari schedule?`)) {
      return;
    }
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/vendor-schedules/item`, {
        method: "DELETE",
        headers: headers,
        body: JSON.stringify({ supplier_id: supplierId, product_id: productId })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Server returned status ${res.status}`);
      }

      const resData = await res.json();
      if (resData.success) {
        alert("Item berhasil dihapus.");
        fetchExcelGrid();
      } else {
        alert("Gagal: " + resData.message);
      }
    } catch (err: any) {
      alert("Gagal menghapus item: " + err.message);
    }
  };

  // Handle Excel upload import
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/vendor-schedules/import`, {
        method: "POST",
        headers: headers,
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Server returned status ${res.status}`);
      }

      const resData = await res.json();
      if (resData.success) {
        alert(resData.message || "Excel imported successfully!");
        setIsImportModalOpen(false);
        fetchExcelGrid();
      } else {
        alert("Failed: " + resData.message);
      }
    } catch (err: any) {
      alert("Failed to import Excel: " + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle downloading the master template Excel file
  const handleDownloadTemplate = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const res = await fetch(`/api/vendor-schedules/download-template`, {
        method: "GET",
        headers: headers
      });

      if (!res.ok) {
        throw new Error("Gagal mengunduh template.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Template_Schedule_Delivery.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      alert("Error Download Template: " + err.message);
    }
  };

  // Handle Excel download export
  const handleExportExcel = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const res = await fetch(`/api/vendor-schedules/export?month=${selectedMonth}&year=${selectedYear}`, {
        method: "GET",
        headers: headers
      });

      if (!res.ok) {
        throw new Error("Gagal mengunduh file export.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Schedule_Delivery_${selectedMonth}_${selectedYear}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      alert("Error Export Excel: " + err.message);
    }
  };

  // Active Excel sheet items and dates
  const activeExcelSheet = excelData[activeExcelSheetIdx];
  const activeExcelDates = activeExcelSheet?.dates || [];
  const activeExcelItems = activeExcelSheet?.items || [];

  const handleOpenSendReceiptModal = () => {
    if (!activeExcelSheet) return;
    const todayStr = new Date().toISOString().split("T")[0];
    const defaultDate = activeExcelDates.includes(todayStr) ? todayStr : (activeExcelDates[0] || todayStr);
    setSendReceiptDate(defaultDate);
    
    const mapped = (activeExcelSheet.items || []).map(item => ({
      productId: item.productId,
      partName: item.partName,
      productCode: item.productCode,
      total: item.total,
      qtyToReceive: Number(item.daily[defaultDate]?.actIn || 0)
    }));
    setSendReceiptItems(mapped);
    setSendReceiptMsg(null);
    setIsSendReceiptModalOpen(true);
  };

  const handleDateChangeForSendReceipt = (newDate: string) => {
    setSendReceiptDate(newDate);
    setSendReceiptItems(prev => prev.map(item => {
      const excelItem = activeExcelItems.find(i => i.productId === item.productId);
      const newQty = excelItem ? Number(excelItem.daily[newDate]?.actIn || 0) : item.qtyToReceive;
      return { ...item, qtyToReceive: newQty };
    }));
  };

  const handleConfirmSendToReceipt = async () => {
    if (!activeExcelSheet) return;
    const validItems = sendReceiptItems.filter(i => Number(i.qtyToReceive) > 0);
    if (validItems.length === 0) {
      setSendReceiptMsg({ type: "error", text: "Minimal 1 barang harus memiliki kuantitas diterima (Actual In > 0)." });
      return;
    }

    setIsSubmittingSendReceipt(true);
    setSendReceiptMsg(null);

    try {
      const payload = {
        supplier_id: activeExcelSheet.supplierId,
        schedule_date: sendReceiptDate,
        items: validItems.map(i => ({
          product_id: i.productId,
          product_name: i.partName,
          product_code: i.productCode,
          qty_ordered: i.total,
          qty_received: i.qtyToReceive
        }))
      };

      const res = await api.express.post("/receipt-by-schedule", payload);
      setSendReceiptMsg({
        type: "success",
        text: res.data.message || "Data kedatangan barang berhasil dikirim ke Penerimaan Barang by Schedule (Status: Pending)."
      });
      setTimeout(() => {
        setIsSendReceiptModalOpen(false);
        fetchExcelGrid();
      }, 1800);
    } catch (err: any) {
      console.error("Failed to send receipt:", err);
      setSendReceiptMsg({
        type: "error",
        text: err.response?.data?.message || err.message || "Gagal mengirim data penerimaan barang."
      });
    } finally {
      setIsSubmittingSendReceipt(false);
    }
  };

  const handleOpenBulkSendModal = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const defaultDate = activeExcelDates.includes(todayStr) ? todayStr : (activeExcelDates[0] || todayStr);
    setBulkSendDate(defaultDate);
    setBulkSendMsg(null);
    setIsBulkSendModalOpen(true);
  };

  const handleConfirmBulkSend = async () => {
    if (excelData.length === 0) {
      setBulkSendMsg({ type: "error", text: "Tidak ada data schedule yang tersedia." });
      return;
    }

    const sheetsPayload = excelData.map(sheet => {
      const validItems = (sheet.items || []).map(item => {
        const dailyAct = Number(item.daily[bulkSendDate]?.actIn || 0);
        const dailySch = Number(item.daily[bulkSendDate]?.schedule || 0);
        const qtyToRec = dailyAct > 0 ? dailyAct : (dailySch > 0 ? dailySch : (Number(item.total) > 0 ? Number(item.total) : 0));
        return {
          productId: item.productId,
          partName: item.partName,
          productCode: item.productCode,
          total: item.total,
          qtyToReceive: qtyToRec
        };
      }).filter(i => i.qtyToReceive > 0);

      return {
        supplierId: sheet.supplierId,
        vendorName: sheet.vendorName,
        items: validItems
      };
    }).filter(s => s.items.length > 0);

    if (sheetsPayload.length === 0) {
      setBulkSendMsg({
        type: "error",
        text: "Tidak ada barang dengan kuantiti kedatangan / schedule (> 0) pada tanggal yang dipilih."
      });
      return;
    }

    setIsSubmittingBulkSend(true);
    setBulkSendMsg(null);

    try {
      const payload = {
        schedule_date: bulkSendDate,
        sheets: sheetsPayload
      };

      const res = await api.express.post("/receipt-by-schedule/bulk-send", payload);
      setBulkSendMsg({
        type: "success",
        text: res.data.message || "Seluruh data schedule berhasil dikirim ke Penerimaan Barang by Schedule (Status: Pending)!"
      });
      setTimeout(() => {
        setIsBulkSendModalOpen(false);
        fetchExcelGrid();
        router.push("/persediaan-barang/penerimaan-by-schedule");
      }, 1500);
    } catch (err: any) {
      console.error("Failed to bulk send receipts:", err);
      setBulkSendMsg({
        type: "error",
        text: err.response?.data?.message || err.message || "Gagal mengirim data schedule ke penerimaan barang."
      });
    } finally {
      setIsSubmittingBulkSend(false);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen animate-in fade-in duration-500">
      
      {/* Back navigation */}
      <button 
        onClick={() => router.push("/persediaan-barang")}
        className="flex items-center gap-2 text-xs font-black text-emerald-600 hover:text-emerald-800 transition-colors uppercase tracking-widest"
      >
        <ArrowLeft size={14} /> Back to Inventory
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-200">
              <CalendarClock className="text-white animate-pulse" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Schedule <span className="text-emerald-600">Pengiriman Vendor</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Pantau target kedatangan material harian dari supplier. Hubungkan dengan penerimaan barang gudang secara otomatis, edit manual sel, serta lakukan import/export Excel.
          </p>
        </div>
        
        {activeTab === "crud" ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="group flex items-center gap-3 bg-gray-950 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-100 active:scale-95 overflow-hidden"
          >
            <Plus size={20} strokeWidth={3} />
            <span>Buat Estimasi Kedatangan</span>
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportExcel}
              accept=".xlsx, .xls"
              className="hidden"
            />
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-2xl font-bold text-xs shadow-sm hover:shadow-md transition-all"
            >
              <Upload className="text-emerald-600" size={14} />
              <span>Import Excel</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-5 py-3 bg-gray-950 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <Download size={14} />
              <span>Export Excel</span>
            </button>

            {isReceiptByScheduleEnabled && (
              <button
                onClick={handleOpenBulkSendModal}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 transition-all active:scale-95"
                title="Kirim Seluruh Vendor ke Penerimaan Barang by Schedule"
              >
                <Truck size={14} className="animate-pulse" />
                <span>Kirim Semua Schedule ke Penerimaan</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* TABS SELECTOR */}
      {isCrudTabEnabled && (
        <div className="flex border-b border-gray-200 w-full animate-in fade-in duration-300">
          <button
            onClick={() => setActiveTab("excel")}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${
              activeTab === "excel"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            Matriks Delivery Harian (Excel & Manual)
          </button>
          <button
            onClick={() => setActiveTab("crud")}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${
              activeTab === "crud"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            Daftar Rilis PO & CRUD
          </button>
        </div>
      )}

      {/* -------------------- TAB 2: EXCEL AGUSTUS 2026 DAILY GRID VIEWER -------------------- */}
      {activeTab === "excel" && (
        <div className="space-y-6">
          {/* Month/Year selector & Hints */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Periode Grid:</span>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(Number(e.target.value));
                  setActiveExcelSheetIdx(0);
                }}
                className="px-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none text-slate-700 focus:bg-white focus:ring-1 focus:ring-slate-200"
              >
                <option value={1}>Januari</option>
                <option value={2}>Februari</option>
                <option value={3}>Maret</option>
                <option value={4}>April</option>
                <option value={5}>Mei</option>
                <option value={6}>Juni</option>
                <option value={7}>Juli</option>
                <option value={8}>Agustus</option>
                <option value={9}>September</option>
                <option value={10}>Oktober</option>
                <option value={11}>November</option>
                <option value={12}>Desember</option>
              </select>

              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setActiveExcelSheetIdx(0);
                }}
                className="px-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none text-slate-700 focus:bg-white focus:ring-1 focus:ring-slate-200"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            
            <div className="text-[10px] text-slate-400 font-bold leading-relaxed flex items-center gap-1">
              <AlertCircle size={12} className="text-amber-500 shrink-0" />
              <span>Double-click / klik sel angka pada baris <b>Schedule</b> atau <b>Act In</b> untuk mengisi manual (real-time save).</span>
            </div>
          </div>

          {excelLoading ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-24 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-6">Sedang memuat data dari database...</p>
            </div>
          ) : excelData.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-24 text-center space-y-4">
              <AlertCircle size={40} className="text-gray-300 mx-auto" />
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Belum Ada Jadwal Pengiriman Harian pada Periode Ini</p>
              <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">Untuk memulai, silakan klik tombol <b>Import Excel</b> di atas untuk mengunggah master file rencana delivery bulanan Anda.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Vendor Sheet Selector */}
              <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-2xl w-full overflow-x-auto whitespace-nowrap shadow-inner border border-gray-100/50">
                {excelData.map((sheet, index) => (
                  <button
                    key={sheet.supplierId || sheet.vendorName}
                    onClick={() => setActiveExcelSheetIdx(index)}
                    className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                      activeExcelSheetIdx === index
                        ? "bg-white text-emerald-600 shadow-md border border-emerald-100/30 scale-[1.02]"
                        : "text-gray-400 hover:text-gray-800 hover:bg-white/40"
                    }`}
                  >
                    {sheet.vendorName}
                  </button>
                ))}
              </div>

              {/* Excel Table Display */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                  <div>
                    <h2 className="text-xl font-black text-gray-900">{activeExcelSheet?.vendorName}</h2>
                    <p className="text-xs font-semibold text-gray-400 mt-0.5">Total Item Part: {activeExcelItems.length}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                    {isReceiptByScheduleEnabled && (
                      <button
                        type="button"
                        onClick={handleOpenSendReceiptModal}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-md shadow-cyan-200 transition-all active:scale-95 mr-2"
                      >
                        <Truck size={16} />
                        <span>Kirim ke Penerimaan</span>
                      </button>
                    )}
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-slate-200 border border-slate-300"></span> Schedule</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-200"></span> Actual In</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-50 border border-rose-100"></span> Deviasi</span>
                  </div>
                </div>

                <div className="overflow-x-auto max-w-full rounded-2xl border border-slate-100 shadow-sm bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-4 font-black text-slate-500 uppercase tracking-widest text-center sticky left-0 bg-slate-50 z-10 w-12 border-r border-slate-100">No.</th>
                        <th className="px-4 py-4 font-black text-slate-500 uppercase tracking-widest sticky left-12 bg-slate-50 z-10 min-w-[240px] max-w-[240px] truncate border-r border-slate-100">Name Part</th>
                        <th className="px-3 py-4 font-black text-slate-500 uppercase tracking-widest text-center border-r border-slate-100 min-w-[80px]">Baris</th>
                        <th className="px-3 py-4 font-black text-slate-500 uppercase tracking-widest text-right border-r border-slate-100 min-w-[80px]">PO-2</th>
                        <th className="px-3 py-4 font-black text-slate-500 uppercase tracking-widest text-right border-r border-slate-100 min-w-[80px]">PO-1</th>
                        <th className="px-3 py-4 font-black text-slate-500 uppercase tracking-widest text-right border-r border-slate-100 min-w-[90px]">Total PO</th>
                        <th className="px-3 py-4 font-black text-slate-500 uppercase tracking-widest text-right border-r border-slate-100 min-w-[95px]">Total Sched</th>
                        <th className="px-3 py-4 font-black text-slate-500 uppercase tracking-widest text-right border-r border-slate-100 min-w-[90px]">Total Dev</th>
                        {activeExcelDates.map((dateStr) => {
                          const dateObj = new Date(dateStr);
                          const dayNum = dateObj.getUTCDate();
                          const dayOfWeek = dateObj.getUTCDay();
                          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                          return (
                            <th 
                              key={dateStr} 
                              className={`px-2 py-4 font-black text-center min-w-[50px] border-r border-slate-100 ${
                                isWeekend 
                                  ? "text-white bg-rose-500" 
                                  : "text-slate-600 bg-slate-100/50"
                              }`}
                            >
                              {dayNum}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeExcelItems.map((item) => {
                        const totalPO = item.po1 + item.po2;
                        return (
                          <React.Fragment key={item.productId || item.partName}>
                            {/* Row 1: Schedule */}
                            <tr className="hover:bg-slate-50/20 transition-colors">
                              <td className="px-4 py-3 text-center font-bold text-slate-400 sticky left-0 bg-white z-10 border-r border-slate-100" rowSpan={3}>
                                {item.no}
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-900 sticky left-12 bg-white z-10 max-w-[240px] border-r border-slate-100 whitespace-normal leading-relaxed group/part" rowSpan={3} title={item.partName}>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate">{item.partName}</span>
                                  <button
                                    onClick={() => handleDeleteItem(activeExcelSheet.supplierId, item.productId, item.partName)}
                                    className="opacity-0 group-hover/part:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-all shrink-0"
                                    title="Hapus item ini dari schedule"
                                  >
                                    <XCircle size={14} />
                                  </button>
                                </div>
                              </td>
                              <td className="px-3 py-1.5 font-bold text-slate-400 bg-slate-50 border-r border-slate-100 text-center">
                                Schedule
                              </td>
                              <td 
                                className="px-3 py-1.5 text-right font-semibold text-slate-600 border-r border-slate-100 cursor-pointer hover:bg-slate-200/50" 
                                rowSpan={3}
                                onDoubleClick={() => handleStartEditCell(activeExcelSheet.supplierId, item.productId, activeExcelDates[0], "po2", item.po2)}
                                onClick={() => handleStartEditCell(activeExcelSheet.supplierId, item.productId, activeExcelDates[0], "po2", item.po2)}
                              >
                                {editingCell?.supplierId === activeExcelSheet.supplierId &&
                                 editingCell?.productId === item.productId &&
                                 editingCell?.type === "po2" ? (
                                  <input
                                    type="number"
                                    autoFocus
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    onBlur={handleSaveCellInline}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveCellInline();
                                      if (e.key === "Escape") setEditingCell(null);
                                    }}
                                    className="w-16 text-right text-xs font-bold border border-slate-400 rounded outline-none p-0.5 bg-white text-slate-900"
                                  />
                                ) : (
                                  item.po2 ? item.po2.toLocaleString() : "-"
                                )}
                              </td>
                              <td 
                                className="px-3 py-1.5 text-right font-semibold text-slate-600 border-r border-slate-100 cursor-pointer hover:bg-slate-200/50" 
                                rowSpan={3}
                                onDoubleClick={() => handleStartEditCell(activeExcelSheet.supplierId, item.productId, activeExcelDates[0], "po1", item.po1)}
                                onClick={() => handleStartEditCell(activeExcelSheet.supplierId, item.productId, activeExcelDates[0], "po1", item.po1)}
                              >
                                {editingCell?.supplierId === activeExcelSheet.supplierId &&
                                 editingCell?.productId === item.productId &&
                                 editingCell?.type === "po1" ? (
                                  <input
                                    type="number"
                                    autoFocus
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    onBlur={handleSaveCellInline}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveCellInline();
                                      if (e.key === "Escape") setEditingCell(null);
                                    }}
                                    className="w-16 text-right text-xs font-bold border border-slate-400 rounded outline-none p-0.5 bg-white text-slate-900"
                                  />
                                ) : (
                                  item.po1 ? item.po1.toLocaleString() : "-"
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-right font-black text-slate-900 border-r border-slate-100" rowSpan={3}>
                                {totalPO ? totalPO.toLocaleString() : "-"}
                              </td>
                              <td className="px-3 py-1.5 text-right font-black text-blue-700 border-r border-slate-100" rowSpan={3}>
                                {item.scheduleTotal ? item.scheduleTotal.toLocaleString() : "-"}
                              </td>
                              <td className={`px-3 py-1.5 text-right font-black border-r border-slate-100 ${item.devTotal < 0 ? 'text-rose-600' : 'text-slate-800'}`} rowSpan={3}>
                                {item.devTotal ? item.devTotal.toLocaleString() : "-"}
                              </td>
                              {activeExcelDates.map((dateStr) => {
                                const val = item.daily[dateStr]?.schedule || 0;
                                const isEditing = editingCell?.supplierId === activeExcelSheet.supplierId &&
                                                  editingCell?.productId === item.productId &&
                                                  editingCell?.dateStr === dateStr &&
                                                  editingCell?.type === "schedule";
                                const cellDate = new Date(dateStr);
                                const isWeekend = cellDate.getUTCDay() === 0 || cellDate.getUTCDay() === 6;

                                return (
                                  <td
                                    key={dateStr}
                                    onDoubleClick={() => handleStartEditCell(activeExcelSheet.supplierId, item.productId, dateStr, "schedule", val)}
                                    onClick={() => handleStartEditCell(activeExcelSheet.supplierId, item.productId, dateStr, "schedule", val)}
                                    className={`px-2 py-1.5 text-center font-bold border-r border-slate-100 cursor-pointer hover:bg-slate-200/50 ${
                                      isWeekend ? "bg-rose-50/30 text-rose-700" : "bg-slate-50/20 text-slate-700"
                                    }`}
                                  >
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        autoFocus
                                        value={editingValue}
                                        onChange={(e) => setEditingValue(e.target.value)}
                                        onBlur={handleSaveCellInline}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") handleSaveCellInline();
                                          if (e.key === "Escape") setEditingCell(null);
                                        }}
                                        className="w-12 text-center text-xs font-black border border-slate-400 rounded outline-none p-0.5 bg-white text-slate-900"
                                      />
                                    ) : (
                                      val ? val.toLocaleString() : "-"
                                    )}
                                  </td>
                                );
                              })}
                            </tr>

                            {/* Row 2: Act In */}
                            <tr className="hover:bg-slate-50/20 transition-colors">
                              <td className="px-3 py-1.5 font-bold text-emerald-600 bg-emerald-50/40 border-r border-slate-100 text-center">
                                Act In
                              </td>
                              {activeExcelDates.map((dateStr) => {
                                const val = item.daily[dateStr]?.actIn || 0;
                                const isEditing = editingCell?.supplierId === activeExcelSheet.supplierId &&
                                                  editingCell?.productId === item.productId &&
                                                  editingCell?.dateStr === dateStr &&
                                                  editingCell?.type === "actual";
                                const cellDate = new Date(dateStr);
                                const isWeekend = cellDate.getUTCDay() === 0 || cellDate.getUTCDay() === 6;

                                return (
                                  <td
                                    key={dateStr}
                                    onDoubleClick={() => handleStartEditCell(activeExcelSheet.supplierId, item.productId, dateStr, "actual", val)}
                                    onClick={() => handleStartEditCell(activeExcelSheet.supplierId, item.productId, dateStr, "actual", val)}
                                    className={`px-2 py-1.5 text-center font-black border-r border-slate-100 cursor-pointer hover:bg-emerald-200/50 ${
                                      isWeekend ? "bg-rose-50/20 text-emerald-700" : "bg-emerald-50/10 text-emerald-700"
                                    }`}
                                  >
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        autoFocus
                                        value={editingValue}
                                        onChange={(e) => setEditingValue(e.target.value)}
                                        onBlur={handleSaveCellInline}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") handleSaveCellInline();
                                          if (e.key === "Escape") setEditingCell(null);
                                        }}
                                        className="w-12 text-center text-xs font-black border border-slate-400 rounded outline-none p-0.5 bg-white text-slate-900"
                                      />
                                    ) : (
                                      val ? val.toLocaleString() : "-"
                                    )}
                                  </td>
                                );
                              })}
                            </tr>

                            {/* Row 3: Dev */}
                            <tr className="hover:bg-slate-50/20 transition-colors border-b border-slate-200">
                              <td className="px-3 py-1.5 font-bold text-rose-500 bg-rose-50/30 border-r border-slate-100 text-center">
                                Dev
                              </td>
                              {activeExcelDates.map((dateStr) => {
                                const val = item.daily[dateStr]?.dev || 0;
                                const cellDate = new Date(dateStr);
                                const isWeekend = cellDate.getUTCDay() === 0 || cellDate.getUTCDay() === 6;
                                return (
                                  <td 
                                    key={dateStr} 
                                    className={`px-2 py-1.5 text-center font-black border-r border-slate-100 ${
                                      val < 0 
                                        ? 'text-rose-600 bg-rose-50/60 font-black' 
                                        : val > 0 
                                          ? 'text-emerald-700 bg-emerald-100/50' 
                                          : isWeekend 
                                            ? 'text-slate-400 bg-rose-50/10' 
                                            : 'text-slate-400 bg-slate-50/10'
                                    }`}
                                  >
                                    {val ? (val < 0 ? val.toLocaleString() : `+${val.toLocaleString()}`) : "-"}
                                  </td>
                                );
                              })}
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------- TAB 1: CRUD SCHEDULING (EXISTING VIEW) -------------------- */}
      {activeTab === "crud" && (
        <div className="space-y-6">
          {/* Filters & Status list */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-1.5 p-1 bg-gray-50 rounded-2xl w-max overflow-x-auto">
              {[
                { value: "all", label: "Semua" },
                { value: "Pending", label: "Pending" },
                { value: "In Transit", label: "Dalam Transit" },
                { value: "Arrived", label: "Sampai (Arrived)" },
                { value: "Cancelled", label: "Dibatalkan" }
              ].map((statusObj) => (
                <button
                  key={statusObj.value}
                  onClick={() => setSelectedStatus(statusObj.value)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    selectedStatus === statusObj.value 
                      ? "bg-white text-emerald-600 shadow-sm border border-emerald-100/50" 
                      : "text-gray-400 hover:text-gray-800"
                  }`}
                >
                  {statusObj.label}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari kode schedule, PO, supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          {/* Main List */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">No. Schedule</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">No. PO</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Supplier</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Estimasi Sampai</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Tanggal Sampai</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={7} className="px-6 py-6"><div className="h-10 bg-gray-50 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : schedules.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-24 text-center font-bold text-gray-400 uppercase tracking-widest text-sm bg-gray-50/10">
                        Tidak Ada Jadwal Pengiriman Terdaftar
                      </td>
                    </tr>
                  ) : schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="font-black text-gray-950 text-sm">{s.reference_code}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-bold text-gray-700 text-xs flex items-center gap-1.5">
                          <FileText size={12} className="text-gray-400" /> {s.po_reference}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-bold text-gray-800 text-xs">{s.supplier_name}</div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{s.supplier_code}</div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="text-xs font-semibold text-gray-700 flex items-center justify-center gap-1">
                          <Calendar size={12} className="text-gray-400" /> {s.estimated_delivery_date}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="text-xs font-bold text-gray-800">
                          {s.actual_delivery_date ? (
                            <span className="text-emerald-600 flex items-center justify-center gap-1">
                              <CheckCircle2 size={12} /> {s.actual_delivery_date}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex justify-center">
                          {s.status === "Pending" && (
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-600 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-0.5">
                              <Clock size={10} /> Pending
                            </span>
                          )}
                          {s.status === "In Transit" && (
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-0.5 animate-pulse">
                              <Compass size={10} /> In Transit
                            </span>
                          )}
                          {s.status === "Arrived" && (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-0.5">
                              <Truck size={10} /> Arrived
                            </span>
                          )}
                          {s.status === "Cancelled" && (
                            <span className="px-2.5 py-1 bg-red-50 text-red-600 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-0.5">
                              <XCircle size={10} /> Cancelled
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <button
                          onClick={() => handleOpenStatusUpdate(s)}
                          className="px-3 py-2 bg-gray-50 text-gray-600 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-black transition-all flex items-center gap-1 mx-auto"
                        >
                          <Edit2 size={10} /> Update Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ESTIMASI KEDATANGAN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl border border-gray-100 shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CalendarClock size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Buat Estimasi Pengiriman Vendor</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">Tentukan estimasi tanggal material sampai dari PO Supplier</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                [X]
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Referensi Purchase Order (PO)</label>
                <select
                  value={selectedPoId}
                  onChange={(e) => setSelectedPoId(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all appearance-none"
                >
                  <option value="">-- Pilih Purchase Order Approved --</option>
                  {poList.map(po => (
                    <option key={po.id} value={po.id}>
                      {po.reference} - {po.supplier_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Estimasi Tanggal Kedatangan</label>
                <input
                  type="date"
                  value={estDate}
                  onChange={(e) => setEstDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all h-12"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Catatan / Keterangan</label>
                <input
                  type="text"
                  placeholder="Keterangan pengiriman..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all h-12"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-100"
                >
                  {isSubmitting ? "Saving..." : "Simpan Jadwal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE STATUS MODAL */}
      {isStatusModalOpen && selectedSchedule && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl border border-gray-100 shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">Update Status Pengiriman</h3>
                <p className="text-xs text-gray-400 font-bold mt-0.5">Ref: {selectedSchedule.reference_code} ({selectedSchedule.po_reference})</p>
              </div>
              <button 
                onClick={() => setIsStatusModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                [X]
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Status Pengiriman Baru</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as Schedule["status"])}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all appearance-none"
                >
                  <option value="Pending">Pending (Menunggu)</option>
                  <option value="In Transit">Dalam Transit (Sedang Dikirim)</option>
                  <option value="Arrived">Arrived (Sudah Sampai di Gudang)</option>
                  <option value="Cancelled">Cancelled (Dibatalkan)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Catatan Tambahan</label>
                <input
                  type="text"
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all h-12"
                />
              </div>

              {newStatus === "Arrived" && (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3 text-xs text-emerald-800 font-semibold leading-relaxed">
                  <CheckCircle2 className="shrink-0 text-emerald-600 mt-0.5" size={16} />
                  <div>
                    Mengubah status menjadi **Arrived** secara otomatis akan merekam tanggal kedatangan hari ini ({new Date().toLocaleDateString("id-ID")}) dan memperbarui stok di sistem pergudangan.
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-100"
                >
                  Update Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT MODAL POPUP */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl border border-gray-100 shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Upload size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Import Schedule Delivery</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">Unggah berkas untuk memperbarui jadwal harian secara masal</p>
                </div>
              </div>
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm"
              >
                [X]
              </button>
            </div>

            <div className="space-y-6">
              {/* Download Section */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Template Schedule Delivery</h4>
                  <p className="text-[11px] text-slate-400 font-semibold">Gunakan template resmi untuk format penulisan yang benar.</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs shadow-sm transition-all text-center"
                >
                  <Download size={14} className="text-emerald-600" />
                  <span>Unduh Template</span>
                </button>
              </div>

              {/* Upload Dropzone Area */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/10 rounded-3xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
              >
                <div className="p-4 bg-slate-50 group-hover:bg-emerald-50 rounded-2xl text-slate-400 group-hover:text-emerald-600 transition-colors">
                  {importing ? (
                    <Loader2 className="animate-spin text-emerald-600" size={24} />
                  ) : (
                    <Upload size={24} />
                  )}
                </div>
                
                {importing ? (
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-700">Sedang mengimpor berkas Excel...</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sistem sedang mencocokkan nama part & menulis ke database</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-700">Klik untuk memilih berkas Excel</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mendukung format .xlsx atau .xls</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  disabled={importing}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-500 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all text-center"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KIRIM KE PENERIMAAN BARANG BY SCHEDULE */}
      {isSendReceiptModalOpen && activeExcelSheet && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-teal-600 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Truck size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black">Kirim ke Penerimaan Barang by Schedule</h3>
                  <p className="text-xs text-cyan-100 font-medium">
                    Vendor: <b className="text-white">{activeExcelSheet.vendorName}</b>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSendReceiptModalOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {sendReceiptMsg && (
                <div
                  className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 ${
                    sendReceiptMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {sendReceiptMsg.type === "success" ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-rose-600" />}
                  <span>{sendReceiptMsg.text}</span>
                </div>
              )}

              {/* Date Selection */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <label className="text-xs font-black text-slate-700 block">Pilih Tanggal Kedatangan Barang:</label>
                  <p className="text-[11px] text-slate-400 font-medium">Qty Actual In akan otomatis terisi sesuai tanggal yang dipilih.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-cyan-600" />
                  <select
                    value={sendReceiptDate}
                    onChange={(e) => handleDateChangeForSendReceipt(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  >
                    {activeExcelDates.map((dStr) => (
                      <option key={dStr} value={dStr}>
                        {new Date(dStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">
                  Rincian Barang yang Diterima (Actual In &gt; 0)
                </h4>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                        <th className="py-3 px-4">Nama Part</th>
                        <th className="py-3 px-4 text-right">Total PO</th>
                        <th className="py-3 px-4 text-right w-36 bg-cyan-50/50 text-cyan-900">Qty Diterima (Actual)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {sendReceiptItems.map((item, idx) => (
                        <tr key={item.productId || idx} className="hover:bg-slate-50/40">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{item.partName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{item.productCode}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-600">
                            {item.total.toLocaleString("id-ID")} PCS
                          </td>
                          <td className="py-3 px-4 text-right bg-cyan-50/20">
                            <input
                              type="number"
                              min="0"
                              value={item.qtyToReceive}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setSendReceiptItems(prev => prev.map((it, i) => i === idx ? { ...it, qtyToReceive: val } : it));
                              }}
                              className="w-24 px-2 py-1 bg-white border border-cyan-300 rounded-lg text-right font-black text-cyan-700 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">
                Total Diterima:{" "}
                <b className="text-cyan-700 text-sm">
                  {sendReceiptItems.reduce((a, b) => a + Number(b.qtyToReceive || 0), 0).toLocaleString("id-ID")} PCS
                </b>
              </span>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsSendReceiptModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSendToReceipt}
                  disabled={isSubmittingSendReceipt}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white rounded-xl font-black text-xs shadow-md shadow-cyan-200 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingSendReceipt ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Memproses...
                    </>
                  ) : (
                    <>
                      <Truck size={16} /> Proses Penerimaan Barang
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- BULK SEND ALL VENDORS MODAL -------------------- */}
      {isBulkSendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl">
                  <Truck size={22} className="text-white animate-bounce" />
                </div>
                <div>
                  <h3 className="font-black text-lg">Kirim Semua Schedule Vendor ke Penerimaan</h3>
                  <p className="text-xs text-emerald-100 font-medium mt-0.5">
                    Membuat dokumen penerimaan (Status: Pending) untuk seluruh vendor pada tanggal yang dipilih
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkSendModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {bulkSendMsg && (
                <div
                  className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${
                    bulkSendMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {bulkSendMsg.type === "success" ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-rose-600" />}
                  <span>{bulkSendMsg.text}</span>
                </div>
              )}

              {/* Date Selection */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <label className="text-xs font-black text-slate-700 block">Pilih Tanggal Kedatangan / Schedule:</label>
                  <p className="text-[11px] text-slate-400 font-medium">Sistem akan menyaring kuantiti kedatangan harian pada tanggal ini.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-emerald-600" />
                  <select
                    value={bulkSendDate}
                    onChange={(e) => setBulkSendDate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {activeExcelDates.map((dStr) => (
                      <option key={dStr} value={dStr}>
                        {new Date(dStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Summary of Vendors to be sent */}
              <div>
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">
                  Ringkasan Vendor yang Akan Dikirim ({excelData.length} Vendor Terdaftar)
                </h4>
                <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {excelData.map((sheet, idx) => {
                    const itemCount = (sheet.items || []).filter(item => {
                      const dailyAct = Number(item.daily[bulkSendDate]?.actIn || 0);
                      const dailySch = Number(item.daily[bulkSendDate]?.schedule || 0);
                      return dailyAct > 0 || dailySch > 0 || Number(item.total) > 0;
                    }).length;
                    const totalQty = (sheet.items || []).reduce((acc, item) => {
                      const dailyAct = Number(item.daily[bulkSendDate]?.actIn || 0);
                      const dailySch = Number(item.daily[bulkSendDate]?.schedule || 0);
                      const q = dailyAct > 0 ? dailyAct : (dailySch > 0 ? dailySch : Number(item.total || 0));
                      return acc + q;
                    }, 0);

                    return (
                      <div key={sheet.supplierId || idx} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">{sheet.vendorName}</span>
                          <span className="text-[10px] text-slate-400">{itemCount} Part Item</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-emerald-700 text-xs">
                            {totalQty.toLocaleString("id-ID")} PCS
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">
                Total Vendor: <b className="text-emerald-700 text-sm">{excelData.length} Supplier</b>
              </span>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsBulkSendModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkSend}
                  disabled={isSubmittingBulkSend}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-black text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingBulkSend ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Mengirim Seluruh Vendor...
                    </>
                  ) : (
                    <>
                      <Truck size={16} /> Kirim Sekarang
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
