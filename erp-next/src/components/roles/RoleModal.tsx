"use client";

import { useState, useEffect } from "react";
import { X, Save, AlertCircle, Search, Shield } from "lucide-react";
import LoadingState from "@/components/ui/LoadingState";
import api from "@/lib/api";
import { PERMISSION_GROUPS, getPermissionMapping } from "@/lib/permissionMapping";

type Permission = {
  id: number;
  name: string;
  guard_name: string;
};

type Role = {
  id?: number;
  name: string;
  permissions?: Permission[];
};

type RoleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roleToEdit?: Role | null;
  mode?: "role" | "group";
};

export default function RoleModal({
  isOpen,
  onClose,
  onSuccess,
  roleToEdit,
  mode = "role",
}: RoleModalProps) {
  const [name, setName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  // Data Sources
  const [availablePermissions, setAvailablePermissions] = useState<
    Permission[]
  >([]);
  const [groups, setGroups] = useState<any[]>([]);

  // UI States
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewFilter, setViewFilter] = useState<"all" | "selected" | "unselected">("all");

  // Fetch Permissions and Groups
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [permRes, groupRes] = await Promise.all([
          api.express.get("/permissions"),
          mode === "role" ? api.express.get("/roles/groups") : Promise.resolve({ data: { data: [] } })
        ]);
        setAvailablePermissions(permRes.data.data);
        setGroups(groupRes.data.data);
      } catch (err) {
        console.error("Failed to fetch modal data", err);
        setError("Gagal memuat data pendukung.");
      } finally {
        setLoadingData(false);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen, mode]);

  // Reset or Load Edit Data
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setViewFilter("all");
      if (roleToEdit) {
        setName(roleToEdit.name);
        setSelectedPermissions(roleToEdit.permissions?.map((p) => p.id) || []);
      } else {
        setName("");
        setSelectedPermissions([]);
      }
      setSearchTerm("");
    }
  }, [isOpen, roleToEdit]);

  const handlePermissionToggle = (permissionId: number) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId],
    );
  };

  const handleCopyFromGroup = (groupId: string) => {
    if (!groupId) return;
    const group = groups.find(g => g.id.toString() === groupId);
    if (group && group.permissions) {
      const groupPermIds = group.permissions.map((p: any) => p.id);
      setSelectedPermissions(groupPermIds);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const endpoint = mode === "role" ? "/roles" : "/roles/groups";
      const payload = {
        name,
        permissions: selectedPermissions,
      };

      if (roleToEdit) {
        await api.express.put(`${endpoint}/${roleToEdit.id}`, payload);
      } else {
        await api.express.post(endpoint, payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan data.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {roleToEdit ? `Edit ${mode === 'role' ? 'Role' : 'Group'}` : `Tambah ${mode === 'role' ? 'Role' : 'Group'} Baru`}
            </h2>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-0.5">
              {mode === 'role' ? 'User Access Definition' : 'Permission Baseline Template'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {loadingData ? (
            <LoadingState message="Memuat data..." />
          ) : (
            <form id="roleForm" onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-start gap-2">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Role Name */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Nama {mode === 'role' ? 'Role' : 'Group'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-gray-400"
                    placeholder={mode === 'role' ? "Contoh: Purchasing Admin" : "Contoh: Purchasing Baseline"}
                  />
                </div>

                {/* Copy From Template (Only for Role mode) */}
                {mode === "role" && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Samakan dengan Group (Template)
                    </label>
                    <select
                      onChange={(e) => handleCopyFromGroup(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-emerald-50/30 font-medium text-emerald-700"
                      defaultValue=""
                    >
                      <option value="">-- Salin dari Permission Group --</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Permissions Control Bar */}
              <div className="space-y-4">
                <div className="flex flex-col gap-4 border-t border-gray-100 pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                      Permissions
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full">
                        {selectedPermissions.length} selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPermissions([])}
                        className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-red-100"
                      >
                        Hapus Semua
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewFilter("all")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewFilter === 'all' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewFilter("selected")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewFilter === 'selected' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Terpilih
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewFilter("unselected")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewFilter === 'unselected' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Belum Terpilih
                      </button>
                    </div>

                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={14} className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Cari permission..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Permission Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-1 custom-scrollbar">
                  {Object.entries(
                    availablePermissions
                      .filter((perm) => {
                        const mapping = getPermissionMapping(perm.name);
                        const searchMatch =
                          perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          mapping.label.toLowerCase().includes(searchTerm.toLowerCase());
                        if (!searchMatch) return false;

                        if (viewFilter === "selected") return selectedPermissions.includes(perm.id);
                        if (viewFilter === "unselected") return !selectedPermissions.includes(perm.id);
                        return true;
                      })
                      .reduce(
                        (acc, perm) => {
                          const mapping = getPermissionMapping(perm.name);
                          const groupDef = PERMISSION_GROUPS.find(g => g.id === mapping.group);
                          const module = groupDef ? groupDef.name : mapping.group;

                          if (!acc[module]) acc[module] = [];
                          acc[module].push(perm);
                          return acc;
                        },
                        {} as Record<string, Permission[]>,
                      ),
                  ).map(([module, perms]) => (
                    <div
                      key={module}
                      className="col-span-1 sm:col-span-2 space-y-2 pt-2"
                    >
                      <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <h4 className="text-xs font-bold uppercase text-gray-600 tracking-wider">
                          {module} ({perms.length})
                        </h4>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const ids = perms.map((p) => p.id);
                              const allSelected = ids.every((id) =>
                                selectedPermissions.includes(id),
                              );
                              if (allSelected) {
                                setSelectedPermissions((prev) =>
                                  prev.filter((id) => !ids.includes(id)),
                                );
                              } else {
                                setSelectedPermissions((prev) => [
                                  ...new Set([...prev, ...ids]),
                                ]);
                              }
                            }}
                            className="text-[10px] text-emerald-600 font-bold hover:bg-emerald-50 px-2 py-0.5 rounded transition-colors"
                          >
                            Toggle Semua
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {perms.map((perm) => {
                          const mapping = getPermissionMapping(perm.name);
                          return (
                            <label
                              key={perm.id}
                              className={`
                                relative flex items-start p-2.5 rounded-xl border cursor-pointer transition-all duration-200
                                ${
                                  selectedPermissions.includes(perm.id)
                                    ? "bg-emerald-50 border-emerald-300 shadow-sm"
                                    : "bg-white border-gray-100 hover:border-gray-300"
                                }
                              `}
                            >
                              <div className="flex items-center h-5 mt-0.5">
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions.includes(perm.id)}
                                  onChange={() => handlePermissionToggle(perm.id)}
                                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 shadow-sm cursor-pointer"
                                />
                              </div>
                              <div className="ml-2.5 text-xs flex flex-col">
                                <span
                                  className={`font-semibold ${
                                    selectedPermissions.includes(perm.id)
                                      ? "text-emerald-900"
                                      : "text-gray-800"
                                  }`}
                                >
                                  {mapping.label}
                                </span>
                                <span className="text-[10px] font-mono text-gray-400">
                                  {perm.name}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  
                  {/* Empty States for Filters */}
                  {Object.keys(availablePermissions).length > 0 && 
                   availablePermissions.filter(perm => {
                      const searchMatch = perm.name.toLowerCase().includes(searchTerm.toLowerCase());
                      if (!searchMatch) return false;
                      if (viewFilter === "selected") return selectedPermissions.includes(perm.id);
                      if (viewFilter === "unselected") return !selectedPermissions.includes(perm.id);
                      return true;
                   }).length === 0 && (
                     <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                       <Shield size={32} className="mb-2 opacity-10" />
                       <p className="text-xs italic">
                         Tidak ada permission yang cocok dengan filter.
                       </p>
                     </div>
                   )}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-100/30 flex justify-end gap-3 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-colors"
            disabled={submitting}
          >
            Batal
          </button>
          <button
            type="submit"
            form="roleForm"
            disabled={submitting || loadingData}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-emerald-200 active:scale-95"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Simpan {mode === 'role' ? 'Role' : 'Group'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
