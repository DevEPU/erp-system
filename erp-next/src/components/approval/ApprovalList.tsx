import {
  Calendar,
  CheckCircle2,
  XCircle,
  User,
  FileText,
  MoreVertical,
  Clock,
  Ban,
  Building2,
  Loader2,
} from "lucide-react";

interface ApprovalListProps {
  data: any[];
  loading: boolean;
  onAction: (item: any, type: "approve" | "reject") => void;
  onView: (item: any) => void;
  type: "budget" | "purchase" | "target" | "product" | "inv_change";
  quickApprovingId?: number | null;
}

export default function ApprovalList({
  data,
  loading,
  onAction,
  onView,
  type,
  quickApprovingId,
}: ApprovalListProps) {
  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-white border border-gray-100 rounded-3xl p-6 flex items-center justify-between"
          >
            <div className="space-y-3">
              <div className="h-4 w-48 bg-gray-100 rounded-full"></div>
              <div className="h-3 w-32 bg-gray-50 rounded-full"></div>
            </div>
            <div className="h-10 w-24 bg-gray-100 rounded-xl"></div>
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <FileText size={32} className="opacity-50" />
        </div>
        <h3 className="text-lg font-bold text-gray-600">No Pending Requests</h3>
        <p className="text-sm text-gray-400">
          Semua pengajuan telah diproses atau belum ada data baru.
        </p>
      </div>
    );
  }

  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="divide-y divide-gray-50">
      {data.map((item) => {
        const entity = item.requestable; // budget, purchase, or target
        if (!entity) return null;

        let title = "-";
        // We'll store subtitle as an element or string
        let subtitle: React.ReactNode = "-";
        let amount = "0";

        let amountLabel = "Total Amount";

        // Customize display based on type
        if (type === "budget") {
          // ... existing budget logic ...
          title = entity.no_budgeting || `Budget #${entity.id}`;
          const deptName =
            entity.department_id === 0 || entity.department_id === "0"
              ? "Direksi"
              : entity.department?.department_name || "Unknown Dept";

          const monthName = months[entity.bulan - 1] || "Unknown Month";
          const year = new Date(entity.periode_awal).getFullYear();

          subtitle = (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-gray-600 font-bold">
                <Building2 size={14} className="text-gray-400" />
                <span>{deptName}</span>
              </div>
              <div className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-md w-fit mt-1">
                Periode: {monthName} {year} ({formatDate(entity.periode_awal)} -{" "}
                {formatDate(entity.periode_akhir)})
              </div>
              {!!entity.is_mandatory && (
                <div className="text-[9px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded border border-teal-200 font-bold w-fit mt-1 uppercase tracking-widest">
                  Mandatory Budget
                </div>
              )}
            </div>
          );

          amount = parseFloat(entity.grandtotal || "0").toLocaleString();
        } else if (type === "purchase") {
          title = entity.reference || `PR #${entity.id}`;
          amountLabel = "Total Request (PR)";
          const deptName =
            entity.department_id === 0 || entity.department_id === "0"
              ? "Direksi"
              : entity.department?.department_name || "Unknown Dept";

          const isOverBudget =
            parseFloat(entity.master_budget_remaining || "0") < 0;

          subtitle = (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                <Building2 size={14} className="text-gray-400" />
                <span>{deptName}</span>
              </div>
              {isOverBudget && (
                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded border border-red-200 font-bold w-fit">
                  OVER BUDGET
                </span>
              )}
              {parseFloat(entity.mandatory_amount || "0") > 0 && (
                <span className="text-[9px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded border border-teal-200 font-black uppercase tracking-widest w-fit">
                  Contains Mandatory
                </span>
              )}

              {/* Check for Borrowed Budget */}
              {parseFloat(entity.borrowed_amount || "0") > 0 ? (
                <div className="flex flex-col gap-0.5 mt-1">
                  {/* <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded border border-indigo-200 font-bold w-fit">
                                        + Pinjam:{" "}
                                        {parseFloat(
                                            entity.borrowed_amount,
                                        ).toLocaleString("id-ID")}
                                    </span> */}
                  <span className="text-[9px] text-indigo-400 font-bold ml-0.5">
                    (Meminjam Dari:{" "}
                    {entity.borrowed_master_budget?.department_id === 0
                      ? "Direksi"
                      : entity.borrowed_master_budget?.department
                          ?.department_name || "Lainnya"}
                    )
                  </span>
                </div>
              ) : (
                entity.master_budget &&
                entity.master_budget.department_id != entity.department_id && (
                  <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded border border-indigo-200 font-bold w-fit">
                    Borrowed:{" "}
                    {entity.master_budget.department?.department_name ||
                      "Direksi"}
                  </span>
                )
              )}
            </div>
          );

          // Calculate Total (Asset + Budget) from details if available
          if (entity.purchase_details && entity.purchase_details.length > 0) {
            const total = entity.purchase_details.reduce(
              (acc: number, curr: any) =>
                acc + (parseFloat(curr.sub_total) || 0),
              0,
            );
            amount = total.toLocaleString();
          } else {
            amount = parseFloat(entity.total_amount || "0").toLocaleString();
          }
        } else if (type === "target") {
          title = entity.reference || `Target #${entity.id}`;
          const monthName = months[entity.month - 1] || "Unknown Month";

          subtitle = (
            <div className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-md w-fit">
              Target: {monthName} {entity.year}
            </div>
          );
          amount = parseFloat(entity.target_amount || "0").toLocaleString();
        } else if (type === "product") {
          title = entity.product_name || `Product #${entity.id}`;
          amount = "0";
          amountLabel = "Product Request";

          subtitle = (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="text-xs text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded-md w-fit">
                  {entity.is_asset
                    ? "Asset (Inventaris)"
                    : "Non-Asset (Habis Pakai)"}
                </div>
                <div className="text-xs text-gray-500">
                  Unit: {entity.product_unit}
                </div>
              </div>

              {/* Product ID / Input Status */}
              <div>
                {entity.product_id ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Navigate to product or open detail?
                      // For now, let's open product page in new tab or just show success
                      window.open(
                        `/master-data/products?search=${entity.product_code || entity.product_name}`,
                        "_blank",
                      );
                    }}
                    className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-1 rounded border border-emerald-200 font-bold flex items-center gap-1 transition-colors"
                  >
                    <CheckCircle2 size={12} />
                    Sudah di-Input (Lihat Product)
                  </button>
                ) : (
                  <div className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded border border-gray-200 font-medium w-fit flex items-center gap-1">
                    <Ban size={12} />
                    Belum ada di Master Data
                  </div>
                )}
              </div>
            </div>
          );
        } else if (type === "inv_change") {
          title = entity.product_name || `Perubahan Master Data #${entity.id}`;
          amountLabel = "Kode Part / Produk";
          amount = entity.product_code || entity.part_number || "-";

          subtitle = (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 uppercase tracking-wider">
                  {entity.request_number || `#PCR-${entity.id}`}
                </span>
                <span className="text-xs text-gray-500 font-bold">
                  Status: <span className="text-amber-600 font-extrabold">{entity.status || "Pending"}</span>
                </span>
              </div>
              {entity.reason && (
                <div className="text-xs text-gray-600 bg-gray-50/80 px-3 py-1.5 rounded-xl border border-gray-100 max-w-lg italic font-medium">
                  &ldquo;{entity.reason}&rdquo;
                </div>
              )}
            </div>
          );
        }

        return (
          <div
            key={item.id}
            onClick={() => onView(item)}
            className="p-6 hover:bg-gray-50/50 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0 mt-1">
                <FileText size={24} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-lg">
                    {title}
                  </h3>
                  <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border border-orange-200">
                    Level {item.current_level}
                  </span>
                </div>

                {/* Subtitle Section */}
                <div className="pt-1">{subtitle}</div>

                <div className="flex items-center gap-4 text-sm text-gray-400 font-medium pt-2 border-t border-dashed border-gray-100 mt-2">
                  <div className="flex items-center gap-1.5">
                    <User size={14} />
                    <span>
                      {item.creator?.name ||
                        entity.users?.name ||
                        item.created_by ||
                        "System"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} />
                    <span>
                      {new Date(
                        entity.date || entity.created_at || item.created_at,
                      ).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 justify-end pl-14 md:pl-0">
              {type !== "product" && (
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                    {amountLabel}
                  </p>
                  <p className="text-lg font-black text-gray-900">Rp {amount}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(item, "approve");
                  }}
                  disabled={quickApprovingId === item.id}
                  className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm border border-emerald-100 active:scale-95 group/btn disabled:opacity-60 disabled:cursor-wait"
                  title="Approve"
                >
                  {quickApprovingId === item.id ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={20} />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(item, "reject");
                  }}
                  className="p-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm border border-red-100 active:scale-95"
                  title="Reject"
                >
                  <XCircle size={20} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
