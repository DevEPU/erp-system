"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForecastEnabled, useMRPReleasePREnabled, useShowMRPSafetyStockEnabled, useShowMRPScrapLossEnabled, useMRPManualFGEnabled } from "@/lib/config";
import {
  FileSpreadsheet,
  Plus,
  Search,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  BarChart3,
  ShoppingCart,
  Clock,
  ArrowRightLeft,
  Pencil,
  Edit2,
  Trash2,
  Eye,
  X,
  PackageCheck,
  TrendingUp,
  Boxes,
  DollarSign,
  Send,
  FileText,
  Warehouse,
  UserCheck,
  ShieldAlert,
  Percent,
  CheckSquare,
  Square,
  Split,
  Building2,
  Calculator,
  RotateCw,
  ArrowUpDown,
  Filter,
  Hash,
  Save,
  CalendarClock
} from "lucide-react";
import api from "@/lib/api";
import TablePagination from "@/components/ui/TablePagination";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import SortFilterModal, { SortOption } from "@/components/ui/SortFilterModal";
import ProductSearchDropdown, { type ProductOption } from "@/components/ui/ProductSearchDropdown";

interface MRPDetailItem {
  id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  product_unit: string;
  class_type?: string;
  source_type?: string;
  need_all_qty?: number;
  stock_std_qty?: number;
  sto_qty?: number;
  gross_qty?: number;
  safety_stock_qty?: number;
  current_stock?: number;
  on_order_qty?: number;
  qty_required: number;
  net_qty?: number;
  supplier_id?: string | null;
  supplier_name?: string;
  available_suppliers?: any[];
  part_no_vendor?: string;
  part_name_vendor?: string;
  ord_qty?: number;
  mrp_qty?: number;
  pcs_per_pack?: number;
  unit_price?: number;
  amount?: number;
  allocation_percent?: number;
  release_draft_percent?: number;
  bom_ref?: string;
  remark?: string;
}

interface MRP {
  id: string;
  po_customer_id?: string;
  forecast_id?: string;
  reference_code: string;
  planning_source?: string;
  no_po_customer?: string;
  po_reference?: string;
  forecast_reference?: string;
  customer_name?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  planner_name?: string;
  safety_stock_percent?: number;
  scrap_loss_percent?: number;
  time_frame_start: string;
  time_frame_end: string;
  total_gross_qty?: number;
  total_net_qty?: number;
  total_est_cost?: number;
  note?: string;
  status: "Draft" | "Waiting for Approval" | "Approved" | "Rejected" | "Released" | "Closed" | "Cancelled";
  revision_number?: number;
  parent_mrp_id?: string;
  created_at?: string;
  details?: MRPDetailItem[];
  cycle_mrps?: any[];
  cycle_summary?: any[];
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

interface ReleaseModalItem {
  id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  product_unit: string;
  supplier_name: string;
  class_type?: string;
  mrp_qty: number;
  qty_released_pr: number;
  remaining_qty: number;
  percent: number;
  release_qty: number;
  unit_price: number;
  amount: number;
  is_selected: boolean;
}

export default function MRPPage() {
  const router = useRouter();
  const isForecastEnabled = useForecastEnabled();
  const isMRPReleasePREnabled = useMRPReleasePREnabled();
  const isShowSafetyStockActive = useShowMRPSafetyStockEnabled();
  const isShowScrapLossActive = useShowMRPScrapLossEnabled();
  const isMRPManualFGActive = useMRPManualFGEnabled();

  // Dataset State
  const [mrps, setMRPs] = useState<MRP[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<number | "all">("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; order: "asc" | "desc" }>({ key: "id", order: "desc" });
  const [selectedMRP, setSelectedMRP] = useState<MRP | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [detailTab, setDetailTab] = useState<"step1_physical" | "step2_vendor" | "summary_gabungan">("step1_physical");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Pagination & Modal Hooks
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const { isOpen, type, title, message, onConfirm, showSuccess, showError, showConfirm, closeModal, isLoading: isActionLoading } = useStatusModal();

  // Release to PR with Percentage Modal State
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [releaseTargetMRP, setReleaseTargetMRP] = useState<MRP | null>(null);
  const [releaseModalItems, setReleaseModalItems] = useState<ReleaseModalItem[]>([]);
  const [globalReleasePercent, setGlobalReleasePercent] = useState<number>(80);
  const [isSubmittingPRRelease, setIsSubmittingPRRelease] = useState(false);
  const [isSavingDraftPRPercent, setIsSavingDraftPRPercent] = useState(false);

  // Form states (Generate MRP)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [planningSource, setPlanningSource] = useState<"PO Customer" | "Sales Forecast" | "Manual FG Entry">("PO Customer");
  const [selectedPoId, setSelectedPoId] = useState("");
  const [selectedForecastId, setSelectedForecastId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [plannerName, setPlannerName] = useState("PPIC Planner");
  const [safetyStockPct, setSafetyStockPct] = useState(0);
  const [scrapLossPct, setScrapLossPct] = useState(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]);
  const [enableCarryOver, setEnableCarryOver] = useState(false);
  const [selectedCarryOverMrpId, setSelectedCarryOverMrpId] = useState("");
  const [mrpNote, setMrpNote] = useState("");
  const [manualFgItems, setManualFgItems] = useState<{ product_id: string; product_code: string; product_name: string; qty: number }[]>([
    { product_id: "", product_code: "", product_name: "", qty: 1 }
  ]);

  // Edit / Vendor Allocation items state inside detail
  const [editableDetails, setEditableDetails] = useState<MRPDetailItem[]>([]);
  const [isSavingAllocation, setIsSavingAllocation] = useState(false);
  const [selectedDetailItemIds, setSelectedDetailItemIds] = useState<(string | number)[]>([]);

  // Dropdown Lists
  const [customerPOs, setCustomerPOs] = useState<any[]>([]);
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  // Fetch initial MRPs
  const fetchMRPs = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/manufacturing/mrp", { params: { search } });
      if (res && res.data && res.data.success) {
        const list = res.data.data || [];
        setMRPs(list);
        setTotalItems(list.length);
        setTotalPages(Math.ceil(list.length / 10) || 1);
      }
    } catch (err) {
      console.error("Error fetching MRPs:", err);
      setMRPs([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Dropdowns
  const fetchDropdowns = async () => {
    try {
      const [poRes, fcRes, whRes, supRes, prodRes] = await Promise.all([
        api.express.get("/customer-po", { limit: 999 }),
        api.express.get("/forecasts", { limit: 999 }),
        api.express.get("/warehouses", { limit: 999 }),
        api.express.get("/suppliers", { limit: 999 }).catch(() => ({ data: { data: [] } })),
        api.express.get("/products", { limit: 9999 }).catch(() => ({ data: { data: [] } }))
      ]);

      const poList = poRes.data.data || poRes.data || [];
      setCustomerPOs(poList.map((p: any) => ({
        value: p.id,
        label: `${p.reference} - PO: ${p.no_po_customer || '-'} (${p.customer_name || '-'})`
      })));

      const fcList = fcRes.data.data || fcRes.data || [];
      setForecasts(fcList.map((f: any) => ({
        value: f.id,
        label: `${f.reference} - ${f.customer_name || '-'} (${f.start_date ? f.start_date.split("T")[0] : f.month})`
      })));

      const whList = whRes.data.data || whRes.data || [];
      setWarehouses(whList.map((w: any) => ({
        value: w.id,
        label: `${w.code} - ${w.name}`
      })));

      const supList = supRes.data.data || supRes.data || [];
      setSuppliers(supList.map((s: any) => ({
        value: s.id,
        label: `${s.supplier_code ? s.supplier_code + ' - ' : ''}${s.supplier_name}`
      })));

      setProducts(prodRes.data.data || prodRes.data || []);
    } catch (err) {
      console.error("Error fetching MRP dropdown sources:", err);
    }
  };

  useEffect(() => {
    fetchMRPs();
    fetchDropdowns();
  }, [search]);

  // View detail
  const handleViewMRP = async (id: string) => {
    try {
      const res = await api.express.get(`/manufacturing/mrp/${id}`);
      if (res && res.data && res.data.success) {
        const mrpData = res.data.data;
        setSelectedMRP(mrpData);
        const rawDetails = mrpData.details || [];
        const sortedDetails = rawDetails.slice().sort((a: any, b: any) => {
          if (Number(a.product_id || 0) !== Number(b.product_id || 0)) {
            return Number(a.product_id || 0) - Number(b.product_id || 0);
          }
          return Number(a.id || 0) - Number(b.id || 0);
        });

        setEditableDetails(
          sortedDetails.map((d: any) => {
            const rawAlloc = Number(d.allocation_percent);
            const normalizedAlloc = (rawAlloc > 0 && rawAlloc <= 1) ? Math.round(rawAlloc * 100) : (rawAlloc !== undefined && rawAlloc !== null && !isNaN(rawAlloc) ? Number(rawAlloc) : 100);
            const mrp1Q = d.mrp1_qty !== undefined && d.mrp1_qty !== null ? Number(d.mrp1_qty) : Number(d.mrp_qty ?? 0);
            const mrp1Rel = Number(d.mrp1_released_pr ?? d.qty_released_pr ?? 0);
            const baseNeedAll = Number(d.base_need_all ?? d.need_all_qty ?? d.gross_qty ?? mrp1Q ?? 0);
            const baseOrd = Math.max(0, mrp1Q - mrp1Rel);

            return {
              ...d,
              class_type: d.class_type || "Component",
              source_type: d.source_type || "Buy",
              need_all_qty: Number(d.need_all_qty ?? d.gross_qty ?? d.qty_required ?? 0),
              base_need_all: baseNeedAll,
              base_ord: baseOrd,
              stock_std_qty: Number(d.stock_std_qty ?? d.safety_stock_qty ?? 0),
              sto_qty: Number(d.sto_qty ?? d.current_stock ?? 0),
              net_qty: Number(d.net_qty ?? d.qty_required ?? 0),
              ord_qty: Number(d.ord_qty ?? d.net_qty ?? d.qty_required ?? 0),
              mrp_qty: Number(d.mrp_qty ?? d.ord_qty ?? d.net_qty ?? 0),
              mrp1_qty: mrp1Q,
              mrp1_released_pr: mrp1Rel,
              release_draft_percent_1: d.release_draft_percent_1 !== undefined && d.release_draft_percent_1 !== null ? Number(d.release_draft_percent_1) : Number(d.release_draft_percent ?? 100),
              unit_price: Number(d.unit_price ?? d.product_price ?? 0),
              amount: Number(d.amount ?? d.subtotal_cost ?? 0),
              allocation_percent: normalizedAlloc,
              release_draft_percent: d.release_draft_percent !== undefined && d.release_draft_percent !== null ? Number(d.release_draft_percent) : 100,
              pcs_per_pack: Number(d.pcs_per_pack ?? 1) || 1,
              part_no_vendor: d.part_no_vendor || d.product_code || "",
              part_name_vendor: d.part_name_vendor || d.product_name || "",
              supplier_id: d.supplier_id ? String(d.supplier_id) : (d.final_supplier_id ? String(d.final_supplier_id) : (d.default_supplier_id ? String(d.default_supplier_id) : null)),
              supplier_name: d.supplier_name || ""
            };
          })
        );
        setSelectedDetailItemIds(sortedDetails.map((d: any) => d.id).filter(Boolean));
        setDetailTab("step1_physical");
        setViewMode("detail");
      }
    } catch (err: any) {
      showError("Error", err.response?.data?.message || err.message || "Gagal memuat detail MRP.");
      fetchMRPs();
    }
  };

  // Split Vendor Allocation Row (smart auto-filling 2nd supplier if registered in Master Data)
  const handleSplitVendorRow = (index: number) => {
    const sourceRow = editableDetails[index];
    const availSups = sourceRow.available_suppliers || [];

    // Find currently used supplier_ids for this product_code across active split rows
    const currentlyUsedSupIds = editableDetails
      .filter(d => d.product_code === sourceRow.product_code && d.supplier_id)
      .map(d => String(d.supplier_id));

    // Find the next unused registered supplier in availSups
    const unusedSup = availSups.find((s: any) => !currentlyUsedSupIds.includes(String(s.supplier_id)));
    const secondSup = unusedSup || availSups.find((s: any) => String(s.supplier_id) !== String(sourceRow.supplier_id));

    const secondSupId = secondSup ? String(secondSup.supplier_id) : null;
    const secondSupName = secondSup ? (suppliers.find(s => String(s.value) === String(secondSup.supplier_id))?.label || secondSup.supplier_name) : "Pilih Vendor Kedua...";
    const secondPrice = secondSup ? Number(secondSup.purchase_price || sourceRow.unit_price || 0) : Number(sourceRow.unit_price || 0);
    const secondPartNo = secondSup ? (secondSup.supplier_part_number || sourceRow.part_no_vendor || sourceRow.product_code) : (sourceRow.part_no_vendor || sourceRow.product_code);

    const firstSupQuota = availSups.find((s: any) => String(s.supplier_id) === String(sourceRow.supplier_id));
    let firstPct = firstSupQuota ? Number(firstSupQuota.allocation_percent) : 50;
    let secondPct = secondSup ? Number(secondSup.allocation_percent) : (100 - firstPct > 0 ? 100 - firstPct : 50);

    if (firstPct > 0 && firstPct <= 1) firstPct = Math.round(firstPct * 100);
    if (secondPct > 0 && secondPct <= 1) secondPct = Math.round(secondPct * 100);
    if (!firstPct || isNaN(firstPct)) firstPct = 50;
    if (!secondPct || isNaN(secondPct)) secondPct = 50;

    const totalOrdQty = Number(sourceRow.ord_qty || sourceRow.net_qty || 0);
    const firstQty = Math.round(totalOrdQty * (firstPct / (firstPct + secondPct)));
    const remQty = Math.max(0, totalOrdQty - firstQty);

    const updated = [...editableDetails];
    updated[index] = {
      ...sourceRow,
      allocation_percent: firstPct,
      ord_qty: firstQty,
      mrp_qty: firstQty,
      amount: firstQty * (sourceRow.unit_price || 0)
    };

    const newSplitRow: MRPDetailItem = {
      ...sourceRow,
      id: `temp_${Date.now()}_${Math.random()}`,
      supplier_id: secondSupId,
      supplier_name: secondSupName,
      part_no_vendor: secondPartNo,
      unit_price: secondPrice,
      allocation_percent: secondPct,
      ord_qty: remQty,
      mrp_qty: remQty,
      amount: remQty * secondPrice
    };

    updated.splice(index + 1, 0, newSplitRow);
    setEditableDetails(updated);
  };

  // Cancel / Remove Split Vendor Row
  const handleRemoveSplitRow = (index: number) => {
    const rowToRemove = editableDetails[index];
    const matchingIndices = editableDetails
      .map((item, idx) => (item.product_code === rowToRemove.product_code ? idx : -1))
      .filter(idx => idx !== -1);

    if (matchingIndices.length <= 1) {
      return;
    }

    const targetIndex = matchingIndices.find(idx => idx !== index) ?? matchingIndices[0];

    const updated = [...editableDetails];
    const targetRow = updated[targetIndex];

    const returnedOrdQty = Number(rowToRemove.ord_qty || 0);
    const returnedMrpQty = Number(rowToRemove.mrp_qty || 0);

    const newOrdQty = Number(targetRow.ord_qty || 0) + returnedOrdQty;
    const newMrpQty = Number(targetRow.mrp_qty || 0) + returnedMrpQty;

    updated[targetIndex] = {
      ...targetRow,
      allocation_percent: 100,
      ord_qty: newOrdQty,
      mrp_qty: newMrpQty,
      amount: newMrpQty * Number(targetRow.unit_price || 0)
    };

    // Remove the cancelled split row
    updated.splice(index, 1);
    setEditableDetails(updated);
  };

  // Save Step 2 Vendor Allocation & Financial MRP
  const handleSaveVendorAllocation = async () => {
    if (!selectedMRP) return;
    setIsSavingAllocation(true);
    try {
      const res = await api.express.put(`/manufacturing/mrp/${selectedMRP.id}`, {
        time_frame_start: selectedMRP.time_frame_start,
        time_frame_end: selectedMRP.time_frame_end,
        planner_name: selectedMRP.planner_name,
        warehouse_id: selectedMRP.warehouse_id,
        note: selectedMRP.note,
        details: editableDetails.map(d => {
          const dOrd = Math.max(0, Number(d.ord_qty || 0));
          const dPack = Math.max(1, Math.round(Number(d.pcs_per_pack || 1)));
          const dMrp = dOrd === 0 ? 0 : (dPack <= 1 ? Math.ceil(dOrd) : Math.ceil(dOrd / dPack) * dPack);
          const rawAlloc = Number(d.allocation_percent);
          const dAlloc = (rawAlloc > 0 && rawAlloc <= 1) ? Math.round(rawAlloc * 100) : (rawAlloc !== undefined && rawAlloc !== null && !isNaN(rawAlloc) && rawAlloc > 0 ? Math.round(rawAlloc) : 100);
          return {
            id: String(d.id).startsWith("temp_") ? undefined : d.id,
            product_id: d.product_id,
            class_type: d.class_type,
            source_type: d.source_type,
            need_all_qty: Number(d.need_all_qty || d.gross_qty || 0),
            stock_std_qty: Number(d.stock_std_qty || d.safety_stock_qty || 0),
            sto_qty: Number(d.sto_qty || d.current_stock || 0),
            supplier_id: d.supplier_id ? Number(d.supplier_id) : null,
            part_no_vendor: d.part_no_vendor,
            part_name_vendor: d.part_name_vendor,
            ord_qty: dOrd,
            mrp_qty: dMrp,
            net_qty: Math.round(Math.max(0, Number(d.need_all_qty || d.gross_qty || 0) + Number(d.stock_std_qty || d.safety_stock_qty || 0) - Number(d.sto_qty || d.current_stock || 0)) * (dAlloc / 100)),
            qty_required: Math.round(Math.max(0, Number(d.need_all_qty || d.gross_qty || 0) + Number(d.stock_std_qty || d.safety_stock_qty || 0) - Number(d.sto_qty || d.current_stock || 0)) * (dAlloc / 100)),
            unit_price: Number(d.unit_price || 0),
            amount: dMrp * Number(d.unit_price || 0),
            allocation_percent: dAlloc,
            remark: d.remark || ""
          };
        })
      });

      if (res && res.data && res.data.success) {
        showSuccess("Success", "Alokasi Vendor & Anggaran MRP berhasil disimpan.");
        handleViewMRP(selectedMRP.id);
        fetchMRPs();
      }
    } catch (err: any) {
      showError("Error", err.response?.data?.message || err.message || "Gagal menyimpan alokasi vendor.");
    } finally {
      setIsSavingAllocation(false);
    }
  };

  // Delete MRP
  const handleDeleteMRP = (id: string) => {
    showConfirm(
      "Konfirmasi Hapus Dokumen MRP",
      "Apakah Anda yakin ingin menghapus dokumen MRP ini? Dokumen yang sedang dalam alur approval (Level 1 / 2) atau telah disetujui dapat dihapus dengan aman selama belum dirilis ke Purchase Request (PR).",
      async () => {
        try {
          const res = await api.express.delete(`/manufacturing/mrp/${id}`);
          if (res && res.data && res.data.success) {
            showSuccess("Dokumen Dihapus", res.data.message || "Dokumen MRP berhasil dihapus dari sistem.");
            fetchMRPs();
            if (selectedMRP?.id === id) {
              setSelectedMRP(null);
              setViewMode("list");
            }
          }
        } catch (err: any) {
          showError("Gagal Menghapus MRP", err.response?.data?.message || err.message || "Gagal menghapus MRP.");
          fetchMRPs();
        }
      }
    );
  };

  // Open Generate MRP Modal (Clean Initial State)
  const handleOpenGenerateModal = () => {
    setPlanningSource("PO Customer");
    setSelectedPoId("");
    setSelectedForecastId("");
    setSelectedWarehouseId("");
    setPlannerName("PPIC Planner");
    setSafetyStockPct(0);
    setScrapLossPct(0);
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate(new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]);
    setEnableCarryOver(false);
    setSelectedCarryOverMrpId("");
    setMrpNote("");
    setIsModalOpen(true);
  };

  // Open Carry-Over MRP Modal for a specific parent MRP
  const handleOpenCarryOverModal = (mrpId: string) => {
    setPlanningSource("PO Customer");
    setSelectedPoId("");
    setSelectedForecastId("");
    setSelectedWarehouseId("");
    setPlannerName("PPIC Planner");
    setSafetyStockPct(0);
    setScrapLossPct(0);
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate(new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]);
    setEnableCarryOver(true);
    setSelectedCarryOverMrpId(mrpId);
    setMrpNote("");
    setIsModalOpen(true);
  };

  // Close Generate MRP Modal
  const handleCloseGenerateModal = () => {
    setIsModalOpen(false);
    setSelectedPoId("");
    setSelectedForecastId("");
    setSelectedWarehouseId("");
    setEnableCarryOver(false);
    setSelectedCarryOverMrpId("");
    setMrpNote("");
  };

  // Generate MRP
  const handleGenerateMRP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enableCarryOver) {
      if (!selectedCarryOverMrpId) {
        return showError("Validation Error", "Pilih Dokumen MRP Referensi Sebelumnya (MRP 1) terlebih dahulu.");
      }
    } else {
      if (planningSource === "PO Customer" && !selectedPoId) {
        return showError("Validation Error", "Pilih Dokumen PO Customer terlebih dahulu.");
      }
      if (planningSource === "Sales Forecast" && !selectedForecastId) {
        return showError("Validation Error", "Pilih Dokumen Customer Forecast terlebih dahulu.");
      }
      if (planningSource === "Manual FG Entry") {
        const validFg = manualFgItems.filter(it => it.product_id && Number(it.qty) > 0);
        if (validFg.length === 0) {
          return showError("Validation Error", "Pilih minimal 1 barang jadi (FG) dengan kuantiti > 0 pada input manual.");
        }
      }
    }

    try {
      const res = await api.express.post("/manufacturing/mrp/generate", {
        planning_source: enableCarryOver ? null : planningSource,
        po_customer_id: !enableCarryOver && planningSource === "PO Customer" ? selectedPoId : null,
        forecast_id: !enableCarryOver && planningSource === "Sales Forecast" ? selectedForecastId : null,
        manual_fg_items: !enableCarryOver && planningSource === "Manual FG Entry" ? manualFgItems.filter(it => it.product_id && Number(it.qty) > 0) : null,
        warehouse_id: selectedWarehouseId || null,
        planner_name: plannerName,
        safety_stock_percent: Number(safetyStockPct || 0),
        scrap_loss_percent: Number(scrapLossPct || 0),
        time_frame_start: startDate,
        time_frame_end: endDate,
        carry_over_from_mrp_id: enableCarryOver && selectedCarryOverMrpId ? selectedCarryOverMrpId : null,
        note: mrpNote
      });

      if (res && res.data && res.data.success) {
        showSuccess("MRP Generated", `Dokumen MRP berhasil dibuat: ${res.data.reference_code}`);
        handleCloseGenerateModal();
        fetchMRPs();
        if (res.data.mrp_id) {
          handleViewMRP(res.data.mrp_id);
        }
      }
    } catch (err: any) {
      showError("Error Generate MRP", err.response?.data?.message || err.message || "Gagal melakukan perhitungan MRP.");
    }
  };

  // Submit MRP for 3-Level Approval
  const handleSubmitApproval = (mrpId: string) => {
    showConfirm(
      "Ajukan Approval MRP",
      "Apakah Anda yakin ingin mengajukan dokumen MRP ini untuk persetujuan 3-Level (Level 1: Bugie Wibowo Koesman ➔ Level 2: S.B. Anang ➔ Level 3: Rony Purwantoro)?",
      async () => {
        try {
          const res = await api.express.post(`/manufacturing/mrp/${mrpId}/submit-approval`);
          if (res && res.data && res.data.success) {
            showSuccess("Approval Diajukan", res.data.message || "Dokumen MRP berhasil diajukan untuk approval.");
            handleViewMRP(mrpId);
            fetchMRPs();
          }
        } catch (err: any) {
          showError("Error Submit Approval", err.response?.data?.message || err.message || "Gagal mengajukan approval MRP.");
        }
      }
    );
  };

  // Revise Rejected MRP
  const handleReviseMRP = (mrpId: string) => {
    showConfirm(
      "Revisi Dokumen MRP",
      "Apakah Anda yakin ingin membuat versi revisi baru dari dokumen MRP ini? Dokumen yang ditolak akan tetap tersimpan sebagai histori.",
      async () => {
        try {
          const res = await api.express.post(`/manufacturing/mrp/${mrpId}/revise`);
          if (res && res.data && res.data.success) {
            showSuccess("Revisi Dibuat", res.data.message || "Dokumen revisi MRP berhasil dibuat sebagai Draft.");
            fetchMRPs();
            if (res.data.mrp_id) {
              handleViewMRP(res.data.mrp_id);
            }
          }
        } catch (err: any) {
          showError("Error Revisi MRP", err.response?.data?.message || err.message || "Gagal membuat dokumen revisi MRP.");
        }
      }
    );
  };

  // Open PR Release Percentage Modal
  const handleOpenReleaseModal = async (mrp: MRP) => {
    let targetData = mrp;
    if (!targetData.details || targetData.details.length === 0) {
      try {
        const res = await api.express.get(`/manufacturing/mrp/${mrp.id}`);
        if (res && res.data && res.data.success) {
          targetData = res.data.data;
        }
      } catch (e) {
        console.error("Failed to fetch detail for release modal:", e);
      }
    }

    setReleaseTargetMRP(targetData);
    const rawList = targetData.details || editableDetails || [];
    
    // Check if details already have custom release_draft_percent saved
    const hasCustomPct = rawList.some((d: any) => d.release_draft_percent !== undefined && d.release_draft_percent !== null && Number(d.release_draft_percent) !== 100);
    const initialPercent = hasCustomPct ? 80 : 100;
    setGlobalReleasePercent(initialPercent);

    const itemsWithRemaining = rawList.map((d: any) => {
      const targetQty = Number(d.mrp_qty || d.net_qty || d.qty_required || 0);
      const released = Number(d.qty_released_pr || 0);
      const remaining = Math.max(0, targetQty - released);
      const rowPct = (d.release_draft_percent !== undefined && d.release_draft_percent !== null) ? Number(d.release_draft_percent) : initialPercent;
      const releaseQty = Math.round(remaining * (rowPct / 100));
      const uPrice = Number(d.unit_price || d.product_price || 0);

      return {
        id: String(d.id),
        product_id: String(d.product_id),
        product_code: d.product_code || d.part_no_vendor || "",
        product_name: d.product_name || d.part_name_vendor || "",
        product_unit: d.product_unit || "PCS",
        supplier_name: d.supplier_name || "Supplier",
        class_type: d.class_type || "Component",
        mrp_qty: targetQty,
        qty_released_pr: released,
        remaining_qty: remaining,
        percent: rowPct,
        release_qty: releaseQty,
        unit_price: uPrice,
        amount: releaseQty * uPrice,
        is_selected: remaining > 0
      };
    });

    setReleaseModalItems(itemsWithRemaining);
    setIsReleaseModalOpen(true);
  };

  // Save Draft % PR (Without releasing to PR and without resetting approval)
  const handleSaveDraftPRPercent = async () => {
    if (!releaseTargetMRP) return;
    setIsSavingDraftPRPercent(true);
    try {
      const itemsPayload = releaseModalItems.map(item => ({
        id: item.id,
        percent: item.percent,
        release_qty: item.release_qty
      }));

      const res = await api.express.put(`/manufacturing/mrp/${releaseTargetMRP.id}/draft-pr-percent`, {
        items: itemsPayload
      });

      if (res && res.data && res.data.success) {
        showSuccess("Draft % PR Disimpan", "Persentase (%) pengajuan PR berhasil disimpan sebagai draft. Dokumen belum dirilis ke PR dan dapat Anda rilis kapan saja.");
        handleViewMRP(releaseTargetMRP.id);
        fetchMRPs();
      }
    } catch (err: any) {
      showError("Gagal Menyimpan", err.response?.data?.message || err.message || "Gagal menyimpan % PR.");
    } finally {
      setIsSavingDraftPRPercent(false);
    }
  };

  // Global Percent apply in Modal
  const handleApplyGlobalPercent = (pct: number) => {
    const validPct = Math.max(0, Math.min(100, pct));
    setGlobalReleasePercent(validPct);
    setReleaseModalItems(prev => prev.map(item => {
      const newReleaseQty = Math.round(item.remaining_qty * (validPct / 100));
      return {
        ...item,
        percent: validPct,
        release_qty: newReleaseQty,
        amount: newReleaseQty * item.unit_price
      };
    }));
  };

  // Individual Row Percent Change
  const handleRowPercentChange = (id: string, pctVal: number) => {
    const validPct = Math.max(0, Math.min(100, pctVal));
    setReleaseModalItems(prev => prev.map(item => {
      if (item.id === id) {
        const newReleaseQty = Math.round(item.remaining_qty * (validPct / 100));
        return {
          ...item,
          percent: validPct,
          release_qty: newReleaseQty,
          amount: newReleaseQty * item.unit_price
        };
      }
      return item;
    }));
  };

  // Individual Row Qty Change
  const handleRowQtyChange = (id: string, qtyVal: number) => {
    setReleaseModalItems(prev => prev.map(item => {
      if (item.id === id) {
        const validQty = Math.max(0, Math.min(item.remaining_qty, qtyVal));
        const newPercent = item.remaining_qty > 0 ? Math.round((validQty / item.remaining_qty) * 100) : 0;
        return {
          ...item,
          release_qty: validQty,
          percent: newPercent,
          amount: validQty * item.unit_price
        };
      }
      return item;
    }));
  };

  // Toggle Row Selection in Modal
  const handleToggleRowSelection = (id: string) => {
    setReleaseModalItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, is_selected: !item.is_selected };
      }
      return item;
    }));
  };

  // Submit PR Release from Percentage Modal
  const handleConfirmPRRelease = async () => {
    if (!releaseTargetMRP) return;
    if (!isMRPReleasePREnabled) {
      return showError("Fitur Non-Aktif", "Fitur Rilis PR dari MRP dinonaktifkan di pengaturan sistem. Schedule kedatangan telah diisi otomatis.");
    }
    const selectedItemsToRelease = releaseModalItems.filter(i => i.is_selected && i.release_qty > 0);
    if (selectedItemsToRelease.length === 0) {
      return showError("Validasi", "Pilih minimal 1 item dengan kuantiti rilis lebih dari 0.");
    }

    setIsSubmittingPRRelease(true);
    try {
      const payload = {
        items: selectedItemsToRelease.map(i => ({
          id: i.id,
          percent: i.percent,
          release_qty: i.release_qty
        }))
      };

      const res = await api.express.post(`/manufacturing/mrp/${releaseTargetMRP.id}/release`, payload);
      if (res && res.data && res.data.success) {
        showSuccess(
          "PR Berhasil Dirilis",
          `${res.data.message || "Material berhasil dirilis ke Purchase Request."}\nCatatan: Kebutuhan asli MRP dan total nilai dokumen tetap utuh tersimpan.`
        );
        setIsReleaseModalOpen(false);
        handleViewMRP(releaseTargetMRP.id);
        fetchMRPs();
      }
    } catch (err: any) {
      showError("Error Release PR", err.response?.data?.message || err.message || "Gagal merilis MRP ke PR.");
    } finally {
      setIsSubmittingPRRelease(false);
    }
  };

  // Release to PR Trigger (Opens Percentage Modal)
  const handleReleaseMRP = (mrpId: string) => {
    const target = mrps.find(m => m.id === mrpId) || selectedMRP;
    if (target) {
      handleOpenReleaseModal(target);
    }
  };

  // Release to PR (Bulk)
  const handleBulkRelease = () => {
    if (selectedIds.length === 0) return;
    showConfirm(
      "Bulk Release ke PR",
      `Apakah Anda yakin ingin merilis ${selectedIds.length} dokumen MRP terpilih ke Purchase Request secara massal?`,
      async () => {
        try {
          const res = await api.express.post("/manufacturing/mrp/bulk-release", { ids: selectedIds });
          if (res && res.data && res.data.success) {
            showSuccess("Success", res.data.message || "Dokumen MRP terpilih berhasil dirilis.");
            setSelectedIds([]);
            fetchMRPs();
          }
        } catch (err: any) {
          showError("Error Bulk Release", err.response?.data?.message || err.message || "Gagal merilis MRP massal.");
        }
      }
    );
  };

  // Checkbox functions
  const draftMRPs = mrps.filter(m => m.status === "Draft");
  const isAllSelected = draftMRPs.length > 0 && draftMRPs.every(m => selectedIds.includes(m.id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      const draftIds = draftMRPs.map(m => m.id);
      setSelectedIds(prev => prev.filter(id => !draftIds.includes(id)));
    } else {
      const draftIds = draftMRPs.map(m => m.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...draftIds])));
    }
  };

  const handleSelectId = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Filtered & Sorted dataset for Table
  const filteredAndSortedMRPs = useMemo(() => {
    let result = mrps.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (selectedMonthFilter !== "all") {
        const dateStr = m.time_frame_start || m.created_at;
        const itemDate = dateStr ? new Date(dateStr) : null;
        const itemMonth = itemDate ? itemDate.getMonth() + 1 : 0;
        if (itemMonth !== selectedMonthFilter) return false;
      }
      if (yearFilter !== "all") {
        const dateStr = m.time_frame_start || m.created_at;
        const itemYear = dateStr ? new Date(dateStr).getFullYear().toString() : "";
        if (itemYear !== yearFilter) return false;
      }
      return true;
    });

    return result.sort((a, b) => {
      let aVal = (a as any)[sortConfig.key];
      let bVal = (b as any)[sortConfig.key];

      if (sortConfig.key === "total_est_cost" || sortConfig.key === "total_net_qty" || sortConfig.key === "id") {
        const numA = Number(aVal || 0);
        const numB = Number(bVal || 0);
        return sortConfig.order === "asc" ? numA - numB : numB - numA;
      }

      aVal = String(aVal || "").toLowerCase();
      bVal = String(bVal || "").toLowerCase();
      return sortConfig.order === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [mrps, statusFilter, selectedMonthFilter, yearFilter, sortConfig]);

  const activeFilterCount = [
    statusFilter !== "all",
    selectedMonthFilter !== "all",
    yearFilter !== "all",
    sortConfig.key !== "id" || sortConfig.order !== "desc"
  ].filter(Boolean).length;

  const paginatedMRPs = useMemo(() => {
    const start = (page - 1) * 10;
    return filteredAndSortedMRPs.slice(start, start + 10);
  }, [filteredAndSortedMRPs, page]);

  const calcTotalItems = filteredAndSortedMRPs.length;
  const calcTotalPages = Math.ceil(calcTotalItems / 10) || 1;

  // Filter MRPs by selected month (if month filter active)
  const monthFilteredMRPs = useMemo(() => {
    return mrps.filter((m) => {
      if (selectedMonthFilter !== "all") {
        const dateStr = m.time_frame_start || m.created_at;
        const itemDate = dateStr ? new Date(dateStr) : null;
        const itemMonth = itemDate ? itemDate.getMonth() + 1 : 0;
        if (itemMonth !== selectedMonthFilter) return false;
      }
      return true;
    });
  }, [mrps, selectedMonthFilter]);

  // Stat KPI Summary calculations (Standard SAP/Odoo MRP Controller Cockpit - Filtered by Month)
  const countTotal = useMemo(() => monthFilteredMRPs.length, [monthFilteredMRPs]);
  const countDraft = useMemo(() => monthFilteredMRPs.filter(m => m.status === "Draft").length, [monthFilteredMRPs]);
  const countWaitingApproval = useMemo(() => monthFilteredMRPs.filter(m => m.status === "Waiting for Approval").length, [monthFilteredMRPs]);
  const countApproved = useMemo(() => monthFilteredMRPs.filter(m => m.status === "Approved").length, [monthFilteredMRPs]);

  // Step 2 financial totals — use Math.ceil(ORD / pcs_per_pack) * pcs_per_pack formula
  const totalStep2Amount = useMemo(() => {
    return editableDetails.reduce((sum, item) => {
      const ord = Math.max(0, Number(item.ord_qty || 0));
      const pack = Math.max(1, Math.round(Number(item.pcs_per_pack || 1)));
      const mrp = ord === 0 ? 0 : (pack <= 1 ? Math.ceil(ord) : Math.ceil(ord / pack) * pack);
      return sum + (mrp * Number(item.unit_price || 0));
    }, 0);
  }, [editableDetails]);

  const renderStatusBadge = (st?: string) => {
    switch (st) {
      case "Released":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Released PR
          </span>
        );
      case "Approved":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
            ✓ Approved (Siap Rilis)
          </span>
        );
      case "Waiting for Approval":
      case "Pending":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
            ⏳ Waiting Approval
          </span>
        );
      case "Rejected":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            ✕ Rejected
          </span>
        );
      case "Closed":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Closed
          </span>
        );
      case "Draft":
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {st || "Draft"}
          </span>
        );
    }
  };

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-300">
      <StatusModal isOpen={isOpen} type={type} title={title} message={message} onConfirm={onConfirm} onClose={closeModal} isLoading={isActionLoading} />
      <SortFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Sort & Filter Dokumen MRP"
        subtitle="Sesuaikan alur tampilan dan prioritas analisis kebutuhan material"
        sortOptions={[
          { key: "id", order: "desc", label: "Tanggal MRP Terbaru (Default)", icon: Calendar },
          { key: "id", order: "asc", label: "Tanggal MRP Terlama", icon: Calendar },
          { key: "total_est_cost", order: "desc", label: "Est. Biaya Bahan (Highest)", icon: DollarSign },
          { key: "total_est_cost", order: "asc", label: "Est. Biaya Bahan (Lowest)", icon: DollarSign },
          { key: "total_net_qty", order: "desc", label: "Total Kebutuhan Bersih (Highest)", icon: TrendingUp },
          { key: "reference_code", order: "asc", label: "Kode Referensi (A-Z)", icon: Hash }
        ]}
        sortConfig={sortConfig}
        onSortChange={setSortConfig}
        statusOptions={[
          { value: "all", label: "Semua Status" },
          { value: "Draft", label: "Draft" },
          { value: "Waiting for Approval", label: "Waiting for Approval" },
          { value: "Approved", label: "Approved" },
          { value: "Rejected", label: "Rejected" },
          { value: "Released", label: "Released PR" }
        ]}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        monthFilter={selectedMonthFilter}
        setMonthFilter={(val) => setSelectedMonthFilter(val === "all" ? "all" : Number(val))}
        yearFilter={yearFilter}
        setYearFilter={(val) => setYearFilter(String(val))}
        onReset={() => {
          setStatusFilter("all");
          setSelectedMonthFilter("all");
          setYearFilter("all");
          setSortConfig({ key: "id", order: "desc" });
        }}
      />

      {/* Corporate Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            {viewMode !== "list" && (
              <button
                onClick={() => {
                  setViewMode("list");
                  setSelectedMRP(null);
                }}
                className="p-1.5 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              MRP (Material Requirements Planning)
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Perencanaan kebutuhan material manufaktur & alokasi vendor (Perhitungan Fisik & Anggaran MRP).
          </p>
        </div>

        {viewMode === "list" && (
          <div className="flex items-center gap-3 shrink-0 md:pr-12">
            {isMRPReleasePREnabled && selectedIds.length > 0 && (
              <button
                onClick={handleBulkRelease}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm active:scale-95"
              >
                <Send size={16} />
                <span>Rilis {selectedIds.length} Terpilih ke PR</span>
              </button>
            )}
            <button
              onClick={async () => {
                try {
                  const response = await fetch("/api/export/integrated-mrp-excel");
                  if (!response.ok) throw new Error("Gagal mengunduh file Excel");
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "ERP_Integrated_Master_BOM_MRP.xlsx";
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                } catch (err: any) {
                  alert("Gagal mengunduh Excel: " + err.message);
                }
              }}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm active:scale-95"
              title="Download Excel terintegrasi (7 Tab: Vendor, Customer, Product, BOM, Forecast, PO Customer, MRP)"
            >
              <FileSpreadsheet size={18} />
              <span>Export Excel (Relasi & Rumus)</span>
            </button>

            <button
              onClick={handleOpenGenerateModal}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm active:scale-95"
            >
              <Plus size={18} />
              <span>Hitung & Generate MRP</span>
            </button>
          </div>
        )}
      </div>

      {/* VIEW MODE: LIST */}
      {viewMode === "list" && (
        <>
          {/* Summary Stat Cards (SAP/Odoo Standard MRP Cockpit KPIs - Filtered by Selected Month) */}
          <div className="space-y-2 mb-6">
            {selectedMonthFilter !== "all" && (
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  Filter Indikator: Bulan {MONTH_NAMES[Number(selectedMonthFilter) - 1]}
                </span>
                <button
                  onClick={() => setSelectedMonthFilter("all")}
                  className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Reset Filter Bulan
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<FileSpreadsheet size={18} />}
                iconBgColor="bg-blue-50"
                iconColor="text-blue-600"
                label="TOTAL DOKUMEN MRP"
                value={countTotal}
              />
              <StatCard
                icon={<FileText size={18} />}
                iconBgColor="bg-slate-100"
                iconColor="text-slate-700"
                label="DRAFT / PERENCANAAN"
                value={`${countDraft} Dokumen`}
              />
              <StatCard
                icon={<Clock size={18} />}
                iconBgColor="bg-amber-50"
                iconColor="text-amber-600"
                label="MENUNGGU APPROVAL"
                value={`${countWaitingApproval} Dokumen`}
              />
              <StatCard
                icon={<CheckCircle2 size={18} />}
                iconBgColor="bg-emerald-50"
                iconColor="text-emerald-600"
                label="SIAP RILIS KE PR"
                value={`${countApproved} Dokumen`}
              />
            </div>
          </div>

          {/* Controls & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full">
                {[
                  { key: "all", label: `Semua (${mrps.length})` },
                  { key: "Draft", label: `Draft (${mrps.filter(m => m.status === 'Draft').length})` },
                  { key: "Waiting for Approval", label: `Menunggu Approval (${mrps.filter(m => m.status === 'Waiting for Approval').length})` },
                  { key: "Approved", label: `Approved (${mrps.filter(m => m.status === 'Approved').length})` },
                  { key: "Rejected", label: `Rejected (${mrps.filter(m => m.status === 'Rejected').length})` },
                  { key: "Released", label: `Released PR (${mrps.filter(m => m.status === 'Released').length})` },
                  { key: "Closed", label: `Closed (${mrps.filter(m => m.status === 'Closed').length})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => { setStatusFilter(tab.key); setPage(1); }}
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
              searchPlaceholder="Cari referensi MRP, nomor PO/Forecast, atau planner..."
              searchValue={search}
              onSearchChange={(v) => { setSearch(v); setPage(1); }}
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
                    <th className="px-4 py-3.5 text-center w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        title="Pilih Semua Draft"
                      />
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">No</th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">No. Referensi MRP</th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Sumber Perencanaan</th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Customer & Gudang</th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Periode Perencanaan</th>
                    <th className="px-5 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Est. Biaya Bahan (Rp)</th>
                    <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-sm">Memuat data MRP...</td></tr>
                  ) : paginatedMRPs.length > 0 ? (
                    paginatedMRPs.map((item, idx) => {
                      const isChecked = selectedIds.includes(item.id);
                      const sourceLabel = item.planning_source || (item.po_customer_id ? "PO Customer" : "Sales Forecast");
                      const refLabel = item.no_po_customer || item.po_reference || item.forecast_reference || "-";

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 text-center">
                            {item.status === "Draft" ? (
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleSelectId(item.id)}
                                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              />
                            ) : (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-slate-400 font-mono">{(page - 1) * 10 + idx + 1}</td>
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>{item.reference_code}</span>
                              {Number(item.revision_number || 0) > 0 && (
                                <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded-md">
                                  R{item.revision_number}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">Planner: {item.planner_name || "PPIC Team"}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block mb-1">
                              {sourceLabel}
                            </span>
                            <div className="text-xs font-mono font-semibold text-slate-700">{refLabel}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-slate-800 text-sm">{item.customer_name || "-"}</div>
                            <div className="text-xs text-slate-400">{item.warehouse_name ? `Gudang: ${item.warehouse_name}` : "Gudang Material"}</div>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-medium text-slate-700">
                            {item.time_frame_start ? `${item.time_frame_start.split("T")[0]} s.d. ${item.time_frame_end ? item.time_frame_end.split("T")[0] : '-'}` : "-"}
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold text-slate-900 text-sm">
                            {item.status === "Draft" ? (
                              <span className="text-slate-400 font-medium italic text-xs">Draft Perencanaan (Rp -)</span>
                            ) : (
                              `Rp ${Number(item.total_est_cost || 0).toLocaleString()}`
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {renderStatusBadge(item.status)}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={() => handleViewMRP(item.id)} title="Edit Dokumen MRP (Ubah Kebutuhan & Alokasi Vendor)" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                              <button onClick={() => handleViewMRP(item.id)} title="Buka Dokumen MRP (Physical & Vendor Split)" className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"><Eye size={16} /></button>
                              {item.status === "Draft" && (
                                <button 
                                  onClick={() => handleSubmitApproval(item.id)} 
                                  title="Ajukan Approval (Bugie ➔ S.B. Anang ➔ Rony)" 
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 font-semibold text-xs px-2.5 border border-blue-200"
                                >
                                  <Send size={13} />
                                  <span>Ajukan Approval</span>
                                </button>
                              )}
                              {item.status === "Rejected" && (
                                <button 
                                  onClick={() => handleReviseMRP(item.id)} 
                                  title="Buat Dokumen Revisi Baru dari MRP yang Ditolak ini" 
                                  className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-1 font-semibold text-xs px-2.5 border border-amber-300"
                                >
                                  <RotateCw size={13} />
                                  <span>Revisi MRP</span>
                                </button>
                              )}
                              {item.status === "Approved" && (
                                isMRPReleasePREnabled ? (
                                  <button onClick={() => handleReleaseMRP(item.id)} title="Rilis ke PR (Sudah Disetujui)" className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Send size={16} /></button>
                                ) : (
                                  <span title="Schedule kedatangan otomatis terisi saat MRP disetujui" className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                    <CheckCircle2 size={12} className="text-teal-600" />
                                    <span>Schedule Terisi</span>
                                  </span>
                                )
                              )}
                              {item.status !== "Released" && (
                                <button onClick={() => handleDeleteMRP(item.id)} title="Hapus MRP" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center py-16">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <FileSpreadsheet size={32} className="text-slate-300" />
                          <p className="font-semibold text-slate-600">Belum ada dokumen MRP</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination page={page} totalPages={calcTotalPages} totalItems={calcTotalItems} onPageChange={(p) => setPage(p)} />
          </div>
        </>
      )}

      {/* VIEW MODE: DETAIL DUAL-STEP WORKFLOW */}
      {viewMode === "detail" && selectedMRP && (
        <div className="space-y-6">
          {/* Header Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    Sumber: {selectedMRP.planning_source || "PO Customer"}
                  </span>
                  {renderStatusBadge(selectedMRP.status)}
                </div>
                <h2 className="text-xl font-bold text-slate-900">{selectedMRP.reference_code}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Referensi Order: <span className="font-mono font-semibold text-slate-800">{selectedMRP.no_po_customer || selectedMRP.po_reference || selectedMRP.forecast_reference || "-"}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                {selectedMRP.status !== "Released" && detailTab === "step2_vendor" && (
                  <button
                    onClick={() => {
                      if (selectedMRP.status === "Waiting for Approval") {
                        showConfirm(
                          "Konfirmasi Edit MRP Menunggu Approval",
                          "Dokumen MRP ini sedang dalam alur persetujuan. Menyimpan perubahan data akan membatalkan approval yang sedang berjalan dan mereset status dokumen kembali ke Draft (perlu diajukan approval ulang). Lanjutkan?",
                          () => {
                            handleSaveVendorAllocation();
                          }
                        );
                      } else {
                        handleSaveVendorAllocation();
                      }
                    }}
                    disabled={isSavingAllocation}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-sm"
                  >
                    <Save size={15} />
                    <span>{isSavingAllocation ? "Menyimpan..." : "Simpan Alokasi Vendor"}</span>
                  </button>
                )}

                {selectedMRP.status === "Draft" && (
                  <button
                    onClick={() => handleSubmitApproval(selectedMRP.id)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-sm active:scale-95"
                  >
                    <Send size={15} />
                    <span>Ajukan Approval</span>
                  </button>
                )}

                {selectedMRP.status === "Rejected" && (
                  <button
                    onClick={() => handleReviseMRP(selectedMRP.id)}
                    className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-sm active:scale-95"
                  >
                    <RotateCw size={15} />
                    <span>Buat Revisi MRP (R{(Number(selectedMRP.revision_number || 0) + 1)})</span>
                  </button>
                )}

                {selectedMRP.status === "Approved" && (
                  <>
                    <button
                      onClick={() => handleOpenCarryOverModal(selectedMRP.id)}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-sm active:scale-95"
                      title="Buat MRP 2 (Carry-Over) yang terhubung dengan dokumen MRP 1 ini"
                    >
                      <FileText size={15} />
                      <span>Buat MRP 2 (Carry-Over)</span>
                    </button>

                    {isMRPReleasePREnabled ? (
                      <button
                        onClick={() => handleReleaseMRP(selectedMRP.id)}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-semibold text-xs transition-all shadow-sm active:scale-95"
                      >
                        <Send size={15} />
                        <span>
                          {selectedDetailItemIds.length > 0 && selectedDetailItemIds.length < editableDetails.length
                            ? `Rilis (${selectedDetailItemIds.length} Item) ke Purchase Request (PR)`
                            : "Rilis Kebutuhan ke Purchase Request (PR)"}
                        </span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-800 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-2xs">
                          <CheckCircle2 size={15} className="text-teal-600" />
                          <span>Schedule Kedatangan Terisi Otomatis</span>
                        </div>
                        <button
                          onClick={() => router.push("/persediaan-barang/schedule-vendor")}
                          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-sm active:scale-95"
                          title="Buka Schedule Kedatangan Vendor"
                        >
                          <CalendarClock size={15} />
                          <span>Buka Schedule Kedatangan</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
                <button
                  onClick={() => {
                    setViewMode("list");
                    setSelectedMRP(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-all"
                >
                  Kembali ke Daftar
                </button>
              </div>
            </div>

            {selectedMRP.status === "Draft" && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 text-slate-700 text-xs animate-in fade-in duration-200">
                <FileText size={18} className="shrink-0 text-slate-500" />
                <div>
                  <span className="font-bold">Status Dokumen: Draft.</span> Anda dapat memeriksa, menyesuaikan kuantitas material, atau membagi alokasi vendor. Klik tombol <b>"Ajukan Approval"</b> jika dokumen sudah siap diajukan untuk persetujuan.
                </div>
              </div>
            )}

            {selectedMRP.status === "Rejected" && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-center gap-3 text-rose-800 text-xs animate-in fade-in duration-200">
                <AlertCircle size={18} className="shrink-0 text-rose-600" />
                <div>
                  <span className="font-bold">Dokumen MRP Ditolak (Rejected):</span> Dokumen ini ditolak pada saat proses approval dan tidak dapat dirilis ke PR. Klik tombol <b>"Buat Revisi MRP (R{(Number(selectedMRP.revision_number || 0) + 1)})"</b> untuk membuat salinan dokumen revisi baru. Dokumen lama ini akan tetap tersimpan sebagai histori audit.
                </div>
              </div>
            )}

            {selectedMRP.status === "Waiting for Approval" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center gap-3 text-amber-800 text-xs animate-in fade-in duration-200">
                <Clock size={18} className="shrink-0 text-amber-600" />
                <div>
                  <span className="font-bold">Menunggu Approval 3-Level:</span> Dokumen MRP ini sedang dalam alur persetujuan: <b>Level 1: Bugie Wibowo Koesman</b> ➔ <b>Level 2: S.B. Anang</b> ➔ <b>Level 3: Rony Purwantoro</b>. Anda masih dapat mengedit atau menghapus dokumen ini (menyimpan edit akan mereset status kembali ke Draft).
                </div>
              </div>
            )}

            {selectedMRP.status === "Approved" && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3 text-emerald-800 text-xs animate-in fade-in duration-200">
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                <div>
                  <span className="font-bold">Dokumen MRP Disetujui (Approved):</span> Seluruh 3 level persetujuan (Bugie Wibowo Koesman ➔ S.B. Anang ➔ Rony Purwantoro) telah menyetujui MRP ini. Dokumen ini <b>Siap Dirilis ke Purchase Request (PR)</b>. Anda dapat menyesuaikan persentase (%) PR kapan saja tanpa perlu meminta approval ulang.
                </div>
              </div>
            )}

            {/* Header Parameters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block">Customer Target</span>
                <span className="font-bold text-slate-900 text-sm">{selectedMRP.customer_name || "-"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Gudang Target Stok</span>
                <span className="font-bold text-slate-900 text-sm">{selectedMRP.warehouse_name || "Gudang Material"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">PIC Perencana (Planner)</span>
                <span className="font-bold text-slate-900 text-sm">{selectedMRP.planner_name || "PPIC Team"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Periode Jadwal (Time Bucket)</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedMRP.time_frame_start ? `${selectedMRP.time_frame_start.split("T")[0]} s.d. ${selectedMRP.time_frame_end ? selectedMRP.time_frame_end.split("T")[0] : '-'}` : "-"}
                </span>
              </div>
              {isShowSafetyStockActive && (
                <div>
                  <span className="text-slate-400 font-semibold block">Safety Stock Buffer (%)</span>
                  <span className="font-bold text-amber-700 text-sm">{selectedMRP.safety_stock_percent || 0}%</span>
                </div>
              )}
              {isShowScrapLossActive && (
                <div>
                  <span className="text-slate-400 font-semibold block">Scrap / Material Loss (%)</span>
                  <span className="font-bold text-rose-700 text-sm">{selectedMRP.scrap_loss_percent || 0}%</span>
                </div>
              )}
              <div>
                <span className="text-slate-400 font-semibold block">Total Est. Biaya Pengadaan</span>
                {selectedMRP.status === "Draft" ? (
                  <span className="font-semibold text-slate-400 text-xs italic">Rp - (Draft Perencanaan Fisik)</span>
                ) : (
                  <span className="font-bold text-emerald-700 text-sm">Rp {Number(selectedMRP.total_est_cost || totalStep2Amount).toLocaleString()}</span>
                )}
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Instruksi / Catatan</span>
                <span className="font-medium text-slate-700">{selectedMRP.note || "-"}</span>
              </div>
            </div>

            {/* Cycle Chain Navigator (If Document is part of multi-cycle / revision chain) */}
            {selectedMRP.cycle_mrps && selectedMRP.cycle_mrps.length > 1 && (
              <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 space-y-2.5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Layers size={18} className="text-indigo-600 shrink-0" />
                    <div>
                      <span className="font-bold text-indigo-900 text-xs uppercase tracking-wider">
                        Rantai Siklus Perencanaan (MRP 1 & MRP 2 / Revisi)
                      </span>
                      <p className="text-[11px] text-indigo-700 font-medium">
                        Dokumen ini terhubung dalam siklus perencanaan berkelanjutan. Pilih tab dokumen atau buka Summary Gabungan untuk komparasi total.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetailTab("summary_gabungan")}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                      detailTab === "summary_gabungan"
                        ? "bg-indigo-600 text-white shadow-indigo-200"
                        : "bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50"
                    }`}
                  >
                    <BarChart3 size={14} />
                    <span>📊 Lihat Summary Gabungan</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pt-1">
                  {selectedMRP.cycle_mrps.map((cm: any, idx: number) => {
                    const isCurrent = String(cm.id) === String(selectedMRP.id);
                    const label = Number(cm.revision_number || 0) === 0 ? `MRP 1 (Awal)` : `MRP ${idx + 1} / Rev. 00${cm.revision_number || idx}`;
                    return (
                      <button
                        key={cm.id}
                        type="button"
                        onClick={() => {
                          if (!isCurrent) handleViewMRP(cm.id);
                        }}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                          isCurrent
                            ? "bg-white text-indigo-950 border-indigo-400 shadow-sm ring-2 ring-indigo-400/30"
                            : "bg-white/60 text-indigo-700 border-indigo-200 hover:bg-white hover:text-indigo-900"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`} />
                        <span>{label}: <b>{cm.reference_code}</b></span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-100/70 text-indigo-800 font-semibold">
                          {cm.status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-Tab Navigation Header */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDetailTab("step1_physical")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  detailTab === "step1_physical"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                <Calculator size={15} />
                <span>1. IV. KEBUTUHAN Material & Component (Hitungan Fisik)</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab("step2_vendor")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  detailTab === "step2_vendor"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                <Building2 size={15} />
                <span>2. Material Requirement Planning (MRP - Alokasi Vendor & Anggaran)</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab("summary_gabungan")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  detailTab === "summary_gabungan"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-200"
                }`}
              >
                <BarChart3 size={15} />
                <span>3. 📊 SUMMARY GABUNGAN (MRP 1 + MRP 2 / Revisi)</span>
              </button>
            </div>
          </div>

          {/* TAB 1: KEBUTUHAN MATERIAL & COMPONENT (PHYSICAL DEMAND CALCULATION) */}
          {detailTab === "step1_physical" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    IV. KEBUTUHAN Material & Component
                  </h3>
                  <p className="text-xs text-slate-500">Perhitungan kebutuhan bersih fisik dari PO/Forecast, Safety Stock, & Stok Fisik Gudang (STO).</p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-600 uppercase">
                    <tr>
                      <th className="px-3 py-3 text-center w-10">No</th>
                      <th className="px-4 py-3 text-left">Part No</th>
                      <th className="px-4 py-3 text-left">Part Name</th>
                      <th className="px-3 py-3 text-center">Class</th>
                      <th className="px-3 py-3 text-center">Source</th>
                      <th className="px-4 py-3 text-right">Need All</th>
                      <th className="px-4 py-3 text-right">Stock Std</th>
                      <th className="px-4 py-3 text-right">STO (Stok Fisik)</th>
                      <th className="px-4 py-3 text-right font-bold text-amber-700 bg-amber-50/50">Kebutuhan Bersih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const seen = new Set<string>();
                      const physicalItems = editableDetails.filter(item => {
                        const key = item.product_code || item.product_id;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                      });

                      return physicalItems.map((item, idx) => {
                        const needAll = Number(item.need_all_qty ?? item.gross_qty ?? item.qty_required ?? 0);
                        const stockStd = Number(item.stock_std_qty ?? item.safety_stock_qty ?? 0);
                        const sto = Number(item.sto_qty ?? item.current_stock ?? 0);
                        const kebutuhan = Math.max(0, needAll + stockStd - sto);

                        return (
                          <tr key={item.product_code || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.product_code}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{item.product_name}</td>
                            <td className="px-3 py-3 text-center font-semibold text-slate-700">
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                                {item.class_type || "Component"}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center font-bold text-blue-700">
                              {item.source_type || "Buy"}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-700">{needAll.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-right font-medium text-amber-700">+{stockStd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-right font-medium text-slate-600">{sto.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-right font-bold text-amber-700 bg-amber-50/40 text-sm">
                              {kebutuhan.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: MATERIAL REQUIREMENT PLANNING (MRP-2 VENDOR ALLOCATION & FINANCIAL BUDGETING) */}
          {detailTab === "step2_vendor" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Material Requirement Planning (MRP - Alokasi Vendor & Anggaran)
                  </h3>
                  <p className="text-xs text-slate-500">Penetapan supplier, pembagian kuota vendor (split allocation), harga satuan, & estimasi budget.</p>
                </div>

                {selectedMRP.status !== "Released" && (
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                    Tips: Klik tombol <Split size={14} className="inline mx-1" /> untuk memecah alokasi 1 Part ke 2 Supplier.
                  </span>
                )}
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-600 uppercase">
                    <tr>
                      <th className="px-3 py-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={editableDetails.length > 0 && selectedDetailItemIds.length === editableDetails.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDetailItemIds(editableDetails.map(d => d.id).filter(Boolean) as (string | number)[]);
                            } else {
                              setSelectedDetailItemIds([]);
                            }
                          }}
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded accent-emerald-600 cursor-pointer"
                          title="Pilih Semua Item untuk PR"
                        />
                      </th>
                      <th className="px-3 py-3 text-center w-8">No</th>
                      <th className="px-3 py-3 text-left whitespace-nowrap min-w-[90px]">Class</th>
                      <th className="px-3 py-3 text-left whitespace-nowrap min-w-[130px]">Part No</th>
                      <th className="px-4 py-3 text-left min-w-[170px]">Part Name</th>
                      <th className="px-3 py-3 text-right whitespace-nowrap min-w-[90px]">Need All</th>
                      <th className="px-3 py-3 text-right whitespace-nowrap min-w-[90px]">Stock Std</th>
                      <th className="px-3 py-3 text-right whitespace-nowrap min-w-[110px]">STO (Stok Fisik)</th>
                      <th className="px-3 py-3 text-right whitespace-nowrap min-w-[120px] font-bold text-amber-700 bg-amber-50/50">Kebutuhan Bersih</th>
                      <th className="px-4 py-3 text-left min-w-[270px]">Vendor Name</th>
                      <th className="px-3 py-3 text-center whitespace-nowrap min-w-[110px] font-bold text-emerald-700 bg-emerald-50/30">Kuota (%)</th>
                      <th className="px-3 py-3 text-right whitespace-nowrap min-w-[100px] w-24">ORD</th>
                      {selectedMRP && (Number(selectedMRP.revision_number || 0) > 0 || selectedMRP.parent_mrp_id) ? (
                        <>
                          <th className="px-3 py-3 text-right whitespace-nowrap min-w-[90px] bg-slate-100/80 text-slate-700 font-bold">MRP 1 Total</th>
                          <th className="px-3 py-3 text-center whitespace-nowrap min-w-[75px] bg-slate-100/80 text-slate-700 font-bold">% PR 1</th>
                          <th className="px-3 py-3 text-right whitespace-nowrap min-w-[90px] bg-amber-50/60 text-amber-800 font-bold">ACT PR 1</th>
                          <th className="px-3 py-3 text-right whitespace-nowrap min-w-[100px] bg-purple-50/60 text-purple-800 font-bold">MRP 2 Total</th>
                          <th className="px-3 py-3 text-right whitespace-nowrap min-w-[100px] w-24 bg-blue-50/80 text-blue-800 font-bold">ACT PR 2 (Baru)</th>
                          <th className="px-4 py-3 text-right whitespace-nowrap min-w-[130px] w-32">Harga Satuan (Rp)</th>
                          <th className="px-4 py-3 text-right font-bold whitespace-nowrap min-w-[140px] w-36">Amount (Rp)</th>
                          <th className="px-3 py-3 text-right whitespace-nowrap min-w-[95px] font-bold text-emerald-800 bg-emerald-50/30">Total PO</th>
                        </>
                      ) : (
                        <>
                          <th className="px-3 py-3 text-right whitespace-nowrap min-w-[110px]">MRP 1</th>
                          <th className="px-4 py-3 text-right whitespace-nowrap min-w-[130px] w-32">Harga Satuan (Rp)</th>
                          <th className="px-4 py-3 text-right font-bold whitespace-nowrap min-w-[140px] w-36">Amount (Rp)</th>
                          <th className="px-3 py-3 text-center whitespace-nowrap min-w-[80px] font-bold text-blue-700 bg-blue-50/10">% PR 1</th>
                        </>
                      )}
                      {selectedMRP.status !== "Released" && <th className="px-3 py-3 text-center w-10">Split</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {editableDetails.map((item, idx) => {
                      const needAll = Number(item.need_all_qty ?? item.gross_qty ?? item.qty_required ?? 0);
                      const stockStd = Number(item.stock_std_qty ?? item.safety_stock_qty ?? 0);
                      const sto = Number(item.sto_qty ?? item.current_stock ?? 0);
                      const physicalNetReq = Math.max(0, needAll + stockStd - sto);
                      const kebutuhanBersih = Number((physicalNetReq * (Number(item.allocation_percent || 100) / 100)).toFixed(2));
                      const ord = Math.max(0, Number(item.ord_qty ?? kebutuhanBersih));
                      const pcsPerPack = Math.max(1, Math.round(Number(item.pcs_per_pack || 1)));
                      const prPct = Number(item.release_draft_percent ?? 100);
                      const releasedOrd = ord === 0 ? 0 : Math.ceil(ord * (prPct / 100));
                      const mrpQty = releasedOrd === 0 ? 0 : (pcsPerPack <= 1 ? releasedOrd : Math.ceil(releasedOrd / pcsPerPack) * pcsPerPack);
                      const price = Number(item.unit_price ?? 0);
                      const amount = mrpQty * price;
                      const isSelected = selectedDetailItemIds.includes(item.id);

                      const mrp1Qty = Number((item as any).mrp1_qty || 0);
                      const pr1Pct = Number((item as any).release_draft_percent_1 ?? 100);
                      const actPo1 = Number((item as any).mrp1_released_pr || (item as any).on_order_qty || 0);
                      const isCarryOver = Boolean(selectedMRP && (Number(selectedMRP.revision_number || 0) > 0 || selectedMRP.parent_mrp_id));
                      const mrp2TotalKumulatif = isCarryOver ? (actPo1 + mrpQty) : (kebutuhanBersih > 0 ? (pcsPerPack <= 1 ? kebutuhanBersih : Math.ceil(kebutuhanBersih / pcsPerPack) * pcsPerPack) : mrpQty);
                      const totalPo = isCarryOver ? (actPo1 + mrpQty) : mrpQty;

                      return (
                        <tr key={item.id || idx} className={`transition-colors ${isSelected ? 'bg-emerald-50/40' : 'hover:bg-slate-50/80'}`}>
                          <td className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDetailItemIds(prev => [...prev, item.id]);
                                } else {
                                  setSelectedDetailItemIds(prev => prev.filter(id => id !== item.id));
                                }
                              }}
                              className="w-4 h-4 text-emerald-600 border-slate-300 rounded accent-emerald-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">
                              {item.class_type || "Component"}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">{item.product_code}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            <div>{item.product_name}</div>
                            {item.remark && (
                              <div className="text-[10px] text-amber-700 font-bold mt-0.5">{item.remark}</div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-slate-700 whitespace-nowrap">{needAll.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td className="px-3 py-3 text-right font-medium text-amber-700 whitespace-nowrap">+{stockStd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td className="px-3 py-3 text-right font-medium text-slate-600 whitespace-nowrap">{sto.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td className="px-3 py-3 text-right font-bold text-amber-700 bg-amber-50/40 text-xs whitespace-nowrap font-mono">
                            {kebutuhanBersih.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3">
                            {selectedMRP.status !== "Released" ? (
                              (() => {
                                const availSups = item.available_suppliers || [];
                                let dropdownOptions = suppliers;
                                if (availSups.length > 0) {
                                  const registeredOpts = availSups.map((s: any) => ({
                                    value: String(s.supplier_id),
                                    label: `✓ ${s.supplier_code ? s.supplier_code + ' - ' : ''}${s.supplier_name} (Rp ${Number(s.purchase_price || 0).toLocaleString()})`
                                  }));
                                  const regIds = new Set(availSups.map((s: any) => String(s.supplier_id)));
                                  const otherOpts = suppliers.filter(s => !regIds.has(String(s.value)));
                                  dropdownOptions = [...registeredOpts, ...otherOpts];
                                }

                                return (
                                  <select
                                    value={item.supplier_id || ""}
                                    onChange={(e) => {
                                      const supId = e.target.value;
                                      const matchedSup = availSups.find((s: any) => String(s.supplier_id) === supId);
                                      const matchedGlobalSup = suppliers.find(s => String(s.value) === supId);
                                      const updated = [...editableDetails];
                                      const newPrice = matchedSup ? Number(matchedSup.purchase_price || 0) : (item.unit_price || 0);
                                      const newPartNo = matchedSup ? (matchedSup.supplier_part_number || item.product_code) : item.product_code;
                                      const newSupName = matchedSup ? matchedSup.supplier_name : (matchedGlobalSup ? matchedGlobalSup.label : "");
                                      const newPcsPack = matchedSup ? Number(matchedSup.pcs_per_pack || 1) : (item.pcs_per_pack || 1);
                                      const rawAlloc = matchedSup && matchedSup.allocation_percent !== undefined ? Number(matchedSup.allocation_percent) : Number(item.allocation_percent || 100);
                                      const newAllocPct = (rawAlloc > 0 && rawAlloc <= 1) ? Math.round(rawAlloc * 100) : (rawAlloc || 100);

                                      updated[idx] = {
                                        ...updated[idx],
                                        supplier_id: supId || null,
                                        supplier_name: newSupName,
                                        unit_price: newPrice,
                                        part_no_vendor: newPartNo,
                                        pcs_per_pack: newPcsPack,
                                        allocation_percent: newAllocPct,
                                        amount: (updated[idx].mrp_qty || 0) * newPrice
                                      };
                                      setEditableDetails(updated);
                                    }}
                                    className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:ring-1 focus:ring-blue-500"
                                  >
                                    <option value="">-- Pilih Supplier --</option>
                                    {dropdownOptions.map(s => (
                                      <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                  </select>
                                );
                              })()
                            ) : (
                              <div className="font-semibold text-slate-800 text-xs">
                                {item.supplier_name || "-"}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center bg-emerald-50/20">
                            {selectedMRP.status !== "Released" ? (
                              <input
                                type="text"
                                readOnly
                                className="w-16 px-1.5 py-1 border border-slate-200 rounded text-center font-bold text-emerald-800 bg-slate-100 cursor-not-allowed select-none"
                                value={`${Math.round(Number(item.allocation_percent || 100))}%`}
                              />
                            ) : (
                              <span className="font-bold text-emerald-800">{Math.round(Number(item.allocation_percent || 100))}%</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {selectedMRP.status !== "Released" ? (
                              <input
                                type="number"
                                min={0}
                                className="w-full min-w-[75px] px-2 py-1 border border-slate-300 rounded text-right font-bold focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={ord}
                                onChange={(e) => {
                                  const updated = [...editableDetails];
                                  const val = Math.max(0, Number(e.target.value));
                                  const pPack = Math.max(1, Math.round(Number(updated[idx].pcs_per_pack || 1)));
                                  const calculatedMrp = val === 0 ? 0 : (pPack <= 1 ? Math.ceil(val) : Math.ceil(val / pPack) * pPack);

                                  const isCarryOverRow = Boolean(selectedMRP && (Number(selectedMRP.revision_number || 0) > 0 || selectedMRP.parent_mrp_id));

                                  const mrp1Qty = Number((updated[idx] as any).mrp1_qty || (updated[idx] as any).need_all_qty || 0);
                                  const actPo1 = Number((updated[idx] as any).mrp1_released_pr || (updated[idx] as any).qty_released_pr || 0);
                                  const baseOrd = Number((updated[idx] as any).base_ord ?? Math.max(0, mrp1Qty - actPo1));
                                  const baseNeedAll = Number((updated[idx] as any).base_need_all ?? (mrp1Qty > 0 ? mrp1Qty : Number(updated[idx].need_all_qty || 0)));

                                  let newNeedAll = Number(updated[idx].need_all_qty ?? updated[idx].gross_qty ?? 0);
                                  let newStockStd = Number(updated[idx].stock_std_qty ?? updated[idx].safety_stock_qty ?? 0);

                                  if (isCarryOverRow) {
                                    // Nilai dasar Need All tetap dari MRP 1 (e.g. 87.400).
                                    // Nilai awal order dasarnya adalah baseOrd (e.g. 21.850).
                                    // Jika order diisi > baseOrd (e.g. > 21.850), Need All bertambah dari dasar 87.400.
                                    const extraOrd = Math.max(0, val - baseOrd);
                                    newNeedAll = baseNeedAll + extraOrd;
                                    newStockStd = Number(((newNeedAll / 19) * 1.1).toFixed(2));
                                  }

                                  updated[idx] = {
                                    ...updated[idx],
                                    need_all_qty: newNeedAll,
                                    gross_qty: newNeedAll,
                                    stock_std_qty: newStockStd,
                                    safety_stock_qty: newStockStd,
                                    ord_qty: val,
                                    mrp_qty: calculatedMrp,
                                    amount: calculatedMrp * Number(updated[idx].unit_price || 0)
                                  };
                                  setEditableDetails(updated);
                                }}
                              />
                            ) : (
                              <span className="font-bold text-slate-800 whitespace-nowrap">{ord.toLocaleString()}</span>
                            )}
                          </td>
                          {selectedMRP && (Number(selectedMRP.revision_number || 0) > 0 || selectedMRP.parent_mrp_id) ? (
                            <>
                              {/* MRP 1 Total */}
                              <td className="px-3 py-3 text-right whitespace-nowrap bg-slate-50/50 font-medium text-slate-600">
                                {mrp1Qty.toLocaleString()}
                              </td>
                              {/* % PR 1 */}
                              <td className="px-3 py-3 text-center whitespace-nowrap bg-slate-50/50 font-bold text-slate-600">
                                {pr1Pct}%
                              </td>
                              {/* ACT PR 1 (Sudah Dipesan di Tahap 1) */}
                              <td className="px-3 py-3 text-right whitespace-nowrap bg-amber-50/30 font-bold text-amber-800">
                                {actPo1.toLocaleString()}
                              </td>
                              {/* MRP 2 Total (Kebutuhan Kumulatif Siklus 2) */}
                              <td className="px-3 py-3 text-right whitespace-nowrap bg-purple-50/30 font-bold text-purple-800">
                                {mrp2TotalKumulatif.toLocaleString()}
                              </td>
                              {/* ACT PR 2 (Pemesanan Baru di MRP-2) */}
                              <td className="px-3 py-3 text-right bg-blue-50/40">
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="font-bold text-blue-700 whitespace-nowrap">{mrpQty.toLocaleString()}</span>
                                  {(item.pcs_per_pack || 1) > 1 && (
                                    <span className="text-[9px] text-slate-400 font-semibold">pack={item.pcs_per_pack}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {selectedMRP.status !== "Released" ? (
                                  <input
                                    type="number"
                                    readOnly
                                    className="w-full min-w-[85px] px-2 py-1 border border-slate-200 rounded text-right font-bold bg-slate-100 cursor-not-allowed select-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={price}
                                  />
                                ) : (
                                  <span className="font-semibold text-slate-800 whitespace-nowrap">{price.toLocaleString()}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                                Rp {amount.toLocaleString()}
                              </td>
                              {/* Total PO (Akumulasi PR 1 + PR 2) */}
                              <td className="px-3 py-3 text-right font-bold text-emerald-800 bg-emerald-50/20 whitespace-nowrap">
                                {totalPo.toLocaleString()}
                              </td>
                            </>
                          ) : (
                            <>
                              {/* Standard MRP 1 Display */}
                              <td className="px-3 py-3 text-right">
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="font-bold text-blue-700 whitespace-nowrap">{mrpQty.toLocaleString()}</span>
                                  {(item.pcs_per_pack || 1) > 1 && (
                                    <span className="text-[9px] text-slate-400 font-semibold">pack={item.pcs_per_pack}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {selectedMRP.status !== "Released" ? (
                                  <input
                                    type="number"
                                    readOnly
                                    className="w-full min-w-[85px] px-2 py-1 border border-slate-200 rounded text-right font-bold bg-slate-100 cursor-not-allowed select-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={price}
                                  />
                                ) : (
                                  <span className="font-semibold text-slate-800 whitespace-nowrap">{price.toLocaleString()}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                                Rp {amount.toLocaleString()}
                              </td>
                              <td className="px-3 py-3 text-center whitespace-nowrap font-bold text-blue-700">
                                {item.release_draft_percent !== undefined && item.release_draft_percent !== null ? `${Number(item.release_draft_percent)}%` : "100%"}
                              </td>
                            </>
                          )}
                          {selectedMRP.status !== "Released" && (
                            <td className="px-3 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSplitVendorRow(idx)}
                                  title="Pecah Alokasi ke Supplier Kedua"
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                >
                                  <Split size={15} />
                                </button>

                                {editableDetails.filter(d => d.product_code === item.product_code).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSplitRow(idx)}
                                    title="Batal Split / Hapus Baris Vendor Ini"
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Total Financial Summary Footer — Detailed Breakdown */}
              {(() => {
                const classOrder = ["Finished Good", "Component", "Raw Material", "Packaging", "Consumable", "Sticker"];
                const classMap: Record<string, number> = {};
                editableDetails.forEach(item => {
                  const cls = item.class_type || "Component";
                  const pPack = Math.max(1, Math.round(Number(item.pcs_per_pack || 1)));
                  const ord2 = Math.max(0, Number(item.ord_qty ?? 0));
                  const mQty = ord2 === 0 ? 0 : (pPack <= 1 ? Math.ceil(ord2) : Math.ceil(ord2 / pPack) * pPack);
                  const amt = mQty * Number(item.unit_price || 0);
                  classMap[cls] = (classMap[cls] || 0) + amt;
                });

                const allClasses = [...new Set([...classOrder, ...Object.keys(classMap)])];
                const usedClasses = allClasses.filter(c => (classMap[c] || 0) > 0);
                const grandTotal = Object.values(classMap).reduce((s, v) => s + v, 0);
                const mrpTotal = totalStep2Amount;

                return (
                  <div className="pt-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total MRP (Estimasi Anggaran)</span>
                        <span className="text-lg font-black text-emerald-800">Rp {mrpTotal.toLocaleString()}</span>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Total Item Material</span>
                        <span className="text-lg font-black text-blue-800">{editableDetails.length} Item</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Sumber Perencanaan</span>
                        <span className="text-sm font-black text-slate-800">{selectedMRP.planning_source || "-"}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Rincian Anggaran per Kelas Material</span>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-white border-b border-slate-100">
                            <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Kelas Material</th>
                            <th className="px-4 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Estimasi Anggaran (Rp)</th>
                            <th className="px-4 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">% dari Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {usedClasses.map(cls => {
                            const classAmt = classMap[cls] || 0;
                            const pct = grandTotal > 0 ? ((classAmt / grandTotal) * 100).toFixed(1) : "0.0";
                            return (
                              <tr key={cls} className="hover:bg-white transition-colors">
                                <td className="px-4 py-2 font-semibold text-slate-700">
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                                    {cls}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right font-bold text-slate-900">
                                  Rp {classAmt.toLocaleString()}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-bold">{pct}%</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                            <td className="px-4 py-3 font-black text-emerald-800 uppercase tracking-wider">TOTAL</td>
                            <td className="px-4 py-3 text-right font-black text-emerald-800 text-sm">
                              Rp {grandTotal.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded font-black">100%</span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 3: SUMMARY GABUNGAN (CONSOLIDATED VIEW MRP 1 & MRP 2 / REVISI) */}
          {detailTab === "summary_gabungan" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                      Consolidated Multi-Cycle View
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    Summary Gabungan: Realisasi Kebutuhan Material (MRP 1 + MRP 2 / Revisi)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Menampilkan perbandingan kebutuhan, pengajuan PR bertahap, carry-over sisa, dan total realisasi kumulatif.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
                    Total Dokumen Terhubung: <b>{(selectedMRP.cycle_mrps || []).length || 1} MRP</b>
                  </span>
                </div>
              </div>

              {/* KPI Scorecard Cards */}
              {(() => {
                const summaryList = selectedMRP.cycle_summary || [];
                const totalKebutuhan = summaryList.reduce((s: number, i: any) => s + Number(i.total_mrp_qty || 0), 0);
                const totalPR = summaryList.reduce((s: number, i: any) => s + Number(i.total_released_pr || 0), 0);
                const totalSisa = summaryList.reduce((s: number, i: any) => s + Number(i.total_sisa_qty || 0), 0);
                const totalBudget = summaryList.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
                const overallPct = totalKebutuhan > 0 ? Math.min(100, Math.round((totalPR / totalKebutuhan) * 100)) : 0;

                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Kebutuhan Kumulatif</span>
                      <span className="text-xl font-black text-slate-900 mt-0.5 block">{totalKebutuhan.toLocaleString()} <span className="text-xs font-medium text-slate-400">Pcs</span></span>
                      <span className="text-[10px] text-slate-400 font-medium">Dari seluruh siklus MRP</span>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Sudah Dirilis ke PR</span>
                      <span className="text-xl font-black text-emerald-800 mt-0.5 block">{totalPR.toLocaleString()} <span className="text-xs font-medium text-emerald-600">Pcs</span></span>
                      <span className="text-[10px] text-emerald-600 font-bold">Progress: {overallPct}% Terelisasi</span>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Sisa Belum Dirilis (Carry-Over)</span>
                      <span className="text-xl font-black text-amber-900 mt-0.5 block">{totalSisa.toLocaleString()} <span className="text-xs font-medium text-amber-600">Pcs</span></span>
                      <span className="text-[10px] text-amber-700 font-medium">Tersedia untuk MRP periode berikutnya</span>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Estimasi Total Anggaran</span>
                      <span className="text-xl font-black text-indigo-900 mt-0.5 block">Rp {totalBudget.toLocaleString()}</span>
                      <span className="text-[10px] text-indigo-600 font-medium">Akumulasi seluruh siklus</span>
                    </div>
                  </div>
                );
              })()}

              {/* Matrix Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
                    <tr>
                      <th className="px-3 py-3.5 text-center w-8">No</th>
                      <th className="px-4 py-3.5 text-left min-w-[130px]">Part No</th>
                      <th className="px-4 py-3.5 text-left min-w-[180px]">Nama Material</th>
                      <th className="px-3 py-3.5 text-center min-w-[70px]">Satuan</th>
                      
                      {/* Dynamic columns for each cycle MRP */}
                      {(selectedMRP.cycle_mrps || []).map((cm: any, cIdx: number) => {
                        const label = cIdx === 0
                          ? `MRP 1 (${cm.reference_code})`
                          : Number(cm.revision_number || 0) > 0
                            ? `MRP ${cIdx + 1} / Rev. 00${cm.revision_number} (${cm.reference_code})`
                            : `MRP ${cIdx + 1} (${cm.reference_code})`;
                        return (
                          <th key={cm.id} className="px-3 py-3.5 text-center bg-indigo-50/50 border-l border-r border-indigo-100 min-w-[200px]">
                            <div className="text-[10px] text-indigo-800 font-black">{label}</div>
                            <div className="flex justify-between text-[9px] text-indigo-600 font-bold mt-1 px-1">
                              <span>Kebutuhan</span>
                              <span>Rilis PR</span>
                              <span>Sisa</span>
                            </div>
                          </th>
                        );
                      })}

                      <th className="px-4 py-3.5 text-right font-black bg-emerald-50 text-emerald-900 min-w-[110px]">Total Kebutuhan</th>
                      <th className="px-4 py-3.5 text-right font-black bg-emerald-50 text-emerald-900 min-w-[110px]">Total Rilis PR</th>
                      <th className="px-4 py-3.5 text-right font-black bg-amber-50 text-amber-900 min-w-[100px]">Sisa Akhir</th>
                      <th className="px-4 py-3.5 text-center font-black min-w-[120px]">Realisasi (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedMRP.cycle_summary || []).length > 0 ? (
                      (selectedMRP.cycle_summary || []).map((item: any, idx: number) => {
                        const progress = Number(item.total_mrp_qty || 0) > 0 
                          ? Math.min(100, Math.round((Number(item.total_released_pr || 0) / Number(item.total_mrp_qty || 1)) * 100)) 
                          : 0;

                        return (
                          <tr key={item.product_code || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.product_code}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{item.product_name}</td>
                            <td className="px-3 py-3 text-center text-slate-500 font-medium">{item.product_unit || "PCS"}</td>

                            {/* Cycle MRP Breakdown Columns */}
                            {(selectedMRP.cycle_mrps || []).map((cm: any) => {
                              const bData = item.mrp_breakdown?.[String(cm.id)] || { mrp_qty: 0, qty_released_pr: 0, sisa_qty: 0 };
                              return (
                                <td key={cm.id} className="px-3 py-3 text-center bg-indigo-50/20 border-l border-r border-indigo-100 font-mono">
                                  <div className="flex justify-between text-xs font-semibold px-1">
                                    <span className="text-slate-800">{bData.mrp_qty ? bData.mrp_qty.toLocaleString() : "-"}</span>
                                    <span className="text-emerald-700 font-bold">{bData.qty_released_pr ? bData.qty_released_pr.toLocaleString() : "0"}</span>
                                    <span className={bData.sisa_qty > 0 ? "text-amber-700 font-bold" : "text-slate-300"}>
                                      {bData.sisa_qty ? bData.sisa_qty.toLocaleString() : "0"}
                                    </span>
                                  </div>
                                </td>
                              );
                            })}

                            <td className="px-4 py-3 text-right font-bold text-slate-900 bg-emerald-50/20 font-mono">
                              {Number(item.total_mrp_qty || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-emerald-700 bg-emerald-50/20 font-mono">
                              {Number(item.total_released_pr || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-amber-700 bg-amber-50/20 font-mono">
                              {Number(item.total_sisa_qty || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      progress >= 100 ? "bg-emerald-500" : progress > 0 ? "bg-blue-500" : "bg-slate-300"
                                    }`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-bold text-slate-700 w-10 text-right">{progress}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8 + (selectedMRP.cycle_mrps || []).length} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                          Belum ada ringkasan multi-siklus untuk dokumen ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* POPUP MODAL: RILIS PR DENGAN PERSENTASE (%) */}
      {isReleaseModalOpen && releaseTargetMRP && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-emerald-700 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 rounded-xl shadow-inner">
                  <Send size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Rilis Kebutuhan MRP ke Purchase Request (PR)</h3>
                  <p className="text-xs text-emerald-100 font-medium mt-0.5">
                    No. MRP: <span className="font-mono font-bold text-white">{releaseTargetMRP.reference_code}</span> | Customer: <b>{releaseTargetMRP.customer_name || "-"}</b>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReleaseModalOpen(false)}
                className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-600/60 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Guidance Box */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-900 text-xs leading-relaxed font-medium">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Aturan Pengajuan PR Bertahap (%):</strong> Tentukan persentase (%) kebutuhan yang ingin diajukan ke PR saat ini (misal 80% dari 10.000 = 8.000).
                  <span className="block mt-0.5 text-emerald-700 font-semibold">
                    ✓ Kebutuhan material asli, harga, dan total amount dokumen MRP tetap utuh tersimpan dan tidak akan berkurang.
                  </span>
                </div>
              </div>

              {/* Global Quick Setter Controls */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Percent size={18} className="text-slate-600" />
                  <span className="text-xs font-bold text-slate-800">Set Persentase Semua Item:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {[25, 50, 75, 80, 100].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleApplyGlobalPercent(val)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                        globalReleasePercent === val
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {val}%
                    </button>
                  ))}

                  <div className="flex items-center gap-1.5 ml-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={globalReleasePercent}
                      onChange={(e) => handleApplyGlobalPercent(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-bold text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-500">%</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
                    <tr>
                      <th className="px-3 py-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={releaseModalItems.length > 0 && releaseModalItems.every(i => i.is_selected)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setReleaseModalItems(prev => prev.map(i => ({ ...i, is_selected: checked })));
                          }}
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded accent-emerald-600 cursor-pointer"
                        />
                      </th>
                      <th className="px-3 py-3 text-center w-8">No</th>
                      <th className="px-3 py-3 text-left">Part No & Material</th>
                      <th className="px-3 py-3 text-left">Vendor</th>
                      <th className="px-3 py-3 text-right">Kebutuhan MRP</th>
                      <th className="px-3 py-3 text-right">Sudah Rilis PR</th>
                      <th className="px-3 py-3 text-right font-bold text-amber-700 bg-amber-50/40">Sisa Belum Rilis</th>
                      <th className="px-3 py-3 text-center w-20 bg-emerald-50/40 font-black text-emerald-800">% PR</th>
                      <th className="px-3 py-3 text-right w-28 bg-emerald-50/40 font-black text-emerald-900">Rilis Sekarang</th>
                      <th className="px-3 py-3 text-right font-semibold text-slate-500">Sisa Nanti</th>
                      <th className="px-4 py-3 text-right font-bold">Subtotal PR (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {releaseModalItems.map((item, idx) => {
                      const afterReleaseRemaining = Math.max(0, item.remaining_qty - item.release_qty);

                      return (
                        <tr key={item.id} className={`transition-colors ${item.is_selected ? 'bg-emerald-50/20' : 'opacity-60 bg-slate-50/50'}`}>
                          <td className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={item.is_selected}
                              onChange={() => handleToggleRowSelection(item.id)}
                              className="w-4 h-4 text-emerald-600 border-slate-300 rounded accent-emerald-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="px-3 py-3">
                            <div className="font-mono font-bold text-slate-900">{item.product_code}</div>
                            <div className="font-medium text-slate-700 text-[11px] truncate max-w-xs">{item.product_name}</div>
                          </td>
                          <td className="px-3 py-3 text-slate-700 font-medium">{item.supplier_name}</td>
                          <td className="px-3 py-3 text-right font-bold text-slate-900 font-mono">{item.mrp_qty.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-emerald-700 font-bold font-mono">
                            {item.qty_released_pr > 0 ? item.qty_released_pr.toLocaleString() : "-"}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-amber-700 bg-amber-50/30 font-mono">
                            {item.remaining_qty.toLocaleString()}
                          </td>

                          {/* Percent Input */}
                          <td className="px-2 py-2 text-center bg-emerald-50/30">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              disabled={!item.is_selected || item.remaining_qty <= 0}
                              value={item.percent}
                              onChange={(e) => handleRowPercentChange(item.id, Number(e.target.value))}
                              className="w-16 px-1.5 py-1 text-center font-bold text-emerald-800 bg-white border border-emerald-300 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>

                          {/* Release Qty Input */}
                          <td className="px-2 py-2 text-right bg-emerald-50/30">
                            <input
                              type="number"
                              min={0}
                              max={item.remaining_qty}
                              disabled={!item.is_selected || item.remaining_qty <= 0}
                              value={item.release_qty}
                              onChange={(e) => handleRowQtyChange(item.id, Number(e.target.value))}
                              className="w-24 px-2 py-1 text-right font-black text-emerald-900 bg-white border border-emerald-300 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                            />
                          </td>

                          <td className="px-3 py-3 text-right text-slate-500 font-medium font-mono">
                            {afterReleaseRemaining.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-900 font-mono">
                            Rp {item.amount.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Modal Financial Recap */}
              {(() => {
                const selectedItems = releaseModalItems.filter(i => i.is_selected && i.release_qty > 0);
                const totalReleaseQty = selectedItems.reduce((s, i) => s + i.release_qty, 0);
                const totalPRAmount = selectedItems.reduce((s, i) => s + i.amount, 0);

                return (
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Item Dirilis</span>
                        <span className="text-base font-black text-emerald-950">{selectedItems.length} Material</span>
                      </div>
                      <div className="h-8 w-px bg-emerald-200" />
                      <div>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Qty PR</span>
                        <span className="text-base font-black text-emerald-950">{totalReleaseQty.toLocaleString()} Pcs</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Estimasi Total Nilai PR yang Dibentuk</span>
                      <span className="text-xl font-black text-emerald-900">Rp {totalPRAmount.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Setelah dirilis, Purchase Request (PR) otomatis masuk ke modul Approval & Pembelian.
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsReleaseModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-xs text-slate-700 hover:bg-slate-100 transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSavingDraftPRPercent || isSubmittingPRRelease}
                  onClick={handleSaveDraftPRPercent}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95 flex items-center gap-2"
                >
                  <Save size={15} />
                  <span>{isSavingDraftPRPercent ? "Menyimpan..." : "💾 Simpan Draft % PR"}</span>
                </button>
                {isMRPReleasePREnabled && (
                  <button
                    type="button"
                    disabled={isSubmittingPRRelease || isSavingDraftPRPercent}
                    onClick={handleConfirmPRRelease}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95 flex items-center gap-2"
                  >
                    <Send size={15} />
                    <span>{isSubmittingPRRelease ? "Memproses Rilis PR..." : "✓ Konfirmasi & Generate PR"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE MRP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden border border-slate-200 flex flex-col">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Hitung & Generate MRP Baru</h3>
                <p className="text-xs text-slate-500 font-medium">Perhitungan otomatis kebutuhan bahan baku manufaktur dari PO/Forecast & Stok.</p>
              </div>
              <button onClick={handleCloseGenerateModal} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGenerateMRP} className="p-6 space-y-4 text-xs">
              {/* Guided Banner */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs leading-relaxed font-medium flex items-start gap-2">
                <FileSpreadsheet size={16} className="shrink-0 mt-0.5 text-blue-600" />
                <div>
                  <strong>Petunjuk MRP 2-Step:</strong> Setelah menekan tombol <strong>Hitung & Generate MRP</strong>, sistem akan otomatis melakukan kalkulasi BOM & membuka <strong>Step 1 (Hitungan Kebutuhan Fisik)</strong> dan <strong>Step 2 (Alokasi Vendor & Anggaran)</strong>.
                </div>
              </div>

              {/* Carry-Over from Previous MRP (Feature 2) */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-indigo-900 text-xs">
                    <input
                      type="checkbox"
                      checked={enableCarryOver}
                      onChange={(e) => setEnableCarryOver(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-indigo-300 accent-indigo-600"
                    />
                    <span>Tarik Sisa PR Belum Terilis (Carry-Over) dari MRP Sebelumnya</span>
                  </label>
                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                    Siklus Lanjutan
                  </span>
                </div>

                {enableCarryOver && (
                  <div className="space-y-1 pt-1 animate-in fade-in duration-200">
                    <label className="font-semibold text-indigo-800 text-[11px]">Pilih MRP Referensi Sebelumnya (MRP 1):</label>
                    <SearchableSelect
                      options={mrps.map(m => ({
                        value: m.id,
                        label: `${m.reference_code} - ${m.customer_name || '-'} (${m.status})`
                      }))}
                      placeholder="Pilih MRP Sebelumnya untuk ditarik sisa kebutuhannya..."
                      value={selectedCarryOverMrpId}
                      onChange={(val) => setSelectedCarryOverMrpId(val)}
                    />
                    <p className="text-[10px] text-indigo-600 italic">
                      💡 Sistem akan menyalin seluruh item material dari MRP referensi, kemudian menghitung ulang stok aktual dan sisa kuantiti yang belum dirilis. Dokumen PO/Forecast tidak diperlukan.
                    </p>
                  </div>
                )}
              </div>

              {/* Source Document Selection - Hidden when carry-over mode is active */}
              {!enableCarryOver && (
                <>
                  {/* Planning Source Toggle */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Sumber Perencanaan</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPlanningSource("PO Customer");
                          setSelectedPoId("");
                          setSelectedForecastId("");
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                          planningSource === "PO Customer"
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        PO Customer (Firm Orders)
                      </button>
                      {isForecastEnabled && (
                        <button
                          type="button"
                          onClick={() => {
                            setPlanningSource("Sales Forecast");
                            setSelectedPoId("");
                            setSelectedForecastId("");
                          }}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                            planningSource === "Sales Forecast"
                              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          Sales Forecast (Demand Plan)
                        </button>
                      )}
                      {isMRPManualFGActive && (
                        <button
                          type="button"
                          onClick={() => {
                            setPlanningSource("Manual FG Entry");
                            setSelectedPoId("");
                            setSelectedForecastId("");
                          }}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                            planningSource === "Manual FG Entry"
                              ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          📦 Input Manual Finished Goods
                        </button>
                      )}
                    </div>
                  </div>

                  {planningSource === "PO Customer" ? (
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Pilih Dokumen PO Customer *</label>
                      <SearchableSelect
                        options={customerPOs}
                        placeholder="Pilih PO Customer..."
                        value={selectedPoId}
                        onChange={(val) => setSelectedPoId(val)}
                      />
                    </div>
                  ) : planningSource === "Sales Forecast" ? (
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Pilih Dokumen Customer Forecast *</label>
                      <SearchableSelect
                        options={forecasts}
                        placeholder="Pilih Customer Forecast..."
                        value={selectedForecastId}
                        onChange={(val) => setSelectedForecastId(val)}
                      />
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900 text-xs">Daftar Finished Goods (FG) & Qty Produksi Manual</span>
                        <button
                          type="button"
                          onClick={() => setManualFgItems(prev => [...prev, { product_id: "", product_code: "", product_name: "", qty: 1 }])}
                          className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1"
                        >
                          <Plus size={13} /> Tambah Item FG
                        </button>
                      </div>

                      <div className="space-y-2">
                        {manualFgItems.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-amber-200 shadow-xs">
                            <div className="flex-1">
                              <ProductSearchDropdown
                                products={products}
                                value={item.product_id || ""}
                                useSalePrice
                                onChange={(p) => {
                                  if (!p.id) return;
                                  const next = [...manualFgItems];
                                  next[idx] = {
                                    ...next[idx],
                                    product_id: String(p.id),
                                    product_code: p.product_code || "",
                                    product_name: p.product_name || "",
                                  };
                                  setManualFgItems(next);
                                }}
                              />
                            </div>
                            <div className="w-24">
                              <input
                                type="number"
                                min={1}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-xs"
                                value={item.qty}
                                onChange={(e) => {
                                  const next = [...manualFgItems];
                                  next[idx].qty = Number(e.target.value) || 1;
                                  setManualFgItems(next);
                                }}
                              />
                            </div>
                            {manualFgItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...manualFgItems];
                                  next.splice(idx, 1);
                                  setManualFgItems(next);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-amber-700 italic">
                        💡 Pilih barang jadi (FG) dan kuantiti targetnya. Sistem akan otomatis me-breakdown (BOM explosion) seluruh komponen & bahan bakunya.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Warehouse Target */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Gudang Target Pengecekan Stok</label>
                <SearchableSelect
                  options={warehouses}
                  placeholder="Pilih Gudang (Default: Semua Gudang)..."
                  value={selectedWarehouseId}
                  onChange={(val) => setSelectedWarehouseId(val)}
                />
              </div>

              {/* Date Ranges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Tanggal Mulai Perencanaan *</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-semibold"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Tanggal Akhir Perencanaan *</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-semibold"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Safety & Loss factors */}
              {(isShowSafetyStockActive || isShowScrapLossActive) && (
                <div className={`grid grid-cols-1 ${isShowSafetyStockActive && isShowScrapLossActive ? "sm:grid-cols-2" : "sm:grid-cols-1"} gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200`}>
                  {isShowSafetyStockActive && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="font-semibold text-slate-700">Safety Stock Buffer (%)</label>
                        <div className="flex gap-1">
                          {[0, 5, 10].map(val => (
                            <button key={val} type="button" onClick={() => setSafetyStockPct(val)} className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${safetyStockPct === val ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'}`}>
                              {val}%
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white outline-none font-semibold"
                        value={safetyStockPct}
                        onChange={(e) => setSafetyStockPct(Number(e.target.value))}
                      />
                    </div>
                  )}

                  {isShowScrapLossActive && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="font-semibold text-slate-700">Scrap / Material Loss (%)</label>
                        <div className="flex gap-1">
                          {[0, 2, 5].map(val => (
                            <button key={val} type="button" onClick={() => setScrapLossPct(val)} className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${scrapLossPct === val ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'}`}>
                              {val}%
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white outline-none font-semibold"
                        value={scrapLossPct}
                        onChange={(e) => setScrapLossPct(Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Planner & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">PIC Perencana (Planner)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-semibold"
                    value={plannerName}
                    onChange={(e) => setPlannerName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Catatan Perencanaan</label>
                  <input
                    type="text"
                    placeholder="Instruksi khusus MRP..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-medium"
                    value={mrpNote}
                    onChange={(e) => setMrpNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button type="button" onClick={handleCloseGenerateModal} className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700">
                  Batal
                </button>
                <button type="submit" className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold shadow-sm">
                  Hitung & Generate MRP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
