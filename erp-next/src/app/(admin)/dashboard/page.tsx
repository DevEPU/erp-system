"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import IconRenderer from "@/components/ui/IconRenderer";
import usePermission from "@/hooks/usePermission";
import { useForecastEnabled, useReceiptByScheduleEnabled } from "@/lib/config";
import { STATIC_MENUS } from "@/lib/constants";
import { filterAccessibleMenus } from "@/lib/menuUtils";
import { Menu } from "@/types/menu";
import {
  Search,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Layers,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  PieChart,
} from "lucide-react";

// Theme configuration per module for beautiful unique accents
const MODULE_THEMES: Record<
  string,
  {
    gradient: string;
    borderHover: string;
    badgeBg: string;
    badgeText: string;
    iconBg: string;
    iconColor: string;
    tagBg: string;
  }
> = {
  "Supplier & Pembelian": {
    gradient: "from-emerald-500 to-teal-600",
    borderHover: "hover:border-emerald-500/40",
    badgeBg: "bg-emerald-50 border-emerald-200",
    badgeText: "text-emerald-700",
    iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
    iconColor: "text-emerald-600",
    tagBg: "bg-emerald-500/10 text-emerald-700",
  },
  "Customer & Penjualan": {
    gradient: "from-blue-500 to-indigo-600",
    borderHover: "hover:border-blue-500/40",
    badgeBg: "bg-blue-50 border-blue-200",
    badgeText: "text-blue-700",
    iconBg: "bg-blue-50 text-blue-600 border-blue-100",
    iconColor: "text-blue-600",
    tagBg: "bg-blue-500/10 text-blue-700",
  },
  "Persediaan Barang": {
    gradient: "from-amber-500 to-orange-600",
    borderHover: "hover:border-amber-500/40",
    badgeBg: "bg-amber-50 border-amber-200",
    badgeText: "text-amber-700",
    iconBg: "bg-amber-50 text-amber-600 border-amber-100",
    iconColor: "text-amber-600",
    tagBg: "bg-amber-500/10 text-amber-700",
  },
  "Manufacturing": {
    gradient: "from-purple-500 to-violet-600",
    borderHover: "hover:border-purple-500/40",
    badgeBg: "bg-purple-50 border-purple-200",
    badgeText: "text-purple-700",
    iconBg: "bg-purple-50 text-purple-600 border-purple-100",
    iconColor: "text-purple-600",
    tagBg: "bg-purple-500/10 text-purple-700",
  },
  "Kas/Bank": {
    gradient: "from-teal-500 to-cyan-600",
    borderHover: "hover:border-teal-500/40",
    badgeBg: "bg-teal-50 border-teal-200",
    badgeText: "text-teal-700",
    iconBg: "bg-teal-50 text-teal-600 border-teal-100",
    iconColor: "text-teal-600",
    tagBg: "bg-teal-500/10 text-teal-700",
  },
  "General Ledger": {
    gradient: "from-indigo-500 to-slate-700",
    borderHover: "hover:border-indigo-500/40",
    badgeBg: "bg-indigo-50 border-indigo-200",
    badgeText: "text-indigo-700",
    iconBg: "bg-indigo-50 text-indigo-600 border-indigo-100",
    iconColor: "text-indigo-600",
    tagBg: "bg-indigo-500/10 text-indigo-700",
  },
  "Pengaturan": {
    gradient: "from-slate-600 to-gray-800",
    borderHover: "hover:border-slate-500/40",
    badgeBg: "bg-slate-50 border-slate-200",
    badgeText: "text-slate-700",
    iconBg: "bg-slate-50 text-slate-600 border-slate-100",
    iconColor: "text-slate-600",
    tagBg: "bg-slate-500/10 text-slate-700",
  },
  "User Security": {
    gradient: "from-rose-500 to-red-600",
    borderHover: "hover:border-rose-500/40",
    badgeBg: "bg-rose-50 border-rose-200",
    badgeText: "text-rose-700",
    iconBg: "bg-rose-50 text-rose-600 border-rose-100",
    iconColor: "text-rose-600",
    tagBg: "bg-rose-500/10 text-rose-700",
  },
  "Daftar Laporan": {
    gradient: "from-cyan-600 to-blue-700",
    borderHover: "hover:border-cyan-500/40",
    badgeBg: "bg-cyan-50 border-cyan-200",
    badgeText: "text-cyan-700",
    iconBg: "bg-cyan-50 text-cyan-600 border-cyan-100",
    iconColor: "text-cyan-600",
    tagBg: "bg-cyan-500/10 text-cyan-700",
  },
  "Lain-lain": {
    gradient: "from-stone-500 to-zinc-600",
    borderHover: "hover:border-stone-500/40",
    badgeBg: "bg-stone-50 border-stone-200",
    badgeText: "text-stone-700",
    iconBg: "bg-stone-50 text-stone-600 border-stone-100",
    iconColor: "text-stone-600",
    tagBg: "bg-stone-500/10 text-stone-700",
  },
  "Profil Perusahaan": {
    gradient: "from-emerald-600 to-green-700",
    borderHover: "hover:border-emerald-500/40",
    badgeBg: "bg-emerald-50 border-emerald-200",
    badgeText: "text-emerald-700",
    iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
    iconColor: "text-emerald-600",
    tagBg: "bg-emerald-500/10 text-emerald-700",
  },
};

const DEFAULT_THEME = {
  gradient: "from-emerald-500 to-teal-600",
  borderHover: "hover:border-emerald-500/40",
  badgeBg: "bg-emerald-50 border-emerald-200",
  badgeText: "text-emerald-700",
  iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
  iconColor: "text-emerald-600",
  tagBg: "bg-emerald-500/10 text-emerald-700",
};

export default function MainDashboardPortal() {
  const router = useRouter();
  const { can, user, loading } = usePermission();
  const isForecastEnabled = useForecastEnabled();
  const isReceiptByScheduleEnabled = useReceiptByScheduleEnabled();

  const [searchQuery, setSearchQuery] = useState("");

  // Filter modules based on permission, exclude "Dashboard" itself
  const accessibleModules = useMemo(() => {
    const rawFiltered = filterAccessibleMenus(
      STATIC_MENUS,
      can,
      isForecastEnabled,
      isReceiptByScheduleEnabled
    );

    // Remove "Dashboard" leaf menu from the cards container list
    return rawFiltered.filter((m) => m.name !== "Dashboard");
  }, [can, isForecastEnabled, isReceiptByScheduleEnabled]);

  // Total functional submenus accessible by user
  const totalAccessibleItems = useMemo(() => {
    let count = 0;
    accessibleModules.forEach((m) => {
      if (m.submenus && m.submenus.length > 0) {
        count += m.submenus.filter((s) => !s.is_divider).length;
      } else {
        count += 1;
      }
    });
    return count;
  }, [accessibleModules]);

  // Search filter across module names and submenu names
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return accessibleModules;

    const query = searchQuery.toLowerCase().trim();
    return accessibleModules
      .map((mod) => {
        const moduleNameMatches = mod.name.toLowerCase().includes(query);
        const matchedSubmenus = mod.submenus?.filter((sub) => {
          if (sub.is_divider) return false;
          return sub.name.toLowerCase().includes(query);
        });

        if (moduleNameMatches) {
          return mod;
        }

        if (matchedSubmenus && matchedSubmenus.length > 0) {
          return {
            ...mod,
            submenus: matchedSubmenus,
          };
        }

        return null;
      })
      .filter(Boolean) as Menu[];
  }, [accessibleModules, searchQuery]);

  const handleNavigate = (path: string) => {
    if (path && path !== "#") {
      router.push(path);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-gray-500">Memuat akses portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex flex-col p-4 md:p-8 space-y-8 animate-in fade-in duration-500 bg-[#f8fafc]">
      {/* ── BANNER HERO & USER GREETING ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 text-white p-6 md:p-8 shadow-xl shadow-emerald-950/10">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-10 w-60 h-60 bg-teal-400/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide border border-white/20">
              <Sparkles size={14} className="text-amber-300" />
              <span>ERP System Portal - PT Eran Plastindo Utama</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Halo, {user?.name || "Pengguna"}! 👋
            </h1>
            <p className="text-sm md:text-base text-emerald-100 font-medium leading-relaxed">
              Berikut adalah modul dan container menu operasional yang aktif sesuai hak akses peran{" "}
              <span className="font-bold underline decoration-white/50">
                [{user?.role_names?.join(", ") || "User"}]
              </span>
              . Klik salah satu menu di bawah untuk langsung menuju halaman kerja Anda.
            </p>
          </div>

          {/* Quick Metrics & Budgeting Link */}
          <div className="flex flex-wrap md:flex-nowrap items-center gap-3 shrink-0">
            {can("access_budget") && (
              <button
                onClick={() => router.push("/budgeting/dashboard")}
                className="flex items-center gap-2.5 px-4 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <PieChart size={16} className="text-amber-300" />
                <span>Dashboard Budgeting</span>
                <ChevronRight size={14} className="opacity-70" />
              </button>
            )}

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 px-4 flex items-center gap-4 shadow-inner">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold">
                  Modul Aktif
                </p>
                <p className="text-xl font-black text-white">{accessibleModules.length}</p>
              </div>
              <div className="h-7 w-px bg-white/20"></div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold">
                  Menu Tersedia
                </p>
                <p className="text-xl font-black text-white">{totalAccessibleItems}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar inside Hero */}
        <div className="mt-6 pt-5 border-t border-white/15 relative z-10 max-w-md">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-200"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari modul atau menu kerja..."
              className="w-full pl-11 pr-4 py-2.5 bg-white/15 backdrop-blur-md border border-white/25 text-white placeholder-emerald-200/70 text-xs md:text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-white/40 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/70 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── EMPTY STATE ── */}
      {filteredModules.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-gray-100 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
            <Search size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">
            {searchQuery ? "Menu Tidak Ditemukan" : "Tidak Ada Modul yang Dapat Diakses"}
          </h3>
          <p className="text-xs text-gray-500 max-w-md">
            {searchQuery
              ? `Tidak ada menu atau modul yang cocok dengan kata kunci "${searchQuery}". Silakan coba kata kunci lain.`
              : "Akun Anda saat ini belum memiliki hak akses ke modul ERP. Hubungi Administrator sistem untuk mengonfigurasi izin peran Anda."}
          </p>
        </div>
      )}

      {/* ── CONTAINERS MASING-MASING MENU ── */}
      <div className="space-y-8">
        {filteredModules.map((module) => {
          const theme = MODULE_THEMES[module.name] || DEFAULT_THEME;
          const submenus = module.submenus || [];
          const functionalSubmenus = submenus.filter((s) => !s.is_divider);

          return (
            <div
              key={module.id}
              className={`bg-white rounded-[2rem] border border-gray-100/90 shadow-sm transition-all duration-300 hover:shadow-xl ${theme.borderHover} overflow-hidden`}
            >
              {/* Container Header */}
              <div className="p-5 md:p-6 border-b border-gray-100/80 bg-gradient-to-r from-gray-50/70 to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-13 h-13 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center shadow-lg shadow-gray-200 text-white shrink-0`}
                  >
                    <IconRenderer name={module.icon} size={26} className="text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg md:text-xl font-black text-gray-900 tracking-tight">
                        {module.name}
                      </h2>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${theme.badgeBg} ${theme.badgeText}`}
                      >
                        {functionalSubmenus.length} Fitur
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium mt-0.5 line-clamp-1">
                      {module.description || `Kelola modul dan transaksi ${module.name}.`}
                    </p>
                  </div>
                </div>

                {/* Direct Action to Module Overview/Dashboard if applicable */}
                {module.path && module.path !== "#" && (
                  <button
                    onClick={() => handleNavigate(module.path)}
                    className="inline-flex items-center gap-2 self-start md:self-auto px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-md shadow-gray-900/10 group"
                  >
                    <span>Buka Modul</span>
                    <ArrowRight
                      size={14}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </button>
                )}
              </div>

              {/* Container Body - Submenus organized by Divider or Grid */}
              <div className="p-5 md:p-6 bg-white">
                {submenus.length > 0 ? (
                  <div className="space-y-5">
                    {/* Render grouped sections */}
                    {(() => {
                      // Group submenus by their preceding divider
                      const sections: { label: string; items: Menu[] }[] = [];
                      let currentLabel = "Menu Utama";
                      let currentItems: Menu[] = [];

                      submenus.forEach((sub) => {
                        if (sub.is_divider) {
                          if (currentItems.length > 0) {
                            sections.push({ label: currentLabel, items: currentItems });
                          }
                          currentLabel = sub.divider_label || sub.name;
                          currentItems = [];
                        } else {
                          currentItems.push(sub);
                        }
                      });

                      if (currentItems.length > 0) {
                        sections.push({ label: currentLabel, items: currentItems });
                      }

                      return sections.map((sec, idx) => (
                        <div key={idx} className="space-y-3">
                          {/* Section Title */}
                          {sections.length > 1 && (
                            <div className="flex items-center gap-2 pt-1 pb-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                {sec.label}
                              </span>
                              <div className="flex-1 h-px bg-gray-100"></div>
                            </div>
                          )}

                          {/* Submenu Item Cards Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {sec.items.map((sub) => {
                              const targetPath =
                                module.path && module.path !== "#" && !sub.path.startsWith("/")
                                  ? `${module.path.replace(/\/+$/, "")}/${sub.path}`
                                  : sub.path;

                              return (
                                <div
                                  key={sub.id}
                                  onClick={() => handleNavigate(targetPath)}
                                  className="group cursor-pointer bg-gray-50/70 hover:bg-white border border-gray-100 hover:border-gray-200 p-3.5 rounded-2xl transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex items-center justify-between gap-3 relative"
                                >
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <div
                                      className={`w-9 h-9 rounded-xl ${theme.iconBg} flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105`}
                                    >
                                      {sub.icon ? (
                                        <IconRenderer
                                          name={sub.icon}
                                          size={16}
                                          className={theme.iconColor}
                                        />
                                      ) : (
                                        <Layers size={16} className={theme.iconColor} />
                                      )}
                                    </div>
                                    <div className="overflow-hidden">
                                      <h4 className="text-xs font-bold text-gray-800 group-hover:text-emerald-700 transition-colors truncate">
                                        {sub.name}
                                      </h4>
                                      <p className="text-[10px] text-gray-400 truncate mt-0.5">
                                        {targetPath}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="w-6 h-6 rounded-lg bg-gray-100 group-hover:bg-emerald-50 text-gray-400 group-hover:text-emerald-600 flex items-center justify-center shrink-0 transition-colors">
                                    <ChevronRight size={14} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  // Leaf menu action button
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <span>Modul siap diakses</span>
                    </div>
                    <button
                      onClick={() => handleNavigate(module.path)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Buka Halaman
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
