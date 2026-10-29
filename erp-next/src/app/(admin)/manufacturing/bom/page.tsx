"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Copy,
  Plus,
  Search,
  Calendar,
  Layers,
  ArrowLeft,
  ArrowRight,
  Trash2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Sparkles,
  User,
  Activity,
  Warehouse,
  Check,
  PlusSquare,
  CornerDownRight,
  Eye,
  Edit,
  DollarSign,
  Cog,
  Percent,
  FileText,
  X,
  Factory,
  FileSpreadsheet,
} from "lucide-react";
import api from "@/lib/api";
import FilterBar from "@/components/ui/FilterBar";
import TablePagination from "@/components/ui/TablePagination";
import PrintButton from "@/components/ui/PrintButton";

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface BOMItem {
  id?: number;
  temp_id?: string;
  parent_temp_id?: string | null;
  parent_item_id?: number | null;
  item_type: string;
  warehouse_id: number | string;
  product_code: string;
  part_number: string;
  product_name: string;
  qty: number;
  unit: string;
  price: number;
  scrap_percent: number;
  gross_qty: number;
  notes?: string;
  operation_seq: number;
  expanded?: boolean;
}

interface BOMHeader {
  id?: number;
  bom_code: string;
  bom_name: string;
  description: string;
  username: string;
  status: "Aktif" | "Non-Aktif";
  target_warehouse_id: number | string;
  finished_good_code: string;
  finished_good_name: string;
  finished_good_unit: string;
  finished_good_qty: number;
  is_dismantling: boolean;
  finished_good_type?: string;
  bom_type: "Manufacturing" | "Kit / Dismantling" | "Engineering";
  version_revision: string;
  effective_start_date?: string;
  effective_end_date?: string;
  routing_work_center: string;
  labor_cost: number;
  overhead_cost: number;
  total_cost?: number;
}

export default function BOMPage() {
  const router = useRouter();
  
  // View states: 'list' or 'form'
  const [view, setView] = useState<"list" | "form">("list");
  const [editId, setEditId] = useState<number | null>(null);

  // Listing Data States
  const [boms, setBoms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalBoms, setTotalBoms] = useState(0);

  // Sorting & Filtering States
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "bom_name_asc" | "bom_name_desc" | "bom_code_asc" | "bom_code_desc">("newest");
  const [filterStatus, setFilterStatus] = useState<"all" | "Aktif" | "Non-Aktif">("all");
  const [filterType, setFilterType] = useState<"all" | "Manufacturing" | "Kit / Dismantling" | "Engineering">("all");

  // Form State
  const [autoNumber, setAutoNumber] = useState("BOM001");
  const [header, setHeader] = useState<BOMHeader>({
    bom_code: "",
    bom_name: "",
    description: "",
    username: "",
    status: "Aktif",
    target_warehouse_id: "",
    finished_good_code: "",
    finished_good_name: "",
    finished_good_unit: "Set",
    finished_good_qty: 1.00,
    is_dismantling: false,
    finished_good_type: "",
    bom_type: "Manufacturing",
    version_revision: "Rev 1.0",
    routing_work_center: "Main Assembly Line",
    labor_cost: 0,
    overhead_cost: 0
  });

  // Flat list of items representing hierarchical recursive BOM items
  const [items, setItems] = useState<BOMItem[]>([]);

  // Master Data Cache
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [finishedGoodTypes, setFinishedGoodTypes] = useState<any[]>([
    { code: "FG", name: "Finished Good" },
    { code: "WIP", name: "Work in Progress" }
  ]);

  // Modal / Lookup Dialog State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productList, setProductList] = useState<any[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [productModalTarget, setProductModalTarget] = useState<{
    type: "component" | "fg";
    index?: number;
  } | null>(null);

  // Tree Explosion Detail Modal State
  const [isExplosionModalOpen, setIsExplosionModalOpen] = useState(false);
  const [selectedBomDetail, setSelectedBomDetail] = useState<any>(null);
  const [selectedBomItems, setSelectedBomItems] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // ─── Initial Side Effects ──────────────────────────────────────────────────
  useEffect(() => {
    fetchBOMs();
  }, [searchQuery, currentPage, itemsPerPage, sortBy, filterStatus, filterType]);

  useEffect(() => {
    if (view === "form") {
      fetchMasterData();
    }
  }, [view]);

  // ─── Fetch APIs ────────────────────────────────────────────────────────────
  const fetchBOMs = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/manufacturing/boms", {
        params: { search: searchQuery }
      });
      let allBoms = res.data.data || [];

      // Apply Status Filter
      if (filterStatus !== "all") {
        allBoms = allBoms.filter((bom: any) => bom.status === filterStatus);
      }

      // Apply Type Filter
      if (filterType !== "all") {
        allBoms = allBoms.filter((bom: any) => bom.bom_type === filterType);
      }

      // Apply Sorting
      allBoms.sort((a: any, b: any) => {
        if (sortBy === "bom_name_asc") {
          return (a.bom_name || "").localeCompare(b.bom_name || "");
        }
        if (sortBy === "bom_name_desc") {
          return (b.bom_name || "").localeCompare(a.bom_name || "");
        }
        if (sortBy === "bom_code_asc") {
          return (a.bom_code || "").localeCompare(b.bom_code || "");
        }
        if (sortBy === "bom_code_desc") {
          return (b.bom_code || "").localeCompare(a.bom_code || "");
        }
        return Number(b.id || 0) - Number(a.id || 0);
      });

      setTotalBoms(allBoms.length);
      
      const startIndex = (currentPage - 1) * itemsPerPage;
      const paginatedBoms = allBoms.slice(startIndex, startIndex + itemsPerPage);
      setBoms(paginatedBoms);
    } catch (err) {
      console.error("Error fetching BOM list:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [whRes, userRes, fgTypesRes] = await Promise.all([
        api.express.get("/warehouses", { params: { limit: 100 } }),
        api.express.get("/users", { params: { limit: 100 } }),
        api.express.get("/tipe-barang-jadi").catch(() => null)
      ]);
      setWarehouses(whRes.data.data || []);
      setUsers(userRes.data.data || userRes.data || []);
      if (fgTypesRes && fgTypesRes.data && fgTypesRes.data.data) {
        setFinishedGoodTypes(fgTypesRes.data.data);
      }
    } catch (err) {
      console.error("Error fetching master data:", err);
    }
  };

  const mapProductTypeToFGCode = (type: string | null | undefined): string => {
    if (!type) return "FG";
    const cleaned = type.trim().toLowerCase();
    if (cleaned.includes("finished good") || cleaned === "fg") {
      return "FG";
    }
    if (cleaned === "wip" || cleaned.includes("work in progress") || cleaned.includes("half finished") || cleaned.includes("semi finished")) {
      return "WIP";
    }
    if (cleaned === "sfg" || cleaned.includes("semi-finished")) {
      return "SFG";
    }
    return "FG";
  };

  // ─── Helper: Generate Unique BOM Code ──────────────────────────────────────
  const handleGenerateBOMCode = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setHeader(prev => ({
      ...prev,
      bom_code: `BOM-21/ASKI/${randomSuffix}`
    }));
  };

  // ─── Recursive Helpers for Infinite Tree Layers ────────────────────────────
  const getRowDepth = (item: BOMItem): number => {
    let depth = 2; // Top level is depth 2 (displays as L2)
    let current = item;
    while (current.parent_temp_id) {
      const parent = items.find(p => p.temp_id === current.parent_temp_id);
      if (!parent) break;
      depth++;
      current = parent;
    }
    return depth;
  };

  const isRowVisible = (item: BOMItem): boolean => {
    let current = item;
    while (current.parent_temp_id) {
      const parent = items.find(p => p.temp_id === current.parent_temp_id);
      if (!parent || !parent.expanded) return false;
      current = parent;
    }
    return true;
  };

  // ─── Component Row Actions ─────────────────────────────────────────────────
  const handleAddComponent2 = () => {
    const tempId = `temp-c2-${Date.now()}`;
    const newItem: BOMItem = {
      temp_id: tempId,
      parent_temp_id: null,
      parent_item_id: null,
      item_type: "RAW",
      warehouse_id: warehouses[0]?.id || "",
      product_code: "",
      part_number: "Pilih Item",
      product_name: "",
      qty: 1.00,
      unit: "PCS",
      price: 0.00,
      scrap_percent: 0.00,
      gross_qty: 1.00,
      notes: "",
      operation_seq: (items.length + 1) * 10,
      expanded: false
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleAddSubComponent = (parentIndex: number) => {
    const parent = items[parentIndex];
    if (!parent) return;

    if (parent.item_type !== "WIP") {
      const updated = [...items];
      updated[parentIndex].item_type = "WIP";
      setItems(updated);
    }

    const tempId = `temp-sub-${Date.now()}`;
    const newItem: BOMItem = {
      temp_id: tempId,
      parent_temp_id: parent.temp_id,
      parent_item_id: parent.id || null,
      item_type: "RAW",
      warehouse_id: parent.warehouse_id || warehouses[0]?.id || "",
      product_code: "",
      part_number: "Pilih Item",
      product_name: "",
      qty: 1.00,
      unit: "PCS",
      price: 0.00,
      scrap_percent: 0.00,
      gross_qty: 1.00,
      notes: "",
      operation_seq: parent.operation_seq + 5,
      expanded: false
    };

    const updated = [...items];
    updated[parentIndex].expanded = true;
    updated.splice(parentIndex + 1, 0, newItem);
    setItems(updated);
  };

  const handleDeleteComponent = (index: number) => {
    const itemToDelete = items[index];
    if (!itemToDelete) return;

    const idsToDelete = new Set<string>();
    const collect = (pTempId: string) => {
      idsToDelete.add(pTempId);
      items.filter(i => i.parent_temp_id === pTempId).forEach(c => {
        if (c.temp_id) collect(c.temp_id);
      });
    };

    if (itemToDelete.temp_id) {
      collect(itemToDelete.temp_id);
    }

    setItems(prev => prev.filter(i => !i.temp_id || !idsToDelete.has(i.temp_id)));
  };

  const handleToggleExpand = (index: number) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], expanded: !updated[index].expanded };
      return updated;
    });
  };

  // ─── Helper: Auto-detect Item Type from Master Data Product Type ────────────
  const detectComponentItemType = (product: any): string => {
    if (product?.product_type) {
      return product.product_type;
    }
    const name = String(product?.product_name || "").toUpperCase();
    const code = String(product?.product_code || "").toUpperCase();
    const category = String(product?.category_name || product?.category?.category_name || "").toUpperCase();

    const combined = `${name} ${code} ${category}`;

    if (
      combined.includes("PACKAGING") ||
      combined.includes("BOX") ||
      combined.includes("KARDUS") ||
      combined.includes("CARTON") ||
      combined.includes("PLASTIK") ||
      combined.includes("POLYFOAM")
    ) {
      return "Packaging";
    }

    if (combined.includes("STICKER") || combined.includes("LABEL")) {
      return "Sticker";
    }

    if (
      combined.includes("WIP") ||
      combined.includes("SUB ASSY") ||
      combined.includes("SUB-ASSY") ||
      combined.includes("SUBASSY") ||
      combined.includes("WORK IN PROGRESS") ||
      combined.includes("SEMI") ||
      combined.includes("HOLDER MIRROR") ||
      combined.includes("BAR SEAT") ||
      combined.includes("STAY")
    ) {
      return "Work in Progress";
    }

    if (
      combined.includes("CONSUMABLE") ||
      combined.includes("RELEASE") ||
      combined.includes("CHEMICAL") ||
      combined.includes("OIL") ||
      combined.includes("PELUMAS") ||
      combined.includes("GREASE") ||
      combined.includes("NUT") ||
      combined.includes("BOLT") ||
      combined.includes("SCREW") ||
      combined.includes("WASHER")
    ) {
      return "Consumable";
    }

    if (combined.includes("CRUSHER")) {
      return "Crusher";
    }

    if (combined.includes("COMPONENT") || combined.includes("PARTS")) {
      return "Component";
    }

    return "Raw Material";
  };

  // ─── Helper: Get Parent Product Name (Stripping Multi-Vendor Suffix) ────────
  const getParentProductName = (name?: string) => {
    if (!name) return "";
    return name.replace(/\s*\([^)]+\)\s*$/, '').trim();
  };

  // ─── Product Selection Dialog ──────────────────────────────────────────────
  const handleOpenProductModal = (target: { type: "component" | "fg"; index?: number }) => {
    setProductModalTarget(target);
    setIsProductModalOpen(true);
    setProductSearch("");
    fetchProductsList("");
  };

  const fetchProductsList = async (search: string) => {
    setProductLoading(true);
    try {
      const res = await api.express.get("/products", {
        params: { search, limit: 50 }
      });
      setProductList(res.data.data || []);
    } catch (err) {
      console.error("Error fetching product list:", err);
    } finally {
      setProductLoading(false);
    }
  };

  const handleSelectProduct = (product: any) => {
    if (!productModalTarget) return;

    const parentName = getParentProductName(product.product_name);

    if (productModalTarget.type === "fg") {
      setHeader(prev => ({
        ...prev,
        finished_good_code: product.product_code || "",
        finished_good_name: parentName,
        finished_good_unit: product.product_unit || "Set",
        finished_good_type: mapProductTypeToFGCode(product.product_type)
      }));
    } else if (productModalTarget.type === "component" && productModalTarget.index !== undefined) {
      const idx = productModalTarget.index;
      setItems(prev => {
        const updated = [...prev];
        const netQty = updated[idx].qty || 1;
        const detectedType = detectComponentItemType(product);

        updated[idx] = {
          ...updated[idx],
          product_code: product.product_code || "",
          part_number: product.product_code || "Pilih Item",
          product_name: parentName,
          unit: product.product_unit || "PCS",
          price: Number(product.purchase_price || product.product_price || 0),
          scrap_percent: 0,
          gross_qty: netQty,
          item_type: detectedType
        };
        return updated;
      });
    }

    setIsProductModalOpen(false);
    setProductModalTarget(null);
  };

  // ─── Form Submission Handler ───────────────────────────────────────────────
  const handleSaveBOM = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!header.bom_code) {
      alert("Kode BOM harus diisi!");
      return;
    }
    if (!header.bom_name) {
      alert("Nama BOM harus diisi!");
      return;
    }
    if (!header.finished_good_code) {
      alert("Produk Hasil Jadi (Finished Good) harus dipilih!");
      return;
    }
    if (items.length === 0) {
      alert("BOM harus memiliki setidaknya 1 komponen!");
      return;
    }

    const payload = {
      ...header,
      items: items.map(item => ({
        ...item,
        qty: Number(item.qty || 0),
        scrap_percent: Number(item.scrap_percent || 0),
        gross_qty: Number(item.qty || 0) * (1 + (Number(item.scrap_percent || 0) / 100)),
        price: Number(item.price || 0),
        operation_seq: Number(item.operation_seq || 10)
      }))
    };

    try {
      if (editId) {
        await api.express.put(`/manufacturing/boms/${editId}`, payload);
        alert("Formula BOM berhasil diperbarui!");
      } else {
        await api.express.post("/manufacturing/boms", payload);
        alert("Formula BOM baru berhasil disimpan!");
      }

      setView("list");
      fetchBOMs();
    } catch (err: any) {
      console.error("Error saving BOM:", err);
      alert(err.response?.data?.message || err.message || "Gagal menyimpan BOM");
    }
  };

  // ─── Tree Explosion & Detail Modal Handler ─────────────────────────────────
  const handleOpenExplosionModal = async (bomId: number) => {
    setDetailLoading(true);
    setIsExplosionModalOpen(true);
    try {
      const res = await api.express.get(`/manufacturing/boms/${bomId}`);
      setSelectedBomDetail(res.data.data);
      setSelectedBomItems(res.data.items || []);
    } catch (err) {
      console.error("Error fetching BOM detail:", err);
      alert("Gagal memuat detail BOM.");
    } finally {
      setDetailLoading(false);
    }
  };

  // ─── Edit / Load BOM Handler ───────────────────────────────────────────────
  const handleEditBOM = async (id: number) => {
    setLoading(true);
    try {
      const res = await api.express.get(`/manufacturing/boms/${id}`);
      const bomData = res.data.data;
      const bomItems = res.data.items || [];

      setHeader({
        bom_code: bomData.bom_code || "",
        bom_name: bomData.bom_name || "",
        description: bomData.description || "",
        username: bomData.username || "",
        status: bomData.status === "Aktif" ? "Aktif" : "Non-Aktif",
        target_warehouse_id: bomData.target_warehouse_id || "",
        finished_good_code: bomData.finished_good_code || "",
        finished_good_name: bomData.finished_good_name || "",
        finished_good_unit: bomData.finished_good_unit || "Set",
        finished_good_qty: Number(bomData.finished_good_qty || 1.00),
        is_dismantling: bomData.is_dismantling === 1,
        finished_good_type: mapProductTypeToFGCode(bomData.finished_good_type),
        bom_type: bomData.bom_type || "Manufacturing",
        version_revision: bomData.version_revision || "Rev 1.0",
        routing_work_center: bomData.routing_work_center || "Main Assembly Line",
        labor_cost: Number(bomData.labor_cost || 0),
        overhead_cost: Number(bomData.overhead_cost || 0)
      });

      const idToTempMap: Record<number, string> = {};
      bomItems.forEach((item: any) => {
        idToTempMap[item.id] = `temp-loaded-${item.id}`;
      });

      const processedItems: BOMItem[] = bomItems.map((item: any) => {
        const netQty = Number(item.qty || 0);
        const scrap = Number(item.scrap_percent || 0);
        const grossQty = Number(item.gross_qty || (netQty * (1 + (scrap / 100))));

        return {
          id: item.id,
          temp_id: idToTempMap[item.id],
          parent_temp_id: item.parent_item_id ? idToTempMap[item.parent_item_id] : null,
          parent_item_id: item.parent_item_id,
          item_type: item.item_type || "RAW",
          warehouse_id: item.warehouse_id || "",
          product_code: item.product_code || "",
          part_number: item.part_number || "Pilih Item",
          product_name: item.product_name || "",
          qty: netQty,
          unit: item.unit || "PCS",
          price: Number(item.price || 0),
          scrap_percent: scrap,
          gross_qty: grossQty,
          notes: item.notes || "",
          operation_seq: Number(item.operation_seq || 10),
          expanded: true
        };
      });

      const sortTree = (flatList: BOMItem[]): BOMItem[] => {
        const sorted: BOMItem[] = [];
        const addChildren = (parentTempId: string | null) => {
          const children = flatList.filter(item => item.parent_temp_id === parentTempId);
          children.forEach(child => {
            sorted.push(child);
            if (child.temp_id) {
              addChildren(child.temp_id);
            }
          });
        };
        addChildren(null);
        return sorted;
      };

      const sortedItems = sortTree(processedItems);
      setItems(sortedItems);
      setEditId(id);
      setView("form");
    } catch (err) {
      console.error("Error loading BOM details for edit:", err);
      alert("Gagal memuat detail BOM.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Duplicate BOM Handler ──────────────────────────────────────────────────
  const handleDuplicateBOM = async (id: number) => {
    setLoading(true);
    try {
      const res = await api.express.get(`/manufacturing/boms/${id}`);
      const bomData = res.data.data;
      const bomItems = res.data.items || [];

      setHeader({
        bom_code: bomData.bom_code ? `${bomData.bom_code}-COPY` : "",
        bom_name: bomData.bom_name ? `${bomData.bom_name} (Copy)` : "",
        description: bomData.description || "",
        username: bomData.username || "",
        status: "Aktif",
        target_warehouse_id: bomData.target_warehouse_id || "",
        finished_good_code: bomData.finished_good_code || "",
        finished_good_name: bomData.finished_good_name || "",
        finished_good_unit: bomData.finished_good_unit || "Set",
        finished_good_qty: Number(bomData.finished_good_qty || 1.00),
        is_dismantling: bomData.is_dismantling === 1,
        finished_good_type: mapProductTypeToFGCode(bomData.finished_good_type),
        bom_type: bomData.bom_type || "Manufacturing",
        version_revision: bomData.version_revision ? `${bomData.version_revision} Copy` : "Rev 1.0",
        routing_work_center: bomData.routing_work_center || "Main Assembly Line",
        labor_cost: Number(bomData.labor_cost || 0),
        overhead_cost: Number(bomData.overhead_cost || 0)
      });

      const idToTempMap: Record<number, string> = {};
      bomItems.forEach((item: any) => {
        idToTempMap[item.id] = `temp-loaded-${item.id}`;
      });

      const processedItems: BOMItem[] = bomItems.map((item: any) => {
        const netQty = Number(item.qty || 0);
        const scrap = Number(item.scrap_percent || 0);

        return {
          temp_id: idToTempMap[item.id],
          parent_temp_id: item.parent_item_id ? idToTempMap[item.parent_item_id] : null,
          parent_item_id: null,
          item_type: item.item_type || "RAW",
          warehouse_id: item.warehouse_id || "",
          product_code: item.product_code || "",
          part_number: item.part_number || "Pilih Item",
          product_name: item.product_name || "",
          qty: netQty,
          unit: item.unit || "PCS",
          price: Number(item.price || 0),
          scrap_percent: scrap,
          gross_qty: netQty * (1 + (scrap / 100)),
          notes: item.notes || "",
          operation_seq: Number(item.operation_seq || 10),
          expanded: true
        };
      });

      const sortTree = (flatList: BOMItem[]): BOMItem[] => {
        const sorted: BOMItem[] = [];
        const addChildren = (parentTempId: string | null) => {
          const children = flatList.filter(item => item.parent_temp_id === parentTempId);
          children.forEach(child => {
            sorted.push(child);
            if (child.temp_id) {
              addChildren(child.temp_id);
            }
          });
        };
        addChildren(null);
        return sorted;
      };

      const sortedItems = sortTree(processedItems);
      setItems(sortedItems);
      setEditId(null);
      setView("form");
    } catch (err) {
      console.error("Error duplicating BOM:", err);
      alert("Gagal menduplikat BOM.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Delete BOM Handler ────────────────────────────────────────────────────
  const handleDeleteBOM = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus BOM ini? Tindakan ini bersifat permanen.")) {
      return;
    }

    try {
      await api.express.delete(`/manufacturing/boms/${id}`);
      alert("BOM berhasil dihapus!");
      fetchBOMs();
    } catch (err: any) {
      console.error("Error deleting BOM:", err);
      alert(err.message || "Gagal menghapus BOM");
    }
  };

  // Calculate live total cost rollup in Form view
  const calculateLiveFormCost = () => {
    let matCostSum = 0;
    const parentMap = new Map<string, BOMItem>();
    items.forEach(i => {
      if (i.temp_id) parentMap.set(i.temp_id, i);
    });

    items.forEach(i => {
      const netQty = Number(i.qty) || 0;
      const scrap = Number(i.scrap_percent) || 0;
      const grossQty = netQty * (1 + (scrap / 100));
      let price = Number(i.price) || 0;

      // If child item has parent and parent already has a price > 0, child price is excluded to prevent double counting
      if (i.parent_temp_id) {
        const parent = parentMap.get(i.parent_temp_id);
        if (parent && Number(parent.price) > 0) {
          price = 0;
        }
      }

      matCostSum += (grossQty * price);
    });
    const labor = Number(header.labor_cost) || 0;
    const overhead = Number(header.overhead_cost) || 0;
    return {
      materialCost: matCostSum,
      laborCost: labor,
      overheadCost: overhead,
      totalCost: matCostSum + labor + overhead
    };
  };

  // ─── Main Render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Header with Breadcrumbs & Action Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl shadow-lg shadow-emerald-200">
              <ClipboardList className="text-white animate-pulse" size={26} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900">
                Bill of <span className="text-emerald-600">Materials (BOM)</span>
              </h1>
              <p className="text-gray-500 text-xs font-semibold mt-0.5">
                Master formula BOM multi-level, penyusunan HPP perakitan, dan routing work center manufaktur.
              </p>
            </div>
          </div>
        </div>

        {view === "list" ? (
          <div className="flex items-center gap-3">
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
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-4 rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95 cursor-pointer"
              title="Download Excel terintegrasi (7 Tab: Vendor, Customer, Product, BOM, Forecast, PO Customer, MRP)"
            >
              <FileSpreadsheet size={18} />
              <span>Export Excel (Relasi & Rumus)</span>
            </button>
            <button
              onClick={() => {
                setEditId(null);
                setHeader({
                  bom_code: "",
                  bom_name: "",
                  description: "",
                  username: "Admin",
                  status: "Aktif",
                  target_warehouse_id: "",
                  finished_good_code: "",
                  finished_good_name: "",
                  finished_good_unit: "Set",
                  finished_good_qty: 1.00,
                  is_dismantling: false,
                  finished_good_type: "",
                  bom_type: "Manufacturing",
                  version_revision: "Rev 1.0",
                  routing_work_center: "Main Assembly Line",
                  labor_cost: 0,
                  overhead_cost: 0
                });
                setItems([]);
                setView("form");
              }}
              className="group relative flex items-center gap-3 bg-gray-950 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-100 active:scale-95 overflow-hidden"
            >
              <Plus size={20} strokeWidth={3} />
              <span>Buat Formula BOM Baru</span>
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

      {/* 2. Top Summary KPI Cards */}
      {view === "list" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Layers size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Active BOMs</p>
              <h4 className="text-xl font-black text-gray-900 mt-0.5">{totalBoms} Formula</h4>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Factory size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Work Centers</p>
              <h4 className="text-xl font-black text-gray-900 mt-0.5">Assembly Lines</h4>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <Cog size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipe Formula</p>
              <h4 className="text-xl font-black text-gray-900 mt-0.5">Manufacturing & Kit</h4>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <DollarSign size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cost Rollup Engine</p>
              <h4 className="text-xl font-black text-gray-900 mt-0.5">Multi-Level HPP</h4>
            </div>
          </div>
        </div>
      )}

      {/* ─── A. LISTING VIEW SCREEN ────────────────────────────────────────── */}
      {view === "list" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-32">
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-4 bg-white rounded-[2rem] border border-gray-100 shadow-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-gray-700 appearance-none text-center h-full cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex-1">
              <FilterBar
                searchPlaceholder="Cari Kode BOM, Nama Formula, atau Produk Jadi..."
                searchValue={searchQuery}
                onSearchChange={(value) => {
                  setSearchQuery(value);
                  setCurrentPage(1);
                }}
                onFilterClick={() => setIsFilterModalOpen(true)}
                filterBadgeCount={
                  (sortBy !== "newest" ? 1 : 0) + 
                  (filterStatus !== "all" ? 1 : 0) + 
                  (filterType !== "all" ? 1 : 0)
                }
              />
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white">
                  <tr className="border-b border-gray-100">
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kode BOM & Rev</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipe & Work Center</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Produk Hasil Jadi (FG)</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Est. HPP / Unit</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Komponen</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={7} className="px-6 py-5"><div className="h-10 bg-gray-50 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : boms.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-24 text-center font-bold text-gray-400 uppercase tracking-widest text-sm bg-gray-50/20">
                        Tidak Ada Daftar Record BOM
                      </td>
                    </tr>
                  ) : boms.map((bom) => (
                    <tr key={bom.id} className="hover:bg-emerald-50/30 transition-colors group">
                      <td className="px-6 py-4.5">
                        <div className="flex flex-col">
                          <span 
                            onClick={() => handleOpenExplosionModal(bom.id)}
                            className="font-black text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer text-sm"
                          >
                            {bom.bom_code}
                          </span>
                          <span className="text-[11px] font-bold text-gray-400 mt-0.5">
                            {bom.version_revision || "Rev 1.0"} &bull; {bom.bom_name}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4.5">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center w-fit px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-100">
                            {bom.bom_type || "Manufacturing"}
                          </span>
                          <span className="text-[11px] font-bold text-gray-500">
                            {bom.routing_work_center || "Main Line"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4.5">
                        <div className="flex flex-col">
                          <span className="font-black text-gray-800 text-xs">
                            {bom.finished_good_name || bom.bom_name}
                          </span>
                          <span className="text-[11px] font-bold text-gray-400 font-mono">
                            {bom.finished_good_code || "-"} ({bom.finished_good_qty || 1} {bom.finished_good_unit || "Set"})
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4.5 text-right font-black text-emerald-700 text-sm">
                        Rp {Number(bom.total_cost || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                      </td>

                      <td className="px-6 py-4.5 text-center">
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 font-black rounded-full text-xs">
                          {bom.item_count || 0} Items
                        </span>
                      </td>

                      <td className="px-6 py-4.5 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          {bom.status === "Aktif" ? (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-black text-xs rounded-full border border-emerald-100">
                              Aktif
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-gray-100 text-gray-500 font-black text-xs rounded-full border border-gray-200">
                              Non-Aktif
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Print Button */}
                          <PrintButton
                            moduleKey="bom"
                            moduleName="Bill of Materials"
                            data={bom}
                          />

                          {/* View Button */}
                          <button
                            onClick={() => handleOpenExplosionModal(bom.id)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
                            title="Lihat Tree Explosion & HPP Rollup"
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>

                          {/* Copy Button */}
                          <button
                            onClick={() => handleDuplicateBOM(bom.id)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
                            title="Duplikat Formula BOM"
                          >
                            <Copy size={12} />
                            <span>Copy</span>
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleEditBOM(bom.id)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
                            title="Edit Formula BOM"
                          >
                            <Edit size={12} />
                            <span>Edit</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteBOM(bom.id)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
                            title="Hapus BOM"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={currentPage}
              totalPages={Math.ceil(totalBoms / itemsPerPage)}
              totalItems={totalBoms}
              onPageChange={setCurrentPage}
              pageSize={itemsPerPage}
              onPageSizeChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* ─── B. CREATE / EDIT FORM SCREEN ──────────────────────────────────── */}
      {view === "form" && (
        <form onSubmit={handleSaveBOM} className="space-y-6 animate-in slide-in-from-bottom duration-300">
          
          {/* TOP SECTION: Header & Finished Good Parent */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
            <div className="border-b border-gray-100 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-emerald-600" />
                <h3 className="font-black text-gray-800 uppercase tracking-widest text-sm">Informasi Header & Produk Hasil Jadi (Parent)</h3>
              </div>
              <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100">
                Enterprise ERP Standard
              </span>
            </div>

            {/* Finished Good Parent Selection */}
            <div className="p-5 bg-emerald-50/40 rounded-2xl border border-emerald-100 space-y-4">
              <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block">
                Produk Hasil Jadi (Finished Good)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Pilih Produk Hasil (Finished Good) *</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={header.finished_good_name}
                      readOnly
                      placeholder="Klik tombol cari produk..."
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none cursor-pointer text-gray-900"
                      onClick={() => handleOpenProductModal({ type: "fg" })}
                    />
                    <button
                      type="button"
                      onClick={() => handleOpenProductModal({ type: "fg" })}
                      className="px-5 py-3 bg-gray-950 hover:bg-emerald-600 text-white rounded-xl font-black text-xs transition-all shrink-0 shadow-sm"
                    >
                      Cari
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Kode Produk</label>
                  <input
                    type="text"
                    value={header.finished_good_code}
                    readOnly
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-xs font-mono font-bold outline-none text-gray-800"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Satuan</label>
                  <input
                    type="text"
                    value={header.finished_good_unit}
                    onChange={(e) => setHeader(prev => ({ ...prev, finished_good_unit: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Target Gudang Penyimpanan Hasil</label>
                  <select
                    value={header.target_warehouse_id}
                    onChange={(e) => setHeader(prev => ({ ...prev, target_warehouse_id: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none cursor-pointer text-gray-900"
                  >
                    <option value="">Pilih Gudang Target...</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* BOM Header Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kode BOM</label>
                <div className="relative">
                  <input
                    type="text"
                    value={header.bom_code}
                    onChange={(e) => setHeader(prev => ({ ...prev, bom_code: e.target.value }))}
                    placeholder="Contoh: BOM-21/ASKI/019 REV"
                    required
                    className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateBOMCode}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-200 text-emerald-600 rounded-lg transition-colors"
                    title="Generate Kode BOM"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Formula BOM</label>
                <input
                  type="text"
                  value={header.bom_name}
                  onChange={(e) => setHeader(prev => ({ ...prev, bom_name: e.target.value }))}
                  placeholder="Nama deskriptif BOM..."
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none text-gray-900"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Versi / Revisi</label>
                <input
                  type="text"
                  value={header.version_revision}
                  onChange={(e) => setHeader(prev => ({ ...prev, version_revision: e.target.value }))}
                  placeholder="Rev 1.0"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipe Formula BOM</label>
                <select
                  value={header.bom_type}
                  onChange={(e) => setHeader(prev => ({ ...prev, bom_type: e.target.value as any }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none cursor-pointer text-gray-900"
                >
                  <option value="Manufacturing">Manufacturing BOM</option>
                  <option value="Kit / Dismantling">Kit / Dismantling BOM</option>
                  <option value="Engineering">Engineering BOM (E-BOM)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Work Center / Routing Line</label>
                <input
                  type="text"
                  value={header.routing_work_center}
                  onChange={(e) => setHeader(prev => ({ ...prev, routing_work_center: e.target.value }))}
                  placeholder="Line Injection 01 / Main Line"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none text-gray-900"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Planner / User</label>
                <select
                  value={header.username}
                  onChange={(e) => setHeader(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none cursor-pointer text-gray-900"
                >
                  <option value="Admin">Admin</option>
                  {users.map(u => (
                    <option key={u.id} value={u.username || u.name}>{u.name || u.username}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Biaya Tenaga Kerja / Labor (Rp/Unit)</label>
                <input
                  type="number"
                  step="100"
                  value={header.labor_cost}
                  onChange={(e) => setHeader(prev => ({ ...prev, labor_cost: Number(e.target.value) || 0 }))}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs font-black text-emerald-800 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Biaya Overhead Pabrik (Rp/Unit)</label>
                <input
                  type="number"
                  step="100"
                  value={header.overhead_cost}
                  onChange={(e) => setHeader(prev => ({ ...prev, overhead_cost: Number(e.target.value) || 0 }))}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-purple-50/50 border border-purple-200 rounded-xl text-xs font-black text-purple-800 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 border-t border-gray-100 pt-4">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status BOM:</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-gray-700">
                  <input
                    type="radio"
                    name="status"
                    checked={header.status === "Aktif"}
                    onChange={() => setHeader(prev => ({ ...prev, status: "Aktif" }))}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                  <span>Aktif</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-gray-700">
                  <input
                    type="radio"
                    name="status"
                    checked={header.status === "Non-Aktif"}
                    onChange={() => setHeader(prev => ({ ...prev, status: "Non-Aktif" }))}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                  <span>Non-Aktif</span>
                </label>
              </div>
            </div>
          </div>

          {/* MIDDLE SECTION: Component & Material Rollup Table (Full Width 100%) */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-emerald-600" />
                <h3 className="font-black text-gray-800 uppercase tracking-widest text-sm">Komponen & Material HPP Rollup</h3>
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-3.5 py-1 rounded-full">
                Support Multi-Level Sub-Assemblies
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-3.5 py-3.5 text-[10px] font-black text-gray-500 uppercase tracking-widest w-48">Tipe Item</th>
                    <th className="px-3.5 py-3.5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Pilih Komponen Material</th>
                    <th className="px-3.5 py-3.5 text-[10px] font-black text-gray-500 uppercase tracking-widest w-32 text-center">Net Qty</th>
                    <th className="px-3.5 py-3.5 text-[10px] font-black text-gray-500 uppercase tracking-widest w-20 text-center">Satuan</th>
                    <th className="px-3.5 py-3.5 text-[10px] font-black text-gray-500 uppercase tracking-widest w-36 text-right">Harga (Rp)</th>
                    <th className="px-3.5 py-3.5 text-[10px] font-black text-gray-500 uppercase tracking-widest w-36 text-right">Subtotal Est.</th>
                    <th className="px-3.5 py-3.5 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, idx) => {
                    const depth = getRowDepth(item);
                    const isVisible = isRowVisible(item);
                    if (!isVisible) return null;

                    const hasChildren = items.some(child => child.parent_temp_id === item.temp_id);
                    const netQty = Number(item.qty) || 0;
                    const price = Number(item.price) || 0;
                    const lineSubtotal = netQty * price;

                    return (
                      <tr key={item.temp_id || idx} className="hover:bg-emerald-50/20 transition-colors group">
                        <td className="px-3.5 py-3">
                          <select
                            value={item.item_type}
                            onChange={(e) => {
                              const val = e.target.value as any;
                              setItems(prev => {
                                const updated = [...prev];
                                updated[idx].item_type = val;
                                return updated;
                              });
                            }}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none cursor-pointer focus:border-emerald-500"
                          >
                            <option value="Component">Component (Suku Cadang)</option>
                            <option value="Work in Progress">WIP (Sub-Assy)</option>
                            <option value="WIP">WIP (Sub-Assy)</option>
                            <option value="Raw Material">Raw Material (Bahan)</option>
                            <option value="RAW">RAW (Bahan)</option>
                            <option value="Packaging">Packaging (Kemasan)</option>
                            <option value="PACKAGING">Packaging (Kemasan)</option>
                            <option value="Consumable">Consumable (Pembantu)</option>
                            <option value="CONSUMABLE">Consumable (Pembantu)</option>
                            <option value="Sticker">Sticker / Label</option>
                            <option value="Crusher">Crusher</option>
                          </select>
                        </td>

                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-1.5" style={{ paddingLeft: `${(depth - 2) * 28}px` }}>
                            {/* Fixed Width Slot for Expand/Collapse Chevron */}
                            <div className="w-5 flex justify-center shrink-0">
                              {hasChildren ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleExpand(idx)}
                                  className="p-0.5 text-gray-400 hover:text-emerald-600 transition-colors"
                                >
                                  {item.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                              ) : null}
                            </div>

                            {/* Fixed Width Slot for Sub-Level Corner Arrow (depth > 2) */}
                            <div className="w-5 flex justify-center shrink-0">
                              {depth > 2 ? (
                                <CornerDownRight size={14} className="text-emerald-500" />
                              ) : null}
                            </div>

                            <div className="flex-1 flex items-center justify-between bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl gap-2 min-w-0">
                              <span className="text-xs font-bold text-gray-900 break-words font-sans" title={item.product_name}>
                                {item.product_name || "Pilih Komponen Material..."}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenProductModal({ type: "component", index: idx })}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shrink-0 shadow-xs"
                              >
                                Cari
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="px-3.5 py-3 text-center">
                          <input
                            type="number"
                            step="0.0001"
                            min="0"
                            value={item.qty}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setItems(prev => {
                                const updated = [...prev];
                                updated[idx].qty = val;
                                updated[idx].gross_qty = val;
                                return updated;
                              });
                            }}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 text-center outline-none focus:border-emerald-500"
                          />
                        </td>

                        <td className="px-3.5 py-3 text-center text-xs font-bold text-gray-700">
                          {item.unit || "PCS"}
                        </td>

                        <td className="px-3.5 py-3 text-right">
                          <input
                            type="number"
                            step="10"
                            value={item.price}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setItems(prev => {
                                const updated = [...prev];
                                updated[idx].price = val;
                                return updated;
                              });
                            }}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 text-right outline-none focus:border-emerald-500"
                          />
                        </td>

                        <td className="px-3.5 py-3 text-right font-black text-xs text-emerald-700 whitespace-nowrap">
                          Rp {lineSubtotal.toLocaleString("id-ID", { minimumFractionDigits: 0 })}
                        </td>

                        <td className="px-3.5 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAddSubComponent(idx)}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-lg transition-all border border-emerald-100"
                              title="Tambah Sub-Komponent Layer (L3)"
                            >
                              <PlusSquare size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteComponent(idx)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg transition-all border border-rose-100"
                              title="Hapus Baris Item"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleAddComponent2}
                className="flex items-center gap-2 px-5 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-2xl font-black text-xs transition-all border border-emerald-100 shadow-sm"
              >
                <Plus size={16} strokeWidth={3} />
                <span>Tambah Baris Komponent Baru</span>
              </button>
            </div>
          </div>

          {/* BOTTOM SECTION: Live HPP Cost Rollup Engine Card & Save Action Button */}
          {(() => {
            const liveCost = calculateLiveFormCost();
            return (
              <div className="bg-gradient-to-br from-gray-900 via-gray-950 to-emerald-950 text-white rounded-3xl p-6 shadow-xl space-y-6 border border-gray-800">
                <div className="border-b border-gray-800 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <DollarSign size={20} className="text-emerald-400" />
                    <h4 className="font-black text-sm uppercase tracking-widest text-emerald-400">Live HPP Cost Rollup Engine</h4>
                  </div>
                  <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
                    Auto Recalculated Realtime
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs bg-gray-900/60 p-4 rounded-2xl border border-gray-800">
                  <div className="flex flex-col gap-1 p-2">
                    <span className="text-gray-400 font-medium">Biaya Raw Material:</span>
                    <span className="font-black text-gray-100 text-sm">Rp {liveCost.materialCost.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex flex-col gap-1 p-2">
                    <span className="text-gray-400 font-medium">Biaya Labor (Tenaga Kerja):</span>
                    <span className="font-black text-emerald-300 text-sm">Rp {liveCost.laborCost.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex flex-col gap-1 p-2">
                    <span className="text-gray-400 font-medium">Biaya Overhead Pabrik:</span>
                    <span className="font-black text-purple-300 text-sm">Rp {liveCost.overheadCost.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex flex-col gap-1 p-2 bg-emerald-950/40 rounded-xl border border-emerald-500/30">
                    <span className="text-emerald-300 font-bold uppercase tracking-wider text-[10px]">Grand Total Est. HPP:</span>
                    <span className="text-lg font-black text-emerald-400">Rp {liveCost.totalCost.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className="px-6 py-4 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs rounded-2xl transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-gray-950 font-black text-sm rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Check size={18} strokeWidth={3} />
                    <span>Simpan Formula BOM</span>
                  </button>
                </div>
              </div>
            );
          })()}

        </form>
      )}

      {/* ─── C. PRODUCT LOOKUP MODAL ────────────────────────────────────────── */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-black text-gray-800 uppercase tracking-widest text-xs">Pilih Master Data Produk</h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  fetchProductsList(e.target.value);
                }}
                placeholder="Ketik nama atau kode produk untuk mencari..."
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
              />
            </div>

            <div className="max-h-[350px] overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-2xl">
              {productLoading ? (
                <div className="p-8 text-center text-xs font-bold text-gray-400">Memuat data produk...</div>
              ) : productList.length === 0 ? (
                <div className="p-8 text-center text-xs font-bold text-gray-400">Tidak ada produk ditemukan.</div>
              ) : (
                productList.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    className="p-4 hover:bg-emerald-50/40 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <h5 className="font-black text-xs text-gray-800">{p.product_name}</h5>
                      <span className="text-[11px] font-bold text-gray-400 font-mono">{p.product_code} &bull; {p.product_type}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-700">Rp {Number(p.purchase_price || p.product_price || 0).toLocaleString("id-ID")}</span>
                      <span className="block text-[10px] font-bold text-gray-400">{p.product_unit || "PCS"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── D. TREE EXPLOSION DETAIL MODAL ─────────────────────────────────── */}
      {isExplosionModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 space-y-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">
                  Tree Explosion & Cost Rollup Detail
                </span>
                <h2 className="text-xl font-black text-gray-900 mt-1">
                  {selectedBomDetail?.bom_name} ({selectedBomDetail?.bom_code})
                </h2>
              </div>
              <button
                onClick={() => setIsExplosionModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-12 text-center text-xs font-bold text-gray-400">Memuat rincian eksplosional BOM...</div>
            ) : (
              <div className="space-y-6">
                
                {/* Header Information Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 text-xs">
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Produk Hasil (FG)</span>
                    <span className="font-black text-gray-800">{selectedBomDetail?.finished_good_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Work Center Line</span>
                    <span className="font-black text-gray-800">{selectedBomDetail?.routing_work_center || "Main Line"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Versi Revision</span>
                    <span className="font-black text-gray-800">{selectedBomDetail?.version_revision || "Rev 1.0"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Target Gudang</span>
                    <span className="font-black text-gray-800">{selectedBomDetail?.target_warehouse_name || "Gudang Material"}</span>
                  </div>
                </div>

                {/* Tree View Table */}
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 font-black text-gray-400 uppercase">Level & Komponen Material</th>
                        <th className="px-4 py-3 font-black text-gray-400 uppercase text-center">Net Qty</th>
                        <th className="px-4 py-3 font-black text-gray-400 uppercase text-right">Harga Unit</th>
                        <th className="px-4 py-3 font-black text-gray-400 uppercase text-right">Subtotal Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(() => {
                        const getModalItemDepth = (targetItem: any): number => {
                          let depth = 0;
                          let current = targetItem;
                          while (current && current.parent_item_id) {
                            depth++;
                            current = selectedBomItems.find(i => i.id === current.parent_item_id);
                          }
                          return depth;
                        };

                        return selectedBomItems.map((item, idx) => {
                          const netQty = Number(item.qty || 0);
                          const price = Number(item.price || 0);
                          const lineTotal = netQty * price;
                          const depth = getModalItemDepth(item);

                          return (
                            <tr key={idx} className="hover:bg-emerald-50/20">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 24}px` }}>
                                  {depth > 0 && <CornerDownRight size={14} className="text-emerald-500 shrink-0" />}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-black text-gray-800">{item.product_name}</span>
                                      <span className="text-[9px] font-black bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                                        L{depth + 2}
                                      </span>
                                    </div>
                                    <span className="block text-[10px] text-gray-400 font-mono">{item.product_code} ({item.item_type})</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center font-bold">{netQty.toFixed(4)} {item.unit}</td>
                              <td className="px-4 py-3 text-right font-semibold">Rp {price.toLocaleString("id-ID")}</td>
                              <td className="px-4 py-3 text-right font-black text-emerald-700">Rp {lineTotal.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* HPP Summary Rollup Footer */}
                <div className="bg-gray-900 text-white rounded-2xl p-5 space-y-3">
                  <div className="flex justify-between items-center text-xs text-gray-300">
                    <span>Biaya Tenaga Kerja (Labor):</span>
                    <span className="font-bold">Rp {Number(selectedBomDetail?.labor_cost || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-300">
                    <span>Biaya Overhead Pabrik:</span>
                    <span className="font-bold">Rp {Number(selectedBomDetail?.overhead_cost || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="border-t border-gray-800 pt-3 flex justify-between items-center text-sm font-black text-white">
                    <span>TOTAL ESTIMASI HPP FORMULA:</span>
                    <span className="text-xl text-emerald-400">
                      Rp {Number(selectedBomDetail?.total_cost || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} / {selectedBomDetail?.finished_good_unit || "Unit"}
                    </span>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
