"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown,
  User as UserIcon,
} from "lucide-react";

import IconRenderer from "@/components/ui/IconRenderer";
import { STATIC_MENUS } from "@/lib/constants";
import { Menu } from "@/types/menu";

import usePermission from "@/hooks/usePermission";
import { useForecastEnabled, useReceiptByScheduleEnabled } from "@/lib/config";

type SidebarProps = {
  isCollapsed: boolean;
  toggleSidebar: () => void;
};

// Helper: Securely join parent and child paths
const getFullPath = (
  parentPath: string | null | undefined,
  childPath: string,
) => {
  if (!parentPath || parentPath === "#") return childPath;
  if (childPath.startsWith("/")) return childPath; // Absolute path override

  const cleanParentPath = parentPath.replace(/\/+$/, "");
  return `${cleanParentPath}/${childPath}`;
};

import { COMPONENT_PERMISSIONS } from "@/lib/routePermissions";

export default function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { can, loading, user } = usePermission();
  const isForecastEnabled = useForecastEnabled();
  const isReceiptByScheduleEnabled = useReceiptByScheduleEnabled();

  // State
  const [menus, setMenus] = useState<Menu[]>(STATIC_MENUS);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  // Filtered Menus strictly based on Role Permissions
  const visibleMenus = menus
    .filter((menu) => !menu.hidden)
    .map((menu) => {
      // 1. Filter submenus if present
      let filteredSubmenus = menu.submenus;
      if (menu.submenus && menu.submenus.length > 0) {
        filteredSubmenus = menu.submenus
          .filter((sub) => {
            if (sub.is_divider) return true;
            if (sub.name === "Forecast" && !isForecastEnabled) {
              return false;
            }
            if (
              (sub.name === "Penerimaan by Schedule" ||
                sub.name === "Penerimaan dari Schedule") &&
              !isReceiptByScheduleEnabled
            ) {
              return false;
            }
            const perm = COMPONENT_PERMISSIONS[sub.name];
            if (perm && !can(perm)) {
              return false;
            }
            return true;
          })
          .map((sub) => {
            if (sub.name === "Forecast") {
              return { ...sub, is_active: isForecastEnabled };
            }
            return sub;
          });

        // Filter out dividers if no functional submenus are accessible
        const functionalCount = filteredSubmenus.filter((s) => !s.is_divider).length;
        if (functionalCount === 0) {
          filteredSubmenus = [];
        }

        // If parent has submenus and all functional submenus are hidden, hide parent
        if (filteredSubmenus.length === 0) {
          return null;
        }
      } else {
        // Leaf menu without submenus (e.g. Profil Perusahaan, Dashboard)
        if (
          COMPONENT_PERMISSIONS[menu.name] &&
          !can(COMPONENT_PERMISSIONS[menu.name])
        ) {
          return null;
        }
      }

      return { ...menu, submenus: filteredSubmenus };
    })
    .filter(Boolean) as Menu[];

  // Effect: Auto Expand Menu if child is active (accordion — only one open)
  useEffect(() => {
    if (visibleMenus.length > 0) {
      const activeParent = visibleMenus.find((item) => {
        if (!item.submenus || item.submenus.length === 0) return false;
        return item.submenus.some((sub) => {
          const fullPath = getFullPath(item.path, sub.path);
          return sub.is_active && pathname.startsWith(fullPath);
        });
      });

      // Also check if pathname matches a module dashboard path
      const dashboardParent = visibleMenus.find(
        (item) =>
          item.has_dashboard &&
          item.path !== "#" &&
          pathname === item.path,
      );

      const parentToExpand = activeParent || dashboardParent;
      if (parentToExpand) {
        setExpandedMenus([parentToExpand.name]);
      }
    }
  }, [pathname, visibleMenus.length]);

  // Accordion open: close all others, open only this one
  const openMenuAccordion = (menuName: string) => {
    setExpandedMenus([menuName]);
  };

  // Handler click parent menu (accordion behavior):
  // - has_dashboard menus: navigate to dashboard + open its dropdown (close others)
  // - dropdown-only menus: toggle open/close accordion style
  // - leaf menus (no submenus): navigate to path
  const handleMenuClick = (menu: Menu) => {
    const activeSubmenus = menu.submenus?.filter((s) => s.is_active) || [];
    const hasSubmenu = activeSubmenus.length > 0;
    const isCurrentlyExpanded = expandedMenus.includes(menu.name);

    if (menu.has_dashboard && hasSubmenu) {
      // Navigate to module dashboard
      router.push(menu.path);
      // Open this dropdown exclusively (close all others)
      if (isCollapsed) {
        toggleSidebar();
        setTimeout(() => {
          openMenuAccordion(menu.name);
        }, 100);
      } else {
        openMenuAccordion(menu.name);
      }
    } else if (hasSubmenu) {
      // Dropdown-only: accordion toggle
      if (isCollapsed) {
        toggleSidebar();
        setTimeout(() => {
          if (isCurrentlyExpanded) {
            setExpandedMenus([]);
          } else {
            openMenuAccordion(menu.name);
          }
        }, 100);
      } else {
        if (isCurrentlyExpanded) {
          setExpandedMenus([]);
        } else {
          openMenuAccordion(menu.name);
        }
      }
    } else if (menu.path && menu.path !== "#") {
      router.push(menu.path);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (loading) return null; // Or skeleton

  // Check for missing permissions (Stale session)
  const hasStaleSession =
    user &&
    (!user.permissions || user.permissions.length === 0) &&
    (!user.role_names || user.role_names.length === 0);

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex flex-col h-screen bg-emerald-600 border-r border-emerald-500 shadow-2xl transition-all duration-300 ease-in-out print:hidden ${isCollapsed ? "w-[64px]" : "w-[240px]"
        }`}
    >
      {/* --- STALE SESSION WARNING --- */}
      {hasStaleSession && !isCollapsed && (
        <div className="mx-4 mt-16 mb-2 p-3 bg-orange-100 border border-orange-200 rounded-xl animate-pulse">
          <p className="text-xs text-orange-800 font-bold mb-1">
            Update Required
          </p>
          <p className="text-[10px] text-orange-700 leading-tight">
            Please{" "}
            <button onClick={handleLogout} className="underline font-bold">
              logout
            </button>{" "}
            and login again to load new permissions.
          </p>
        </div>
      )}

      {/* --- TOGGLE BUTTON --- */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-9 bg-white border border-emerald-200 text-emerald-600 rounded-full p-1 shadow-md hover:bg-emerald-50 transition-colors z-50"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* --- HEADER LOGO --- */}
      <div className="flex flex-col items-center pt-4 pb-3 border-b border-emerald-500/50">
        <Link href="/dashboard">
          <div
            className={`bg-white/90 shadow-2xl shadow-white/50 p-2 rounded-full backdrop-blur-sm transition-all duration-300 ${isCollapsed ? "w-8 h-8 p-1" : "w-12 h-12"
              }`}
          >
            <Image
              src="/logo.png"
              alt="Logo EPU"
              width={48}
              height={48}
              priority
              unoptimized
              className="object-contain w-full h-full"
            />
          </div>
        </Link>

        <div
          className={`text-center overflow-hidden transition-all duration-300 flex flex-col items-center ${isCollapsed ? "h-0 opacity-0" : "h-auto opacity-100 mt-1.5"
            }`}
        >
          <Link href="/dashboard">
            <h1 className="font-bold text-white text-base leading-tight whitespace-nowrap hover:text-emerald-100 transition-colors">
              ERP System EPU
            </h1>
          </Link>

          <a
            href="#"
            className="text-[9px] text-emerald-100 uppercase tracking-widest hover:text-white transition-colors"
          >
            PT Eran Plastindo Utama
          </a>
        </div>
      </div>

      {/* --- MENU ITEMS --- */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1 custom-scrollbar">
        {visibleMenus.map((menu) => {
          const activeSubmenus =
            menu.submenus?.filter((s) => s.is_active) || [];
          const hasSubmenu = activeSubmenus.length > 0;
          const isExpanded = expandedMenus.includes(menu.name);

          // Check if active
          const isParentActive =
            (menu.path && menu.path !== "#" && pathname === menu.path) ||
            (menu.has_dashboard && menu.path !== "#" && pathname.startsWith(menu.path)) ||
            (hasSubmenu &&
              activeSubmenus.some((sub) => {
                const fullPath = getFullPath(menu.path, sub.path);
                return pathname === fullPath || pathname.startsWith(fullPath + "/");
              }));

          return (
            <div key={menu.id} className="mb-1">
              {/* PARENT ITEM */}
              <div
                onClick={() => handleMenuClick(menu)}
                className={`
                  group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-200 relative
                  ${isParentActive
                    ? "bg-emerald-800 text-white shadow-lg shadow-emerald-900/20"
                    : "text-emerald-100 hover:bg-emerald-500 hover:text-white"
                  }
                  ${isCollapsed ? "justify-center" : ""}
                `}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`shrink-0 transition-transform duration-200 ${!isParentActive && "group-hover:scale-110"
                      }`}
                  >
                    <IconRenderer
                      name={menu.icon}
                      size={isCollapsed ? 20 : 16}
                    />
                  </div>

                  <span
                    className={`font-medium text-xs whitespace-nowrap transition-all duration-300 origin-left ${isCollapsed
                        ? "w-0 opacity-0 scale-0 hidden"
                        : "w-auto opacity-100 scale-100"
                      }`}
                  >
                    {menu.name}
                  </span>
                </div>

                {/* Dropdown Arrow */}
                {!isCollapsed && hasSubmenu && (
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : "rotate-0"
                      } opacity-70`}
                  />
                )}

                {/* Tooltip on Collapsed */}
                {isCollapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    {menu.name}
                    <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                  </div>
                )}
              </div>

              {/* --- SUBMENUS --- */}
              {!isCollapsed && hasSubmenu && (
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded
                      ? "max-h-[1000px] opacity-100 mt-1"
                      : "max-h-0 opacity-0"
                    }`}
                >
                  <div className="ml-3 pl-2.5 border-l border-emerald-500/30 space-y-0.5">
                    {activeSubmenus.map((sub) => {
                      // Render section divider/label
                      if (sub.is_divider) {
                        return (
                          <div
                            key={sub.id}
                            className="pt-2 pb-0.5 px-1 flex items-center gap-2"
                          >
                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-300/70">
                              {sub.divider_label || sub.name}
                            </span>
                            <div className="flex-1 h-px bg-emerald-500/20" />
                          </div>
                        );
                      }

                      const fullSubPath = getFullPath(menu.path, sub.path);
                      const isSubActive =
                        pathname === fullSubPath ||
                        pathname.startsWith(fullSubPath);

                      return (
                        <div
                          key={sub.id}
                          onClick={() => router.push(fullSubPath)}
                          className={`
                                        flex items-center gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-all duration-200 text-xs
                                        ${isSubActive
                              ? "bg-emerald-500 text-white font-medium shadow-sm"
                              : "text-emerald-100/80 hover:text-white hover:bg-emerald-500/50"
                            }
                                    `}
                        >
                          {/* Sub Icon */}
                          {sub.icon ? (
                            <IconRenderer
                              name={sub.icon}
                              size={13}
                              className={
                                isSubActive ? "opacity-100" : "opacity-70"
                              }
                            />
                          ) : (
                            <div
                              className={`w-1 h-1 rounded-full shrink-0 ${isSubActive ? "bg-white" : "bg-emerald-300/50"
                                }`}
                            ></div>
                          )}

                          <span className="truncate">{sub.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* --- USER PROFILE --- */}
      <div className="p-2 border-t border-emerald-500/50 bg-emerald-700/50 mt-auto">
        <div
          onClick={() => router.push("/profiles")}
          className={`
                        flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-200 group
                        hover:bg-emerald-500/50 text-emerald-100 hover:text-white
                        ${isCollapsed ? "justify-center" : ""}
                    `}
        >
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-emerald-400 group-hover:border-white transition-colors overflow-hidden shrink-0 shadow-inner">
              <span className="text-xs font-bold text-white uppercase tracking-tight">
                {user?.name?.substring(0, 2) || "U"}
              </span>
            </div>
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 border-2 border-emerald-700 rounded-full"></div>
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 hidden" : "w-full opacity-100"
              }`}
          >
            <p className="text-xs font-bold text-white truncate leading-none mb-0.5">
              {user?.name}
            </p>
            <p className="text-[9px] text-emerald-200 uppercase tracking-widest truncate font-medium">
              {user?.role_names?.[0] || "User"}
            </p>
          </div>

          {isCollapsed && (
            <div className="absolute left-full ml-6 px-2 py-1 bg-emerald-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg border border-emerald-500">
              Profil: {user?.name}
            </div>
          )}
        </div>
      </div>

      {/* --- LOGOUT --- */}
      <div className="p-2 border-t border-emerald-500/50 bg-emerald-700">
        <div
          onClick={handleLogout}
          className={`
              flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-200 group
              bg-red-500/20 text-red-100 hover:bg-red-600 hover:text-white
              ${isCollapsed ? "justify-center" : ""}
            `}
        >
          <LogOut size={16} className="shrink-0" />
          <span
            className={`font-medium text-xs whitespace-nowrap transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
              }`}
          >
            Keluar Akun
          </span>

          {isCollapsed && (
            <div className="absolute left-full ml-6 px-2 py-1 bg-red-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
              Keluar Akun
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
