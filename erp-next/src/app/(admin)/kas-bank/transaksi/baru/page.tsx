"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Search, 
  Calendar as CalendarIcon,
  Building2,
  User,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  Info
} from "lucide-react";
import { useRouter } from "next/navigation";
import IconRenderer from "@/components/ui/IconRenderer";
import api from "@/lib/api";

interface TransactionDetail {
  id: string;
  bank: string;
  currency: string;
  rate: number;
  type: "Saldo Awal" | "Terima Kas" | "Terima Giro" | "Keluar Kas" | "Keluar Giro";
  isCleared: boolean;
  giroNumber: string;
  dueDate: string;
  journal: string;
  description: string;
  amount: number;
}

export default function TransaksiKasPage() {
  const router = useRouter();
  const [banks, setBanks] = useState<any[]>([]);
  const [transactionNo, setTransactionNo] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [payee, setPayee] = useState("");
  const [department, setDepartment] = useState("");
  const [details, setDetails] = useState<TransactionDetail[]>([
    {
      id: crypto.randomUUID(),
      bank: "",
      currency: "IDR",
      rate: 1,
      type: "Keluar Kas",
      isCleared: false,
      giroNumber: "",
      dueDate: new Date().toISOString().split('T')[0],
      journal: "",
      description: "",
      amount: 0
    }
  ]);

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

  const addDetail = () => {
    setDetails([...details, {
      id: crypto.randomUUID(),
      bank: "",
      currency: "IDR",
      rate: 1,
      type: "Keluar Kas",
      isCleared: false,
      giroNumber: "",
      dueDate: new Date().toISOString().split('T')[0],
      journal: "",
      description: "",
      amount: 0
    }]);
  };

  const removeDetail = (id: string) => {
    if (details.length > 1) {
      setDetails(details.filter(d => d.id !== id));
    }
  };

  const updateDetail = (id: string, field: keyof TransactionDetail, value: any) => {
    const newDetails = details.map(d => {
      if (d.id === id) {
        const updated = { ...d, [field]: value };
        if (field === "bank") {
          const selectedBank = banks.find(b => b.id === Number(value));
          if (selectedBank) {
            updated.currency = selectedBank.currency_code || "IDR";
          }
        }
        return updated;
      }
      return d;
    });
    setDetails(newDetails);
  };

  const totalAmount = details.reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 animate-in fade-in duration-500">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-gray-200 shadow-sm group"
            >
              <ArrowLeft size={20} className="text-gray-500 group-hover:text-gray-900" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Transaksi Kas</h1>
              <p className="text-sm text-gray-500 font-medium">Buat transaksi kas atau bank baru</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-200 hover:bg-teal-700 active:scale-95 transition-all">
            <Save size={18} />
            Simpan Transaksi
          </button>
        </div>

        {/* Form Header Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">No. Transaksi</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-600 transition-colors">
                <IconRenderer name="Hash" size={18} />
              </div>
              <input 
                type="text" 
                value={transactionNo}
                onChange={(e) => setTransactionNo(e.target.value)}
                placeholder="Otomatis"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-teal-500/5 focus:border-teal-500 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Tgl. Transaksi</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-600 transition-colors">
                <CalendarIcon size={18} />
              </div>
              <input 
                type="date" 
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-teal-500/5 focus:border-teal-500 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-2 lg:col-span-1">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Dibayar Kepada / Terima dari</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-600 transition-colors">
                <User size={18} />
              </div>
              <input 
                type="text" 
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                placeholder="Nama pihak terkait..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-teal-500/5 focus:border-teal-500 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Department</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-600 transition-colors">
                <Building2 size={18} />
              </div>
              <select 
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-teal-500/5 focus:border-teal-500 transition-all outline-none appearance-none"
              >
                <option value="">Pilih Department</option>
                <option value="HRD">HRD</option>
                <option value="Finance">Finance</option>
                <option value="IT">IT</option>
                <option value="Production">Production</option>
              </select>
            </div>
          </div>
        </div>

        {/* Details Table Section */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <CreditCard size={18} className="text-teal-600" />
              <span>Rincian Transaksi</span>
            </h2>
            <button 
              onClick={addDetail}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-teal-200 text-teal-600 rounded-xl text-xs font-black hover:bg-teal-50 transition-all shadow-sm"
            >
              <Plus size={14} />
              TAMBAH BARIS
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Kas/Bank</th>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Mata Uang</th>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Kurs</th>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Tipe Transaksi</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Cair?</th>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">No. Giro</th>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Tgl. Jth. Tempo</th>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Jurnal</th>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-64">Keterangan</th>
                  <th className="px-4 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Nominal</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {details.map((detail) => (
                  <tr key={detail.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <select 
                          value={detail.bank}
                          onChange={(e) => updateDetail(detail.id, "bank", e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500/10 outline-none"
                        >
                          <option value="">Pilih Bank</option>
                          {banks.map(b => (
                            <option key={b.id} value={b.id}>{b.name} - {b.account_number}</option>
                          ))}
                        </select>
                        <button className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-sm">
                          <Search size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <input 
                        type="text" 
                        value={detail.currency}
                        readOnly
                        className="w-20 px-3 py-2 bg-gray-100 border border-gray-100 rounded-xl text-xs font-bold text-gray-500 text-center outline-none"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input 
                        type="number" 
                        value={detail.rate}
                        onChange={(e) => updateDetail(detail.id, "rate", e.target.value)}
                        className="w-24 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500/10 outline-none text-right"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <select 
                        value={detail.type}
                        onChange={(e) => updateDetail(detail.id, "type", e.target.value)}
                        className="w-40 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500/10 outline-none"
                      >
                        <option value="Saldo Awal">Saldo Awal</option>
                        <option value="Terima Kas">Terima Kas</option>
                        <option value="Terima Giro">Terima Giro</option>
                        <option value="Keluar Kas">Keluar Kas</option>
                        <option value="Keluar Giro">Keluar Giro</option>
                      </select>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <input 
                        type="checkbox" 
                        checked={detail.isCleared}
                        onChange={(e) => updateDetail(detail.id, "isCleared", e.target.checked)}
                        className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-200 rounded-sm focus:ring-teal-500 focus:ring-2 transition-all"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input 
                        type="text" 
                        value={detail.giroNumber}
                        onChange={(e) => updateDetail(detail.id, "giroNumber", e.target.value)}
                        placeholder="No. Giro..."
                        className="w-32 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500/10 outline-none"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input 
                        type="date" 
                        value={detail.dueDate}
                        onChange={(e) => updateDetail(detail.id, "dueDate", e.target.value)}
                        className="w-36 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500/10 outline-none"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <select 
                          value={detail.journal}
                          onChange={(e) => updateDetail(detail.id, "journal", e.target.value)}
                          className="w-40 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500/10 outline-none"
                        >
                          <option value="">Pilih Jurnal</option>
                          <option value="JRN001">JRN001 - Beban Listrik</option>
                          <option value="JRN002">JRN002 - Beban Gaji</option>
                        </select>
                        <button className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-sm">
                          <Search size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <textarea 
                        value={detail.description}
                        onChange={(e) => updateDetail(detail.id, "description", e.target.value)}
                        rows={1}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500/10 outline-none resize-none overflow-hidden"
                        placeholder="Keterangan..."
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input 
                        type="number" 
                        value={detail.amount}
                        onChange={(e) => updateDetail(detail.id, "amount", e.target.value)}
                        className="w-32 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500/10 outline-none text-right"
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button 
                        onClick={() => removeDetail(detail.id)}
                        className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 shadow-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-3 max-w-md">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                <Info size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-gray-800">Catatan Transaksi</p>
                <p className="text-xs text-gray-500 leading-relaxed font-medium">Pastikan semua data kas/bank dan nominal sudah sesuai dengan bukti transaksi fisik Anda sebelum melakukan penyimpanan.</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 min-w-[300px] space-y-4">
              <div className="flex items-center justify-between gap-8">
                <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Jumlah Transaksi</span>
                <span className="text-2xl font-black text-gray-900">
                  {totalAmount.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
