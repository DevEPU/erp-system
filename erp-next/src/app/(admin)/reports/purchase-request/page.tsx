"use client";

import { useState, useEffect } from "react";
import usePermission from "@/hooks/usePermission";
import {
  FileText,
  Filter,
  Printer,
  Calendar,
  Building2,
  ShoppingCart,
} from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";
import api from "@/lib/api";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
} from "recharts";

export default function PurchaseRequestReportPage() {
  const { user } = usePermission();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [canViewAllDepartments, setCanViewAllDepartments] = useState(false);

  // Initialize dates to current month
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(lastDay.toISOString().split("T")[0]);
  }, []);

  // Initialize permission states from user data
  useEffect(() => {
    if (user) {
      const isSuperAdmin = user.role_names?.includes("Super Admin");
      const hasAllDeptPermission =
        user.permissions?.includes("all_departments");
      const hasAccess = isSuperAdmin || hasAllDeptPermission;

      setCanViewAllDepartments(hasAccess);

      // If user doesn't have access, set filter to their department
      if (!hasAccess && user.department_id) {
        setDepartmentId(user.department_id.toString());
      }
    }
  }, [user]);

  // Fetch departments
  useEffect(() => {
    api.get("/departments")
      .then((res) => setDepartments(res.data.data || []))
      .catch((err) => console.error(err));
  }, []);

  // Fetch report data
  const fetchReport = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    try {
      const res = await api.get("/reports/purchase-requests", {
        start_date: startDate,
        end_date: endDate,
        ...(departmentId && { department_id: departmentId }),
        ...(status && { status }),
      });
      setData(res.data.data || []);
      setStats(res.data.stats || {});
    } catch (error) {
      console.error("Failed to fetch report:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchReport();
    }
  }, [startDate, endDate, departmentId, status]);

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount < 1000000) {
      return "Rp " + amount.toLocaleString("id-ID");
    } else if (amount < 1000000000) {
      return "Rp " + (amount / 1000000).toFixed(1) + "jt";
    } else {
      return "Rp " + (amount / 1000000000).toFixed(1) + "M";
    }
  };

  // Prepare chart data
  const statusChartData = stats?.by_status
    ? Object.entries(stats.by_status).map(([key, value]: [string, any]) => ({
        name: key,
        count: value.count,
        amount: value.amount,
        asset_amount: value.asset_amount,
      }))
    : [];

  const deptChartData = stats?.by_department
    ? Object.entries(stats.by_department).map(
        ([key, value]: [string, any]) => ({
          name: key,
          count: value.count,
          amount: value.amount,
          asset_amount: value.asset_amount,
        }),
      )
    : [];

  // Trend data simulation/preparation (ideally this comes from backend daily stats)
  const trendData = data
    .reduce((acc: any[], curr) => {
      const date = curr.date;
      const totalFromDetails = parseFloat(curr.total_amount || 0);

      const existing = acc.find((a) => a.date === date);
      if (existing) {
        existing.amount += totalFromDetails;
        existing.count += 1;
      } else {
        acc.push({ date, amount: totalFromDetails, count: 1 });
      }
      return acc;
    }, [])
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Department Colors
  const DEPT_COLORS = [
    "#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#3b82f6", 
    "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6", "#f97316"
  ];

  // Premium Color Palette
  const PREMIUM_COLORS = {
    emerald: {
      light: "#34d399",
      main: "#10b981",
      dark: "#059669",
      bg: "#ecfdf5",
    },
    indigo: {
      light: "#818cf8",
      main: "#6366f1",
      dark: "#4f46e5",
      bg: "#eef2ff",
    },
    rose: {
      light: "#fb7185",
      main: "#f43f5e",
      dark: "#e11d48",
      bg: "#fff1f2",
    },
    amber: {
      light: "#fbbf24",
      main: "#f59e0b",
      dark: "#d97706",
      bg: "#fffbeb",
    },
    blue: {
      light: "#60a5fa",
      main: "#3b82f6",
      dark: "#2563eb",
      bg: "#eff6ff",
    },
  };

  const getStatusColor = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "approved") return PREMIUM_COLORS.emerald.main;
    if (s === "pending") return PREMIUM_COLORS.amber.main;
    if (s === "rejected") return PREMIUM_COLORS.rose.main;
    if (s === "draft") return PREMIUM_COLORS.indigo.main;
    return PREMIUM_COLORS.blue.main;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 min-h-screen">
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area,
          .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 no-print">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <FileText className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              PR <span className="text-emerald-600">Report</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Lihat dan analisis data permohonan pembelian untuk periode tertentu.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="group relative flex items-center gap-3 bg-gray-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 overflow-hidden"
        >
          <Printer size={20} strokeWidth={3} />
          <span>Print Report</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 no-print">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-emerald-600" />
          <h2 className="font-bold text-gray-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <SearchableSelect
              label=""
              placeholder="All Departments"
              value={departmentId}
              onChange={(val) => setDepartmentId(val.toString())}
              disabled={!canViewAllDepartments}
              options={[
                { value: "", label: "All Departments" },
                ...departments.map((dept) => ({
                  value: dept.id,
                  label: dept.id === 0 ? "Direksi" : dept.department_name,
                })),
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <SearchableSelect
              label=""
              placeholder="All Status"
              value={status}
              onChange={(val) => setStatus(val.toString())}
              options={[
                { value: "", label: "All Status" },
                { value: "Pending", label: "Pending" },
                { value: "Approved", label: "Approved" },
                { value: "Rejected", label: "Rejected" },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="print-area">
        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold text-center">
            Purchase Request Report
          </h1>
          <p className="text-center text-gray-600">
            Period: {startDate} to {endDate}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">
                  Total Requests
                </p>
                <p className="text-3xl font-black text-gray-900">
                  {stats?.total_count || 0}
                </p>
              </div>
              <FileText className="text-emerald-500" size={40} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-white border-2 border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">
                  Total Amount
                </p>
                <p className="text-2xl font-black text-gray-900">
                  {formatCurrency(Number(stats?.total_amount || 0))}
                </p>
              </div>
              <Building2 className="text-green-500" size={40} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">
                  Total Asset Amount
                </p>
                <p className="text-2xl font-black text-gray-900">
                  {formatCurrency(Number(stats?.total_asset_amount || 0))}
                </p>
              </div>
              <ShoppingCart className="text-amber-500" size={40} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">
                  Avg. Amount
                </p>
                <p className="text-2xl font-black text-gray-900">
                  {formatCurrency(
                    Number(stats?.total_count) > 0
                      ? Number(stats.total_amount) / Number(stats.total_count)
                      : 0,
                  )}
                </p>
              </div>
              <Calendar className="text-purple-500" size={40} />
            </div>
          </div>
        </div>

        {/* Charts */}
        {!loading && data.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Status Distribution */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4 text-center">
                Status Distribution
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <filter id="pieShadow" height="150%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                        <feOffset dx="0" dy="4" result="offsetblur" />
                        <feComponentTransfer>
                          <feFuncA type="linear" slope="0.1" />
                        </feComponentTransfer>
                        <feMerge>
                          <feMergeNode />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="count"
                      stroke="none"
                      animationDuration={1500}
                      animationEasing="ease-out"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getStatusColor(entry.name)}
                          filter="url(#pieShadow)"
                          className="hover:scale-105 origin-center transition-transform cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          const color = getStatusColor(d.name);
                          return (
                            <div className="bg-white/95 backdrop-blur-2xl p-4 border border-white/50 rounded-3xl shadow-xl min-w-[200px] animate-in zoom-in-95">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                                <p className="font-black text-gray-900 text-sm">{d.name}</p>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between items-end">
                                  <span className="text-[10px] text-gray-400 font-bold uppercase">Requests</span>
                                  <span className="text-xl font-black text-gray-900">{d.count}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                  <span className="text-[10px] text-gray-400 font-bold uppercase">Total Value</span>
                                  <span className="text-sm font-bold text-gray-700">{formatCurrency(d.amount)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      iconType="circle"
                      verticalAlign="bottom"
                      formatter={(value) => <span className="text-xs font-bold text-gray-500">{value}</span>}
                    />
                    <g>
                      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="font-black fill-gray-900 text-3xl">
                        {stats?.total_count || 0}
                      </text>
                      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-400 text-[10px] uppercase font-bold tracking-[0.2em]">
                        Requests
                      </text>
                    </g>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Amount Trend */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4 text-center">
                Purchase Amount Trend
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="luminousBlue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <filter id="luminousGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }}
                      tickFormatter={(val) => val ? new Date(val).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) : ""}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }}
                      tickFormatter={(val) => `Rp ${val >= 1000000 ? (val / 1000000).toFixed(0) + "jt" : val}`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white/95 backdrop-blur-2xl p-5 border border-white/50 rounded-3xl shadow-xl animate-in slide-in-from-bottom-2 duration-300 min-w-[200px]">
                              <p className="font-black text-gray-900 mb-3 border-b border-gray-100 pb-2">
                                {label ? new Date(label).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : ""}
                              </p>
                              <div className="space-y-1">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Purchase Amount</p>
                                <p className="text-2xl font-black text-blue-600 leading-tight">
                                  {formatCurrency(payload[0].value as number)}
                                </p>
                                <div className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold inline-block mt-2">
                                  {payload[0].payload.count} Requests
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#3b82f6"
                      strokeWidth={4}
                      fillOpacity={1}
                      fill="url(#luminousBlue)"
                      filter="url(#luminousGlow)"
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department Distribution */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
              <h3 className="font-bold text-gray-900 mb-6 text-center">
                Requests Value by Department
              </h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptChartData} margin={{ bottom: 60 }}>
                    <defs>
                      <filter id="deptBarShadow">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.1" />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }}
                      angle={-30}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }}
                      tickFormatter={(val) => `Rp ${val >= 1000000 ? (val / 1000000).toFixed(0) + "jt" : val}`}
                    />
                    <Tooltip
                      cursor={{ fill: "#f8fafc", radius: [10, 10, 0, 0] as any }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white/95 backdrop-blur-2xl p-5 border border-white/50 rounded-3xl shadow-xl min-w-[220px] animate-in zoom-in-95">
                              <p className="font-black text-gray-900 border-b border-gray-100 pb-3 mb-3">{label}</p>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-gray-400 font-bold uppercase">Total Value</span>
                                  <span className="font-black text-gray-900">{formatCurrency(d.amount)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-gray-400 font-bold uppercase">Requests</span>
                                  <span className="font-bold text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded-md text-xs">
                                    {d.count} Requests
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="amount"
                      name="Total Amount"
                      radius={[10, 10, 0, 0] as any}
                      barSize={12}
                      filter="url(#deptBarShadow)"
                      animationDuration={2500}
                    >
                      {deptChartData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-400">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span>Loading data...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-gray-400 font-medium"
                    >
                      No data found for the selected filters
                    </td>
                  </tr>
                ) : (
                  data.map((pr) => (
                    <tr
                      key={pr.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(pr.date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-gray-900">
                          {pr.reference}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {pr.department?.department_name ||
                          pr.department_name ||
                          "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-900">
                        Rp {parseFloat(pr.total_amount).toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              pr.status?.toLowerCase() === "approved"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : pr.status?.toLowerCase() === "pending"
                                  ? "bg-amber-50 text-amber-600 border-amber-100"
                                  : "bg-rose-50 text-rose-600 border-rose-100"
                            }`}
                          >
                            {pr.status}
                          </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
