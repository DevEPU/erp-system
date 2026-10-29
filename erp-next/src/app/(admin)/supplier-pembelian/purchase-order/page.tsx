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
  FileText,
  Truck,
  ClipboardList,
} from "lucide-react";
import usePermission from "@/hooks/usePermission";
import StatusModal from "@/components/ui/StatusModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import api from "@/lib/api";
import PurchaseOrderModal from "@/components/supplier-pembelian/PurchaseOrderModal";
import PrintButton from "@/components/ui/PrintButton";

export default function PurchaseOrderPage() {
  const { can, user } = usePermission();
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [canViewAllDepartments, setCanViewAllDepartments] = useState(false);
  const [userDepartmentId, setUserDepartmentId] = useState<number | null>(null);
  const [isPermissionInitialized, setIsPermissionInitialized] = useState(false);

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

  useEffect(() => {
    if (user) {
      const isSuperAdmin = user.role_names?.includes("Super Admin");
      const hasAllDeptPermission = user.permissions?.includes("all_departments");
      const hasAccess = isSuperAdmin || hasAllDeptPermission;

      setCanViewAllDepartments(hasAccess);
      setUserDepartmentId(user.department_id || null);
      setIsPermissionInitialized(true);
    }
  }, [user]);

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/purchase-orders");
      setPurchaseOrders(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPermissionInitialized) {
      fetchPurchaseOrders();
    }
  }, [isPermissionInitialized]);

  const handleDelete = (id: number) => {
    showConfirm(
      "Delete Purchase Order?",
      "Are you sure you want to delete this PO? This action cannot be revoked.",
      () => performDelete(id),
      "Delete Now",
      "Keep it",
    );
  };

  const performDelete = async (id: number) => {
    setActionLoading(true);
    try {
      await api.express.delete(`/purchase-orders/${id}`);
      showSuccess("Deleted!", "Purchase Order has been deleted.");
      fetchPurchaseOrders();
    } catch (e: any) {
      showError("Delete Failed", e.message || "Failed to delete.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredPOs = purchaseOrders.filter((po) => {
    const matchesSearch =
      po.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.department_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <ClipboardList className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Purchase <span className="text-emerald-600">Order</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Kelola pesanan pembelian barang kepada supplier berdasarkan PR yang telah disetujui.
          </p>
        </div>

        {can("create_purchase_orders") && (
          <button
            onClick={() => {
              setSelectedPO(null);
              setIsModalOpen(true);
            }}
            className="group relative flex items-center gap-3 bg-gray-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 overflow-hidden"
          >
            <Plus size={20} strokeWidth={3} />
            <span>Buat PO Baru</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform">
            <CreditCard size={24} />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total cost (all PO)</p>
          <p className="text-xl font-black text-gray-800">
            Rp {filteredPOs.reduce((acc, p) => acc + parseFloat(p.total_amount), 0).toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform">
            <FileText size={24} />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Orders</p>
          <p className="text-xl font-black text-gray-800">
            {filteredPOs.filter(p => !p.is_closed).length} PO 
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform">
            <Clock size={24} />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pending GR</p>
          <p className="text-xl font-black text-gray-800">
            {filteredPOs.filter(p => !p.is_closed && p.status?.toLowerCase() === 'pending').length} PO
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform">
            <Truck size={24} />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Received</p>
          <p className="text-xl font-black text-gray-800">
            {filteredPOs.filter(p => p.status?.toLowerCase() === 'received').length} PO
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
          <input
            type="text"
            placeholder="Search by reference, supplier, or department..."
            className="w-full pl-14 pr-6 py-4 rounded-2xl border-none bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-bold transition-all placeholder:text-gray-400 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">PO Reference</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Dept</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded-lg w-full"></div></td>
                  </tr>
                ))
              ) : filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold italic">No Purchase Orders found.</td>
                </tr>
              ) : (
                filteredPOs.map((po) => (
                  <tr key={po.id} className="hover:bg-emerald-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{po.reference}</span>
                        <span className="text-[10px] text-gray-400 font-bold">{po.date}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="font-medium text-gray-700">{po.supplier_name}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                      {po.department_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">
                      Rp {parseFloat(po.total_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide
                        ${po.status?.toLowerCase() === 'received' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                         {po.status}
                       </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                       <div className="flex justify-end gap-2 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <PrintButton
                            moduleKey="purchase_order"
                            moduleName="Purchase Order"
                            data={po}
                          />
                          <button
                            onClick={() => {
                              setSelectedPO(po);
                              setIsModalOpen(true);
                            }}
                            className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm"
                            title="Edit Data"
                          >
                            <Edit2 size={16} strokeWidth={3} />
                          </button>
                         <button
                           onClick={() => handleDelete(po.id)}
                           className="p-2 text-red-500 hover:text-red-600 rounded-lg transition-colors"
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
        <TablePagination totalItems={filteredPOs.length} />
      </div>

      <PurchaseOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchPurchaseOrders();
          showSuccess("Success!", selectedPO ? "PO Updated." : "PO Created.");
        }}
        poToEdit={selectedPO}
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
    </div>
  );
}
