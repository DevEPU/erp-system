"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import IconRenderer from "@/components/ui/IconRenderer";
import {
  Package,
  Boxes,
  Tag,
  Warehouse,
  AlertTriangle,
  PackagePlus,
  PackageMinus,
  RefreshCcw,
  Banknote,
  ArrowRight,
  Plus,
  BarChart3,
  Search,
  ClipboardList
} from "lucide-react";

// Initial stats state template
const initialStats = [
  { label: "Total Produk", value: "...", icon: "Boxes", color: "from-blue-500 to-indigo-600", path: "/master-data/products" },
  { label: "Total Kategori", value: "...", icon: "Tag", color: "from-cyan-500 to-blue-600", path: "/master-data/product-categories" },
  { label: "Total Gudang", value: "...", icon: "Warehouse", color: "from-amber-500 to-orange-600", path: "/persediaan-barang/gudang" },
  { label: "Stok Hampir Habis", value: "...", icon: "AlertTriangle", color: "from-red-500 to-rose-600", path: "/persediaan-barang/stok-gudang" },
  { label: "Stok Masuk Hari Ini", value: "...", icon: "PackagePlus", color: "from-emerald-500 to-teal-600", path: "/persediaan-barang/stok-masuk" },
  { label: "Stok Keluar Hari Ini", value: "...", icon: "PackageMinus", color: "from-rose-500 to-pink-600", path: "/persediaan-barang/stok-keluar" },
  { label: "Penyesuaian (Bulan Ini)", value: "...", icon: "RefreshCcw", color: "from-purple-500 to-pink-600", path: "/persediaan-barang/penyesuaian" },
  { label: "Total Nilai Aset", value: "...", icon: "Banknote", color: "from-emerald-400 to-emerald-600", path: "/persediaan-barang/stok-gudang" },
];

export default function PersediaanBarangDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(initialStats);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.express.get("/home/inventory-stats");
        const data = res.data;
        
        setStats([
          { label: "Total Produk", value: data.total_products.toString(), icon: "Boxes", color: "from-blue-500 to-indigo-600", path: "/master-data/products" },
          { label: "Total Kategori", value: data.total_categories.toString(), icon: "Tag", color: "from-cyan-500 to-blue-600", path: "/master-data/product-categories" },
          { label: "Total Gudang", value: data.total_warehouses.toString(), icon: "Warehouse", color: "from-amber-500 to-orange-600", path: "/persediaan-barang/gudang" },
          { label: "Stok Hampir Habis", value: data.low_stock.toString(), icon: "AlertTriangle", color: "from-red-500 to-rose-600", path: "/persediaan-barang/stok-gudang" },
          { label: "Stok Masuk Hari Ini", value: data.stock_in_today.toString(), icon: "PackagePlus", color: "from-emerald-500 to-teal-600", path: "/persediaan-barang/stok-masuk" },
          { label: "Stok Keluar Hari Ini", value: data.stock_out_today.toString(), icon: "PackageMinus", color: "from-rose-500 to-pink-600", path: "/persediaan-barang/stok-keluar" },
          { label: "Penyesuaian (Bulan Ini)", value: data.adjustments_this_month.toString(), icon: "RefreshCcw", color: "from-purple-500 to-pink-600", path: "/persediaan-barang/penyesuaian" },
          { label: "Total Nilai Aset", value: `Rp ${Number(data.total_stock_value || 0).toLocaleString('id-ID')}`, icon: "Banknote", color: "from-emerald-400 to-emerald-600", path: "/persediaan-barang/stok-gudang" },
        ]);
      } catch (err) {
        console.error("Failed to fetch inventory stats", err);
      }
    };
    
    fetchStats();
  }, []);

  const WorkflowCard = ({ label, desc, path, icon: Icon, color }: any) => (
    <div 
      onClick={() => router.push(path)}
      className="w-48 group cursor-pointer bg-white border border-gray-100 p-5 rounded-[2rem] hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-300 flex flex-col gap-3 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-150 transition-transform duration-700">
          <Icon size={60} />
      </div>
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center border transition-all duration-300 group-hover:scale-110`}>
        <Icon size={18} />
      </div>
      <div>
        <h3 className="font-extrabold text-gray-800 text-sm md:text-base">{label}</h3>
        <p className="text-[9px] text-gray-400 font-bold mt-1 line-clamp-1">{desc}</p>
      </div>
      <div className="pt-1">
          <span className="inline-flex items-center gap-1.5 text-[8.5px] font-black text-blue-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              Enter Module <ArrowRight size={10} />
          </span>
      </div>
    </div>
  );

  const Arrow = () => (
    <div className="text-gray-300 flex items-center justify-center px-4">
      <ArrowRight size={28} strokeWidth={4} />
    </div>
  );

  return (
    <div className="min-h-[85vh] flex flex-col p-4 md:p-8 space-y-10 animate-in fade-in duration-700 bg-[#f8fafc]">
      {/* Header with Glassmorphism */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
        <div className="relative bg-white/80 backdrop-blur-xl border border-white/20 p-8 rounded-[2.5rem] shadow-xl shadow-blue-900/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-200">
              <Package size={36} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Persediaan Barang</h1>
              <p className="text-gray-500 font-medium mt-1">Manajemen stok, inventori, dan pergerakan barang.</p>
            </div>
          </div>
          <button 
            onClick={() => router.push("/persediaan-barang/penyesuaian")}
            className="group/btn relative px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center gap-3 overflow-hidden transition-all hover:bg-black hover:shadow-2xl active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 translate-x-[-100%] group-hover/btn:translate-x-0 transition-transform duration-500 opacity-20"></div>
            <RefreshCcw size={20} className="text-purple-400 group-hover/btn:animate-spin" />
            <span className="relative">Penyesuaian Stok</span>
            <Plus size={18} className="relative group-hover/btn:rotate-90 transition-transform" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {stats.map((s, i) => (
          <div 
            key={i} 
            onClick={() => s.path && router.push(s.path)}
            className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-4 md:p-6 flex items-center gap-4 md:gap-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer hover:border-blue-500/30"
          >
            <div className={`shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg shadow-gray-200`}>
              <IconRenderer name={s.icon} size={24} className="text-white" />
            </div>
            <div className="overflow-hidden">
              <p className="text-lg md:text-2xl font-black text-gray-900 tracking-tighter truncate" title={s.value}>{s.value}</p>
              <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest truncate" title={s.label}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Strategic Workflows (Flowchart Style) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-800 tracking-tight uppercase flex items-center gap-3">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                Strategic Workflows
            </h2>
        </div>
        
        <div className="bg-white border border-gray-100 p-8 rounded-[3rem] shadow-sm overflow-x-auto relative mt-8">
          {/* Subtle background decoration */}
          <div className="absolute opacity-[0.03] top-0 right-0 pointer-events-none">
            <Package size={400} />
          </div>

          <div className="min-w-max flex flex-col gap-10 px-4 py-8 relative z-10 w-max">
            
            <div className="flex items-center gap-6">
              
              <div className="flex flex-col gap-6">
                <WorkflowCard 
                  label="Data Produk" 
                  desc="Master data barang" 
                  path="/master-data/products" 
                  icon={Boxes} 
                  color="bg-indigo-50 text-indigo-600 border-indigo-100" 
                />
                <WorkflowCard 
                  label="Kategori Produk" 
                  desc="Pengelompokan barang" 
                  path="/master-data/product-categories" 
                  icon={Tag} 
                  color="bg-cyan-50 text-cyan-600 border-cyan-100" 
                />
              </div>

              <div className="text-gray-300 flex items-center justify-center animate-pulse"><ArrowRight size={28} strokeWidth={4} /></div>

              <WorkflowCard 
                label="Stok Masuk" 
                desc="Goods Inward" 
                path="/persediaan-barang/stok-masuk" 
                icon={PackagePlus} 
                color="bg-emerald-50 text-emerald-600 border-emerald-100" 
              />

              <div className="text-gray-300 flex items-center justify-center animate-pulse"><ArrowRight size={28} strokeWidth={4} /></div>

              <WorkflowCard 
                label="Stok Keluar" 
                desc="Goods Outward" 
                path="/persediaan-barang/stok-keluar" 
                icon={PackageMinus} 
                color="bg-rose-50 text-rose-600 border-rose-100" 
              />

              <div className="text-gray-300 flex items-center justify-center animate-pulse"><ArrowRight size={28} strokeWidth={4} /></div>

              <div className="flex flex-col gap-6">
                <WorkflowCard 
                  label="Penyesuaian Stok" 
                  desc="Koreksi Kuantitas Stok" 
                  path="/persediaan-barang/penyesuaian" 
                  icon={RefreshCcw} 
                  color="bg-purple-50 text-purple-600 border-purple-100" 
                />
                <WorkflowCard 
                  label="Stok Opname" 
                  desc="Pencocokan Stok Fisik" 
                  path="/persediaan-barang/stok-opname" 
                  icon={ClipboardList} 
                  color="bg-pink-50 text-pink-600 border-pink-100" 
                />
              </div>
              
            </div>

            <div className="mt-8 border-t border-gray-50 pt-8 flex items-center gap-6">
                <WorkflowCard 
                  label="Laporan Mutasi" 
                  desc="Kartu Stok & Pergerakan" 
                  path="/reports/mutasi-stok" 
                  icon={BarChart3} 
                  color="bg-slate-50 text-slate-600 border-slate-100" 
                />
                
                <WorkflowCard 
                  label="Manajemen Gudang" 
                  desc="Lokasi & Rack" 
                  path="/master-data/warehouses" 
                  icon={Warehouse} 
                  color="bg-amber-50 text-amber-600 border-amber-100" 
                />
            </div>

          </div>
        </div>
      </div>

      {/* Visual Separation / Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        <div className="bg-blue-600 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-200 group">
          <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform duration-1000">
            <Package size={200} />
          </div>
          <div className="relative z-10 space-y-4 max-w-md">
            <h3 className="text-3xl font-black leading-tight italic tracking-tighter">Real-time Inventory Control</h3>
            <p className="text-blue-50/80 text-sm font-medium leading-relaxed">
              Track stock movements effortlessly. From goods receiving to dispatch and periodic stock opname, ensure your inventory data is always accurate.
            </p>
            <div className="flex gap-2 pt-4">
                <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold">Multi-Warehouse</div>
                <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold">Barcode Ready</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm flex flex-col justify-center gap-6 relative overflow-hidden">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                    <Search size={24} />
                </div>
                <div>
                    <h4 className="font-black text-gray-800">Quick Actions</h4>
                    <p className="text-xs text-gray-400 font-bold">Standard inventory operations</p>
                </div>
             </div>
             <div className="grid grid-cols-1 gap-3">
                 {[
                     { label: "Register New Product", icon: <Plus size={14} />, path: "/master-data/products" },
                     { label: "Check Stock Balance", icon: <Search size={14} />, path: "/reports/mutasi-stok" },
                     { label: "New Stock Receipt", icon: <PackagePlus size={14} />, path: "/persediaan-barang/stok-masuk" },
                 ].map((act, idx) => (
                     <button 
                        key={idx}
                        onClick={() => router.push(act.path)}
                        className="w-full p-4 rounded-2xl border border-gray-50 flex items-center justify-between hover:bg-gray-50 transition-all font-bold text-xs text-gray-600"
                     >
                         <span className="flex items-center gap-3">{act.icon} {act.label}</span>
                         <ArrowRight size={14} className="text-gray-300" />
                     </button>
                 ))}
             </div>
        </div>
      </div>
    </div>
  );
}
