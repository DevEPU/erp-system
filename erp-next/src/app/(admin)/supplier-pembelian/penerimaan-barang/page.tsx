"use client";

import { useState, useEffect } from "react";
import TablePagination from "@/components/ui/TablePagination";
import {
  Search,
  Plus,
  Truck,
  FileText,
  Clock,
  CircleCheckBig,
  Package,
  Trash2,
} from "lucide-react";
import usePermission from "@/hooks/usePermission";
import api from "@/lib/api";
import GoodsReceiptModal from "@/components/supplier-pembelian/GoodsReceiptModal";
import { useStatusModal } from "@/hooks/useStatusModal";
import StatusModalUI from "@/components/ui/StatusModal";
import PrintButton from "@/components/ui/PrintButton";

export default function GoodsReceiptPage() {
  const { user } = usePermission();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGR, setSelectedGR] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
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
      setIsPermissionInitialized(true);
    }
  }, [user]);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/goods-receipts");
      setReceipts(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPermissionInitialized) {
      fetchReceipts();
    }
  }, [isPermissionInitialized]);

  const handleDelete = (id: number) => {
    showConfirm(
      "Delete Goods Receipt?",
      "Deleting this will reverse the stock addition. Proceed?",
      () => performDelete(id),
      "Yes, Delete",
      "Cancel"
    );
  };

  const performDelete = async (id: number) => {
    setActionLoading(true);
    try {
      await api.express.delete(`/goods-receipts/${id}`);
      showSuccess("Deleted!", "Goods Receipt deleted and stock restored.");
      fetchReceipts();
    } catch (e: any) {
      showError("Delete Failed", e.message || "Failed to delete.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredReceipts = receipts.filter((gr) => {
    const matchesSearch =
      gr.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gr.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gr.po_reference?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <Truck className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Penerimaan <span className="text-emerald-600">Barang</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Catat dan verifikasi barang yang diterima dari supplier berdasarkan Purchase Order.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedGR(null);
            setIsModalOpen(true);
          }}
          className="group relative flex items-center gap-3 bg-gray-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 overflow-hidden"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Terima Barang Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform">
            <Package size={24} />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Receipts</p>
          <p className="text-xl font-black text-gray-800">{filteredReceipts.length} GR</p>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform">
            <FileText size={24} />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Today&apos;s Receipts</p>
          <p className="text-xl font-black text-gray-800">
            {filteredReceipts.filter(r => r.date === new Date().toISOString().split('T')[0]).length} GR
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform">
            <Clock size={24} />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status Pending</p>
          <p className="text-xl font-black text-gray-800">0 GR</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform">
            <CircleCheckBig size={24} />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Stock Updated</p>
          <p className="text-xl font-black text-gray-800">{filteredReceipts.length} Finished</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
          <input
            type="text"
            placeholder="Search by BPB reference, PO number, or supplier name..."
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
                <th className="px-6 py-4">Receipt Ref</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">From PO</th>
                <th className="px-6 py-4">Date</th>
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
              ) : filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold italic">No Goods Receipts found.</td>
                </tr>
              ) : (
                filteredReceipts.map((gr) => (
                  <tr key={gr.id} className="hover:bg-emerald-50/50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-gray-900">{gr.reference}</td>
                    <td className="px-6 py-4 font-medium text-gray-700">{gr.supplier_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">#{gr.po_reference || '-'}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-400">{gr.date}</td>
                    <td className="px-6 py-4">
                       <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                        {gr.status}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <PrintButton
                           moduleKey="goods_receipt"
                           moduleName="Penerimaan Barang"
                           data={{
                             ...gr,
                             reference: gr.reference || `#GR-${gr.id}`,
                             supplier_name: gr.supplier_name || "-",
                             po_reference: gr.po_reference || "-",
                             date: gr.date || "-",
                             status: gr.status || "Received",
                             items: gr.items || gr.details || [],
                           }}
                         />
                         <button
                           onClick={() => handleDelete(gr.id)}
                           className="p-2 text-red-500 hover:text-red-600 rounded-lg transition-colors shadow-sm"
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
        <TablePagination totalItems={filteredReceipts.length} />
      </div>

      <GoodsReceiptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchReceipts();
          showSuccess("Success!", "Goods received and stock updated.");
        }}
        grToEdit={selectedGR}
        userDepartmentId={user?.department_id}
      />
      
      <StatusModalUI
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
