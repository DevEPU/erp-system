"use client";

import { useRouter } from "next/navigation";
import IconRenderer from "@/components/ui/IconRenderer";
import { Landmark, Banknote } from "lucide-react";

const stats = [
  { label: "Saldo Kas", value: "Rp 0", icon: "Banknote", color: "from-emerald-500 to-emerald-600", path: "/kas-bank/daftar" },
  { label: "Saldo Bank", value: "Rp 0", icon: "Landmark", color: "from-blue-500 to-blue-600", path: "/kas-bank/daftar" },
  { label: "Penerimaan Hari Ini", value: "Rp 0", icon: "ArrowDownCircle", color: "from-teal-500 to-teal-600", path: "/kas-bank/transaksi" },
  { label: "Pengeluaran Hari Ini", value: "Rp 0", icon: "ArrowUpCircle", color: "from-rose-500 to-rose-600", path: "/kas-bank/transaksi" },
];

const quickMenus = [
  { label: "Daftar Kas & Bank", path: "/kas-bank/daftar", icon: "Banknote", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  { label: "Transaksi Kas", path: "/kas-bank/transaksi", icon: "ArrowLeftRight", color: "bg-teal-50 text-teal-600 border-teal-100" },
  { label: "Transfer Kas", path: "/kas-bank/transfer", icon: "ArrowLeftRight", color: "bg-blue-50 text-blue-600 border-blue-100" },
  { label: "Rekonsiliasi Bank", path: "/kas-bank/rekonsiliasi", icon: "Scale", color: "bg-purple-50 text-purple-600 border-purple-100" },
];

export default function KasBankDashboard() {
  const router = useRouter();

  return (
    <div className="min-h-[85vh] flex flex-col p-6 space-y-8 animate-in fade-in duration-500 bg-gray-50">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-200">
            <Landmark size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Kas/Bank</h1>
            <p className="text-sm text-gray-500">Manajemen kas, bank, dan transaksi keuangan perusahaan.</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map((s, i) => (
          <div 
            key={i} 
            onClick={() => s.path && router.push(s.path)}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer hover:border-teal-500/30"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-md`}>
              <IconRenderer name={s.icon} size={22} className="text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Access */}
      <div>
        <h2 className="text-base font-bold text-gray-700 mb-4">Akses Cepat</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {quickMenus.map((m, i) => (
            <button
              key={i}
              onClick={() => router.push(m.path)}
              className={`flex flex-col items-center gap-3 p-5 rounded-2xl border ${m.color} hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md`}
            >
              <IconRenderer name={m.icon} size={28} />
              <span className="text-xs font-semibold text-center leading-tight">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl p-6 text-white flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">Modul Kas/Bank</h3>
          <p className="text-teal-100 text-sm mt-1">Modul ini sedang dalam pengembangan. Fitur akan segera tersedia.</p>
        </div>
        <Banknote size={48} className="opacity-30" />
      </div>
    </div>
  );
}
