"use client";

import { useState, useEffect } from "react";
import usePermission from "@/hooks/usePermission";
import PermissionModal from "@/components/settings/PermissionModal";
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Package,
  ShoppingCart,
  FileText,
  Users,
  Settings,
  DollarSign,
  BarChart3,
  Lock,
} from "lucide-react";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import api from "@/lib/api";
import { PERMISSION_GROUPS, getPermissionMapping } from "@/lib/permissionMapping";

// Icon mapping for modules
const MODULE_ICONS: Record<string, any> = {
  "PURCHASING & PEMBELIAN": ShoppingCart,
  "ACCOUNT PAYABLE (UTANG)": DollarSign,
  "SALES & PENJUALAN": BarChart3,
  "ACCOUNT RECEIVABLE (PIUTANG)": FileText,
  "INVENTORY & PERSEDIAAN": Package,
  "MANUFACTURING & PRODUKSI": Settings,
  "CASH & BANK": DollarSign,
  "GENERAL LEDGER": FileText,
  "GENERAL LEDGER & BUDGETING": FileText,
  "PENGATURAN & SISTEM": Settings,
  "USER SECURITY & AUDIT": Shield,
  "DAFTAR LAPORAN (REPORTS)": FileText,
  "CETAKAN & BARCODE": Lock,
  "LAIN-LAIN & MASTER DATA": Users,
};

export default function PermissionsPage() {
  const { user, hasRole, can } = usePermission();
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<any | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  const {
    isOpen: isStatusModalOpen,
    type: modalType,
    title: modalTitle,
    message: modalMessage,
    onConfirm: modalOnConfirm,
    showSuccess,
    showError,
    showConfirm,
    closeModal,
    isLoading: isActionLoading,
    setIsLoading: setActionLoading,
  } = useStatusModal();

  // Check if user is Super Admin or has access_permissions permission
  const isSuperAdmin = hasRole("Super Admin");
  const hasAccessPermission = can("access_permissions");
  const hasAccess = isSuperAdmin || hasAccessPermission;

  // Group permissions by module using ERP permission mapping
  const groupPermissionsByModule = (perms: any[]) => {
    const groups: Record<string, any[]> = {};

    perms.forEach((perm) => {
      const mapping = getPermissionMapping(perm.name);
      const groupDef = PERMISSION_GROUPS.find(g => g.id === mapping.group);
      const moduleName = groupDef ? groupDef.name : mapping.group;

      if (!groups[moduleName]) {
        groups[moduleName] = [];
      }
      groups[moduleName].push({
        ...perm,
        label: mapping.label
      });
    });

    return groups;
  };

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const res = await api.get("/permissions");
      setPermissions(res.data.data);
      // Expand all modules by default
      const modules = groupPermissionsByModule(res.data.data);
      setExpandedModules(Object.keys(modules));
    } catch (err: any) {
      console.error("❌ Fetch error:", err);
      setError(err.message || "An error occurred while fetching permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (hasAccess) {
        fetchPermissions();
      } else {
        setLoading(false);
        setError(
          "Unauthorized. Super Admin or access_permissions permission required.",
        );
      }
    }
  }, [user, hasAccess]);

  const handleDelete = (id: number, name: string) => {
    showConfirm(
      "Delete Permission?",
      `Are you sure you want to delete permission "${name}"? This might break application functionality if used in code.`,
      () => performDelete(id),
      "Delete Now",
      "Keep it",
    );
  };

  const performDelete = async (id: number) => {
    setActionLoading(true);
    try {
      await api.delete(`/permissions/${id}`);
      showSuccess("Deleted!", "Permission deleted successfully.");
      fetchPermissions();
    } catch (err: any) {
      showError(
        "Error",
        err.message || "An error occurred while deleting permission.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (permission: any) => {
    setSelectedPermission(permission);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedPermission(null);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchPermissions();
    showSuccess(
      "Success!",
      selectedPermission
        ? "Permission updated successfully."
        : "Permission created successfully.",
    );
  };

  const toggleModule = (module: string) => {
    setExpandedModules((prev) =>
      prev.includes(module)
        ? prev.filter((m) => m !== module)
        : [...prev, module],
    );
  };

  const filteredPermissions = permissions.filter((permission) => {
    const lowerSearch = searchTerm.toLowerCase();
    const mapping = getPermissionMapping(permission.name);
    return (
      permission.name.toLowerCase().includes(lowerSearch) ||
      mapping.label.toLowerCase().includes(lowerSearch)
    );
  });

  const groupedPermissions = groupPermissionsByModule(filteredPermissions);

  // Show unauthorized message for users without access
  if (!loading && !hasAccess) {
    return (
      <div className="p-6 min-h-screen">
        <div className="max-w-2xl mx-auto mt-20">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
            <AlertCircle className="mx-auto text-red-500 mb-4" size={64} />
            <h1 className="text-2xl font-black text-red-900 mb-2">
              Access Denied
            </h1>
            <p className="text-red-700">
              You do not have permission to access this page. Super Admin or
              access_permissions permission is required.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <Shield className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Permission <span className="text-emerald-600">Management</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Kelola izin sistem dan kontrol akses berdasarkan modul aplikasi.
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="group relative flex items-center gap-3 bg-gray-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 overflow-hidden"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Buat Permission Baru</span>
        </button>
      </div>

      {/* Search & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search permissions..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Permissions</p>
              <p className="text-3xl font-black">{permissions.length}</p>
            </div>
            <Shield size={40} className="opacity-50" />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Permissions by Module */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading permissions...</p>
        </div>
      ) : Object.keys(groupedPermissions).length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Shield size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            {searchTerm
              ? "No permissions found matching your search"
              : "No permissions found"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedPermissions)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([module, perms]) => {
              const isExpanded = expandedModules.includes(module);
              const Icon = MODULE_ICONS[module] || Lock;

              return (
                <div
                  key={module}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md"
                >
                  {/* Module Header */}
                  <button
                    onClick={() => toggleModule(module)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <Icon size={20} className="text-emerald-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-gray-900">
                          {module}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {perms.length} permission
                          {perms.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="text-gray-400" size={20} />
                    ) : (
                      <ChevronRight className="text-gray-400" size={20} />
                    )}
                  </button>

                  {/* Module Permissions */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      <div className="p-4 space-y-2">
                        {perms.map((perm: any) => (
                          <div
                            key={perm.id}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex items-center gap-2.5 flex-1">
                                <Shield size={16} className="text-emerald-500 shrink-0" />
                                <div className="flex flex-col">
                                  <span className="font-semibold text-gray-900 text-sm">
                                    {perm.label || perm.name}
                                  </span>
                                  <span className="text-[11px] font-mono text-gray-400">
                                    {perm.name}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                  {perm.guard_name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(perm.created_at).toLocaleDateString(
                                    "id-ID",
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 transition-opacity">
                              <button
                                onClick={() => handleEdit(perm)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(perm.id, perm.name)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Modal */}
      <PermissionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        permissionToEdit={selectedPermission}
      />

      <StatusModal
        isOpen={isStatusModalOpen}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        onConfirm={modalOnConfirm}
        onClose={closeModal}
        isLoading={isActionLoading}
      />
    </div>
  );
}
