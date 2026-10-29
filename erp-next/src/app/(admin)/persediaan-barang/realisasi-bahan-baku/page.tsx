"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRightLeft,
  Plus,
  Search,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  FileText,
  Boxes,
  Trash2,
  Layers,
  ArrowRight,
  Clock,
  Send,
  Package,
  Check
} from "lucide-react";
import api from "@/lib/api";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";

interface MaterialIssuanceDetail {
  id: number;
  issuance_id: number;
  product_id: number;
  supplier_id: number | null;
  qty_to_issue: number;
  product_name: string;
  product_code: string;
  supplier_name: string | null;
}

interface MaterialIssuance {
  id: number;
  reference: string;
  date: string;
  work_order_id: number;
  status: "Draft" | "Issued";
  note: string;
  wo_reference: string;
  product_name: string;
  product_code: string;
  details: MaterialIssuanceDetail[];
}

interface ScannedLot {
  id: string;
  product_code: string;
  lot_number: string;
  qty: number;
}

export default function RealisasiBahanBakuPage() {
  const router = useRouter();

  // State
  const [issuances, setIssuances] = useState<MaterialIssuance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIssuance, setSelectedIssuance] = useState<MaterialIssuance | null>(null);
  
  // Barcode scanning verification states
  const [scannedLots, setScannedLots] = useState<ScannedLot[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");

  // Create Issuance Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [woList, setWoList] = useState<any[]>([]);
  const [selectedWoId, setSelectedWoId] = useState("");
  const [selectedWoDetails, setSelectedWoDetails] = useState<any | null>(null);
  const [issDate, setIssDate] = useState(new Date().toISOString().split("T")[0]);
  const [issNote, setIssNote] = useState("");
  const [newIssDetails, setNewIssDetails] = useState<any[]>([]);
  const [matkomStocks, setMatkomStocks] = useState<any[]>([]);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tab control
  const [activeTab, setActiveTab] = useState<"realisasi" | "replacement">("realisasi");

  // Replacement States
  const [replacements, setReplacements] = useState<any[]>([]);
  const [replacementsLoading, setReplacementsLoading] = useState(false);
  const [selectedReplacement, setSelectedReplacement] = useState<any | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [shipBarcodeInput, setShipBarcodeInput] = useState("");
  const [scannedShipLot, setScannedShipLot] = useState<any | null>(null);
  const [isShipping, setIsShipping] = useState(false);

  // Fetch All Material Issuances
  const fetchIssuances = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/manufacturing/material-issuances");
      if (res && res.data && res.data.success) {
        setIssuances(res.data.data || []);
      }
    } catch (err) {
      console.error("Error loading material issuances:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch active WOs for creation dropdown
  const fetchActiveWorkOrders = async () => {
    try {
      const res = await api.express.get("/manufacturing/work-orders");
      if (res && res.data && res.data.success) {
        // Only show Pending or Released work orders
        setWoList(res.data.data.filter((wo: any) => wo.status !== "Completed") || []);
      }
    } catch (err) {
      console.error("Error fetching work orders:", err);
    }
  };

  // Load MATKOM stock for vendor allocation in modal
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

  // Fetch replacements
  const fetchReplacements = async () => {
    setReplacementsLoading(true);
    try {
      const res = await api.express.get("/manufacturing/replacements");
      if (res && res.data && res.data.success) {
        setReplacements(res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching replacements:", err);
    } finally {
      setReplacementsLoading(false);
    }
  };

  // Ship replacement submission
  const handleShipReplacement = async () => {
    if (!selectedReplacement) return;

    const replacementStocks = matkomStocks.filter(
      (s) => String(s.product_id) === String(selectedReplacement.product_id) && s.supplier_id !== null
    );
    const isMultiVendor = replacementStocks.length > 0;

    if (isMultiVendor && !selectedSupplierId) {
      alert("Mohon pilih vendor/supplier spesifik untuk komponen pengganti.");
      return;
    }

    setIsShipping(true);
    try {
      const payload: any = {
        supplier_id: selectedSupplierId ? Number(selectedSupplierId) : null
      };
      if (scannedShipLot) {
        payload.barcode = `${scannedShipLot.product_code}|${scannedShipLot.lot_number}|${scannedShipLot.qty}`;
      }
      const res = await api.express.post(`/manufacturing/replacements/${selectedReplacement.id}/ship`, payload);
      if (res && res.data && res.data.success) {
        alert("Komponen pengganti berhasil dikirim ke lantai produksi!");
        setSelectedReplacement(null);
        setSelectedSupplierId("");
        setScannedShipLot(null);
        setShipBarcodeInput("");
        fetchReplacements();
        loadMatkomStocks();
      }
    } catch (err: any) {
      console.error("Error shipping replacement:", err);
      alert(err.response?.data?.message || err.message || "Gagal mengirim komponen pengganti.");
    } finally {
      setIsShipping(false);
    }
  };

  const processShipBarcode = (barcode: string) => {
    if (!selectedReplacement) return;
    
    const parts = barcode.split("|");
    if (parts.length < 3) {
      alert(`Format barcode tidak valid (${barcode}). Gunakan format [KodeBarang]|[NoLot]|[Kuantitas].`);
      return;
    }

    const [itemCode, lotNo, qtyStr] = parts;
    const qty = Number(qtyStr) || 0;

    if (itemCode.toUpperCase() !== selectedReplacement.product_code.toUpperCase()) {
      alert(`Barang dengan kode "${itemCode}" tidak cocok dengan komponen yang diminta (${selectedReplacement.product_code}).`);
      return;
    }

    if (qty < selectedReplacement.qty_requested) {
      alert(`Kuantitas scan (${qty}) kurang dari kuantitas yang diminta (${selectedReplacement.qty_requested}).`);
      return;
    }

    setScannedShipLot({
      product_code: itemCode,
      lot_number: lotNo,
      qty: qty
    });
  };

  const handleManualShipScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (shipBarcodeInput.trim()) {
      processShipBarcode(shipBarcodeInput.trim());
      setShipBarcodeInput("");
    }
  };

  useEffect(() => {
    fetchIssuances();
    fetchActiveWorkOrders();
    loadMatkomStocks();
    fetchReplacements();
  }, []);

  // Sync selected issuance when list updates (to reflect status changes)
  useEffect(() => {
    if (selectedIssuance) {
      const updated = issuances.find(i => i.id === selectedIssuance.id);
      if (updated) {
        setSelectedIssuance(updated);
      }
    }
  }, [issuances]);

  // Global Keyboard Barcode scanner listener via hook
  useBarcodeScanner({
    onScan: (barcode) => {
      processScannedBarcode(barcode);
    },
    enabled: !!selectedIssuance && selectedIssuance.status === "Draft",
  });

  // Process scanned barcode for Draft Verification
  const processScannedBarcode = (barcode: string) => {
    if (!selectedIssuance) return;

    // Expected format: [ItemCode]|[LotNo]|[Qty]
    // Example: EPNS-KNSP4MKWW|LOT-20260620-01|500
    const parts = barcode.split("|");
    if (parts.length < 3) {
      alert(`Format barcode tidak valid (${barcode}). Gunakan format [KodeBarang]|[NoLot]|[Kuantitas].`);
      return;
    }

    const [itemCode, lotNo, qtyStr] = parts;
    const qty = Number(qtyStr) || 0;

    // Verify if item exists in the issuance
    const matchedItem = selectedIssuance.details.find(
      (d) => d.product_code.toUpperCase() === itemCode.toUpperCase()
    );

    if (!matchedItem) {
      alert(`Barang dengan kode "${itemCode}" tidak terdaftar dalam draf pengeluaran ini.`);
      return;
    }

    // Add to scanned lots list
    const newLot: ScannedLot = {
      id: Date.now().toString(),
      product_code: matchedItem.product_code,
      lot_number: lotNo,
      qty: qty
    };

    setScannedLots((prev) => [newLot, ...prev]);
  };

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      processScannedBarcode(barcodeInput.trim());
      setBarcodeInput("");
    }
  };

  // Get total scanned quantity for a specific product
  const getScannedQty = (productCode: string) => {
    return scannedLots
      .filter((l) => l.product_code.toUpperCase() === productCode.toUpperCase())
      .reduce((sum, l) => sum + l.qty, 0);
  };

  // Release material issuance (Draft -> Issued)
  const handleReleaseIssuance = async (issuanceId: number) => {
    if (!confirm("Apakah Anda yakin ingin merilis pengeluaran bahan baku ini? Stok MATKOM akan terpotong secara riil.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await api.express.put(`/manufacturing/material-issuances/${issuanceId}/release`);
      alert(res.data.message || "Material berhasil dirilis dan dikirim ke area produksi!");
      setScannedLots([]);
      await fetchIssuances();
    } catch (err: any) {
      console.error("Error releasing material issuance:", err);
      alert(err.response?.data?.message || err.message || "Gagal merilis material.");
    } finally {
      setLoading(false);
    }
  };

  // Handle WO Selection in Creation Modal
  const handleWoSelection = async (woId: string) => {
    setSelectedWoId(woId);
    if (!woId) {
      setSelectedWoDetails(null);
      setNewIssDetails([]);
      return;
    }

    try {
      const res = await api.express.get(`/manufacturing/work-orders/${woId}`);
      if (res && res.data && res.data.success) {
        const wo = res.data.data;
        setSelectedWoDetails(wo);

        // Prepopulate details
        const details = (wo.materials || []).map((m: any) => {
          return {
            product_id: m.product_id,
            product_name: m.product_name,
            product_code: m.product_code,
            qty_required: Number(m.qty_required) - Number(m.qty_issued),
            supplier_id: "",
            qty_to_issue: Math.max(0, Number(m.qty_required) - Number(m.qty_issued))
          };
        });
        setNewIssDetails(details);
      }
    } catch (err) {
      console.error("Error loading WO details:", err);
    }
  };

  const handleNewIssDetailChange = (index: number, field: string, value: any) => {
    const updated = [...newIssDetails];
    updated[index][field] = value;
    setNewIssDetails(updated);
  };

  // Submit/Create Draft Material Issuance from modal
  const handleCreateIssuance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWoId || newIssDetails.length === 0) {
      alert("Pilih Work Order dan masukkan minimal satu material.");
      return;
    }

    // Verify vendor selection for multi-vendor items
    if (newIssDetails.some(d => !d.supplier_id && d.qty_to_issue > 0)) {
      const incomplete = newIssDetails.find(d => {
        const hasSuppliers = matkomStocks.some(s => String(s.product_id) === String(d.product_id) && s.supplier_id !== null);
        return hasSuppliers && !d.supplier_id && d.qty_to_issue > 0;
      });

      if (incomplete) {
        alert(`Mohon pilih vendor/supplier spesifik untuk material: ${incomplete.product_name}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await api.express.post("/manufacturing/material-issuances", {
        date: issDate,
        work_order_id: Number(selectedWoId),
        note: issNote,
        details: newIssDetails.filter(d => d.qty_to_issue > 0).map(d => ({
          product_id: Number(d.product_id),
          supplier_id: d.supplier_id ? Number(d.supplier_id) : null,
          qty_to_issue: Number(d.qty_to_issue)
        }))
      });

      alert("Draf Permintaan Pengeluaran berhasil dibuat!");
      setIsModalOpen(false);
      setSelectedWoId("");
      setSelectedWoDetails(null);
      setNewIssDetails([]);
      setIssNote("");
      fetchIssuances();
    } catch (err: any) {
      console.error("Error creating material issuance:", err);
      alert(err.response?.data?.message || err.message || "Gagal membuat draf permintaan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRealizations = issuances.filter(r => {
    const term = search.toLowerCase();
    return (
      r.reference?.toLowerCase().includes(term) ||
      r.wo_reference?.toLowerCase().includes(term) ||
      r.product_name?.toLowerCase().includes(term) ||
      r.product_code?.toLowerCase().includes(term)
    );
  });

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
              <ArrowRightLeft className="text-white" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                  No. 2
                </span>
                <h1 className="text-4xl font-black tracking-tight text-gray-900">
                  Store ke Preparation <span className="text-emerald-600">(OUT)</span>
                </h1>
              </div>
              <p className="text-gray-500 font-medium ml-1 mt-1 text-xs">
                Pengeluaran Bahan Baku dari Gudang Material (MATKOM) ke Area Preparation/Mixing sesuai Standard Packaging.
              </p>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => {
            setIsModalOpen(true);
            loadMatkomStocks();
          }}
          className="group flex items-center gap-3 bg-gray-950 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-100 active:scale-95 overflow-hidden"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Buat Permintaan Baru</span>
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-100 pb-2 gap-6">
        <button
          onClick={() => {
            setActiveTab("realisasi");
            setSelectedIssuance(null);
            setSearch("");
          }}
          className={`pb-3 text-sm font-black uppercase tracking-wider transition-all border-b-2 ${
            activeTab === "realisasi" 
              ? "border-emerald-600 text-emerald-600 font-extrabold" 
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Realisasi & Draf WO
        </button>
        <button
          onClick={() => {
            setActiveTab("replacement");
            setSelectedReplacement(null);
            setSearch("");
            fetchReplacements();
          }}
          className={`pb-3 text-sm font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "replacement" 
              ? "border-emerald-600 text-emerald-600 font-extrabold" 
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Antrean Pengganti Komponen
          {replacements.filter(r => r.status === 'PENDING_QC' || r.status === 'PENDING').length > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-black rounded-full">
              {replacements.filter(r => r.status === 'PENDING_QC' || r.status === 'PENDING').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "realisasi" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Table List */}
          <div className={`bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col transition-all duration-300 ${selectedIssuance ? "lg:col-span-6" : "lg:col-span-12"}`}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4">
              <h3 className="text-base font-black text-gray-900 uppercase tracking-wide">Jurnal Permintaan Bahan Baku</h3>
              <div className="relative w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari referensi, No WO..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:bg-white outline-none transition-all"
                />
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">No. Permintaan</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Referensi WO</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Item WO</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="px-6 py-6"><div className="h-10 bg-gray-50 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : filteredRealizations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-24 text-center font-bold text-gray-400 uppercase tracking-widest text-sm bg-gray-50/10">
                        Tidak Ada Data Permintaan Terdaftar
                      </td>
                    </tr>
                  ) : filteredRealizations.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => {
                        setSelectedIssuance(r);
                        setScannedLots([]);
                      }}
                      className={`cursor-pointer transition-colors group ${
                        selectedIssuance?.id === r.id ? "bg-emerald-50/30 hover:bg-emerald-50/50" : "hover:bg-gray-50/50"
                      }`}
                    >
                      <td className="px-6 py-5">
                        <div className="font-black text-gray-950 text-sm">{r.reference}</div>
                        <div className="text-[9px] font-bold text-gray-400 mt-0.5">Tanggal: {r.date}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-black text-emerald-700 text-xs">{r.wo_reference}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-bold text-gray-800 text-xs truncate max-w-[200px]">{r.product_name}</div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{r.product_code}</div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex justify-center">
                          {r.status === "Draft" ? (
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-600 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                              <Clock size={10} /> Draft
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 size={10} /> Released
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                          <ArrowRight size={12} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Detail Panel */}
          {selectedIssuance && (
            <div className="lg:col-span-6 bg-white border border-gray-100 rounded-3xl shadow-sm p-6 space-y-6 animate-in slide-in-from-right duration-300">
              <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                <div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded-full uppercase tracking-wider">
                    Detail Permintaan & Verifikasi
                  </span>
                  <h2 className="text-2xl font-black text-gray-900 mt-2">{selectedIssuance.reference}</h2>
                  <p className="text-xs font-semibold text-gray-400 mt-1">
                    Untuk Work Order: <span className="font-bold text-emerald-600">{selectedIssuance.wo_reference}</span> ({selectedIssuance.product_name})
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedIssuance(null);
                    setScannedLots([]);
                  }}
                  className="px-2.5 py-1 bg-gray-100 text-gray-400 hover:bg-gray-200 rounded-lg text-xs font-bold transition-all"
                >
                  Tutup [X]
                </button>
              </div>

              {selectedIssuance.note && (
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-600">
                  <span className="text-gray-400 uppercase text-[9px] tracking-wider block mb-0.5">Catatan Draf:</span>
                  {selectedIssuance.note}
                </div>
              )}

              {/* BARCODE SCANNER INTERACTION FOR DRAFT */}
              {selectedIssuance.status === "Draft" && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white animate-pulse">
                        <ScanLine size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide">Mode Scan Barcode Aktif</h4>
                        <p className="text-[10px] text-emerald-700 leading-tight mt-0.5">
                          Tembak barcode label lot. Format: <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">KodeBarang|LotNo|Qty</code>
                        </p>
                      </div>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  </div>

                  <form onSubmit={handleManualScanSubmit} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Contoh: EPNS-KNSP4MKWW|LOT2026-001|2000"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                    />
                    <button
                      type="submit"
                      className="bg-gray-900 hover:bg-emerald-600 text-white px-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      Simulasi Scan
                    </button>
                  </form>
                </div>
              )}

              {/* List of Material items to release */}
              <div className="space-y-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block border-b pb-1.5">
                  Daftar Bahan Baku & Verifikasi Kuantitas
                </span>
                
                <div className="space-y-3">
                  {selectedIssuance.details.map((item) => {
                    const scannedQty = getScannedQty(item.product_code);
                    const isFullyScanned = scannedQty >= item.qty_to_issue;

                    return (
                      <div key={item.id} className={`border p-4 rounded-2xl space-y-2 transition-all ${isFullyScanned && selectedIssuance.status === "Draft" ? "bg-emerald-50/20 border-emerald-200" : "bg-gray-50/30 border-gray-100"}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-black text-gray-800">{item.product_name}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Code: {item.product_code}</p>
                            {item.supplier_name && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-orange-50 text-orange-600 border border-orange-100 rounded text-[8px] font-black uppercase tracking-widest">
                                Vendor: {item.supplier_name}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-gray-900">{Number(item.qty_to_issue).toLocaleString()} Pcs/Kg</p>
                            <span className="text-[8px] font-bold text-gray-400 uppercase block mt-0.5">Rencana Keluar</span>
                          </div>
                        </div>

                        {/* Scanned Progress Bar for Draft */}
                        {selectedIssuance.status === "Draft" && (
                          <div className="pt-2">
                            <div className="flex justify-between items-center text-[10px] font-black mb-1">
                              <span className="text-gray-400">Verifikasi Scan:</span>
                              <span className={isFullyScanned ? "text-emerald-600" : "text-amber-600"}>
                                {scannedQty.toLocaleString()} / {Number(item.qty_to_issue).toLocaleString()} Pcs
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden flex">
                              <div 
                                className={`h-full transition-all duration-300 ${isFullyScanned ? "bg-emerald-500" : "bg-amber-500"}`}
                                style={{ width: `${Math.min(100, (scannedQty / item.qty_to_issue) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* List of Scanned Lots detail */}
              {scannedLots.length > 0 && selectedIssuance.status === "Draft" && (
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block border-b pb-1.5 flex items-center gap-1.5">
                    <Boxes size={12} /> Detail Lot Ter-scan
                  </span>
                  <div className="divide-y divide-gray-100 max-h-36 overflow-y-auto bg-gray-50/50 rounded-2xl border border-gray-100 p-3 space-y-1">
                    {scannedLots.map((lot) => (
                      <div key={lot.id} className="flex justify-between items-center py-1.5 text-[11px] font-bold text-gray-600">
                        <div>
                          <span>{lot.product_code}</span>
                          <span className="text-slate-400 font-normal ml-2">Lot: {lot.lot_number}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600">{lot.qty} Pcs</span>
                          <button 
                            onClick={() => setScannedLots(scannedLots.filter(l => l.id !== lot.id))}
                            className="text-red-500 hover:text-red-700 font-bold"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Release/Confirm actions */}
              {selectedIssuance.status === "Draft" ? (
                <button
                  onClick={() => handleReleaseIssuance(selectedIssuance.id)}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 active:scale-95"
                >
                  <Check size={16} strokeWidth={3} />
                  <span>Konfirmasi & Rilis Ketersediaan Stok</span>
                </button>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-center text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={16} /> Stok Material Telah Dikurangi & Dikirim ke Produksi
                </div>
              )}

            </div>
          )}

        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Replacement Table List */}
          <div className={`bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col transition-all duration-300 ${selectedReplacement ? "lg:col-span-6" : "lg:col-span-12"}`}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4">
              <h3 className="text-base font-black text-gray-900 uppercase tracking-wide">Antrean Pengiriman Ulang Komponen</h3>
              <div className="relative w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari komponen, No WO..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:bg-white outline-none transition-all"
                />
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">ID Tiket</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">No. WO</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Komponen Logam</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Jumlah</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {replacementsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={6} className="px-6 py-6"><div className="h-10 bg-gray-50 rounded-xl w-full"></div></td>
                      </tr>
                    ))
                  ) : replacements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-24 text-center font-bold text-gray-400 uppercase tracking-widest text-sm bg-gray-50/10">
                        Tidak Ada Antrean Pengganti Komponen
                      </td>
                    </tr>
                  ) : replacements.filter(r => {
                    const term = search.toLowerCase();
                    return (
                      String(r.id).includes(term) ||
                      r.wo_reference?.toLowerCase().includes(term) ||
                      r.product_name?.toLowerCase().includes(term) ||
                      r.product_code?.toLowerCase().includes(term)
                    );
                  }).map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => {
                        setSelectedReplacement(r);
                        setScannedShipLot(null);
                        setSelectedSupplierId("");
                      }}
                      className={`cursor-pointer transition-colors group ${
                        selectedReplacement?.id === r.id ? "bg-emerald-50/30 hover:bg-emerald-50/50" : "hover:bg-gray-50/50"
                      }`}
                    >
                      <td className="px-6 py-5">
                        <div className="font-black text-gray-950 text-sm">REP-{String(r.id).padStart(4, "0")}</div>
                        <div className="text-[9px] font-bold text-gray-400 mt-0.5">Dibuat: {r.created_at?.split("T")[0] || "-"}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-black text-emerald-700 text-xs">{r.wo_reference}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-bold text-gray-800 text-xs truncate max-w-[180px]">{r.product_name}</div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{r.product_code}</div>
                      </td>
                      <td className="px-6 py-5 text-center font-black text-gray-950 text-xs">
                        {r.qty_requested} Pcs
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex justify-center">
                          {r.status === "PENDING_QC" ? (
                            <span className="px-2.5 py-1 bg-purple-50 text-purple-600 border border-purple-200 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                              <Clock size={10} /> Menunggu QC (Molding NG)
                            </span>
                          ) : r.status === "PENDING" ? (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 animate-pulse">
                              <CheckCircle2 size={10} /> Diverifikasi QC (Siap Kirim)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 size={10} /> Kembali ke Produksi
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                          <ArrowRight size={12} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Replacement Detail Panel */}
          {selectedReplacement && (
            <div className="lg:col-span-6 bg-white border border-gray-100 rounded-3xl shadow-sm p-6 space-y-6 animate-in slide-in-from-right duration-300">
              <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                <div>
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[9px] font-black rounded-full uppercase tracking-wider">
                    Detail Pengiriman Ulang Komponen
                  </span>
                  <h2 className="text-2xl font-black text-gray-900 mt-2">REP-{String(selectedReplacement.id).padStart(4, "0")}</h2>
                  <p className="text-xs font-semibold text-gray-400 mt-1">
                    Untuk Work Order: <span className="font-bold text-emerald-600">{selectedReplacement.wo_reference}</span>
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedReplacement(null);
                    setScannedShipLot(null);
                  }}
                  className="px-2.5 py-1 bg-gray-100 text-gray-400 hover:bg-gray-200 rounded-lg text-xs font-bold transition-all"
                >
                  Tutup [X]
                </button>
              </div>

              <div className="bg-gray-50/80 border border-gray-100 p-4 rounded-2xl space-y-3">
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Komponen Logam yang Diminta</span>
                  <p className="text-sm font-black text-gray-900 mt-0.5">{selectedReplacement.product_name}</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">{selectedReplacement.product_code}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 border-t border-gray-200/50 pt-3">
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Jumlah Permintaan</span>
                    <p className="text-sm font-black text-gray-800 mt-0.5">{selectedReplacement.qty_requested} Pcs</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Status Pengiriman</span>
                    <p className="text-xs font-black mt-0.5">
                      {selectedReplacement.status === "PENDING_QC" ? (
                        <span className="text-purple-600">MENUNGGU VERIFIKASI QC</span>
                      ) : selectedReplacement.status === "PENDING" ? (
                        <span className="text-emerald-600 font-extrabold">DIVERIFIKASI QC (SIAP KIRIM)</span>
                      ) : (
                        <span className="text-blue-600 font-extrabold">KEMBALI KE PRODUKSI</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-gray-200/50 pt-3">
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Asal Gudang</span>
                    <p className="text-xs font-black text-gray-800 mt-0.5">MATKOM (Gudang Utama)</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tujuan Gudang</span>
                    <p className="text-xs font-black text-gray-800 mt-0.5">Produksi (WH 2)</p>
                  </div>
                </div>
              </div>

              {selectedReplacement.status === "PENDING_QC" && (
                <div className="p-5 bg-purple-50 border border-purple-100 text-purple-700 rounded-3xl text-center space-y-2 animate-in fade-in duration-200">
                  <Clock className="mx-auto text-purple-500 animate-pulse" size={24} />
                  <h4 className="text-xs font-black uppercase tracking-widest">Menunggu Verifikasi QC</h4>
                  <p className="text-[10px] font-semibold text-purple-600/80 leading-relaxed">
                    Penggantian bahan baku ini terkunci dan baru dapat dikirim setelah laporan NG diverifikasi oleh Quality Control di menu QC Logs.
                  </p>
                </div>
              )}

              {selectedReplacement.status === "PENDING" && (() => {
                const replacementStocks = matkomStocks.filter(
                  (s) => String(s.product_id) === String(selectedReplacement.product_id) && s.supplier_id !== null
                );
                const isMultiVendor = replacementStocks.length > 0;
                const isShipDisabled = isShipping || (isMultiVendor && !selectedSupplierId);

                return (
                  <div className="space-y-4">
                    {isMultiVendor && (
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest block">Pilih Vendor (Stok MATKOM)</label>
                        <select
                          value={selectedSupplierId}
                          onChange={(e) => setSelectedSupplierId(e.target.value)}
                          required
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all h-12"
                        >
                          <option value="">-- Pilih Vendor --</option>
                          {replacementStocks.map((stockItem) => (
                            <option key={stockItem.supplier_id} value={stockItem.supplier_id}>
                              {stockItem.supplier_name} - Tersedia: {Number(stockItem.qty_system).toLocaleString()} Pcs
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white animate-pulse">
                          <ScanLine size={16} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide">Scan Barcode untuk Pengiriman</h4>
                          <p className="text-[10px] text-emerald-700 leading-tight mt-0.5">
                            Tembak barcode label lot komponen pengganti. Format: <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">KodeBarang|LotNo|Qty</code>
                          </p>
                        </div>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    </div>

                    <form onSubmit={handleManualShipScanSubmit} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Contoh: KodeBarang|LOT2026-001|2000"
                        value={shipBarcodeInput}
                        onChange={(e) => setShipBarcodeInput(e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                      />
                      <button
                        type="submit"
                        className="bg-gray-900 hover:bg-emerald-600 text-white px-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        Simulasi Scan
                      </button>
                    </form>

                    {scannedShipLot && (
                      <div className="bg-emerald-50/40 border border-emerald-200 p-4 rounded-2xl space-y-2">
                        <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">Lot Pengganti Terverifikasi</span>
                        <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                          <div>
                            <p>Kode: {scannedShipLot.product_code}</p>
                            <p className="text-gray-400 font-normal mt-0.5">Lot: {scannedShipLot.lot_number}</p>
                          </div>
                          <p className="text-emerald-600 text-sm font-black">{scannedShipLot.qty} Pcs</p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleShipReplacement}
                      disabled={isShipDisabled}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 active:scale-95"
                    >
                      <Check size={16} strokeWidth={3} />
                      <span>{isShipping ? "Memproses..." : "Konfirmasi & Kirim Pengganti"}</span>
                    </button>
                  </div>
                );
              })()}

              {selectedReplacement.status === "SHIPPED" && (
                <div className="p-4 bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl text-center text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={16} /> Komponen Pengganti Telah Kembali ke Produksi
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* CREATE REALIZATION TRANSFER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl border border-gray-100 shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ArrowRightLeft size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Buat Permintaan Pengeluaran Material</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">Alokasikan material dari Work Order aktif ke draf pengeluaran baru</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedWoId("");
                  setSelectedWoDetails(null);
                  setNewIssDetails([]);
                }}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                [X]
              </button>
            </div>

            <form onSubmit={handleCreateIssuance} className="space-y-6">
              
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Pilih Perintah Kerja (Work Order)</label>
                <select
                  value={selectedWoId}
                  onChange={(e) => handleWoSelection(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all appearance-none h-12"
                >
                  <option value="">-- Pilih Work Order Aktif --</option>
                  {woList.map(wo => (
                    <option key={wo.id} value={wo.id}>
                      {wo.reference} - {wo.product_name} ({Number(wo.target_qty)} Pcs)
                    </option>
                  ))}
                </select>
              </div>

              {selectedWoDetails && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tanggal Keluar</label>
                    <input
                      type="date"
                      value={issDate}
                      onChange={(e) => setIssDate(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none h-12"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Catatan / Penerima</label>
                    <input
                      type="text"
                      placeholder="Contoh: Realisasi Mixing Shift 2"
                      value={issNote}
                      onChange={(e) => setIssNote(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none h-12"
                    />
                  </div>
                </div>
              )}

              {stocksLoading ? (
                <div className="text-center py-8 text-xs font-black text-gray-400 animate-pulse uppercase tracking-wider">
                  Memuat informasi ketersediaan vendor...
                </div>
              ) : (
                selectedWoDetails && newIssDetails.length > 0 && (
                  <div className="space-y-4">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block border-b pb-1.5">
                      Alokasi Material Dari MATKOM
                    </span>

                    <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                      {newIssDetails.map((det, idx) => {
                        const componentStocks = matkomStocks.filter(
                          (s) => String(s.product_id) === String(det.product_id)
                        );
                        const isMultiVendor = componentStocks.some(s => s.supplier_id !== null);

                        return (
                          <div key={idx} className="border border-gray-100 p-4 rounded-2xl bg-gray-50/30 space-y-3">
                            <div className="flex justify-between items-center text-xs">
                              <div>
                                <p className="font-black text-gray-800">{det.product_name}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase">{det.product_code}</p>
                              </div>
                              <span className="font-bold text-gray-500">
                                Sisa WO: <span className="font-black text-gray-800">{det.qty_required} Pcs</span>
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">
                                  {isMultiVendor ? "Vendor (Stok MATKOM)" : "Stok Komponen Utama"}
                                </label>
                                {isMultiVendor ? (
                                  <select
                                    value={det.supplier_id}
                                    onChange={(e) => handleNewIssDetailChange(idx, "supplier_id", e.target.value)}
                                    required={det.qty_to_issue > 0}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none"
                                  >
                                    <option value="">-- Pilih Vendor --</option>
                                    {componentStocks.map((stockItem) => (
                                      <option key={stockItem.supplier_id} value={stockItem.supplier_id}>
                                        {stockItem.supplier_name} - Tersedia: {Number(stockItem.qty_system)} Pcs
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div className="px-3 py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-500">
                                    {componentStocks.length > 0 
                                      ? `Global Stock (Gudang Utama): ${Number(componentStocks[0].qty_system)} Pcs`
                                      : "Tidak ada stock di MATKOM"}
                                  </div>
                                )}
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">QTY Dikeluarkan</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={0}
                                    step="any"
                                    max={det.qty_required}
                                    value={det.qty_to_issue}
                                    onChange={(e) => handleNewIssDetailChange(idx, "qty_to_issue", Number(e.target.value))}
                                    required
                                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-black text-center h-[34px]"
                                  />
                                  <span className="text-[10px] font-black text-gray-400 uppercase">Pcs</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}

              {/* Submit Buttons */}
              <div className="pt-4 flex gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedWoId("");
                    setSelectedWoDetails(null);
                    setNewIssDetails([]);
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all h-12"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedWoDetails || newIssDetails.length === 0}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-100 h-12"
                >
                  {isSubmitting ? "Menyimpan..." : "Buat Draf Permintaan"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
