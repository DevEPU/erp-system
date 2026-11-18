"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/ui/Sidebar";
import { Loader2, ShieldAlert, ArrowLeft } from "lucide-react";
import usePermission from "@/hooks/usePermission";
import { getRequiredPermissionForPath } from "@/lib/routePermissions";
import { getPermissionMapping } from "@/lib/permissionMapping";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { can, user, loading: permissionLoading } = usePermission();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);

    // Initialize state from local storage
    useEffect(() => {
        setIsMounted(true);
        const savedState = localStorage.getItem("sidebarCollapsed");
        if (savedState) {
            setIsSidebarCollapsed(JSON.parse(savedState));
        }
    }, []);

    // Check Auth
    useEffect(() => {
        if (!isMounted) return;

        const userStr = localStorage.getItem("user");
        const token = localStorage.getItem("token");
        if (!userStr || !token) {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            router.push("/login");
            return;
        }

        setIsAuthorized(true);
    }, [isMounted, router]);

    if (!isMounted || permissionLoading) return null;

    if (!isAuthorized) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    <p className="text-sm text-gray-500">
                        Memverifikasi akses...
                    </p>
                </div>
            </div>
        );
    }

    // Check Route Permission for current path
    const requiredPermission = getRequiredPermissionForPath(pathname);
    const isSuperAdmin = user?.role_names?.includes("Super Admin");
    const hasRouteAccess = !requiredPermission || isSuperAdmin || can(requiredPermission);

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                toggleSidebar={() => {
                    const newState = !isSidebarCollapsed;
                    setIsSidebarCollapsed(newState);
                    localStorage.setItem(
                        "sidebarCollapsed",
                        JSON.stringify(newState),
                    );
                }}
            />

            <main
                className={`
            flex-1 p-4 overflow-x-auto transition-all duration-300 ease-in-out
            ${isSidebarCollapsed ? "ml-[64px]" : "ml-0 md:ml-[240px]"}
        `}
            >
                {hasRouteAccess ? (
                    children
                ) : (
                    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center animate-in fade-in duration-300">
                        <div className="bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-xl max-w-lg w-full">
                            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                                <ShieldAlert size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">
                                Akses Dibatasi (403 Forbidden)
                            </h2>
                            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                Akun Anda dengan peran <span className="font-bold text-gray-800">[{user?.role_names?.join(", ") || "User"}]</span> tidak memiliki hak akses untuk membuka halaman ini.
                            </p>
                            {requiredPermission && (
                                <div className="mb-8 p-3 bg-gray-50 rounded-2xl border border-gray-100 text-left">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                        Hak Akses yang Dibutuhkan:
                                    </p>
                                    <p className="text-xs font-semibold text-gray-800">
                                        {getPermissionMapping(requiredPermission).label}
                                    </p>
                                    <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                                        {requiredPermission}
                                    </p>
                                </div>
                            )}
                            <button
                                onClick={() => router.push("/dashboard")}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-95 text-sm"
                            >
                                <ArrowLeft size={16} />
                                <span>Kembali ke Dashboard</span>
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

