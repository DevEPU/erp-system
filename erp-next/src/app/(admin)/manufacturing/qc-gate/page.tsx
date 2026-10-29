"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ClipboardCheck,
  FileCheck2,
  PackageCheck,
  FileSearch,
  AlertCircle,
  Activity,
  Layers,
  Calendar,
  ExternalLink,
  Plus,
  Send,
  Wrench,
  RotateCcw,
  Truck,
  User,
  X
} from "lucide-react";
import api from "@/lib/api";

type QcTabKey = "realisasi" | "alur10" | "alur12" | "claims" | "vendor_claims";

interface ProductionOutput {
  id: string;
  pro_id: string;
  pro_code: string;
  wo_reference: string;
  product_name: string;
  product_code: string;
  qty_ok: number;
  qty_ng: number;
  status: "WIP" | "SFG_PENDING_QC" | "Verified_QC" | "PENDING_REPAIR" | "Rejected" | "Received_FG" | string;
  created_at: string;
  ng_type?: string | null;
  notes?: string | null;
}

function QcGateMasterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab state
  const [activeTab, setActiveTab] = useState<QcTabKey>("realisasi");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Tab 1: Realisasi Output Mesin
  const [outputs, setOutputs] = useState<ProductionOutput[]>([]);
  const [selectedOutput, setSelectedOutput] = useState<ProductionOutput | null>(null);
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [checklist, setChecklist] = useState({
    appearance: false,
    dimension: false,
    weight: false,
    flashFree: false,
    bubbleFree: false
  });
  const [qcStatus, setQcStatus] = useState<"Verified_QC" | "NG_REPAIRABLE" | "NG_SCRAP">("Verified_QC");
  const [qtyOk, setQtyOk] = useState<number>(0);
  const [qtyNg, setQtyNg] = useState<number>(0);
  const [ngType, setNgType] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tab 2: Alur 10 (PROD_TO_QC)
  const [transfersIn, setTransfersIn] = useState<any[]>([]);
  const [selectedTransferIn, setSelectedTransferIn] = useState<any | null>(null);
  const [isInModalOpen, setIsInModalOpen] = useState(false);
  const [inInspectorName, setInInspectorName] = useState("");
  const [inInspectDate, setInInspectDate] = useState(new Date().toISOString().split("T")[0]);
  const [inCheckVisual, setInCheckVisual] = useState(true);
  const [inCheckDimension, setInCheckDimension] = useState(true);
  const [inCheckPacking, setInCheckPacking] = useState(true);
  const [inNotes, setInNotes] = useState("");
  const [inItemQuantities, setInItemQuantities] = useState<Record<number, { ok: number; ng: number }>>({});
  const [inSubmitting, setInSubmitting] = useState(false);

  // Tab 3: Alur 12 (QC_TO_FG)
  const [transfersOut, setTransfersOut] = useState<any[]>([]);
  const [alur12SubTab, setAlur12SubTab] = useState<"pending" | "history">("pending");
  const [fgSubmittingId, setFgSubmittingId] = useState<string | null>(null);

  const handleTransferToFg = async (output: ProductionOutput) => {
    if (!confirm(`Konfirmasi penerimaan ${Number(output.qty_ok).toLocaleString()} Pcs item ${output.product_name} ke Gudang Finished Goods?`)) {
      return;
    }
    setFgSubmittingId(output.id);
    try {
      const res = await api.express.post(`/manufacturing/production-outputs/${output.id}/fg-receive`, {
        qty_received: Number(output.qty_ok)
      });
      if (res && res.data && res.data.success) {
        alert(`Sukses! ${Number(output.qty_ok).toLocaleString()} Pcs part telah berhasil diterima ke Gudang Finished Goods (WHFG).`);
        fetchTabData();
      }
    } catch (err: any) {
      alert("Gagal memproses serah-terima ke FG: " + (err.response?.data?.message || err.message));
    } finally {
      setFgSubmittingId(null);
    }
  };

  // Tab 4: Customer Claims
  const [customerClaims, setCustomerClaims] = useState<any[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimDisposition, setClaimDisposition] = useState("REWORK_PROD");
  const [claimRootCause, setClaimRootCause] = useState("");
  const [claimSubmitting, setClaimSubmitting] = useState(false);

  // Tab 5: Vendor Claims
  const [vendorClaims, setVendorClaims] = useState<any[]>([]);

  // Initialize Tab from URL parameter
  useEffect(() => {
    const tabParam = searchParams.get("tab") as QcTabKey;
    if (tabParam && ["realisasi", "alur10", "alur12", "claims", "vendor_claims"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Fetch data per tab
  useEffect(() => {
    fetchTabData();
  }, [activeTab, search]);

  const fetchTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === "realisasi") {
        const res = await api.express.get("/manufacturing/production-outputs").catch(() => null);
        if (res && res.data && res.data.success) {
          setOutputs(res.data.data);
          try {
            localStorage.setItem("erp_epu_production_outputs", JSON.stringify(res.data.data));
          } catch {}
        } else {
          try {
            const stored = localStorage.getItem("erp_epu_production_outputs");
            if (stored) setOutputs(JSON.parse(stored));
          } catch {}
        }
      } else if (activeTab === "alur10") {
        const res = await api.express.get("/internal-transfers", {
          params: { transfer_type: "PROD_TO_QC", search }
        }).catch(() => null);
        setTransfersIn(res?.data?.data || []);
      } else if (activeTab === "alur12") {
        const [trfRes, poRes] = await Promise.all([
          api.express.get("/internal-transfers", { params: { transfer_type: "QC_TO_FG", search } }).catch(() => null),
          api.express.get("/manufacturing/production-outputs").catch(() => null)
        ]);
        setTransfersOut(trfRes?.data?.data || []);
        if (poRes?.data && poRes.data.success) {
          setOutputs(poRes.data.data);
          try {
            localStorage.setItem("erp_epu_production_outputs", JSON.stringify(poRes.data.data));
          } catch {}
        } else {
          try {
            const stored = localStorage.getItem("erp_epu_production_outputs");
            if (stored) setOutputs(JSON.parse(stored));
          } catch {}
        }
      } else if (activeTab === "claims") {
        const res = await api.express.get("/manufacturing/customer-claims");
        if (res && res.data && res.data.success) {
          setCustomerClaims(res.data.data || []);
        }
      } else if (activeTab === "vendor_claims") {
        const res = await api.express.get("/manufacturing/vendor-claims");
        if (res && res.data && res.data.success) {
          setVendorClaims(res.data.data || []);
        }
      }
    } catch (err) {
      console.error("Error fetching QC Hub data:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers Tab 1: Realisasi Output ---
  const handleOpenCheck = (output: ProductionOutput) => {
    setSelectedOutput(output);
    setQtyOk(output.qty_ok || 0);
    setQtyNg(output.qty_ng || 0);
    setNgType(output.ng_type || "");
    setNotes(output.notes || "");
    setChecklist({
      appearance: false,
      dimension: false,
      weight: false,
      flashFree: false,
      bubbleFree: false
    });
    setQcStatus(output.qty_ng > 0 ? "NG_REPAIRABLE" : "Verified_QC");
    setIsCheckModalOpen(true);
  };

  const handleQcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutput) return;

    if (qcStatus === "Verified_QC" && !Object.values(checklist).every((v) => v === true)) {
      alert("Untuk status QC OK (Verified), semua kriteria pemeriksaan Check Sheet harus dicentang!");
      return;
    }
    if (qtyNg > 0 && qcStatus === "Verified_QC") {
      alert("Tidak dapat meloloskan QC jika kuantitas NG lebih besar dari 0!");
      return;
    }
    if (qtyNg > 0 && !ngType) {
      alert("Silakan pilih Tipe Cacat (NG) terlebih dahulu!");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.express.post(`/manufacturing/production-outputs/${selectedOutput.id}/qc-verify`, {
        status: qcStatus,
        qty_ok: Number(qtyOk),
        qty_ng: Number(qtyNg),
        ng_type: Number(qtyNg) > 0 ? ngType : null,
        notes: Number(qtyNg) > 0 ? notes : null
      });

      if (res && res.data && res.data.success) {
        alert("Pemeriksaan QC berhasil disimpan.");
        setIsCheckModalOpen(false);
        setSelectedOutput(null);
        fetchTabData();
      }
    } catch (err: any) {
      alert("Pemeriksaan QC gagal: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handlers Tab 2: Alur 10 ---
  const openInInspectionModal = (transfer: any) => {
    setSelectedTransferIn(transfer);
    const initialQty: Record<number, { ok: number; ng: number }> = {};
    if (transfer.items) {
      transfer.items.forEach((it: any) => {
        initialQty[it.id] = { ok: Number(it.qty_sent), ng: 0 };
      });
    }
    setInItemQuantities(initialQty);
    setInInspectorName(transfer.received_by || "");
    setInNotes("");
    setIsInModalOpen(true);
  };

  const handleConfirmInInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransferIn) return;

    if (!inCheckVisual || !inCheckDimension || !inCheckPacking) {
      alert("Semua kriteria pemeriksaan visual, dimensi, dan kemasan harus dicentang untuk validasi mutu.");
      return;
    }

    setInSubmitting(true);
    try {
      const itemsPayload = Object.entries(inItemQuantities).map(([itemId, qtys]) => ({
        id: Number(itemId),
        qty_ok: qtys.ok,
        qty_ng: qtys.ng
      }));

      const payload = {
        received_by: inInspectorName,
        received_date: inInspectDate,
        checksheet_data: {
          visual_passed: inCheckVisual,
          dimension_passed: inCheckDimension,
          packaging_passed: inCheckPacking,
          inspector: inInspectorName,
          inspection_date: inInspectDate,
          item_results: itemsPayload,
          notes: inNotes
        },
        items: itemsPayload,
        notes: inNotes ? `Inspeksi QC: ${inNotes}` : "Inspeksi QC Gate selesai"
      };

      await api.express.post(`/internal-transfers/${selectedTransferIn.id}/receive`, payload);
      setIsInModalOpen(false);
      alert("Inspeksi Serah-Terima berhasil diverifikasi!");
      fetchTabData();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan inspeksi QC.");
    } finally {
      setInSubmitting(false);
    }
  };

  // --- Handlers Tab 4: Customer Claims ---
  const handleOpenClaimInvestigation = (claim: any) => {
    setSelectedClaim(claim);
    setClaimDisposition(claim.disposition || "REWORK_PROD");
    setClaimRootCause(claim.root_cause || "");
    setIsClaimModalOpen(true);
  };

  const handleSaveClaimInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim) return;
    setClaimSubmitting(true);
    try {
      await api.express.put(`/manufacturing/customer-claims/${selectedClaim.id}`, {
        disposition: claimDisposition,
        root_cause: claimRootCause,
        status: "Investigated"
      });
      setIsClaimModalOpen(false);
      alert("Hasil investigasi claim berhasil disimpan!");
      fetchTabData();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan hasil investigasi.");
    } finally {
      setClaimSubmitting(false);
    }
  };

  // Filtered outputs for tab 1
  const filteredOutputs = outputs.filter(
    (o) =>
      Number(o.qty_ok) > 0 &&
      (o.pro_code?.toLowerCase().includes(search.toLowerCase()) ||
        o.product_name?.toLowerCase().includes(search.toLowerCase()) ||
        o.product_code?.toLowerCase().includes(search.toLowerCase()) ||
        o.wo_reference?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen animate-in fade-in duration-500">
      {/* Back button */}
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
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-200 text-white">
              <ShieldCheck size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  Quality Management Hub
                </span>
                <h1 className="text-3xl font-black tracking-tight text-gray-900">
                  Quality Control & QC Gate
                </h1>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Pusat Komando Pemeriksaan Mutu: Checksheet Mesin, Penerimaan Produksi, Serah Terima FG, Investigasi Claim & Komponen
              </p>
            </div>
          </div>
        </div>

        {/* Quick Route Link Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/manufacturing/qc-gate-out")}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all"
          >
            <PackageCheck size={14} />
            <span>Kirim ke FG</span>
          </button>
          <button
            onClick={() => router.push("/manufacturing/qc-claim-investigasi")}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all"
          >
            <FileSearch size={14} />
            <span>Investigasi Claim</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200/80">
        <button
          onClick={() => setActiveTab("realisasi")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
            activeTab === "realisasi"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
              : "bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-gray-100"
          }`}
        >
          <ShieldCheck size={16} />
          <span>Output Realisasi (Check Sheet)</span>
        </button>

        <button
          onClick={() => setActiveTab("alur10")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
            activeTab === "alur10"
              ? "bg-cyan-600 text-white shadow-md shadow-cyan-200"
              : "bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-gray-100"
          }`}
        >
          <FileCheck2 size={16} />
          <span>Penerimaan Produksi (IN)</span>
        </button>

        <button
          onClick={() => setActiveTab("alur12")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
            activeTab === "alur12"
              ? "bg-teal-600 text-white shadow-md shadow-teal-200"
              : "bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-gray-100"
          }`}
        >
          <PackageCheck size={16} />
          <span>Serah Terima ke FG (OUT)</span>
        </button>

        <button
          onClick={() => setActiveTab("claims")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
            activeTab === "claims"
              ? "bg-rose-600 text-white shadow-md shadow-rose-200"
              : "bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-gray-100"
          }`}
        >
          <FileSearch size={16} />
          <span>Customer Claim</span>
        </button>

        <button
          onClick={() => setActiveTab("vendor_claims")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
            activeTab === "vendor_claims"
              ? "bg-purple-600 text-white shadow-md shadow-purple-200"
              : "bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-gray-100"
          }`}
        >
          <AlertCircle size={16} />
          <span>Defective Component & Vendor Claim</span>
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari part, dokumen, kode WO, atau catatan mutu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* TAB 1: OUTPUT REALISASI MESIN */}
      {activeTab === "realisasi" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900">Verifikasi Check Sheet Hasil Cetak Mesin</h3>
                <p className="text-xs text-gray-500 font-medium">Validasi mutu per batch mesin injection. Output NG dialokasikan ke Crusher / Rework.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">No. PrO & Work Order</th>
                    <th className="px-6 py-4">Produk / Part</th>
                    <th className="px-6 py-4 text-center">Qty Bagus (OK)</th>
                    <th className="px-6 py-4 text-center">Qty Cacat (NG)</th>
                    <th className="px-6 py-4 text-center">Status Mutu</th>
                    <th className="px-6 py-4 text-center">Aksi Pemeriksaan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={6} className="px-6 py-6"><div className="h-8 bg-gray-100 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : filteredOutputs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                        Tidak ada output cetak mesin yang menunggu verifikasi.
                      </td>
                    </tr>
                  ) : (
                    filteredOutputs.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-extrabold text-gray-900">{o.pro_code}</div>
                          {o.wo_reference && (
                            <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                              WO: {o.wo_reference}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-black text-gray-900">{o.product_name}</div>
                          <div className="text-[10px] text-gray-400 font-bold">{o.product_code}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-black text-emerald-600 text-sm">
                          {Number(o.qty_ok).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center font-black text-red-500 text-sm">
                          {Number(o.qty_ng).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                              ["Verified_QC", "Received_FG"].includes(o.status)
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                : o.status === "PENDING_REPAIR"
                                ? "bg-purple-50 text-purple-600 border border-purple-200"
                                : "bg-amber-50 text-amber-600 border border-amber-200 animate-pulse"
                            }`}
                          >
                            {["Verified_QC", "Received_FG"].includes(o.status) ? (
                              <CheckCircle2 size={10} />
                            ) : (
                              <Clock size={10} />
                            )}
                            {o.status === "Verified_QC" ? "QC Lolos (OK)" : o.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleOpenCheck(o)}
                            className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 transition-all inline-flex items-center gap-1.5"
                          >
                            <ClipboardCheck size={14} />
                            <span>Check Sheet</span>
                          </button>
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

      {/* TAB 2: ALUR 10 INBOUND INSPECTION */}
      {activeTab === "alur10" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900">Inbound dari Produksi ke QC Gate</h3>
                <p className="text-xs text-gray-500 font-medium">Pemeriksaan fisik serah-terima output dari lantai produksi sebelum didistribusikan ke FG.</p>
              </div>
              <button
                onClick={() => router.push("/manufacturing/qc-gate-in")}
                className="text-xs font-bold text-cyan-700 hover:text-cyan-900 flex items-center gap-1"
              >
                <span>Halaman Penuh Inbound Produksi</span>
                <ExternalLink size={12} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">No. Dokumen / Tanggal</th>
                    <th className="px-6 py-4">Pengirim Produksi</th>
                    <th className="px-6 py-4">Part / Produk Datang</th>
                    <th className="px-6 py-4 text-center">Status Inspeksi</th>
                    <th className="px-6 py-4 text-center">Aksi Checksheet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="px-6 py-6"><div className="h-8 bg-gray-100 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : transfersIn.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                        Belum ada serah-terima part dari produksi yang menunggu inspeksi.
                      </td>
                    </tr>
                  ) : (
                    transfersIn.map((trf) => (
                      <tr key={trf.id} className="hover:bg-cyan-50/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900">{trf.reference_no}</span>
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
                        <td className="px-6 py-4 font-semibold text-gray-700">{trf.transferred_by || "-"}</td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {trf.items?.map((it: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="font-bold text-gray-800">{it.product_name}</span>
                                <span className="text-[10px] font-black px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded">
                                  {it.qty_sent} {it.unit || "PCS"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                              trf.status === "Received"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                : "bg-amber-50 text-amber-600 border border-amber-200 animate-pulse"
                            }`}
                          >
                            {trf.status === "Received" ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                            {trf.status === "Received" ? "Lolos & Diterima" : "Menunggu Inspeksi"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => openInInspectionModal(trf)}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 mx-auto ${
                              trf.status === "Received"
                                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-200"
                            }`}
                          >
                            <FileCheck2 size={14} />
                            <span>{trf.status === "Received" ? "Lihat Checksheet" : "Input Checksheet"}</span>
                          </button>
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

      {/* TAB 3: ALUR 12 OUTBOUND TO FG */}
      {activeTab === "alur12" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800">
                    No. 12 (OUT)
                  </span>
                  <h3 className="text-base font-black text-gray-900">
                    Quality Gate ke Gudang Finished Goods
                  </h3>
                </div>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Daftar batch part yang telah Lolos Uji Mutu QC (OK) dan siap diserahterimakan ke Gudang Finished Goods (WHFG).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Sub-tab pills */}
                <div className="flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setAlur12SubTab("pending")}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                      alur12SubTab === "pending"
                        ? "bg-teal-600 text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Siap Masuk FG ({outputs.filter(o => o.status === "Verified_QC" || o.status === "VERIFIED (SIAP MASUK FG)" || o.status?.toLowerCase().includes("verified")).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlur12SubTab("history")}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                      alur12SubTab === "history"
                        ? "bg-teal-600 text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Riwayat Selesai ({outputs.filter(o => o.status === "Received_FG" || o.status?.toLowerCase().includes("received")).length + transfersOut.length})
                  </button>
                </div>

                <button
                  onClick={() => router.push("/persediaan-barang/penerimaan-fg")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 transition-all"
                >
                  <PackageCheck size={14} />
                  <span>Buka Penerimaan FG</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {alur12SubTab === "pending" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="px-6 py-4">No. PrO & Work Order</th>
                      <th className="px-6 py-4">Produk / Part</th>
                      <th className="px-6 py-4 text-center">Qty Lolos QC</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-center">Tindakan Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs">
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={5} className="px-6 py-6"><div className="h-8 bg-gray-100 rounded-xl w-full"></div></td>
                        </tr>
                      ))
                    ) : outputs.filter(o => o.status === "Verified_QC" || o.status === "VERIFIED (SIAP MASUK FG)" || o.status?.toLowerCase().includes("verified")).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                          Tidak ada part berstatus lolos QC yang menunggu diserahkan ke Gudang Jadi.
                        </td>
                      </tr>
                    ) : (
                      outputs
                        .filter(o => (o.status === "Verified_QC" || o.status === "VERIFIED (SIAP MASUK FG)" || o.status?.toLowerCase().includes("verified")) && (
                          o.pro_code?.toLowerCase().includes(search.toLowerCase()) ||
                          o.product_name?.toLowerCase().includes(search.toLowerCase()) ||
                          o.product_code?.toLowerCase().includes(search.toLowerCase()) ||
                          o.wo_reference?.toLowerCase().includes(search.toLowerCase())
                        ))
                        .map((o) => (
                          <tr key={o.id} className="hover:bg-teal-50/30 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="font-extrabold text-gray-900">{o.pro_code}</div>
                              {o.wo_reference && (
                                <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                                  WO: {o.wo_reference}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-black text-gray-900">{o.product_name}</div>
                              <div className="text-[10px] text-gray-400 font-bold">{o.product_code}</div>
                            </td>
                            <td className="px-6 py-4 text-center font-black text-emerald-600 text-sm">
                              {Number(o.qty_ok).toLocaleString()} Pcs
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200">
                                <CheckCircle2 size={10} />
                                Verified (Siap Masuk FG)
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => handleTransferToFg(o)}
                                disabled={fgSubmittingId === o.id}
                                className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white shadow-md shadow-blue-200 transition-all inline-flex items-center gap-1.5"
                              >
                                <PackageCheck size={14} />
                                <span>{fgSubmittingId === o.id ? "Memproses..." : "Terima Barang Jadi"}</span>
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="px-6 py-4">No. Dokumen / PrO</th>
                      <th className="px-6 py-4">Referensi WO</th>
                      <th className="px-6 py-4">Part / Produk</th>
                      <th className="px-6 py-4 text-center">Qty Diterima FG</th>
                      <th className="px-6 py-4 text-center">Status di Gudang FG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs">
                    {outputs.filter(o => o.status === "Received_FG").length === 0 && transfersOut.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                          Belum ada riwayat part yang selesai dibukukan di Gudang Finished Goods.
                        </td>
                      </tr>
                    ) : (
                      <>
                        {outputs
                          .filter(o => o.status === "Received_FG")
                          .map((o) => (
                            <tr key={`po-${o.id}`} className="hover:bg-emerald-50/20 transition-colors">
                              <td className="px-6 py-4 font-black text-gray-900">{o.pro_code}</td>
                              <td className="px-6 py-4 font-bold text-gray-700">
                                {o.wo_reference ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                                    WO: {o.wo_reference}
                                  </span>
                                ) : "-"}
                              </td>
                              <td className="px-6 py-4 font-bold text-gray-800">{o.product_name}</td>
                              <td className="px-6 py-4 text-center font-black text-emerald-600">
                                {Number(o.qty_ok).toLocaleString()} Pcs
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-200">
                                  <CheckCircle2 size={10} /> Diterima di Gudang FG
                                </span>
                              </td>
                            </tr>
                          ))}
                        {transfersOut.map((trf) => (
                          <tr key={`trf-${trf.id}`} className="hover:bg-emerald-50/20 transition-colors">
                            <td className="px-6 py-4 font-black text-gray-900">{trf.reference_no}</td>
                            <td className="px-6 py-4 font-bold text-gray-700">
                              {trf.source_reference ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                                  WO: {trf.source_reference}
                                </span>
                              ) : "-"}
                            </td>
                            <td className="px-6 py-4 font-bold text-gray-800">
                              {trf.items?.map((it: any) => it.product_name).join(", ")}
                            </td>
                            <td className="px-6 py-4 text-center font-black text-emerald-600">
                              {trf.items?.reduce((acc: number, it: any) => acc + Number(it.qty_sent || 0), 0)} Pcs
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-200">
                                <CheckCircle2 size={10} /> Diterima di Gudang FG
                              </span>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOMER CLAIMS */}
      {activeTab === "claims" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900">Investigasi Claim Mutu Pelanggan</h3>
                <p className="text-xs text-gray-500 font-medium">Analisis akar masalah klaim pelanggan dan disposisi: Rework Produksi, Crusher, atau Scrap Disposal.</p>
              </div>
              <button
                onClick={() => router.push("/manufacturing/qc-claim-investigasi")}
                className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1"
              >
                <span>Halaman Penuh Investigasi Claim</span>
                <ExternalLink size={12} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Kode Claim / Tanggal</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Produk & Qty Claim</th>
                    <th className="px-6 py-4">Tipe Cacat & Akar Masalah</th>
                    <th className="px-6 py-4 text-center">Disposisi</th>
                    <th className="px-6 py-4 text-center">Aksi Investigasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={6} className="px-6 py-6"><div className="h-8 bg-gray-100 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : customerClaims.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                        Belum ada data klaim pelanggan tercatat.
                      </td>
                    </tr>
                  ) : (
                    customerClaims.map((cl) => (
                      <tr key={cl.id} className="hover:bg-rose-50/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-black text-gray-900">{cl.claim_code}</div>
                          <div className="text-[10px] text-gray-400 font-bold mt-0.5">{cl.claim_date}</div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-800">{cl.customer_name}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{cl.product_name}</div>
                          <span className="text-[10px] font-black px-2 py-0.5 bg-rose-50 text-rose-700 rounded">
                            {cl.qty_claimed} {cl.product_unit || "PCS"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-red-600">{cl.ng_type || "Cacat Mutu"}</div>
                          <p className="text-[10px] text-gray-500 mt-0.5">{cl.root_cause || cl.notes || "-"}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-gray-100 text-gray-700 uppercase">
                            {cl.disposition || cl.status || "Pending"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleOpenClaimInvestigation(cl)}
                            className="px-3 py-1.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200 transition-all inline-flex items-center gap-1"
                          >
                            <FileSearch size={12} />
                            <span>Investigasi</span>
                          </button>
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

      {/* TAB 5: VENDOR CLAIMS */}
      {activeTab === "vendor_claims" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900">Klaim Komponen Cacat ke Supplier (Vendor Claims)</h3>
                <p className="text-xs text-gray-500 font-medium">Daftar komponen insert/baut/sub-assembly yang cacat dari supplier dan diklaim penggantian.</p>
              </div>
              <button
                onClick={() => router.push("/manufacturing/quality-control")}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
              >
                <span>Halaman Penuh Quality Control</span>
                <ExternalLink size={12} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">No. Klaim / Tanggal</th>
                    <th className="px-6 py-4">Komponen & Kode Part</th>
                    <th className="px-6 py-4 text-center">Qty Komponen NG</th>
                    <th className="px-6 py-4">Asal Output Mesin</th>
                    <th className="px-6 py-4 text-center">Status Klaim Vendor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="px-6 py-6"><div className="h-8 bg-gray-100 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : vendorClaims.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                        Belum ada komponen cacat yang diklaim ke supplier.
                      </td>
                    </tr>
                  ) : (
                    vendorClaims.map((vc) => (
                      <tr key={vc.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-black text-gray-900">VC-{vc.id}</div>
                          <div className="text-[10px] text-gray-400 font-bold mt-0.5">{vc.created_at?.split("T")[0]}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{vc.product_name}</div>
                          <div className="text-[10px] text-gray-400 font-bold">{vc.product_code}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-black text-purple-700 text-sm">
                          {vc.qty_ng_component} {vc.product_unit || "PCS"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-800">{vc.pro_code || "-"}</div>
                          <div className="text-[10px] text-gray-400 font-medium">Output Cetak Terkait</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                            {vc.status || "Pending Claim"}
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

      {/* MODAL 1: CHECK SHEET OUTPUT MESIN */}
      {isCheckModalOpen && selectedOutput && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl border border-gray-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-4 border-b border-gray-100 flex justify-between items-center shrink-0 bg-emerald-50/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
                  <ClipboardCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Check Sheet Verifikasi Mutu Cetak</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">PrO: {selectedOutput.pro_code} | {selectedOutput.wo_reference}</p>
                </div>
              </div>
              <button onClick={() => setIsCheckModalOpen(false)} className="p-2 rounded-full hover:bg-white text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleQcSubmit} className="p-8 pt-4 overflow-y-auto flex-1 space-y-5">
              {/* Product Info Banner */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center text-xs">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Produk Target</p>
                  <p className="text-sm font-extrabold text-gray-900">{selectedOutput.product_name}</p>
                  <p className="text-[10px] text-gray-400 font-bold">{selectedOutput.product_code}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Qty Cetak</p>
                  <p className="text-sm font-black text-gray-900">
                    {(Number(selectedOutput.qty_ok) + Number(selectedOutput.qty_ng)).toLocaleString()} PCS
                  </p>
                </div>
              </div>

              {/* Checklist Parameters */}
              <div className="space-y-3">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Kriteria Standar Mutu</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={checklist.appearance}
                      onChange={(e) => setChecklist({ ...checklist, appearance: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Visual Bersih & Bebas Gores</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={checklist.dimension}
                      onChange={(e) => setChecklist({ ...checklist, dimension: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Dimensi Presisi (Jangka Sorong)</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={checklist.weight}
                      onChange={(e) => setChecklist({ ...checklist, weight: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Berat Part Sesuai Toleransi BOM</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={checklist.flashFree}
                      onChange={(e) => setChecklist({ ...checklist, flashFree: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Bebas Flash / Sirip Berlebih</span>
                  </label>
                </div>
              </div>

              {/* Quantities */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Qty Lolos (OK)</label>
                  <input
                    type="number"
                    value={qtyOk}
                    onChange={(e) => setQtyOk(Number(e.target.value))}
                    min={0}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Qty Cacat (NG)</label>
                  <input
                    type="number"
                    value={qtyNg}
                    onChange={(e) => setQtyNg(Number(e.target.value))}
                    min={0}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {/* NG Section */}
              {qtyNg > 0 && (
                <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-red-800 uppercase tracking-widest">Pilih Tipe Cacat (NG)</label>
                    <select
                      value={ngType}
                      onChange={(e) => setNgType(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-white border border-red-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="">-- Pilih Tipe Cacat --</option>
                      <option value="Short Shot">Short Shot (Kurang Bahan)</option>
                      <option value="Sink Mark">Sink Mark (Penyusutan)</option>
                      <option value="Flash">Flash (Sirip Tebal)</option>
                      <option value="Bubble">Bubble (Bintik Udara)</option>
                      <option value="Silver Streak">Silver Streak</option>
                      <option value="Warping">Warping (Melengkung)</option>
                      <option value="Defect Component">Defect Component (Komponen Cacat)</option>
                      <option value="Color Contamination">Color Contamination</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-red-800 uppercase tracking-widest">Catatan Cacat</label>
                    <textarea
                      placeholder="Keterangan cacat produk..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-red-200 rounded-xl text-xs font-semibold h-16 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-4 flex gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCheckModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-xl text-xs font-black uppercase"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-black uppercase shadow-md shadow-emerald-200"
                >
                  {isSubmitting ? "Menyimpan..." : "Kirim Verifikasi Mutu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INBOUND CHECKSHEET ALUR 10 */}
      {isInModalOpen && selectedTransferIn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl border border-gray-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-4 border-b border-gray-100 flex justify-between items-center shrink-0 bg-cyan-50/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shadow-md shadow-cyan-200">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Checksheet Inspeksi QC Gate</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-400 font-bold">Dokumen: {selectedTransferIn.reference_no}</p>
                    {selectedTransferIn.source_reference && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                        WO: {selectedTransferIn.source_reference}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsInModalOpen(false)} className="p-2 rounded-full hover:bg-white text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmInInspection} className="p-8 pt-4 overflow-y-auto flex-1 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tanggal Inspeksi</label>
                  <input
                    type="date"
                    value={inInspectDate}
                    onChange={(e) => setInInspectDate(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nama Inspektor QC</label>
                  <input
                    type="text"
                    placeholder="Nama inspektor"
                    value={inInspectorName}
                    onChange={(e) => setInInspectorName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Criteria */}
              <div className="bg-cyan-50/40 border border-cyan-100 p-4 rounded-2xl space-y-2">
                <p className="text-xs font-black text-cyan-800 uppercase tracking-widest">Kriteria Kelulusan Mutu</p>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-cyan-100 cursor-pointer text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={inCheckVisual}
                      onChange={(e) => setInCheckVisual(e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-cyan-500"
                    />
                    <span>Visual OK</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-cyan-100 cursor-pointer text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={inCheckDimension}
                      onChange={(e) => setInCheckDimension(e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-cyan-500"
                    />
                    <span>Dimensi OK</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-cyan-100 cursor-pointer text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={inCheckPacking}
                      onChange={(e) => setInCheckPacking(e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-cyan-500"
                    />
                    <span>Kemasan OK</span>
                  </label>
                </div>
              </div>

              {/* Items */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase">
                      <th className="px-4 py-3">Produk</th>
                      <th className="px-4 py-3 text-center">QTY Kirim</th>
                      <th className="px-4 py-3 text-center">QTY OK</th>
                      <th className="px-4 py-3 text-center">QTY NG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {selectedTransferIn.items?.map((it: any) => (
                      <tr key={it.id}>
                        <td className="px-4 py-3 font-bold text-gray-900">{it.product_name}</td>
                        <td className="px-4 py-3 text-center font-black">{it.qty_sent}</td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            value={inItemQuantities[it.id]?.ok ?? it.qty_sent}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setInItemQuantities({
                                ...inItemQuantities,
                                [it.id]: {
                                  ok: val,
                                  ng: Math.max(0, Number(it.qty_sent) - val)
                                }
                              });
                            }}
                            className="w-16 px-2 py-1 text-center bg-gray-50 border border-gray-200 rounded font-bold"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            value={inItemQuantities[it.id]?.ng ?? 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setInItemQuantities({
                                ...inItemQuantities,
                                [it.id]: {
                                  ok: Math.max(0, Number(it.qty_sent) - val),
                                  ng: val
                                }
                              });
                            }}
                            className="w-16 px-2 py-1 text-center bg-gray-50 border border-red-200 rounded font-bold text-red-600"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Submit */}
              <div className="pt-4 flex gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsInModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-xl text-xs font-black uppercase"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={inSubmitting}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white py-3 rounded-xl text-xs font-black uppercase shadow-md shadow-cyan-200"
                >
                  {inSubmitting ? "Menyimpan..." : "Konfirmasi Inspeksi QC"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CLAIM INVESTIGATION MODAL */}
      {isClaimModalOpen && selectedClaim && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg border border-gray-100 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-4 border-b border-gray-100 flex justify-between items-center bg-rose-50/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-200">
                  <FileSearch size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Investigasi Klaim Pelanggan</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">{selectedClaim.claim_code}</p>
                </div>
              </div>
              <button onClick={() => setIsClaimModalOpen(false)} className="p-2 rounded-full hover:bg-white text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveClaimInvestigation} className="p-8 pt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Disposisi Penanganan</label>
                <select
                  value={claimDisposition}
                  onChange={(e) => setClaimDisposition(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                >
                  <option value="REWORK_PROD">Rework di Produksi</option>
                  <option value="CRUSHER_RECYCLE">Giling Ulang Crusher</option>
                  <option value="DISPOSAL_SCRAP">Disposal / Pemusnahan Limbah</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Analisis Akar Masalah (Root Cause)</label>
                <textarea
                  placeholder="Jelaskan faktor mesin, mold, material, atau operator..."
                  value={claimRootCause}
                  onChange={(e) => setClaimRootCause(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold h-24 resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-xl text-xs font-black uppercase"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={claimSubmitting}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl text-xs font-black uppercase shadow-md shadow-rose-200"
                >
                  {claimSubmitting ? "Menyimpan..." : "Simpan Investigasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QCGateMasterHubPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400 font-bold">Memuat Quality Control Hub...</div>}>
      <QcGateMasterContent />
    </Suspense>
  );
}
