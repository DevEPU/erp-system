"use client";

import { useState, useEffect } from "react";
import TablePagination from "@/components/ui/TablePagination";
import {
  Plus,
  Search,
  PackagePlus,
  CheckCircle2,
  FileInput,
  CheckSquare,
  Pencil,
  Trash2,
  List,
  Clock,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  FileX,
  Filter,
  Package,
  Archive,
  Coins,
  Truck,
  Tags,
} from "lucide-react";
import usePermission from "@/hooks/usePermission";
import CreateRequestModal from "@/components/product-requests/CreateRequestModal";
import VerifyRequestModal from "@/components/product-requests/VerifyRequestModal";
import EditRequestModal from "@/components/product-requests/EditRequestModal";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import api from "@/lib/api";
import ProductRequestSortFilterModal from "@/components/master-data/ProductRequestSortFilterModal";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";

type ProductRequest = {
  id: number;
  product_name: string;
  product_code: string | null;
  product_unit: string;
  is_asset: boolean | number;
  is_mandatory: boolean | number;
  status: string; // pending, approved, rejected
  is_verify: boolean | number;
  product_price: number | null;
  category?: { category_name: string };
  supplier?: { supplier_name: string };
  creator?: { name: string };
  created_at: string;
  current_approvers?: string[];
  product_id?: number | null;
};

export default function ProductRequestsPage() {
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [stats, setStats] = useState({
    total_requests: 0,
    total_pending: 0,
    total_approved: 0,
    total_rejected: 0,
    total_verified: 0,
    total_unverified: 0,
    total_input: 0,
    total_not_input: 0,
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [verifyFilter, setVerifyFilter] = useState("all");
  const [inputFilter, setInputFilter] = useState("all");
  const [sortFilter, setSortFilter] = useState("newest");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ProductRequest | null>(
    null,
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

  const { can } = usePermission();

  const fetchStats = async () => {
    try {
      const res = await api.express.get("/product-requests/stats");
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchRequests = async (currentPage = 1) => {
    setLoading(true);
    try {
      const res = await api.express.get("/product-requests", {
        page: currentPage,
        search: search,
        status: statusFilter,
        is_verify: verifyFilter,
        is_input: inputFilter,
        sort: sortFilter,
      });
      setRequests(res.data.data);
      setPage(res.data.current_page);
      setTotalPages(res.data.last_page);
    } catch (error) {
      console.error("Failed to fetch requests", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRequests(1);
      fetchStats();
    }, 500);
    return () => clearTimeout(timer);
  }, [search, statusFilter, verifyFilter, inputFilter, sortFilter]);

  useEffect(() => {
    if (page > 1 || requests.length > 0) {
      fetchRequests(page);
    }
  }, [page]);

  const activeFilterCount = [
    statusFilter !== "all",
    verifyFilter !== "all",
    inputFilter !== "all",
    sortFilter !== "newest",
  ].filter(Boolean).length;

  const handleInputToProduct = (id: number) => {
    showConfirm(
      "Input Data?",
      "Apakah anda yakin ingin menginput data ini ke Master Produk?",
      () => performInput(id),
      "Ya, Input",
      "Batal",
    );
  };

  const performInput = async (id: number) => {
    setActionLoading(true);
    try {
      await api.express.post(`/product-requests/${id}/input`);
      showSuccess("Berhasil!", "Data berhasil diinput ke Master Produk.");
      fetchRequests(page);
      fetchStats();
    } catch (error: any) {
      console.error(error);
      showError(
        "Gagal Menginput",
        error.message || "Terjadi kesalahan saat menginput data.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    showConfirm(
      "Hapus Request?",
      "Apakah anda yakin ingin menghapus request ini? Tindakan ini tidak dapat dibatalkan.",
      () => performDelete(id),
      "Ya, Hapus",
      "Batal",
    );
  };

  const performDelete = async (id: number) => {
    setActionLoading(true);
    try {
      await api.express.delete(`/product-requests/${id}`);
      showSuccess("Terhapus!", "Request berhasil dihapus.");
      fetchRequests(page);
      fetchStats();
    } catch (error: any) {
      console.error(error);
      showError("Gagal Menghapus", error.message || "Gagal menghapus request.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <StatusModal
        isOpen={isStatusModalOpen}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        onConfirm={modalOnConfirm}
        onClose={closeModal}
        isLoading={isActionLoading}
      />

      <CreateRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchRequests(page);
          fetchStats();
          showSuccess(
            "Berhasil Buat Request",
            "Request produk berhasil dibuat dan menunggu approval.",
          );
        }}
      />

      <VerifyRequestModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        onSuccess={() => {
          fetchRequests(page);
          fetchStats();
          showSuccess(
            "Verifikasi Berhasil",
            "Data request telah diverifikasi.",
          );
        }}
        requestToVerify={selectedRequest}
      />

      <EditRequestModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          fetchRequests(page);
          fetchStats();
          showSuccess("Update Berhasil", "Data request berhasil diperbarui.");
        }}
        request={selectedRequest}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <PackagePlus className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Product <span className="text-emerald-600">Request</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Kelola dan pantau pengajuan pendaftaran produk baru ke dalam sistem.
          </p>
        </div>

        {can("create_request_products") && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="group relative flex items-center gap-3 bg-gray-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 overflow-hidden"
          >
            <Plus size={20} strokeWidth={3} />
            <span>Buat Request Baru</span>
          </button>
        )}
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<List size={20} />} iconBgColor="bg-gray-100" iconColor="text-gray-600" label="TOTAL REQUESTS" value={stats.total_requests} />
        <StatCard icon={<Clock size={20} />} iconBgColor="bg-yellow-50" iconColor="text-yellow-600" label="PENDING" value={stats.total_pending} />
        <StatCard icon={<CheckCircle2 size={20} />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" label="APPROVED" value={stats.total_approved} />
        <StatCard icon={<XCircle size={20} />} iconBgColor="bg-red-50" iconColor="text-red-600" label="REJECTED" value={stats.total_rejected} />
        <StatCard icon={<ShieldCheck size={20} />} iconBgColor="bg-blue-50" iconColor="text-blue-600" label="VERIFIED" value={stats.total_verified} />
        <StatCard icon={<FileInput size={20} />} iconBgColor="bg-teal-50" iconColor="text-teal-600" label="INPUTTED" value={stats.total_input} />
      </div>

      <div className="mb-8">
        <FilterBar 
          searchPlaceholder="Search request by name or user..." 
          searchValue={search} 
          onSearchChange={setSearch} 
          onFilterClick={() => setIsFilterModalOpen(true)}
          filterBadgeCount={activeFilterCount}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white">
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Product Name
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Request Details
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                  Status
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                  Verified
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                  Input Status
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 flex-1">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-6 py-5.5">
                        <div className="h-4 bg-gray-100 rounded-lg w-full"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : requests.length > 0 ? (
                requests.map((req) => (
                  <tr
                    key={req.id}
                    className={`hover:bg-emerald-50/50 transition-colors group cursor-pointer ${req.product_id ? "bg-emerald-50/30" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-gray-900">
                          {req.product_name}
                        </div>
                        {req.product_id && (
                          <span className="px-1.5 py-0.5 rounded-lg text-[10px] font-black bg-emerald-600 text-white uppercase tracking-wider">
                            LINKED
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-gray-400 capitalize mt-0.5">
                        Request By: {req.creator?.name || "Unknown"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-sm font-medium text-gray-600">
                          {req.product_unit}
                        </span>
                        {!!req.is_asset && (
                          <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-tighter border border-blue-100">
                            ASSET
                          </span>
                        )}
                        {!!req.is_mandatory && (
                          <span className="px-2 py-0.5 rounded-lg bg-orange-50 text-orange-600 text-[9px] font-black uppercase tracking-tighter border border-orange-100">
                            MANDATORY
                          </span>
                        )}
                      </div>
                      {!!req.is_verify && (
                        <div className="mt-1 text-[10px] text-gray-400 font-mono">
                          {req.product_code || "-"} • Rp{" "}
                          {req.product_price?.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm
                          ${
                            req.status.toLowerCase() === "approved"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : req.status.toLowerCase() === "rejected"
                                ? "bg-red-100 text-red-700 border-red-200"
                                : "bg-yellow-100 text-yellow-700 border-yellow-200"
                          }`}
                        >
                          {req.status}
                        </span>
                        {req.status.toLowerCase() === "pending" && (
                          <span className="text-[9px] text-gray-400 font-bold max-w-[120px]">
                            Waiting Approval:{" "}
                            {req.current_approvers?.join(", ") || "-"}
                          </span>
                        )}
                        {req.status.toLowerCase() === "approved" &&
                          !req.is_verify && (
                            <span className="text-[9px] text-blue-500 font-bold">
                              Waiting Verify: Purchasing
                            </span>
                          )}
                        {req.status.toLowerCase() === "approved" &&
                          !!req.is_verify &&
                          !req.product_id && (
                            <span className="text-[9px] text-teal-500 font-bold capitalize tracking-tight">
                              Waiting Input: Master Data
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        {req.is_verify ? (
                          <div className="p-1 bg-emerald-100 text-emerald-600 rounded-full shadow-sm">
                            <CheckCircle2 size={16} />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      {req.product_id ? (
                        <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                          Sudah Diinput
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-lg bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border border-gray-100">
                          Belum Diinput
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {can("verify_request_products") &&
                          req.status.toLowerCase() === "approved" && (
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setIsVerifyModalOpen(true);
                              }}
                              className="p-2 text-emerald-500 hover:text-emerald-600 rounded-lg transition-colors"
                              title="Verify Data"
                            >
                              <CheckSquare size={18} />
                            </button>
                          )}

                        {req.product_id ? (
                          <button
                            onClick={() =>
                              window.open(
                                `/master-data/products?search=${req.product_name || req.product_code}`,
                                "_blank",
                              )
                            }
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="View Product"
                          >
                            <PackagePlus size={18} />
                          </button>
                        ) : (
                          <>
                            {can("input_request_product") &&
                              req.status.toLowerCase() === "approved" &&
                              !!req.is_verify && (
                                <button
                                  onClick={() => handleInputToProduct(req.id)}
                                  className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                  title="Input to Product Request"
                                >
                                  <FileInput size={18} />
                                </button>
                              )}
                          </>
                        )}

                        {req.status.toLowerCase() === "pending" &&
                          can("create_request_products") && (
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setIsEditModalOpen(true);
                              }}
                              className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                              title="Edit Request"
                            >
                              <Pencil size={18} />
                            </button>
                          )}

                        {can("create_request_products") && (
                          <button
                            onClick={() => handleDelete(req.id)}
                            className="p-2 text-red-500 hover:text-red-600 rounded-lg transition-colors"
                            title="Delete Request"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-20 text-center text-gray-400 font-bold italic border-b border-gray-50"
                  >
                    No request found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={page}
          totalPages={totalPages}
          totalItems={stats.total_requests}
          onPageChange={setPage}
        />
      </div>

      <ProductRequestSortFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        sortFilter={sortFilter}
        setSortFilter={setSortFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        verifyFilter={verifyFilter}
        setVerifyFilter={setVerifyFilter}
        inputFilter={inputFilter}
        setInputFilter={setInputFilter}
      />
    </div>
  );
}
