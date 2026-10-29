"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  User,
  Factory,
  ClipboardCheck,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  Sliders,
  Sparkles
} from "lucide-react";
import api from "@/lib/api";

interface MoldingNgLog {
  id: number;
  pro_id: number;
  pro_code: string;
  product_name: string;
  product_code: string;
  qty_ok: number;
  qty_ng: number;
  ng_type: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

interface VendorClaim {
  id: number;
  production_output_id: number;
  product_id: number;
  qty_ng_component: number;
  status: string;
  product_name: string;
  product_code: string;
  product_unit: string;
  parent_qty_ng: number;
  pro_code: string;
  created_at: string;
}

interface CustomerClaim {
  id: number;
  claim_code: string;
  customer_id: number;
  customer_name: string;
  product_id: number;
  product_name: string;
  product_code: string;
  product_unit: string;
  qty_claimed: number;
  claim_date: string;
  ng_type: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

interface Customer {
  id: number;
  customer_name: string;
}

interface Product {
  id: number;
  product_name: string;
  product_code: string;
}

export default function QualityControlPage() {
  const router = useRouter();

  // Active sub-tab state
  const [activeTab, setActiveTab] = useState<"molding-ng" | "vendor-claims" | "customer-claims">("molding-ng");

  // Listing Data States
  const [moldingLogs, setMoldingLogs] = useState<MoldingNgLog[]>([]);
  const [vendorClaims, setVendorClaims] = useState<VendorClaim[]>([]);
  const [customerClaims, setCustomerClaims] = useState<CustomerClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Customers & Products lists for claim form
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Modals state
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusModalType, setStatusModalType] = useState<"vendor" | "customer">("customer");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState("");

  // Molding NG Verification Modal States
  const [isVerifyNgModalOpen, setIsVerifyNgModalOpen] = useState(false);
  const [selectedNgLog, setSelectedNgLog] = useState<MoldingNgLog | null>(null);
  const [verifyNgType, setVerifyNgType] = useState("");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [verifyingNg, setVerifyingNg] = useState(false);

  // New Claim Form State
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formProductId, setFormProductId] = useState("");
  const [formQty, setFormQty] = useState<number | "">("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formNgType, setFormNgType] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Fetch QC and Claim logs
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Molding outputs and filter where qty_ng > 0
      const poRes = await api.express.get("/manufacturing/production-outputs").catch(() => null);
      if (poRes && poRes.data && poRes.data.success) {
        const logs = (poRes.data.data || []).filter((o: any) => Number(o.qty_ng) > 0);
        setMoldingLogs(logs);
      }

      // 2. Fetch Defective Component / Vendor Claims
      const vcRes = await api.express.get("/manufacturing/vendor-claims").catch(() => null);
      if (vcRes && vcRes.data && vcRes.data.success) {
        setVendorClaims(vcRes.data.data || []);
      }

      // 3. Fetch Customer Claims
      const ccRes = await api.express.get("/manufacturing/customer-claims").catch(() => null);
      if (ccRes && ccRes.data && ccRes.data.success) {
        setCustomerClaims(ccRes.data.data || []);
      }
    } catch (err) {
      console.error("Error loading QC data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load supporting dropdown data
  const loadMetadata = async () => {
    try {
      // Fetch customers-list
      const custRes = await api.express.get("/customers-list").catch(() => null);
      if (custRes && custRes.data && custRes.data.success) {
        setCustomers(custRes.data.data || []);
      } else {
        // Fallback mock
        setCustomers([
          { id: 1, customer_name: "PT Astra Honda Motor" },
          { id: 2, customer_name: "PT Yamaha Indonesia Motor Manufacturing" },
          { id: 3, customer_name: "PT Suzuki Indomobil Motor" }
        ]);
      }

      // Fetch products
      const prodRes = await api.express.get("/products").catch(() => null);
      if (prodRes && prodRes.data && prodRes.data.success) {
        // Only show Finished Goods or WIP products
        const list = prodRes.data.data || [];
        setProducts(list);
      } else {
        // Fallback mock
        setProducts([
          { id: 10, product_name: "HOLDER MIRROR RH 29702-C0100 SAPTA SC", product_code: "HD-MIR-RH-29702" },
          { id: 11, product_name: "MIRROR BRACKET LH 29701-C0100 SAPTA SC", product_code: "BRK-MIR-LH-29701" }
        ]);
      }
    } catch (err) {
      console.error("Error loading dropdown data:", err);
    }
  };

  useEffect(() => {
    loadData();
    loadMetadata();
  }, []);

  const handleOpenVerifyNgModal = (log: MoldingNgLog) => {
    setSelectedNgLog(log);
    setVerifyNgType(log.ng_type || "");
    setVerifyNotes(log.notes || "");
    setIsVerifyNgModalOpen(true);
  };

  const handleVerifyNgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNgLog) return;

    setVerifyingNg(true);
    try {
      const res = await api.express.put(`/manufacturing/production-outputs/${selectedNgLog.id}/verify-ng`, {
        ng_type: verifyNgType,
        notes: verifyNotes
      });
      if (res && res.data && res.data.success) {
        alert("Laporan NG molding berhasil diverifikasi oleh QC!");
        setIsVerifyNgModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      console.error("Error verifying molding NG:", err);
      alert(err.response?.data?.message || err.message || "Gagal memverifikasi NG.");
    } finally {
      setVerifyingNg(false);
    }
  };

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerId || !formProductId || !formQty || !formDate) {
      alert("Mohon isi semua field wajib.");
      return;
    }

    setSubmittingClaim(true);
    try {
      const payload = {
        customer_id: Number(formCustomerId),
        product_id: Number(formProductId),
        qty_claimed: Number(formQty),
        claim_date: formDate,
        ng_type: formNgType || null,
        notes: formNotes || null
      };

      const res = await api.express.post("/manufacturing/customer-claims", payload);
      if (res && res.data && res.data.success) {
        alert(`Klaim pelanggan berhasil disimpan dengan kode: ${res.data.claim_code}`);
        setIsClaimModalOpen(false);
        // Reset form
        setFormCustomerId("");
        setFormProductId("");
        setFormQty("");
        setFormNgType("");
        setFormNotes("");
        loadData();
      }
    } catch (err: any) {
      console.error("Error creating customer claim:", err);
      alert(err.response?.data?.message || err.message || "Gagal menyimpan klaim.");
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleOpenStatusModal = (type: "vendor" | "customer", id: number, currentStatus: string) => {
    setStatusModalType(type);
    setSelectedItemId(id);
    setNewStatus(currentStatus);
    setIsStatusModalOpen(true);
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) return;

    setUpdatingStatus(true);
    try {
      let endpoint = "";
      if (statusModalType === "vendor") {
        endpoint = `/manufacturing/vendor-claims/${selectedItemId}/status`;
      } else {
        endpoint = `/manufacturing/customer-claims/${selectedItemId}/status`;
      }

      const res = await api.express.put(endpoint, { status: newStatus });
      if (res && res.data && res.data.success) {
        alert("Status klaim berhasil diperbarui!");
        setIsStatusModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      console.error("Error updating claim status:", err);
      alert(err.response?.data?.message || err.message || "Gagal memperbarui status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Filters based on tab and search
  const filteredMolding = moldingLogs.filter((o) => {
    const term = search.toLowerCase();
    return (
      o.pro_code.toLowerCase().includes(term) ||
      o.product_name.toLowerCase().includes(term) ||
      o.product_code.toLowerCase().includes(term) ||
      (o.ng_type && o.ng_type.toLowerCase().includes(term))
    );
  });

  const filteredVendor = vendorClaims.filter((vc) => {
    const term = search.toLowerCase();
    return (
      vc.pro_code.toLowerCase().includes(term) ||
      vc.product_name.toLowerCase().includes(term) ||
      vc.product_code.toLowerCase().includes(term) ||
      vc.status.toLowerCase().includes(term)
    );
  });

  const filteredCustomer = customerClaims.filter((cc) => {
    const term = search.toLowerCase();
    return (
      cc.claim_code.toLowerCase().includes(term) ||
      cc.customer_name.toLowerCase().includes(term) ||
      cc.product_name.toLowerCase().includes(term) ||
      cc.product_code.toLowerCase().includes(term) ||
      cc.status.toLowerCase().includes(term)
    );
  });

  // Status badges helpers
  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
      case "WIP":
      case "SFG_PENDING_QC":
      case "QUARANTINED":
        return (
          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-max mx-auto">
            <Clock size={10} /> Pending / Quarantine
          </span>
        );
      case "APPROVED":
      case "RESOLVED":
      case "REPLACED":
      case "REPLACED_BY_VENDOR":
      case "VERIFIED_QC":
      case "RECEIVED_FG":
        return (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-max mx-auto">
            <CheckCircle2 size={10} /> Selesai / OK
          </span>
        );
      case "REJECTED":
      case "RETURNED_TO_VENDOR":
      case "SCRAPPED":
      case "REJECTED_QC":
        return (
          <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 w-max mx-auto">
            <XCircle size={10} /> Rejected / Dibuang
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-gray-50 text-gray-500 border border-gray-200 text-[9px] font-black rounded-full uppercase tracking-wider w-max mx-auto">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen animate-in fade-in duration-500">
      
      {/* Back button */}
      <button 
        onClick={() => router.push("/manufacturing")}
        className="flex items-center gap-2 text-xs font-black text-emerald-600 hover:text-emerald-800 transition-colors uppercase tracking-widest"
      >
        <ArrowLeft size={14} /> Back to Manufacturing
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-200">
              <ShieldCheck className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Quality <span className="text-emerald-600">Control Logs</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Pantau seluruh laporan cacat produksi, antrean klaim komponen ke vendor, dan klaim cacat produk jadi dari customer.
          </p>
        </div>

        {activeTab === "customer-claims" && (
          <button
            onClick={() => setIsClaimModalOpen(true)}
            className="group flex items-center gap-2 bg-gray-950 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            <span>Klaim Baru Customer</span>
          </button>
        )}
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Defect Molding Logs</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600"><Activity size={18} /></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-950">
              {moldingLogs.length}
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Catatan output produksi bernilai cacat (NG).
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Klaim Defect Vendor</span>
            <div className="p-2 bg-red-50 rounded-xl text-red-600"><Layers size={18} /></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-950">
              {vendorClaims.filter(v => v.status === 'QUARANTINED').length}
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Komponen sisipan logam cacat menunggu klaim/kirim ulang.
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Klaim Aktif Customer</span>
            <div className="p-2 bg-rose-50 rounded-xl text-rose-600"><User size={18} /></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-950">
              {customerClaims.filter(c => c.status === 'PENDING').length}
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Klaim produk retur dari customer yang perlu diproses.
            </p>
          </div>
        </div>
      </div>

      {/* Tab Control */}
      <div className="flex border-b border-gray-100 pb-2 gap-6">
        <button
          onClick={() => {
            setActiveTab("molding-ng");
            setSearch("");
          }}
          className={`pb-3 text-sm font-black uppercase tracking-wider transition-all border-b-2 ${
            activeTab === "molding-ng" 
              ? "border-emerald-600 text-emerald-600 font-extrabold" 
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Molding Defect (NG) Logs
        </button>
        <button
          onClick={() => {
            setActiveTab("vendor-claims");
            setSearch("");
          }}
          className={`pb-3 text-sm font-black uppercase tracking-wider transition-all border-b-2 ${
            activeTab === "vendor-claims" 
              ? "border-emerald-600 text-emerald-600 font-extrabold" 
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Klaim Defect Vendor
        </button>
        <button
          onClick={() => {
            setActiveTab("customer-claims");
            setSearch("");
          }}
          className={`pb-3 text-sm font-black uppercase tracking-wider transition-all border-b-2 ${
            activeTab === "customer-claims" 
              ? "border-emerald-600 text-emerald-600 font-extrabold" 
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Klaim Cacat Customer
        </button>
      </div>

      {/* Main List Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4">
          <h3 className="text-base font-black text-gray-900 uppercase tracking-wide">
            {activeTab === "molding-ng" && "Catatan Cacat Molding (Hasil Produksi)"}
            {activeTab === "vendor-claims" && "Daftar Cacat Komponen Logam (Vendor Claims)"}
            {activeTab === "customer-claims" && "Riwayat Klaim Defect Produk dari Customer"}
          </h3>
          
          <div className="relative w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Cari referensi, barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:bg-white outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === "molding-ng" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">No. Run Log</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">PrO Code</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Barang Target</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Jumlah Cacat</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipe NG</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan Operator</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Tanggal</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={9} className="px-6 py-6"><div className="h-10 bg-gray-50 rounded-xl w-full"></div></td>
                    </tr>
                  ))
                ) : filteredMolding.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-24 text-center font-bold text-gray-400 uppercase tracking-widest text-sm bg-gray-50/10">
                      Tidak ada catatan cacat (NG) molding terdaftar.
                    </td>
                  </tr>
                ) : (
                  filteredMolding.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-5 font-black text-gray-700 text-xs">#OUT-{log.id}</td>
                      <td className="px-6 py-5 font-bold text-emerald-600 text-xs">{log.pro_code}</td>
                      <td className="px-6 py-5">
                        <div className="font-bold text-gray-800 text-xs truncate max-w-xs">{log.product_name}</div>
                        <div className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">{log.product_code}</div>
                      </td>
                      <td className="px-6 py-5 text-center font-black text-red-500 text-xs">{log.qty_ng.toLocaleString()} Pcs</td>
                      <td className="px-6 py-5">
                        {log.ng_type ? (
                          <span className="px-2.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-full text-[9px] font-bold">
                            {log.ng_type}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Belum diisi</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-xs font-semibold text-gray-600 italic truncate max-w-[200px]" title={log.notes || ""}>
                        {log.notes ? `"${log.notes}"` : "-"}
                      </td>
                      <td className="px-6 py-5 text-center">{getStatusBadge(log.status)}</td>
                      <td className="px-6 py-5 text-center text-[10px] font-bold text-gray-400">{log.created_at}</td>
                      <td className="px-6 py-5 text-center">
                        {log.status === "WIP" || log.status === "SFG_PENDING_QC" ? (
                          <button
                            onClick={() => handleOpenVerifyNgModal(log)}
                            className="px-3 py-1.5 bg-gray-950 hover:bg-emerald-600 text-white rounded-lg font-black text-[10px] uppercase tracking-wider transition-all"
                          >
                            Verifikasi NG
                          </button>
                        ) : (
                          <span className="text-gray-400 font-bold text-[10px]">Diverifikasi</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === "vendor-claims" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">ID Tiket</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Komponen Logam</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Jumlah Cacat</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">PrO Rujukan</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Tanggal</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={7} className="px-6 py-6"><div className="h-10 bg-gray-50 rounded-xl w-full"></div></td>
                    </tr>
                  ))
                ) : filteredVendor.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-24 text-center font-bold text-gray-400 uppercase tracking-widest text-sm bg-gray-50/10">
                      Tidak ada klaim defect vendor terdaftar.
                    </td>
                  </tr>
                ) : (
                  filteredVendor.map((vc) => (
                    <tr key={vc.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-5 font-black text-gray-700 text-xs">#VC-{vc.id}</td>
                      <td className="px-6 py-5">
                        <div className="font-bold text-gray-800 text-xs truncate max-w-xs">{vc.product_name}</div>
                        <div className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">{vc.product_code}</div>
                      </td>
                      <td className="px-6 py-5 text-center font-black text-red-500 text-xs">{vc.qty_ng_component.toLocaleString()} {vc.product_unit || "Pcs"}</td>
                      <td className="px-6 py-5 font-bold text-emerald-600 text-xs">{vc.pro_code}</td>
                      <td className="px-6 py-5 text-center">{getStatusBadge(vc.status)}</td>
                      <td className="px-6 py-5 text-center text-[10px] font-bold text-gray-400">{vc.created_at}</td>
                      <td className="px-6 py-5 text-center">
                        <button
                          onClick={() => handleOpenStatusModal("vendor", vc.id, vc.status)}
                          className="px-3 py-1.5 bg-gray-950 hover:bg-emerald-600 text-white rounded-lg font-black text-[10px] uppercase tracking-wider transition-all"
                        >
                          Ubah Status
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === "customer-claims" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">No. Klaim</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Customer</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Barang Target</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Jumlah Cacat</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipe Cacat</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Tanggal Input</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={8} className="px-6 py-6"><div className="h-10 bg-gray-50 rounded-xl w-full"></div></td>
                    </tr>
                  ))
                ) : filteredCustomer.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-24 text-center font-bold text-gray-400 uppercase tracking-widest text-sm bg-gray-50/10">
                      Belum ada laporan klaim defect dari customer.
                    </td>
                  </tr>
                ) : (
                  filteredCustomer.map((cc) => (
                    <tr key={cc.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-5 font-black text-gray-950 text-xs">{cc.claim_code}</td>
                      <td className="px-6 py-5 font-bold text-gray-800 text-xs">{cc.customer_name}</td>
                      <td className="px-6 py-5">
                        <div className="font-bold text-gray-800 text-xs truncate max-w-xs">{cc.product_name}</div>
                        <div className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">{cc.product_code}</div>
                      </td>
                      <td className="px-6 py-5 text-center font-black text-red-500 text-xs">{cc.qty_claimed.toLocaleString()} {cc.product_unit || "Pcs"}</td>
                      <td className="px-6 py-5">
                        <span className="px-2.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-full text-[9px] font-bold">
                          {cc.ng_type || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">{getStatusBadge(cc.status)}</td>
                      <td className="px-6 py-5 text-center text-[10px] font-bold text-gray-400">{cc.claim_date}</td>
                      <td className="px-6 py-5 text-center">
                        <button
                          onClick={() => handleOpenStatusModal("customer", cc.id, cc.status)}
                          className="px-3 py-1.5 bg-gray-950 hover:bg-emerald-600 text-white rounded-lg font-black text-[10px] uppercase tracking-wider transition-all"
                        >
                          Proses Klaim
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* POP-UP MODAL LOG NEW CUSTOMER CLAIM */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl border border-gray-100 shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Klaim Defect Pelanggan</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">Catat klaim cacat (NG) produk dari customer</p>
                </div>
              </div>
              <button 
                onClick={() => setIsClaimModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                [X]
              </button>
            </div>

            <form onSubmit={handleCreateClaim} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Nama Customer</label>
                <select
                  value={formCustomerId}
                  onChange={(e) => setFormCustomerId(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-red-500/20 transition-all h-12"
                >
                  <option value="">-- Pilih Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.customer_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Produk / Barang Cacat</label>
                <select
                  value={formProductId}
                  onChange={(e) => setFormProductId(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-red-500/20 transition-all h-12"
                >
                  <option value="">-- Pilih Produk --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.product_name} ({p.product_code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Kuantitas Klaim</label>
                  <input
                    type="number"
                    min={1}
                    value={formQty}
                    onChange={(e) => setFormQty(e.target.value === "" ? "" : Number(e.target.value))}
                    required
                    placeholder="Contoh: 50"
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-red-500/20 transition-all h-12 text-center text-red-500 font-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Tanggal Klaim</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-red-500/20 transition-all h-12 text-center text-gray-700 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Pilihan Type NG</label>
                <select
                  value={formNgType}
                  onChange={(e) => setFormNgType(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-red-500/20 transition-all h-12"
                >
                  <option value="">-- Pilih Tipe Cacat (NG) --</option>
                  <option value="Flash">Flash (Luber)</option>
                  <option value="Short Shot">Short Shot (Kurang Bahan)</option>
                  <option value="Sink Mark">Sink Mark (Penyusutan)</option>
                  <option value="Bubble">Bubble (Bintik Udara)</option>
                  <option value="Silver Streak">Silver Streak</option>
                  <option value="Flow Mark">Flow Mark</option>
                  <option value="Warping">Warping (Melengkung)</option>
                  <option value="Crack">Crack (Retak)</option>
                  <option value="Color Contamination">Color Contamination (Kontaminasi Warna)</option>
                  <option value="Defect Component">Defect Component (Cacat Komponen)</option>
                  <option value="Lain-lain">Lain-lain</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Catatan Detail Cacat</label>
                <textarea
                  placeholder="Keterangan baret, salah assembly, kontaminasi, dsb..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-red-500/20 transition-all h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  disabled={submittingClaim}
                  className="px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-xs font-bold transition-all h-12"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingClaim}
                  className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all h-12 shadow-lg disabled:opacity-50"
                >
                  {submittingClaim ? "Mengirim..." : "Kirim Laporan Klaim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP MODAL UPDATE CLAIM/VENDOR CLAIM STATUS */}
      {isStatusModalOpen && selectedItemId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md border border-gray-100 shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h3 className="text-lg font-black text-gray-900">
                Ubah Status {statusModalType === "vendor" ? "Klaim Vendor" : "Klaim Customer"}
              </h3>
              <button 
                onClick={() => setIsStatusModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                [X]
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Pilih Status Baru</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all h-12"
                >
                  {statusModalType === "vendor" ? (
                    <>
                      <option value="QUARANTINED">QUARANTINED (Karantina / Baru)</option>
                      <option value="RETURNED_TO_VENDOR">RETURNED TO VENDOR (Dikembalikan)</option>
                      <option value="REPLACED_BY_VENDOR">REPLACED BY VENDOR (Diganti Baru)</option>
                      <option value="SCRAPPED">SCRAPPED (Dihancurkan / Giling)</option>
                    </>
                  ) : (
                    <>
                      <option value="PENDING">PENDING (Menunggu Evaluasi)</option>
                      <option value="APPROVED">APPROVED (Disetujui / Diganti)</option>
                      <option value="REJECTED">REJECTED (Ditolak)</option>
                      <option value="RESOLVED">RESOLVED (Selesai)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  disabled={updatingStatus}
                  className="px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-xs font-bold transition-all h-12"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all h-12 shadow-lg disabled:opacity-50"
                >
                  {updatingStatus ? "Menyimpan..." : "Simpan Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP MODAL VERIFIKASI MOLDING NG */}
      {isVerifyNgModalOpen && selectedNgLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md border border-gray-100 shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h3 className="text-lg font-black text-gray-900">
                Verifikasi Cacat Molding
              </h3>
              <button 
                onClick={() => setIsVerifyNgModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                [X]
              </button>
            </div>

            <form onSubmit={handleVerifyNgSubmit} className="space-y-6">
              <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50 space-y-2 text-xs">
                <div>
                  <span className="font-black text-gray-400 uppercase tracking-wider block">No. Run Log / PrO Code</span>
                  <p className="font-bold text-gray-800">#OUT-{selectedNgLog.id} / {selectedNgLog.pro_code}</p>
                </div>
                <div>
                  <span className="font-black text-gray-400 uppercase tracking-wider block">Barang / Jumlah NG</span>
                  <p className="font-bold text-red-600">{selectedNgLog.product_name} ({selectedNgLog.product_code}) - {selectedNgLog.qty_ng} Pcs</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Pilih Tipe NG</label>
                <select
                  value={verifyNgType}
                  onChange={(e) => setVerifyNgType(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all h-12"
                >
                  <option value="">-- Pilih Tipe Cacat (NG) --</option>
                  <option value="Flash">Flash (Luber)</option>
                  <option value="Short Shot">Short Shot (Kurang Bahan)</option>
                  <option value="Sink Mark">Sink Mark (Penyusutan)</option>
                  <option value="Bubble">Bubble (Bintik Udara)</option>
                  <option value="Silver Streak">Silver Streak</option>
                  <option value="Flow Mark">Flow Mark</option>
                  <option value="Warping">Warping (Melengkung)</option>
                  <option value="Crack">Crack (Retak)</option>
                  <option value="Color Contamination">Color Contamination (Kontaminasi Warna)</option>
                  <option value="Defect Component">Defect Component (Cacat Komponen)</option>
                  <option value="Lain-lain">Lain-lain</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Catatan Verifikasi QC</label>
                <textarea
                  placeholder="Masukkan keterangan audit QC..."
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all h-24 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsVerifyNgModalOpen(false)}
                  disabled={verifyingNg}
                  className="px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-xs font-bold transition-all h-12"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={verifyingNg}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all h-12 shadow-lg disabled:opacity-50"
                >
                  {verifyingNg ? "Verifikasi..." : "Verifikasi & Rilis Pengganti"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
