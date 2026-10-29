import {
  X,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  Box,
  ShoppingCart,
  User,
  Edit2,
  Check,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { useState, useEffect } from "react";
import SearchableSelect from "../ui/SearchableSelect";
import { API_BASE_URL } from "@/lib/constants";

interface ApprovalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  type: "budget" | "purchase" | "target" | "product";
}

export default function ApprovalDetailModal({
  isOpen,
  onClose,
  data,
  type,
}: ApprovalDetailModalProps) {
  const [isEditingSource, setIsEditingSource] = useState(false);
  const [isEditingBorrow, setIsEditingBorrow] = useState(false);
  const [availableBudgets, setAvailableBudgets] = useState<any[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState("");
  const [selectedBorrowId, setSelectedBorrowId] = useState("");
  const [savingSource, setSavingSource] = useState(false);

  // Reset state when modal opens/closes or data changes
  useEffect(() => {
    if (isOpen) {
      setIsEditingSource(false);
      setIsEditingBorrow(false);
      setAvailableBudgets([]);
      setSelectedBudgetId("");
      setSelectedBorrowId("");

      if (type === "purchase") {
        fetchBudgets();
      }
    }
  }, [isOpen, data, type]);

  if (!isOpen || !data || !data.requestable) return null;

  const entity = data.requestable;
  const backendUrl = `${API_BASE_URL}/api`;

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchBudgets = async () => {
    setLoadingBudgets(true);
    try {
      const d = entity.date ? new Date(entity.date) : new Date();
      const month = d.getMonth() + 1;
      const year = d.getFullYear();

      const res = await fetch(
        `${backendUrl}/budgeting/available-budgets?month=${month}&year=${year}`,
        { headers: getAuthHeaders() },
      );
      const resData = await res.json();
      setAvailableBudgets(resData.data || []);

      if (entity.master_budget_id) {
        setSelectedBudgetId(entity.master_budget_id.toString());
      }
      if (entity.borrowed_master_budget_id) {
        setSelectedBorrowId(entity.borrowed_master_budget_id.toString());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBudgets(false);
    }
  };

  const handleEditSource = () => {
    setIsEditingSource(true);
    fetchBudgets();
  };

  const handleEditBorrow = () => {
    setIsEditingBorrow(true);
    fetchBudgets();
  };

  const handleSaveSource = async () => {
    if (!selectedBudgetId) return;
    setSavingSource(true);
    try {
      const res = await fetch(
        `${backendUrl}/purchases/${entity.id}/update-source-budget`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ master_budget_id: selectedBudgetId }),
        },
      );

      if (res.ok) {
        entity.master_budget_id = selectedBudgetId;
        const newBudget = availableBudgets.find(
          (b) => b.id.toString() === selectedBudgetId,
        );
        if (newBudget) {
          entity.master_budget = {
            ...entity.master_budget,
            department_id: newBudget.department_id,
            department: { department_name: newBudget.department_name },
          };
        }
        setIsEditingSource(false);
      } else {
        alert("Gagal mengupdate sumber budget");
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan");
    } finally {
      setSavingSource(false);
    }
  };

  const handleSaveBorrow = async () => {
    setSavingSource(true);
    try {
      const res = await fetch(
        `${backendUrl}/purchases/${entity.id}/update-borrowing-source`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ borrowed_master_budget_id: selectedBorrowId || null }),
        },
      );

      if (res.ok) {
        const resData = await res.json();
        entity.borrowed_master_budget_id = selectedBorrowId || null;
        entity.borrowed_amount = resData.borrowed_amount;

        if (selectedBorrowId) {
          const newBudget = availableBudgets.find(
            (b) => b.id.toString() === selectedBorrowId,
          );
          if (newBudget) {
            entity.borrowed_master_budget = {
              department_id: newBudget.department_id,
              department: { department_name: newBudget.department_name },
            };
          }
        } else {
          entity.borrowed_master_budget = null;
        }
        setIsEditingBorrow(false);
      } else {
        alert("Gagal mengupdate sumber pinjaman");
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan");
    } finally {
      setSavingSource(false);
    }
  };

  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  const formatCurrency = (amount: number | string) => {
    return parseFloat(amount?.toString() || "0").toLocaleString("id-ID", {
      style: "currency", currency: "IDR", minimumFractionDigits: 0,
    });
  };

  const renderApprovalHistory = () => {
    if (!data?.logs || data.logs.length === 0) return null;
    const commentedLogs = data.logs.filter((l: any) => l.comment);
    if (commentedLogs.length === 0) return null;

    return (
      <div className="mt-6 pt-6 border-t border-gray-100">
        <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <MessageSquare size={16} className="text-gray-400" />
          Riwayat Catatan Approval
        </h4>
        <div className="space-y-3">
          {commentedLogs.map((log: any, idx: number) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border ${log.action === "rejected" ? "bg-red-50 border-red-100" : log.action === "approved" ? "bg-emerald-50 border-emerald-100" : "bg-gray-50 border-gray-100"}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-gray-900">{log.user?.name || "System"}</span>
                <span className="text-[10px] text-gray-500 font-medium">{formatDate(log.created_at)}</span>
              </div>
              <span className={`inline-block mb-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${log.action === "rejected" ? "bg-red-100 text-red-700" : log.action === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-700"}`}>
                {log.action}
              </span>
              <p className="text-sm text-gray-700 italic">"{log.comment}"</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  let title = "Detail Approval";
  let icon = FileText;
  let detailsContent = null;

  if (type === "budget") {
    title = `Master Budget: ${entity.no_budgeting}`;
    icon = Box;
    detailsContent = (
      <div className="space-y-4">
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-2">
          <h4 className="font-bold text-gray-800 text-sm">Keterangan / Deskripsi</h4>
          <p className="text-sm text-gray-600 leading-relaxed">{entity.description || "-"}</p>
        </div>

        {!!entity.is_mandatory && (
          <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center border border-teal-100">
              <Box size={20} className="text-teal-500" />
            </div>
            <div>
              <p className="text-xs font-black text-teal-700 uppercase tracking-widest">Mandatory Budget</p>
              <p className="text-[10px] text-teal-600/70 font-bold leading-tight">
                Budget ini diproteksi dan tidak dapat digunakan sebagai sumber pinjaman internal/eksternal.
              </p>
            </div>
          </div>
        )}

        <h4 className="font-bold text-gray-800 flex items-center gap-2">
          <Box size={18} className="text-blue-500" />
          Rincian Budget
        </h4>
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-100">
              <tr>
                <th className="px-5 py-3">Kategori</th>
                <th className="px-5 py-3 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entity.details?.map((detail: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-gray-700">{detail.category_name || "Unknown Category"}</td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">{formatCurrency(detail.budget)}</td>
                </tr>
              ))}
              {(!entity.details || entity.details.length === 0) && (
                <tr>
                  <td colSpan={2} className="px-5 py-4 text-center text-gray-400">Tidak ada rincian budget</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  } else if (type === "purchase") {
    title = `Purchase Request: ${entity.reference}`;
    icon = ShoppingCart;
    detailsContent = (
      <div className="space-y-4">
        <h4 className="font-bold text-gray-800 flex items-center gap-2">
          <ShoppingCart size={18} className="text-purple-500" />
          Item Barang/Jasa
        </h4>
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-100">
              <tr>
                <th className="px-5 py-3">Produk</th>
                <th className="px-5 py-3 text-center">Tipe</th>
                <th className="px-5 py-3 text-center">Qty</th>
                <th className="px-5 py-3 text-right">Harga Satuan</th>
                <th className="px-5 py-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entity.purchase_details?.map((detail: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900">{detail.product_name}</div>
                    <div className="text-xs text-gray-400">
                      {detail.product?.category?.category_name || detail.category_name || "General"} -{" "}
                      {detail.product_unit || "Unit"}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      {detail.product?.is_mandatory ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">Mandatory</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800">Non Mandatory</span>
                      )}
                      {detail.is_asset ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Asset</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">Non Asset</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center text-gray-700">{detail.quantity}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{formatCurrency(detail.price)}</td>
                  <td className="px-5 py-3 text-right font-bold text-gray-900">{formatCurrency(detail.sub_total)}</td>
                </tr>
              ))}
              {(!entity.purchase_details || entity.purchase_details.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-gray-400 italic">Tidak ada rincian item</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Recalculated totals for display consistency */}
        {(() => {
          const calcMandatory = (entity.purchase_details || [])
            .filter((d: any) => !d.is_asset && (d.product?.is_mandatory || d.is_mandatory))
            .reduce((acc: number, d: any) => acc + (parseFloat(d.sub_total) || 0), 0);
          const calcOthers = (entity.purchase_details || [])
            .filter((d: any) => !d.is_asset && !(d.product?.is_mandatory || d.is_mandatory))
            .reduce((acc: number, d: any) => acc + (parseFloat(d.sub_total) || 0), 0);

          if (calcMandatory === 0 && calcOthers === 0) return null;

          return (
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-100">
                <span className="block text-[10px] font-black text-teal-600 uppercase tracking-widest mb-1">Mandatory Amount</span>
                <span className="text-lg font-black text-teal-900">{formatCurrency(calcMandatory)}</span>
              </div>
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Others Amount</span>
                <span className="text-lg font-black text-slate-900">{formatCurrency(calcOthers)}</span>
              </div>
            </div>
          );
        })()}

        {/* Pinjaman Budget Allocations */}
        {entity.purchase_budget_allocations?.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="font-bold text-gray-800 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              Informasi Budget Pinjaman
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {entity.purchase_budget_allocations.map((alloc: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none">
                      {alloc.is_borrowed_external ? "External" : alloc.is_borrowed_internal ? "Internal" : "Pinjaman"} Allocation
                    </p>
                    <p className="font-bold text-gray-900 text-sm">
                      {alloc.src_department_name || alloc.master_reference || "Unknown Dept"}
                      {alloc.source_category_name ? ` - ${alloc.source_category_name}` : ""}
                    </p>
                    {alloc.master_reference && (
                      <p className="text-[10px] text-gray-400 font-medium">{alloc.master_reference}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Amount</p>
                    <p className="font-black text-gray-900">{formatCurrency(alloc.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  } else if (type === "target") {
    title = `Target Sales: ${entity.reference}`;
    icon = Calendar;
    detailsContent = (
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-2">
        <h4 className="font-bold text-blue-900">Keterangan</h4>
        <p className="text-sm text-blue-800 leading-relaxed">{entity.description || "Tidak ada keterangan tambahan."}</p>
      </div>
    );
  } else if (type === "product") {
    title = `Product Request: ${entity.product_name}`;
    icon = ShoppingCart;
    detailsContent = (
      <div className="space-y-4">
        <h4 className="font-bold text-gray-800">Detail Produk</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 p-3 rounded-lg">
            <span className="block text-gray-500 text-xs uppercase font-bold">Nama Produk</span>
            <span className="font-bold text-gray-900">{entity.product_name}</span>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <span className="block text-gray-500 text-xs uppercase font-bold">Unit</span>
            <span className="font-bold text-gray-900">{entity.product_unit}</span>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <span className="block text-gray-500 text-xs uppercase font-bold">Tipe</span>
            <span className={`font-bold ${entity.is_asset ? "text-blue-600" : "text-gray-900"}`}>
              {entity.is_asset ? "Asset" : "Non-Asset"}
            </span>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <span className="block text-gray-500 text-xs uppercase font-bold">Status</span>
            <span className="font-bold text-gray-900 capitalize">{entity.status}</span>
          </div>
        </div>
      </div>
    );
  }

  const deptName =
    entity.department_id === 0 || entity.department_id === "0"
      ? "Direksi"
      : entity.department?.department_name || "Unknown Dept";

  const budgetSourceName =
    entity.master_budget?.department_id === 0 || entity.master_budget?.department_id === "0"
      ? "Direksi"
      : entity.master_budget?.department?.department_name || deptName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl flex flex-col scale-100 animate-in zoom-in-95 duration-200 max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {type.toUpperCase()}
              </span>
              <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Level {data.current_level}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {title}
              {type === "budget" && !!entity.is_mandatory && (
                <span className="bg-teal-100 text-teal-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-teal-200">
                  Mandatory
                </span>
              )}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X size={24} />
          </button>
        </div>

        {/* Body scrollable */}
        <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
          {/* General Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={12} /> Departemen
              </label>
              <p className="font-medium text-gray-800">{deptName}</p>
            </div>

            {type === "purchase" && (
              <>
                {/* Main Budget Source */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 size={12} /> Sumber Budget
                  </label>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-800">{budgetSourceName}</p>
                  </div>
                </div>

                {/* Borrowing Source (Editable) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 size={12} /> Sumber Pinjaman
                  </label>
                  {isEditingBorrow ? (
                    <div className="flex items-center gap-2">
                      <div className="w-full max-w-[200px]">
                        <SearchableSelect
                          label=""
                          placeholder="-- Tidak Pinjam --"
                          value={selectedBorrowId}
                          onChange={(val) => setSelectedBorrowId(val.toString())}
                          disabled={loadingBudgets}
                          options={[
                            { value: "", label: "-- Tidak Pinjam --" },
                            ...availableBudgets
                              .filter((b) => b.id.toString() !== entity.master_budget_id?.toString())
                              .map((b) => ({
                                value: b.id,
                                label: `${b.no_budgeting || "Budget"} - ${b.department_id === 0 ? "Direksi" : b.department_name} (${months[b.bulan - 1]}) (Sisa: ${formatCurrency(b.remaining)})`,
                              })),
                          ]}
                        />
                      </div>
                      <button onClick={handleSaveBorrow} disabled={savingSource} className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setIsEditingBorrow(false)} className="p-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800">
                        {entity.borrowed_master_budget?.department_id === 0
                          ? "Direksi"
                          : entity.borrowed_master_budget?.department?.department_name || "-"}
                      </p>
                      <button onClick={handleEditBorrow} className="p-1 text-gray-400 hover:text-blue-500 transition-colors" title="Ubah Sumber Pinjaman">
                        <Edit2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <User size={12} /> Diajukan Oleh
              </label>
              <p className="font-medium text-gray-800">
                {data.creator?.name || entity.users?.name || data.created_by || "System"}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={12} /> Tanggal
              </label>
              <p className="font-medium text-gray-800">
                {formatDate(entity.date || entity.created_at || data.created_at)}
              </p>
            </div>
            {type !== "product" && (
              <div className="space-y-1 col-span-2 md:col-span-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign size={12} /> Total Budget
                </label>
                <p className="font-black text-gray-900 text-lg">{formatCurrency(data.amount)}</p>
              </div>
            )}
            {type === "budget" && (
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={12} /> Periode
                </label>
                <p className="font-medium text-gray-800">
                  {months[entity.bulan - 1]}{" "}
                  {new Date(entity.periode_awal).getFullYear()} (
                  {formatDate(entity.periode_awal)} - {formatDate(entity.periode_akhir)})
                </p>
              </div>
            )}
            {type === "target" && (
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={12} /> Periode Target
                </label>
                <p className="font-medium text-gray-800">{months[entity.month - 1]} {entity.year}</p>
              </div>
            )}
          </div>

          {/* Specific Details */}
          {detailsContent}

          {/* Total Summary for Purchase */}
          {type === "purchase" && entity.purchase_details && (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Total Budget (Non-Asset)</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(
                    entity.purchase_details.filter((d: any) => !d.is_asset)
                      .reduce((acc: number, curr: any) => acc + (parseFloat(curr.sub_total) || 0), 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Total Asset</span>
                <span className="font-bold text-blue-600">
                  {formatCurrency(
                    entity.purchase_details.filter((d: any) => d.is_asset)
                      .reduce((acc: number, curr: any) => acc + (parseFloat(curr.sub_total) || 0), 0)
                  )}
                </span>
              </div>

              {/* Budget Availability Section */}
              {entity.master_budget && (
                <>
                  <div className="border-t border-gray-100 my-4"></div>
                  <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <DollarSign size={16} className="text-blue-500" />
                    Analisis Ketersediaan Budget
                  </h4>

                  {loadingBudgets ? (
                    <div className="py-10 flex flex-col items-center justify-center space-y-3 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                      <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Memuat Data Budget...</span>
                    </div>
                  ) : (
                    (() => {
                      const deptBudgets = availableBudgets.filter(
                        (b) => b.department_id?.toString() === entity.department_id?.toString(),
                      );
                      const totalAvailableMandatory = deptBudgets.filter((b) => b.is_mandatory)
                        .reduce((acc, b) => acc + (parseFloat(b.remaining) || 0), 0);
                      const totalAvailableOthers = deptBudgets.filter((b) => !b.is_mandatory)
                        .reduce((acc, b) => acc + (parseFloat(b.remaining) || 0), 0);
                      const reqMandatory = (entity.purchase_details || [])
                        .filter((d: any) => !d.is_asset && (d.product?.is_mandatory || d.is_mandatory))
                        .reduce((acc: number, d: any) => acc + (parseFloat(d.sub_total) || 0), 0);
                      const reqOthers = (entity.purchase_details || [])
                        .filter((d: any) => !d.is_asset && !(d.product?.is_mandatory || d.is_mandatory))
                        .reduce((acc: number, d: any) => acc + (parseFloat(d.sub_total) || 0), 0);
                      const remMandatory = totalAvailableMandatory - reqMandatory;
                      const remOthers = totalAvailableOthers - reqOthers;

                      return (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className={`p-5 rounded-3xl border ${remMandatory < 0 ? "bg-red-50/50 border-red-100" : "bg-teal-50/30 border-teal-100"}`}>
                              <div className="flex items-center gap-2 mb-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${remMandatory < 0 ? "bg-red-100 text-red-600" : "bg-teal-100 text-teal-600"}`}>
                                  <AlertTriangle size={16} />
                                </div>
                                <span className={`text-xs font-black uppercase tracking-widest ${remMandatory < 0 ? "text-red-700" : "text-teal-700"}`}>Mandatory Budget</span>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-[11px] font-bold text-gray-400">
                                  <span>TERSEDIA</span>
                                  <span className="text-gray-900">{formatCurrency(totalAvailableMandatory)}</span>
                                </div>
                                <div className="flex justify-between text-[11px] font-bold text-gray-400 border-b border-gray-100 pb-2">
                                  <span>PERMINTAAN PR</span>
                                  <span className="text-gray-900">{formatCurrency(reqMandatory)}</span>
                                </div>
                                <div className="flex justify-between text-xs pt-1">
                                  <span className="font-bold text-gray-500">SISA ESTIMASI</span>
                                  <span className={`font-black ${remMandatory < 0 ? "text-red-600" : "text-teal-600"}`}>{formatCurrency(remMandatory)}</span>
                                </div>
                              </div>
                            </div>

                            <div className={`p-5 rounded-3xl border ${remOthers < 0 ? "bg-red-50/50 border-red-100" : "bg-slate-50 border-slate-100"}`}>
                              <div className="flex items-center gap-2 mb-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${remOthers < 0 ? "bg-red-100 text-red-600" : "bg-slate-200 text-slate-600"}`}>
                                  <Box size={16} />
                                </div>
                                <span className={`text-xs font-black uppercase tracking-widest ${remOthers < 0 ? "text-red-700" : "text-slate-600"}`}>Others (Non Mandatory)</span>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-[11px] font-bold text-gray-400">
                                  <span>TERSEDIA</span>
                                  <span className="text-gray-900">{formatCurrency(totalAvailableOthers)}</span>
                                </div>
                                <div className="flex justify-between text-[11px] font-bold text-gray-400 border-b border-gray-100 pb-2">
                                  <span>PERMINTAAN PR</span>
                                  <span className="text-gray-900">{formatCurrency(reqOthers)}</span>
                                </div>
                                <div className="flex justify-between text-xs pt-1">
                                  <span className="font-bold text-gray-500">SISA ESTIMASI</span>
                                  <span className={`font-black ${remOthers < 0 ? "text-red-600" : "text-slate-900"}`}>{formatCurrency(remOthers)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {(remMandatory < 0 || remOthers < 0) && (
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3">
                              <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                              <div className="text-xs text-amber-800 space-y-1">
                                <p className="font-black uppercase tracking-tight">Peringatan: Over Budget Terdeteksi</p>
                                <p className="font-medium">
                                  {remMandatory < 0 && remOthers < 0
                                    ? "Budget Mandatory DAN Others tidak mencukupi untuk permintaan ini."
                                    : remMandatory < 0
                                    ? "Budget Mandatory tidak mencukupi."
                                    : "Budget Non Mandatory (Others) tidak mencukupi."}
                                </p>
                                <p className="mt-2 font-bold underline">Silahkan atur sumber pinjaman jika diperlukan sebelum melanjutkan approval.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}

                  <div className="border-t border-gray-100 my-4"></div>
                  <div className="flex justify-between items-center text-lg">
                    <span className="text-gray-900 font-extrabold">Total Request (PR)</span>
                    <span className="font-black text-gray-900 text-2xl">{formatCurrency(data.amount)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Approval History */}
          {renderApprovalHistory()}
        </div>

        {/* Footer Action */}
        <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
