"use client";

import { useState, useRef } from "react";
import { X, Printer, Settings2, FileText, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface PrintPreviewModalProps {
  moduleKey: string;
  moduleName: string;
  data: Record<string, any>;
  templateConfig: Record<string, any> | null;
  companyInfo: Record<string, any>;
  onClose: () => void;
}

const DEFAULT_CONFIG = {
  paper_size: "A4",
  orientation: "portrait",
  default_template: "half_page", // "half_page" | "full_page"
  show_header: true,
  show_logo: true,
  show_company_name: true,
  show_company_address: true,
  show_company_phone: true,
  document_title: "",
  document_subtitle: "",
  show_footer: true,
  footer_text: "",
  custom_notes: "",
  show_signature: true,
  signature_columns: 3,
  signature_labels: ["Dibuat oleh,", "Diketahui oleh,", "Menyetujui,"],
  font_size: "normal",
  show_borders: true,
  zebra_striping: true,
};

function formatDateID(val: any): string {
  if (!val) return "-";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return String(val);
  }
}

function formatDateShort(val: any): string {
  if (!val) return "-";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(val);
  }
}

function formatCurrency(val: any): string {
  const num = Number(val);
  if (isNaN(num)) return String(val || "-");
  return "Rp " + num.toLocaleString("id-ID");
}

function formatQty(val: any): string {
  const num = Number(val);
  if (isNaN(num)) return String(val ?? "1");
  return num.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface SignatureSlot {
  title: string;
  name: string;
  isApproved: boolean;
  level?: number;
}

// Extract creator and dynamic approval signatures based on actual approval workflow levels
function buildSignatureList(data: Record<string, any>, cfg: Record<string, any>): SignatureSlot[] {
  const creatorName =
    data.user?.name ||
    data.user_name ||
    data.requester_name ||
    data.requester ||
    data.creator_name ||
    "Administrator";

  const appReq = data.approval_request || data.approvalRequest || null;
  const logs: any[] = appReq?.logs || data.approval_logs || data.approvals || [];
  const ruleLevels: any[] = appReq?.rule_levels || [];

  // Identify distinct approval levels from rules and logs
  const levelSet = new Set<number>();
  ruleLevels.forEach((rl: any) => {
    const l = Number(rl.level);
    if (!isNaN(l) && l > 0) levelSet.add(l);
  });
  logs.forEach((log: any) => {
    const l = Number(log.level);
    if (!isNaN(l) && l > 0) levelSet.add(l);
  });

  const distinctLevels = Array.from(levelSet).sort((a, b) => a - b);

  // If no approval levels are found, fallback to 2 approver columns (Level 1 & Level 2)
  const totalLevels = distinctLevels.length > 0 ? distinctLevels.length : 2;
  const levelsToRender = distinctLevels.length > 0 ? distinctLevels : [1, 2];

  const slots: SignatureSlot[] = [
    {
      title: "Dibuat oleh,",
      name: creatorName,
      isApproved: true,
    },
  ];

  levelsToRender.forEach((lvl, idx) => {
    let title = "Menyetujui,";
    if (totalLevels === 1) {
      title = "Menyetujui,";
    } else if (totalLevels === 2) {
      title = idx === 0 ? "Diketahui oleh," : "Menyetujui,";
    } else if (totalLevels === 3) {
      if (idx === 0) title = "Diketahui oleh,";
      else if (idx === 1) title = "Disetujui oleh,";
      else title = "Menyetujui,";
    } else {
      if (idx === totalLevels - 1) title = `Menyetujui (Lvl ${lvl}),`;
      else title = `Diketahui (Lvl ${lvl}),`;
    }

    // Find logs for this level
    const levelLogs = logs.filter((l: any) => Number(l.level) === lvl);
    const approvedLog = levelLogs.find(
      (l: any) => l.action === "approved" || l.status === "Approved" || l.action === "APPROVED"
    );

    let name = "( .................... )";
    let isApproved = false;

    if (approvedLog) {
      name = approvedLog.user?.name || approvedLog.user_name || approvedLog.approver_name || "Approver";
      isApproved = true;
    } else if (data.status?.toLowerCase() === "approved" && idx === totalLevels - 1) {
      name = data.approved_by_name || data.approved_by || "( .................... )";
      isApproved = true;
    } else {
      // Check if there is an assigned or designated user for this rule level
      const assignedLog = levelLogs.find((l: any) => l.user_name || l.user?.name);
      const designatedUser = ruleLevels.find((rl: any) => Number(rl.level) === lvl && rl.user_name);
      const designatedName = assignedLog?.user?.name || assignedLog?.user_name || designatedUser?.user_name;
      if (designatedName) {
        name = `( ${designatedName} )`;
      }
    }

    slots.push({
      title,
      name,
      isApproved,
      level: lvl,
    });
  });

  return slots;
}

export default function PrintPreviewModal({
  moduleKey,
  moduleName,
  data,
  templateConfig,
  companyInfo,
  onClose,
}: PrintPreviewModalProps) {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const cfg = { ...DEFAULT_CONFIG, ...(templateConfig || {}) };

  // Template layout state: "half_page" or "full_page"
  const [templateType, setTemplateType] = useState<"half_page" | "full_page">(
    (cfg.default_template as "half_page" | "full_page") || "half_page"
  );

  const docTitle = cfg.document_title || moduleName;
  const items: any[] =
    data.purchase_details ||
    data.items ||
    data.materials ||
    data.details ||
    data.lines ||
    data.products ||
    [];

  const creatorName =
    data.user?.name ||
    data.user_name ||
    data.requester_name ||
    data.requester ||
    data.creator_name ||
    "Administrator";

  const signatures = buildSignatureList(data, cfg);

  // Reference number detection
  const docRef =
    data.ref_number ||
    data.reference ||
    data.wo_code ||
    data.po_number ||
    data.sj_number ||
    data.invoice_number ||
    data.code ||
    `#${data.id || "0001"}`;

  const docDate = data.date || data.wo_date || data.order_date || data.created_at || new Date();
  const deptName =
    data.department?.department_name ||
    data.department_name ||
    (data.department_id === 0 ? "Direksi" : "Production Planning and Inventory Control");
  const warehouseName = data.warehouse_name || data.nama_gudang || "MULTIPLE";
  const notesText = data.note || data.keterangan || cfg.custom_notes || "-";

  const companyName = companyInfo.company_name || "PT ERAN PLASTINDO UTAMA";
  const companyAddress =
    companyInfo.company_address ||
    "Kawasan Industri & Pergudangan Coco Park B1, Desa Kembang Kuning. RT 020/ 006, Kec. Klapanunggal\nKabupaten Bogor, Prov. Jawa Barat.\nBogor";
  const companyPhone =
    companyInfo.company_phone || "Tlp:  021 - 8686 1447   / Fax : 021 - 8686 1438";

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=950,height=750");
    if (!printWindow) return;

    const paperCSS =
      templateType === "half_page"
        ? "@page { size: 215mm 140mm; margin: 6mm 10mm; }"
        : "@page { size: A4 portrait; margin: 12mm 15mm; }";

    const logoUrl = typeof window !== "undefined" ? `${window.location.origin}/logo-epu.png` : "/logo-epu.png";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${docTitle} - ${docRef}</title>
        <meta charset="utf-8" />
        <style>
          ${paperCSS}
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          img { max-width: 100%; }
          @media print {
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML.replace(/src="\/logo-epu\.png"/g, `src="${logoUrl}"`)}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 bg-gradient-to-r from-slate-800 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Printer size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-black text-white text-sm md:text-base">{docTitle}</h2>
              <p className="text-[11px] text-slate-400 font-medium">No. Ref: {docRef}</p>
            </div>
          </div>

          {/* Template Switcher Buttons (Half Page vs Full Page) */}
          <div className="flex items-center bg-slate-700/80 p-1 rounded-2xl border border-slate-600">
            <button
              onClick={() => setTemplateType("half_page")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                templateType === "half_page"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <FileText size={13} />
              <span>Half Page (Setengah)</span>
            </button>
            <button
              onClick={() => setTemplateType("full_page")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                templateType === "full_page"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <FileText size={13} />
              <span>Full Page (A4 Penuh)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/settings/print-templates/" + moduleKey)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
              title="Edit Layout Cetakan"
            >
              <Settings2 size={13} />
              Edit Layout
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95"
            >
              <Printer size={13} />
              Cetak
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Preview Scroll Container */}
        <div className="flex-1 overflow-auto bg-slate-200 p-4 md:p-8">
          <div className="max-w-4xl mx-auto flex justify-center">
            {/* Printable Paper Box */}
            <div
              className="bg-white shadow-2xl rounded p-6 md:p-8"
              style={{
                width: templateType === "half_page" ? "215mm" : "210mm",
                minHeight: templateType === "half_page" ? "140mm" : "297mm",
                fontFamily: "Arial, sans-serif",
                color: "#000",
              }}
            >
              <div ref={printRef}>
                {/* ═════════════════════════════════════════════════════════════ */}
                {/* 1. HALF PAGE TEMPLATE (MODERN ERP CARD LAYOUT)               */}
                {/* ═════════════════════════════════════════════════════════════ */}
                {templateType === "half_page" ? (
                  <div style={{ width: "100%", fontSize: "8.5pt", color: "#0f172a", lineHeight: "1.35", textAlign: "left" }}>
                    {/* Header Row: Logo & Left-to-Right Company Info on Left, Document Title on Right */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "16px",
                        borderBottom: "2px solid #0f172a",
                        paddingBottom: "10px",
                        marginBottom: "10px",
                        width: "100%",
                      }}
                    >
                      {/* Company Info Left (Strictly Left-to-Right) */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", textAlign: "left", flex: "1 1 auto" }}>
                        {cfg.show_logo && (
                          <img
                            src="/logo-epu.png"
                            alt="Logo EPU"
                            style={{ width: "46px", height: "auto", objectFit: "contain", flexShrink: 0, marginTop: "2px" }}
                          />
                        )}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left" }}>
                          <div style={{ fontWeight: "900", fontSize: "10.5pt", color: "#0f172a", letterSpacing: "0.2px", textAlign: "left", lineHeight: 1.2 }}>
                            {companyName.toUpperCase()}
                          </div>
                          <div style={{ fontSize: "7.5pt", color: "#475569", lineHeight: "1.3", marginTop: "2px", textAlign: "left" }}>
                            Coco Park Industrial Area, Block B1 No.1
                          </div>
                          <div style={{ fontSize: "7.5pt", color: "#475569", lineHeight: "1.3", textAlign: "left" }}>
                            Kembang Kuning Village, Klapanunggal, Bogor – West Java RT 002/006 16710
                          </div>
                          <div style={{ fontSize: "7.5pt", color: "#475569", lineHeight: "1.3", marginTop: "1px", textAlign: "left" }}>
                            {companyPhone}
                          </div>
                        </div>
                      </div>

                      {/* Document Title & Meta Right */}
                      <div style={{ textAlign: "right", flex: "0 0 auto", minWidth: "170px" }}>
                        <h1 style={{ fontWeight: "900", fontSize: "13pt", color: "#0f172a", letterSpacing: "0.5px", marginBottom: "3px", textTransform: "uppercase" }}>
                          {docTitle}
                        </h1>
                        <p style={{ fontSize: "8pt", color: "#334155", margin: 0 }}>
                          No.: <strong>{docRef}</strong>
                        </p>
                        <p style={{ fontSize: "8pt", color: "#334155", margin: "1px 0 0 0" }}>
                          Tgl: <strong>{formatDateID(docDate)}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Metadata Card (Departemen, Gudang, Requester, Status) */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "4px 20px",
                        marginBottom: "10px",
                        fontSize: "8pt",
                        background: "#f8fafc",
                        padding: "7px 12px",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div>
                        <span style={{ color: "#64748b", fontWeight: "bold" }}>Departemen: </span>
                        <span style={{ fontWeight: "900", color: "#0f172a" }}>{deptName}</span>
                      </div>
                      <div>
                        <span style={{ color: "#64748b", fontWeight: "bold" }}>Gudang / Tujuan: </span>
                        <span style={{ fontWeight: "900", color: "#0f172a" }}>{warehouseName}</span>
                      </div>
                      <div>
                        <span style={{ color: "#64748b", fontWeight: "bold" }}>Requester: </span>
                        <span style={{ fontWeight: "900", color: "#0f172a" }}>{creatorName || "Administrator"}</span>
                      </div>
                      <div>
                        <span style={{ color: "#64748b", fontWeight: "bold" }}>Status Transaksi: </span>
                        <span style={{ fontWeight: "900", color: "#0f172a", textTransform: "uppercase" }}>{data.status || "PENDING"}</span>
                      </div>
                    </div>

                    {/* Item Table (Without Harga/Subtotal, using Tanggal Perlu) */}
                    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", margin: "4px 0 8px 0" }}>
                      <colgroup>
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "20%" }} />
                        <col style={{ width: "41%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "8%" }} />
                        <col style={{ width: "16%" }} />
                      </colgroup>
                      <thead>
                        <tr style={{ backgroundColor: "#1e293b" }}>
                          <th style={{ color: "#fff", padding: "6px 4px", fontSize: "8pt", fontWeight: "900", textAlign: "center", border: "1px solid #334155" }}>No</th>
                          <th style={{ color: "#fff", padding: "6px 6px", fontSize: "8pt", fontWeight: "900", textAlign: "center", border: "1px solid #334155" }}>Kode</th>
                          <th style={{ color: "#fff", padding: "6px 6px", fontSize: "8pt", fontWeight: "900", textAlign: "center", border: "1px solid #334155" }}>Nama Barang</th>
                          <th style={{ color: "#fff", padding: "6px 6px", fontSize: "8pt", fontWeight: "900", textAlign: "center", border: "1px solid #334155" }}>Qty</th>
                          <th style={{ color: "#fff", padding: "6px 6px", fontSize: "8pt", fontWeight: "900", textAlign: "center", border: "1px solid #334155" }}>Satuan</th>
                          <th style={{ color: "#fff", padding: "6px 6px", fontSize: "8pt", fontWeight: "900", textAlign: "center", border: "1px solid #334155" }}>Tanggal Perlu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.length > 0 ? (
                          items.map((it: any, idx: number) => {
                            const code = it.product?.product_code || it.product_code || it.code || it.item_code || "-";
                            const name = it.product?.product_name || it.product_name || it.name || it.description || "-";
                            const qty = it.quantity ?? it.qty ?? it.qty_required ?? it.qty_ok ?? 1;
                            const unit = it.product?.product_unit || it.unit || it.product_unit || "PCS";
                            const needDate = it.need_date || it.date || docDate;

                            return (
                              <tr key={idx} style={{ backgroundColor: idx % 2 === 1 ? "#f8fafc" : "#ffffff", verticalAlign: "top" }}>
                                <td style={{ padding: "5px 4px", fontSize: "8pt", textAlign: "center", border: "1px solid #e2e8f0" }}>{idx + 1}</td>
                                <td style={{ padding: "5px 6px", fontSize: "8pt", fontFamily: "monospace", border: "1px solid #e2e8f0", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>{code}</td>
                                <td style={{ padding: "5px 6px", fontSize: "8pt", fontWeight: "500", border: "1px solid #e2e8f0", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>{name}</td>
                                <td style={{ padding: "5px 6px", fontSize: "8pt", textAlign: "right", fontWeight: "bold", border: "1px solid #e2e8f0", wordBreak: "break-word" }}>{formatQty(qty)}</td>
                                <td style={{ padding: "5px 6px", fontSize: "8pt", textAlign: "center", border: "1px solid #e2e8f0", wordBreak: "break-word" }}>{unit.toUpperCase()}</td>
                                <td style={{ padding: "5px 6px", fontSize: "8pt", textAlign: "right", border: "1px solid #e2e8f0", wordBreak: "break-word" }}>{formatDateShort(needDate)}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} style={{ padding: "12px", textAlign: "center", color: "#94a3b8", fontSize: "8pt", fontStyle: "italic", border: "1px solid #e2e8f0" }}>
                              Tidak ada rincian item barang pada dokumen ini
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Catatan / Memo Box (Amber Styled) */}
                    <div
                      style={{
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        marginTop: "8px",
                        fontSize: "8pt",
                        color: "#1e293b",
                        display: "flex",
                        gap: "6px",
                      }}
                    >
                      <strong style={{ color: "#92400e" }}>Catatan / Memo:</strong>
                      <span style={{ wordBreak: "break-word" }}>{notesText}</span>
                    </div>

                    {/* Signature Header: City & Date (Right-aligned above signatures) */}
                    <div style={{ marginTop: "12px", fontSize: "8.5pt", fontWeight: "bold", color: "#0f172a", textAlign: "right" }}>
                      Bogor , {formatDateID(docDate)}
                    </div>

                    {/* Dynamic Approval Signatures Column */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${signatures.length}, minmax(0, 1fr))`,
                        gap: "16px",
                        marginTop: "8px",
                        textAlign: "center",
                      }}
                    >
                      {signatures.map((sig, idx) => (
                        <div key={idx} style={{ textAlign: "center", minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "8pt",
                              fontWeight: "bold",
                              marginBottom: "40px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {sig.title}
                          </div>
                          <div style={{ borderTop: "2px solid #000", width: "90%", margin: "0 auto", paddingTop: "3px" }}>
                            <span style={{ fontSize: "8pt", fontWeight: "bold", wordBreak: "break-word" }}>
                              {sig.name}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* ═════════════════════════════════════════════════════════════ */
                  /* 2. FULL PAGE TEMPLATE (A4 PORTRAIT WITH COMPREHENSIVE VIEW)  */
                  /* ═════════════════════════════════════════════════════════════ */
                  <div style={{ width: "100%", fontSize: "9pt", color: "#0f172a", lineHeight: "1.4", textAlign: "left" }}>
                    {/* Header */}
                    {cfg.show_header && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "20px",
                          borderBottom: "2px solid #0f172a",
                          paddingBottom: "12px",
                          marginBottom: "14px",
                          width: "100%",
                        }}
                      >
                        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flex: "1 1 auto" }}>
                          {cfg.show_logo && (
                            <img
                              src="/logo-epu.png"
                              alt="Logo EPU"
                              style={{ width: "48px", height: "auto", objectFit: "contain", flexShrink: 0, marginTop: "2px" }}
                            />
                          )}
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left" }}>
                            <h2 style={{ fontWeight: "900", fontSize: "11pt", color: "#0f172a", marginBottom: "2px", lineHeight: 1.2, textAlign: "left" }}>
                              {companyName.toUpperCase()}
                            </h2>
                            <p style={{ fontSize: "7.5pt", color: "#475569", lineHeight: 1.3, textAlign: "left" }}>
                              Coco Park Industrial Area, Block B1 No.1
                            </p>
                            <p style={{ fontSize: "7.5pt", color: "#475569", lineHeight: 1.3, textAlign: "left" }}>
                              Kembang Kuning Village, Klapanunggal, Bogor – West Java RT 002/006 16710
                            </p>
                            <p style={{ fontSize: "7.5pt", color: "#475569", marginTop: "2px", textAlign: "left" }}>
                              {companyPhone}
                            </p>
                          </div>
                        </div>

                        <div style={{ textAlign: "right", flex: "0 0 auto", minWidth: "180px" }}>
                          <h1 style={{ fontWeight: "900", fontSize: "13.5pt", color: "#0f172a", letterSpacing: "0.5px", marginBottom: "4px", textTransform: "uppercase" }}>
                            {docTitle}
                          </h1>
                          <p style={{ fontSize: "8pt", color: "#334155", margin: 0 }}>
                            No.: <strong>{docRef}</strong>
                          </p>
                          <p style={{ fontSize: "8pt", color: "#334155", margin: "2px 0 0 0" }}>
                            Tgl: <strong>{formatDateID(docDate)}</strong>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Metadata Grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "6px 20px",
                        marginBottom: "14px",
                        fontSize: "8.5pt",
                        background: "#f8fafc",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div>
                        <span style={{ color: "#64748b", fontWeight: "bold" }}>Departemen: </span>
                        <span style={{ fontWeight: "900", color: "#0f172a" }}>{deptName}</span>
                      </div>
                      <div>
                        <span style={{ color: "#64748b", fontWeight: "bold" }}>Gudang / Tujuan: </span>
                        <span style={{ fontWeight: "900", color: "#0f172a" }}>{warehouseName}</span>
                      </div>
                      <div>
                        <span style={{ color: "#64748b", fontWeight: "bold" }}>Requester: </span>
                        <span style={{ fontWeight: "900", color: "#0f172a" }}>{data.user?.name || data.user_name || data.requester_name || "Administrator"}</span>
                      </div>
                      <div>
                        <span style={{ color: "#64748b", fontWeight: "bold" }}>Status Transaksi: </span>
                        <span style={{ fontWeight: "900", color: "#0f172a", textTransform: "uppercase" }}>{data.status || "PENDING"}</span>
                      </div>
                    </div>

                    {/* Items Table (Without Harga/Subtotal for Purchase Request, with Tanggal Perlu) */}
                    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", marginBottom: "14px" }}>
                      <colgroup>
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "20%" }} />
                        <col style={{ width: "41%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "8%" }} />
                        <col style={{ width: "16%" }} />
                      </colgroup>
                      <thead>
                        <tr style={{ backgroundColor: "#1e293b" }}>
                          <th style={{ color: "#fff", padding: "7px 6px", fontSize: "8pt", fontWeight: "900", textAlign: "center", border: "1px solid #334155" }}>No</th>
                          <th style={{ color: "#fff", padding: "7px 6px", fontSize: "8pt", fontWeight: "900", textAlign: "center", border: "1px solid #334155" }}>Kode</th>
                          <th style={{ color: "#fff", padding: "7px 6px", fontSize: "8pt", fontWeight: "900", textAlign: "center", border: "1px solid #334155" }}>Nama Barang</th>
                          <th style={{ color: "#fff", padding: "7px 6px", fontSize: "8pt", fontWeight: "900", textAlign: "center", border: "1px solid #334155" }}>Qty</th>
                          <th style={{ color: "#fff", padding: "7px 6px", fontSize: "8pt", fontWeight: "900", textAlign: "center", border: "1px solid #334155" }}>Satuan</th>
                          <th style={{ color: "#fff", padding: "7px 6px", fontSize: "8pt", fontWeight: "900", textAlign: "center", border: "1px solid #334155" }}>Tanggal Perlu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.length > 0 ? (
                          items.map((it: any, i: number) => {
                            const code = it.product?.product_code || it.product_code || it.code || it.item_code || "-";
                            const name = it.product?.product_name || it.product_name || it.name || it.description || "-";
                            const qty = it.quantity ?? it.qty ?? it.qty_required ?? it.qty_ok ?? 1;
                            const unit = it.product?.product_unit || it.unit || it.product_unit || "PCS";
                            const needDate = it.need_date || it.date || docDate;

                            return (
                              <tr key={i} style={{ backgroundColor: i % 2 === 1 ? "#f8fafc" : "#ffffff", verticalAlign: "top" }}>
                                <td style={{ padding: "6px", fontSize: "8pt", textAlign: "center", border: "1px solid #e2e8f0" }}>{i + 1}</td>
                                <td style={{ padding: "6px", fontSize: "8pt", fontFamily: "monospace", border: "1px solid #e2e8f0", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>{code}</td>
                                <td style={{ padding: "6px", fontSize: "8pt", fontWeight: "500", border: "1px solid #e2e8f0", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>{name}</td>
                                <td style={{ padding: "6px", fontSize: "8pt", textAlign: "right", fontWeight: "bold", border: "1px solid #e2e8f0", wordBreak: "break-word" }}>{formatQty(qty)}</td>
                                <td style={{ padding: "6px", fontSize: "8pt", textAlign: "center", border: "1px solid #e2e8f0", wordBreak: "break-word" }}>{unit.toUpperCase()}</td>
                                <td style={{ padding: "6px", fontSize: "8pt", textAlign: "right", border: "1px solid #e2e8f0", wordBreak: "break-word" }}>{formatDateShort(needDate)}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: "8pt", fontStyle: "italic", border: "1px solid #e2e8f0" }}>
                              Tidak ada rincian item barang pada dokumen ini
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Notes */}
                    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "8px 12px", borderRadius: "6px", fontSize: "8pt", marginBottom: "14px", display: "flex", gap: "6px" }}>
                      <strong style={{ color: "#92400e" }}>Catatan / Memo: </strong>
                      <span style={{ wordBreak: "break-word" }}>{notesText}</span>
                    </div>

                    {/* City & Date */}
                    <div style={{ fontSize: "8.5pt", fontWeight: "bold", color: "#0f172a", marginBottom: "8px", textAlign: "right" }}>
                      Bogor , {formatDateID(docDate)}
                    </div>

                    {/* Dynamic Approval Signatures (Full Page) */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${signatures.length}, minmax(0, 1fr))`,
                        gap: "16px",
                        marginTop: "8px",
                        textAlign: "center",
                        pageBreakInside: "avoid",
                      }}
                    >
                      {signatures.map((sig, idx) => (
                        <div key={idx} style={{ textAlign: "center", minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "8.5pt",
                              fontWeight: "bold",
                              marginBottom: "45px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {sig.title}
                          </div>
                          <div style={{ borderTop: "2px solid #0f172a", width: "90%", margin: "0 auto", paddingTop: "4px" }}>
                            <span style={{ fontSize: "8.5pt", fontWeight: "bold", wordBreak: "break-word" }}>
                              {sig.name}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    {cfg.show_footer && (
                      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px", textAlign: "center", fontSize: "7pt", color: "#94a3b8", marginTop: "20px" }}>
                        {cfg.footer_text || "Dokumen ini dicetak secara otomatis oleh sistem ERP PT Eran Plastindo Utama."}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
            <span className="font-black text-gray-700">
              {templateType === "half_page" ? "📄 Half Page (Setengah Halaman / Continuous)" : "📑 Full Page (A4 Portrait)"}
            </span>
            <span>•</span>
            {signatures.filter((s) => s.isApproved && s.title !== "Dibuat oleh,").length > 0 ? (
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                <CheckCircle2 size={12} /> Disetujui ({signatures.filter((s) => s.isApproved && s.title !== "Dibuat oleh,").length}/{Math.max(1, signatures.length - 1)} Level)
              </span>
            ) : (
              <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-bold">Menunggu Approval</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-black transition-all"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-sm active:scale-95"
            >
              <Printer size={14} /> Cetak Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}