"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  Calendar,
  TrendingDown,
  LayoutGrid,
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
  Area,
  AreaChart,
} from "recharts";
import SearchableSelect from "@/components/ui/SearchableSelect";
import TargetSalesModal from "@/components/budget/TargetSalesModal";
import TargetSalesDetailModal from "@/components/budget/TargetSalesDetailModal";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import api from "@/lib/api";

export default function TargetSalesPage() {
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<any | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [chartData, setChartData] = useState<any[]>([]);

  const [summaryLoading, setSummaryLoading] = useState(true);

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

  useEffect(() => {
    fetchTargets();
    fetchSummary();
  }, [selectedYear]);

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await api.get(
        `/budgeting/target-sales-summary?year=${selectedYear}`,
      );
      setChartData(res.data.chartData);
    } catch (e) {
      console.error(e);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchTargets = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/target-sales?year=${selectedYear}`);
      setTargets(res.data.data || res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    showConfirm(
      "Delete Target?",
      "Are you sure you want to delete this sales target?",
      () => performDelete(id),
      "Delete Now",
      "Keep it",
    );
  };

  const performDelete = async (id: number) => {
    setActionLoading(true);
    try {
      const userStr = localStorage.getItem("user");
      let userId = "";
      if (userStr) {
        const user = JSON.parse(userStr);
        userId = user.id;
      }

      await api.delete(`/target-sales/${id}?user_id=${userId}`);
      showSuccess("Deleted!", "Sales target has been deleted.");
      fetchTargets();
      fetchSummary();
    } catch (e: any) {
      showError(
        "Delete Failed",
        e.response?.data?.message ||
          e.message ||
          "Failed to delete sales target.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const getMonthName = (monthNum: number) => {
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    return months[monthNum - 1];
  };

  const getApprovalComment = (t: any) => {
    const request = t.approval_request || t.approvalRequest;
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

  const getStatusStyle = (status: string) => {
    const s = status?.toLowerCase();
    switch (s) {
      case "approved":
        return "bg-emerald-50 text-emerald-600 border border-emerald-100";
      case "pending":
        return "bg-orange-50 text-orange-600 border border-orange-100";
      case "rejected":
      case "reject":
        return "bg-red-50 text-red-600 border border-red-100";
      default:
        return "bg-gray-50 text-gray-600 border border-gray-100";
    }
  };

  const getApprovalStatusText = (t: any) => {
    // Check for snake_case or camelCase
    const request = t.approval_request || t.approvalRequest;

    if (!request) {
      return "";
    }

    const logs = request.logs || [];
    // The engine marks the current approvers with 'assigned' action
    const activeLogs = logs.filter((l: any) => l.action === "assigned");

    if (activeLogs.length > 0) {
      const names = activeLogs
        .map((l: any) => l.user?.name || "Unknown")
        .join(", ");
      return `Menunggu approval dari: ${names} (Level ${activeLogs[0].level})`;
    }

    return "";
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="text-emerald-600" size={24} />
            Target Sales
          </h1>
          <p className="text-gray-500 font-medium">
            Monthly Revenue Goals & Performance Tracking
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedTarget(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 text-sm uppercase tracking-wider"
        >
          <Plus size={18} /> Set Target
        </button>
      </div>

      {/* Line Chart Section */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-800 tracking-tight">
                Target Sales Performance
              </h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Monthly revenue goals for {selectedYear}
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

        <div className="h-[300px] w-full">
          {summaryLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                  Analyzing Targets...
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 30,
                  left: 0,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f0f0f0"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#94a3b8",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#94a3b8",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                  tickFormatter={(value) => `Rp ${value / 1000000000}M`}
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
                    "Target",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="Target"
                  stroke="#10b981"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorTarget)"
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Performance Snapshot */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-[2rem] text-white shadow-xl shadow-emerald-200">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                            <TrendingUp size={24} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">
                            Primary Goal
                        </span>
                    </div>
                    <p className="text-sm font-medium opacity-80 uppercase tracking-widest">
                        Target Tahun Ini ({new Date().getFullYear()})
                    </p>
                    <p className="text-4xl font-black mt-2 tracking-tighter">
                        Rp{" "}
                        {targets
                            .filter((t) => t.year === new Date().getFullYear())
                            .reduce(
                                (acc, t) => acc + parseFloat(t.target_amount),
                                0,
                            )
                            .toLocaleString()}
                    </p>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                        <div className="p-3 bg-gray-50 text-emerald-600 rounded-2xl border border-gray-100">
                            <LayoutGrid size={24} />
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">
                                Total Entries
                            </p>
                            <p className="text-2xl font-black text-gray-800">
                                {targets.length}
                            </p>
                        </div>
                    </div>
                    <div className="mt-8 flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 w-fit px-4 py-2 rounded-xl">
                        <TrendingUp size={16} /> 12% Growth Projected
                    </div>
                </div>
            </div> */}

      {/* Grid of Targets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-50 h-48 rounded-[2rem] animate-pulse"
            ></div>
          ))
        ) : targets.length === 0 ? (
          <div className="md:col-span-3 bg-white border-2 border-dashed border-gray-100 py-20 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-gray-400">
            <Calendar size={48} className="opacity-20" />
            <p className="font-bold italic">
              Belum ada target penjualan yang diset.
            </p>
          </div>
        ) : (
          targets.map((target) => (
            <div
              key={target.id}
              onClick={() => {
                setDetailTarget(target);
                setIsDetailModalOpen(true);
              }}
              className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all group relative overflow-hidden cursor-pointer"
            >
              <div className="absolute top-0 right-0 p-4 transition-opacity flex gap-2">
                {(target.status?.toLowerCase() === "pending" ||
                  target.status?.toLowerCase() === "approved") && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTarget(target);
                        setIsModalOpen(true);
                      }}
                      className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(target.id);
                  }}
                  className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-xs uppercase">
                  {getMonthName(target.month).substring(0, 3)}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {target.year}
                  </p>
                  <p className="text-lg font-black text-gray-800">
                    {getMonthName(target.month)}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-gray-300 tracking-[0.2em]">
                  Target Revenue
                </p>
                <p className="text-2xl font-black text-gray-900 leading-none">
                  Rp {parseFloat(target.target_amount).toLocaleString()}
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-1 min-h-[40px]">
                {target.description ? (
                  <span className="text-xs text-gray-600 line-clamp-2">
                    {target.description}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 italic">-</span>
                )}
                {(() => {
                  const c = getApprovalComment(target);
                  if (!c) return null;
                  return (
                    <div
                      className={`mt-2 p-3 rounded-xl text-[10px] ${c.action === "rejected" ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}
                    >
                      <strong className="uppercase tracking-wider">
                        Catatan Approval:
                      </strong>
                      <br />
                      <span className="italic">{c.comment}</span>
                    </div>
                  );
                })()}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                <div className="flex flex-col gap-1.5">
                  <span
                    className={`w-fit text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${getStatusStyle(target.status)}`}
                  >
                    {target.status}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-gray-300 uppercase italic">
                  Ref: {target.reference}
                </span>
              </div>
              {target.status?.toLowerCase() === "pending" && (
                <span className="text-[10px] text-gray-500 italic">
                  {getApprovalStatusText(target)}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      <TargetSalesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchTargets();
          fetchSummary();
          showSuccess(
            "Success!",
            selectedTarget
              ? "Target updated successfully."
              : "Target created successfully.",
          );
        }}
        targetToEdit={selectedTarget}
      />

      <TargetSalesDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        target={detailTarget}
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
