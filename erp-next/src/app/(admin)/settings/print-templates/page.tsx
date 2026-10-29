"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Printer,
  Settings2,
  CheckCircle2,
  Circle,
  ChevronRight,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingUp,
  Factory,
  Package,
  Sparkles,
  FileText,
} from "lucide-react";
import api from "@/lib/api";

interface PrintTemplate {
  id: number;
  module_key: string;
  module_name: string;
  is_customized: boolean;
  template_config: Record<string, any>;
  updated_at: string;
}

const GROUP_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  Pembelian: { label: "Supplier & Pembelian", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
  Penjualan: { label: "Customer & Penjualan", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
  Manufacturing: { label: "Manufacturing", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
  Persediaan: { label: "Persediaan Barang", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
};

const GROUP_ORDER = ["Pembelian", "Penjualan", "Manufacturing", "Persediaan"];

export default function PrintTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/settings/print-templates");
      if (res.data?.success) setTemplates(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch print templates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const filteredTemplates = templates.filter((t) =>
    t.module_name.toLowerCase().includes(search.toLowerCase()) ||
    t.module_key.toLowerCase().includes(search.toLowerCase())
  );

  const grouped: Record<string, PrintTemplate[]> = {};
  for (const tpl of filteredTemplates) {
    const grp = (tpl.template_config?.group as string) || "Lainnya";
    if (!grouped[grp]) grouped[grp] = [];
    grouped[grp].push(tpl);
  }

  const customizedCount = templates.filter((t) => t.is_customized).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/20 p-6">
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Printer size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Pengaturan Cetakan</h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">Kelola layout dan konfigurasi dokumen cetak untuk setiap modul transaksi</p>
            </div>
          </div>
          <button onClick={fetchTemplates} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <div className="text-2xl font-black text-gray-900">{templates.length}</div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Total Modul</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <div className="text-2xl font-black text-indigo-600">{customizedCount}</div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Terkustomisasi</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <div className="text-2xl font-black text-gray-400">{templates.length - customizedCount}</div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Menggunakan Default</div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Cari modul cetakan..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all shadow-sm" />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded-lg w-2/3 mb-3" />
              <div className="h-3 bg-gray-50 rounded-lg w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {GROUP_ORDER.map((grp) => {
            const items = grouped[grp];
            if (!items || items.length === 0) return null;
            const meta = GROUP_META[grp];
            return (
              <div key={grp}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl ${meta.bg} ${meta.color} ${meta.border} border font-black text-xs uppercase tracking-widest`}>
                    {meta.label}
                  </div>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs font-bold text-gray-400">{items.length} modul</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map((tpl) => (
                    <div key={tpl.module_key} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group overflow-hidden">
                      <div className={`h-1 w-full ${tpl.is_customized ? "bg-gradient-to-r from-indigo-500 to-purple-500" : "bg-gray-100"}`} />
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText size={14} className={tpl.is_customized ? "text-indigo-500" : "text-gray-300"} />
                              <h3 className="font-black text-gray-900 text-sm truncate">{tpl.module_name}</h3>
                            </div>
                            <code className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">{tpl.module_key}</code>
                          </div>
                          {tpl.is_customized ? (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-indigo-100 shrink-0">
                              <Sparkles size={10} /> Custom
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-400 rounded-full text-[10px] font-black uppercase tracking-wider border border-gray-100 shrink-0">
                              <Circle size={10} /> Default
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-4 min-h-[24px]">
                          {tpl.template_config?.paper_size && <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-bold border border-slate-100">{tpl.template_config.paper_size}</span>}
                          {tpl.template_config?.orientation && <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-bold border border-slate-100 capitalize">{tpl.template_config.orientation === "portrait" ? "Potrait" : "Landscape"}</span>}
                          {tpl.template_config?.show_signature && <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-bold border border-slate-100">TTD</span>}
                          {tpl.template_config?.show_header && <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-bold border border-slate-100">Header</span>}
                        </div>
                        <button onClick={() => router.push(`/settings/print-templates/${tpl.module_key}`)}
                          className="w-full flex items-center justify-between px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all active:scale-95">
                          <span className="flex items-center gap-2"><Settings2 size={13} /> Edit Layout Cetakan</span>
                          <ChevronRight size={13} className="opacity-70" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {Object.keys(grouped).length === 0 && (
            <div className="py-24 text-center">
              <Printer size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Tidak ada modul ditemukan</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
