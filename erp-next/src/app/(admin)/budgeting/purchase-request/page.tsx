"use client";

import { useState, useEffect } from "react";
import TablePagination from "@/components/ui/TablePagination";
import {
  Search,
  Plus,
  Filter,
  Edit2,
  Trash2,
  ShoppingCart,
  CreditCard,
  Clock,
  CircleCheckBig,
  CircleX,
  ShoppingBag
} from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";
import PurchaseModal from "@/components/budget/PurchaseModal";
import PurchaseDetailModal from "@/components/budget/PurchaseDetailModal";
import usePermission from "@/hooks/usePermission";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import api from "@/lib/api";
import PRSortFilterModal from "@/components/budget/PRSortFilterModal";
import PrintButton from "@/components/ui/PrintButton";

export default function PurchaseRequestPage() {
  const { can, user } = usePermission();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [canViewAllDepartments, setCanViewAllDepartments] = useState(false);
  const [userDepartmentId, setUserDepartmentId] = useState<number | null>(null);
  const [isPermissionInitialized, setIsPermissionInitialized] = useState(false);
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    order: "asc" | "desc";
  }>({
    key: "id",
    order: "desc",
  });

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

  // Initialize permission states from user data
  useEffect(() => {
    if (user) {
      const isSuperAdmin = user.role_names?.includes("Super Admin");
      const hasAllDeptPermission =
        user.permissions?.includes("all_departments");
      const hasAccess = isSuperAdmin || hasAllDeptPermission;

      setCanViewAllDepartments(hasAccess);
      setUserDepartmentId(user.department_id || null);

      if (!hasAccess && user.department_id) {
        setDeptFilter(user.department_id.toString());
      }
      setIsPermissionInitialized(true);
    }
  }, [user]);

  const fetchDepartments = async () => {
    try {
      const res = await api.get("/budgeting/form-data");
      setDepartments(res.data.departments || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await api.get("/purchases", {
        status: statusFilter,
        department_id: deptFilter,
        month: monthFilter,
        year: yearFilter,
      });
      setPurchases(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseDetail = async (id: number) => {
    setIsDetailLoading(true);
    try {
      const response = await api.express.get(`/purchases/${id}`);
      setSelectedPurchase(response.data.data);
      setIsDetailModalOpen(true);
    } catch (error) {
      console.error("Error fetching purchase detail:", error);
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    if (isPermissionInitialized) {
      fetchPurchases();
    }
    fetchDepartments();
  }, [
    statusFilter,
    deptFilter,
    monthFilter,
    yearFilter,
    isPermissionInitialized,
  ]);

  const handleDelete = (id: number) => {
    showConfirm(
      "Delete Request?",
      "Are you sure you want to delete this purchase request? This action cannot be revoked.",
      () => performDelete(id),
      "Delete Now",
      "Keep it",
    );
  };

  const performDelete = async (id: number) => {
    setActionLoading(true);
    try {
      await api.delete(`/purchases/${id}`);
      showSuccess("Deleted!", "Purchase request has been deleted.");
      fetchPurchases();
    } catch (e: any) {
      showError("Delete Failed", e.message || "Failed to delete.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    const matchesSearch =
      p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.department_id === 0 || p.department_id === "0"
        ? "direksi"
        : p.department?.department_name?.toLowerCase() || ""
      ).includes(searchTerm.toLowerCase()) ||
      p.user?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      p.status?.toLowerCase().trim() === statusFilter.toLowerCase();

    const matchesDept =
      deptFilter === "all" || String(p.department_id) === String(deptFilter);

    return matchesSearch && matchesStatus && matchesDept;
  });

  // Apply Client-Side Sorting
  const sortedPurchases = [...filteredPurchases].sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];

    // Special handling for nested values or types
    if (sortConfig.key === "date") {
      const timeA = new Date(aVal).getTime() || 0;
      const timeB = new Date(bVal).getTime() || 0;
      return sortConfig.order === "asc" ? timeA - timeB : timeB - timeA;
    }

    if (sortConfig.key === "total_amount" || sortConfig.key === "id") {
      const numA = parseFloat(aVal) || 0;
      const numB = parseFloat(bVal) || 0;
      return sortConfig.order === "asc" ? numA - numB : numB - numA;
    }

    // Default string sorting
    aVal = String(aVal || "").toLowerCase();
    bVal = String(bVal || "").toLowerCase();

    if (sortConfig.order === "asc") {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const activeFilterCount = [
    statusFilter !== "all",
    deptFilter !== "all" &&
      (canViewAllDepartments ? true : deptFilter !== String(userDepartmentId)),
    monthFilter !== "all",
    yearFilter !== "all",
    sortConfig.key !== "date" || sortConfig.order !== "desc",
  ].filter(Boolean).length;

  const getStatusStyle = (status: string) => {
    const s = status?.toLowerCase();
    switch (s) {
      case "approved":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "pending":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "rejected":
      case "reject":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getPaymentStatusStyle = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-emerald-50 text-emerald-600";
      case "Unpaid":
        return "bg-red-50 text-red-600";
      case "Partial":
        return "bg-blue-50 text-blue-600";
      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case "Paid":
        return "Actual Budget";
      case "Unpaid":
        return "Not Actual Budget";
      case "Partial":
        return "Partial Actual Budget";
      default:
        return status;
    }
  };

  const getApprovalStatusText = (p: any) => {
    if (!p.approval_request) return "Menunggu Approval";
    const logs = p.approval_request.logs || [];
    const activeLog = logs.find((l: any) => l.action === "assigned");
    if (activeLog && activeLog.user) {
      return `Menunggu approval dari: ${activeLog.user.name} (Level ${activeLog.level})`;
    }
    return "Menunggu Approval";
  };

  const getApprovalComment = (p: any) => {
    const request = p.approval_request || p.approvalRequest;
    if (!request) return null;
    const logs = request.logs || [];
    const actionLogs = logs.filter(
      (l: any) => l.action === "approved" || l.action === "rejected",
    );
    if (actionLogs.length === 0) return null;
    actionLogs.sort((a: any, b: any) => b.id - a.id);
    const lastAction = actionLogs[0];
    if (lastAction.comment) {
      return { action: lastAction.action, comment: lastAction.comment };
    }
    return null;
  };

  return (
    <div className="py-2 space-y-4 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-200">
              <ShoppingBag className="text-white" size={18} />
            </div>
            <h1 className="text-xl font-black tracking-tight text-gray-900">
              Purchase <span className="text-emerald-600">Request</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium text-xs ml-1">
            Kelola permintaan pembelian barang dan jasa antar departemen perusahaan.
          </p>
        </div>

        {can("create_purchases") && (
          <button
            onClick={() => {
              setSelectedPurchase(null);
              setIsModalOpen(true);
            }}
            className="group relative flex items-center gap-2 bg-gray-900 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-xs transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 overflow-hidden"
          >
            <Plus size={15} strokeWidth={3} />
            <span>Buat Request Baru</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg w-fit mb-2">
            <CreditCard size={16} />
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase">
            Total PR Amount
          </p>
          <p className="text-base font-black text-gray-800">
            Rp{" "}
            {sortedPurchases
              .reduce((acc, p) => acc + parseFloat(p.total_amount), 0)
              .toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
          <div className="p-2 bg-orange-50 text-orange-600 rounded-lg w-fit mb-2">
            <Clock size={16} />
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase">
            Pending Review
          </p>
          <p className="text-base font-black text-gray-800">
            {
              sortedPurchases.filter((p) => {
                const s = p.status?.toLowerCase().trim();
                return s === "pending" || s === "menunggu" || s === "draft";
              }).length
            }{" "}
            Request
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
          <div className="p-2 bg-green-50 text-green-600 rounded-lg w-fit mb-2">
            <CircleCheckBig size={16} />
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase">
            Approved Review
          </p>
          <p className="text-base font-black text-gray-800">
            {
              sortedPurchases.filter((p) => {
                const s = p.status?.toLowerCase().trim();
                return s === "approved" || s === "disetujui";
              }).length
            }{" "}
            Request
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg w-fit mb-2">
            <ShoppingCart size={16} />
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase">
            Total Asset
          </p>
          <p className="text-base font-black text-gray-800">
            Rp{" "}
            {filteredPurchases
              .reduce((acc, p) => {
                const assetSum =
                  p.purchase_details?.reduce(
                    (sum: number, d: any) =>
                      sum + (!!d.is_asset ? parseFloat(d.sub_total) : 0),
                    0,
                  ) || 0;
                return acc + assetSum;
              }, 0)
              .toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
          <div className="p-2 bg-red-50 text-red-600 rounded-lg w-fit mb-2">
            <CircleX size={16} />
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase">
            Rejected Review
          </p>
          <p className="text-base font-black text-gray-800">
            {
              sortedPurchases.filter((p) => {
                const s = p.status?.toLowerCase().trim();
                return s === "rejected" || s === "ditolak" || s === "reject";
              }).length
            }{" "}
            Request
          </p>
        </div>
      </div>

      <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-2">
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500"
            size={14}
          />
          <input
            type="text"
            placeholder="Cari PR berdasarkan nomor referensi, departemen, atau pemohon..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border-none bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-bold transition-all placeholder:text-gray-400 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="relative flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg font-bold hover:bg-emerald-100 transition-all active:scale-95 text-xs uppercase tracking-widest border border-emerald-100 whitespace-nowrap group"
        >
          <Filter
            size={13}
            className="group-hover:rotate-12 transition-transform"
          />
          <span>Sort &amp; Filter</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-in zoom-in duration-300">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden min-h-[300px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 text-left">
                <th className="px-3 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Ref Number
                </th>
                <th className="px-3 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Requester
                </th>
                <th className="px-3 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Supplier / Vendor
                </th>
                <th className="px-3 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Dept
                </th>
                <th className="px-3 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Estimation Nominal
                </th>
                <th className="px-3 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-3 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Keterangan / Note
                </th>
                <th className="px-3 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-3 bg-gray-100 rounded-lg w-full"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : sortedPurchases.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-gray-400 font-bold italic border-b border-gray-50"
                  >
                    Belum ada Purchase Request yang sesuai filter.
                  </td>
                </tr>
              ) : (
                sortedPurchases.map((purchase) => (
                  <tr
                    key={purchase.id}
                    onClick={() => fetchPurchaseDetail(purchase.id)}
                    className="hover:bg-emerald-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-xs">
                          {purchase.reference}
                        </span>
                        {parseFloat(purchase.master_budget_remaining || "0") <
                          0 && (
                          <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200 font-bold w-fit mt-0.5 mb-0.5">
                            OVER BUDGET
                          </span>
                        )}
                        <span className="text-[9px] text-gray-400 font-bold">
                          {new Date(purchase.date).toLocaleDateString("id-ID")}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-[9px] font-bold">
                          {purchase.user?.name ? purchase.user.name.charAt(0) : "S"}
                        </div>
                        <span className="font-medium text-gray-700 text-xs">
                          {purchase.user?.name || "System"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="font-bold text-emerald-700 text-[10px] bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-100">
                        {purchase.supplier_name || purchase.supplier?.supplier_name || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-500 font-medium">
                      {purchase.department_id === 0 ||
                      purchase.department_id === "0"
                        ? "Direksi"
                        : purchase.department?.department_name}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="font-bold text-gray-900 text-xs">
                        Rp{" "}
                        {parseFloat(
                          purchase.total_amount || 0,
                        ).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`w-fit px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusStyle(purchase.status)} uppercase tracking-wide`}
                        >
                          {purchase.status}
                        </span>
                        {purchase.status.toLowerCase() === "pending" && (
                          <span className="text-[9px] text-gray-500 italic">
                            {getApprovalStatusText(purchase)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-0.5 max-w-[180px]">
                        {purchase.note ? (
                          <span className="text-[10px] text-gray-600 line-clamp-2">
                            {purchase.note}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">
                            -
                          </span>
                        )}
                        {(() => {
                          const c = getApprovalComment(purchase);
                          if (!c) return null;
                          return (
                            <div
                              className={`mt-0.5 p-1.5 rounded text-[9px] ${c.action === "rejected" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}
                            >
                              <strong>Catatan:</strong>{" "}
                              <span className="italic">{c.comment}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right">
                      <div className="flex justify-end items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <PrintButton
                          moduleKey="purchase_request"
                          moduleName="Permintaan Pembelian"
                          data={{
                            ...purchase,
                            ref_number: purchase.ref_number || purchase.reference || `#PR-${purchase.id}`,
                            requester_name: purchase.user?.name || purchase.requester || "User",
                            department_name: purchase.department?.department_name || (purchase.department_id === 0 ? "Direksi" : "-"),
                            supplier_name: purchase.supplier_name || purchase.supplier?.supplier_name || "-",
                            items: purchase.details || purchase.items || [],
                          }}
                        />
                        {can("edit_purchases") &&
                          purchase.status?.toLowerCase() === "pending" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPurchase(purchase);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                        {can("delete_purchases") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(purchase.id);
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PurchaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchPurchases();
          showSuccess("Success!", selectedPurchase ? "Updated." : "Created.");
        }}
        purchaseToEdit={selectedPurchase}
        canViewAllDepartments={canViewAllDepartments}
        userDepartmentId={userDepartmentId}
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
      <PurchaseDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        purchase={selectedPurchase}
        isLoading={isDetailLoading}
      />

      <PRSortFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        sortConfig={sortConfig}
        onSortChange={setSortConfig}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        deptFilter={deptFilter}
        setDeptFilter={setDeptFilter}
        monthFilter={monthFilter}
        setMonthFilter={setMonthFilter}
        yearFilter={yearFilter}
        setYearFilter={setYearFilter}
        departments={departments}
        canViewAllDepartments={canViewAllDepartments}
      />
    </div>
  );
}
