"use client";

import { RefreshCcw, PackageX, TrendingDown, RotateCcw } from "lucide-react";

export default function ReturPembelianPage() {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <RefreshCcw className="text-purple-500" size={24} />
            Retur Pembelian
          </h1>
          <p className="text-gray-500 font-medium">
            Kelola retur transaksi pembelian ke supplier.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl w-fit mb-4">
            <RotateCcw size={24} />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase">Total Retur</p>
          <p className="text-xl font-black text-gray-800">0 Dokumen</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl w-fit mb-4">
            <PackageX size={24} />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase">Item Diretur</p>
          <p className="text-xl font-black text-gray-800">0 Item</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl w-fit mb-4">
            <TrendingDown size={24} />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase">Nilai Retur</p>
          <p className="text-xl font-black text-gray-800">Rp 0</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[300px] flex items-center justify-center">
        <div className="text-center p-12">
          <div className="w-16 h-16 bg-purple-50 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCcw size={32} />
          </div>
          <p className="text-gray-500 font-bold text-lg mb-2">Modul Retur Pembelian</p>
          <p className="text-gray-400 text-sm">Modul ini sedang dalam tahap pengembangan.</p>
        </div>
      </div>
    </div>
  );
}
