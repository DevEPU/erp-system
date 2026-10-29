"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Truck,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  FileCheck,
  FileText,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  X
} from "lucide-react";
import api from "@/lib/api";

export default function SuratJalanBalikanPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [suratJalanList, setSuratJalanList] = useState<any[]>([]);
  const [selectedSjId, setSelectedSjId] = useState("");
  const [selectedSjRef, setSelectedSjRef] = useState("");
  const [driverName, setDriverName] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("Received_Full");
  const [receivedBy, setReceivedBy] = useState("");
  const [checkCapCustomer, setCheckCapCustomer] = useState(true);
  const [checkSignCustomer, setCheckSignCustomer] = useState(true);
  const [checkSheetNotes, setCheckSheetNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [search]);

  useEffect(() => {
    if (isModalOpen) {
      fetchSuratJalan();
    }
  }, [isModalOpen]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/internal-transfers/sj-balikan", {
        params: { search }
      });
      setLogs(res.data.data || []);
    } catch (err) {
      console.error("Error fetching SJ balikan logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuratJalan = async () => {
    try {
      const res = await api.express.get("/surat-jalan", { params: { limit: 100 } });
      setSuratJalanList(res.data.data || []);
    } catch (err) {
      console.error("Error fetching surat jalan list:", err);
    }
  };

  const handleCreateBalikan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSjRef) {
      alert("Mohon pilih atau masukkan nomor referensi Surat Jalan.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        surat_jalan_id: selectedSjId ? Number(selectedSjId) : null,
        surat_jalan_ref: selectedSjRef,
        driver_name: driverName,
        vehicle_no: vehicleNo,
        return_date: returnDate,
        status,
        received_by: receivedBy,
        checksheet_notes: `Cap Customer: ${checkCapCustomer ? 'Ada' : 'Tidak'} | TTD: ${checkSignCustomer ? 'Lengkap' : 'Belum'} | ${checkSheetNotes}`
      };

      await api.express.post("/internal-transfers/sj-balikan", payload);
      setIsModalOpen(false);
      alert("Verifikasi penerimaan Surat Jalan Balikan berhasil dicatat!");
      fetchLogs();
    } catch (err: any) {
      console.error("Error creating SJ balikan:", err);
      alert(err.message || "Gagal mencatat surat jalan balikan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen animate-in fade-in duration-500">
      <button
        onClick={() => router.push("/persediaan-barang")}
        className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
      >
        <ArrowLeft size={14} /> Kembali ke Persediaan Barang
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-lg shadow-blue-200">
              <Truck className="text-white" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
                  No. 15
                </span>
                <h1 className="text-3xl font-black tracking-tight text-gray-900">
                  Surat Jalan Balikan ke Gudang FG <span className="text-blue-600">(IN)</span>
                </h1>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Penerimaan & Checksheet Verifikasi Surat Jalan Balikan (Proof of Delivery / POD) dari Customer
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setReturnDate(new Date().toISOString().split("T")[0]);
            setSelectedSjId("");
            setSelectedSjRef("");
            setDriverName("");
            setVehicleNo("");
            setReceivedBy("");
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-gray-900 hover:bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-100 transition-all active:scale-95"
        >
          <Plus size={16} strokeWidth={3} /> Catat SJ Balikan
        </button>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari nomor surat jalan, driver, atau nopol kendaraan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">No. Penerimaan / Tanggal</th>
                <th className="px-6 py-4">Surat Jalan Terkait</th>
                <th className="px-6 py-4">Driver & Kendaraan</th>
                <th className="px-6 py-4 text-center">Status Kepulangan</th>
                <th className="px-6 py-4">Petugas Verifikasi FG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-6"><div className="h-8 bg-gray-100 rounded-xl w-full"></div></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                    Belum ada rekapan Surat Jalan Balikan tercatat.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-black text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
                        {log.reference_no}
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold mt-0.5 flex items-center gap-1">
                        <Calendar size={10} /> {log.return_date}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-extrabold text-gray-800">
                      {log.surat_jalan_ref}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-700">{log.driver_name}</p>
                      <p className="text-[10px] font-mono text-gray-400">{log.vehicle_no}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                        log.status === "Received_Full"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : log.status === "Received_Partial"
                          ? "bg-amber-50 text-amber-600 border border-amber-200"
                          : "bg-red-50 text-red-600 border border-red-200"
                      }`}>
                        <CheckCircle2 size={10} />
                        {log.status === "Received_Full" ? "Diterima Penuh Customer" : log.status === "Received_Partial" ? "Parsial (Ada Retur)" : "Batal Kirim"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-800">{log.received_by}</p>
                      <p className="text-[10px] text-gray-400">{log.checksheet_notes}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl border border-gray-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-4 border-b border-gray-100 flex justify-between items-center shrink-0 bg-blue-50/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
                  <FileCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Checksheet Penerimaan Surat Jalan Balikan</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">Verifikasi fisik dokumen pengiriman dan tanda terima customer</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-white text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateBalikan} className="p-8 pt-4 overflow-y-auto flex-1 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tanggal Balikan Diterima</label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Surat Jalan Pengiriman</label>
                  {suratJalanList.length > 0 ? (
                    <select
                      value={selectedSjRef}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedSjRef(val);
                        const match = suratJalanList.find(s => s.reference === val);
                        if (match) setSelectedSjId(match.id);
                      }}
                      required
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="">-- Pilih Surat Jalan --</option>
                      {suratJalanList.map(s => (
                        <option key={s.id} value={s.reference}>{s.reference} ({s.customer_name || 'Customer'})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Contoh: SJ/EPU/26/09/0001"
                      value={selectedSjRef}
                      onChange={(e) => setSelectedSjRef(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nama Driver / Ekspedisi</label>
                  <input
                    type="text"
                    placeholder="Nama driver"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">No. Polisi Kendaraan</label>
                  <input
                    type="text"
                    placeholder="Contoh: B 9123 TX"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Checksheet POD */}
              <div className="bg-blue-50/40 border border-blue-100 p-4 rounded-2xl space-y-3">
                <p className="text-xs font-black text-blue-800 uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck size={14} /> Checklist Dokumen Fisik Bukti Terima
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-blue-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkCapCustomer}
                      onChange={(e) => setCheckCapCustomer(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-gray-700">Cap / Stempel Resmi Customer Ada</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-blue-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkSignCustomer}
                      onChange={(e) => setCheckSignCustomer(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-gray-700">Tanda Tangan & Nama Terang Jelas</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Kondisi Penerimaan Customer</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="Received_Full">Diterima Penuh (100% Sesuai SJ)</option>
                    <option value="Received_Partial">Diterima Sebagian (Ada Barang Retur)</option>
                    <option value="Rejected">Batal / Ditolak Seluruhnya</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Petugas Penerima Dokumen FG</label>
                  <input
                    type="text"
                    placeholder="Nama staff administrasi FG"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Catatan / Alasan jika Retur</label>
                <input
                  type="text"
                  placeholder="Keterangan tambahan..."
                  value={checkSheetNotes}
                  onChange={(e) => setCheckSheetNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-gray-100 rounded-xl text-xs font-bold">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-blue-200">
                  {submitting ? "Menyimpan..." : "Simpan Checksheet Surat Jalan Balikan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
