"use client";
import {
  LayoutGrid,
  ShoppingCart,
  Target,
  CheckSquare,
  RefreshCw,
  Wallet,
  TrendingDown,
  TrendingUp,
  PackagePlus,
  Building2,
  ChevronRight,
  ChevronDown,
  Info,
  X,
  CreditCard,
  ArrowRight,
  Target as TargetIcon,
  Search,
  SortAsc,
  SortDesc,
} from "lucide-react";
import TablePagination from "@/components/ui/TablePagination";
import ApprovalList from "@/components/approval/ApprovalList";
import ApprovalActionModal from "@/components/approval/ApprovalActionModal";
import ApprovalDetailModal from "@/components/approval/ApprovalDetailModal";
import { Zap } from "lucide-react";
import { Protect } from "@/components/auth/WithPermission";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { API_BASE_URL } from "@/lib/constants";
import api from "@/lib/api";

export default function ApprovalRequestPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const monthParam = searchParams.get("month");
  const yearParam = searchParams.get("year");

  const [activeTab, setActiveTab] = useState<
    "budget" | "purchase" | "target" | "product"
  >((tabParam as any) || "budget");

  const [selectedMonth, setSelectedMonth] = useState(
    monthParam || String(new Date().getMonth() + 1).padStart(2, "0"),
  );
  const [selectedYear, setSelectedYear] = useState(
    yearParam || String(new Date().getFullYear()),
  );

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [counts, setCounts] = useState<{ [key: string]: number }>({
    purchase: 0,
    budget: 0,
    target: 0,
    product: 0,
  });

  // Action Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<any>(null);

  // Budget Summary State
  const [budgetSummary, setBudgetSummary] = useState<any[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [selectedDeptDetail, setSelectedDeptDetail] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  // Skip confirm modal for approve — persists for session via sessionStorage
  const [skipApproveConfirm, setSkipApproveConfirm] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("skip_approve_confirm") === "true";
    }
    return false;
  });
  const [quickApprovingId, setQuickApprovingId] = useState<number | null>(null);

  const toggleSkipApproveConfirm = () => {
    const next = !skipApproveConfirm;
    setSkipApproveConfirm(next);
    sessionStorage.setItem("skip_approve_confirm", next ? "true" : "false");
  };

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePeriodChange = (month: string, year: string) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", month);
    params.set("year", year);
    router.push(`${pathname}?${params.toString()}`);
  };

  const backendUrl = `${API_BASE_URL}/api`;

  const fetchCounts = async () => {
    try {
      const res = await api.get("/approvals/pending-counts");
      const apiData = res.data;

      // Map both Express (titled) and potentially Laravel (snake_case) keys
      const newCounts = {
        purchase:
          apiData["Purchase Request"] ||
          apiData["purchase"] ||
          apiData["purchase_request"] ||
          0,
        budget:
          apiData["Master Budget"] ||
          apiData["budget"] ||
          apiData["master_budget"] ||
          0,
        target:
          apiData["Target Sales"] ||
          apiData["target"] ||
          apiData["target_sales"] ||
          0,
        product:
          apiData["Product Request"] ||
          apiData["product"] ||
          apiData["product_request"] ||
          0,
      };

      setCounts(newCounts);
    } catch (error) {
      console.error("Failed to fetch counts:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setData([]);
    try {
      const res = await api.get("/approval-requests", {
        type: activeTab,
        status: "Pending",
      });
      // Handle both { data: { data: [] } } and { data: [] } structures
      const extractedData = res.data?.data || res.data || [];
      setData(Array.isArray(extractedData) ? extractedData : []);
      fetchCounts();
    } catch (error) {
      console.error("Failed to fetch approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgetSummary = async (showLoading = true) => {
    if (showLoading) setSummaryLoading(true);
    try {
      const res = await api.get("/budget-summary", {
        year: selectedYear,
        month: selectedMonth,
      });
      const extractedSummary = res.data?.data || res.data || [];
      setBudgetSummary(Array.isArray(extractedSummary) ? extractedSummary : []);
    } catch (error) {
      console.error("Failed to fetch budget summary:", error);
    } finally {
      if (showLoading) setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Only show loading for summary if no data yet
    fetchBudgetSummary(budgetSummary.length === 0);
  }, [activeTab, selectedMonth, selectedYear]);

  const handleAction = async (item: any, type: "approve" | "reject") => {
    // If skip-confirm is ON and action is approve → directly approve via API
    if (type === "approve" && skipApproveConfirm) {
      const userId = localStorage.getItem("user")
        ? JSON.parse(localStorage.getItem("user")!).id
        : null;
      setQuickApprovingId(item.id);
      try {
        await api.post(`/approval-requests/${item.id}/approve`, {
          comment: "",
          user_id: userId,
        });
        fetchData();
      } catch (err: any) {
        alert("Gagal approve: " + (err.response?.data?.message || err.message));
      } finally {
        setQuickApprovingId(null);
      }
      return;
    }
    // Otherwise open modal as usual
    setSelectedItem(item);
    setActionType(type);
    setModalOpen(true);
  };

  const handleView = (item: any) => {
    setSelectedDetailItem(item);
    setDetailModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    if (amount < 1000000) {
      // Less than 1 million: show full number
      return amount.toLocaleString("id-ID");
    } else if (amount < 1000000000) {
      // 1 million to 1 billion: show in millions with 'jt'
      return (
        (amount / 1000000).toLocaleString("id-ID", {
          maximumFractionDigits: 2,
        }) + "Jt"
      );
    } else {
      // 1 billion and above: show in billions with 'M'
      return (
        (amount / 1000000000).toLocaleString("id-ID", {
          maximumFractionDigits: 2,
        }) + "M"
      );
    }
  };

  // Filter and Sort Data
  const filteredData = data
    .filter((item) => {
      const entity = item.requestable;
      if (!entity) return false;

      const searchLower = searchQuery.toLowerCase();
      const refMatch = String(entity.reference || entity.no_budgeting || "")
        .toLowerCase()
        .includes(searchLower);
      const deptMatch = String(
        entity.department?.department_name ||
          (entity.department_id === 0 ? "Direksi" : "") ||
          "",
      )
        .toLowerCase()
        .includes(searchLower);
      const userMatch = String(
        item.creator?.name || entity.users?.name || item.created_by || "",
      )
        .toLowerCase()
        .includes(searchLower);

      return refMatch || deptMatch || userMatch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

  const tabs = [
    {
      id: "budget",
      label: "Master Budget",
      icon: LayoutGrid,
      color: "text-blue-600 bg-blue-50",
    },
    {
      id: "purchase",
      label: "Purchase Request",
      icon: ShoppingCart,
      color: "text-purple-600 bg-purple-50",
    },
    {
      id: "target",
      label: "Target Sales",
      icon: TrendingUp,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      id: "product",
      label: "Product Request",
      icon: PackagePlus,
      color: "text-orange-600 bg-orange-50",
    },
  ];

  return (
    <Protect permission="access_approval_requests">
      <div className="p-6 pt-12 min-h-screen animate-in fade-in duration-500 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
                <CheckSquare className="text-white" size={28} />
              </div>
              <h1 className="text-4xl font-black tracking-tight text-gray-900">
                Approval <span className="text-emerald-600">Requests</span>
              </h1>
            </div>
            <p className="text-gray-500 font-medium ml-1">
              Review dan kelola permohonan persetujuan tertunda untuk berbagai departemen.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-gray-100 p-2 rounded-2xl shadow-sm">
              <select
                value={selectedMonth}
                onChange={(e) =>
                  handlePeriodChange(e.target.value, selectedYear)
                }
                className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer px-3 py-1"
              >
                {[
                  "01", "02", "03", "04", "05", "06",
                  "07", "08", "09", "10", "11", "12",
                ].map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, parseInt(m) - 1).toLocaleString("id-ID", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>
              <div className="w-px h-4 bg-gray-200"></div>
              <select
                value={selectedYear}
                onChange={(e) =>
                  handlePeriodChange(selectedMonth, e.target.value)
                }
                className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer px-3 py-1"
              >
                {Array.from({ length: 5 }).map((_, i) => {
                  const y = new Date().getFullYear() - 2 + i;
                  return (
                    <option key={y} value={y.toString()}>
                      {y}
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              onClick={() => {
                fetchData();
                fetchBudgetSummary();
              }}
              className="p-3 bg-gray-900 text-white hover:bg-emerald-600 rounded-2xl transition-all shadow-xl active:scale-95 flex items-center gap-2"
              title="Refresh Data"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1.5 bg-white border border-gray-100 rounded-2xl w-full md:w-fit shadow-sm overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                  isActive
                    ? `${tab.color} shadow-sm ring-1 ring-inset ring-black/5`
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon size={18} className={isActive ? "" : "opacity-70"} />
                <span>{tab.label}</span>
                {counts[tab.id] > 0 && (
                  <span
                    className={`ml-1 flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-[10px] font-black transition-all ${
                      isActive
                        ? "bg-white text-gray-900 shadow-sm"
                        : "bg-gray-100 text-gray-400 group-hover:bg-emerald-100 group-hover:text-emerald-600"
                    }`}
                  >
                    {counts[tab.id]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Budget Summary */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={20} className="text-emerald-600" />
            <h3 className="font-bold text-gray-900">
              Ringkasan Budget Periode Ini
            </h3>
            <span className="text-xs text-gray-500">
              (
              {new Date(
                parseInt(selectedYear),
                parseInt(selectedMonth) - 1,
              ).toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
              })}
              )
            </span>
          </div>

          {summaryLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <RefreshCw className="animate-spin" size={20} />
              <span className="ml-2">Loading...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {budgetSummary.map((dept) => {
                const percentage =
                  dept.grandtotal > 0
                    ? (dept.remaining / dept.grandtotal) * 100
                    : 0;
                const isLow = percentage < 20;

                return (
                  <div
                    key={`${dept.department_id}-${selectedMonth}-${selectedYear}`}
                    onClick={() => setSelectedDeptDetail(dept)}
                    className={`relative overflow-hidden rounded-2xl p-4 border-2 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-sm hover:shadow-xl ${
                      isLow
                        ? "border-red-200 bg-red-50/20"
                        : "border-gray-100 bg-white hover:border-emerald-200"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-1.5 rounded-lg ${isLow ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}
                        >
                          <Building2 size={14} />
                        </div>
                        <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest truncate max-w-[100px]">
                          {dept.department_name}
                        </p>
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-gray-300 group-hover:text-blue-500 transition-colors"
                      />
                    </div>

                    {/* Split Totals */}
                    <div className="space-y-3">
                      {/* Mandatory Split */}
                      {dept.mandatory_grandtotal > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between items-end">
                            <span className="text-[9px] font-bold text-teal-600 uppercase tracking-tighter">
                              Mandatory
                            </span>
                            <span className="text-xs font-black text-gray-900">
                              {formatCurrency(dept.mandatory_remaining)}
                            </span>
                          </div>
                          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-teal-500"
                              style={{
                                width: `${(dept.mandatory_remaining / dept.mandatory_grandtotal) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Others Split */}
                      {dept.others_grandtotal > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between items-end">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                              Budget Others / Non Mandatory
                            </span>
                            <span className="text-xs font-black text-gray-900">
                              {formatCurrency(dept.others_remaining)}
                            </span>
                          </div>
                          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-slate-400"
                              style={{
                                width: `${(dept.others_remaining / dept.others_grandtotal) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Fallback if no specific budgets but total exists or is 0 */}
                      {dept.mandatory_grandtotal === 0 &&
                        dept.others_grandtotal === 0 && (
                          <div className="py-2 text-center text-[10px] text-gray-400 font-medium italic">
                            No active budgets
                          </div>
                        )}

                      {/* Borrowing / Lending Summary */}
                      <div className="pt-2 border-t border-gray-50 flex justify-between gap-1 overflow-x-auto no-scrollbar">
                        {dept.over_budget_total > 0 && (
                          <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-red-500 uppercase tracking-tighter whitespace-nowrap">
                              Over Budget
                            </span>
                            <span className="text-[10px] font-black text-red-700">
                              {formatCurrency(dept.over_budget_total)}
                            </span>
                          </div>
                        )}
                        {dept.lent_total > 0 && (
                          <div className="flex flex-col text-right">
                            <span className="text-[8px] font-bold text-amber-500 uppercase tracking-tighter whitespace-nowrap">
                              Dipinjam
                            </span>
                            <span className="text-[10px] font-black text-amber-700">
                              {formatCurrency(dept.lent_total)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Stats */}
                    <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center text-[9px]">
                      <div className="flex flex-col">
                        <span className="text-gray-400">Total Budget</span>
                        <span className="font-bold text-gray-700">
                          {formatCurrency(dept.grandtotal)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`${percentage < 20 ? "text-red-500" : "text-emerald-500"} font-black text-xs`}
                        >
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Content List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
          <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <CheckSquare size={18} className="text-emerald-500" />
                <span>
                  Pending {tabs.find((t) => t.id === activeTab)?.label} List
                </span>
              </h2>
              <span className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                {filteredData.length} Requests
              </span>
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
              {/* Search Input */}
              <div className="relative group w-full md:w-64">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
                />
                <input
                  type="text"
                  placeholder="Cari nomor, dept, atau nama..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-hidden"
                />
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 bg-white border border-gray-200 p-1 rounded-xl shadow-xs">
                <button
                  onClick={() => setSortBy("newest")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    sortBy === "newest"
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <SortDesc size={14} />
                  <span>Terbaru</span>
                </button>
                <button
                  onClick={() => setSortBy("oldest")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    sortBy === "oldest"
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <SortAsc size={14} />
                  <span>Terlama</span>
                </button>
              </div>

              {/* Quick Approve Toggle */}
              <button
                onClick={toggleSkipApproveConfirm}
                title={skipApproveConfirm ? "Mode: Approve Langsung (klik untuk nonaktifkan)" : "Mode: Konfirmasi Approve (klik untuk aktifkan Approve Langsung)"}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                  skipApproveConfirm
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm shadow-emerald-100"
                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                <Zap
                  size={14}
                  className={skipApproveConfirm ? "fill-emerald-500 text-emerald-500" : "text-gray-400"}
                />
                <span>{skipApproveConfirm ? "Approve Langsung" : "Approve Langsung"}</span>
                <span
                  className={`inline-block w-8 h-4 rounded-full transition-all relative ${
                    skipApproveConfirm ? "bg-emerald-500" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${
                      skipApproveConfirm ? "left-4" : "left-0.5"
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>

          <ApprovalList
            data={filteredData}
            loading={loading}
            onAction={handleAction}
            onView={handleView}
            type={activeTab}
            quickApprovingId={quickApprovingId}
          />
        </div>

        <ApprovalActionModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            fetchData();
            setSelectedItem(null);
          }}
          type={actionType}
          requestId={selectedItem?.id}
          backendUrl={backendUrl}
          userId={
            localStorage.getItem("user")
              ? JSON.parse(localStorage.getItem("user")!).id
              : null
          }
        />

        <ApprovalDetailModal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          data={selectedDetailItem}
          type={activeTab}
        />

        {/* Budget Breakdown Modal */}
        {selectedDeptDetail && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-4xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
              {/* Modal Header */}
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-linear-to-r from-gray-50 to-white">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg">
                    <Wallet size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                      Detail Budget Departemen
                    </h2>
                    <p className="text-gray-500 font-bold flex items-center gap-2">
                      <Building2 size={16} />
                      {selectedDeptDetail.department_name} •{" "}
                      {new Date(
                        parseInt(selectedYear),
                        parseInt(selectedMonth) - 1,
                      ).toLocaleString("id-ID", {
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDeptDetail(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-3xl space-y-2">
                    <p className="text-xs font-black text-blue-600 uppercase tracking-widest">
                      Total Keseluruhan
                    </p>
                    <p className="text-3xl font-black text-gray-900">
                      {formatCurrency(selectedDeptDetail.grandtotal)}
                    </p>
                    <div className="flex justify-between text-xs font-bold pt-2 text-gray-500">
                      <span>
                        Terpakai:{" "}
                        {formatCurrency(selectedDeptDetail.used_amount)}
                      </span>
                      <span className="text-emerald-600">
                        Sisa: {formatCurrency(selectedDeptDetail.remaining)}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 bg-teal-50/50 border border-teal-100 rounded-3xl space-y-2">
                    <p className="text-xs font-black text-teal-600 uppercase tracking-widest">
                      Mandatory Budget
                    </p>
                    <p className="text-3xl font-black text-gray-900">
                      {formatCurrency(selectedDeptDetail.mandatory_grandtotal)}
                    </p>
                    <div className="flex justify-between text-xs font-bold pt-2 text-gray-500">
                      <span>
                        Terpakai:{" "}
                        {formatCurrency(selectedDeptDetail.mandatory_used)}
                      </span>
                      <span className="text-teal-600">
                        Sisa:{" "}
                        {formatCurrency(selectedDeptDetail.mandatory_remaining)}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-2">
                    <p className="text-xs font-black text-slate-600 uppercase tracking-widest">
                      Budget Others / Non Mandatory
                    </p>
                    <p className="text-3xl font-black text-gray-900">
                      {formatCurrency(selectedDeptDetail.others_grandtotal)}
                    </p>
                    <div className="flex justify-between text-xs font-bold pt-2 text-gray-500">
                      <span>
                        Terpakai:{" "}
                        {formatCurrency(selectedDeptDetail.others_used)}
                      </span>
                      <span className="text-slate-600">
                        Sisa:{" "}
                        {formatCurrency(selectedDeptDetail.others_remaining)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Master Budget List */}
                <div className="space-y-4">
                  <h3 className="font-black text-gray-900 flex items-center gap-2">
                    <CreditCard size={20} className="text-blue-500" />
                    Daftar Master Budget Terdaftar
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {selectedDeptDetail.budgets.map((b: any) => (
                      <div
                        key={b.id}
                        className="border border-gray-100 rounded-[2.5rem] overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="p-6 flex items-center justify-between bg-gray-50/50 border-b border-gray-100">
                          <div className="flex items-center gap-4">
                            <div
                              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${b.is_mandatory ? "bg-teal-100 text-teal-700" : "bg-slate-200 text-slate-700"}`}
                            >
                              {b.is_mandatory ? "Mandatory" : "Non Mandatory"}
                            </div>
                            <div>
                              <p className="text-sm font-black text-gray-900">
                                {b.no_budgeting}
                              </p>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                                Budget ID #{b.id}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                              Total
                            </p>
                            <p className="text-lg font-black text-gray-900">
                              {formatCurrency(b.grandtotal)}
                            </p>
                          </div>
                        </div>

                        {/* Category Breakdown */}
                        <div className="p-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {b.details.map((d: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-3 bg-white border border-gray-50 rounded-2xl space-y-1 hover:border-blue-100 transition-colors"
                              >
                                <div className="flex justify-between items-center">
                                  <p className="text-[10px] font-bold text-gray-500 truncate max-w-[150px]">
                                    {d.category_name}
                                  </p>
                                  <span className="text-[9px] font-black text-emerald-600">
                                    {(
                                      (d.remaining / (d.budget || 1)) *
                                      100
                                    ).toFixed(0)}
                                    %
                                  </span>
                                </div>
                                <p className="text-sm font-black text-gray-700">
                                  {formatCurrency(d.remaining)}
                                </p>
                                <div className="h-1 bg-gray-50 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-400"
                                    style={{
                                      width: `${(d.remaining / (d.budget || 1)) * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Over Budget & Lent Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
                  {/* Over Budget (Borrowed) */}
                  <div className="space-y-4">
                    <h3 className="font-black text-gray-900 flex items-center gap-2">
                      <ArrowRight size={20} className="text-red-500" />
                      Over Budget (Meminjam)
                    </h3>
                    <div className="space-y-2">
                      {selectedDeptDetail.over_budget_details?.length > 0 ? (
                        selectedDeptDetail.over_budget_details.map(
                          (item: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-4 bg-red-50/30 border border-red-100 rounded-2xl flex justify-between items-center"
                            >
                              <div>
                                <p className="text-xs font-black text-red-700 uppercase tracking-widest">
                                  {item.is_internal
                                    ? "Kategori: " + item.target_category ||
                                      "Internal"
                                    : "Pinjaman External"}
                                </p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase">
                                  DARI:
                                  {" Kategori " + item.source_category ||
                                    item.source}
                                </p>
                              </div>
                              <p className="font-black text-gray-900">
                                {formatCurrency(item.amount)}
                              </p>
                            </div>
                          ),
                        )
                      ) : (
                        <p className="text-xs text-gray-400 italic bg-gray-50 p-4 rounded-2xl border border-gray-100">
                          Tidak ada budget yang meminjam dari luar
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Lent (Dipinjam) */}
                  <div className="space-y-4">
                    <h3 className="font-black text-gray-900 flex items-center gap-2">
                      <ArrowRight
                        size={20}
                        className="text-amber-500 rotate-180"
                      />
                      Dipinjam (Lending)
                    </h3>
                    <div className="space-y-2">
                      {selectedDeptDetail.lent_details?.length > 0 ? (
                        selectedDeptDetail.lent_details.map(
                          (item: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-4 bg-amber-50/30 border border-amber-100 rounded-2xl flex justify-between items-center"
                            >
                              <div>
                                <p className="text-xs font-black text-amber-700 uppercase tracking-widest">
                                  {item.is_internal
                                    ? "Kategori: " + item.source_category ||
                                      "Internal"
                                    : "Pinjaman External"}
                                </p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase">
                                  UNTUK: {item.target}
                                </p>
                              </div>
                              <p className="font-black text-gray-900">
                                {formatCurrency(item.amount)}
                              </p>
                            </div>
                          ),
                        )
                      ) : (
                        <p className="text-xs text-gray-400 italic bg-gray-50 p-4 rounded-2xl border border-gray-100">
                          Tidak ada budget yang dipinjam oleh pihak lain
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-100 flex justify-end bg-gray-50/30">
                <button
                  onClick={() => setSelectedDeptDetail(null)}
                  className="px-8 py-3 bg-gray-900 text-white font-black rounded-2xl hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
                >
                  Tutup Detail
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Protect>
  );
}
