"use client";

import { useState, useEffect } from "react";
import TablePagination from "@/components/ui/TablePagination";
import {
  Search,
  Plus,
  Receipt,
  FileText,
  Clock,
  CircleCheckBig,
  AlertCircle,
  Trash2,
  Calendar,
} from "lucide-react";
import usePermission from "@/hooks/usePermission";
import api from "@/lib/api";
import { useStatusModal } from "@/hooks/useStatusModal";
import StatusModalUI from "@/components/ui/StatusModal";
import PurchaseInvoiceModal from "@/components/supplier-pembelian/PurchaseInvoiceModal";
import PrintButton from "@/components/ui/PrintButton";

export default function PurchaseInvoicePage() {
  const { user } = usePermission();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPI, setSelectedPI] = useState<any | null>(null);
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

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/purchase-invoices");
      setInvoices(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPermissionInitialized) {
      fetchInvoices();
    }
  }, [isPermissionInitialized]);

  const handleDelete = (id: number) => {
    showConfirm(
      "Delete Invoice?",
      "Deleting this invoice will also reverse its GL journal entries. Proceed?",
      () => performDelete(id),
      "Yes, Revoke Invoice",
      "Cancel"
    );
  };

  const performDelete = async (id: number) => {
    setActionLoading(true);
    try {
      await api.express.delete(`/purchase-invoices/${id}`);
      showSuccess("Success", "Invoice and journal entry have been revoked.");
      fetchInvoices();
    } catch (e: any) {
      showError("Error", e.message || "Failed to delete invoice.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((pi) => {
    const matchesSearch =
      pi.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pi.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pi.gr_reference?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <Receipt className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Faktur <span className="text-emerald-600">Pembelian</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Pantau dan proses faktur tagihan dari supplier berdasarkan penerimaan barang.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedPI(null);
            setIsModalOpen(true);
          }}
          className="group relative flex items-center gap-3 bg-gray-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 overflow-hidden"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Buat Faktur Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform">
            <Receipt size={24} />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Payables</p>
          <p className="text-xl font-black text-gray-800">
            Rp {filteredInvoices.reduce((acc, p) => acc + parseFloat(p.due_amount), 0).toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform">
            <AlertCircle size={24} />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Overdue Invoices</p>
          <p className="text-xl font-black text-gray-800">
            {filteredInvoices.filter(i => new Date(i.due_date) < new Date() && i.status !== 'Paid').length} Overdue
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform">
            <Clock size={24} />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Awaiting Payment</p>
          <p className="text-xl font-black text-gray-800">
            {filteredInvoices.filter(i => i.status === 'Unpaid').length} Invoices
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform text-white">
             <CircleCheckBig size={24} className="text-blue-600" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Settled Bills</p>
          <p className="text-xl font-black text-gray-800">
            {filteredInvoices.filter(i => i.status === 'Paid').length} Paid
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
          <input
            type="text"
            placeholder="Search by invoice reference, GR, or supplier..."
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
                <th className="px-6 py-4 text-left">Invoice Ref / Date</th>
                <th className="px-6 py-4 text-left">Supplier Name</th>
                <th className="px-4 py-4 text-center">Due Date</th>
                <th className="px-6 py-4 text-right">Total Amount</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right pr-10">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                     <td colSpan={6} className="px-6 py-5"><div className="h-4 bg-gray-100 rounded-lg w-full"></div></td>
                  </tr>
                ))
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold italic">No Purchase Invoices found.</td>
                </tr>
              ) : (
                filteredInvoices.map((pi) => (
                  <tr key={pi.id} className="hover:bg-emerald-50/50 transition-colors group">
                    <td className="px-6 py-4">
                       <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{pi.reference}</span>
                          <span className="text-[10px] text-gray-400 font-bold">{pi.date}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col">
                          <span className="font-medium text-gray-700">{pi.supplier_name}</span>
                          <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter">GR: #{pi.gr_reference || 'MANUAL'}</span>
                       </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                       <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black border
                         ${new Date(pi.due_date) < new Date() && pi.status !== 'Paid' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                          <Calendar size={12} />
                          {pi.due_date}
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap font-black text-gray-900">
                      Rp {parseFloat(pi.total_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border
                        ${pi.status === 'Paid' ? 'bg-emerald-500 text-white border-emerald-600 shadow-[0_5px_15px_rgba(16,185,129,0.3)]' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                         {pi.status}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right pr-10">
                      <div className="flex justify-end gap-2 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <PrintButton
                           moduleKey="purchase_invoice"
                           moduleName="Faktur Pembelian"
                           data={{
                             ...pi,
                             invoice_number: pi.reference || pi.invoice_number || `#INV-${pi.id}`,
                             supplier_name: pi.supplier_name || "-",
                             invoice_date: pi.date || pi.created_at || "-",
                             due_date: pi.due_date || "-",
                             total_amount: pi.total_amount || 0,
                             status: pi.status || "Unpaid",
                             items: pi.items || pi.details || [],
                           }}
                         />
                         <button
                           onClick={() => {
                             setSelectedPI(pi);
                             setIsModalOpen(true);
                           }}
                           className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all shadow-sm"
                           title="Lihat Detail Faktur"
                         >
                           <FileText size={18} />
                         </button>
                         <button
                           onClick={() => handleDelete(pi.id)}
                           className="p-2 text-rose-600 hover:bg-rose-100 rounded-xl transition-all shadow-sm"
                         >
                           <Trash2 size={18} />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination totalItems={filteredInvoices.length} />
      </div>

      <PurchaseInvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchInvoices();
          showSuccess("Success!", "Invoice posted and Ledger updated.");
        }}
        piToEdit={selectedPI}
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
