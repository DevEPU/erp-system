import { useState, useEffect } from "react";
import api from "@/lib/api";

type User = {
    id: number;
    name: string;
    email: string;
    permissions: string[];
    role_names: string[];
    department_id?: number;
    categories?: { id: number; category_name: string }[];
};

export default function usePermission() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Initial fast load from localStorage
        const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
        if (userStr) {
            try {
                const parsedUser = JSON.parse(userStr);
                setUser(parsedUser);
            } catch (e) {
                console.error("Failed to parse user from localStorage", e);
            }
        }
        setLoading(false);

        // 2. Real-time background sync from backend /auth/me or /me
        const syncPermissions = async () => {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            if (!token) return;

            try {
                let res = await api.express.get("/auth/me").catch(() => null);
                if (!res || !res.data?.user) {
                    res = await api.express.get("/me").catch(() => null);
                }
                if (res?.data?.user) {
                    const freshUser = res.data.user;
                    setUser(freshUser);
                    localStorage.setItem("user", JSON.stringify(freshUser));
                }
            } catch (err) {
                // Silently fallback to cached localStorage user
                console.debug("Silent permissions sync fallback:", err);
            }
        };

        syncPermissions();
    }, []);

    const can = (permissionName: string) => {
        if (!user) return false;
        // Super Admin has all permissions
        if (user.role_names?.includes("Super Admin")) return true;

        // Admin role or admin@epu.com explicitly has NO access to approval requests
        if (user.role_names?.includes("Admin") || user.email === "admin@epu.com") {
            if (
                permissionName === "access_approval_requests" ||
                permissionName === "create_approval_requests" ||
                permissionName === "approve_approval_requests" ||
                permissionName === "reject_approval_requests" ||
                permissionName === "show_approval_requests" ||
                permissionName.includes("approval_request")
            ) {
                return false;
            }
        }

        // Admin role or admin@epu.com has full access to all manufacturing execution and QC menus
        if (user.role_names?.includes("Admin") || user.email === "admin@epu.com") {
            const adminGrantedPerms = [
                "access_realisasi_bahan_baku",
                "access_realisasi_produksi",
                "access_transfer_produksi",
                "access_ng_disposal",
                "access_penerimaan_crusher",
                "access_penerimaan_retur_produksi",
                "access_produksi_langsung",
                "access_quality_control",
                "access_penerimaan_fg",
                "access_customer_claim_fg",
                "access_manufacturing",
                "access_boms",
                "access_machines",
                "access_molds",
                "access_work_centers",
                "access_mrp",
                "access_planning_produksi",
                "access_work_orders",
                "access_dashboard_transaksi",
                "access_daily_board",
                "access_laporan_rekap_plan_prod",
                "access_laporan_rekap_ng",
                "access_laporan_control_stock_whfg",
                "access_laporan_ach_rate",
                "access_laporan_ach_leader",
                "access_laporan_os_delivery"
            ];
            if (adminGrantedPerms.includes(permissionName)) return true;
        }

        if (user.permissions?.includes(permissionName)) return true;

        // Aliases for convenience & backward compatibility
        if (permissionName === "access_approval_management" && user.permissions?.includes("access_approval_rules")) return true;
        if (permissionName === "access_approval_rules" && user.permissions?.includes("access_approval_management")) return true;

        return false;
    };

    const hasRole = (roleName: string) => {
        if (!user) return false;
        return user.role_names?.includes(roleName) || false;
    };

    return { user, loading, can, hasRole };
}
