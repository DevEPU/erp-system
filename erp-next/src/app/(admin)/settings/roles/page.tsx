"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Shield, 
  Search, 
  RotateCcw, 
  Save, 
  ChevronRight, 
  ChevronDown, 
  Loader2,
  Plus,
  Edit2,
  Trash2,
  FileBarChart,
  Settings
} from "lucide-react";
import TablePagination from "@/components/ui/TablePagination";
import RoleModal from "@/components/roles/RoleModal";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import api from "@/lib/api";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import { PERMISSION_GROUPS, getPermissionMapping } from "@/lib/permissionMapping";

type Role = {
  id: number;
  name: string;
  permissions: { id: number; name: string }[];
};

type Permission = {
  id: number;
  name: string;
  guard_name: string;
};

export default function RolesPage() {
  const [activeTab, setActiveTab] = useState<"roles" | "hak_akses" | "hak_akses_report">("roles");
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Expanded group sections for matrices
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Local state of selected permissions in matrices: { [roleId: number]: Set<number> }
  const [selectedPermissions, setSelectedPermissions] = useState<Record<number, Set<number>>>({});

  // Role CRUD Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

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

  const getRoleHeaderCode = (name: string) => {
    const mapping: Record<string, string> = {
      "Admin": "ADM",
      "Super Admin": "SAD",
      "HRGA": "HR&GA",
      "Purchasing": "GUDANG",
      "Finance & Accounting": "FIN&AC",
      "General Manager": "MNGR",
      "Marketing": "NP&MKT",
      "Monitoring": "CMMSRS",
      "PPIC": "PPIC",
      "Production": "PROD",
      "Quality": "QC",
      "Manager": "MNGR",
      "Direktur": "DIR",
      "Direktur Utama": "DIRUT",
      "HRD": "HRD",
      "Engineering, Moldshop, & Maintenance": "EMM"
    };
    return mapping[name] || name.substring(0, 6).toUpperCase();
  };

  const isReportPermission = (name: string) => {
    const lower = name.toLowerCase();
    const mapping = getPermissionMapping(name);
    return lower.includes("laporan") || lower.includes("report") || mapping.group === "REPORTS";
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch roles (with their permissions)
      const rolesRes = await api.express.get("/roles");
      const rolesData = rolesRes.data.data;
      setRoles(rolesData);

      // 2. Fetch all permissions
      const permsRes = await api.express.get("/permissions");
      const permsData = permsRes.data.data;
      setPermissions(permsData);

      // Initialize selected permissions map
      const initialMap: Record<number, Set<number>> = {};
      rolesData.forEach((role: Role) => {
        initialMap[role.id] = new Set(role.permissions.map(p => p.id));
      });
      setSelectedPermissions(initialMap);

      // Initialize expanded state for groups
      const initialExpanded: Record<string, boolean> = {};
      PERMISSION_GROUPS.forEach(g => {
        initialExpanded[g.id] = false;
      });
      setExpandedGroups(initialExpanded);

    } catch (error: any) {
      console.error("❌ Failed to fetch roles/permissions:", error);
      showError("Fetch Error", error.message || "Gagal mengambil data dari server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Separate permissions into regular and report permissions
  const regularPermissions = useMemo(() => {
    return permissions.filter(p => !isReportPermission(p.name));
  }, [permissions]);

  const reportPermissions = useMemo(() => {
    return permissions.filter(p => isReportPermission(p.name));
  }, [permissions]);

  // Map permissions to their groups
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    PERMISSION_GROUPS.forEach(g => {
      groups[g.id] = [];
    });

    const activeList = activeTab === "hak_akses_report" ? reportPermissions : regularPermissions;

    activeList.forEach(perm => {
      const mapping = getPermissionMapping(perm.name);
      if (!groups[mapping.group]) {
        groups[mapping.group] = [];
      }
      groups[mapping.group].push(perm);
    });

    return groups;
  }, [regularPermissions, reportPermissions, activeTab]);

  // Filter permissions based on search query
  const filteredGroupedPermissions = useMemo(() => {
    if (!searchQuery) return groupedPermissions;

    const filtered: Record<string, Permission[]> = {};
    const lowerSearch = searchQuery.toLowerCase();

    Object.entries(groupedPermissions).forEach(([groupId, perms]) => {
      const matchingPerms = perms.filter(p => {
        const mapping = getPermissionMapping(p.name);
        return (
          p.name.toLowerCase().includes(lowerSearch) ||
          mapping.label.toLowerCase().includes(lowerSearch)
        );
      });

      if (matchingPerms.length > 0) {
        filtered[groupId] = matchingPerms;
      }
    });

    return filtered;
  }, [groupedPermissions, searchQuery]);

  // Expand parent groups automatically when user searches in matrix
  useEffect(() => {
    if (searchQuery && activeTab !== "roles") {
      const autoExpanded: Record<string, boolean> = {};
      Object.keys(filteredGroupedPermissions).forEach(groupId => {
        autoExpanded[groupId] = true;
      });
      setExpandedGroups(prev => ({ ...prev, ...autoExpanded }));
    }
  }, [filteredGroupedPermissions, searchQuery, activeTab]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const isChecked = (roleId: number, permissionId: number) => {
    return selectedPermissions[roleId]?.has(permissionId) || false;
  };

  const handleTogglePermission = (roleId: number, permissionId: number) => {
    setSelectedPermissions(prev => {
      const next = { ...prev };
      const set = new Set(next[roleId] || []);
      if (set.has(permissionId)) {
        set.delete(permissionId);
      } else {
        set.add(permissionId);
      }
      next[roleId] = set;
      return next;
    });
  };

  const isGroupAllChecked = (roleId: number, groupId: string, groupPerms: Permission[]) => {
    if (groupPerms.length === 0) return false;
    return groupPerms.every(p => selectedPermissions[roleId]?.has(p.id));
  };

  const handleToggleGroupAll = (roleId: number, groupId: string, groupPerms: Permission[]) => {
    const allChecked = isGroupAllChecked(roleId, groupId, groupPerms);
    setSelectedPermissions(prev => {
      const next = { ...prev };
      const set = new Set(next[roleId] || []);
      if (allChecked) {
        // Uncheck all in this group
        groupPerms.forEach(p => set.delete(p.id));
      } else {
        // Check all in this group
        groupPerms.forEach(p => set.add(p.id));
      }
      next[roleId] = set;
      return next;
    });
  };

  // CRUD Handlers for Roles Tab
  const handleAddRole = () => {
    setSelectedRole(null);
    setIsModalOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setIsModalOpen(true);
  };

  const handleDeleteRole = (id: number) => {
    showConfirm(
      "Hapus Peran (Role)?",
      "Apakah Anda yakin ingin menghapus peran ini? Pengguna dengan peran ini mungkin akan kehilangan hak akses mereka.",
      () => performDeleteRole(id),
      "Hapus Sekarang",
      "Batal"
    );
  };

  const performDeleteRole = async (id: number) => {
    setActionLoading(true);
    try {
      await api.express.delete(`/roles/${id}`);
      showSuccess("Terhapus!", "Peran berhasil dihapus.");
      fetchData();
    } catch (error: any) {
      showError("Gagal Menghapus", error.message || "Terjadi kesalahan.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = () => {
    fetchData();
  };

  const handleSave = async () => {
    setActionLoading(true);
    try {
      const matrixPayload: Record<number, number[]> = {};
      roles.forEach(role => {
        matrixPayload[role.id] = Array.from(selectedPermissions[role.id] || []);
      });

      await api.express.post("/roles/bulk-permissions", { matrix: matrixPayload });
      showSuccess("Tersimpan!", "Matriks hak akses berhasil diperbarui.");
      fetchData();
    } catch (error: any) {
      console.error("❌ Failed to save matrix:", error);
      showError("Gagal Menyimpan", error.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered roles for roles tab
  const filteredRoles = useMemo(() => {
    return roles.filter(role => 
      role.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [roles, searchQuery]);

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <RoleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchData();
          showSuccess("Berhasil!", "Peran berhasil disimpan.");
        }}
        roleToEdit={selectedRole as any}
        mode="role"
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <Shield className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Role <span className="text-emerald-600">Management</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Kelola peran pengguna, hak akses modul utama, dan hak akses laporan sistem.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Pills/Tabs in User & Department style */}
          <div className="flex bg-gray-100 p-1.5 rounded-2xl">
            <button
              onClick={() => {
                setActiveTab("roles");
                setSearchQuery("");
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === "roles"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Shield size={16} />
              <span>Roles</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("hak_akses");
                setSearchQuery("");
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === "hak_akses"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Settings size={16} />
              <span>Hak Akses Group</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("hak_akses_report");
                setSearchQuery("");
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === "hak_akses_report"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <FileBarChart size={16} />
              <span>Hak Akses Group Report</span>
            </button>
          </div>

          {/* Action Button on the Right */}
          {activeTab === "roles" ? (
            <button
              onClick={handleAddRole}
              className="group relative flex items-center gap-3 bg-gray-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 overflow-hidden"
            >
              <Plus size={20} strokeWidth={3} />
              <span>Tambah Role</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 bg-[#d9534f] hover:bg-[#c9302c] active:bg-[#ac2925] text-white text-xs font-bold px-5 py-3.5 rounded-2xl shadow transition-all active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Hak Akses</span>
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 bg-[#337ab7] hover:bg-[#286090] active:bg-[#204d74] text-white text-xs font-bold px-6 py-3.5 rounded-2xl shadow transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards in User & Department style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={<Shield size={20} />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" label="TOTAL ROLES" value={roles.length} />
        <StatCard icon={<Settings size={20} />} iconBgColor="bg-blue-50" iconColor="text-blue-600" label="HAK AKSES GROUP" value={regularPermissions.length} />
        <StatCard icon={<FileBarChart size={20} />} iconBgColor="bg-purple-50" iconColor="text-purple-600" label="HAK AKSES GROUP REPORT" value={reportPermissions.length} />
      </div>

      {/* Filter Bar */}
      <div className="mb-6">
        <FilterBar 
          searchPlaceholder={
            activeTab === "roles"
              ? "Cari role..."
              : activeTab === "hak_akses"
                ? "search Hak Akses..."
                : "search Hak Akses Laporan..."
          }
          searchValue={searchQuery}
          onSearchChange={setSearchQuery} 
        />
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        {loading ? (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-3 text-gray-500 my-auto">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium">Memuat Data...</p>
          </div>
        ) : activeTab === "roles" ? (
          /* ==================== TAB ROLES (CRUD) ==================== */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr className="border-b border-gray-100 text-left">
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest tracking-wider w-16">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest tracking-wider w-1/4">
                    Role Name
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest tracking-wider">
                    Permissions
                  </th>
                  <th scope="col" className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest tracking-wider w-32">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRoles.length > 0 ? (
                  filteredRoles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        #{role.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-gray-800 bg-gray-100 px-3 py-1 rounded-full">
                          {role.name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-hidden relative">
                          {role.permissions?.slice(0, 8).map((p) => (
                            <span
                              key={p.id}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-100"
                            >
                              {p.name}
                            </span>
                          ))}
                          {(role.permissions?.length || 0) > 8 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              +{role.permissions.length - 8} more
                            </span>
                          )}
                          {(!role.permissions || role.permissions.length === 0) && (
                            <span className="text-xs text-gray-400 italic">
                              No specific permissions
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditRole(role)}
                            className="p-1.5 text-emerald-500 hover:text-emerald-600 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteRole(role.id)}
                            className="p-1.5 text-red-500 hover:text-red-600 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      <p className="text-sm font-medium">Tidak ada data role ditemukan.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ==================== TAB MATRIX (REGULAR & REPORT) ==================== */
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-200 divide-y divide-gray-200">
              <thead className="bg-gray-50 divide-y divide-gray-200">
                <tr className="divide-x divide-gray-200 text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left w-[25%] min-w-[280px]">
                    Nama Hak Akses
                  </th>
                  {roles.map(role => (
                    <th key={role.id} className="px-2 py-3 text-center min-w-[70px]">
                      {getRoleHeaderCode(role.name)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {PERMISSION_GROUPS.map(group => {
                  const groupPerms = filteredGroupedPermissions[group.id] || [];
                  if (groupPerms.length === 0) return null;

                  const isExpanded = expandedGroups[group.id];

                  return (
                    <React.Fragment key={group.id}>
                      {/* Parent Group Header Row */}
                      <tr 
                        className="bg-[#fcfcfc] hover:bg-gray-50 cursor-pointer divide-x divide-gray-200 transition-colors"
                        onClick={() => toggleGroup(group.id)}
                      >
                        <td className="px-4 py-3 font-bold text-[#1f4e78] text-xs flex items-center gap-2 select-none">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                          )}
                          <span>{group.name}</span>
                        </td>
                        {roles.map(role => (
                          <td key={role.id} className="px-2 py-3 text-center"></td>
                        ))}
                      </tr>

                      {/* Expandable Sub-items */}
                      {isExpanded && (
                        <>
                          {/* "Semua [Group]" Check-All Row */}
                          <tr className="bg-gray-50/50 font-semibold text-[11px] text-gray-800 divide-x divide-gray-200">
                            <td className="px-6 py-2.5 italic pl-8">
                              Semua {group.name.charAt(0) + group.name.slice(1).toLowerCase()}
                            </td>
                            {roles.map(role => (
                              <td key={role.id} className="px-2 py-2.5 text-center">
                                <input
                                  type="checkbox"
                                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                                  checked={isGroupAllChecked(role.id, group.id, groupPerms)}
                                  onChange={() => handleToggleGroupAll(role.id, group.id, groupPerms)}
                                />
                              </td>
                            ))}
                          </tr>

                          {/* Sub-permissions Rows */}
                          {groupPerms.map(perm => {
                            const mapping = getPermissionMapping(perm.name);
                            return (
                              <tr 
                                key={perm.id} 
                                className="divide-x divide-gray-200 text-xs text-gray-600 hover:bg-gray-50/70 transition-colors"
                              >
                                <td className="px-6 py-2.5 pl-10 select-none">
                                  {mapping.label}
                                </td>
                                {roles.map(role => (
                                  <td key={role.id} className="px-2 py-2 text-center">
                                    <input
                                      type="checkbox"
                                      className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                                      checked={isChecked(role.id, perm.id)}
                                      onChange={() => handleTogglePermission(role.id, perm.id)}
                                    />
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
