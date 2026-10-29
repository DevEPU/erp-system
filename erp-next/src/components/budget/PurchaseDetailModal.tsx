"use client";

import {
  X,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  ShoppingCart,
  User,
  Package,
  AlertTriangle,
  Tag,
  CheckCircle,
  MessageSquare,
} from "lucide-react";

interface PurchaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: any;
  isLoading?: boolean;
}

export default function PurchaseDetailModal({
  isOpen,
  onClose,
  purchase,
  isLoading,
}: PurchaseDetailModalProps) {
  if (!isOpen) return null;

  const formatCurrency = (amount: number | string) => {
    return parseFloat(amount?.toString() || "0").toLocaleString("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusStyle = (status: string) => {
    const s = status?.toLowerCase();
    switch (s) {
      case "approved":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "pending":
      case "menunggu":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "rejected":
      case "reject":
      case "ditolak":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };
  if (!purchase) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading details...</p>
        </div>
      </div>
    );
  }

  const deptName =
    purchase.department_id === 0 || purchase.department_id === "0"
      ? "Direksi"
      : purchase.department?.department_name || "Unknown Dept";

  const budgetSourceName =
    purchase.master_budget?.department_id === 0 ||
    purchase.master_budget?.department_id === "0"
      ? "Direksi"
      : purchase.master_budget?.department?.department_name || deptName;

  // Budget Availability Calculations (Dynamic Hypothetical for Pending)
  const totalRequest = purchase.purchase_details
    ? purchase.purchase_details
        .filter((d: any) => !d.is_asset)
        .reduce(
          (acc: number, curr: any) => acc + (parseFloat(curr.sub_total) || 0),
          0,
        )
    : parseFloat(purchase.budget_amount || purchase.total_amount || "0");
  const mainRemaining = purchase.master_budget
    ? parseFloat(purchase.master_budget.grandtotal || "0") -
      parseFloat(purchase.master_budget.used_amount || "0")
    : 0;

  const isPending =
    purchase.status?.toLowerCase() === "pending" ||
    purchase.status?.toLowerCase() === "menunggu" ||
    purchase.status?.toLowerCase() === "waiting approval";

  // If pending, calculate how much it WOULD borrow if approved now
  const effectiveBorrowedAmount = isPending
    ? Math.max(0, totalRequest - mainRemaining)
    : parseFloat(purchase.borrowed_amount || "0");

  const netFromMain = totalRequest - effectiveBorrowedAmount;
  const projectedRemaining = mainRemaining - netFromMain;

  const getApprovalComment = (p: any) => {
    const request = p.approval_request || p.approvalRequest;
    if (!request) return null;
    const logs = request.logs || [];
    const actionLogs = logs.filter(
      (l: any) => l.action === "approved" || l.action === "rejected",
    );
    if (actionLogs.length === 0) return null;
    actionLogs.sort((a: any, b: any) => b.id - a.id);
    return actionLogs[0];
  };

  const approvalComment = getApprovalComment(purchase);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-xl w-full max-w-3xl shadow-[0_0_50px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-300 max-h-[90vh]">
        {/* Header Section */}
        <div className="relative px-10 py-8 border-b border-gray-100">
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-emerald-500 to-teal-400"></div>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-[0.15em] border border-emerald-100">
                  Purchase Request
                </span>
                <span
                  className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-[0.15em] border ${getStatusStyle(purchase.status)}`}
                >
                  {purchase.status}
                </span>
              </div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                {purchase.reference}
              </h2>
              <p className="text-gray-400 font-bold text-xs mt-1 uppercase tracking-widest">
                PT Eran Plastindo Utama
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-3 bg-gray-50 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all duration-300 text-gray-400 active:scale-90"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="px-10 py-8 overflow-y-auto custom-scrollbar flex-1 relative min-h-[400px]">
          {isLoading ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4 animate-in fade-in duration-300">
               <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
               <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Loading PR details...</p>
             </div>
          ) : !purchase ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
               <AlertTriangle size={48} className="text-orange-300" />
               <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">No data available</p>
            </div>
          ) : (
            <div className="space-y-10">
          {/* Main Info Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Building2 size={12} className="text-emerald-500" /> Departemen
              </label>
              <p className="font-bold text-gray-800">{deptName}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <User size={12} className="text-emerald-500" /> Pemohon
              </label>
              <p className="font-bold text-gray-800">
                {purchase.user?.name || "System"}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <ShoppingCart size={12} className="text-emerald-500" /> Supplier / Vendor
              </label>
              <p className="font-bold text-gray-800 text-emerald-700">
                {purchase.supplier_name || purchase.supplier?.supplier_name || "-"}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} className="text-emerald-500" /> Tanggal PR
              </label>
              <p className="font-bold text-gray-800">
                {formatDate(purchase.date)}
              </p>
            </div>
            <div className="space-y-1.5 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                <DollarSign size={12} /> Total PR
              </label>
              <p className="font-black text-emerald-700 text-lg">
                {formatCurrency(purchase.total_amount)}
              </p>
            </div>
          </div>

          {/* Split Amount Info */}
          {(parseFloat(purchase.mandatory_amount) > 0 ||
            parseFloat(purchase.non_mandatory_amount) > 0) && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center">
                  <CheckCircle size={16} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest">
                    Mandatory Amount
                  </p>
                  <p className="font-black text-teal-900">
                    {formatCurrency(purchase.mandatory_amount || 0)}
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center">
                  <Package size={16} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    Others Amount
                  </p>
                  <p className="font-black text-slate-900">
                    {formatCurrency(purchase.non_mandatory_amount || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Source Budget Info */}
          <div className="p-6 bg-gray-50/50 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                Sumber Budget Utama
              </label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100">
                  <Tag size={18} className="text-emerald-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-800">{budgetSourceName}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                    {purchase.master_budget?.no_budgeting || "No Master Budget"}
                  </p>
                </div>
              </div>
            </div>
            {/* Borrowed Allocations from purchase_budget_allocations */}
            {purchase.purchase_budget_allocations
              ?.filter(
                (a: any) => a.is_borrowed_internal || a.is_borrowed_external,
              )
              .map((alloc: any, i: number) => (
                <div key={i} className="space-y-2">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">
                    Sumber Pinjaman{" "}
                    {purchase.purchase_budget_allocations.filter((x: any) => x.is_borrowed_internal || x.is_borrowed_external).length > 1
                      ? `#${i + 1}`
                      : ""}
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shadow-sm border border-indigo-100">
                      <AlertTriangle size={18} className="text-indigo-500" />
                    </div>
                    <div>
                      <p className="font-bold text-indigo-700">
                        {alloc.src_department_name || alloc.master_reference || "Sumber Eksternal"}
                      </p>
                      <div className="flex flex-col">
                        {alloc.master_reference && (
                          <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-tighter">
                            {alloc.master_reference}
                          </p>
                        )}
                        {(alloc.source_category_name || alloc.target_category_name) && (
                          <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">
                            Kategori: {alloc.source_category_name || alloc.target_category_name}
                          </p>
                        )}
                        <p className="text-[10px] text-orange-500 font-bold uppercase tracking-tighter">
                          Alokasi Pinjaman: {formatCurrency(alloc.amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            {/* Fallback: no allocation rows but borrowed_amount set */}
            {(!purchase.purchase_budget_allocations ||
              purchase.purchase_budget_allocations.filter((a: any) => a.is_borrowed_internal || a.is_borrowed_external).length === 0) &&
              effectiveBorrowedAmount > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">
                    Sumber Pinjaman
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shadow-sm border border-indigo-100">
                      <AlertTriangle size={18} className="text-indigo-500" />
                    </div>
                    <div>
                      <p className="font-bold text-indigo-700">
                        {purchase.borrowed_master_budget?.department_id === 0
                          ? "Direksi"
                          : purchase.borrowed_master_budget?.department_name ||
                            purchase.borrowed_master_budget?.department?.department_name ||
                            "Departemen Lain"}
                      </p>
                      <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-tighter">
                        {purchase.borrowed_master_budget?.no_budgeting || ""}
                      </p>
                      <p className="text-[10px] text-orange-500 font-bold uppercase tracking-tighter">
                        Pinjaman: {formatCurrency(effectiveBorrowedAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
          </div>

          {/* Item List Table */}
          <div className="space-y-4">
            <h4 className="font-black text-gray-800 flex items-center gap-3 text-sm uppercase tracking-widest">
              <Package size={18} className="text-emerald-500" />
              Daftar Barang & Jasa
            </h4>
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/80 text-gray-400 font-black text-[10px] uppercase tracking-widest border-b border-gray-50">
                  <tr>
                    <th className="px-6 py-4">Item / Deskripsi</th>
                    <th className="px-6 py-4 text-center">Qty</th>
                    <th className="px-6 py-4 text-right">Harga</th>
                    <th className="px-6 py-4 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {purchase.purchase_details?.map(
                    (detail: any, idx: number) => (
                      <tr
                        key={idx}
                        className="hover:bg-emerald-50/20 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-800">
                            {detail.product_name}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                              {detail.product_code || "-"} •{" "}
                              {detail.product?.category?.category_name ||
                                "GENERAL"}{" "}
                              • {detail.is_asset ? "ASSET" : "NON-ASSET"}
                            </div>
                            {detail.product?.is_mandatory ? (
                              <span className="text-[8px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-black uppercase tracking-widest border border-teal-200">
                                Mandatory
                              </span>
                            ) : (
                              <span className="text-[8px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-black uppercase tracking-widest border border-gray-200">
                                Others
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-gray-600">
                          {detail.quantity}{" "}
                          <span className="text-[10px] uppercase">
                            {detail.product_unit || "Unit"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-600">
                          {formatCurrency(detail.price)}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-gray-800">
                          {formatCurrency(detail.sub_total)}
                        </td>
                      </tr>
                    ),
                  )}
                  {(!purchase.purchase_details ||
                    purchase.purchase_details.length === 0) && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-10 text-center text-gray-400 italic font-bold"
                      >
                        Tidak ada rincian item
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Budget Analysis / Notes */}
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
            {/* Summary */}
            {/* <div className="bg-emerald-950 text-white rounded-[2rem] p-8 space-y-4 shadow-xl shadow-emerald-900/10">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-2">
                                Analisis Budget
                            </h4>
                            <div className="flex justify-between items-center">
                                <span className="text-emerald-100/60 text-xs font-bold uppercase tracking-widest">
                                    Sisa Budget Dept
                                </span>
                                <span className="font-bold text-sm tracking-tight">
                                    {formatCurrency(mainRemaining)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-emerald-100/60 text-xs font-bold uppercase tracking-widest">
                                    Beban ke Dept
                                </span>
                                <span className="font-bold text-sm tracking-tight text-emerald-300">
                                    -{formatCurrency(netFromMain)}
                                </span>
                            </div>
                            <div className="pt-4 border-t border-emerald-800 flex justify-between items-center text-base">
                                <span className="font-black uppercase tracking-[0.2em] text-xs">
                                    Prediksi Sisa
                                </span>
                                <span
                                    className={`font-black ${projectedRemaining < 0 ? "text-red-400" : "text-emerald-400"}`}
                                >
                                    {formatCurrency(projectedRemaining)}
                                </span>
                            </div>
                            {projectedRemaining < 0 && (
                                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3">
                                    <AlertTriangle
                                        className="text-red-400 shrink-0"
                                        size={18}
                                    />
                                    <p className="text-[10px] font-bold text-red-200 leading-relaxed uppercase tracking-wide">
                                        Peringatan: Permintaan ini akan membuat
                                        budget departemen menjadi negatif!
                                    </p>
                                </div>
                            )}
                        </div> */}

            {/* Note Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-100 rounded-3xl p-6 space-y-3 shadow-sm">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 flex items-center gap-2">
                  Catatan / Alasan
                </h4>
                <p className="text-sm font-bold text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100 min-h-[80px]">
                  {purchase.description ||
                    purchase.note ||
                    "Tidak ada catatan tambahan."}
                </p>
              </div>
              {approvalComment && (
                <div
                  className={`bg-white border rounded-3xl p-6 space-y-3 shadow-sm ${approvalComment.action === "rejected" ? "border-red-100" : "border-emerald-100"}`}
                >
                  <h4
                    className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2 ${approvalComment.action === "rejected" ? "text-red-400" : "text-emerald-400"}`}
                  >
                    <MessageSquare size={14} /> Catatan Approval (
                    {approvalComment.action})
                  </h4>
                  <p
                    className={`text-sm font-bold leading-relaxed p-4 rounded-2xl border min-h-[80px] ${approvalComment.action === "rejected" ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}
                  >
                    {approvalComment.comment || "Tidak ada catatan."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
        </div>

        {/* Footer Actions */}
        <div className="px-10 py-6 bg-gray-50/80 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-10 py-4 bg-gray-900 hover:bg-black text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl active:scale-95"
          >
            Tutup Detail
          </button>
        </div>
      </div>
    </div>
  );
}
