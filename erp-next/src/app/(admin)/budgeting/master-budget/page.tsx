"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Filter,
  Edit2,
  Trash2,
  FileText,
  Calendar,
  Wallet,
  TrendingUp,
  ReceiptText,
  AlertTriangle,
  RefreshCw,
  Power,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import SearchableSelect from "@/components/ui/SearchableSelect";
import MasterBudgetModal from "@/components/budget/MasterBudgetModal";
import MasterBudgetDetailModal from "@/components/budget/MasterBudgetDetailModal";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import api from "@/lib/api";
import MasterBudgetSortFilterModal from "@/components/budget/MasterBudgetSortFilterModal";

export default function MasterBudgetPage() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<any | null>(null);
  const [selectedDetailBudget, setSelectedDetailBudget] = useState<any | null>(
    null,
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [departments, setDepartments] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartDepts, setChartDepts] = useState<string[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    order: "asc" | "desc";
  }>({
    key: "id",
    order: "desc",
  });
  const [yearFilter, setYearFilter] = useState<string>(
    new Date().getFullYear().toString(),
  );

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

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i);

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await api.get("/budgeting/master-budget-summary", {
        year: selectedYear,
      });
      setChartData(res.data.chartData);
      setChartDepts(res.data.departments);
    } catch (e) {
      console.error(e);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get("/budgeting/form-data");
      setDepartments(res.data.departments || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const res = await api.get("/master-budgets", {
        status: statusFilter,
        year: yearFilter,
        month: monthFilter,
        department_id: deptFilter,
      });
      setBudgets(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncTarget = (id: number, type: "percentage" | "nominal") => {
    const title =
      type === "percentage"
        ? "Update Nominal (Ikuti %)"
        : "Update % (Ikuti Nominal)";
    const msg =
      type === "percentage"
        ? "Nominal budget akan dihitung ulang berdasarkan persentase yang tersimpan dan Target Sales saat ini. Jika budget sudah 'Approved', status akan kembali ke 'Pending'."
        : "Persentase budget akan dihitung ulang berdasarkan nominal saat ini dan Target Sales yang baru. Nominal budget Anda tidak akan berubah.";

    showConfirm(
      title,
      msg,
      async () => {
        setActionLoading(true);
        try {
          await api.post(`/master-budgets/${id}/sync-target`, { type });
          showSuccess("Success!", "Sync completed successfully.");
          fetchBudgets();
        } catch (e: any) {
          showError("Sync Failed", e.response?.data?.message || "Failed to sync.");
        } finally {
          setActionLoading(false);
        }
      },
      "Sync Sekarang",
    );
  };

  useEffect(() => {
    fetchBudgets();
    fetchDepartments();
    fetchSummary();
  }, [statusFilter, yearFilter, monthFilter, deptFilter, selectedYear]);

  const handleDelete = (id: number) => {
    showConfirm(
      "Delete Budget?",
      "Are you sure you want to delete this budget? This action cannot be undone.",
      () => performDelete(id),
      "Delete Now",
      "Keep it",
    );
  };

  const performDelete = async (id: number) => {
    setActionLoading(true);
    try {
      await api.delete(`/master-budgets/${id}`);
      showSuccess("Deleted!", "Budget has been deleted.");
      fetchBudgets();
    } catch (e) {
      showError("Delete Failed", "Failed to delete budget.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = (budget: any) => {
    const isCurrentlyActive = budget.is_active !== 0 && budget.is_active !== false;
    const nextState = !isCurrentlyActive;
    const actionText = nextState ? "Aktifkan" : "Nonaktifkan";

    showConfirm(
      `${actionText} Master Budget?`,
      `Apakah Anda yakin ingin ${actionText.toLowerCase()} master budget "${budget.no_budgeting}"? ${
        !nextState
          ? "Master budget yang dinonaktifkan tidak akan dapat digunakan untuk transaksi ataupun alokasi peminjaman budget."
          : "Master budget yang diaktifkan akan dapat kembali digunakan untuk transaksi dan peminjaman budget."
      }`,
      async () => {
        setActionLoading(true);
        try {
          const res = await api.patch(`/master-budgets/${budget.id}/toggle-active`, {
            is_active: nextState ? 1 : 0,
          });
          showSuccess(
            "Berhasil!",
            res.data?.message || `Master budget berhasil di${nextState ? "aktifkan" : "nonaktifkan"}.`
          );
          // Update local state directly for instant feedback
          setBudgets((prev) =>
            prev.map((b) => (b.id === budget.id ? { ...b, is_active: nextState ? 1 : 0 } : b))
          );
        } catch (e: any) {
          showError(
            "Gagal Mengubah Status",
            e.response?.data?.message || "Terjadi kesalahan saat mengubah status keaktifan."
          );
        } finally {
          setActionLoading(false);
        }
      },
      actionText,
      "Batal"
    );
  };

  const filteredBudgets = budgets.filter((b) => {
    const matchesSearch =
      b.no_budgeting?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.department_id === 0 || b.department_id === "0"
        ? "direksi"
        : (
            b.department?.department_name ||
            b.department_name ||
            ""
          ).toLowerCase()
      ).includes(searchTerm.toLowerCase());

    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "mandatory" &&
        (b.is_mandatory === 1 || b.is_mandatory === true)) ||
      (typeFilter === "others" &&
        (b.is_mandatory === 0 ||
          b.is_mandatory === false ||
          b.is_mandatory === null));

    const matchesActive =
      activeFilter === "all" ||
      (activeFilter === "active" &&
        (b.is_active === 1 || b.is_active === true || b.is_active === undefined || b.is_active === null)) ||
      (activeFilter === "inactive" &&
        (b.is_active === 0 || b.is_active === false));

    return matchesSearch && matchesType && matchesActive;
  });

  // Apply Client-Side Sorting
  const sortedBudgets = [...filteredBudgets].sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];

    // Special handling for numeric IDs and Grandtotal
    if (sortConfig.key === "id" || sortConfig.key === "grandtotal") {
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
    activeFilter !== "all",
    deptFilter !== "all",
    monthFilter !== "all",
    yearFilter !== "all",
    typeFilter !== "all",
    sortConfig.key !== "id" || sortConfig.order !== "desc",
  ].filter(Boolean).length;

  const getStatusStyle = (status: string) => {
    const s = status?.toLowerCase();
    switch (s) {
      case "approved":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "pending":
        return "bg-amber-50 text-amber-600 border-amber-100";
      case "rejected":
      case "reject":
        return "bg-rose-50 text-rose-600 border-rose-100";
      default:
        return "bg-slate-50 text-slate-500 border-slate-100";
    }
  };

  const getApprovalStatusText = (b: any) => {
    const request = b.approval_request || b.approvalRequest;
    if (!request) return "";
    const logs = request.logs || [];
    const activeLogs = logs.filter((l: any) => l.action === "assigned");
    if (activeLogs.length > 0) {
      const names = activeLogs
        .map((l: any) => l.user?.name || "Unknown")
        .join(", ");
      return `Menunggu approval dari: ${names} (Level ${activeLogs[0].level})`;
    }
    return "";
  };

  const getApprovalComment = (b: any) => {
    const request = b.approval_request || b.approvalRequest;
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
  const formatLongDate = (dateString: any) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getBudgetPeriod = (budget: any) => {
    // If periode_awal is a string and not "0000-00-00", use it
    if (
      budget.periode_awal &&
      budget.periode_awal !== "0000-00-00" &&
      budget.periode_awal !== "Invalid Date"
    ) {
      return `${formatLongDate(budget.periode_awal)} - ${formatLongDate(budget.periode_akhir)}`;
    }

    // Fallback logic if explicit periods are missing or invalid
    try {
      const year = budget.tgl_penyusunan
        ? new Date(budget.tgl_penyusunan).getFullYear()
        : new Date().getFullYear(); // Extreme fallback
      const monthIdx = parseInt(budget.bulan) - 1;
      if (!isNaN(monthIdx)) {
        const start = new Date(year, monthIdx, 1);
        const end = new Date(year, monthIdx + 1, 0);
        return `${formatLongDate(start)} - ${formatLongDate(end)}`;
      }
    } catch (e) {}

    return "Invalid Period";
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <ReceiptText className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Master <span className="text-emerald-600">Budgeting</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Kelola dan pantau anggaran periodik untuk setiap departemen di perusahaan Anda.
          </p>
        </div>
        
        <button
          onClick={() => {
            setSelectedBudget(null);
            setIsModalOpen(true);
          }}
          className="group relative flex items-center gap-3 bg-gray-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 overflow-hidden"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Buat Budget Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">
              Total Approved
            </p>
            <p className="text-xl font-black text-gray-800">
              Rp{" "}
              {sortedBudgets
                .filter((b) => {
                  const s = b.status?.toLowerCase().trim();
                  return (
                    s === "approved" || s === "setuju" || s === "disetujui"
                  );
                })
                .reduce((acc, b) => acc + (parseFloat(b.grandtotal) || 0), 0)
                .toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">
              Pending Review
            </p>
            <p className="text-xl font-black text-gray-800">
              {
                sortedBudgets.filter((b) => {
                  const s = b.status?.toLowerCase().trim();
                  return s === "pending" || s === "menunggu" || s === "draft";
                }).length
              }{" "}
              Budgets
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">
              Approved Review
            </p>
            <p className="text-xl font-black text-gray-800">
              {
                sortedBudgets.filter((b) => {
                  const s = b.status?.toLowerCase().trim();
                  return (
                    s === "approved" || s === "disetujui" || s === "setuju"
                  );
                }).length
              }{" "}
              Budgets
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">
              Rejected Review
            </p>
            <p className="text-xl font-black text-gray-800">
              {
                sortedBudgets.filter((b) => {
                  const s = b.status?.toLowerCase().trim();
                  return s === "rejected" || s === "ditolak" || s === "reject";
                }).length
              }{" "}
              Budgets
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-800 tracking-tight">
                Budget History
              </h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Monthly overview per department
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
            <Calendar size={16} className="text-gray-400 ml-2" />
            <div className="w-32">
              <SearchableSelect
                label=""
                placeholder="Select Year"
                value={selectedYear}
                onChange={(val) => setSelectedYear(parseInt(val.toString()))}
                options={yearOptions.map((y) => ({
                  value: y,
                  label: `${y}`,
                }))}
              />
            </div>
          </div>
        </div>

        <div className="h-[350px] w-full">
          {summaryLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                  Loading Analytics...
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f0f0f0"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 600 }}
                  tickFormatter={(value) => `Rp ${value / 1000000}Jt`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "20px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    padding: "12px",
                  }}
                  formatter={(value: any) => [
                    `Rp ${parseFloat(value).toLocaleString()}`,
                  ]}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ paddingTop: "20px" }}
                />
                {chartDepts.map((dept, idx) => {
                  const colors = [
                    "#10b981",
                    "#3b82f6",
                    "#f59e0b",
                    "#ef4444",
                    "#8b5cf6",
                    "#ec4899",
                    "#06b6d4",
                    "#f97316",
                  ];
                  return (
                    <Line
                      key={dept}
                      type="monotone"
                      dataKey={dept}
                      stroke={colors[idx % colors.length]}
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill: colors[idx % colors.length],
                        strokeWidth: 2,
                        stroke: "#fff",
                      }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      animationDuration={1500}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search
            className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500"
            size={18}
          />
          <input
            type="text"
            placeholder="Cari Master Budget berdasarkan nomor atau departemen..."
            className="w-full pl-14 pr-6 py-4 rounded-2xl border-none bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-bold transition-all placeholder:text-gray-400 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="relative flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 px-8 py-4 rounded-2xl font-bold hover:bg-emerald-100 transition-all active:scale-95 text-xs uppercase tracking-widest border border-emerald-100 whitespace-nowrap group"
        >
          <Filter
            size={16}
            className="group-hover:rotate-12 transition-transform"
          />
          <span>Sort & Filter</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-emerald-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-in zoom-in duration-300">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 text-left">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Number
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Periode
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                  Approved Total
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                  Used
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                  Remaining
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                  Keaktifan
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Keterangan / Note
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-6 py-5.5">
                        <div className="h-4 bg-gray-100 rounded-lg w-full"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : sortedBudgets.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-20 text-center text-gray-400 font-medium"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <FileText size={48} className="text-gray-200" />
                      <p>Belum ada Master Budget yang sesuai filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedBudgets.map((budget) => (
                  <tr
                    key={budget.id}
                    className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                    onClick={() => {
                      setSelectedDetailBudget(budget);
                      setIsDetailModalOpen(true);
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-gray-900">
                        {budget.no_budgeting}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-600">
                      {budget.department_id === 0 ||
                      budget.department_id === "0"
                        ? "Direksi"
                        : budget.department?.department_name ||
                          budget.department_name ||
                          "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getBudgetPeriod(budget)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-gray-900">
                          Rp{" "}
                          {parseFloat(budget.grandtotal || 0).toLocaleString(
                            "id-ID",
                          )}
                        </span>
                        {parseFloat(budget.total_percentage || 0) > 0 && (
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">
                            {budget.total_percentage}% OF SALES TARGET
                          </span>
                        )}
                        {budget.target_sales_id &&
                          Number(budget.target_sales_amount) !==
                            Number(budget.current_target_amount) && (
                            <div className="mt-1 flex flex-col items-end gap-1">
                              <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 animate-pulse">
                                <AlertTriangle size={10} />
                                <span>TARGET UPDATED</span>
                              </div>
                              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleSyncTarget(budget.id, 'percentage')}
                                  className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded-md hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm"
                                  title="Update Nominal (Keep %)"
                                >
                                  <RefreshCw size={8} /> Ikuti %
                                </button>
                                <button
                                  onClick={() => handleSyncTarget(budget.id, 'nominal')}
                                  className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-sm"
                                  title="Update % (Keep Nominal)"
                                >
                                  <RefreshCw size={8} /> Ikuti Nominal
                                </button>
                              </div>
                            </div>
                          )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-orange-600">
                      Rp{" "}
                      {parseFloat(budget.used_amount || 0).toLocaleString(
                        "id-ID",
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-emerald-600">
                      Rp{" "}
                      {(
                        parseFloat(budget.grandtotal || 0) -
                        parseFloat(budget.used_amount || 0)
                      ).toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex gap-1.5">
                          <span
                            className={`w-fit px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(budget.status)} uppercase tracking-wide`}
                          >
                            {budget.status}
                          </span>
                          {!!budget.is_mandatory ? (
                            <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold uppercase tracking-wide border border-teal-200">
                              Mandatory
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wide border border-slate-200">
                              Others
                            </span>
                          )}
                        </div>
                        {budget.status.toLowerCase() === "pending" && (
                          <span className="text-[10px] text-gray-500 italic">
                            {getApprovalStatusText(budget)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleActive(budget)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 shadow-sm border ${
                          budget.is_active !== 0 && budget.is_active !== false
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300"
                            : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:border-slate-300"
                        }`}
                        title={
                          budget.is_active !== 0 && budget.is_active !== false
                            ? "Klik untuk Nonaktifkan Master Budget"
                            : "Klik untuk Aktifkan Master Budget"
                        }
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            budget.is_active !== 0 && budget.is_active !== false
                              ? "bg-emerald-500 shadow-sm animate-pulse"
                              : "bg-slate-400"
                          }`}
                        />
                        <span>
                          {budget.is_active !== 0 && budget.is_active !== false
                            ? "Aktif"
                            : "Non Aktif"}
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 max-w-[200px]">
                        {budget.description ? (
                          <span className="text-xs text-gray-600 line-clamp-2">
                            {budget.description}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            -
                          </span>
                        )}
                        {(() => {
                          const c = getApprovalComment(budget);
                          if (!c) return null;
                          return (
                            <div
                              className={`mt-1 p-2 rounded-lg text-[10px] ${c.action === "rejected" ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}
                            >
                              <strong>Catatan Approval:</strong>
                              <br />
                              <span className="italic">{c.comment}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end items-center gap-1.5 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(budget);
                          }}
                          className={`p-2 rounded-lg transition-all ${
                            budget.is_active !== 0 && budget.is_active !== false
                              ? "text-emerald-600 hover:bg-emerald-50"
                              : "text-slate-400 hover:bg-slate-100"
                          }`}
                          title={
                            budget.is_active !== 0 && budget.is_active !== false
                              ? "Nonaktifkan Master Budget"
                              : "Aktifkan Master Budget"
                          }
                        >
                          <Power size={16} />
                        </button>
                        {budget.status?.toLowerCase() === "pending" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBudget(budget);
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(budget.id);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MasterBudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchBudgets();
          showSuccess(
            "Success!",
            selectedBudget
              ? "Budget updated successfully."
              : "Budget created successfully.",
          );
        }}
        budgetToEdit={selectedBudget}
      />
      <MasterBudgetDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        budget={selectedDetailBudget}
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

      <MasterBudgetSortFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        sortConfig={sortConfig}
        onSortChange={setSortConfig}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        deptFilter={deptFilter}
        setDeptFilter={setDeptFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        monthFilter={monthFilter}
        setMonthFilter={setMonthFilter}
        yearFilter={yearFilter}
        setYearFilter={setYearFilter}
        departments={departments}
      />
    </div>
  );
}
