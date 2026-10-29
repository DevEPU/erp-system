import { useState, useEffect } from "react";

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
        // Load user from localStorage (or context)
        const userStr = localStorage.getItem("user");
        if (userStr) {
            try {
                const parsedUser = JSON.parse(userStr);
                setUser(parsedUser);
            } catch (e) {
                console.error("Failed to parse user from localStorage", e);
            }
        }
        setLoading(false);
    }, []);

    const can = (permissionName: string) => {
        if (!user) return false;
        // Super Admin has all permissions
        if (user.role_names?.includes("Super Admin")) return true;

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
