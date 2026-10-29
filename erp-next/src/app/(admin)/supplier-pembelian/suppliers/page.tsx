"use client";

import { useState, useEffect } from "react";
import TablePagination from "@/components/ui/TablePagination";
import {
  Plus,
  Search,
  Truck,
  Edit2,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Package,
  Archive,
  ShieldAlert,
  Coins,
  Tags,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import SupplierModal from "@/components/master-data/SupplierModal";
import usePermission from "@/hooks/usePermission";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import api from "@/lib/api";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";

type Supplier = {
  id: number;
  supplier_name: string;
  supplier_code?: string;
  supplier_email: string;
  supplier_phone: string;
  fax?: string;
  contact_person?: string;
  city: string;
  region?: string;
  country: string;
  address: string;
  npwp?: string;
  ppn_id?: number;
  pph_id?: number;
  currency_id?: number;
  group_id?: number;
  payment_term_id?: number;
  is_active: boolean | number;
  ppn?: { name: string; rate: number };
  pph?: { name: string; rate: number };
  currency?: { code: string; symbol: string };
  group_name?: string;
  payment_term_name?: string;
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );

  const { can } = usePermission();
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

  const fetchSuppliers = async (currentPage = 1) => {
    setLoading(true);
    try {
      const res = await api.express.get("/suppliers", {
        page: currentPage,
        search: search,
      });
      setSuppliers(res.data.data || res.data);
      setPage(res.data.current_page || 1);
      setTotalPages(res.data.last_page || 1);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchSuppliers(1), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleAdd = () => {
    setSelectedSupplier(null);
    setIsModalOpen(true);
  };

  const handleEdit = (sup: Supplier) => {
    setSelectedSupplier(sup);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    showConfirm(
      "Delete Supplier?",
      "Are you sure you want to delete this supplier? This action cannot be undone.",
      () => performDelete(id),
      "Delete Now",
      "Keep it",
    );
  };

  const performDelete = async (id: number) => {
    setActionLoading(true);
    try {
      await api.express.delete(`/suppliers/${id}`);
      showSuccess("Deleted!", "Supplier has been deleted successfully.");
      fetchSuppliers(page);
    } catch (error: any) {
      showError("Delete Failed", error.message || "Failed to delete.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 min-h-[85vh] animate-in fade-in duration-500">
      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchSuppliers(page);
          showSuccess(
            "Success!",
            selectedSupplier
              ? "Supplier updated successfully."
              : "Supplier created successfully.",
          );
        }}
        supplierToEdit={selectedSupplier}
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

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <Truck className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Data <span className="text-emerald-600">Supplier</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Kelola database supplier dan informasi kontak mitra bisnis Anda.
          </p>
        </div>
        
        {can("create_suppliers") && (
          <button
            onClick={handleAdd}
            className="group relative flex items-center gap-3 bg-gray-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 overflow-hidden"
          >
            <Plus size={20} strokeWidth={3} />
            <span>Tambah Supplier Baru</span>
          </button>
        )}
      </div>

      <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 mb-6 hide-scrollbar">
        <StatCard icon={<Truck size={20} />} iconBgColor="bg-emerald-50" iconColor="text-emerald-600" label="TOTAL SUPPLIER" value={suppliers.length} />
        <StatCard icon={<CheckCircle2 size={20} />} iconBgColor="bg-blue-50" iconColor="text-blue-600" label="ACTIVE" value={suppliers.filter(s => s.is_active).length} />
        <StatCard icon={<XCircle size={20} />} iconBgColor="bg-red-50" iconColor="text-red-600" label="INACTIVE" value={suppliers.filter(s => !s.is_active).length} />
      </div>

      <div className="mb-8">
        <FilterBar 
          searchPlaceholder="Cari supplier berdasarkan nama atau kode..." 
          searchValue={search} 
          onSearchChange={setSearch} 
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Supplier
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Contact Info
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Location
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Details
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 flex-1">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-4">
                    Loading...
                  </td>
                </tr>
              ) : suppliers.length > 0 ? (
                suppliers.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {s.supplier_name}
                      </div>
                      <div className="text-xs text-gray-500 font-mono flex gap-1">
                        <span>{s.supplier_code}</span>
                        {s.group_name && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">
                            {s.group_name}
                          </span>
                        )}
                      </div>
                      {s.contact_person && (
                        <div className="text-xs text-gray-500 mt-1">
                          CP: {s.contact_person}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail size={14} className="text-gray-400" />{" "}
                        {s.supplier_email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Phone size={14} className="text-gray-400" />{" "}
                        {s.supplier_phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPin size={14} className="text-gray-400 mt-0.5" />
                        <div>
                          <div>
                            {s.city}, {s.country}
                          </div>
                          <div className="text-xs text-gray-400 truncate max-w-[150px]">
                            {s.address}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {s.currency && (
                        <div className="text-xs border border-gray-200 rounded px-1.5 py-0.5 inline-block mr-1">
                          {s.currency.code}
                        </div>
                      )}
                      {s.ppn && (
                        <div className="text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5 inline-block mr-1">
                          PPN: {s.ppn.rate}%
                        </div>
                      )}
                      {s.payment_term_name && (
                        <div className="text-xs bg-orange-50 text-orange-700 rounded px-1.5 py-0.5 inline-block mt-1">
                          Term: {s.payment_term_name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {s.is_active ? (
                        <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider border border-gray-200">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {can("edit_suppliers") && (
                          <button
                            onClick={() => handleEdit(s)}
                            className="p-1.5 text-emerald-500 hover:text-emerald-600 rounded-lg"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {can("delete_suppliers") && (
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="p-1.5 text-red-500 hover:text-red-600 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No suppliers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={page}
          totalPages={totalPages}
          totalItems={suppliers.length === 10 ? page * 10 + 1 : (page - 1) * 10 + suppliers.length} // Approximation since API doesn't return total
          onPageChange={fetchSuppliers}
        />
      </div>
    </div>
  );
}
