"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import IconRenderer from "@/components/ui/IconRenderer";
import SearchableSelect from "@/components/ui/SearchableSelect";
import {
  LayoutGrid,
  DollarSign,
  ShoppingCart,
  Wallet,
  Hourglass,
  Package,
  ArrowRight,
} from "lucide-react";
import LoadingState from "@/components/ui/LoadingState";
import usePermission from "@/hooks/usePermission";
import { STATIC_MENUS } from "@/lib/constants";
import api from "@/lib/api";
import PurchaseDetailModal from "@/components/budget/PurchaseDetailModal";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = [
  "#ffc658",
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#C41E3A",
  "#702963",
];

// Helper for currency formatting
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Helper for compact number
const formatCompactNumber = (number: number) => {
  if (number >= 1000000000) {
    return (number / 1000000000).toFixed(1).replace(".", ",") + "M";
  } else if (number >= 1000000) {
    return (number / 1000000).toFixed(0) + "jt";
  }
  return number.toString();
};

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const { hasRole, can } = usePermission();

  const canViewRemainingBudget =
    hasRole("Super Admin") || can("remaining_budget");
  const canViewAllDepartments =
    hasRole("Super Admin") || can("all_departments");

  // Filters
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Data States
  const [stats, setStats] = useState({
    approved_budget: 0,
    purchases: 0,
    remaining_budget: 0,
    pending_purchases: 0,
    total_assets: 0,
  });

  const [targetVsPurchaseData, setTargetVsPurchaseData] = useState<any[]>([]);
  const [budgetPurchasesData, setBudgetPurchasesData] = useState<any[]>([]);
  const [budgetDepartmentData, setBudgetDepartmentData] = useState<any[]>([]);
  const [budgetCategoryData, setBudgetCategoryData] = useState<any[]>([]);
  const [pendingPRs, setPendingPRs] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [catDeptFilter, setCatDeptFilter] = useState<string>("all");
  const [pendingDeptFilter, setPendingDeptFilter] = useState<string>("all");
  const [dailyDeptFilter, setDailyDeptFilter] = useState<string>("all");
  const [selectedPR, setSelectedPR] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [chartVersion, setChartVersion] = useState<"others" | "mandatory">(
    "others",
  );

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/login");
      return;
    }
    try {
      setUser(JSON.parse(userStr));
    } catch {
      router.push("/login");
    }
  }, [router]);

  // Initial Filter Setup
  useEffect(() => {
    if (user && !canViewAllDepartments) {
      const deptId = String(user.department_id);
      setCatDeptFilter(deptId);
      setPendingDeptFilter(deptId);
      setDailyDeptFilter(deptId);
    }
  }, [user, canViewAllDepartments]);

  // Fetch Departments for Filters
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get("/budgeting/form-data");
        setDepartments(res.data.departments || []);
      } catch (error) {
        console.error("Failed to fetch departments", error);
      }
    };
    if (user && canViewAllDepartments) {
      fetchDepts();
    }
  }, [user, canViewAllDepartments]);

  // Fetch Dashboard Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Stats
        const statsRes = await api.express.get("/home/stats", { month, year });
        setStats(statsRes.data);

        // 2. Target vs Purchase Chart
        const tvpRes = await api.express.get("/home/chart/target-vs-purchase", { year });
        if (tvpRes.data) {
          const data = tvpRes.data;
          // Transform for Recharts
          const formatted = data.labels.map((label: string, i: number) => ({
            name: label,
            totalTarget: Number(data.targetAmounts[i] || 0),
            limit065: Number(data.limit065s[i] || 0),
            mandatory: Number(data.mandatoryPurchases[i] || 0),
            others: Number(data.othersPurchases[i] || 0),
            asset: Number(data.assetPurchases[i] || 0),
          }));
          setTargetVsPurchaseData(formatted);
        }

        // 3. Daily Trend Chart
        const dailyParams: any = { month, year };
        if (dailyDeptFilter !== "all") {
          dailyParams.department_id = dailyDeptFilter;
        }
        const dailyRes = await api.express.get("/home/chart/budget-purchases", dailyParams);
        if (dailyRes.data) {
          const data = dailyRes.data;
          const formatted = data.labels.map((label: string, i: number) => ({
            day: label,
            budget: Number(data.approvedBudgets[i] || 0),
            nonAssetPurchase: Number(data.approvedNonAssetPurchases?.[i] ?? data.approvedPurchases?.[i] ?? 0),
            assetPurchase: Number(data.approvedAssetPurchases?.[i] ?? 0),
          }));
          setBudgetPurchasesData(formatted);
        }

        // 4. Department Share Chart
        const deptRes = await api.express.get("/home/chart/budget-department", { month, year });
        if (deptRes.data) {
          const data = deptRes.data;
          const formatted = data.labels.map((label: string, i: number) => ({
            name: label,
            value: Number(data.data[i] || 0),
          }));
          setBudgetDepartmentData(formatted);
        }

        // 5. Budget by Category Chart
        const catParams: any = { month, year };
        if (catDeptFilter !== "all") {
          catParams.department_id = catDeptFilter;
        }
        const catRes = await api.express.get("/home/chart/budget-category", catParams);
        if (catRes.data) {
          const data = catRes.data;
          const formatted = data.labels.map((label: string, i: number) => ({
            name: label,
            value: Number(data.data[i] || 0),
          }));
          setBudgetCategoryData(formatted);
        }

        // 6. Pending PR List
        const pendParams: any = {};
        if (pendingDeptFilter !== "all") {
          pendParams.department_id = pendingDeptFilter;
        }
        const pendRes = await api.express.get("/home/pending-purchases", pendParams);
        setPendingPRs(pendRes.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, month, year, catDeptFilter, pendingDeptFilter, dailyDeptFilter]);

  const handleCardClick = (path: string) => {
    router.push(path);
  };

  if (!user && loading) return <LoadingState message="Memuat dashboard..." />;

  return (
    <div className="min-h-[85vh] flex flex-col p-6 space-y-8 animate-in fade-in duration-500 bg-gray-50">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-800">
            Dashboard Overview
          </h1>
          <p className="text-gray-500">
            Halo,{" "}
            <span className="font-semibold text-emerald-600">
              {user?.name || user?.fullname || "User"}
            </span>{" "}
            👋. Berikut ringkasan aktivitas budgeting Anda.
            <br />
          </p>
        </div>

        <div className="flex gap-2">
          <div className="w-40">
            <SearchableSelect
              label=""
              placeholder="Bulan"
              value={month}
              onChange={(val) => setMonth(parseInt(val.toString()))}
              options={Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({
                value: m,
                label: new Date(0, m - 1).toLocaleString("id-ID", {
                  month: "long",
                }),
              }))}
            />
          </div>
          <div className="w-32">
            <SearchableSelect
              label=""
              placeholder="Tahun"
              value={year}
              onChange={(val) => setYear(parseInt(val.toString()))}
              options={Array.from(
                { length: 4 },
                (_, i) => new Date().getFullYear() - 3 + i,
              ).map((y) => ({
                value: y,
                label: y.toString(),
              }))}
            />
          </div>
        </div>
      </div>

      {/* 1. STATS CARDS */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 ${canViewRemainingBudget ? "xl:grid-cols-5" : "xl:grid-cols-4"} gap-6`}
      >
        <StatsCard
          title="Approved Budget"
          value={formatCurrency(stats.approved_budget)}
          icon="DollarSign"
          gradient="from-emerald-400 to-emerald-600"
        />
        <StatsCard
          title="Total Purchase"
          value={formatCurrency(stats.purchases)}
          icon="ShoppingCart"
          gradient="from-amber-400 to-amber-600"
        />
        <StatsCard
          title="Total Asset"
          value={formatCurrency(stats.total_assets)}
          icon="Package"
          gradient="from-blue-400 to-blue-600"
        />
        {canViewRemainingBudget && (
          <StatsCard
            title="Remaining Budget"
            value={formatCurrency(stats.remaining_budget)}
            icon="Wallet"
            gradient="from-cyan-400 to-cyan-600"
          />
        )}
        <StatsCard
          title="Pending Approval"
          value={formatCurrency(stats.pending_purchases)}
          icon="Hourglass"
          gradient="from-rose-400 to-rose-600"
        />
      </div>

      {/* 2. CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Target vs Purchase (Full Width on mobile, half on large) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <LayoutGrid size={18} className="text-emerald-600" />
              Monitoring Purchase vs Target Sales ({year})
            </h3>

            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setChartVersion("others")}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  chartVersion === "others"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Pembelian Others
              </button>
              <button
                onClick={() => setChartVersion("mandatory")}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  chartVersion === "mandatory"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Pembelian Mandatory
              </button>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={targetVsPurchaseData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
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
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  tickFormatter={(val) => formatCompactNumber(val)}
                />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend />
                {chartVersion === "others" ? (
                  <>
                    <Bar
                      dataKey="others"
                      name="Pembelian Other"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                    <Bar
                      dataKey="asset"
                      name="Pembelian Asset"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                    <Line
                      type="monotone"
                      dataKey="limit065"
                      name="Batas Aman (0.65%)"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="5 5"
                    />
                  </>
                ) : (
                  <>
                    <Bar
                      dataKey="mandatory"
                      name="Pembelian Mandatory"
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                      barSize={40}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalTarget"
                      name="Target Sales"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="5 5"
                    />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Daily Trend */}
        {canViewRemainingBudget && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-800">
                Budget & Purchases Daily Trend
              </h3>
              <div className="w-48">
                <SearchableSelect
                  label=""
                  placeholder="Department"
                  value={dailyDeptFilter}
                  onChange={(val) => setDailyDeptFilter(val.toString())}
                  disabled={!canViewAllDepartments}
                  options={[
                    ...(canViewAllDepartments
                      ? [{ value: "all", label: "All Dept." }]
                      : []),
                    ...(canViewAllDepartments
                      ? departments.map((d) => ({
                          value: d.id,
                          label: d.department_name,
                        }))
                      : [
                          {
                            value: user?.department_id,
                            label:
                              user?.department?.department_name ||
                              "Departemen Anda",
                          },
                        ]),
                  ]}
                />
              </div>
            </div>
              <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={budgetPurchasesData}>
                  <defs>
                    <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPurchase" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorAsset" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="day" hide />
                  <YAxis
                    tickFormatter={(val) => formatCompactNumber(val)}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                  />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="budget"
                    name="Sisa Budget"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorBudget)"
                  />
                  <Area
                    type="monotone"
                    dataKey="nonAssetPurchase"
                    name="Pembelian Mandatory & Others"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPurchase)"
                  />
                  <Area
                    type="monotone"
                    dataKey="assetPurchase"
                    name="Pembelian Asset"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorAsset)"
                  />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Chart 3: Department Share */}
        {canViewAllDepartments && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-6">
              Budget Share by Department
            </h3>
            <div className="h-[300px] w-full flex justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={budgetDepartmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {budgetDepartmentData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => formatCurrency(Number(value))}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Chart 4: Category Share */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800">
              Budget Departement Share by Category
            </h3>
            <div className="w-48">
              <SearchableSelect
                label=""
                placeholder="Department"
                value={catDeptFilter}
                onChange={(val) => setCatDeptFilter(val.toString())}
                disabled={!canViewAllDepartments}
                options={[
                  ...(canViewAllDepartments
                    ? [{ value: "all", label: "All Dept." }]
                    : []),
                  ...(canViewAllDepartments
                    ? departments.map((d) => ({
                        value: d.id,
                        label: d.department_name,
                      }))
                    : [
                        {
                          value: user?.department_id,
                          label:
                            user?.department?.department_name ||
                            "Departemen Anda",
                        },
                      ]),
                ]}
              />
            </div>
          </div>
          <div className="h-[300px] w-full flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={budgetCategoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                >
                  {budgetCategoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value))}
                />
                <Legend
                  layout="horizontal"
                  align="center"
                  verticalAlign="bottom"
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. PENDING PR LIST */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <ShoppingCart size={18} className="text-emerald-600" />
              List Pending Purchase Request
            </h3>
            <div className="w-48">
              <SearchableSelect
                label=""
                placeholder="Department"
                value={pendingDeptFilter}
                onChange={(val) => setPendingDeptFilter(val.toString())}
                disabled={!canViewAllDepartments}
                options={[
                  ...(canViewAllDepartments
                    ? [{ value: "all", label: "All Dept." }]
                    : []),
                  ...(canViewAllDepartments
                    ? departments.map((d) => ({
                        value: d.id,
                        label: d.department_name,
                      }))
                    : [
                        {
                          value: user?.department_id,
                          label:
                            user?.department?.department_name ||
                            "Departemen Anda",
                        },
                      ]),
                ]}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Dept</th>
                  <th className="px-4 py-3">Requester</th>
                  <th className="px-4 py-3">Date</th>
                  {/* <th className="px-4 py-3 text-right">
                                        Total
                                    </th> */}
                  {/* <th className="px-4 py-3">Action</th> */}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingPRs.length > 0 ? (
                  pendingPRs.slice(0, 5).map((pr) => (
                    <tr
                      key={pr.id}
                      onClick={() => {
                        setSelectedPR(pr);
                        setIsDetailModalOpen(true);
                      }}
                      className="hover:bg-emerald-50 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-4 font-semibold text-gray-700">
                        {pr.reference}
                      </td>
                      <td className="px-4 py-4 text-gray-500">
                        {pr.department?.department_code || "-"}
                      </td>
                      <td className="px-4 py-4 text-gray-500">
                        {pr.user?.name || "-"}
                      </td>
                      <td className="px-4 py-4 text-gray-500">
                        {new Date(pr.date).toLocaleDateString("id-ID")}
                      </td>
                      {/* <td className="px-4 py-4 text-right font-bold text-emerald-600">
                                                {formatCurrency(
                                                    pr.total_amount,
                                                )}
                                            </td> */}
                      {/* <td className="px-4 py-4">
                                                <button
                                                    onClick={() =>
                                                        router.push(
                                                            "/budgeting/approval-request",
                                                        )
                                                    }
                                                    className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                >
                                                    Detail
                                                </button>
                                            </td> */}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-400 italic"
                    >
                      Tidak ada purchase request pending
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {pendingPRs.length > 5 && (
            <div className="mt-4 flex justify-center w-full">
              <button
                onClick={() => router.push("/budgeting/purchase-request")}
                className="w-full px-5 py-2 text-xs font-bold rounded-full 
                       bg-emerald-50 text-emerald-600 
                       hover:bg-emerald-600 hover:text-white 
                       transition-all shadow-sm"
              >
                Lihat PR lainnya →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Module Grid (Previously Implemented) */}
      {/* <div>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
                    <h2 className="text-lg font-bold text-gray-800">
                        Akses Modul Cepat
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {STATIC_MENUS.map((menu, index) => (
                        <div
                            key={menu.id}
                            onClick={() => handleCardClick(menu.path)}
                            className="group relative bg-white p-6 rounded-3xl border border-gray-100 cursor-pointer shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-linear-to-br from-transparent to-emerald-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                            <div className="absolute -bottom-6 -right-6 text-gray-50 opacity-60 group-hover:opacity-40 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">
                                <IconRenderer name={menu.icon} size={120} />
                            </div>

                            <div className="relative z-10 flex flex-col h-full justify-between min-h-[140px]">
                                <div>
                                    <div className="w-12 h-12 mb-4 rounded-xl flex items-center justify-center transition-all shadow-sm duration-300 group-hover:scale-110 group-hover:text-white bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600">
                                        <IconRenderer
                                            name={menu.icon}
                                            size={24}
                                        />
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-800 transition-colors mb-1 group-hover:text-emerald-700">
                                        {menu.name}
                                    </h3>
                                    <p className="text-sm">
                                        {menu.description}
                                    </p>
                                </div>

                                <div className="mt-4 flex items-center text-xs font-bold opacity-60 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300 uppercase tracking-wider text-emerald-600">
                                    Buka{" "}
                                    <ArrowRight size={14} className="ml-1.5" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div> */}

      <PurchaseDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        purchase={selectedPR}
      />
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon,
  gradient,
}: {
  title: string;
  value: string;
  icon: string;
  gradient: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex items-center gap-4 hover:shadow-lg transition-shadow duration-300">
      <div
        className={`w-14 h-14 rounded-2xl bg-linear-to-br ${gradient} flex items-center justify-center text-white shrink-0 shadow-md`}
      >
        <IconRenderer name={icon} size={28} />
      </div>
      <div>
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">
          {title}
        </p>
        <h3 className="text-xl font-bold text-gray-800">{value}</h3>
      </div>
    </div>
  );
}
