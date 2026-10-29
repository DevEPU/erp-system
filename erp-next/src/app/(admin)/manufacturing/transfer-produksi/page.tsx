"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  PackageCheck,
  Send,
  Wrench,
  Undo2,
  Flame,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  Boxes,
  FileCheck2,
  ShieldCheck,
  Plus,
  X,
  ClipboardCheck,
  Trash2,
  Layers,
  RotateCcw
} from "lucide-react";
import api from "@/lib/api";

type TabKey = "alur5" | "alur6" | "alur7" | "alur8" | "alur9";

function TransferProduksiContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active tab state (defaults to alur5 or query param)
  const [activeTab, setActiveTab] = useState<TabKey>("alur5");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Shared Data
  const [transfers, setTransfers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);

  // ==========================================
  // TAB 1: ALUR 5 (Store ke Produksi IN) States
  // ==========================================
  const [alur5Filter, setAlur5Filter] = useState("all");
  const [selectedTransferAlur5, setSelectedTransferAlur5] = useState<any | null>(null);
  const [isChecksheetModalOpenAlur5, setIsChecksheetModalOpenAlur5] = useState(false);
  const [receiverNameAlur5, setReceiverNameAlur5] = useState("");
  const [receivedDateAlur5, setReceivedDateAlur5] = useState(new Date().toISOString().split("T")[0]);
  const [shiftAlur5, setShiftAlur5] = useState("Shift 1");
  const [checkPackagingAlur5, setCheckPackagingAlur5] = useState(true);
  const [checkLabelAlur5, setCheckLabelAlur5] = useState(true);
  const [checkQuantityAlur5, setCheckQuantityAlur5] = useState(true);
  const [receiptNotesAlur5, setReceiptNotesAlur5] = useState("");
  const [itemQuantitiesAlur5, setItemQuantitiesAlur5] = useState<Record<number, number>>({});
  const [submittingAlur5, setSubmittingAlur5] = useState(false);

  // ==========================================
  // TAB 2: ALUR 6 (Produksi ke QC OUT) States
  // ==========================================
  const [isModalOpenAlur6, setIsModalOpenAlur6] = useState(false);
  const [selectedWoIdAlur6, setSelectedWoIdAlur6] = useState<string>("");
  const [selectedWoNumberAlur6, setSelectedWoNumberAlur6] = useState<string>("");
  const [transferDateAlur6, setTransferDateAlur6] = useState(new Date().toISOString().split("T")[0]);
  const [operatorNameAlur6, setOperatorNameAlur6] = useState("");
  const [shiftAlur6, setShiftAlur6] = useState("Shift 1");
  const [notesAlur6, setNotesAlur6] = useState("");
  const [itemsAlur6, setItemsAlur6] = useState<any[]>([]);
  const [productSearchAlur6, setProductSearchAlur6] = useState("");
  const [isDropdownOpenAlur6, setIsDropdownOpenAlur6] = useState(false);
  const [submittingAlur6, setSubmittingAlur6] = useState(false);

  // ==========================================
  // TAB 3: ALUR 7 (Terima Rework QC IN) States
  // ==========================================
  const [selectedTransferAlur7, setSelectedTransferAlur7] = useState<any | null>(null);
  const [isModalOpenAlur7, setIsModalOpenAlur7] = useState(false);
  const [operatorNameAlur7, setOperatorNameAlur7] = useState("");
  const [receivedDateAlur7, setReceivedDateAlur7] = useState(new Date().toISOString().split("T")[0]);
  const [reworkActionAlur7, setReworkActionAlur7] = useState("Deburring / Trimming Ulang");
  const [notesAlur7, setNotesAlur7] = useState("");
  const [submittingAlur7, setSubmittingAlur7] = useState(false);

  // ==========================================
  // TAB 4: ALUR 8 (Retur Sisa MATKOM OUT) States
  // ==========================================
  const [isModalOpenAlur8, setIsModalOpenAlur8] = useState(false);
  const [selectedWoIdAlur8, setSelectedWoIdAlur8] = useState<string>("");
  const [selectedWoNumberAlur8, setSelectedWoNumberAlur8] = useState<string>("");
  const [operatorNameAlur8, setOperatorNameAlur8] = useState("");
  const [returnDateAlur8, setReturnDateAlur8] = useState(new Date().toISOString().split("T")[0]);
  const [notesAlur8, setNotesAlur8] = useState("");
  const [itemsAlur8, setItemsAlur8] = useState<any[]>([]);
  const [productSearchAlur8, setProductSearchAlur8] = useState("");
  const [isDropdownOpenAlur8, setIsDropdownOpenAlur8] = useState(false);
  const [submittingAlur8, setSubmittingAlur8] = useState(false);

  // ==========================================
  // TAB 5: ALUR 9 (Kirim Crusher OUT) States
  // ==========================================
  const [isModalOpenAlur9, setIsModalOpenAlur9] = useState(false);
  const [operatorNameAlur9, setOperatorNameAlur9] = useState("");
  const [transferDateAlur9, setTransferDateAlur9] = useState(new Date().toISOString().split("T")[0]);
  const [notesAlur9, setNotesAlur9] = useState("");
  const [itemsAlur9, setItemsAlur9] = useState<any[]>([]);
  const [productSearchAlur9, setProductSearchAlur9] = useState("");
  const [isDropdownOpenAlur9, setIsDropdownOpenAlur9] = useState(false);
  const [submittingAlur9, setSubmittingAlur9] = useState(false);

  // Sync tab from URL
  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabKey;
    if (tabParam && ["alur5", "alur6", "alur7", "alur8", "alur9"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Fetch Data on Tab or Search change
  useEffect(() => {
    fetchTabData();
  }, [activeTab, search, alur5Filter]);

  const getTransferType = (tab: TabKey) => {
    switch (tab) {
      case "alur5":
        return "STORE_TO_PROD";
      case "alur6":
        return "PROD_TO_QC";
      case "alur7":
        return "QC_TO_PROD_REWORK";
      case "alur8":
        return "PROD_TO_MATKOM_RETURN";
      case "alur9":
        return "PROD_TO_CRUSHER";
    }
  };

  const fetchTabData = async () => {
    setLoading(true);
    try {
      const transferType = getTransferType(activeTab);
      const params: any = {
        transfer_type: transferType,
        search
      };
      if (activeTab === "alur5" && alur5Filter !== "all") {
        params.status = alur5Filter;
      }
      const res = await api.express.get("/internal-transfers", { params });
      setTransfers(res.data?.data || []);
    } catch (err) {
      console.error("Error fetching transfers for tab", activeTab, err);
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsAndWo = async () => {
    try {
      const [prodRes, woRes] = await Promise.all([
        api.express.get("/products", { params: { limit: 500 } }).catch(() => null),
        api.express.get("/manufacturing/work-orders").catch(() => null)
      ]);
      if (prodRes?.data?.data) setProducts(prodRes.data.data);
      if (woRes?.data?.data) {
        setWorkOrders(woRes.data.data.filter((w: any) => w.status !== "Completed"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ==========================================
  // HANDLERS ALUR 5: CHECKSHEET RECEIPT
  // ==========================================
  const openChecksheetModalAlur5 = (transfer: any) => {
    setSelectedTransferAlur5(transfer);
    const initialQty: Record<number, number> = {};
    if (transfer.items) {
      transfer.items.forEach((it: any) => {
        initialQty[it.id] = Number(it.qty_sent);
      });
    }
    setItemQuantitiesAlur5(initialQty);
    setReceiverNameAlur5("");
    setReceiptNotesAlur5("");
    setCheckPackagingAlur5(true);
    setCheckLabelAlur5(true);
    setCheckQuantityAlur5(true);
    setIsChecksheetModalOpenAlur5(true);
  };

  const handleConfirmReceiptAlur5 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransferAlur5) return;
    if (!receiverNameAlur5) {
      alert("Mohon isi nama operator / staff penerima.");
      return;
    }

    setSubmittingAlur5(true);
    try {
      const itemsPayload = selectedTransferAlur5.items.map((it: any) => ({
        id: it.id,
        qty_received: Number(itemQuantitiesAlur5[it.id] ?? it.qty_sent),
        qty_rejected: Number(it.qty_sent) - Number(itemQuantitiesAlur5[it.id] ?? it.qty_sent)
      }));

      const payload = {
        received_by: `${receiverNameAlur5} (${shiftAlur5})`,
        received_date: receivedDateAlur5,
        checksheet_data: {
          shift: shiftAlur5,
          packaging_sealed: checkPackagingAlur5,
          label_verified: checkLabelAlur5,
          quantity_verified: checkQuantityAlur5,
          notes: receiptNotesAlur5
        },
        notes: receiptNotesAlur5,
        items: itemsPayload
      };

      await api.express.post(`/internal-transfers/${selectedTransferAlur5.id}/receive`, payload);

      setIsChecksheetModalOpenAlur5(false);
      alert("Checksheet penerimaan bahan baku produksi berhasil disimpan dan stok telah diverifikasi!");
      fetchTabData();
    } catch (err: any) {
      console.error("Error confirming receipt:", err);
      alert(err.message || "Gagal mengonfirmasi penerimaan material.");
    } finally {
      setSubmittingAlur5(false);
    }
  };

  // ==========================================
  // HANDLERS ALUR 6: CREATE TRANSFER TO QC
  // ==========================================
  const handleOpenCreateAlur6 = () => {
    fetchProductsAndWo();
    setTransferDateAlur6(new Date().toISOString().split("T")[0]);
    setOperatorNameAlur6("");
    setItemsAlur6([]);
    setSelectedWoIdAlur6("");
    setSelectedWoNumberAlur6("");
    setNotesAlur6("");
    setIsModalOpenAlur6(true);
  };

  const handleCreateTransferAlur6 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itemsAlur6.length === 0) {
      alert("Mohon masukkan minimal 1 produk hasil produksi.");
      return;
    }
    setSubmittingAlur6(true);
    try {
      const payload = {
        transfer_type: "PROD_TO_QC",
        type_code: "PRD-QCG",
        from_warehouse_id: 2,
        to_warehouse_id: null,
        source_document_id: selectedWoIdAlur6 ? Number(selectedWoIdAlur6) : null,
        source_reference: selectedWoNumberAlur6 || null,
        transferred_by: `${operatorNameAlur6} (${shiftAlur6})`,
        transfer_date: transferDateAlur6,
        notes: notesAlur6 || `Serah terima hasil produksi ${selectedWoNumberAlur6 ? `[WO: ${selectedWoNumberAlur6}]` : ""} ke pos Quality Gate`,
        items: itemsAlur6.map(it => ({
          product_id: it.product_id,
          qty_sent: Number(it.qty_sent),
          package_type: it.package_type,
          package_count: Number(it.package_count),
          unit: it.unit
        }))
      };
      await api.express.post("/internal-transfers", payload);
      setIsModalOpenAlur6(false);
      alert("Slip serah-terima ke Quality Gate berhasil dibuat!");
      fetchTabData();
    } catch (err: any) {
      alert(err.message || "Gagal membuat slip serah terima.");
    } finally {
      setSubmittingAlur6(false);
    }
  };

  // ==========================================
  // HANDLERS ALUR 7: REWORK RECEIVE
  // ==========================================
  const handleConfirmReworkAlur7 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransferAlur7) return;
    setSubmittingAlur7(true);
    try {
      const payload = {
        received_by: operatorNameAlur7,
        received_date: receivedDateAlur7,
        notes: notesAlur7 ? `Rework: ${reworkActionAlur7}. ${notesAlur7}` : `Rework: ${reworkActionAlur7}`,
        checksheet_data: {
          rework_action: reworkActionAlur7,
          operator: operatorNameAlur7,
          received_date: receivedDateAlur7,
          notes: notesAlur7
        }
      };
      await api.express.post(`/internal-transfers/${selectedTransferAlur7.id}/receive`, payload);
      setIsModalOpenAlur7(false);
      alert("Penerimaan part rework berhasil dikonfirmasi!");
      fetchTabData();
    } catch (err: any) {
      alert(err.message || "Gagal konfirmasi rework.");
    } finally {
      setSubmittingAlur7(false);
    }
  };

  // ==========================================
  // HANDLERS ALUR 8: RETUR MATKOM CREATE
  // ==========================================
  const handleOpenCreateAlur8 = () => {
    fetchProductsAndWo();
    setReturnDateAlur8(new Date().toISOString().split("T")[0]);
    setOperatorNameAlur8("");
    setItemsAlur8([]);
    setSelectedWoIdAlur8("");
    setSelectedWoNumberAlur8("");
    setNotesAlur8("");
    setIsModalOpenAlur8(true);
  };

  const handleCreateTransferAlur8 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itemsAlur8.length === 0) {
      alert("Mohon masukkan minimal 1 material yang diretur.");
      return;
    }
    setSubmittingAlur8(true);
    try {
      const payload = {
        transfer_type: "PROD_TO_MATKOM_RETURN",
        type_code: "PRD-RET-MAT",
        from_warehouse_id: 2,
        to_warehouse_id: 1,
        source_document_id: selectedWoIdAlur8 ? Number(selectedWoIdAlur8) : null,
        source_reference: selectedWoNumberAlur8 || null,
        transferred_by: operatorNameAlur8,
        transfer_date: returnDateAlur8,
        notes: notesAlur8 || `Retur sisa material produksi ${selectedWoNumberAlur8 ? `[WO: ${selectedWoNumberAlur8}]` : ""}`,
        items: itemsAlur8.map(it => ({
          product_id: it.product_id,
          qty_sent: Number(it.qty_sent),
          package_type: it.package_type,
          package_count: Number(it.package_count),
          unit: it.unit
        }))
      };
      await api.express.post("/internal-transfers", payload);
      setIsModalOpenAlur8(false);
      alert("Slip retur sisa material berhasil dibuat!");
      fetchTabData();
    } catch (err: any) {
      alert(err.message || "Gagal membuat slip retur material.");
    } finally {
      setSubmittingAlur8(false);
    }
  };

  // ==========================================
  // HANDLERS ALUR 9: CRUSHER CREATE
  // ==========================================
  const handleOpenCreateAlur9 = () => {
    fetchProductsAndWo();
    setTransferDateAlur9(new Date().toISOString().split("T")[0]);
    setOperatorNameAlur9("");
    setItemsAlur9([]);
    setNotesAlur9("");
    setIsModalOpenAlur9(true);
  };

  const handleCreateTransferAlur9 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itemsAlur9.length === 0) {
      alert("Mohon masukkan minimal 1 item runner / scrap crusher.");
      return;
    }
    setSubmittingAlur9(true);
    try {
      const payload = {
        transfer_type: "PROD_TO_CRUSHER",
        type_code: "PRD-CRS",
        from_warehouse_id: 2,
        to_warehouse_id: 4,
        transferred_by: operatorNameAlur9,
        transfer_date: transferDateAlur9,
        notes: notesAlur9 || "Pengiriman sprue runner & part NG ke mesin crusher",
        items: itemsAlur9.map(it => ({
          product_id: it.product_id,
          qty_sent: Number(it.qty_sent),
          package_type: it.package_type,
          package_count: Number(it.package_count),
          unit: it.unit || "KG"
        }))
      };
      await api.express.post("/internal-transfers", payload);
      setIsModalOpenAlur9(false);
      alert("Slip kirim crusher berhasil dibuat!");
      fetchTabData();
    } catch (err: any) {
      alert(err.message || "Gagal membuat slip transfer crusher.");
    } finally {
      setSubmittingAlur9(false);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen animate-in fade-in duration-500">
      {/* Back button */}
      <button
        onClick={() => router.push("/manufacturing")}
        className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
      >
        <ArrowLeft size={14} /> Kembali ke Manufaktur
      </button>

      {/* Main Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-200">
              <PackageCheck className="text-white" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-700">
                  Shop Floor Hub
                </span>
                <h1 className="text-3xl font-black tracking-tight text-gray-900">
                  Serah-Terima Lantai Produksi
                </h1>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Pusat Dokumen & Checksheet Serah-Terima Material, Output, Rework, Sisa Bahan, dan Crusher
              </p>
            </div>
          </div>
        </div>

        {/* Top Header Action Buttons tailored to active tab */}
        {activeTab === "alur5" && (
          <button
            onClick={() => {
              if (transfers.length > 0) {
                const pending = transfers.find(t => t.status === "Pending") || transfers[0];
                openChecksheetModalAlur5(pending);
              } else {
                alert("Belum ada dokumen transfer bahan baku yang masuk dari Gudang Material (Store).");
              }
            }}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            Buka Form Checksheet Terima
          </button>
        )}

        {activeTab === "alur6" && (
          <button
            onClick={handleOpenCreateAlur6}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            Buat Slip Serah-Terima QC
          </button>
        )}

        {activeTab === "alur7" && (
          <button
            onClick={() => {
              if (transfers.length > 0) {
                const pending = transfers.find(t => t.status === "Pending") || transfers[0];
                setSelectedTransferAlur7(pending);
                setOperatorNameAlur7(pending.received_by || "");
                setNotesAlur7("");
                setIsModalOpenAlur7(true);
              } else {
                alert("Belum ada part rework yang masuk dari pos QC Gate.");
              }
            }}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-200 transition-all active:scale-95"
          >
            <Wrench size={16} strokeWidth={3} />
            Konfirmasi Terima Rework
          </button>
        )}

        {activeTab === "alur8" && (
          <button
            onClick={handleOpenCreateAlur8}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            Buat Pengembalian Material
          </button>
        )}

        {activeTab === "alur9" && (
          <button
            onClick={handleOpenCreateAlur9}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            Buat Kirim Crusher
          </button>
        )}
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200/80">
        <button
          onClick={() => { setActiveTab("alur5"); setSearch(""); }}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
            activeTab === "alur5"
              ? "bg-gray-900 text-white shadow-md shadow-gray-200"
              : "bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-gray-100"
          }`}
        >
          <PackageCheck size={16} className={activeTab === "alur5" ? "text-emerald-400" : "text-gray-400"} />
          <span>Store ke Produksi (IN)</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${activeTab === "alur5" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
            #5
          </span>
        </button>

        <button
          onClick={() => { setActiveTab("alur6"); setSearch(""); }}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
            activeTab === "alur6"
              ? "bg-gray-900 text-white shadow-md shadow-gray-200"
              : "bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-gray-100"
          }`}
        >
          <Send size={16} className={activeTab === "alur6" ? "text-indigo-400" : "text-gray-400"} />
          <span>Produksi ke QC Gate (OUT)</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${activeTab === "alur6" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
            #6
          </span>
        </button>

        <button
          onClick={() => { setActiveTab("alur7"); setSearch(""); }}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
            activeTab === "alur7"
              ? "bg-gray-900 text-white shadow-md shadow-gray-200"
              : "bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-gray-100"
          }`}
        >
          <Wrench size={16} className={activeTab === "alur7" ? "text-amber-400" : "text-gray-400"} />
          <span>Terima Part Rework (IN)</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${activeTab === "alur7" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
            #7
          </span>
        </button>

        <button
          onClick={() => { setActiveTab("alur8"); setSearch(""); }}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
            activeTab === "alur8"
              ? "bg-gray-900 text-white shadow-md shadow-gray-200"
              : "bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-gray-100"
          }`}
        >
          <Undo2 size={16} className={activeTab === "alur8" ? "text-rose-400" : "text-gray-400"} />
          <span>Retur Sisa ke MATKOM (OUT)</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${activeTab === "alur8" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
            #8
          </span>
        </button>

        <button
          onClick={() => { setActiveTab("alur9"); setSearch(""); }}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
            activeTab === "alur9"
              ? "bg-gray-900 text-white shadow-md shadow-gray-200"
              : "bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-gray-100"
          }`}
        >
          <Flame size={16} className={activeTab === "alur9" ? "text-purple-400" : "text-gray-400"} />
          <span>Kirim ke Crusher (OUT)</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${activeTab === "alur9" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
            #9
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VIEW FOR TAB ALUR 5: EXACT MATCH TO GAMBAR 2 (Store ke Produksi IN)      */}
      {/* ========================================================================= */}
      {activeTab === "alur5" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Sub-Header matching Gambar 2 */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200 shrink-0">
              <PackageCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                  Alur No. 5
                </span>
                <h2 className="text-2xl font-black tracking-tight text-gray-900">
                  Store ke Produksi <span className="text-emerald-600">(IN)</span>
                </h2>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                Checksheet Verifikasi Serah-Terima Bahan Baku dari Gudang Material ke Lantai Produksi
              </p>
            </div>
          </div>

          {/* Search Bar & Filter Buttons matching Gambar 2 */}
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari nomor slip transfer, referensi, atau catatan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setAlur5Filter("all")}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  alur5Filter === "all"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                Semua Status
              </button>
              <button
                type="button"
                onClick={() => setAlur5Filter("Pending")}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  alur5Filter === "Pending"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                Menunggu Penerimaan
              </button>
              <button
                type="button"
                onClick={() => setAlur5Filter("Received")}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  alur5Filter === "Received"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                Selesai Diterima
              </button>
            </div>
          </div>

          {/* Table matching Gambar 2 */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">No. Dokumen / Tanggal</th>
                    <th className="px-6 py-4">Asal $\rightarrow$ Tujuan</th>
                    <th className="px-6 py-4">Detail Bahan & Kemasan</th>
                    <th className="px-6 py-4 text-center">Petugas Serah-Terima</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Aksi Checksheet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={6} className="px-6 py-6"><div className="h-8 bg-gray-100 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : transfers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                        Belum ada dokumen pengiriman bahan baku yang menunggu penerimaan di produksi.
                      </td>
                    </tr>
                  ) : (
                    transfers.map((trf) => (
                      <tr key={trf.id} className="hover:bg-emerald-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900 text-sm group-hover:text-emerald-600 transition-colors">
                              {trf.reference_no}
                            </span>
                            {trf.source_reference && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                                WO: {trf.source_reference}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold mt-0.5 flex items-center gap-1">
                            <Calendar size={10} /> {trf.transfer_date}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-700">
                          <span className="text-indigo-600 font-bold">{trf.from_warehouse_name || "Gudang Material (MATKOM)"}</span>
                          <span className="mx-1.5 text-gray-400">$\rightarrow$</span>
                          <span className="text-emerald-600 font-bold">{trf.to_warehouse_name || "Gudang Produksi (PROD)"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {trf.items?.map((it: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="font-extrabold text-gray-800">{it.product_name}</span>
                                <span className="text-[10px] font-black px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                  {it.qty_sent} {it.unit || "PCS"}
                                </span>
                                {it.package_type && (
                                  <span className="text-[10px] font-bold text-gray-400">
                                    ({it.package_count} {it.package_type})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="font-semibold text-gray-800">{trf.transferred_by || "-"}</div>
                          {trf.received_by && (
                            <div className="text-[10px] text-emerald-600 font-bold">Diterima: {trf.received_by}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                            trf.status === "Received"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : "bg-amber-50 text-amber-600 border border-amber-200 animate-pulse"
                          }`}>
                            {trf.status === "Received" ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                            {trf.status === "Received" ? "Diterima (Verified)" : "Menunggu Checksheet"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {trf.status === "Received" ? (
                            <button
                              onClick={() => openChecksheetModalAlur5(trf)}
                              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-all inline-flex items-center gap-1.5"
                            >
                              <ClipboardCheck size={14} /> Lihat Checksheet
                            </button>
                          ) : (
                            <button
                              onClick={() => openChecksheetModalAlur5(trf)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-md shadow-emerald-200 transition-all active:scale-95 inline-flex items-center gap-1.5"
                            >
                              <FileCheck2 size={14} /> Konfirmasi Penerimaan
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW FOR TAB ALUR 6: PRODUKSI KE QUALITY GATE (OUT)                       */}
      {/* ========================================================================= */}
      {activeTab === "alur6" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
              <Send size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700">
                  Alur No. 6
                </span>
                <h2 className="text-2xl font-black tracking-tight text-gray-900">
                  Produksi ke Quality Gate <span className="text-indigo-600">(OUT)</span>
                </h2>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                Dokumen Serah-Terima Pengiriman Output Produksi untuk Diperiksa di Pos QC Gate
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari referensi serah terima atau part..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">No. Serah-Terima / Tanggal</th>
                    <th className="px-6 py-4">Pengirim (Produksi)</th>
                    <th className="px-6 py-4">Part / Produk Diserahkan</th>
                    <th className="px-6 py-4 text-center">Status di QC Gate</th>
                    <th className="px-6 py-4 text-center">Penerima QC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="px-6 py-6"><div className="h-8 bg-gray-100 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : transfers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                        Belum ada dokumen serah terima output produksi ke QC Gate.
                      </td>
                    </tr>
                  ) : (
                    transfers.map((trf) => (
                      <tr key={trf.id} className="hover:bg-indigo-50/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900 text-sm">{trf.reference_no}</span>
                            {trf.source_reference && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                                WO: {trf.source_reference}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold mt-0.5 flex items-center gap-1">
                            <Calendar size={10} /> {trf.transfer_date}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-800">{trf.transferred_by || "-"}</td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {trf.items?.map((it: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="font-extrabold text-gray-800">{it.product_name}</span>
                                <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded">
                                  {it.qty_sent} {it.unit || "PCS"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                            trf.status === "Received"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : "bg-amber-50 text-amber-600 border border-amber-200 animate-pulse"
                          }`}>
                            {trf.status === "Received" ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                            {trf.status === "Received" ? "Lolos & Diterima QC" : "Menunggu Pemeriksaan"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-gray-700">
                          {trf.received_by || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW FOR TAB ALUR 7: TERIMA PART REWORK DARI QC (IN)                      */}
      {/* ========================================================================= */}
      {activeTab === "alur7" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-200 shrink-0">
              <Wrench size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                  Alur No. 7
                </span>
                <h2 className="text-2xl font-black tracking-tight text-gray-900">
                  Terima Part Rework dari QC <span className="text-amber-600">(IN)</span>
                </h2>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                Penerimaan Part Reject Perbaikan dari QC Gate ke Workstation Rework Produksi
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari referensi part rework atau WO..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">No. Dokumen / Tanggal</th>
                    <th className="px-6 py-4">Referensi WO</th>
                    <th className="px-6 py-4">Part & Qty Rework</th>
                    <th className="px-6 py-4">Catatan Defect QC</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Aksi Penerimaan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={6} className="px-6 py-6"><div className="h-8 bg-gray-100 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : transfers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                        Belum ada part rework yang dikembalikan dari QC Gate.
                      </td>
                    </tr>
                  ) : (
                    transfers.map((trf) => (
                      <tr key={trf.id} className="hover:bg-amber-50/20 transition-colors">
                        <td className="px-6 py-4 font-black text-gray-900">{trf.reference_no}</td>
                        <td className="px-6 py-4 font-bold text-blue-700">{trf.source_reference || "-"}</td>
                        <td className="px-6 py-4">
                          {trf.items?.map((it: any, idx: number) => (
                            <div key={idx} className="font-extrabold text-gray-800">
                              {it.product_name} ({it.qty_sent} {it.unit || "PCS"})
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-medium">{trf.notes || "-"}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                            trf.status === "Received"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : "bg-amber-50 text-amber-600 border border-amber-200"
                          }`}>
                            {trf.status === "Received" ? "Diterima Rework" : "Menunggu Diterima"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {trf.status !== "Received" && (
                            <button
                              onClick={() => {
                                setSelectedTransferAlur7(trf);
                                setOperatorNameAlur7("");
                                setNotesAlur7("");
                                setIsModalOpenAlur7(true);
                              }}
                              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs shadow-md shadow-amber-200"
                            >
                              Konfirmasi Terima
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW FOR TAB ALUR 8: RETUR SISA BAHAN KE MATKOM (OUT)                      */}
      {/* ========================================================================= */}
      {activeTab === "alur8" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-200 shrink-0">
              <Undo2 size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700">
                  Alur No. 8
                </span>
                <h2 className="text-2xl font-black tracking-tight text-gray-900">
                  Retur Sisa Bahan ke MATKOM <span className="text-rose-600">(OUT)</span>
                </h2>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                Pengembalian Sisa Resin / Pigmen / Komponen Berlebih ke Gudang Material
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari slip retur material..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-500/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">No. Slip / Tanggal</th>
                    <th className="px-6 py-4">Referensi WO</th>
                    <th className="px-6 py-4">Material Diretur</th>
                    <th className="px-6 py-4">Operator Pengembali</th>
                    <th className="px-6 py-4 text-center">Status di Gudang Material</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="px-6 py-6"><div className="h-8 bg-gray-100 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : transfers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                        Belum ada dokumen pengembalian sisa material ke Gudang Material.
                      </td>
                    </tr>
                  ) : (
                    transfers.map((trf) => (
                      <tr key={trf.id} className="hover:bg-rose-50/20 transition-colors">
                        <td className="px-6 py-4 font-black text-gray-900">{trf.reference_no}</td>
                        <td className="px-6 py-4 font-bold text-blue-700">{trf.source_reference || "-"}</td>
                        <td className="px-6 py-4">
                          {trf.items?.map((it: any, idx: number) => (
                            <div key={idx} className="font-extrabold text-gray-800">
                              {it.product_name} ({it.qty_sent} {it.unit || "KG"})
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-700">{trf.transferred_by || "-"}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                            trf.status === "Received"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : "bg-amber-50 text-amber-600 border border-amber-200 animate-pulse"
                          }`}>
                            {trf.status === "Received" ? "Diterima Gudang" : "Menunggu Diterima"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW FOR TAB ALUR 9: KIRIM RUNNER/NG KE CRUSHER (OUT)                      */}
      {/* ========================================================================= */}
      {activeTab === "alur9" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-200 shrink-0">
              <Flame size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700">
                  Alur No. 9
                </span>
                <h2 className="text-2xl font-black tracking-tight text-gray-900">
                  Kirim Runner & NG ke Crusher <span className="text-purple-600">(OUT)</span>
                </h2>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                Serah Terima Sisa Sprue/Runner & Part NG Moulding ke Mesin Crusher untuk Digiling Ulang
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari slip pengiriman crusher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">No. Slip / Tanggal</th>
                    <th className="px-6 py-4">Detail Runner / Part NG</th>
                    <th className="px-6 py-4">Operator Pengirim</th>
                    <th className="px-6 py-4">Catatan Penggilingan</th>
                    <th className="px-6 py-4 text-center">Status di Crusher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="px-6 py-6"><div className="h-8 bg-gray-100 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : transfers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                        Belum ada dokumen pengiriman material ke mesin crusher.
                      </td>
                    </tr>
                  ) : (
                    transfers.map((trf) => (
                      <tr key={trf.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="px-6 py-4 font-black text-gray-900">{trf.reference_no}</td>
                        <td className="px-6 py-4">
                          {trf.items?.map((it: any, idx: number) => (
                            <div key={idx} className="font-extrabold text-gray-800">
                              {it.product_name} ({it.qty_sent} {it.unit || "KG"})
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-700">{trf.transferred_by || "-"}</td>
                        <td className="px-6 py-4 text-gray-600">{trf.notes || "-"}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                            trf.status === "Received"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : "bg-amber-50 text-amber-600 border border-amber-200"
                          }`}>
                            {trf.status === "Received" ? "Selesai Dicrusher" : "Menunggu Crusher"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CHECKSHEET PENERIMAAN ALUR 5                                     */}
      {/* ========================================================================= */}
      {isChecksheetModalOpenAlur5 && selectedTransferAlur5 && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl border border-gray-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-4 border-b border-gray-100 flex justify-between items-center shrink-0 bg-emerald-50/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Checksheet Penerimaan Bahan Baku Produksi</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">
                    No. Dokumen: <span className="text-emerald-600 font-extrabold">{selectedTransferAlur5.reference_no}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsChecksheetModalOpenAlur5(false)}
                className="p-2 rounded-full hover:bg-white text-gray-400 hover:text-gray-700 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmReceiptAlur5} className="p-8 pt-4 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tanggal Terima</label>
                  <input
                    type="date"
                    value={receivedDateAlur5}
                    onChange={(e) => setReceivedDateAlur5(e.target.value)}
                    required
                    disabled={selectedTransferAlur5.status === "Received"}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nama Penerima (Produksi)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Budi Santoso (Leader Shift)"
                    value={selectedTransferAlur5.status === "Received" ? selectedTransferAlur5.received_by : receiverNameAlur5}
                    onChange={(e) => setReceiverNameAlur5(e.target.value)}
                    required
                    disabled={selectedTransferAlur5.status === "Received"}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Shift Kerja</label>
                  <select
                    value={shiftAlur5}
                    onChange={(e) => setShiftAlur5(e.target.value)}
                    disabled={selectedTransferAlur5.status === "Received"}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Shift 1">Shift 1 (Pagi)</option>
                    <option value="Shift 2">Shift 2 (Siang)</option>
                    <option value="Shift 3">Shift 3 (Malam)</option>
                  </select>
                </div>
              </div>

              <div className="bg-emerald-50/40 border border-emerald-100 p-5 rounded-2xl space-y-3">
                <p className="text-xs font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1.5">
                  <ClipboardCheck size={14} /> Verifikasi Kondisi Fisik Serah-Terima
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-emerald-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkPackagingAlur5}
                      onChange={(e) => setCheckPackagingAlur5(e.target.checked)}
                      disabled={selectedTransferAlur5.status === "Received"}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-gray-700">Kemasan & Segel Utuh</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-emerald-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkLabelAlur5}
                      onChange={(e) => setCheckLabelAlur5(e.target.checked)}
                      disabled={selectedTransferAlur5.status === "Received"}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-gray-700">Lot & Identitas Sesuai</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-emerald-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkQuantityAlur5}
                      onChange={(e) => setCheckQuantityAlur5(e.target.checked)}
                      disabled={selectedTransferAlur5.status === "Received"}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-gray-700">Jumlah Aktual Pas</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  Verifikasi Kuantitas Bahan per Item
                </label>
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase">
                        <th className="px-4 py-3">Nama Produk / Material</th>
                        <th className="px-4 py-3 text-center">QTY Kirim Store</th>
                        <th className="px-4 py-3 text-center" style={{ width: "160px" }}>QTY Diterima Produksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {selectedTransferAlur5.items?.map((it: any) => (
                        <tr key={it.id}>
                          <td className="px-4 py-3">
                            <p className="font-extrabold text-gray-900">{it.product_name}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{it.product_code}</p>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-gray-600">
                            {it.qty_sent} {it.unit || "PCS"}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={selectedTransferAlur5.status === "Received" ? it.qty_received : (itemQuantitiesAlur5[it.id] ?? it.qty_sent)}
                              onChange={(e) => setItemQuantitiesAlur5({ ...itemQuantitiesAlur5, [it.id]: Number(e.target.value) })}
                              disabled={selectedTransferAlur5.status === "Received"}
                              min={0}
                              max={it.qty_sent}
                              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-center font-black outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Catatan / Temuan Checksheet</label>
                <input
                  type="text"
                  placeholder="Keterangan tambahan jika ada kemasan rusak atau selisih..."
                  value={receiptNotesAlur5}
                  onChange={(e) => setReceiptNotesAlur5(e.target.value)}
                  disabled={selectedTransferAlur5.status === "Received"}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsChecksheetModalOpenAlur5(false)}
                  className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all"
                >
                  Tutup
                </button>
                {selectedTransferAlur5.status !== "Received" && (
                  <button
                    type="submit"
                    disabled={submittingAlur5}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <FileCheck2 size={14} />
                    {submittingAlur5 ? "Menyimpan..." : "Simpan Checksheet & Verifikasi Stok"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: BUAT SLIP SERAH-TERIMA ALUR 6                                    */}
      {/* ========================================================================= */}
      {isModalOpenAlur6 && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl border border-gray-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-4 border-b border-gray-100 flex justify-between items-center shrink-0 bg-indigo-50/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                  <Send size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Buat Serah-Terima ke Quality Gate</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">Alur No. 6: Produksi ke QC Gate (OUT)</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpenAlur6(false)}
                className="p-2 rounded-full hover:bg-white text-gray-400 hover:text-gray-700 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTransferAlur6} className="p-8 pt-4 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tanggal Kirim</label>
                  <input
                    type="date"
                    value={transferDateAlur6}
                    onChange={(e) => setTransferDateAlur6(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Operator Pengirim</label>
                  <input
                    type="text"
                    placeholder="Nama Operator / Leader"
                    value={operatorNameAlur6}
                    onChange={(e) => setOperatorNameAlur6(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Shift</label>
                  <select
                    value={shiftAlur6}
                    onChange={(e) => setShiftAlur6(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Shift 1">Shift 1 (Pagi)</option>
                    <option value="Shift 2">Shift 2 (Siang)</option>
                    <option value="Shift 3">Shift 3 (Malam)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Referensi Work Order (Opsional)</label>
                <select
                  value={selectedWoIdAlur6}
                  onChange={(e) => {
                    setSelectedWoIdAlur6(e.target.value);
                    const found = workOrders.find(w => String(w.id) === e.target.value);
                    setSelectedWoNumberAlur6(found?.reference || "");
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih Work Order yang bersangkutan --</option>
                  {workOrders.map((wo) => (
                    <option key={wo.id} value={wo.id}>
                      {wo.reference} - {wo.parent_product?.product_name || "Produk"} ({wo.target_qty} PCS)
                    </option>
                  ))}
                </select>
              </div>

              {/* Tambah Item Produk */}
              <div className="space-y-3">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Pilih Part / Produk yang Diserahkan</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ketik kode atau nama produk untuk menambah..."
                    value={productSearchAlur6}
                    onChange={(e) => { setProductSearchAlur6(e.target.value); setIsDropdownOpenAlur6(true); }}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {isDropdownOpenAlur6 && productSearchAlur6 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto">
                      {products
                        .filter(p => p.product_name?.toLowerCase().includes(productSearchAlur6.toLowerCase()) || p.product_code?.toLowerCase().includes(productSearchAlur6.toLowerCase()))
                        .slice(0, 10)
                        .map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setItemsAlur6([
                                ...itemsAlur6,
                                {
                                  product_id: p.id,
                                  product_name: p.product_name,
                                  product_code: p.product_code,
                                  unit: p.unit || "PCS",
                                  qty_sent: 100,
                                  package_type: "Keranjang",
                                  package_count: 1
                                }
                              ]);
                              setProductSearchAlur6("");
                              setIsDropdownOpenAlur6(false);
                            }}
                            className="p-3 hover:bg-indigo-50 cursor-pointer text-xs border-b border-gray-50 flex justify-between items-center"
                          >
                            <div>
                              <p className="font-extrabold text-gray-900">{p.product_name}</p>
                              <p className="text-[10px] text-gray-400 font-bold">{p.product_code}</p>
                            </div>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-black">+ Tambah</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  {itemsAlur6.map((it, idx) => (
                    <div key={idx} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between gap-3 text-xs">
                      <div className="flex-1">
                        <p className="font-black text-gray-900">{it.product_name}</p>
                        <p className="text-[10px] text-gray-400 font-bold">{it.product_code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-gray-400">Qty:</label>
                        <input
                          type="number"
                          value={it.qty_sent}
                          onChange={(e) => {
                            const copy = [...itemsAlur6];
                            copy[idx].qty_sent = Number(e.target.value);
                            setItemsAlur6(copy);
                          }}
                          className="w-20 px-2 py-1 bg-white border border-gray-200 rounded-lg text-center font-black"
                        />
                        <span className="text-[10px] font-bold text-gray-500">{it.unit}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setItemsAlur6(itemsAlur6.filter((_, i) => i !== idx))}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Catatan Tambahan</label>
                <input
                  type="text"
                  placeholder="Nomor cavity, kondisi lot, dsb..."
                  value={notesAlur6}
                  onChange={(e) => setNotesAlur6(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpenAlur6(false)}
                  className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingAlur6}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submittingAlur6 ? "Menyimpan..." : "Kirim Serah-Terima ke QC"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: KONFIRMASI TERIMA REWORK ALUR 7                                  */}
      {/* ========================================================================= */}
      {isModalOpenAlur7 && selectedTransferAlur7 && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg border border-gray-100 shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-black text-gray-900">Konfirmasi Terima Part Rework</h3>
            <p className="text-xs text-gray-500 font-medium">
              No. Slip: <span className="font-bold text-gray-900">{selectedTransferAlur7.reference_no}</span>
            </p>
            <form onSubmit={handleConfirmReworkAlur7} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Nama Operator Rework</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Operator Penanggungjawab"
                  value={operatorNameAlur7}
                  onChange={(e) => setOperatorNameAlur7(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-xs font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Rencana Tindakan Rework</label>
                <select
                  value={reworkActionAlur7}
                  onChange={(e) => setReworkActionAlur7(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-xs font-semibold"
                >
                  <option value="Deburring / Trimming Ulang">Deburring / Trimming Ulang (Flash/Burry)</option>
                  <option value="Pemanasan & Pelurusan">Pemanasan & Pelurusan (Bending/Warping)</option>
                  <option value="Pembersihan Permukaan">Pembersihan Permukaan (Oil/Contamination)</option>
                  <option value="Perakitan Ulang">Perakitan / Re-Assembly Ulang</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Catatan Pelaksanaan</label>
                <input
                  type="text"
                  placeholder="Catatan tambahan..."
                  value={notesAlur7}
                  onChange={(e) => setNotesAlur7(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-xs font-semibold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpenAlur7(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingAlur7}
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-black shadow-md shadow-amber-200"
                >
                  {submittingAlur7 ? "Memproses..." : "Konfirmasi Terima Rework"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: BUAT RETUR SISA MATKOM ALUR 8                                    */}
      {/* ========================================================================= */}
      {isModalOpenAlur8 && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl border border-gray-100 shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-black text-gray-900">Buat Pengembalian Sisa Bahan ke MATKOM</h3>
            <form onSubmit={handleCreateTransferAlur8} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600">Tanggal</label>
                  <input
                    type="date"
                    value={returnDateAlur8}
                    onChange={(e) => setReturnDateAlur8(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600">Operator Pengembali</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Operator / Leader"
                    value={operatorNameAlur8}
                    onChange={(e) => setOperatorNameAlur8(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600">Work Order Sumber</label>
                <select
                  value={selectedWoIdAlur8}
                  onChange={(e) => {
                    setSelectedWoIdAlur8(e.target.value);
                    const found = workOrders.find(w => String(w.id) === e.target.value);
                    setSelectedWoNumberAlur8(found?.reference || "");
                  }}
                  className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-xs font-semibold"
                >
                  <option value="">-- Pilih WO Sumber --</option>
                  {workOrders.map(w => (
                    <option key={w.id} value={w.id}>{w.reference} - {w.parent_product?.product_name || "Produk"}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600">Pilih Material / Pigmen</label>
                <input
                  type="text"
                  placeholder="Ketik nama material..."
                  value={productSearchAlur8}
                  onChange={(e) => { setProductSearchAlur8(e.target.value); setIsDropdownOpenAlur8(true); }}
                  className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-xs font-semibold"
                />
                {isDropdownOpenAlur8 && productSearchAlur8 && (
                  <div className="border rounded-xl mt-1 max-h-36 overflow-y-auto bg-white shadow-lg">
                    {products
                      .filter(p => p.product_name?.toLowerCase().includes(productSearchAlur8.toLowerCase()))
                      .slice(0, 8)
                      .map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setItemsAlur8([...itemsAlur8, { product_id: p.id, product_name: p.product_name, qty_sent: 5, unit: p.unit || "KG" }]);
                            setProductSearchAlur8("");
                            setIsDropdownOpenAlur8(false);
                          }}
                          className="p-2 hover:bg-rose-50 cursor-pointer text-xs flex justify-between"
                        >
                          <span className="font-bold">{p.product_name}</span>
                          <span className="text-rose-600 font-bold">+ Tambah</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {itemsAlur8.map((it, idx) => (
                  <div key={idx} className="p-2.5 bg-gray-50 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <span className="font-black text-gray-800 flex-1">{it.product_name}</span>
                    <input
                      type="number"
                      value={it.qty_sent}
                      onChange={(e) => {
                        const copy = [...itemsAlur8];
                        copy[idx].qty_sent = Number(e.target.value);
                        setItemsAlur8(copy);
                      }}
                      className="w-20 px-2 py-1 bg-white border rounded text-center font-bold"
                    />
                    <span className="font-bold text-gray-500">{it.unit}</span>
                    <button type="button" onClick={() => setItemsAlur8(itemsAlur8.filter((_, i) => i !== idx))} className="text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpenAlur8(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold">
                  Batal
                </button>
                <button type="submit" disabled={submittingAlur8} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black shadow-md shadow-rose-200">
                  {submittingAlur8 ? "Menyimpan..." : "Kirim Retur Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: BUAT TRANSFER CRUSHER ALUR 9                                     */}
      {/* ========================================================================= */}
      {isModalOpenAlur9 && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl border border-gray-100 shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-black text-gray-900">Buat Pengiriman ke Mesin Crusher</h3>
            <form onSubmit={handleCreateTransferAlur9} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600">Tanggal</label>
                  <input
                    type="date"
                    value={transferDateAlur9}
                    onChange={(e) => setTransferDateAlur9(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600">Operator Pengirim</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Operator / Helper"
                    value={operatorNameAlur9}
                    onChange={(e) => setOperatorNameAlur9(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600">Pilih Part / Jenis Resin Crusher</label>
                <input
                  type="text"
                  placeholder="Ketik nama part atau material..."
                  value={productSearchAlur9}
                  onChange={(e) => { setProductSearchAlur9(e.target.value); setIsDropdownOpenAlur9(true); }}
                  className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-xs font-semibold"
                />
                {isDropdownOpenAlur9 && productSearchAlur9 && (
                  <div className="border rounded-xl mt-1 max-h-36 overflow-y-auto bg-white shadow-lg">
                    {products
                      .filter(p => p.product_name?.toLowerCase().includes(productSearchAlur9.toLowerCase()))
                      .slice(0, 8)
                      .map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setItemsAlur9([...itemsAlur9, { product_id: p.id, product_name: `Runner / Scrap - ${p.product_name}`, qty_sent: 10, unit: "KG" }]);
                            setProductSearchAlur9("");
                            setIsDropdownOpenAlur9(false);
                          }}
                          className="p-2 hover:bg-purple-50 cursor-pointer text-xs flex justify-between"
                        >
                          <span className="font-bold">{p.product_name}</span>
                          <span className="text-purple-600 font-bold">+ Tambah Runner</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {itemsAlur9.map((it, idx) => (
                  <div key={idx} className="p-2.5 bg-gray-50 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <span className="font-black text-gray-800 flex-1">{it.product_name}</span>
                    <input
                      type="number"
                      value={it.qty_sent}
                      onChange={(e) => {
                        const copy = [...itemsAlur9];
                        copy[idx].qty_sent = Number(e.target.value);
                        setItemsAlur9(copy);
                      }}
                      className="w-20 px-2 py-1 bg-white border rounded text-center font-bold"
                    />
                    <span className="font-bold text-gray-500">{it.unit}</span>
                    <button type="button" onClick={() => setItemsAlur9(itemsAlur9.filter((_, i) => i !== idx))} className="text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpenAlur9(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold">
                  Batal
                </button>
                <button type="submit" disabled={submittingAlur9} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-black shadow-md shadow-purple-200">
                  {submittingAlur9 ? "Menyimpan..." : "Kirim ke Crusher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TransferProduksiHubPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400 font-bold">Memuat Serah-Terima Lantai Produksi...</div>}>
      <TransferProduksiContent />
    </Suspense>
  );
}
