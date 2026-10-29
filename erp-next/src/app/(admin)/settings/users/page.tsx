"use client";

import { useState, useEffect } from "react";
import TablePagination from "@/components/ui/TablePagination";
import { useRouter } from "next/navigation";
import Image from "next/image";
import IconRenderer from "@/components/ui/IconRenderer";
import LoadingState from "@/components/ui/LoadingState";
import UserModal from "@/components/users/UserModal";
import DepartmentModal from "@/components/users/DepartmentModal";
import ProductGroupModal from "@/components/users/ProductGroupModal";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  Building2,
  Edit2,
  Trash2,
  Users2,
  Package,
  Archive,
  ShieldAlert,
  Coins,
  Truck,
  Tags,
  Briefcase
} from "lucide-react";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import api from "@/lib/api";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";

export default function UsersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"users" | "departments" | "jabatans" | "product_groups">("users");
  const [loading, setLoading] = useState(true);

  // Users State
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Departments State
  const [departments, setDepartments] = useState<any[]>([]);
  const [deptSearch, setDeptSearch] = useState("");

  // Jabatans State
  const [jabatans, setJabatans] = useState<any[]>([]);
  const [jabatanSearch, setJabatanSearch] = useState("");
  const [isJabatanModalOpen, setIsJabatanModalOpen] = useState(false);
  const [selectedJabatan, setSelectedJabatan] = useState<any | null>(null);
  const [jabName, setJabName] = useState("");
  const [jabCode, setJabCode] = useState("");

  // Modal States
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isProductGroupModalOpen, setIsProductGroupModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<any | null>(null);
  const [selectedProductGroup, setSelectedProductGroup] = useState<any | null>(null);
  const [productGroups, setProductGroups] = useState<any[]>([]);
  const [productGroupSearch, setProductGroupSearch] = useState("");

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

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = async (page = 1, query = "") => {
    setLoading(true);
    try {
      const res = await api.express.get("/users", { page, search: query });
      const data = res.data;
      setUsers(data.data);
      setPagination({
        current_page: data.current_page,
        last_page: data.last_page,
        total: data.total,
        from: data.from,
        to: data.to,
      });
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/departments");
      setDepartments(res.data.data || res.data);
    } catch (error) {
      console.error("Failed to fetch departments", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductGroups = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/users/groups");
      setProductGroups(res.data || []);
    } catch (error) {
      console.error("Failed to fetch product groups", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJabatans = () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem("erp_epu_jabatans");
      if (stored) {
        setJabatans(JSON.parse(stored));
      } else {
        const defaults = [
          { id: 1, code: "JAB-OP-INJ", name: "Operator Injection" },
          { id: 2, code: "JAB-LD-OP", name: "Lead Operator 220T" },
          { id: 3, code: "JAB-SR-TECH", name: "Senior Technician" },
          { id: 4, code: "JAB-QC-INSP", name: "QC Line Inspector" },
          { id: 5, code: "JAB-WH-SUP", name: "Warehouse Supervisor" },
          { id: 6, code: "JAB-HR-STF", name: "HRD & GA Staff" },
          { id: 7, code: "JAB-WK-AST", name: "Workshop Assistant" },
          { id: 8, code: "JAB-PROD-MGR", name: "Production Manager" }
        ];
        setJabatans(defaults);
        localStorage.setItem("erp_epu_jabatans", JSON.stringify(defaults));
      }
    } catch (err) {
      console.error("Failed to fetch jabatans", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers(1, debouncedSearch);
    } else if (activeTab === "departments") {
      fetchDepartments();
    } else if (activeTab === "jabatans") {
      fetchJabatans();
    } else {
      fetchProductGroups();
    }
  }, [activeTab, debouncedSearch]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (pagination?.last_page || 1)) {
      fetchUsers(newPage, debouncedSearch);
    }
  };

  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = (id: number) => {
    showConfirm(
      "Delete User?",
      "Are you sure you want to delete this user? This action cannot be undone.",
      () => performDeleteUser(id),
      "Delete Now",
      "Keep it",
    );
  };

  const performDeleteUser = async (id: number) => {
    setActionLoading(true);
    try {
      await api.express.delete(`/users/${id}`);
      showSuccess("Deleted!", "User has been removed successfully.");
      fetchUsers(pagination?.current_page || 1, debouncedSearch);
    } catch (error: any) {
      showError("Delete Failed", error.message || "Failed to delete.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDept = (id: number) => {
    showConfirm(
      "Delete Department?",
      "Are you sure you want to delete this department? Users in this department may lose their assignment.",
      () => performDeleteDept(id),
      "Delete Now",
      "Keep it",
    );
  };

  const performDeleteDept = async (id: number) => {
    setActionLoading(true);
    try {
      await api.express.delete(`/departments/${id}`);
      showSuccess("Deleted!", "Department has been removed successfully.");
      fetchDepartments();
    } catch (error: any) {
      showError("Delete Failed", error.message || "Failed to delete.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveJabatan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jabName || !jabCode) return;

    let updatedList;
    if (selectedJabatan) {
      // Edit
      updatedList = jabatans.map(j => {
        if (j.id === selectedJabatan.id) {
          return { ...j, name: jabName, code: jabCode.toUpperCase() };
        }
        return j;
      });
      showSuccess("Berhasil!", "Jabatan berhasil diubah.");
    } else {
      // Create
      const newJab = {
        id: jabatans.length + 1,
        code: jabCode.toUpperCase(),
        name: jabName
      };
      updatedList = [...jabatans, newJab];
      showSuccess("Berhasil!", "Jabatan baru berhasil ditambahkan.");
    }

    setJabatans(updatedList);
    localStorage.setItem("erp_epu_jabatans", JSON.stringify(updatedList));
    setIsJabatanModalOpen(false);
    setJabName("");
    setJabCode("");
    setSelectedJabatan(null);
  };

  const handleDeleteJabatan = (id: number) => {
    showConfirm(
      "Hapus Jabatan?",
      "Apakah Anda yakin ingin menghapus jabatan ini? Karyawan dengan jabatan ini mungkin perlu disesuaikan.",
      () => {
        const updated = jabatans.filter(j => j.id !== id);
        setJabatans(updated);
        localStorage.setItem("erp_epu_jabatans", JSON.stringify(updated));
        showSuccess("Terhapus!", "Jabatan telah dihapus.");
      },
      "Hapus Sekarang",
      "Batal"
    );
  };

  const handleDeleteProductGroup = (id: number) => {
    showConfirm(
      "Hapus Group Produk?",
      "Apakah Anda yakin ingin menghapus group template ini?",
      () => performDeleteProductGroup(id),
      "Hapus Sekarang",
      "Batal"
    );
  };

  const performDeleteProductGroup = async (id: number) => {
    setActionLoading(true);
    try {
      await api.express.delete(`/users/groups/${id}`);
      showSuccess("Terhapus!", "Group produk telah berhasil dihapus.");
      fetchProductGroups();
    } catch (error: any) {
      showError("Gagal Menghapus", error.message || "Terjadi kesalahan.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredDepts = departments.filter(
    (d) =>
      d.department_name?.toLowerCase().includes(deptSearch.toLowerCase()) ||
      d.department_code?.toLowerCase().includes(deptSearch.toLowerCase()),
  );

  const filteredJabatans = jabatans.filter(
    (j) =>
      j.name?.toLowerCase().includes(jabatanSearch.toLowerCase()) ||
      j.code?.toLowerCase().includes(jabatanSearch.toLowerCase()),
  );

  const filteredProductGroups = productGroups.filter((g) =>
    g.name.toLowerCase().includes(productGroupSearch.toLowerCase()),
  );

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      {/* Modals */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSuccess={() => {
          fetchUsers(pagination?.current_page || 1, debouncedSearch);
          showSuccess("Success!", "User saved successfully.");
        }}
        userToEdit={selectedUser}
      />
      <DepartmentModal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        onSuccess={() => {
          fetchDepartments();
          showSuccess("Success!", "Department saved successfully.");
        }}
        departmentToEdit={selectedDept}
      />
      <ProductGroupModal
        isOpen={isProductGroupModalOpen}
        onClose={() => setIsProductGroupModalOpen(false)}
        onSuccess={() => {
          fetchProductGroups();
          showSuccess("Success!", "Group produk template berhasil disimpan.");
        }}
        groupToEdit={selectedProductGroup}
      />

      {/* Jabatan Modal */}
      {isJabatanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md border border-gray-100 shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-lg font-black text-gray-900">
                {selectedJabatan ? "Edit Jabatan" : "Tambah Jabatan Baru"}
              </h3>
              <button
                onClick={() => {
                  setIsJabatanModalOpen(false);
                  setSelectedJabatan(null);
                  setJabName("");
                  setJabCode("");
                }}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                [X]
              </button>
            </div>

            <form onSubmit={handleSaveJabatan} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Kode Jabatan</label>
                <input
                  type="text"
                  placeholder="Contoh: JAB-OP-INJ"
                  value={jabCode}
                  onChange={(e) => setJabCode(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nama Jabatan</label>
                <input
                  type="text"
                  placeholder="Contoh: Operator Injection"
                  value={jabName}
                  onChange={(e) => setJabName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsJabatanModalOpen(false);
                    setSelectedJabatan(null);
                    setJabName("");
                    setJabCode("");
                  }}
                  className="px-5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-100"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              <Users2 className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              User <span className="text-emerald-600">Management</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Kelola pengguna, departemen, jabatan, dan struktur organisasi perusahaan Anda.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Tabs */}
          <div className="flex bg-gray-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === "users"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Users size={16} />
              <span>Users</span>
            </button>
            <button
              onClick={() => setActiveTab("departments")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === "departments"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Building2 size={16} />
              <span>Depts</span>
            </button>
            <button
              onClick={() => setActiveTab("jabatans")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === "jabatans"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Briefcase size={16} />
              <span>Jabatan</span>
            </button>
            <button
              onClick={() => setActiveTab("product_groups")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === "product_groups"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Users size={16} />
              <span>Groups</span>
            </button>
          </div>

          <button
            onClick={() => {
              if (activeTab === "users") {
                setSelectedUser(null);
                setIsUserModalOpen(true);
              } else if (activeTab === "departments") {
                setSelectedDept(null);
                setIsDeptModalOpen(true);
              } else if (activeTab === "jabatans") {
                setSelectedJabatan(null);
                setJabName("");
                setJabCode("");
                setIsJabatanModalOpen(true);
              } else {
                setSelectedProductGroup(null);
                setIsProductGroupModalOpen(true);
              }
            }}
            className="group relative flex items-center gap-3 bg-gray-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 overflow-hidden"
          >
            <Plus size={20} strokeWidth={3} />
            <span>
              Tambah{" "}
              {activeTab === "users"
                ? "User"
                : activeTab === "departments"
                  ? "Dept"
                  : activeTab === "jabatans"
                    ? "Jabatan"
                    : "Group"}
            </span>
          </button>
        </div>
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<Users2 size={20} />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" label="TOTAL USERS" value={pagination?.total || users.length} />
        <StatCard icon={<Archive size={20} />} iconBgColor="bg-blue-50" iconColor="text-blue-600" label="DEPARTMENTS" value={departments.length} />
        <StatCard icon={<Briefcase size={20} />} iconBgColor="bg-purple-50" iconColor="text-purple-600" label="JABATAN" value={jabatans.length} />
        <StatCard icon={<ShieldAlert size={20} />} iconBgColor="bg-orange-50" iconColor="text-orange-600" label="GROUPS" value={productGroups.length} />
      </div>

      <div className="mb-8">
        <FilterBar 
          searchPlaceholder={
            activeTab === "users"
              ? "Cari user..."
              : activeTab === "departments"
                ? "Cari department..."
                : activeTab === "jabatans"
                  ? "Cari jabatan..."
                  : "Cari group produk..."
          }
          searchValue={
            activeTab === "users"
              ? search
              : activeTab === "departments"
                ? deptSearch
                : activeTab === "jabatans"
                  ? jabatanSearch
                  : productGroupSearch
          }
          onSearchChange={(val) => {
            if (activeTab === "users") setSearch(val);
            else if (activeTab === "departments") setDeptSearch(val);
            else if (activeTab === "jabatans") setJabatanSearch(val);
            else setProductGroupSearch(val);
          }} 
        />
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">

        <div className="overflow-x-auto">
          {activeTab === "users" ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
              <tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest tracking-wider">
                    User Profile
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest tracking-wider">
                    Categories
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest tracking-wider">
                    Assigned Products
                  </th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 flex-1">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-10 w-10 bg-gray-200 rounded-full inline-block mr-3 align-middle"></div>
                        <div className="h-4 w-32 bg-gray-200 rounded inline-block align-middle"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-gray-200 rounded"></div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="h-6 w-16 bg-gray-200 rounded-full mx-auto"></div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="h-4 w-4 bg-gray-200 rounded mx-auto"></div>
                      </td>
                    </tr>
                  ))
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50/80 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 relative">
                            {getAvatarUrl(user) ? (
                              <Image
                                src={getAvatarUrl(user)}
                                alt={user.name}
                                fill
                                className="rounded-full object-cover border border-gray-100"
                                sizes="40px"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                                {user.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {user.department?.department_name || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="flex flex-wrap gap-1">
                          {user.categories?.length > 0 ? (
                            user.categories.map((cat: any) => (
                              <span
                                key={cat.id}
                                className="px-2 py-0.5 inline-flex text-xs leading-5 font-medium rounded-md bg-gray-100 text-gray-800 border border-gray-200"
                              >
                                {cat.category_name}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 italic">
                              No Categories
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {user.roles?.map((role: any) => (
                            <span
                              key={role.id}
                              className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-md bg-blue-50 text-blue-700"
                            >
                              {role.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="flex flex-wrap gap-1">
                          {user.products?.length > 0 ? (
                            user.products.map((prod: any) => (
                              <span
                                key={prod.id}
                                className="px-2 py-0.5 inline-flex text-xs leading-5 font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100"
                                title={prod.product_code}
                              >
                                {prod.product_name}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 italic">
                              No Products
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                        >
                          {user.is_active === 1 ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center gap-2 transition-opacity">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-1.5 text-emerald-500 hover:text-emerald-600 rounded-lg transition-colors"
                            title="Edit User"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-1.5 text-red-500 hover:text-red-600 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      Data tidak ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : activeTab === "departments" ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
              <tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest tracking-wider">
                    Department Name
                  </th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 flex-1">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-gray-200 rounded"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-full max-w-[200px] bg-gray-200 rounded"></div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="h-4 w-12 bg-gray-200 rounded mx-auto"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredDepts.length > 0 ? (
                  filteredDepts.map((dept) => (
                    <tr
                      key={dept.id}
                      className="hover:bg-gray-50/80 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {dept.department_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 italic font-medium">
                        {dept.department_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center gap-2 transition-opacity">
                          <button
                            onClick={() => {
                              setSelectedDept(dept);
                              setIsDeptModalOpen(true);
                            }}
                            className="p-1.5 text-emerald-500 hover:text-emerald-600 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteDept(dept.id)}
                            className="p-1.5 text-red-500 hover:text-red-600 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      Data departemen tidak ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : activeTab === "jabatans" ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
              <tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Kode Jabatan
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Nama Jabatan
                  </th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 flex-1">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-gray-200 rounded"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-full max-w-[200px] bg-gray-200 rounded"></div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="h-4 w-12 bg-gray-200 rounded mx-auto"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredJabatans.length > 0 ? (
                  filteredJabatans.map((jab) => (
                    <tr
                      key={jab.id}
                      className="hover:bg-gray-50/80 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {jab.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 italic font-medium">
                        {jab.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedJabatan(jab);
                              setJabName(jab.name);
                              setJabCode(jab.code);
                              setIsJabatanModalOpen(true);
                            }}
                            className="p-1.5 text-emerald-500 hover:text-emerald-600 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteJabatan(jab.id)}
                            className="p-1.5 text-red-500 hover:text-red-600 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      Data jabatan tidak ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
              <tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest tracking-wider">
                    Group Name
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest tracking-wider">
                    Assigned Categories
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest tracking-wider">
                    Assigned Products
                  </th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 flex-1">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 w-32 bg-gray-200 rounded"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="h-4 w-12 bg-gray-200 rounded mx-auto"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredProductGroups.length > 0 ? (
                  filteredProductGroups.map((group) => (
                    <tr
                      key={group.id}
                      className="hover:bg-gray-50/80 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {group.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {group.categories?.length || 0} Categories
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {group.products?.length || 0} Products
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center gap-2 transition-opacity">
                          <button
                            onClick={() => {
                              setSelectedProductGroup(group);
                              setIsProductGroupModalOpen(true);
                            }}
                            className="p-1.5 text-emerald-500 hover:text-emerald-600 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteProductGroup(group.id)}
                            className="p-1.5 text-red-500 hover:text-red-600 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      Data group produk tidak ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {activeTab === "users" && pagination ? (
          <TablePagination
            page={pagination.current_page}
            totalPages={pagination.last_page}
            totalItems={pagination.total}
            onPageChange={handlePageChange}
          />
        ) : activeTab === "departments" ? (
          <TablePagination totalItems={filteredDepts.length} />
        ) : activeTab === "jabatans" ? (
          <TablePagination totalItems={filteredJabatans.length} />
        ) : (
          <TablePagination totalItems={filteredProductGroups.length} />
        )}
      </div>
    </div>
  );
}

function getAvatarUrl(user: any) {
  if (user.media && user.media.length > 0) {
    const avatar =
      user.media.find((m: any) => m.collection_name === "avatars") ||
      user.media[0];
    if (avatar.original_url) return avatar.original_url;
    return null;
  }
  return null;
}
