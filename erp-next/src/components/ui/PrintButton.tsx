"use client";

import { useState, useEffect } from "react";
import { Printer } from "lucide-react";
import api from "@/lib/api";
import PrintPreviewModal from "./PrintPreviewModal";

interface PrintButtonProps {
  moduleKey: string;
  moduleName?: string;
  data: Record<string, any> | null;
  disabled?: boolean;
  className?: string;
}

export default function PrintButton({ moduleKey, moduleName, data, disabled, className }: PrintButtonProps) {
  const [open, setOpen] = useState(false);
  const [templateConfig, setTemplateConfig] = useState<Record<string, any> | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<Record<string, any>>({});
  const [fullData, setFullData] = useState<Record<string, any> | null>(null);

  const handleClick = async () => {
    if (!data) return;
    setLoadingTemplate(true);
    let resolvedData = { ...data };

    try {
      const hasItems = (data.items && data.items.length > 0) || (data.details && data.details.length > 0) || (data.materials && data.materials.length > 0);

      const promises: Promise<any>[] = [
        api.express.get("/settings/print-templates/" + moduleKey).catch(() => null),
        api.express.get("/settings/company").catch(() => null),
      ];

      // Auto fetch full detail if items are not present and document ID exists
      if (!hasItems && data.id) {
        if (moduleKey === "purchase_request") {
          promises.push(api.get(`/purchases/${data.id}`).catch(() => null));
        } else if (moduleKey === "purchase_order") {
          promises.push(api.express.get(`/purchase-orders/${data.id}`).catch(() => null));
        } else if (moduleKey === "goods_receipt") {
          promises.push(api.express.get(`/goods-receipts/${data.id}`).catch(() => null));
        } else if (moduleKey === "purchase_invoice") {
          promises.push(api.express.get(`/purchase-invoices/${data.id}`).catch(() => null));
        } else if (moduleKey === "sales_order") {
          promises.push(api.express.get(`/order-sheets/${data.id}`).catch(() => null));
        } else if (moduleKey === "surat_jalan") {
          promises.push(api.express.get(`/surat-jalan/${data.id}`).catch(() => null));
        } else if (moduleKey === "work_order") {
          promises.push(api.express.get(`/manufacturing/work-orders/${data.id}`).catch(() => null));
        } else if (moduleKey === "bom") {
          promises.push(api.express.get(`/boms/${data.id}`).catch(() => null));
        }
      }

      const results = await Promise.all(promises);
      const tplRes = results[0];
      const compRes = results[1];
      const detailRes = results[2];

      const cfg = tplRes?.data?.success ? tplRes.data.data.template_config : null;
      setTemplateConfig(cfg);
      if (compRes?.data) setCompanyInfo(compRes.data);

      if (detailRes?.data?.data) {
        const fetched = detailRes.data.data;
        resolvedData = {
          ...resolvedData,
          ...fetched,
          items: fetched.purchase_details || fetched.details || fetched.items || fetched.materials || resolvedData.purchase_details || resolvedData.items || [],
          purchase_details: fetched.purchase_details || fetched.details || resolvedData.purchase_details || [],
        };
      }
    } catch (e) {
      console.error("Failed to load print template or details:", e);
    } finally {
      setFullData(resolvedData);
      setLoadingTemplate(false);
      setOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={disabled || !data}
        className={className || "flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-700 text-slate-700 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"}
        title={"Cetak " + (moduleName || moduleKey)}
      >
        <Printer size={12} className={loadingTemplate ? "animate-pulse" : ""} />
        <span>{loadingTemplate ? "Loading..." : "Print"}</span>
      </button>

      {open && fullData && (
        <PrintPreviewModal
          moduleKey={moduleKey}
          moduleName={moduleName || moduleKey}
          data={fullData}
          templateConfig={templateConfig}
          companyInfo={companyInfo}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}