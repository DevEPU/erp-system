"use client";

import { useState, useEffect } from "react";
import TablePagination from "@/components/ui/TablePagination";
import {
  ShoppingCart,
  Calendar,
  Building2,
  DollarSign,
  Edit2,
  Loader2,
  AlertCircle,
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";
import UpdateActualModal from "@/components/budget/UpdateActualModal";
import usePermission from "@/hooks/usePermission";
import api from "@/lib/api";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";

export default function UpdateActualPage() {
  const { can, loading: permissionLoading } = usePermission();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("Unpaid");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date_desc");
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    if (!permissionLoading && can("update_prices_actual")) {
      fetchPurchases();
    } else if (!permissionLoading) {
      setLoading(false);
    }
  }, [permissionLoading, filterStatus]);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await api.get("/purchases/unpaid-approved", {
        status: filterStatus,
      });
      setPurchases(res.data.data || []);
    } catch (error) {
      console.error("Failed to fetch purchases:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (purchase: any) => {
    setSelectedPurchase(purchase);
    setModalOpen(true);
  };

  const handleSuccess = () => {
    setModalOpen(false);
    setSelectedPurchase(null);
    fetchPurchases();
  };


  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await api.get("/budgeting/form-data");
      setDepartments(res.data.departments || []);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    }
  };

  // Apply filters
  const filteredPurchases = purchases
    .filter((purchase) => {
      // Search filter
      if (
        searchQuery &&
        !purchase.reference.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      // Department filter
      if (
        filterDept !== "all" &&
        String(purchase.department?.department_name) !== filterDept
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date_desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "date_asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "amount_desc":
          return parseFloat(b.total_amount) - parseFloat(a.total_amount);
        case "amount_asc":
          return parseFloat(a.total_amount) - parseFloat(b.total_amount);
        default:
          return 0;
      }
    });

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (permissionLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="animate-spin" size={24} />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!can("update_prices_actual")) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertCircle className="text-red-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-900 mb-2">
                Akses Ditolak
              </h2>
              <p className="text-sm text-red-700">
                Anda tidak memiliki izin untuk mengakses halaman Update Actual.
                Silakan hubungi administrator untuk mendapatkan akses.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <RefreshCw className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Update <span className="text-emerald-600">Actual</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Update harga aktual untuk Purchase Request yang sudah disetujui untuk akurasi laporan keuangan.
          </p>
        </div>
      </div>

      {/* Mock Stat Cards */}
      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<RefreshCw size={20} />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" label="TOTAL (FILTERED)" value={purchases.length} />
        <StatCard icon={<CheckCircle size={20} />} iconBgColor="bg-blue-50" iconColor="text-blue-600" label="PAID / ACTUAL" value={purchases.filter(p => p.payment_status === 'Paid').length} />
        <StatCard icon={<XCircle size={20} />} iconBgColor="bg-red-50" iconColor="text-red-600" label="UNPAID / NOT ACTUAL" value={purchases.filter(p => p.payment_status !== 'Paid').length} />
      </div>

      {/* Filters */}
      <div className="mb-8">
        <FilterBar 
          searchPlaceholder="Cari reference..." 
          searchValue={searchQuery} 
          onSearchChange={setSearchQuery} 
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white">
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                  Departemen
                </th>
                <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-wider">
                  Total Estimasi
                </th>
                <th className="px-6 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 flex-1">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <Loader2 className="animate-spin" size={20} />
                      <span>Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    Tidak ada data PR yang perlu diupdate
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => (
                  <tr
                    key={purchase.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={16} className="text-gray-400" />
                        {formatDate(purchase.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <ShoppingCart size={16} className="text-blue-500" />
                        <span className="font-bold text-sm text-gray-900">
                          {purchase.reference}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building2 size={16} className="text-gray-400" />
                        {purchase.department?.department_name || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2 text-sm font-bold text-gray-900">
                        <DollarSign size={16} className="text-green-500" />
                        Rp{" "}
                        {parseFloat(purchase.total_amount).toLocaleString(
                          "id-ID",
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold">
                        {purchase.payment_status === "Paid" ? (
                          <>
                            <CheckCircle size={14} className="text-green-600" />
                            <span className="text-green-700 bg-green-50 px-2 py-1 rounded-full">
                              Paid/Actual
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle size={14} className="text-orange-600" />
                            <span className="text-orange-700 bg-orange-50 px-2 py-1 rounded-full">
                              Unpaid/Not Actual
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleUpdate(purchase)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95"
                      >
                        <Edit2 size={14} />
                        Update
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination totalItems={purchases.length} />
      </div>

      {/* Modal */}
      <UpdateActualModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedPurchase(null);
        }}
        purchase={selectedPurchase}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
