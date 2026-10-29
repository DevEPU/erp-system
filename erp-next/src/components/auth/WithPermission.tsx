import usePermission from "@/hooks/usePermission";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LoadingState from "@/components/ui/LoadingState"; // Adjust path as needed

interface WithPermissionProps {
    requiredPermission?: string;
    requiredRole?: string;
    redirectTo?: string; // Optional redirect path
}

export const withPermission = <P extends object>(
    WrappedComponent: React.ComponentType<P>,
    {
        requiredPermission,
        requiredRole,
        redirectTo = "/dashboard",
    }: WithPermissionProps,
) => {
    return (props: P) => {
        const { can, hasRole, loading, user } = usePermission();
        const router = useRouter();

        useEffect(() => {
            if (!loading) {
                if (!user) {
                    router.push("/login");
                    return;
                }

                // Super Admin bypass - can access everything
                if (user.role_names?.includes("Super Admin")) {
                    return;
                }

                if (requiredPermission && !can(requiredPermission)) {
                    router.push(redirectTo);
                } else if (requiredRole && !hasRole(requiredRole)) {
                    router.push(redirectTo);
                }
            }
        }, [loading, user, can, hasRole, router]);

        if (loading) {
            return <LoadingState message="Checking permissions..." />;
        }

        // Super Admin bypass - can access everything
        if (user?.role_names?.includes("Super Admin")) {
            return <WrappedComponent {...props} />;
        }

        // Double check render condition to prevent flash of content
        if (requiredPermission && !can(requiredPermission)) return null;
        if (requiredRole && !hasRole(requiredRole)) return null;

        return <WrappedComponent {...props} />;
    };
};

// Alternative: A component wrapper for parts of the UI
export const Protect = ({
    children,
    permission,
    role,
    fallback = null,
}: {
    children: React.ReactNode;
    permission?: string;
    role?: string;
    fallback?: React.ReactNode;
}) => {
    const { can, hasRole, loading, user } = usePermission();

    if (loading) return null; // Or a small spinner

    // Super Admin bypass - can access everything
    if (user?.role_names?.includes("Super Admin")) return <>{children}</>;

    if (permission && !can(permission)) return <>{fallback}</>;
    if (role && !hasRole(role)) return <>{fallback}</>;

    return <>{children}</>;
};
