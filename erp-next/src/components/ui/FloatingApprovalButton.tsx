"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Clock, CheckCircle2, XCircle, Wallet, FileText, Package, TrendingUp } from "lucide-react";
import usePermission from "@/hooks/usePermission";
import api from "@/lib/api";

type NotificationItem = {
  id: string;
  request_id: number;
  category: "pengajuan" | "persetujuan";
  title: string;
  status: "pending" | "approved" | "rejected";
  icon: string;
  created_at: string;
  approval_name?: string;
  creator_name?: string;
};

type NotificationCounts = {
  total: number;
  persetujuan: number;
  pengajuan: number;
};

// Helper for human-readable relative time
const getTimeAgo = (dateStr: string) => {
  if (!dateStr) return "Baru saja";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Baru saja";
  
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 5) return "Baru saja";
  if (minutes < 60) return `${minutes} menit yang lalu`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam yang lalu`;
  
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari yang lalu`;
  
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};

export default function FloatingApprovalButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, can } = usePermission();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"semua" | "pengajuan" | "persetujuan">("semua");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [counts, setCounts] = useState<NotificationCounts>({ total: 0, persetujuan: 0, pengajuan: 0 });
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [approvalTypes, setApprovalTypes] = useState<string[]>([]);

  // Fetch dynamic notifications from backend
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      let resData: any = null;
      try {
        const res = await api.express.get("/approvals/notifications", { user_id: user.id });
        resData = res.data;
      } catch (err) {
        // Fallback to Express pending counts endpoint
        try {
          const res = await api.express.get("/approvals/pending-counts", { user_id: user.id });
          if (res.data) {
            const countsData = res.data;
            resData = {
              notifications: [],
              counts: {
                total: countsData["Total"] || 0,
                persetujuan: countsData["Total"] || 0,
                pengajuan: 0
              },
              approval_types: ["MRP", "Product Request", "Target Sales", "Master Budget"]
            };
          }
        } catch (e) {}
      }

      if (resData) {
        const validNotifs = (resData.notifications || []).filter(
          (n: NotificationItem) =>
            n.approval_name !== "Purchase Request" &&
            n.approval_name !== "PR" &&
            !(n.title || "").toLowerCase().includes("purchase request")
        );
        setNotifications(validNotifs);
        setCounts({
          total: validNotifs.length,
          persetujuan: validNotifs.filter((n: NotificationItem) => n.category === "persetujuan").length,
          pengajuan: validNotifs.filter((n: NotificationItem) => n.category === "pengajuan").length
        });
        if (resData.approval_types && Array.isArray(resData.approval_types)) {
          setApprovalTypes(
            resData.approval_types.filter(
              (t: string) => t !== "Purchase Request" && t !== "PR"
            )
          );
        } else {
          setApprovalTypes(["MRP", "Product Request", "Target Sales", "Master Budget"]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch approval notifications", error);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 20000); // refresh every 20s
      return () => clearInterval(interval);
    }
  }, [user]);

  if (pathname === "/login") return null;
  if (!mounted) return null;

  const hasAccess =
    user?.role_names?.includes("Super Admin") ||
    can("access_approval_management");

  if (!hasAccess) return null;

  const filteredNotifications = notifications.filter((item) => {
    if (selectedType === "all") return true;
    return (item.approval_name || "").toLowerCase().includes(selectedType.toLowerCase());
  });


  const handleNotificationClick = (item: NotificationItem) => {
    setIsOpen(false);
    let tab = "budget";
    const nameLower = (item.approval_name || "").toLowerCase();
    if (nameLower.includes("purchase") || nameLower.includes("pr") || nameLower.includes("over budget")) {
      tab = "purchase";
    } else if (nameLower.includes("target") || nameLower.includes("sales")) {
      tab = "target";
    } else if (nameLower.includes("product")) {
      tab = "product";
    } else if (nameLower.includes("mrp")) {
      router.push("/manufacturing/mrp");
      return;
    }
    router.push(`/budgeting/approval-request?tab=${tab}`);
  };

  const getIconComponent = (item: NotificationItem) => {
    if (item.status === "approved") {
      return (
        <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-sm">
          <CheckCircle2 size={18} />
        </div>
      );
    }
    if (item.status === "rejected") {
      return (
        <div className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100 shadow-sm">
          <XCircle size={18} />
        </div>
      );
    }
    // Default clock or wallet for pending
    if ((item.approval_name || "").toLowerCase().includes("budget")) {
      return (
        <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
          <Wallet size={18} />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 shadow-sm">
        <Clock size={18} />
      </div>
    );
  };

  const isAdmin = user?.email === "admin@epu.com" || user?.role_names?.includes("Admin") || (user as any)?.role?.name === "Admin";
  if (!mounted || !user || isAdmin || !can("access_approval_requests")) {
    return null;
  }

  return (
    <div className="fixed top-3 right-4 z-50 print:hidden">
      <div className="flex flex-col items-end">
        {/* Trigger Pill Button */}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className={`
            flex items-center gap-2 px-3.5 py-1.5 rounded-full shadow-lg border transition-all duration-200 select-none
            ${
              isOpen
                ? "bg-gray-900 text-white border-gray-800"
                : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:shadow-xl"
            }
          `}
        >
          <Bell size={14} className={isOpen ? "text-white" : "text-emerald-600"} />
          <span className="text-xs font-bold whitespace-nowrap">Approval</span>
          {counts.total > 0 && (
            <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none shadow-sm">
              {counts.total > 99 ? "99+" : counts.total}
            </span>
          )}
        </button>

        {/* Modal Popover matching screenshot */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-gray-800 font-sans"
            >
              {/* Header */}
              <div className="p-5 pb-3 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-gray-900 tracking-tight leading-none mb-1">
                    NOTIFIKASI
                  </h3>
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    ADA {filteredNotifications.length} NOTIFIKASI AKTIF
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Module Filter Buttons Grid */}
              <div className="p-3 grid grid-cols-3 gap-1.5 border-b border-gray-100 bg-gray-50/60">
                <button
                  onClick={() => setSelectedType("all")}
                  title="Semua Modul"
                  className={`py-1.5 px-2 rounded-xl text-[10px] font-black tracking-wide uppercase transition-all truncate border flex items-center justify-center ${
                    selectedType === "all"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-600"
                  }`}
                >
                  Semua Modul
                </button>
                {approvalTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    title={type}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-black tracking-wide uppercase transition-all truncate border flex items-center justify-center ${
                      selectedType === type
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-600"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>




              {/* List Content */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 custom-scrollbar">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs font-medium italic">
                    Tidak ada notifikasi untuk filter ini.
                  </div>
                ) : (
                  filteredNotifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className="p-4 hover:bg-gray-50/80 transition-colors cursor-pointer flex items-start gap-3.5 group"
                    >
                      {getIconComponent(item)}

                      <div className="flex-1 space-y-1.5">
                        <p className="text-xs font-bold text-gray-800 leading-snug group-hover:text-emerald-700 transition-colors">
                          {item.title}
                        </p>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                              item.category === "persetujuan"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {item.category}
                          </span>
                          {item.approval_name && (
                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[9px] font-bold">
                              {item.approval_name}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400 font-semibold ml-auto">
                            {getTimeAgo(item.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
