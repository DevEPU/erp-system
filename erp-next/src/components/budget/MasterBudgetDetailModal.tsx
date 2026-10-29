"use client";

import {
  X,
  Calendar,
  Wallet,
  CheckCircle,
  Clock,
  XCircle,
  MessageSquare,
} from "lucide-react";

type BudgetDetail = {
  category_id: number;
  category_name: string;
  budget: number | string;
  percentage?: number | string;
};

type MasterBudget = {
  id: number;
  no_budgeting: string;
  department?: {
    department_name: string;
  };
  department_id: number | string;
  tgl_penyusunan: string;
  periode_awal: string;
  periode_akhir: string;
  grandtotal: number | string;
  status: string;
  description?: string;
  is_mandatory: boolean | number;
  is_active?: boolean | number;
  details?: BudgetDetail[];
  approval_request?: any;
  target_sales_id?: number | string;
  target_sales_amount?: number | string;
  total_percentage?: number | string;
  target_sale?: any;
};

type MasterBudgetDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  budget: MasterBudget | null;
};

export default function MasterBudgetDetailModal({
  isOpen,
  onClose,
  budget,
}: MasterBudgetDetailModalProps) {
  if (!isOpen || !budget) return null;

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    switch (s) {
      case "approved":
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">
            <CheckCircle size={14} />
            <span className="text-xs font-bold uppercase tracking-wide">
              Approved
            </span>
          </div>
        );
      case "pending":
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-700 rounded-full border border-orange-200">
            <Clock size={14} />
            <span className="text-xs font-bold uppercase tracking-wide">
              Pending
            </span>
          </div>
        );
      case "rejected":
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full border border-red-200">
            <XCircle size={14} />
            <span className="text-xs font-bold uppercase tracking-wide">
              Rejected
            </span>
          </div>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number | string) => {
    return "Rp " + parseFloat(amount.toString()).toLocaleString("id-ID");
  };

  const getApprovalComment = (b: any) => {
    const request = b.approval_request || b.approvalRequest;
    if (!request) return null;
    const logs = request.logs || [];
    const actionLogs = logs.filter(
      (l: any) => l.action === "approved" || l.action === "rejected",
    );
    if (actionLogs.length === 0) return null;
    actionLogs.sort((a: any, b: any) => b.id - a.id);
    return actionLogs[0];
  };

  const approvalComment = getApprovalComment(budget);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-800 tracking-tight">
              Budget Details
            </h2>
            <p className="text-sm text-gray-500 font-medium mt-1">
              {budget.no_budgeting}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200/50 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Top Info Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Department
              </label>
              <p className="font-bold text-gray-800 text-lg">
                {budget.department_id === 0 || budget.department_id === "0"
                  ? "Direksi"
                  : (budget.department?.department_name || (budget as any).department_name || "-")}
              </p>
            </div>

            <div className="space-y-1 text-right">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Status
              </label>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {getStatusBadge(budget.status)}
                  <div
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${
                      budget.is_active !== 0 && budget.is_active !== false
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        budget.is_active !== 0 && budget.is_active !== false
                          ? "bg-emerald-500"
                          : "bg-slate-400"
                      }`}
                    />
                    <span>
                      {budget.is_active !== 0 && budget.is_active !== false
                        ? "Aktif"
                        : "Non Aktif"}
                    </span>
                  </div>
                </div>
                {!!budget.is_mandatory ? (
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold uppercase tracking-wide border border-teal-200">
                    Mandatory Budget
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wide border border-slate-200">
                    Others Budget
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar size={12} /> Periode
              </label>
              <p className="font-medium text-gray-700">
                {formatDate(budget.periode_awal)} &ndash;{" "}
                {formatDate(budget.periode_akhir)}
              </p>
            </div>

            <div className="space-y-1 text-right">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 justify-end">
                <Wallet size={12} /> Grand Total
              </label>
              <div className="flex flex-col items-end gap-1">
                <p className="font-black text-emerald-600 text-xl">
                  {formatCurrency(budget.grandtotal)}
                </p>
                {budget.target_sales_amount && (
                  <span className="text-[10px] font-bold text-gray-400 uppercase">
                    {budget.total_percentage}% of{" "}
                    {formatCurrency(budget.target_sales_amount)} Target
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description and Approval Comments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 flex items-center gap-2">
                Description / Note
              </h4>
              <p className="text-sm font-bold text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100 min-h-[80px]">
                {budget.description || "Tidak ada deskripsi tambahan."}
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
          <div>
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-emerald-500 rounded-full"></span>
              Allocation Details
            </h3>
            <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider text-xs">
                      Category
                    </th>
                    {budget.target_sales_amount && (
                      <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider text-xs">
                        %
                      </th>
                    )}
                    <th className="px-4 py-3 text-right font-bold text-gray-500 uppercase tracking-wider text-xs">
                      Approved
                    </th>
                    <th className="px-4 py-3 text-right font-bold text-gray-500 uppercase tracking-wider text-xs">
                      Used
                    </th>
                    <th className="px-4 py-3 text-right font-bold text-gray-500 uppercase tracking-wider text-xs">
                      Remaining
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {budget.details && budget.details.length > 0 ? (
                    budget.details.map((item: any, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-700">
                          {item.category_name || "-"}
                        </td>
                        {budget.target_sales_amount && (
                          <td className="px-4 py-3 text-center font-bold text-emerald-600 text-xs">
                            {item.percentage || 0}%
                          </td>
                        )}
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          {formatCurrency(item.budget)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-orange-600">
                          {formatCurrency(item.used_amount || 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">
                          {formatCurrency(
                            parseFloat(item.budget || 0) -
                              parseFloat(item.used_amount || 0),
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-gray-400"
                      >
                        No details available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
