"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Save, 
  Search, 
  Calendar as CalendarIcon,
  Landmark,
  Coins,
  FileText,
  Scale,
  RefreshCw,
  Info
} from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function RekonsiliasiBankPage() {
  const router = useRouter();
  
  // Data States
  const [banks, setBanks] = useState<any[]>([]);
  
  // Form States
  const [reconciliationNo, setReconciliationNo] = useState("");
  const [bankId, setBankId] = useState("");
  const [currency, setCurrency] = useState("");
  const [reconciliationDate, setReconciliationDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  
  // Value States
  const [bankStatement, setBankStatement] = useState(0);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [reconciliationValue, setReconciliationValue] = useState(0);
  const [difference, setDifference] = useState(0);

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const res = await api.express.get("/bank-accounts");
      if (res.data.success) {
        setBanks(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching banks:", err);
    }
  };

  // Auto-fetch currency when bank is selected
  useEffect(() => {
    const selectedBank = banks.find(b => b.id === Number(bankId));
    if (selectedBank) {
      setCurrency(selectedBank.currency_code || "IDR");
    } else {
      setCurrency("");
    }
  }, [bankId, banks]);

  // Calculate difference
  useEffect(() => {
    setDifference(bankStatement - reconciliationValue);
  }, [bankStatement, reconciliationValue]);

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-gray-200 shadow-sm group"
            >
              <ArrowLeft size={20} className="text-gray-500 group-hover:text-gray-900" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Rekonsiliasi Bank</h1>
              <p className="text-sm text-gray-500 font-medium">Cocokkan saldo bank dengan catatan sistem</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 active:scale-95 transition-all">
            <Save size={18} />
            Simpan Rekonsiliasi
          </button>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className="p-10 space-y-10">
            {/* Header Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">No. Rekonsiliasi</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors">
                    <FileText size={18} />
                  </div>
                  <input 
                    type="text" 
                    value={reconciliationNo}
                    onChange={(e) => setReconciliationNo(e.target.value)}
                    placeholder="Otomatis"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Bank</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors">
                    <Landmark size={18} />
                  </div>
                  <select 
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 transition-all outline-none appearance-none"
                  >
                    <option value="">Pilih Bank</option>
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>{b.name} - {b.account_number}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Mata Uang</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Coins size={18} />
                  </div>
                  <input 
                    type="text" 
                    value={currency}
                    readOnly
                    placeholder="Pilih bank dulu"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-100 border border-gray-100 rounded-2xl text-sm font-bold text-gray-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Tgl. Rekonsiliasi</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors">
                    <CalendarIcon size={18} />
                  </div>
                  <input 
                    type="date" 
                    value={reconciliationDate}
                    onChange={(e) => setReconciliationDate(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Pilih Bulan & Tahun</label>
                <div className="flex gap-4">
                  <div className="relative group flex-1">
                    <select 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full px-6 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 transition-all outline-none appearance-none"
                    >
                      {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => (
                        <option key={i} value={String(i + 1).padStart(2, "0")}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="relative group flex-1">
                    <select 
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full px-6 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 transition-all outline-none appearance-none"
                    >
                      {[2024, 2025, 2026].map(y => (
                        <option key={y} value={String(y)}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-100"></div>

            {/* Reconciliation Values Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                    <Scale size={20} />
                  </div>
                  <h3 className="font-bold text-gray-800">Saldo Rekonsiliasi</h3>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-end mb-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Rekening Koran</label>
                      <span className="text-[10px] font-bold text-purple-600">Saldo Akhir Bank</span>
                    </div>
                    <div className="relative group">
                      <input 
                        type="number" 
                        value={bankStatement}
                        onChange={(e) => setBankStatement(Number(e.target.value))}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-3xl text-xl font-black text-gray-900 focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 transition-all outline-none text-right"
                        placeholder="0"
                      />
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-300 text-sm">{currency || "IDR"}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-end mb-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Saldo Awal</label>
                      <span className="text-[10px] font-bold text-gray-400">Saldo Sistem</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={openingBalance}
                        onChange={(e) => setOpeningBalance(Number(e.target.value))}
                        className="w-full px-6 py-4 bg-gray-100 border border-gray-100 rounded-3xl text-xl font-black text-gray-400 outline-none text-right"
                        placeholder="0"
                      />
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-200 text-sm">{currency || "IDR"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                    <RefreshCw size={20} />
                  </div>
                  <h3 className="font-bold text-gray-800">Hasil Penyesuaian</h3>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-end mb-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Rekonsiliasi</label>
                      <span className="text-[10px] font-bold text-emerald-600">Total Penyesuaian</span>
                    </div>
                    <div className="relative group">
                      <input 
                        type="number" 
                        value={reconciliationValue}
                        onChange={(e) => setReconciliationValue(Number(e.target.value))}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-3xl text-xl font-black text-gray-900 focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all outline-none text-right"
                        placeholder="0"
                      />
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-300 text-sm">{currency || "IDR"}</div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Selisih</label>
                      <span className={`text-xs font-black px-3 py-1 rounded-full ${difference === 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {difference === 0 ? "SEIMBANG" : "ADA SELISIH"}
                      </span>
                    </div>
                    <div className={`p-6 rounded-3xl border-2 transition-all flex items-center justify-between ${difference === 0 ? "bg-emerald-50/30 border-emerald-100" : "bg-rose-50/30 border-rose-100"}`}>
                      <span className="text-sm font-bold text-gray-500">Unreconciled Difference:</span>
                      <span className={`text-3xl font-black ${difference === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {difference.toLocaleString("id-ID", { style: "currency", currency: currency || "IDR", maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Info Section */}
            <div className="bg-gray-50 rounded-3xl p-6 flex items-start gap-4 border border-gray-100">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl mt-1">
                <Info size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-gray-800">Tentang Rekonsiliasi Bank</p>
                <p className="text-xs text-gray-500 leading-relaxed font-medium">
                  Gunakan modul ini untuk memastikan saldo yang tercatat di rekening koran bank Anda sama dengan saldo yang tercatat di sistem ERP. 
                  Jika terdapat selisih, silakan lakukan penyesuaian melalui modul Transaksi Kas atau Jurnal Umum.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
