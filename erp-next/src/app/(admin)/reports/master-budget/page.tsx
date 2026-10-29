"use client";

import { useState, useEffect } from "react";
import usePermission from "@/hooks/usePermission";
import {
  Wallet,
  Filter,
  Printer,
  Calendar,
  TrendingUp,
  TrendingDown,
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
} from "recharts";

export default function MasterBudgetReportPage() {
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
      const res = await api.get("/reports/master-budgets", {
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
    return "Rp " + Math.round(Number(amount || 0)).toLocaleString("id-ID");
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
    if (
      budget.periode_awal &&
      budget.periode_awal !== "0000-00-00" &&
      budget.periode_awal !== "Invalid Date"
    ) {
      return `${formatLongDate(budget.periode_awal)} - ${formatLongDate(budget.periode_akhir)}`;
    }
    
    if (budget.tgl_penyusunan && budget.bulan) {
      try {
        const dateObj = new Date(budget.tgl_penyusunan);
        if (isNaN(dateObj.getTime())) return "Invalid Period";
        
        const year = dateObj.getFullYear();
        const monthIdx = parseInt(budget.bulan) - 1;
        const start = new Date(year, monthIdx, 1);
        const end = new Date(year, monthIdx + 1, 0);
        return `${formatLongDate(start)} - ${formatLongDate(end)}`;
      } catch (e) {
        return "Invalid Period";
      }
    }
    return "-";
  };

  const formatCompactNumber = (number: number) => {
    const num = Number(number || 0);
    if (num < 1000) {
      return num.toString();
    } else if (num < 1000000) {
      return (num / 1000).toFixed(1) + "rb";
    } else if (num < 1000000000) {
      return (num / 1000000).toFixed(1) + "jt";
    } else {
      return (num / 1000000000).toFixed(1) + "M";
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Prepare chart data
  const statusChartData = stats?.by_status
    ? Object.entries(stats.by_status).map(([key, value]: [string, any]) => ({
        name: key,
        count: value.count,
        total_budget: value.total_budget,
      }))
    : [];

  const deptChartData = stats?.by_department
    ? Object.entries(stats.by_department).map(
        ([key, value]: [string, any]) => ({
          name: key,
          budget: Number(value.total_budget || 0),
          used: Number(value.total_used || 0),
          remaining: Number(value.total_budget || 0) - Number(value.total_used || 0),
        }),
      )
    : [];

  const totalUsedReserved = Number(stats?.total_used || 0) + Number(stats?.total_reserved || 0);
  const totalBudgetVal = Number(stats?.total_budget || 0);

  const utilizationData = [
    { name: "Used & Reserved", value: totalUsedReserved },
    { name: "Remaining", value: Math.max(0, totalBudgetVal - totalUsedReserved) },
  ];

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
    return PREMIUM_COLORS.indigo.main;
  };

  const utilizationPercent =
    totalBudgetVal > 0
      ? ((totalUsedReserved / totalBudgetVal) * 100).toFixed(1)
      : "0.0";

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
              <Wallet className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Budget <span className="text-emerald-600">Report</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Lihat dan analisis alokasi serta penggunaan anggaran departemen secara komprehensif.
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
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="print-area">
        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold text-center">
            Master Budget Report
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
                  Total Budgets
                </p>
                <p className="text-3xl font-black text-gray-900">
                  {stats?.total_count || 0}
                </p>
              </div>
              <Wallet className="text-emerald-500" size={40} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-white border-2 border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">
                  Total Budget
                </p>
                <p className="text-xl font-black text-gray-900">
                  {formatCurrency(totalBudgetVal)}
                </p>
              </div>
              <TrendingUp className="text-green-500" size={40} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-white border-2 border-red-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Total Used</p>
                <p className="text-xl font-black text-gray-900">
                  {formatCurrency(totalUsedReserved)}
                </p>
              </div>
              <TrendingDown className="text-red-500" size={40} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">
                  Utilization
                </p>
                <p className="text-3xl font-black text-gray-900">
                  {utilizationPercent}%
                </p>
              </div>
              <Calendar className="text-purple-500" size={40} />
            </div>
          </div>
        </div>

        {/* Charts */}
        {!loading && data.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Budget Utilization */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4 text-center">
                Budget Utilization
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <filter id="utilShadow" height="150%">
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
                      data={utilizationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={75}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                      animationDuration={1500}
                    >
                      <Cell 
                        fill={PREMIUM_COLORS.indigo.main} 
                        filter="url(#utilShadow)"
                        className="hover:scale-105 origin-center transition-transform" 
                      />
                      <Cell fill="#f1f5f9" />
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white/95 backdrop-blur-md p-4 border border-gray-100 rounded-3xl shadow-xl min-w-[200px]">
                              <p className="font-black text-gray-900 text-sm mb-2">{d.name}</p>
                              <p className="text-xl font-black text-indigo-600 leading-none">
                                {formatCurrency(d.value)}
                              </p>
                              <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">
                                {((d.value / totalBudgetVal) * 100).toFixed(1)}% of Total
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <g>
                      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="font-black fill-gray-900 text-3xl">
                        {utilizationPercent}%
                      </text>
                      <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-400 text-[10px] uppercase font-bold tracking-[0.2em]">
                        Utilized
                      </text>
                    </g>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4 text-center">
                Status Distribution
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={95}
                      paddingAngle={5}
                      dataKey="count"
                      stroke="none"
                      animationDuration={1500}
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getStatusColor(entry.name)} 
                          filter="url(#utilShadow)"
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
                            <div className="bg-white/95 backdrop-blur-md p-4 border border-gray-100 rounded-3xl shadow-xl min-w-[200px]">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                                <p className="font-black text-gray-900 text-sm">{d.name}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xl font-black text-gray-800 leading-none">
                                  {d.count} Budgets
                                </p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                  {formatCurrency(d.total_budget)}
                                </p>
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
                      align="center"
                      formatter={(value) => <span className="text-xs font-bold text-gray-500">{value}</span>}
                    />
                    <g>
                      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="font-black fill-gray-900 text-3xl">
                        {stats?.total_count || 0}
                      </text>
                      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-400 text-[10px] uppercase font-bold tracking-[0.2em]">
                        Total
                      </text>
                    </g>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Budget by Department */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
              <h3 className="font-bold text-gray-900 mb-6">
                Budget Allocation & Usage by Department
              </h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptChartData} margin={{ bottom: 60 }}>
                    <defs>
                      <filter id="barShadow">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.1" />
                      </filter>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#94a3b8",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                      angle={-30}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#94a3b8",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                      tickFormatter={(val) => formatCompactNumber(val)}
                    />
                    <Tooltip
                      cursor={{
                        fill: "#f8fafc",
                        radius: [12, 12, 0, 0] as any,
                      }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const budget = payload.find(p => p.dataKey === 'budget')?.value as number;
                          const used = payload.find(p => p.dataKey === 'used')?.value as number;
                          const perc = budget > 0 ? ((used / budget) * 100).toFixed(1) : "0.0";
                          
                          return (
                            <div className="bg-white/95 backdrop-blur-2xl p-5 border border-white/50 rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] min-w-[240px] animate-in zoom-in-95">
                              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
                                <p className="font-black text-gray-900 text-lg">{label}</p>
                                <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${Number(perc) > 90 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                                  {perc}% Used
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Budget</span>
                                  </div>
                                  <span className="font-black text-gray-900">{formatCurrency(budget)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Used</span>
                                  </div>
                                  <span className="font-black text-gray-900">{formatCurrency(used)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Remaining</span>
                                  </div>
                                  <span className="font-black text-gray-900">{formatCurrency(budget - used)}</span>
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
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ paddingBottom: "20px" }}
                    />
                    <Bar
                      dataKey="budget"
                      name="Total Budget"
                      radius={[6, 6, 0, 0] as any}
                      barSize={12}
                      filter="url(#barShadow)"
                    >
                      {deptChartData.map((_entry, index) => (
                        <Cell key={`cell-budget-${index}`} fill={DEPT_COLORS[index % DEPT_COLORS.length]} fillOpacity={0.8} />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="used"
                      name="Budget Used"
                      radius={[6, 6, 0, 0] as any}
                      barSize={12}
                      filter="url(#barShadow)"
                    >
                      {deptChartData.map((_entry, index) => (
                        <Cell key={`cell-used-${index}`} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Master Budgets</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Budget No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Department
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">
                    Total Budget
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">
                    Used
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">
                    Remaining
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No data found for the selected filters
                    </td>
                  </tr>
                ) : (
                  data.map((budget) => {
                    const remaining =
                      budget.grandtotal -
                      budget.used_amount -
                      budget.reserved_amount;

                    return (
                      <tr key={budget.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {budget.no_budgeting}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {getBudgetPeriod(budget)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {budget.department?.department_name ||
                            budget.department_name ||
                            "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-bold text-gray-900">
                          Rp {parseFloat(budget.grandtotal).toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-bold text-gray-900">
                          Rp {parseFloat(budget.used_amount).toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-bold text-gray-900">
                          Rp {remaining.toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              budget.status?.toLowerCase() === "approved"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : budget.status?.toLowerCase() === "pending"
                                  ? "bg-amber-50 text-amber-600 border-amber-100"
                                  : "bg-rose-50 text-rose-600 border-rose-100"
                            }`}
                          >
                            {budget.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
