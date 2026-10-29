"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Wrench,
  Plus,
  Search,
  Calendar,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  Package,
  Layers,
  FileText,
  Trash2,
  FileCheck,
  Send,
  HelpCircle,
  RefreshCw,
  Activity,
  ShieldAlert,
  ShieldCheck,
  Printer,
  Eye,
  Edit
} from "lucide-react";
import api from "@/lib/api";
import PrintButton from "@/components/ui/PrintButton";

interface Product {
  id: number;
  product_code: string;
  product_name: string;
  product_unit?: string;
  product_price?: number;
}

interface Warehouse {
  id: number;
  code: string;
  name: string;
}

interface SalesOrder {
  id: string;
  reference: string;
  no_po_customer?: string;
  customer_name?: string;
}

interface BOM {
  id: number;
  bom_code: string;
  bom_name: string;
  finished_good_code: string;
  finished_good_name: string;
  finished_good_unit: string;
  finished_good_qty: number;
}

interface BOMItem {
  id: string;
  product_id: number | null;
  product_code: string;
  product_name: string;
  unit: string;
  qty_bom: number;
  qty_required: number;
  price: number;
  warehouse_code: string;
  item_type: string;
}

export default function WorkOrderPage() {
  const router = useRouter();
  
  // Dashboard & Listing states
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedWo, setSelectedWo] = useState<any | null>(null);

  // Editor toggle state
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingWoId, setEditingWoId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states (Work Order Header)
  const [selectedSoId, setSelectedSoId] = useState("");
  const [selectedSoRef, setSelectedSoRef] = useState("");
  const [selectedBomId, setSelectedBomId] = useState("");
  const [selectedBomDetail, setSelectedBomDetail] = useState<BOM | null>(null);
  const [woNote, setWoNote] = useState("WO-26/0000000001");
  const [woDate, setWoDate] = useState(new Date().toISOString().split("T")[0]);
  const [woTargetQty, setWoTargetQty] = useState(1);

  // Form states (Tables & Production Output)
  const [woMaterials, setWoMaterials] = useState<BOMItem[]>([]);
  const [additionalMaterials, setAdditionalMaterials] = useState<any[]>([]);
  const [targetWarehouseId, setTargetWarehouseId] = useState("");
  const [allocationWarehouseId, setAllocationWarehouseId] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedTipeBarangJadi, setSelectedTipeBarangJadi] = useState("FG");

  // Material Issuance modal states (existing functionality)
  const [isIssuanceModalOpen, setIsIssuanceModalOpen] = useState(false);
  const [issDate, setIssDate] = useState(new Date().toISOString().split("T")[0]);
  const [issNote, setIssNote] = useState("");
  const [issDetails, setIssDetails] = useState<any[]>([]);
  const [matkomStocks, setMatkomStocks] = useState<any[]>([]);
  const [stocksLoading, setStocksLoading] = useState(false);

  // Master Data Cache
  const [parentProducts, setParentProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [bomsList, setBomsList] = useState<BOM[]>([]);
  const [warehousesList, setWarehousesList] = useState<Warehouse[]>([]);
  const [soList, setSoList] = useState<SalesOrder[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [tipeBarangJadiList, setTipeBarangJadiList] = useState<any[]>([]);
  
  // PrO states
  const [proList, setProList] = useState<any[]>([]);
  const [filteredProList, setFilteredProList] = useState<any[]>([]);
  const [selectedProId, setSelectedProId] = useState("");

  // Real-time stock monitor states
  const [stocksWh1, setStocksWh1] = useState<any[]>([]);
  const [stocksWh2, setStocksWh2] = useState<any[]>([]);
  const [stocksWh3, setStocksWh3] = useState<any[]>([]);
  const [realtimeStocksLoading, setRealtimeStocksLoading] = useState(false);

  // Stepper execution states
  const [activeStep, setActiveStep] = useState(1);
  const [isProcessingStep, setIsProcessingStep] = useState(false);
  const [woActionLoading, setWoActionLoading] = useState(false);

  // WO linked MPPs list (for multi-MPP WO)
  const [woLinkedMpps, setWoLinkedMpps] = useState<any[]>([]);

  // Form step 1: Molding Injection
  const [injQtyOk, setInjQtyOk] = useState(0);
  const [injQtyNg, setInjQtyNg] = useState(0);
  const [injType, setInjType] = useState<"regular" | "insert">("regular");
  const [injCompNgList, setInjCompNgList] = useState<any[]>([]);
  
  // Temporary inputs for single component NG addition
  const [selCompId, setSelCompId] = useState("");
  const [selCompQty, setSelCompQty] = useState(1);

  // Form step 2: Assembly
  const [asyQtyOk, setAsyQtyOk] = useState(0);
  const [asyQtyNg, setAsyQtyNg] = useState(0);

  // Form step 3: Repair
  const [repQtyOk, setRepQtyOk] = useState(0);
  const [repQtyNg, setRepQtyNg] = useState(0);
  
  // Form step 4: FG Receipt
  const [recQty, setRecQty] = useState(0);

  // Production outputs for active WO
  const [productionOutputs, setProductionOutputs] = useState<any[]>([]);

  const loadRealtimeStocks = async () => {
    setRealtimeStocksLoading(true);
    try {
      const [res1, res2, res3] = await Promise.all([
        api.express.get("/stock-opnames/system-stock", { params: { warehouse_id: 1 } }),
        api.express.get("/stock-opnames/system-stock", { params: { warehouse_id: 2 } }),
        api.express.get("/stock-opnames/system-stock", { params: { warehouse_id: 3 } })
      ]);
      setStocksWh1(res1.data.data || []);
      setStocksWh2(res2.data.data || []);
      setStocksWh3(res3.data.data || []);
    } catch (err) {
      console.error("Gagal memuat stok real-time:", err);
    } finally {
      setRealtimeStocksLoading(false);
    }
  };

  const fetchProductionOutputs = async () => {
    try {
      const res = await api.express.get("/manufacturing/production-outputs");
      if (res && res.data && res.data.success) {
        setProductionOutputs(res.data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat production outputs:", err);
    }
  };

  useEffect(() => {
    if (selectedWo) {
      loadRealtimeStocks();
      fetchProductionOutputs();
      
      // Auto prefill forms based on WO target
      const remainingTarget = Math.max(0, Number(selectedWo.target_qty) - Number(selectedWo.qty_produced || 0));
      setInjQtyOk(remainingTarget);
      setAsyQtyOk(remainingTarget);
      setRecQty(remainingTarget);
    }
  }, [selectedWo]);

  const handleMoldingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWo) return;

    let matchedPro = proList.find(p => String(p.wo_id) === String(selectedWo.id));
    if (!matchedPro) {
      matchedPro = proList.find(p => String(p.product_code) === String(selectedWo.product_code));
    }
    if (!matchedPro && selectedWo.parent_product_id) {
      matchedPro = proList.find(p => String(p.product_id) === String(selectedWo.parent_product_id));
    }

    if (!matchedPro) {
      try {
        const createRes = await api.express.post("/manufacturing/planning-produksi", {
          wo_id: selectedWo.id,
          product_id: selectedWo.parent_product_id,
          target_qty: selectedWo.target_qty,
          machine_id: "MC-INJ-150T",
          operator_name: "Operator Production",
          shift: 1,
          shift_hours: 7
        });
        matchedPro = createRes.data.data;
        await fetchPlanningProduksi();
      } catch (e: any) {
        console.error("Auto-create MPP error:", e);
      }
    }

    if (!matchedPro) {
      alert("MPP (PrO) untuk Work Order ini tidak ditemukan di sistem. Harap buat MPP terlebih dahulu.");
      return;
    }

    setIsProcessingStep(true);
    try {
      await api.express.post("/manufacturing/production-outputs", {
        pro_id: Number(matchedPro.id),
        qty_ok: Number(injQtyOk),
        qty_ng: Number(injQtyNg),
        type: injType,
        component_ng_list: injCompNgList.map(c => ({ product_id: Number(c.product_id), qty: Number(c.qty) }))
      });
      alert("Realisasi Injection Molding berhasil dikirim!");
      await loadRealtimeStocks();
      await fetchProductionOutputs();
      await viewWoDetails(selectedWo.id);
      fetchWorkOrders();
      setInjQtyOk(0);
      setInjQtyNg(0);
      setInjCompNgList([]);
    } catch (err: any) {
      alert("Gagal mengirim realisasi Molding: " + err.message);
    } finally {
      setIsProcessingStep(false);
    }
  };

  const handleAssemblySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWo) return;

    let matchedPro = proList.find(p => String(p.wo_id) === String(selectedWo.id));
    if (!matchedPro) {
      matchedPro = proList.find(p => String(p.product_code) === String(selectedWo.product_code));
    }
    if (!matchedPro && selectedWo.parent_product_id) {
      matchedPro = proList.find(p => String(p.product_id) === String(selectedWo.parent_product_id));
    }

    if (!matchedPro) {
      try {
        const createRes = await api.express.post("/manufacturing/planning-produksi", {
          wo_id: selectedWo.id,
          product_id: selectedWo.parent_product_id,
          target_qty: selectedWo.target_qty,
          machine_id: "MC-INJ-150T",
          operator_name: "Operator Production",
          shift: 1,
          shift_hours: 7
        });
        matchedPro = createRes.data.data;
        await fetchPlanningProduksi();
      } catch (e: any) {
        console.error("Auto-create MPP error:", e);
      }
    }

    if (!matchedPro) {
      alert("MPP (PrO) untuk Work Order ini tidak ditemukan.");
      return;
    }

    setIsProcessingStep(true);
    try {
      await api.express.post("/manufacturing/production/assembly", {
        pro_id: Number(matchedPro.id),
        qty_assembled_ok: Number(asyQtyOk),
        qty_assembled_ng: Number(asyQtyNg)
      });
      alert("Realisasi Assembly Line berhasil dikirim!");
      await loadRealtimeStocks();
      await fetchProductionOutputs();
      await viewWoDetails(selectedWo.id);
      fetchWorkOrders();
      setAsyQtyOk(0);
      setAsyQtyNg(0);
    } catch (err: any) {
      alert("Gagal mengirim realisasi Assembly: " + err.message);
    } finally {
      setIsProcessingStep(false);
    }
  };

  const handleRepairSubmit = async (poId: number, e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingStep(true);
    try {
      await api.express.post("/manufacturing/production/repair", {
        production_output_id: poId,
        qty_repaired_ok: Number(repQtyOk),
        qty_repaired_ng: Number(repQtyNg)
      });
      alert("Penyelesaian Repair berhasil dikirim ke QC!");
      await loadRealtimeStocks();
      await fetchProductionOutputs();
      await viewWoDetails(selectedWo.id);
      fetchWorkOrders();
      setRepQtyOk(0);
      setRepQtyNg(0);
    } catch (err: any) {
      alert("Gagal mengirim hasil repair: " + err.message);
    } finally {
      setIsProcessingStep(false);
    }
  };

  const handleFgReceiveSubmit = async (poId: number, qtyToReceive: number, e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingStep(true);
    try {
      await api.express.post(`/manufacturing/production-outputs/${poId}/fg-receive`, {
        qty_received: Number(qtyToReceive)
      });
      alert("Penerimaan Finished Goods berhasil dibukukan!");
      await loadRealtimeStocks();
      await fetchProductionOutputs();
      await viewWoDetails(selectedWo.id);
      fetchWorkOrders();
    } catch (err: any) {
      alert("Gagal membukukan Finished Goods: " + err.message);
    } finally {
      setIsProcessingStep(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
    fetchParentProducts();
    fetchBOMs();
    fetchWarehouses();
    fetchSalesOrders();
    fetchAllProducts();
    fetchDepartments();
    fetchTipeBarangJadi();
    fetchPlanningProduksi();
  }, [search]);

  // Recalculate component requirements when Qty W.O. changes
  useEffect(() => {
    setWoMaterials((prev) =>
      prev.map((item) => ({
        ...item,
        qty_required: item.qty_bom * woTargetQty
      }))
    );
  }, [woTargetQty]);

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/manufacturing/work-orders", {
        params: { search }
      });
      setWorkOrders(res.data.data || []);
    } catch (err) {
      console.error("Error fetching work orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchParentProducts = async () => {
    try {
      const res = await api.express.get("/products", {
        params: { parent_only: "true", limit: 100 }
      });
      setParentProducts(res.data.data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const fetchAllProducts = async () => {
    try {
      const res = await api.express.get("/products", {
        params: { limit: 500 }
      });
      setAllProducts(res.data.data || []);
    } catch (err) {
      console.error("Error fetching all products:", err);
    }
  };

  const fetchBOMs = async () => {
    try {
      const res = await api.express.get("/manufacturing/boms");
      if (res && res.data && res.data.success) {
        setBomsList(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching BOMs:", err);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await api.express.get("/warehouses", { params: { limit: 100 } });
      if (res && res.data && res.data.success) {
        setWarehousesList(res.data.data);
      } else {
        // Fallback mockup
        setWarehousesList([
          { id: 1, code: "MATKOM", name: "Gudang Material Komponen" },
          { id: 2, code: "GPR", name: "Gudang Produksi" },
          { id: 3, code: "FG", name: "Gudang Finished Goods" }
        ]);
      }
    } catch (err) {
      console.error("Error fetching warehouses:", err);
    }
  };

  const fetchSalesOrders = async () => {
    try {
      const res = await api.express.get("/order-sheets").catch(() => null);
      if (res && res.data && res.data.success) {
        setSoList(res.data.data || []);
      } else {
        // Fallback
        setSoList([
          { id: "SO-001", reference: "SO-2026/VI/0001", customer_name: "Astra Honda Motor" },
          { id: "SO-002", reference: "SO-2026/VI/0002", customer_name: "Yamaha Indonesia Motor" }
        ]);
      }
    } catch (err) {
      console.error("Error fetching sales orders:", err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.express.get("/departments").catch(() => null);
      if (res && res.data && res.data.data) {
        setDepartmentsList(res.data.data || []);
      } else {
        // Fallback
        setDepartmentsList([
          { id: 24, department_code: "PROD", department_name: "Production" },
          { id: 17, department_code: "PPIC", department_name: "PPIC" }
        ]);
      }
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  const fetchTipeBarangJadi = async () => {
    try {
      const res = await api.express.get("/tipe-barang-jadi").catch(() => null);
      if (res && res.data && res.data.success) {
        setTipeBarangJadiList(res.data.data || []);
      } else if (res && res.data && res.data.data) {
        setTipeBarangJadiList(res.data.data);
      } else {
        // Fallback
        setTipeBarangJadiList([
          { id: 1, code: "FG", name: "Finished Good" },
          { id: 2, code: "WIP", name: "Work in Progress" },
          { id: 3, code: "SFG", name: "Semi Finished Goods" }
        ]);
      }
    } catch (err) {
      console.error("Error fetching tipe barang jadi:", err);
    }
  };

  const fetchPlanningProduksi = async () => {
    try {
      const res = await api.express.get("/manufacturing/planning-produksi").catch(() => null);
      let list: any[] = [];
      if (res && res.data && res.data.success) {
        list = res.data.data || [];
      } else {
        // Fallback or read from localStorage if it exists (for compatibility with the planning page)
        const storedPlans = localStorage.getItem("erp_epu_pro_plans");
        if (storedPlans) {
          list = JSON.parse(storedPlans);
        } else {
          list = [
            { id: 1, proCode: "PrO-2026-06001", pro_code: "PrO-2026-06001", productCode: "HD-MIR-RH-29702", product_code: "HD-MIR-RH-29702", productName: "HOLDER MIRROR RH 29702-C0100 SAPTA SC", product_name: "HOLDER MIRROR RH 29702-C0100 SAPTA SC", targetQty: 1200, target_qty: 1200 },
            { id: 2, proCode: "PrO-2026-06002", pro_code: "PrO-2026-06002", productCode: "BRK-MIR-LH-29701", product_code: "BRK-MIR-LH-29701", productName: "MIRROR BRACKET LH 29701-C0100 SAPTA SC", product_name: "MIRROR BRACKET LH 29701-C0100 SAPTA SC", targetQty: 800, target_qty: 800 }
          ];
        }
      }
      setProList(list);
      setFilteredProList(list); // initially show all if no Order Sheet is selected
    } catch (err) {
      console.error("Error fetching MPP:", err);
    }
  };

  const generateNextWoNumber = (existingWos: any[]) => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `WO/MAT-EPU/${year}/${month}/`;
    
    let maxSeq = 0;
    existingWos.forEach(wo => {
      if (wo.reference && wo.reference.startsWith(prefix)) {
        const parts = wo.reference.split('/');
        const seqStr = parts[parts.length - 1];
        const seq = parseInt(seqStr, 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });
    return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
  };

  const handleRefreshWoNumber = async () => {
    try {
      const res = await api.express.get("/manufacturing/work-orders");
      const currentWos = res.data.data || [];
      setWorkOrders(currentWos);
      const nextNo = generateNextWoNumber(currentWos);
      setWoNote(nextNo);
    } catch (err) {
      console.error("Error refreshing work order number:", err);
    }
  };

  const handleOrderSheetChange = async (osId: string) => {
    setSelectedSoId(osId);
    if (!osId) {
      setSelectedSoRef("");
      setFilteredProList(proList);
      setSelectedProId("");
      return;
    }
    
    const matched = soList.find(s => String(s.id) === String(osId));
    setSelectedSoRef(matched ? matched.reference || matched.no_po_customer || "" : "");
    
    try {
      const res = await api.express.get(`/order-sheets/${osId}`);
      if (res && res.data && res.data.success) {
        const details = res.data.data.details || [];
        const productCodes = details.map((d: any) => d.product_code).filter(Boolean);
        const productIds = details.map((d: any) => Number(d.product_id)).filter(Boolean);
        
        const filtered = proList.filter((pro: any) => {
          const proPCode = pro.product_code || pro.productCode;
          const proPId = pro.product_id || pro.productId;
          return productCodes.includes(proPCode) || (proPId && productIds.includes(Number(proPId)));
        });
        setFilteredProList(filtered);

        if (filtered.length >= 1) {
          setSelectedProId(String(filtered[0].id));
          handleProChange(String(filtered[0].id));
        } else {
          setSelectedProId("");
          if (details.length > 0) {
            const firstDetail = details[0];
            const osQty = firstDetail.os_qty || 1;
            setWoTargetQty(Number(osQty));

            // Auto select default warehouses, department and type
            setAllocationWarehouseId("1"); // MATKOM
            setTargetWarehouseId("3"); // Finished Goods
            setSelectedTipeBarangJadi("FG");

            const matchedDept = departmentsList.find(d => d.department_code === "PROD" || d.department_name === "Production");
            if (matchedDept) {
              setSelectedDeptId(String(matchedDept.id));
            }

            // Find product code in allProducts if it's null in order_sheet_details
            let osPCode = firstDetail.product_code;
            if (!osPCode && firstDetail.product_id) {
              const matchedProd = allProducts.find(p => p.id === Number(firstDetail.product_id));
              if (matchedProd) {
                osPCode = matchedProd.product_code;
              }
            }

            if (osPCode) {
              const matchedBom = bomsList.find(bom => bom.finished_good_code === osPCode);
              if (matchedBom) {
                handleBomChange(String(matchedBom.id), Number(osQty));
              } else {
                setSelectedBomId("");
                setSelectedBomDetail(null);
                setWoMaterials([]);
              }
            } else {
              setSelectedBomId("");
              setSelectedBomDetail(null);
              setWoMaterials([]);
            }
          }
        }
      } else {
        setFilteredProList([]);
        setSelectedProId("");
      }
    } catch (err) {
      console.error("Error fetching order sheet details for filtering PrO:", err);
      setFilteredProList([]);
      setSelectedProId("");
    }
  };

  const handleProChange = (proId: string) => {
    setSelectedProId(proId);
    if (!proId) return;
    
    const matchedPro = proList.find(p => String(p.id) === String(proId));
    if (matchedPro) {
      // Synchronize back to the linked order sheet if any
      if (matchedPro.order_sheet_id) {
        setSelectedSoId(String(matchedPro.order_sheet_id));
        const matchedSo = soList.find(s => String(s.id) === String(matchedPro.order_sheet_id));
        setSelectedSoRef(matchedSo ? matchedSo.reference || matchedSo.no_po_customer || "" : "");
      }

      const proPCode = matchedPro.product_code || matchedPro.productCode;
      const proTargetQty = matchedPro.target_qty || matchedPro.targetQty || 1;
      
      setWoTargetQty(Number(proTargetQty));

      // Auto select default warehouses, department and type
      setAllocationWarehouseId("1"); // MATKOM
      setTargetWarehouseId("3"); // Finished Goods
      setSelectedTipeBarangJadi("FG");

      const matchedDept = departmentsList.find(d => d.department_code === "PROD" || d.department_name === "Production");
      if (matchedDept) {
        setSelectedDeptId(String(matchedDept.id));
      }
      
      const matchedBom = bomsList.find(bom => bom.finished_good_code === proPCode);
      if (matchedBom) {
        handleBomChange(String(matchedBom.id), Number(proTargetQty));
      } else {
        setSelectedBomId("");
        setSelectedBomDetail(null);
        setWoMaterials([]);
      }
    }
  };

  const loadMatkomStocks = async () => {
    setStocksLoading(true);
    try {
      const res = await api.express.get("/stock-opnames/system-stock", {
        params: { warehouse_id: 1 }
      });
      setMatkomStocks(res.data.data || []);
    } catch (err) {
      console.error("Error loading MATKOM stocks:", err);
    } finally {
      setStocksLoading(false);
    }
  };

  const viewWoDetails = async (id: number) => {
    try {
      const res = await api.express.get(`/manufacturing/work-orders/${id}`);
      setSelectedWo(res.data.data);
      // Also load linked MPPs for this WO
      const mppRes = await api.express.get("/manufacturing/planning-produksi").catch(() => null);
      if (mppRes && mppRes.data && mppRes.data.success) {
        const allMpps = mppRes.data.data || [];
        setWoLinkedMpps(allMpps.filter((m: any) => String(m.wo_id) === String(id)));
      }
    } catch (err) {
      console.error("Error loading WO details:", err);
    }
  };

  // ─── WO Lifecycle Handlers ───────────────────────────────────────────────────
  const handleStartWo = async (woId: number) => {
    if (!confirm("Mulai Work Order ini? Status WO, MPP, dan Mesin terkait akan menjadi Running/Berjalan.")) return;
    setWoActionLoading(true);
    try {
      const res = await api.express.post(`/manufacturing/work-orders/${woId}/start`);
      alert(res.data.message || "WO berhasil di-Start!");
      await viewWoDetails(woId);
      fetchWorkOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Gagal memulai WO");
    } finally {
      setWoActionLoading(false);
    }
  };

  const handleStopWo = async (woId: number) => {
    if (!confirm("Pause Work Order ini? Status WO → Paused, MPP → Pause, Mesin → Idle (jika tidak ada WO lain).")) return;
    setWoActionLoading(true);
    try {
      const res = await api.express.post(`/manufacturing/work-orders/${woId}/stop`);
      alert(res.data.message || "WO berhasil di-Pause!");
      await viewWoDetails(woId);
      fetchWorkOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Gagal pause WO");
    } finally {
      setWoActionLoading(false);
    }
  };

  const handleFinishWo = async (woId: number) => {
    if (!confirm("Selesaikan seluruh Work Order ini? SEMUA MPP → Selesai, Mesin → Idle, WO → Completed.")) return;
    setWoActionLoading(true);
    try {
      const res = await api.express.post(`/manufacturing/work-orders/${woId}/finish`);
      alert(res.data.message || "WO berhasil Diselesaikan!");
      await viewWoDetails(woId);
      fetchWorkOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Gagal menyelesaikan WO");
    } finally {
      setWoActionLoading(false);
    }
  };

  const handleFinishMpp = async (mppId: number, woId: number) => {
    if (!confirm("Selesaikan item MPP ini? Mesin terkait akan menjadi Idle. WO akan Completed jika semua item selesai.")) return;
    setWoActionLoading(true);
    try {
      const res = await api.express.post(`/manufacturing/planning-produksi/${mppId}/finish`);
      alert(res.data.message || `MPP berhasil diselesaikan!`);
      await viewWoDetails(woId);
      fetchWorkOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Gagal menyelesaikan MPP item");
    } finally {
      setWoActionLoading(false);
    }
  };

  const handleBomChange = async (bomId: string, customTargetQty?: number) => {
    setSelectedBomId(bomId);
    if (!bomId) {
      setSelectedBomDetail(null);
      setWoMaterials([]);
      return;
    }
    try {
      const res = await api.express.get(`/manufacturing/boms/${bomId}`);
      if (res && res.data && res.data.success) {
        const bom = res.data.data;
        const items = res.data.items || [];
        setSelectedBomDetail(bom);
        
        const targetQtyForCalc = customTargetQty !== undefined ? customTargetQty : woTargetQty;
        
        // Map BOM items to table rows
        const mapped = items.map((item: any, idx: number) => {
          const matchedProd = allProducts.find(p => p.product_code === item.product_code);
          return {
            id: idx.toString(),
            product_id: item.product_id || matchedProd?.id || null,
            product_code: item.product_code,
            product_name: item.product_name,
            unit: item.unit || "Pcs",
            qty_bom: Number(item.qty),
            qty_required: Number(item.qty) * targetQtyForCalc,
            price: Number(item.price) || matchedProd?.product_price || 0,
            warehouse_code: item.warehouse_code || "GPR",
            item_type: item.item_type || "RAW"
          };
        });
        
        setWoMaterials(mapped);
        
        // Auto select target warehouse if specified in BOM
        if (bom.target_warehouse_id) {
          setTargetWarehouseId(bom.target_warehouse_id.toString());
        }
      }
    } catch (err) {
      console.error("Error loading BOM detail:", err);
    }
  };

  const handleBomItemChange = (index: number, field: string, value: any) => {
    const updated = [...woMaterials];
    (updated[index] as any)[field] = value;
    setWoMaterials(updated);
  };

  const handleRemoveBomItem = (index: number) => {
    setWoMaterials(woMaterials.filter((_, i) => i !== index));
  };

  const handleAddAdditionalRow = () => {
    setAdditionalMaterials([
      ...additionalMaterials,
      {
        id: Date.now().toString(),
        item_type: "RAW",
        warehouse_code: "GPR",
        product_code: "",
        product_name: "",
        unit: "Pcs",
        qty_required: 1,
        price: 0
      }
    ]);
  };

  const handleAdditionalChange = (index: number, field: string, value: any) => {
    const updated = [...additionalMaterials];
    updated[index][field] = value;
    
    if (field === "product_code") {
      const prod = allProducts.find(p => p.product_code === value);
      if (prod) {
        updated[index]["product_id"] = prod.id;
        updated[index]["product_name"] = prod.product_name;
        updated[index]["unit"] = prod.product_unit || "Pcs";
        updated[index]["price"] = Number(prod.product_price) || 0;
      }
    }
    setAdditionalMaterials(updated);
  };

  const handleRemoveAdditionalRow = (index: number) => {
    setAdditionalMaterials(additionalMaterials.filter((_, i) => i !== index));
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBomDetail) {
      alert("Pilih Kode BOM terlebih dahulu.");
      return;
    }

    const fgCode = selectedBomDetail.finished_good_code;
    const parentProduct = allProducts.find(p => p.product_code === fgCode);
    if (!parentProduct) {
      alert(`Produk jadi dengan kode ${fgCode} tidak ditemukan di sistem.`);
      return;
    }

    // Combine materials from BOM table and Additional items
    const combinedMaterials = [...woMaterials, ...additionalMaterials]
      .map(item => {
        let pId = item.product_id;
        if (!pId && item.product_code) {
          const matched = allProducts.find(p => p.product_code === item.product_code);
          pId = matched ? matched.id : null;
        }
        return {
          product_id: pId,
          qty_required: item.qty_required
        };
      })
      .filter(item => item.product_id && item.qty_required > 0);

    if (combinedMaterials.length === 0) {
      alert("Minimal 1 komponen bahan baku diperlukan.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && editingWoId) {
        await api.express.put(`/manufacturing/work-orders/${editingWoId}`, {
          date: woDate,
          parent_product_id: Number(parentProduct.id),
          target_qty: Number(woTargetQty),
          note: woNote,
          materials: combinedMaterials,
          sales_order_id: selectedSoId || null,
          target_warehouse_id: targetWarehouseId ? Number(targetWarehouseId) : null,
          department_id: selectedDeptId ? Number(selectedDeptId) : null,
          tipe_barang_jadi: selectedTipeBarangJadi || null,
          planning_produksi_id: selectedProId ? Number(selectedProId) : null
        });
        alert("Work Order berhasil diubah.");
      } else {
        await api.express.post("/manufacturing/work-orders", {
          date: woDate,
          parent_product_id: Number(parentProduct.id),
          target_qty: Number(woTargetQty),
          note: `Order Sheet Ref: ${selectedSoRef || "None"}. ` + (selectedProId ? `PrO Ref: ${proList.find(p => String(p.id) === String(selectedProId))?.pro_code || proList.find(p => String(p.id) === String(selectedProId))?.proCode || ""}. ` : "") + (woNote ? `Expected WO: ${woNote}. ` : ""),
          materials: combinedMaterials,
          sales_order_id: selectedSoId || null,
          target_warehouse_id: targetWarehouseId ? Number(targetWarehouseId) : null,
          department_id: selectedDeptId ? Number(selectedDeptId) : null,
          tipe_barang_jadi: selectedTipeBarangJadi || null,
          planning_produksi_id: selectedProId ? Number(selectedProId) : null
        });
        alert("Work Order berhasil disimpan.");
      }
      
      setIsCreating(false);
      setIsEditing(false);
      setEditingWoId(null);
      fetchWorkOrders();
    } catch (err: any) {
      console.error("Error saving work order:", err);
      alert(err.message || "Gagal menyimpan Work Order");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Issuance generation logic (original workflow)
  const openCreateIssuance = async () => {
    if (!selectedWo) return;
    await loadMatkomStocks();
    
    const details = selectedWo.materials.map((m: any) => {
      return {
        product_id: m.product_id,
        product_name: m.product_name,
        product_code: m.product_code,
        qty_required: Number(m.qty_required) - Number(m.qty_issued),
        supplier_id: "",
        qty_to_issue: Math.max(0, Number(m.qty_required) - Number(m.qty_issued))
      };
    });
    
    setIssDetails(details);
    setIsIssuanceModalOpen(true);
  };

  const handleIssuanceDetailChange = (index: number, field: string, value: any) => {
    const updated = [...issDetails];
    updated[index][field] = value;
    setIssDetails(updated);
  };

  const handleCreateIssuance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWo) return;

    if (issDetails.some(d => !d.supplier_id && d.qty_to_issue > 0)) {
      const incomplete = issDetails.find(d => {
        const hasSuppliers = matkomStocks.some(s => String(s.product_id) === String(d.product_id) && s.supplier_id !== null);
        return hasSuppliers && !d.supplier_id && d.qty_to_issue > 0;
      });

      if (incomplete) {
        alert(`Mohon pilih vendor/supplier spesifik untuk material: ${incomplete.product_name}`);
        return;
      }
    }

    try {
      await api.express.post("/manufacturing/material-issuances", {
        date: issDate,
        work_order_id: selectedWo.id,
        note: issNote,
        details: issDetails.filter(d => d.qty_to_issue > 0).map(d => ({
          product_id: Number(d.product_id),
          supplier_id: d.supplier_id ? Number(d.supplier_id) : null,
          qty_to_issue: Number(d.qty_to_issue)
        }))
      });

      setIsIssuanceModalOpen(false);
      setIssNote("");
      viewWoDetails(selectedWo.id);
      fetchWorkOrders();
    } catch (err: any) {
      console.error("Error creating material issuance:", err);
      alert(err.message || "Gagal membuat Perintah Pengeluaran Material");
    }
  };

  const handleReleaseIssuance = async (issuanceId: number) => {
    if (!confirm("Apakah Anda yakin ingin merilis/mengeluarkan material ini? Stok MATKOM akan terpotong secara riil berdasarkan vendor masing-masing, dan dilebur ke stok Parent Gudang Produksi.")) {
      return;
    }

    try {
      const res = await api.express.put(`/manufacturing/material-issuances/${issuanceId}/release`);
      alert(res.data.message || "Material berhasil dirilis!");
      if (selectedWo) {
        viewWoDetails(selectedWo.id);
      }
      fetchWorkOrders();
    } catch (err: any) {
      console.error("Error releasing material issuance:", err);
      alert(err.message || "Gagal merilis material. Mohon cek ketersediaan stok vendor di MATKOM.");
    }
  };

  const getWorkOrderDetailedStatus = (wo: any) => {
    // 1. Get all production outputs for this work order
    const woOutputs = productionOutputs.filter(po => String(po.wo_reference) === String(wo.reference));

    // 2. Sum the total received Finished Goods
    const totalReceivedFG = woOutputs
      .filter(po => po.status === "Received_FG")
      .reduce((sum, po) => sum + Number(po.qty_received || 0), 0);

    // 3. Check if completed by status or by target qty achieved
    if (
      wo.status === "Completed" || 
      wo.status === "Selesai" || 
      (totalReceivedFG > 0 && totalReceivedFG >= Number(wo.target_qty))
    ) {
      return {
        label: "Selesai / Done",
        color: "bg-emerald-50 text-emerald-600 border border-emerald-200",
        nextStep: "Semua proses selesai"
      };
    }

    // 4. Paused state
    if (wo.status === "Paused") {
      return {
        label: "Di-Pause / Ditunda",
        color: "bg-orange-100 text-orange-700 border border-orange-300",
        nextStep: "Lanjutkan (Resume) di panel WO"
      };
    }

    const totalRequired = Number(wo.total_required || 0);
    const totalIssued = Number(wo.total_issued || 0);
    if (totalRequired > 0 && totalIssued === 0 && wo.status !== "Running") {
      return {
        label: "Menunggu Realisasi Bahan",
        color: "bg-orange-50 text-orange-600 border border-orange-200 animate-pulse",
        nextStep: "Proses Buat Permintaan & Rilis Bahan Baku"
      };
    }

    // 5. Running state
    if (wo.status === "Running") {
      if (woOutputs.length === 0) {
        return {
          label: "Sedang Berjalan (Running)",
          color: "bg-emerald-100 text-emerald-700 border border-emerald-300 animate-pulse",
          nextStep: "Input Realisasi di Menu Realisasi Produksi"
        };
      }
    }

    if (woOutputs.length === 0) {
      return {
        label: "Siap Dimulai (Released)",
        color: "bg-blue-50 text-blue-600 border border-blue-200",
        nextStep: "Tekan Start WO di Detail Panel"
      };
    }

    const hasPendingQc = woOutputs.some(po => po.status === "WIP" || po.status === "SFG_PENDING_QC");
    if (hasPendingQc) {
      return {
        label: "Menunggu QC Gate",
        color: "bg-purple-50 text-purple-600 border border-purple-200",
        nextStep: "Loloskan / Audit di Menu QC Gate"
      };
    }

    const hasPendingRepair = woOutputs.some(po => po.status === "PENDING_REPAIR");
    if (hasPendingRepair) {
      return {
        label: "Menunggu Perbaikan",
        color: "bg-red-50 text-red-600 border border-red-200 animate-bounce",
        nextStep: "Input Perbaikan di Menu QC Gate ke Produksi (Rework)"
      };
    }

    const hasPendingFg = woOutputs.some(po => po.status === "Verified_QC");
    if (hasPendingFg) {
      return {
        label: "Menunggu Penarikan FG",
        color: "bg-teal-50 text-teal-600 border border-teal-200",
        nextStep: "Input Penerimaan di Menu QC Gate ke FG"
      };
    }

    return {
      label: "Dalam Produksi",
      color: "bg-cyan-50 text-cyan-600 border border-cyan-200",
      nextStep: "Molding / Assembly / QC lanjutan"
    };
  };

  const handleEditWo = async (woId: number) => {
    try {
      const res = await api.express.get(`/manufacturing/work-orders/${woId}`);
      if (res && res.data && res.data.success) {
        const wo = res.data.data;
        setIsEditing(true);
        setEditingWoId(String(wo.id));
        
        setWoDate(wo.date);
        setWoTargetQty(Number(wo.target_qty) || 1);
        setWoNote(wo.note || wo.reference);
        
        const mappedMaterials = (wo.materials || []).map((m: any) => {
          const targetQtyVal = Number(wo.target_qty) || 1;
          const qtyBomVal = targetQtyVal > 0 ? Number(m.qty_required) / targetQtyVal : 0;
          return {
            product_id: m.product_id,
            product_code: m.product_code,
            product_name: m.product_name,
            qty_bom: isNaN(qtyBomVal) ? 0 : qtyBomVal,
            qty_required: Number(m.qty_required),
            price: Number(m.price) || 0,
            warehouse_code: m.warehouse_code || "GPR",
            item_type: m.item_type || "RAW"
          };
        });
        setWoMaterials(mappedMaterials);
        
        const matchedBom = bomsList.find(bom => bom.finished_good_code === wo.product_code);
        if (matchedBom) {
          setSelectedBomId(String(matchedBom.id));
          setSelectedBomDetail(matchedBom);
        } else {
          setSelectedBomId("");
          setSelectedBomDetail(null);
        }
        
        setSelectedSoId(wo.sales_order_id || "");
        setSelectedSoRef("");
        setTargetWarehouseId(wo.target_warehouse_id ? String(wo.target_warehouse_id) : "");
        setSelectedDeptId(wo.department_id ? String(wo.department_id) : "");
        setSelectedTipeBarangJadi(wo.tipe_barang_jadi || "FG");
        setSelectedProId(wo.pro ? String(wo.pro.id) : "");
        
        setIsCreating(true);
      }
    } catch (err) {
      console.error("Error loading WO for edit:", err);
      alert("Gagal memuat detail Work Order untuk diedit.");
    }
  };

  const handleDeleteWo = async (woId: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus Work Order ini? Seluruh data relasi material dan draf pengeluaran terkait juga akan dihapus secara permanen.")) {
      return;
    }
    try {
      await api.express.delete(`/manufacturing/work-orders/${woId}`);
      alert("Work Order berhasil dihapus.");
      setSelectedWo(null);
      fetchWorkOrders();
    } catch (err: any) {
      console.error("Error deleting work order:", err);
      alert(err.response?.data?.message || err.message || "Gagal menghapus Work Order.");
    }
  };

  const handlePrintWo = (wo: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const materialsHtml = (wo.materials || []).map((m: any) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-size: 11px;">${m.product_code}</td>
        <td style="padding: 10px; font-size: 11px;">${m.product_name}</td>
        <td style="padding: 10px; font-size: 11px; text-align: center;">${Number(m.qty_required)}</td>
        <td style="padding: 10px; font-size: 11px; text-align: center;">${Number(m.qty_issued)}</td>
        <td style="padding: 10px; font-size: 11px; text-align: center;">${m.product_unit || 'Pcs'}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Work Order - ${wo.reference}</title>
          <style>
            body { font-family: 'Outfit', 'Inter', sans-serif; color: #1e293b; padding: 40px; margin: 0; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px double #cbd5e1; padding-bottom: 20px; margin-bottom: 20px; }
            .company { font-weight: 900; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; }
            .title { font-weight: 900; font-size: 22px; text-transform: uppercase; text-align: center; margin: 30px 0; letter-spacing: 1.5px; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .info-table td { padding: 8px 0; font-size: 13px; font-weight: bold; }
            .info-label { color: #64748b; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; width: 150px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 50px; }
            .items-table th { background: #f1f5f9; padding: 12px 10px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; text-align: left; border-bottom: 2px solid #cbd5e1; }
            .signatures { display: flex; justify-content: space-between; margin-top: 80px; }
            .sig-box { width: 200px; text-align: center; font-size: 12px; font-weight: bold; }
            .sig-line { border-bottom: 1px solid #1e293b; height: 70px; margin-bottom: 8px; }
            @media print {
              body { padding: 20px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company">PT ERAN PLASTINDO UTAMA</div>
              <div style="font-size: 10px; color: #64748b; font-weight: bold; margin-top: 2px;">Cikarang, Bekasi, Jawa Barat</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; font-weight: bold; color: #64748b;">SPK / PRODUCTION ORDER</div>
              <div style="font-weight: 900; font-size: 14px;">${wo.reference}</div>
            </div>
          </div>

          <div class="title">Surat Perintah Kerja (SPK)</div>

          <table class="info-table">
            <tr>
              <td class="info-label">Tanggal WO</td>
              <td>: ${wo.date}</td>
              <td class="info-label">Produk Target</td>
              <td>: ${wo.product_name} (${wo.product_code})</td>
            </tr>
            <tr>
              <td class="info-label">Departemen</td>
              <td>: PRODUCTION</td>
              <td class="info-label">Target QTY</td>
              <td>: ${Number(wo.target_qty)} ${wo.product_unit || 'Pcs'}</td>
            </tr>
            <tr>
              <td class="info-label">Catatan / Ref</td>
              <td colspan="3">: ${wo.note || '-'}</td>
            </tr>
          </table>

          <div style="font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Daftar Kebutuhan Bahan Baku (BOM)</div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 20%;">Kode Barang</th>
                <th style="width: 45%;">Nama Barang</th>
                <th style="width: 15%; text-align: center;">Kebutuhan WO</th>
                <th style="width: 15%; text-align: center;">Sudah Keluar</th>
                <th style="width: 10%; text-align: center;">Unit</th>
              </tr>
            </thead>
            <tbody>
              ${materialsHtml}
            </tbody>
          </table>

          <div class="signatures">
            <div class="sig-box">
              <div>Dibuat Oleh,</div>
              <div class="sig-line"></div>
              <div style="color: #64748b; font-size: 10px;">PPIC Admin</div>
            </div>
            <div class="sig-box">
              <div>Disetujui Oleh,</div>
              <div class="sig-line"></div>
              <div style="color: #64748b; font-size: 10px;">Kepala Produksi</div>
            </div>
            <div class="sig-box">
              <div>Diterima Oleh,</div>
              <div class="sig-line"></div>
              <div style="color: #64748b; font-size: 10px;">Gudang / Operator</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return (
          <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-max">
            <Clock size={10} /> Pending
          </span>
        );
      case "Released":
        return (
          <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-max">
            <ClipboardList size={10} /> Released
          </span>
        );
      case "Running":
      case "In Production":
        return (
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-max animate-pulse">
            <Activity size={10} /> Running
          </span>
        );
      case "Paused":
        return (
          <span className="px-3 py-1 bg-orange-50 text-orange-600 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-max">
            <AlertCircle size={10} /> Paused
          </span>
        );
      case "Completed":
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-max">
            <CheckCircle2 size={10} /> Completed
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-slate-50 text-slate-600 text-[10px] font-black rounded-full uppercase tracking-wider w-max">
            {status}
          </span>
        );
    }
  };

  // Calculations for Rencana Hasil Produksi
  const totalBomCost = woMaterials.reduce((sum, item) => sum + (Number(item.qty_required) * Number(item.price)), 0);
  const totalAdditionalCost = additionalMaterials.reduce((sum, item) => sum + (Number(item.qty_required) * Number(item.price)), 0);
  const totalMasterCost = totalBomCost + totalAdditionalCost;
  const qtyJadiVal = woTargetQty || 1;
  const hargaSatuanVal = totalMasterCost / qtyJadiVal;

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen animate-in fade-in duration-500">
      
      {/* Back navigation */}
      <button 
        onClick={() => {
          if (isCreating) {
            setIsCreating(false);
          } else {
            router.push("/manufacturing");
          }
        }}
        className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
      >
        <ArrowLeft size={14} /> Back to {isCreating ? "Work Order Dashboard" : "Manufacturing Dashboard"}
      </button>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg shadow-orange-200">
              <Wrench className="text-white animate-spin-slow" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Work <span className="text-orange-600">Order</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Pantau rencana perakitan produksi dan permintaan pengeluaran bahan baku dari MATKOM ke PROD.
          </p>
        </div>
        
        {!isCreating && (
          <button
            onClick={() => {
              setIsCreating(true);
              setWoDate(new Date().toISOString().split("T")[0]);
              setWoTargetQty(1);
              setWoNote(generateNextWoNumber(workOrders));
              setSelectedBomId("");
              setSelectedBomDetail(null);
              setWoMaterials([]);
              setAdditionalMaterials([]);
              setSelectedSoId("");
              setSelectedSoRef("");
              setTargetWarehouseId("");
              setAllocationWarehouseId("");
              setSelectedDeptId("");
              setSelectedTipeBarangJadi("FG");
              setSelectedProId("");
              setFilteredProList(proList);
            }}
            className="group relative flex items-center gap-3 bg-gray-950 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-orange-200 active:scale-95 overflow-hidden"
          >
            <Plus size={20} strokeWidth={3} />
            <span>Buat Work Order</span>
          </button>
        )}
      </div>

      {isCreating ? (
        /* ================= FULL PAGE CREATOR ================= */
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-8 animate-in fade-in duration-300">
          
          {/* Form Header */}
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-gray-900">Form Pembuatan Work Order</h2>
            </div>
            <button
              onClick={() => setIsCreating(false)}
              className="text-xs font-bold text-gray-400 hover:text-gray-600"
            >
              Kembali
            </button>
          </div>

          {/* Order Sheet & PrO Selector Box */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden max-w-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest w-1/3">Keterangan</th>
                  <th className="px-4 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest w-2/3">Nilai</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-3 text-xs font-bold text-gray-700 align-middle">Nomor Order Sheet</td>
                  <td className="px-4 py-3 flex gap-2">
                    <select
                      value={selectedSoId}
                      onChange={(e) => handleOrderSheetChange(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:bg-white"
                    >
                      <option value="">--Pilih Order Sheet--</option>
                      {soList.map(so => (
                        <option key={so.id} value={so.id}>{so.reference || so.no_po_customer}</option>
                      ))}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-xs font-bold text-gray-700 align-middle">No. PrO</td>
                  <td className="px-4 py-3 flex gap-2">
                    <select
                      value={selectedProId}
                      onChange={(e) => handleProChange(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:bg-white"
                    >
                      <option value="">--Pilih PrO--</option>
                      {filteredProList.map(pro => (
                        <option key={pro.id} value={pro.id}>
                          {pro.pro_code || pro.proCode} - {pro.product_name || pro.productName} ({pro.target_qty || pro.targetQty} Pcs)
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Form Fields Grid */}
          <div className="bg-[#f8fafc] p-6 rounded-3xl border border-gray-100 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Note 1: Kode BOM with target product name displayed to its right */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Kode BOM</label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedBomId}
                    onChange={(e) => handleBomChange(e.target.value)}
                    required
                    className="w-64 max-w-xs px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500/20 transition-all h-12"
                  >
                    <option value="">-- Pilih Kode BOM --</option>
                    {bomsList.map(bom => (
                      <option key={bom.id} value={bom.id}>{bom.bom_code}</option>
                    ))}
                  </select>
                  <button type="button" className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center transition-all h-12">
                    <Search size={16} />
                  </button>
                  
                  {/* Selected Item Product Name next to BOM Code */}
                  <div className={`flex-1 px-4 py-3 border rounded-2xl text-xs font-black truncate h-12 flex items-center ${selectedBomDetail ? "bg-orange-50 text-orange-700 border-orange-100" : "bg-gray-100 text-gray-400 border-gray-200"}`}>
                    {selectedBomDetail ? selectedBomDetail.finished_good_name : "Nama Item..."}
                  </div>
                </div>
              </div>

              {/* Jurnal */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Jurnal</label>
                <select className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500/20 transition-all h-12 appearance-none" defaultValue="ASSEMBLY">
                  <option value="ASSEMBLY">ASSEMBLY</option>
                  <option value="DISASSEMBLY">DISASSEMBLY</option>
                </select>
              </div>

              {/* Departemen */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Departemen</label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500/20 transition-all h-12"
                >
                  <option value="">-- Pilih Departemen --</option>
                  {departmentsList.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.department_name}</option>
                  ))}
                </select>
              </div>

              {/* No WO */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">No. W.O.</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={woNote}
                    onChange={(e) => setWoNote(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-orange-500/20 transition-all h-12"
                  />
                  <button
                    type="button"
                    onClick={handleRefreshWoNumber}
                    className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center transition-all h-12 hover:scale-105 active:scale-95"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>

              {/* Tgl WO */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tgl. W.O.</label>
                <input
                  type="date"
                  required
                  value={woDate}
                  onChange={(e) => setWoDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-orange-500/20 transition-all h-12"
                />
              </div>

              {/* Qty WO */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Qty. W.O.</label>
                <input
                  type="number"
                  min={1}
                  value={woTargetQty}
                  onChange={(e) => setWoTargetQty(Number(e.target.value))}
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-black outline-none focus:ring-2 focus:ring-orange-500/20 transition-all h-12 text-center"
                />
              </div>

              {/* Gudang Alokasi Bahan Baku */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Gudang Alokasi Bahan Baku</label>
                <select
                  value={allocationWarehouseId}
                  onChange={(e) => setAllocationWarehouseId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500/20 transition-all h-12"
                >
                  <option value="">-- Pilih Gudang Alokasi --</option>
                  {warehousesList.map(w => (
                    <option key={w.id} value={w.id}>({w.code}) {w.name}</option>
                  ))}
                </select>
              </div>

              {/* Keterangan */}
              <div className="space-y-2 md:col-span-3">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Keterangan</label>
                <textarea
                  placeholder="Keterangan tambahan..."
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-orange-500/20 transition-all h-16 resize-none"
                />
              </div>

            </div>
          </div>

          {/* Formula Dari B.O.M. Table Card */}
          <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="bg-[#1e293b] text-white px-6 py-4 font-black text-xs uppercase tracking-wider flex items-center gap-2">
              <Layers size={14} /> Formula Dari B.O.M.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Gudang (+)</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Tipe Barang</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Kode</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Nama</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">U/M</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Qty. BOM</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Qty. W.O.</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Harga</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Jumlah</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {woMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50/20">
                        Pilih Kode BOM di atas untuk memuat formula bahan baku
                      </td>
                    </tr>
                  ) : (
                    woMaterials.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/40">
                        <td className="px-3 py-2">
                          <select
                            value={item.warehouse_code}
                            onChange={(e) => handleBomItemChange(idx, "warehouse_code", e.target.value)}
                            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                          >
                            <option value="GPR">GPR</option>
                            <option value="MATKOM">MATKOM</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={item.item_type}
                            onChange={(e) => handleBomItemChange(idx, "item_type", e.target.value)}
                            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                          >
                            <option value="RAW">RAW</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            readOnly
                            value={item.product_code}
                            className="w-32 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            readOnly
                            value={item.product_name}
                            className="w-48 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 truncate"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={item.unit}
                            onChange={(e) => handleBomItemChange(idx, "unit", e.target.value)}
                            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                          >
                            <option value="PCS">PCS</option>
                            <option value="KG">KG</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            readOnly
                            value={item.qty_bom}
                            className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center text-slate-600"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            value={item.qty_required}
                            onChange={(e) => handleBomItemChange(idx, "qty_required", Number(e.target.value))}
                            className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center outline-none focus:ring-2 focus:ring-orange-500/20"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => handleBomItemChange(idx, "price", Number(e.target.value))}
                            className="w-28 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-right outline-none focus:ring-2 focus:ring-orange-500/20"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-bold text-slate-700">
                          {(item.qty_required * item.price).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveBomItem(idx)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tambahan Bahan Baku dan Biaya Table */}
          <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="bg-[#1e293b] text-white px-6 py-4 font-black text-xs uppercase tracking-wider flex items-center gap-2">
              <Plus size={14} /> Tambahan Bahan Baku dan Biaya
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Tipe Barang</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Gudang (+)</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Kode</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Nama</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">U/M</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Qty. W.O.</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Harga</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Jumlah</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {additionalMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-xs font-bold text-slate-400">
                        <button
                          type="button"
                          onClick={handleAddAdditionalRow}
                          className="text-orange-600 hover:text-orange-800 font-black uppercase tracking-wider text-[10px]"
                        >
                          + Tambah Item Baru
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {additionalMaterials.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/40">
                          <td className="px-3 py-2">
                            <select
                              value={item.item_type}
                              onChange={(e) => handleAdditionalChange(idx, "item_type", e.target.value)}
                              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                            >
                              <option value="RAW">RAW</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={item.warehouse_code}
                              onChange={(e) => handleAdditionalChange(idx, "warehouse_code", e.target.value)}
                              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                            >
                              <option value="GPR">GPR</option>
                              <option value="MATKOM">MATKOM</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={item.product_code}
                              onChange={(e) => handleAdditionalChange(idx, "product_code", e.target.value)}
                              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none w-36"
                            >
                              <option value="">-- Pilih Kode --</option>
                              {allProducts.map(p => (
                                <option key={p.id} value={p.product_code}>{p.product_code}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              readOnly
                              value={item.product_name}
                              className="w-48 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 truncate"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              readOnly
                              value={item.unit}
                              className="w-16 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center text-slate-600"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              value={item.qty_required}
                              onChange={(e) => handleAdditionalChange(idx, "qty_required", Number(e.target.value))}
                              className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center outline-none focus:ring-2 focus:ring-orange-500/20"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => handleAdditionalChange(idx, "price", Number(e.target.value))}
                              className="w-28 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-right outline-none focus:ring-2 focus:ring-orange-500/20"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-xs font-bold text-slate-700">
                            {(item.qty_required * item.price).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveAdditionalRow(idx)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={9} className="px-4 py-3 bg-slate-50/20">
                          <button
                            type="button"
                            onClick={handleAddAdditionalRow}
                            className="text-orange-600 hover:text-orange-800 font-black uppercase tracking-wider text-xs flex items-center gap-1.5"
                          >
                            <Plus size={12} /> Tambah Item Baru
                          </button>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rencana Hasil Produksi Form */}
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Rencana Hasil Produksi
            </h3>

            {/* Note 2: Gudang Target dapat dipilih */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Gudang Target (Selectable)</label>
                <select
                  value={targetWarehouseId}
                  onChange={(e) => setTargetWarehouseId(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500/20 transition-all appearance-none h-12"
                >
                  <option value="">-- Pilih Gudang Target --</option>
                  {warehousesList.map(w => (
                    <option key={w.id} value={w.id}>({w.code}) {w.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tipe Barang Jadi</label>
                <select
                  value={selectedTipeBarangJadi}
                  onChange={(e) => setSelectedTipeBarangJadi(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500/20 transition-all h-12"
                >
                  {tipeBarangJadiList.map(t => (
                    <option key={t.id} value={t.code}>{t.code} ({t.name})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden max-w-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-widest w-1/3">Keterangan</th>
                    <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-widest w-2/3">Nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">Kode Barang</td>
                    <td className="px-4 py-3 flex gap-2">
                      <input
                        type="text"
                        readOnly
                        placeholder="Loaded from BOM..."
                        value={selectedBomDetail ? selectedBomDetail.finished_good_code : ""}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-slate-500"
                      />
                      <button type="button" className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center">
                        <Search size={14} />
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">Nama Barang</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        readOnly
                        placeholder="Loaded from BOM..."
                        value={selectedBomDetail ? selectedBomDetail.finished_good_name : ""}
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-slate-500"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">U/M</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        readOnly
                        placeholder="Pcs"
                        value={selectedBomDetail ? selectedBomDetail.finished_good_unit || "Pcs" : "Pcs"}
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-slate-500"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">Qty Jadi</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        readOnly
                        value={woTargetQty}
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-slate-500 text-center"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">Jumlah Master Biaya</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        readOnly
                        value={`Rp ${totalMasterCost.toLocaleString()}`}
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-slate-500"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">Harga Satuan</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        readOnly
                        value={`Rp ${(isNaN(hargaSatuanVal) || !isFinite(hargaSatuanVal) ? 0 : hargaSatuanVal).toLocaleString()}`}
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-slate-500"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-xs font-bold transition-all h-12"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleCreateWorkOrder}
              disabled={isSubmitting || !selectedBomDetail}
              className="px-8 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all h-12 shadow-lg shadow-orange-100 flex items-center gap-2"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Work Order"}
            </button>
          </div>

        </div>
      ) : selectedWo ? (
        /* ================= SELECTED WO DETAIL PANEL (FULL SCREEN) ================= */
        <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm p-8 space-y-8 animate-in fade-in duration-300 w-full">
          
          <div className="flex items-start justify-between border-b border-gray-100 pb-6 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-orange-100 text-orange-600 text-[9px] font-black rounded-full uppercase tracking-wider">
                  Detail Rencana Produksi
                </span>
                {(() => {
                  const detailedStatus = getWorkOrderDetailedStatus(selectedWo);
                  return (
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${detailedStatus.color}`}>
                      {detailedStatus.label}
                    </span>
                  );
                })()}
              </div>
              <h2 className="text-2xl font-black text-gray-900 mt-2">{selectedWo.reference}</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                <Calendar size={12} /> {selectedWo.date} | Langkah Selanjutnya: <span className="text-orange-600 font-extrabold">{getWorkOrderDetailedStatus(selectedWo).nextStep}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <PrintButton
                moduleKey="work_order"
                moduleName="Work Order"
                data={selectedWo}
              />
              <button 
                onClick={() => setSelectedWo(null)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              >
                <ArrowLeft size={12} /> Kembali ke List
              </button>
            </div>
          </div>

          {selectedWo.note && (
            <div className="bg-orange-50/30 border border-orange-100/50 p-4 rounded-2xl">
              <p className="text-xs font-black text-orange-600 uppercase tracking-widest">Catatan / Rencana Kerja</p>
              <p className="text-sm font-medium text-gray-700 mt-1">{selectedWo.note}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Produk perakitan</p>
              <p className="text-base font-black text-gray-800 mt-1">{selectedWo.product_name}</p>
              <p className="text-xs font-bold text-gray-500">{selectedWo.product_code}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target QTY</p>
              <p className="text-3xl font-black text-orange-600 mt-1">{Number(selectedWo.target_qty)}</p>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{selectedWo.product_unit || "Pcs"}</p>
            </div>
          </div>

          {selectedWo.pro && (
            <div className="grid grid-cols-2 gap-4 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50">
              <div>
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Mesin Yang Digunakan</p>
                <p className="text-sm font-black text-gray-800 mt-1">{selectedWo.pro.machine_id || "-"}</p>
                <p className="text-[10px] font-bold text-gray-500 mt-0.5">Kode PrO: {selectedWo.pro.pro_code}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Mold Cetakan</p>
                <p className="text-sm font-black text-gray-800 mt-1">{selectedWo.pro.mold_name || selectedWo.pro.mold_code || "-"}</p>
                <p className="text-[10px] font-bold text-gray-500 mt-0.5">Operator: {selectedWo.pro.operator_name || "-"}</p>
              </div>
            </div>
          )}

          {/* ─── WO LIFECYCLE ACTION PANEL ─────────────────────────────────── */}
          <div className="border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className={`px-5 py-4 font-black text-xs uppercase tracking-wider flex items-center justify-between ${
              selectedWo.status === 'Running' ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white' :
              selectedWo.status === 'Paused' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' :
              selectedWo.status === 'Completed' ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white' :
              'bg-gradient-to-r from-slate-700 to-slate-900 text-white'
            }`}>
              <div className="flex items-center gap-2">
                <Activity size={14} />
                <span>WO Control Panel — Run / Stop / Finish</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedWo.status)}
              </div>
            </div>

            <div className="p-5 space-y-4 bg-white">
              {/* Multi-MPP list with per-item finish */}
              {woLinkedMpps.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Item Produksi Terhubung (MPP)</p>
                  {woLinkedMpps.map((mpp: any) => (
                    <div key={mpp.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl">
                      <div>
                        <p className="text-xs font-black text-gray-800">{mpp.pro_code}</p>
                        <p className="text-[10px] font-bold text-gray-500">
                          Mesin: <span className="text-gray-700 font-black">{mpp.machine_id || "-"}</span>
                          {mpp.product_name && <> · {mpp.product_name}</>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* MPP Status Badge */}
                        <span className={`px-2.5 py-1 text-[9px] font-black rounded-full uppercase tracking-wider ${
                          mpp.status === 'Berjalan' ? 'bg-emerald-100 text-emerald-700 animate-pulse' :
                          mpp.status === 'Selesai' ? 'bg-gray-100 text-gray-500' :
                          mpp.status === 'Pause' ? 'bg-orange-100 text-orange-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>{mpp.status}</span>
                        {/* Finish per MPP item */}
                        {mpp.status !== 'Selesai' && selectedWo.status === 'Running' && (
                          <button
                            onClick={() => handleFinishMpp(mpp.id, selectedWo.id)}
                            disabled={woActionLoading}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95"
                          >
                            <CheckCircle2 size={10} /> Finish Item
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Main WO action buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                {/* START button — shown when Released or Paused */}
                {(selectedWo.status === 'Released' || selectedWo.status === 'Paused') && (
                  <button
                    onClick={() => handleStartWo(selectedWo.id)}
                    disabled={woActionLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-60"
                  >
                    {woActionLoading ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
                    {selectedWo.status === 'Paused' ? '▶ Resume WO' : '▶ Start WO'}
                  </button>
                )}

                {/* STOP/PAUSE button — shown when Running */}
                {selectedWo.status === 'Running' && (
                  <button
                    onClick={() => handleStopWo(selectedWo.id)}
                    disabled={woActionLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-orange-100 active:scale-95 disabled:opacity-60"
                  >
                    {woActionLoading ? <RefreshCw size={14} className="animate-spin" /> : <AlertCircle size={14} />}
                    ⏸ Stop / Pause WO
                  </button>
                )}

                {/* FINISH ALL button — shown when Running or Paused */}
                {(selectedWo.status === 'Running' || selectedWo.status === 'Paused') && (
                  <button
                    onClick={() => handleFinishWo(selectedWo.id)}
                    disabled={woActionLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-60"
                  >
                    {woActionLoading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    ✅ Selesaikan WO
                  </button>
                )}

                {selectedWo.status === 'Completed' && (
                  <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 text-gray-400 rounded-2xl text-xs font-black uppercase tracking-wider border border-gray-200">
                    <CheckCircle2 size={14} /> WO Sudah Selesai (Completed)
                  </div>
                )}
              </div>

              {selectedWo.status === 'Released' && (
                <p className="text-[10px] font-medium text-gray-400">
                  Tekan <strong>Start WO</strong> untuk memulai produksi. Status Mesin & MPP akan otomatis berubah menjadi Running/Berjalan.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-black text-gray-800 uppercase tracking-wider text-xs flex items-center gap-2">
                <Layers size={14} className="text-orange-500" /> Bill of Materials (Bahan Baku)
              </h3>
            </div>
            
            <div className="space-y-3">
              {selectedWo.materials?.map((m: any) => {
                const percent = Math.min(100, Math.round((Number(m.qty_issued) / Number(m.qty_required)) * 100));
                return (
                  <div key={m.id} className="border border-gray-100 p-4 rounded-2xl flex flex-col gap-2 hover:border-gray-200 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-gray-700 text-sm">{m.product_name}</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{m.product_code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-500">
                          Required: <span className="font-black text-gray-900">{Number(m.qty_required)}</span> {m.product_unit || "Pcs"}
                        </p>
                        <p className="text-xs font-bold text-gray-500">
                          Issued: <span className="font-black text-orange-600">{Number(m.qty_issued)}</span> {m.product_unit || "Pcs"}
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-1 flex">
                      <div 
                        className="bg-orange-500 h-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Material Issuances */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-black text-gray-800 uppercase tracking-wider text-xs flex items-center gap-2">
                <FileText size={14} className="text-blue-500" /> Perintah Pengeluaran Material
              </h3>
              {selectedWo.status !== "Completed" && (
                <button
                  onClick={openCreateIssuance}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  <Plus size={12} /> Buat Permintaan
                </button>
              )}
            </div>

            {selectedWo.issuances?.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-gray-200 rounded-2xl text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">
                Belum Ada Permintaan Pengeluaran
              </div>
            ) : (
              <div className="space-y-3">
                {selectedWo.issuances?.map((iss: any) => (
                  <div key={iss.id} className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <div className="bg-gray-50/50 p-4 flex justify-between items-center border-b border-gray-100">
                      <div>
                        <p className="font-black text-gray-800 text-sm">{iss.reference}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{iss.date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {iss.status === "Draft" ? (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black rounded-full uppercase tracking-wider">
                            Draft
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-0.5">
                            <CheckCircle2 size={8} /> Released
                          </span>
                        )}
                        {iss.status === "Draft" && (
                          <button
                            onClick={() => handleReleaseIssuance(iss.id)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-md shadow-blue-100"
                          >
                            <Send size={10} /> Release
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-4 bg-white space-y-2 divide-y divide-gray-50">
                      {iss.details?.map((det: any, dIdx: number) => (
                        <div key={dIdx} className="flex justify-between items-center py-2 text-xs">
                          <div>
                            <p className="font-bold text-gray-700">{det.product_name}</p>
                            {det.supplier_name && (
                              <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mt-0.5">
                                Vendor: {det.supplier_name}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-black text-gray-900">{Number(det.qty_to_issue)}</p>
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Qty Issued</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Real-time Stock Monitor Panel */}
          {selectedWo.status !== "Pending" && (
            <div className="border border-orange-100 rounded-3xl overflow-hidden shadow-md bg-white hover:shadow-lg transition-all duration-300 space-y-4 p-5 mt-6">
              <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-4 -mx-5 -mt-5 font-black text-xs uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={16} className="animate-pulse" />
                  <span>Monitoring Stok Real-time Area Produksi</span>
                </div>
                {realtimeStocksLoading && <RefreshCw size={14} className="animate-spin" />}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-wider">Stok Resin Utama (MATKOM)</p>
                    <h4 className="text-xl font-black text-slate-900 mt-1">
                      {(() => {
                        const r = stocksWh1.find(s => s.product_unit?.toUpperCase() === "KG" || s.product_code?.startsWith("EPPP"));
                        return r ? `${Number(r.qty_system).toFixed(2)}` : "0.00";
                      })()} <span className="text-xs font-bold text-slate-500">KG</span>
                    </h4>
                  </div>
                  <div className="p-3 bg-white rounded-xl shadow-sm text-orange-600"><Layers size={18} /></div>
                </div>

                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Stok Resin di Produksi (GPR)</p>
                    <h4 className="text-xl font-black text-slate-900 mt-1">
                      {(() => {
                        const r = stocksWh2.find(s => s.product_unit?.toUpperCase() === "KG" || s.product_code?.startsWith("EPPP"));
                        return r ? `${Number(r.qty_system).toFixed(2)}` : "0.00";
                      })()} <span className="text-xs font-bold text-slate-500">KG</span>
                    </h4>
                  </div>
                  <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600"><Layers size={18} /></div>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-wider">Item / Part</th>
                      <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-wider text-center">Gudang MATKOM (WH1)</th>
                      <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-wider text-center">Gudang GPR (WH2)</th>
                      <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-wider text-center">Gudang FG (WH3)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {selectedWo.materials?.map((m: any) => {
                      const wh1Qty = stocksWh1.find(s => String(s.product_id) === String(m.product_id))?.qty_system || 0;
                      const wh2Qty = stocksWh2.find(s => String(s.product_id) === String(m.product_id))?.qty_system || 0;
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/40">
                          <td className="px-4 py-2.5">
                            <p className="font-bold text-slate-800">{m.product_name}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase">{m.product_code}</p>
                          </td>
                          <td className="px-4 py-2.5 text-center font-black text-slate-900">{Number(wh1Qty).toLocaleString()} {m.product_unit || "Pcs"}</td>
                          <td className="px-4 py-2.5 text-center font-black text-blue-600">{Number(wh2Qty).toLocaleString()} {m.product_unit || "Pcs"}</td>
                          <td className="px-4 py-2.5 text-center text-slate-400">-</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-orange-50/20">
                      <td className="px-4 py-2.5">
                        <p className="font-black text-orange-700">{selectedWo.product_name} (FG/SFG)</p>
                        <p className="text-[9px] font-black text-orange-500 uppercase">{selectedWo.product_code}</p>
                      </td>
                      <td className="px-4 py-2.5 text-center text-slate-400">-</td>
                      <td className="px-4 py-2.5 text-center font-black text-blue-600">
                        {(() => {
                          const s = stocksWh2.find(s => String(s.product_id) === String(selectedWo.parent_product_id));
                          return s ? Number(s.qty_system).toLocaleString() : "0";
                        })()} {selectedWo.product_unit || "Pcs"}
                      </td>
                      <td className="px-4 py-2.5 text-center font-black text-emerald-600">
                        {(() => {
                          const s = stocksWh3.find(s => String(s.product_id) === String(selectedWo.parent_product_id));
                          return s ? Number(s.qty_system).toLocaleString() : "0";
                        })()} {selectedWo.product_unit || "Pcs"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}



        </div>
      ) : (
        /* ================= TABLE LIST VIEW (FULL SCREEN) ================= */
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px] flex flex-col w-full animate-in fade-in duration-300">
          
          <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari kode WO atau produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Referensi / Tanggal</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Produk Target</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">QTY</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Proses Selanjutnya</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-4"><div className="h-10 bg-gray-50 rounded-xl w-full"></div></td>
                    </tr>
                  ))
                ) : workOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center font-bold text-gray-400 uppercase tracking-widest text-sm bg-gray-50/30">
                      Tidak Ada Work Order
                    </td>
                  </tr>
                ) : workOrders.map((wo) => (
                  <tr 
                    key={wo.id} 
                    onClick={() => viewWoDetails(wo.id)}
                    className="cursor-pointer transition-colors hover:bg-gray-50/60"
                  >
                    <td className="px-6 py-4">
                      <div className="font-black text-gray-900 hover:text-orange-600 transition-colors text-sm">{wo.reference}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                        <Calendar size={10} /> {wo.date}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-700">{wo.product_name}</div>
                      <div className="text-xs font-black text-gray-400 uppercase tracking-wider">{wo.product_code}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="font-black text-gray-900">{Number(wo.target_qty)}</div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase">Target unit</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {(() => {
                          const detailedStatus = getWorkOrderDetailedStatus(wo);
                          return (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${detailedStatus.color}`}>
                                {detailedStatus.label}
                              </span>
                              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                                {detailedStatus.nextStep}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => viewWoDetails(wo.id)}
                          title="Lihat Detail"
                          className="p-2 bg-slate-50 hover:bg-orange-50 text-slate-500 hover:text-orange-600 rounded-xl transition-all"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleEditWo(wo.id)}
                          title="Edit Work Order"
                          className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-xl transition-all"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteWo(wo.id)}
                          title="Hapus Work Order"
                          className="p-2 bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={() => handlePrintWo(wo)}
                          title="Cetak Perintah Kerja"
                          className="p-2 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 rounded-xl transition-all"
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE MATERIAL ISSUANCE (Draft - original workflow) */}
      {isIssuanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl border border-gray-100 shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Perintah Pengeluaran Material (MATKOM)</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">Alokasikan stock spesifik per-vendor untuk perakitan</p>
                </div>
              </div>
              <button 
                onClick={() => setIsIssuanceModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                [X]
              </button>
            </div>

            {stocksLoading ? (
              <div className="text-center py-20 animate-pulse font-black text-gray-400 uppercase tracking-widest text-xs">
                Memuat Ketersediaan Stok Gudang MATKOM...
              </div>
            ) : (
              <form onSubmit={handleCreateIssuance} className="space-y-6">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tanggal Keluar</label>
                    <input
                      type="date"
                      value={issDate}
                      onChange={(e) => setIssDate(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Catatan / Penerima</label>
                    <input
                      type="text"
                      placeholder="Contoh: Shift 1 - Operator Budi"
                      value={issNote}
                      onChange={(e) => setIssNote(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all h-12"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider border-b border-gray-50 pb-2">
                    Alokasi Stok Vendor di MATKOM
                  </h4>

                  <div className="space-y-4">
                    {issDetails.map((det, idx) => {
                      const componentStocks = matkomStocks.filter(
                        (s) => String(s.product_id) === String(det.product_id)
                      );
                      const isMultiVendor = componentStocks.some(s => s.supplier_id !== null);

                      return (
                        <div key={idx} className="border border-gray-100 p-5 rounded-2xl space-y-4 hover:border-blue-200 transition-all bg-gray-50/20">
                          <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
                            <div>
                              <p className="font-black text-gray-800 text-sm">{det.product_name}</p>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{det.product_code}</p>
                            </div>
                            <div className="flex gap-4 text-xs font-bold text-gray-500">
                              <div>
                                Sisa kebutuhan WO: <span className="font-black text-gray-900">{Number(det.qty_required)} Pcs</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                {isMultiVendor ? "Pilih Vendor / Stok Khusus (MATKOM)" : "Stok Komponen Global"}
                              </label>
                              
                              {isMultiVendor ? (
                                <select
                                  value={det.supplier_id}
                                  onChange={(e) => handleIssuanceDetailChange(idx, "supplier_id", e.target.value)}
                                  required={det.qty_to_issue > 0}
                                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                >
                                  <option value="">-- Pilih Vendor (Stok MATKOM) --</option>
                                  {componentStocks.map((stockItem) => (
                                    <option key={stockItem.supplier_id} value={stockItem.supplier_id}>
                                      {stockItem.supplier_name} - Tersedia: {Number(stockItem.qty_system)} Pcs {stockItem.product_code ? `[Part: ${stockItem.product_code}]` : ""}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <div className="px-4 py-2.5 bg-gray-100 rounded-xl text-xs font-bold text-gray-500">
                                  {componentStocks.length > 0 
                                    ? `Global Stock (Gudang Utama): ${Number(componentStocks[0].qty_system)} Pcs`
                                    : "Tidak ada stock di MATKOM"}
                                </div>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">QTY Dikeluarkan</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  step="any"
                                  max={det.qty_required}
                                  value={det.qty_to_issue}
                                  onChange={(e) => handleIssuanceDetailChange(idx, "qty_to_issue", Number(e.target.value))}
                                  required
                                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-center h-[38px]"
                                />
                                <span className="text-xs font-bold text-gray-400 uppercase">Pcs</span>
                              </div>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsIssuanceModalOpen(false)}
                    className="px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-xs font-bold transition-all h-12"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all h-12 shadow-lg shadow-blue-100 flex items-center gap-2"
                  >
                    <FileCheck size={14} /> Simpan Draft Permintaan
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
