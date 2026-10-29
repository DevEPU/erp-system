"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileSearch,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  ClipboardCheck,
  RotateCcw,
  Trash2,
  Check,
  X,
  Flame,
  Package,
  Layers,
  Plus,
  Minus,
  AlertTriangle,
  Truck
} from "lucide-react";
import api from "@/lib/api";

type Tab = "transfers" | "claims";

export default function QcClaimInvestigasiPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("claims");

  // ===== Claims Tab State =====
  const [claims, setClaims] = useState<any[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [claimsSearch, setClaimsSearch] = useState("");

  // Investigation modal state
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [isInvestigateOpen, setIsInvestigateOpen] = useState(false);
  const [investigationItems, setInvestigationItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [investigateSubmitting, setInvestigateSubmitting] = useState(false);

  // ===== Transfers Tab State =====
  const [transfers, setTransfers] = useState<any[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(true);
  const [transfersSearch, setTransfersSearch] = useState("");
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inspectorName, setInspectorName] = useState("");
  const [disposition, setDisposition] = useState("REWORK_PROD");
  const [rootCause, setRootCause] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ===== Fetch Claims =====
  const fetchClaims = useCallback(async () => {
    setClaimsLoading(true);
    try {
      const res = await api.express.get("/manufacturing/customer-claims");
      let data = res.data.data || [];
      if (claimsSearch) {
        const s = claimsSearch.toLowerCase();
        data = data.filter((c: any) =>
          (c.claim_code || "").toLowerCase().includes(s) ||
          (c.customer_name || "").toLowerCase().includes(s) ||
          (c.product_name || "").toLowerCase().includes(s)
        );
      }
      setClaims(data);
    } catch (err) {
      console.error("Error fetching claims:", err);
    } finally {
      setClaimsLoading(false);
    }
  }, [claimsSearch]);

  // ===== Fetch Transfers =====
  const fetchTransfers = useCallback(async () => {
    setTransfersLoading(true);
    try {
      const res = await api.express.get("/internal-transfers", {
        params: { transfer_type: "FG_TO_QC_CLAIM", search: transfersSearch }
      });
      setTransfers(res.data.data || []);
    } catch (err) {
      console.error("Error fetching claim transfers to QC:", err);
    } finally {
      setTransfersLoading(false);
    }
  }, [transfersSearch]);

  useEffect(() => {
    if (activeTab === "claims") fetchClaims();
    else fetchTransfers();
  }, [activeTab, fetchClaims, fetchTransfers]);

  // ===== Investigation Functions =====
  const fetchProducts = async () => {
    try {
      const res = await api.express.get("/products", { params: { limit: 500 } });
      setProducts(res.data.data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const handleOpenInvestigation = async (claim: any) => {
    setSelectedClaim(claim);
    fetchProducts();

    // Load existing investigation items
    try {
      const res = await api.express.get(`/manufacturing/customer-claims/${claim.id}/investigation`);
      const existing = res.data.data?.investigation_items || [];
      if (existing.length > 0) {
        setInvestigationItems(existing.map((item: any) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          product_type: item.product_type,
          item_type: item.item_type,
          qty_inspected: item.qty_inspected,
          qty_ok: item.qty_ok,
          qty_ng: item.qty_ng,
          ng_action: item.ng_action || "",
          notes: item.notes || ""
        })));
      } else {
        // Initialize with the claim product
        setInvestigationItems([{
          product_id: claim.product_id,
          product_name: claim.product_name,
          product_code: claim.product_code,
          product_type: claim.product_type || "Work in Progress",
          item_type: (claim.product_type === "Component" || claim.product_type === "Raw Material") ? "Component" : "WIP",
          qty_inspected: claim.qty_claimed,
          qty_ok: 0,
          qty_ng: 0,
          ng_action: "",
          notes: ""
        }]);
      }
    } catch (err) {
      console.error("Error loading investigation:", err);
      // Initialize with the claim product
      setInvestigationItems([{
        product_id: claim.product_id,
        product_name: claim.product_name,
        product_code: claim.product_code,
        product_type: claim.product_type || "Work in Progress",
        item_type: "WIP",
        qty_inspected: claim.qty_claimed,
        qty_ok: 0,
        qty_ng: 0,
        ng_action: "",
        notes: ""
      }]);
    }

    // Start investigation if pending
    if (claim.investigation_status === "Pending") {
      try {
        await api.express.post(`/manufacturing/customer-claims/${claim.id}/investigate`);
      } catch (err) {
        console.error("Error starting investigation:", err);
      }
    }

    setIsInvestigateOpen(true);
  };

  const handleAddInvestigationItem = () => {
    setInvestigationItems([...investigationItems, {
      product_id: "",
      product_name: "",
      product_code: "",
      product_type: "",
      item_type: "Component",
      qty_inspected: 0,
      qty_ok: 0,
      qty_ng: 0,
      ng_action: "",
      notes: ""
    }]);
  };

  const handleRemoveItem = (idx: number) => {
    setInvestigationItems(investigationItems.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    const updated = [...investigationItems];
    updated[idx] = { ...updated[idx], [field]: value };

    // If changing product_id, update related fields
    if (field === "product_id") {
      const prod = products.find((p: any) => String(p.id) === String(value));
      if (prod) {
        updated[idx].product_name = prod.product_name;
        updated[idx].product_code = prod.product_code;
        updated[idx].product_type = prod.product_type;
        updated[idx].item_type = (prod.product_type === "Component" || prod.product_type === "Raw Material") ? "Component" : "WIP";
      }
    }
    setInvestigationItems(updated);
  };

  const handleSaveSortItems = async () => {
    if (!selectedClaim || investigationItems.length === 0) return;
    setInvestigateSubmitting(true);
    try {
      await api.express.post(`/manufacturing/customer-claims/${selectedClaim.id}/sort-items`, {
        items: investigationItems.map(it => ({
          product_id: it.product_id,
          item_type: it.item_type,
          qty_inspected: Number(it.qty_inspected),
          qty_ok: Number(it.qty_ok),
          qty_ng: Number(it.qty_ng),
          ng_action: it.ng_action || null,
          destination_warehouse_id: it.item_type === "WIP" ? 3 : 1,
          notes: it.notes
        }))
      });
      alert("Data sortir berhasil disimpan!");
      fetchClaims();
    } catch (err: any) {
      alert(err.response?.data?.message || "Gagal menyimpan data sortir.");
    } finally {
      setInvestigateSubmitting(false);
    }
  };

  const handleCompleteInvestigation = async () => {
    if (!selectedClaim) return;
    if (!confirm("Selesaikan investigasi? Stok akan diperbarui sesuai data sortir.")) return;
    setInvestigateSubmitting(true);
    try {
      // First save sort items
      await api.express.post(`/manufacturing/customer-claims/${selectedClaim.id}/sort-items`, {
        items: investigationItems.map(it => ({
          product_id: it.product_id,
          item_type: it.item_type,
          qty_inspected: Number(it.qty_inspected),
          qty_ok: Number(it.qty_ok),
          qty_ng: Number(it.qty_ng),
          ng_action: it.ng_action || null,
          destination_warehouse_id: it.item_type === "WIP" ? 3 : 1,
          notes: it.notes
        }))
      });

      // Then complete
      await api.express.post(`/manufacturing/customer-claims/${selectedClaim.id}/complete`);
      alert("Investigasi claim selesai! Stok telah diperbarui.");
      setIsInvestigateOpen(false);
      fetchClaims();
    } catch (err: any) {
      alert(err.response?.data?.message || "Gagal menyelesaikan investigasi.");
    } finally {
      setInvestigateSubmitting(false);
    }
  };

  // ===== Transfer Investigation =====
  const handleSaveInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;
    setSubmitting(true);
    try {
      await api.express.post(`/internal-transfers/${selectedTransfer.id}/receive`, {
        received_by: inspectorName,
        received_date: new Date().toISOString().split("T")[0],
        checksheet_data: { inspector: inspectorName, root_cause: rootCause, disposition },
        notes: `Disposisi QC: ${disposition} | Analisis: ${rootCause}`
      });

      if (disposition === "REWORK_PROD") {
        const it = selectedTransfer.items?.[0] || {};
        await api.express.post("/internal-transfers", {
          transfer_type: "QC_TO_PROD_REWORK",
          type_code: "QCG-PRD",
          from_warehouse_id: null,
          to_warehouse_id: 2,
          source_reference: selectedTransfer.reference_no,
          transferred_by: inspectorName,
          transfer_date: new Date().toISOString().split("T")[0],
          notes: `Part klaim dialihkan untuk rework di produksi: ${rootCause}`,
          items: [{ product_id: it.product_id, qty_sent: Number(it.qty_sent || 1), unit: it.unit || "PCS" }]
        });
      }

      setIsModalOpen(false);
      alert("Investigasi mutu part klaim berhasil disimpan dan disposisi telah dibuat!");
      fetchTransfers();
    } catch (err: any) {
      console.error("Error saving claim investigation:", err);
      alert(err.message || "Gagal menyimpan hasil investigasi.");
    } finally {
      setSubmitting(false);
    }
  };

  // ===== Investigation Status Badge =====
  const getInvestigationBadge = (claim: any) => {
    const status = claim.investigation_status || "Pending";
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      Pending: { label: "Belum Disortir", color: "bg-amber-50 text-amber-600 border-amber-200", icon: Clock },
      In_Progress: { label: "Sedang Disortir", color: "bg-blue-50 text-blue-600 border-blue-200", icon: RotateCcw },
      Completed: { label: "Selesai Investigasi", color: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: CheckCircle2 },
    };
    const cfg = configs[status] || configs.Pending;
    const Icon = cfg.icon;
    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 border ${cfg.color}`}>
        <Icon size={10} /> {cfg.label}
      </span>
    );
  };

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen animate-in fade-in duration-500">
      <button
        onClick={() => router.push("/manufacturing")}
        className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
      >
        <ArrowLeft size={14} /> Kembali ke Manufaktur
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl shadow-lg shadow-violet-200">
              <FileSearch className="text-white" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-100 text-violet-700">
                  No. 11
                </span>
                <h1 className="text-3xl font-black tracking-tight text-gray-900">
                  QC Gate <span className="text-violet-600">Investigasi Klaim</span>
                </h1>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Investigasi, Sortir (WIP vs Komponen), dan Disposisi Part Klaim Customer
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab("claims")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === "claims"
              ? "bg-violet-600 text-white shadow-md shadow-violet-200"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          <span className="flex items-center gap-2"><ShieldAlert size={14} /> Customer Claims</span>
        </button>
        <button
          onClick={() => setActiveTab("transfers")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === "transfers"
              ? "bg-violet-600 text-white shadow-md shadow-violet-200"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          <span className="flex items-center gap-2"><Truck size={14} /> Transfer dari FG</span>
        </button>
      </div>

      {/* ========== Claims Tab ========== */}
      {activeTab === "claims" && (
        <>
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari klaim customer, produk, kode..."
                value={claimsSearch}
                onChange={(e) => setClaimsSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-500/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Kode Klaim</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Produk Diklaim</th>
                    <th className="px-6 py-4 text-center">Qty</th>
                    <th className="px-6 py-4">Tipe NG</th>
                    <th className="px-6 py-4 text-center">Status Investigasi</th>
                    <th className="px-6 py-4 text-center">Sortir OK / NG</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {claimsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={8} className="px-6 py-6"><div className="h-8 bg-gray-100 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : claims.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                        Belum ada data customer claim.
                      </td>
                    </tr>
                  ) : (
                    claims.map((cl) => (
                      <tr key={cl.id} className="hover:bg-violet-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-black text-gray-900 text-sm group-hover:text-violet-600 transition-colors">{cl.claim_code}</div>
                          <div className="text-[10px] text-gray-400 font-bold mt-0.5 flex items-center gap-1">
                            <Calendar size={10} /> {cl.claim_date}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-700">{cl.customer_name}</td>
                        <td className="px-6 py-4">
                          <div className="font-extrabold text-gray-800">{cl.product_name}</div>
                          <div className="text-[10px] text-gray-400 font-bold">{cl.product_code}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-black text-gray-900 text-base">{cl.qty_claimed}</span>
                          <span className="text-[10px] text-gray-400 font-bold ml-1">{cl.product_unit || "Pcs"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-red-50 text-red-600">{cl.ng_type || "-"}</span>
                        </td>
                        <td className="px-6 py-4 text-center">{getInvestigationBadge(cl)}</td>
                        <td className="px-6 py-4 text-center">
                          {cl.investigation_status === "Completed" ? (
                            <div className="font-bold">
                              <span className="text-emerald-600">{cl.qty_ok || 0} OK</span>
                              <span className="text-gray-300 mx-1">/</span>
                              <span className="text-red-600">{cl.qty_ng || 0} NG</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 font-bold">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleOpenInvestigation(cl)}
                            className={`px-4 py-2 rounded-xl font-black text-xs transition-all ${
                              cl.investigation_status === "Completed"
                                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                : "bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-200"
                            }`}
                          >
                            {cl.investigation_status === "Completed" ? "Lihat Hasil" : "Investigasi & Sortir"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========== Transfers Tab ========== */}
      {activeTab === "transfers" && (
        <>
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari nomor transfer klaim atau part..."
                value={transfersSearch}
                onChange={(e) => setTransfersSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-500/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">No. Dokumen / Tanggal</th>
                    <th className="px-6 py-4">Referensi Klaim FG</th>
                    <th className="px-6 py-4">Part / Produk Diinvestigasi</th>
                    <th className="px-6 py-4 text-center">Status Investigasi</th>
                    <th className="px-6 py-4 text-center">Aksi Quality Gate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {transfersLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="px-6 py-6"><div className="h-8 bg-gray-100 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : transfers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                        Belum ada part klaim customer yang ditransfer ke QC Gate.
                      </td>
                    </tr>
                  ) : (
                    transfers.map((trf) => (
                      <tr key={trf.id} className="hover:bg-violet-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-black text-gray-900 text-sm group-hover:text-violet-600 transition-colors">{trf.reference_no}</div>
                          <div className="text-[10px] text-gray-400 font-bold mt-0.5 flex items-center gap-1">
                            <Calendar size={10} /> {trf.transfer_date}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-700">{trf.source_reference || "-"}</td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {trf.items?.map((it: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="font-extrabold text-gray-800">{it.product_name}</span>
                                <span className="text-[10px] font-black px-2 py-0.5 bg-violet-50 text-violet-700 rounded">
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
                            {trf.status === "Received" ? "Selesai Diinvestigasi" : "Menunggu Pemeriksaan"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedTransfer(trf);
                              setInspectorName("");
                              setRootCause("");
                              setIsModalOpen(true);
                            }}
                            className={`px-4 py-2 rounded-xl font-black text-xs transition-all ${
                              trf.status === "Received"
                                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                : "bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-200"
                            }`}
                          >
                            {trf.status === "Received" ? "Lihat Analisis QC" : "Input Investigasi QC"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ===== Investigation & Sortir Modal (Claims) ===== */}
      {isInvestigateOpen && selectedClaim && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl border border-gray-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-gray-100 flex justify-between items-center shrink-0 bg-violet-50/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-200">
                  <Layers size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Investigasi & Sortir Klaim</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">
                    {selectedClaim.claim_code} — {selectedClaim.customer_name} — Total: {selectedClaim.qty_claimed} Pcs
                  </p>
                </div>
              </div>
              <button onClick={() => setIsInvestigateOpen(false)} className="p-2 rounded-full hover:bg-white text-gray-400">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Legend */}
              <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-widest">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200">
                  <Package size={12} /> WIP (Hasil Inject)
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-200">
                  <Layers size={12} /> Komponen
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg border border-orange-200">
                  <AlertTriangle size={12} /> Raw Material
                </div>
              </div>

              {/* Sort Items */}
              <div className="space-y-4">
                {investigationItems.map((item, idx) => (
                  <div key={idx} className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Item #{idx + 1}</span>
                      {investigationItems.length > 1 && (
                        <button onClick={() => handleRemoveItem(idx)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Product selection */}
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Produk</label>
                        <select
                          value={item.product_id}
                          onChange={(e) => handleItemChange(idx, "product_id", e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-violet-500/20"
                        >
                          <option value="">Pilih produk...</option>
                          {products.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.product_name} ({p.product_code})</option>
                          ))}
                        </select>
                      </div>

                      {/* Item type */}
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Tipe Item</label>
                        <select
                          value={item.item_type}
                          onChange={(e) => handleItemChange(idx, "item_type", e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-violet-500/20"
                        >
                          <option value="WIP">WIP (Hasil Inject)</option>
                          <option value="Component">Komponen</option>
                          <option value="Raw_Material">Raw Material</option>
                        </select>
                      </div>

                      {/* Quantities */}
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Qty Diperiksa</label>
                        <input
                          type="number"
                          min={0}
                          value={item.qty_inspected}
                          onChange={(e) => handleItemChange(idx, "qty_inspected", e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-violet-500/20"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Qty OK ✓</label>
                        <input
                          type="number"
                          min={0}
                          value={item.qty_ok}
                          onChange={(e) => handleItemChange(idx, "qty_ok", e.target.value)}
                          className="w-full px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-1">Qty NG ✗</label>
                        <input
                          type="number"
                          min={0}
                          value={item.qty_ng}
                          onChange={(e) => handleItemChange(idx, "qty_ng", e.target.value)}
                          className="w-full px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 outline-none focus:ring-2 focus:ring-red-500/20"
                        />
                      </div>

                      {/* NG Action */}
                      {Number(item.qty_ng) > 0 && (
                        <div className="md:col-span-2">
                          <label className="text-[10px] font-black text-red-400 uppercase tracking-widest block mb-1">Tindakan untuk Qty NG</label>
                          <select
                            value={item.ng_action}
                            onChange={(e) => handleItemChange(idx, "ng_action", e.target.value)}
                            className="w-full px-3 py-2.5 bg-white border border-red-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-red-500/20"
                          >
                            <option value="">Pilih tindakan...</option>
                            {item.item_type === "WIP" && <option value="Crusher">Kirim ke Crusher (Giling)</option>}
                            <option value="Disposal">Disposal (Buang)</option>
                            <option value="Rework">Rework / Perbaiki</option>
                            <option value="Return_To_Stock">Kembalikan ke Stok (NG Hold)</option>
                            {(item.item_type === "Component" || item.item_type === "Raw_Material") && (
                              <option value="Vendor_Claim">Vendor Claim (Klaim ke Supplier)</option>
                            )}
                          </select>
                        </div>
                      )}

                      {/* Notes */}
                      <div className={Number(item.qty_ng) > 0 ? "" : "md:col-span-3"}>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Catatan</label>
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => handleItemChange(idx, "notes", e.target.value)}
                          placeholder="Catatan sortir..."
                          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-violet-500/20"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Item Button */}
                <button
                  type="button"
                  onClick={handleAddInvestigationItem}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-xs font-black text-gray-400 hover:text-violet-600 hover:border-violet-300 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Tambah Item Sortir
                </button>
              </div>

              {/* Summary */}
              <div className="bg-violet-50/50 rounded-2xl p-4 border border-violet-100">
                <div className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-2">Ringkasan Sortir</div>
                <div className="flex gap-6 text-sm font-bold">
                  <span className="text-emerald-600">
                    OK: {investigationItems.reduce((s, it) => s + Number(it.qty_ok || 0), 0)} Pcs
                  </span>
                  <span className="text-red-600">
                    NG: {investigationItems.reduce((s, it) => s + Number(it.qty_ng || 0), 0)} Pcs
                  </span>
                  <span className="text-gray-600">
                    Total Periksa: {investigationItems.reduce((s, it) => s + Number(it.qty_inspected || 0), 0)} Pcs
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setIsInvestigateOpen(false)}
                className="px-6 py-2.5 bg-gray-100 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
              >
                Tutup
              </button>
              {selectedClaim.investigation_status !== "Completed" && (
                <>
                  <button
                    type="button"
                    onClick={handleSaveSortItems}
                    disabled={investigateSubmitting}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-blue-200 hover:bg-blue-700 flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    <ClipboardCheck size={14} /> Simpan Data Sortir
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteInvestigation}
                    disabled={investigateSubmitting}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-emerald-200 hover:bg-emerald-700 flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Check size={14} /> Selesaikan Investigasi
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Transfer Investigation Modal ===== */}
      {isModalOpen && selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl border border-gray-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-4 border-b border-gray-100 flex justify-between items-center shrink-0 bg-violet-50/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-200">
                  <FileSearch size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Checksheet Investigasi Cacat Part Klaim</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">Analisis akar masalah dan tentukan disposisi part</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-white text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveInvestigation} className="p-8 pt-4 overflow-y-auto flex-1 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nama Inspektor QC</label>
                <input
                  type="text"
                  placeholder="Nama staff QC yang menganalisis"
                  value={selectedTransfer.status === "Received" ? selectedTransfer.received_by : inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  required
                  disabled={selectedTransfer.status === "Received"}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Akar Masalah (Root Cause Analysis)</label>
                <textarea
                  rows={3}
                  placeholder="Penjelasan penyebab cacat: parameter mesin, kondisi mold, atau human error..."
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  required
                  disabled={selectedTransfer.status === "Received"}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Keputusan Disposisi QC</label>
                <select
                  value={disposition}
                  onChange={(e) => setDisposition(e.target.value)}
                  disabled={selectedTransfer.status === "Received"}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="REWORK_PROD">Rework / Perbaiki di Lantai Produksi</option>
                  <option value="SCRAP_CRUSHER">Scrap Total / Giling ke Crusher</option>
                  <option value="REJECTED_CLAIM">Klaim Tidak Valid / Kembalikan ke Customer</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-gray-100 rounded-xl text-xs font-bold">
                  Tutup
                </button>
                {selectedTransfer.status !== "Received" && (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-violet-600 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-violet-200 hover:bg-violet-700 flex items-center gap-2"
                  >
                    <Check size={14} /> {submitting ? "Menyimpan..." : "Simpan Investigasi & Eksekusi Disposisi"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
