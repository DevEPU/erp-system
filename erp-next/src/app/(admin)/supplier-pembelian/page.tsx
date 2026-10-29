"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import IconRenderer from "@/components/ui/IconRenderer";
import {
  ShoppingCart,
  Truck,
  ClipboardList,
  PackageCheck,
  FileText,
  Zap,
  ArrowRight,
  Plus,
  UsersRound,
  BadgeCheck,
  Banknote
} from "lucide-react";

// Initial stats state template
// Initial stats state template
const initialStats = [
  { label: "Active Suppliers", value: "...", icon: "UsersRound", color: "from-blue-500 to-indigo-600", path: "/supplier-pembelian/suppliers" },
  { label: "Pending PRs", value: "...", icon: "ShoppingCart", color: "from-cyan-500 to-blue-600", path: "/budgeting/purchase-request" },
  { label: "Active POs", value: "...", icon: "ClipboardList", color: "from-amber-500 to-orange-600", path: "/supplier-pembelian/purchase-order" },
  { label: "Today's Receipts", value: "...", icon: "PackageCheck", color: "from-emerald-500 to-teal-600", path: "/supplier-pembelian/penerimaan-barang" },
  { label: "Active Returns", value: "...", icon: "RefreshCcw", color: "from-purple-500 to-pink-600", path: "/supplier-pembelian/retur-pembelian" },
  { label: "Pending Invoices", value: "...", icon: "FileText", color: "from-rose-500 to-pink-600", path: "/supplier-pembelian/faktur" },
  { label: "Total Hutang (AP)", value: "...", icon: "Banknote", color: "from-red-500 to-rose-600", path: "/supplier-pembelian/transaksi-ap" },
  { label: "Belanja Bulan Ini", value: "...", icon: "Wallet", color: "from-blue-400 to-indigo-500", path: "/supplier-pembelian/jurnal-pembelian" },
];

export default function SupplierPembelianDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(initialStats);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.express.get("/home/supplier-procurement-stats");
        const data = res.data;
        
        setStats([
          { label: "Active Suppliers", value: data.active_suppliers.toString(), icon: "UsersRound", color: "from-blue-500 to-indigo-600", path: "/supplier-pembelian/suppliers" },
          { label: "Pending PRs", value: data.pending_prs.toString(), icon: "ShoppingCart", color: "from-cyan-500 to-blue-600", path: "/budgeting/purchase-request" },
          { label: "Active POs", value: data.active_pos.toString(), icon: "ClipboardList", color: "from-amber-500 to-orange-600", path: "/supplier-pembelian/purchase-order" },
          { label: "Today's Receipts", value: data.todays_receipts.toString(), icon: "PackageCheck", color: "from-emerald-500 to-teal-600", path: "/supplier-pembelian/penerimaan-barang" },
          { label: "Active Returns", value: data.active_returns.toString(), icon: "RefreshCcw", color: "from-purple-500 to-pink-600", path: "/supplier-pembelian/retur-pembelian" },
          { label: "Pending Invoices", value: data.pending_invoices.toString(), icon: "FileText", color: "from-rose-500 to-pink-600", path: "/supplier-pembelian/faktur" },
          { label: "Total Hutang (AP)", value: `Rp ${Number(data.total_hutang || 0).toLocaleString('id-ID')}`, icon: "Banknote", color: "from-red-500 to-rose-600", path: "/supplier-pembelian/transaksi-ap" },
          { label: "Belanja Bulan Ini", value: `Rp ${Number(data.monthly_spend || 0).toLocaleString('id-ID')}`, icon: "Wallet", color: "from-blue-400 to-indigo-500", path: "/supplier-pembelian/jurnal-pembelian" },
        ]);
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      }
    };
    
    fetchStats();
  }, []);

  const WorkflowCard = ({ label, desc, path, icon: Icon, color }: any) => (
    <div 
      onClick={() => router.push(path)}
      className="w-48 group cursor-pointer bg-white border border-gray-100 p-5 rounded-[2rem] hover:border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-900/5 transition-all duration-300 flex flex-col gap-3 relative overflow-hidden"
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
          <span className="inline-flex items-center gap-1.5 text-[8.5px] font-black text-emerald-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
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
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
        <div className="relative bg-white/80 backdrop-blur-xl border border-white/20 p-8 rounded-[2.5rem] shadow-xl shadow-emerald-900/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-2xl shadow-emerald-200">
              <ShoppingCart size={36} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Supplier & Procurement</h1>
              <p className="text-gray-500 font-medium mt-1">End-to-end supply chain orchestration system.</p>
            </div>
          </div>
          <button 
            onClick={() => router.push("/supplier-pembelian/pembelian-langsung")}
            className="group/btn relative px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center gap-3 overflow-hidden transition-all hover:bg-black hover:shadow-2xl active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 translate-x-[-100%] group-hover/btn:translate-x-0 transition-transform duration-500 opacity-20"></div>
            <Zap size={20} className="text-amber-400 fill-amber-400 group-hover/btn:animate-pulse" />
            <span className="relative">Direct Purchase</span>
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
            className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-4 md:p-6 flex items-center gap-4 md:gap-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer hover:border-emerald-500/30"
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
                <div className="w-1.5 h-6 bg-emerald-600 rounded-full"></div>
                Strategic Workflows
            </h2>
        </div>
        
        <div className="bg-white border border-gray-100 p-8 rounded-[3rem] shadow-sm overflow-x-auto relative mt-8">
          {/* Subtle background decoration */}
          <div className="absolute opacity-[0.03] top-0 right-0 pointer-events-none">
            <ShoppingCart size={400} />
          </div>

          <div className="min-w-max flex flex-col gap-10 px-4 py-8 relative z-10 w-max">
            
            <div className="flex items-center gap-6">
              
              <WorkflowCard 
                label="Purchase Request" 
                desc="Permintaan barang" 
                path="/master-data/product-requests" 
                icon={ShoppingCart} 
                color="bg-blue-50 text-blue-600 border-blue-100" 
              />

              <div className="text-gray-300 flex items-center justify-center animate-pulse"><ArrowRight size={28} strokeWidth={4} /></div>

              <WorkflowCard 
                label="Purchase Order" 
                desc="Create & manage POs" 
                path="/supplier-pembelian/purchase-order" 
                icon={ClipboardList} 
                color="bg-amber-50 text-amber-600 border-amber-100" 
              />

              <div className="text-gray-300 flex items-center justify-center animate-pulse"><ArrowRight size={28} strokeWidth={4} /></div>

              <WorkflowCard 
                label="Terima Barang" 
                desc="Goods Receipt (BPB)" 
                path="/supplier-pembelian/penerimaan-barang" 
                icon={Truck} 
                color="bg-emerald-50 text-emerald-600 border-emerald-100" 
              />

              <div className="text-gray-300 flex items-center justify-center animate-pulse"><ArrowRight size={28} strokeWidth={4} /></div>

              <div className="flex flex-col gap-6">
                <WorkflowCard 
                  label="Faktur Pembelian" 
                  desc="Purchase Invoices (PI)" 
                  path="/supplier-pembelian/faktur" 
                  icon={FileText} 
                  color="bg-rose-50 text-rose-600 border-rose-100" 
                />
                <WorkflowCard 
                  label="Pembelian Langsung" 
                  desc="Direct Purchase without PO" 
                  path="/supplier-pembelian/pembelian-langsung" 
                  icon={Zap} 
                  color="bg-orange-50 text-orange-600 border-orange-100" 
                />
                <WorkflowCard 
                  label="Retur Barang" 
                  desc="Return broken items" 
                  path="/supplier-pembelian/retur-pb" 
                  icon={Truck} 
                  color="bg-red-50 text-red-600 border-red-100" 
                />
              </div>

              <div className="text-gray-300 flex items-center justify-center animate-pulse"><ArrowRight size={28} strokeWidth={4} /></div>

              <div className="flex flex-col gap-6">
                <WorkflowCard 
                  label="Pelunasan Utang" 
                  desc="Pembayaran tagihan" 
                  path="/supplier-pembelian/pelunasan-hutang" 
                  icon={Banknote} 
                  color="bg-indigo-50 text-indigo-600 border-indigo-100" 
                />
                <WorkflowCard 
                  label="Transaksi AP" 
                  desc="Jurnal AP" 
                  path="/supplier-pembelian/transaksi-ap" 
                  icon={FileText} 
                  color="bg-slate-50 text-slate-600 border-slate-100" 
                />
              </div>

            </div>

            <div className="mt-8 border-t border-gray-50 pt-8 flex items-center gap-6">
                <WorkflowCard 
                  label="Data Supplier" 
                  desc="Manage vendor database" 
                  path="/supplier-pembelian/suppliers" 
                  icon={UsersRound} 
                  color="bg-teal-50 text-teal-600 border-teal-100" 
                />
                
                <WorkflowCard 
                  label="Supplier Group" 
                  desc="Vendor categorization" 
                  path="/supplier-pembelian/supplier-group" 
                  icon={UsersRound} 
                  color="bg-indigo-50 text-indigo-600 border-indigo-100" 
                />
            </div>

          </div>
        </div>
      </div>

      {/* Visual Separation / Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        <div className="bg-emerald-600 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-emerald-200 group">
          <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform duration-1000">
            <ShoppingCart size={200} />
          </div>
          <div className="relative z-10 space-y-4 max-w-md">
            <h3 className="text-3xl font-black leading-tight italic tracking-tighter">Unified Procurement Lifecycle</h3>
            <p className="text-emerald-50/80 text-sm font-medium leading-relaxed">
              Experience seamless data flow from Purchase Request, Purchase Order, to Goods Receipt and Invoice Posting. Everything is connected.
            </p>
            <div className="flex gap-2 pt-4">
                <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold">Auto-Journaling</div>
                <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold">Stock Management</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm flex flex-col justify-center gap-6 relative overflow-hidden">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                    <Zap size={24} />
                </div>
                <div>
                    <h4 className="font-black text-gray-800">Quick Actions</h4>
                    <p className="text-xs text-gray-400 font-bold">Standard ERP operations</p>
                </div>
             </div>
             <div className="grid grid-cols-1 gap-3">
                 {[
                     { label: "New Direct Purchase", icon: <Plus size={14} />, path: "/supplier-pembelian/pembelian-langsung" },
                     { label: "Register New Supplier", icon: <Truck size={14} />, path: "/supplier-pembelian/suppliers" },
                     { label: "Tutup Pending PO", icon: <BadgeCheck size={14} />, path: "/supplier-pembelian/tutup-pending-po" },
                     { label: "Tutup PR", icon: <BadgeCheck size={14} />, path: "/supplier-pembelian/tutup-pr" },
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
