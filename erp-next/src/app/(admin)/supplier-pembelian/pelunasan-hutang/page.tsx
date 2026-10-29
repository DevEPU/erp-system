"use client";

import { useState, useEffect } from "react";
import TablePagination from "@/components/ui/TablePagination";
import {
  Search,
  Plus,
  CreditCard,
  FileText,
  Clock,
  CircleCheckBig,
  AlertCircle,
  Calendar,
  DollarSign
} from "lucide-react";
import usePermission from "@/hooks/usePermission";
import api from "@/lib/api";
import { useStatusModal } from "@/hooks/useStatusModal";
import StatusModalUI from "@/components/ui/StatusModal";
import PurchasePaymentModal from "@/components/supplier-pembelian/PurchasePaymentModal";
import PrintButton from "@/components/ui/PrintButton";

export default function PelunasanHutangPage() {
  const { user } = usePermission();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPermissionInitialized, setIsPermissionInitialized] = useState(false);

  const {
    isOpen: isStatusModalOpen,
    type: modalType,
    title: modalTitle,
    message: modalMessage,
    onConfirm: modalOnConfirm,
    showSuccess,
    closeModal,
  } = useStatusModal();

  useEffect(() => {
    if (user) {
      setIsPermissionInitialized(true);
    }
  }, [user]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.express.get("/purchase-payments");
      setPayments(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPermissionInitialized) {
      fetchPayments();
    }
  }, [isPermissionInitialized]);

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Dynamic Background Element */}
      <div className="fixed top-0 right-0 -z-10 opacity-10 pointer-events-none">
        <CreditCard size={400} className="text-emerald-900" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
              <CreditCard className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Pelunasan <span className="text-emerald-600">Utang</span>
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">
            Kelola pembayaran faktur pembelian dan penyelesaian hutang supplier.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="group relative flex items-center gap-3 bg-gray-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-20 transition-opacity" />
          <Plus size={20} strokeWidth={3} />
          <span>Buat Pembayaran Baru</span>
        </button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <DollarSign size={24} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Terbayar</p>
                  <p className="text-xl font-black text-gray-900">
                      Rp {payments.reduce((sum, p) => sum + Number(p.total_amount), 0).toLocaleString()}
                  </p>
              </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                  <FileText size={24} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jumlah Transaksi</p>
                  <p className="text-xl font-black text-gray-900">{payments.length} Transaksi</p>
              </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                  <Clock size={24} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rata-rata Pembayaran</p>
                  <p className="text-xl font-black text-gray-900">
                      Rp {payments.length > 0 ? (payments.reduce((sum, p) => sum + Number(p.total_amount), 0) / payments.length).toLocaleString() : 0}
                  </p>
              </div>
          </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row gap-6 justify-between items-center bg-gray-50/50">
          <div className="relative w-full md:w-96 group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors"
              size={20}
            />
            <input
              type="text"
              placeholder="Cari referensi atau supplier..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-sm transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Pembayaran
                </th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Supplier
                </th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Tanggal
                </th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Total Bayar
                </th>
                <th className="px-8 py-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-8 py-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-8 py-6">
                        <div className="h-12 bg-gray-100 rounded-2xl w-full"></div>
                      </td>
                    </tr>
                  ))
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((p) => (
                  <tr
                    key={p.id}
                    className="group hover:bg-emerald-50/30 transition-all duration-300 cursor-pointer"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <p className="font-black text-gray-900 tracking-tight">
                            {p.reference}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Ref: {p.reference}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-700">
                          {p.supplier_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-gray-500 font-bold text-sm">
                        <Calendar size={14} className="text-emerald-500" />
                        {new Date(p.date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className="font-black text-emerald-700 text-lg">
                        Rp {Number(p.total_amount).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-center">
                        <span className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                          <CircleCheckBig size={12} strokeWidth={3} />
                          Settled
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                        <PrintButton
                          moduleKey="purchase_payment"
                          moduleName="Pelunasan Utang"
                          data={{
                            ...p,
                            payment_number: p.reference || `#PAY-${p.id}`,
                            supplier_name: p.supplier_name || "-",
                            payment_date: p.date || "-",
                            payment_method: p.payment_method || "Transfer Bank",
                            total_paid: p.total_amount || 0,
                            status: "Settled",
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-6 bg-gray-50 rounded-[40px]">
                        <AlertCircle size={48} className="text-gray-300" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-900 font-black text-xl">
                          Belum ada data pembayaran
                        </p>
                        <p className="text-gray-500 font-medium">
                          Mulai dengan membuat pembayaran faktur baru.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination totalItems={filteredPayments.length} />
      </div>

      <PurchasePaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userDepartmentId={user?.department_id}
        onSuccess={() => {
          showSuccess("Berhasil", "Pembayaran faktur telah berhasil dicatat.");
          fetchPayments();
        }}
      />

      <StatusModalUI
        isOpen={isStatusModalOpen}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        onConfirm={modalOnConfirm}
        onClose={closeModal}
      />
    </div>
  );
}
