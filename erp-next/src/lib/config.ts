"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

export const FORECAST_KEY = "feature_forecast_enabled";
export const PO_CUSTOMER_V12_KEY = "feature_po_customer_v12_enabled";
export const VENDOR_DELIVERY_CRUD_KEY = "feature_vendor_delivery_crud_enabled";
export const MRP_RELEASE_PR_KEY = "feature_mrp_release_pr_enabled";
export const RECEIPT_BY_SCHEDULE_KEY = "feature_receipt_by_schedule_enabled";
export const SHOW_MRP_SAFETY_STOCK_KEY = "show_mrp_safety_stock_enabled";
export const SHOW_MRP_SCRAP_LOSS_KEY = "show_mrp_scrap_loss_enabled";
export const MRP_MANUAL_FG_KEY = "enable_mrp_manual_fg_enabled";

export function isMRPManualFGEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(MRP_MANUAL_FG_KEY);
  return stored !== "false";
}

export function setMRPManualFGEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  const current = localStorage.getItem(MRP_MANUAL_FG_KEY);
  const newVal = enabled ? "true" : "false";
  if (current !== newVal) {
    localStorage.setItem(MRP_MANUAL_FG_KEY, newVal);
    window.dispatchEvent(new Event("mrp_manual_fg_config_changed"));
  }
}

export function useMRPManualFGEnabled() {
  const [enabled, setEnabled] = useState<boolean>(isMRPManualFGEnabled());

  useEffect(() => {
    setEnabled(isMRPManualFGEnabled());

    api.express.get("/settings/general")
      .then((res) => {
        if (res && res.data && typeof res.data.enable_mrp_manual_fg !== "undefined") {
          const serverVal = Boolean(res.data.enable_mrp_manual_fg);
          setMRPManualFGEnabled(serverVal);
          setEnabled(serverVal);
        }
      })
      .catch(() => {});

    const handleConfigChange = () => {
      setEnabled(isMRPManualFGEnabled());
    };

    window.addEventListener("mrp_manual_fg_config_changed", handleConfigChange);
    window.addEventListener("storage", handleConfigChange);

    return () => {
      window.removeEventListener("mrp_manual_fg_config_changed", handleConfigChange);
      window.removeEventListener("storage", handleConfigChange);
    };
  }, []);

  return enabled;
}

// --- Forecast Config ---
export function isForecastEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(FORECAST_KEY);
  return stored === "true";
}

export function setForecastEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  const current = localStorage.getItem(FORECAST_KEY);
  const newVal = enabled ? "true" : "false";
  if (current !== newVal) {
    localStorage.setItem(FORECAST_KEY, newVal);
    window.dispatchEvent(new Event("forecast_config_changed"));
  }
}

export function useForecastEnabled() {
  const [enabled, setEnabled] = useState<boolean>(isForecastEnabled());

  useEffect(() => {
    setEnabled(isForecastEnabled());

    api.express.get("/settings/general")
      .then((res) => {
        if (res && res.data && typeof res.data.enable_forecast !== "undefined") {
          const serverVal = Boolean(res.data.enable_forecast);
          setForecastEnabled(serverVal);
          setEnabled(serverVal);
        }
      })
      .catch(() => {});

    const handleConfigChange = () => {
      setEnabled(isForecastEnabled());
    };

    window.addEventListener("forecast_config_changed", handleConfigChange);
    window.addEventListener("storage", handleConfigChange);

    return () => {
      window.removeEventListener("forecast_config_changed", handleConfigChange);
      window.removeEventListener("storage", handleConfigChange);
    };
  }, []);

  return enabled;
}

// --- PO Customer V1.2 Config ---
export function isPOCustomerV12Enabled(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(PO_CUSTOMER_V12_KEY);
  return stored === "true";
}

export function setPOCustomerV12Enabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  const current = localStorage.getItem(PO_CUSTOMER_V12_KEY);
  const newVal = enabled ? "true" : "false";
  if (current !== newVal) {
    localStorage.setItem(PO_CUSTOMER_V12_KEY, newVal);
    window.dispatchEvent(new Event("po_customer_v12_config_changed"));
  }
}

export function usePOCustomerV12Enabled() {
  const [enabled, setEnabled] = useState<boolean>(isPOCustomerV12Enabled());

  useEffect(() => {
    setEnabled(isPOCustomerV12Enabled());

    api.express.get("/settings/general")
      .then((res) => {
        if (res && res.data && typeof res.data.enable_po_customer_v12 !== "undefined") {
          const serverVal = Boolean(res.data.enable_po_customer_v12);
          setPOCustomerV12Enabled(serverVal);
          setEnabled(serverVal);
        }
      })
      .catch(() => {});

    const handleConfigChange = () => {
      setEnabled(isPOCustomerV12Enabled());
    };

    window.addEventListener("po_customer_v12_config_changed", handleConfigChange);
    window.addEventListener("storage", handleConfigChange);

    return () => {
      window.removeEventListener("po_customer_v12_config_changed", handleConfigChange);
      window.removeEventListener("storage", handleConfigChange);
    };
  }, []);

  return enabled;
}

// --- Vendor Delivery Crud Config ---
export function isVendorDeliveryCrudEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(VENDOR_DELIVERY_CRUD_KEY);
  return stored === "true";
}

export function setVendorDeliveryCrudEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  const current = localStorage.getItem(VENDOR_DELIVERY_CRUD_KEY);
  const newVal = enabled ? "true" : "false";
  if (current !== newVal) {
    localStorage.setItem(VENDOR_DELIVERY_CRUD_KEY, newVal);
    window.dispatchEvent(new Event("vendor_delivery_crud_config_changed"));
  }
}

export function useVendorDeliveryCrudEnabled() {
  const [enabled, setEnabled] = useState<boolean>(isVendorDeliveryCrudEnabled());

  useEffect(() => {
    setEnabled(isVendorDeliveryCrudEnabled());

    api.express.get("/settings/general")
      .then((res) => {
        if (res && res.data && typeof res.data.enable_vendor_delivery_crud !== "undefined") {
          const serverVal = Boolean(res.data.enable_vendor_delivery_crud);
          setVendorDeliveryCrudEnabled(serverVal);
          setEnabled(serverVal);
        }
      })
      .catch(() => {});

    const handleConfigChange = () => {
      setEnabled(isVendorDeliveryCrudEnabled());
    };

    window.addEventListener("vendor_delivery_crud_config_changed", handleConfigChange);
    window.addEventListener("storage", handleConfigChange);

    return () => {
      window.removeEventListener("vendor_delivery_crud_config_changed", handleConfigChange);
      window.removeEventListener("storage", handleConfigChange);
    };
  }, []);

  return enabled;
}

// --- MRP Release PR Config ---
export function isMRPReleasePREnabled(): boolean {
  if (typeof window === "undefined") return true; // default enabled
  const stored = localStorage.getItem(MRP_RELEASE_PR_KEY);
  return stored === null ? true : stored === "true";
}

export function setMRPReleasePREnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  const current = localStorage.getItem(MRP_RELEASE_PR_KEY);
  const newVal = enabled ? "true" : "false";
  if (current !== newVal) {
    localStorage.setItem(MRP_RELEASE_PR_KEY, newVal);
    window.dispatchEvent(new Event("mrp_release_pr_config_changed"));
  }
}

export function useMRPReleasePREnabled() {
  const [enabled, setEnabled] = useState<boolean>(isMRPReleasePREnabled());

  useEffect(() => {
    setEnabled(isMRPReleasePREnabled());

    api.express.get("/settings/general")
      .then((res) => {
        if (res && res.data && typeof res.data.enable_mrp_release_pr !== "undefined") {
          const serverVal = Boolean(res.data.enable_mrp_release_pr);
          setMRPReleasePREnabled(serverVal);
          setEnabled(serverVal);
        }
      })
      .catch(() => {});

    const handleConfigChange = () => {
      setEnabled(isMRPReleasePREnabled());
    };

    window.addEventListener("mrp_release_pr_config_changed", handleConfigChange);
    window.addEventListener("storage", handleConfigChange);

    return () => {
      window.removeEventListener("mrp_release_pr_config_changed", handleConfigChange);
      window.removeEventListener("storage", handleConfigChange);
    };
  }, []);

  return enabled;
}

// --- Receipt By Schedule Config ---
export function isReceiptByScheduleEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(RECEIPT_BY_SCHEDULE_KEY);
  return stored === null ? true : stored === "true";
}

export function setReceiptByScheduleEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  const current = localStorage.getItem(RECEIPT_BY_SCHEDULE_KEY);
  const newVal = enabled ? "true" : "false";
  if (current !== newVal) {
    localStorage.setItem(RECEIPT_BY_SCHEDULE_KEY, newVal);
    window.dispatchEvent(new Event("receipt_by_schedule_config_changed"));
  }
}

export function useReceiptByScheduleEnabled() {
  const [enabled, setEnabled] = useState<boolean>(isReceiptByScheduleEnabled());

  useEffect(() => {
    setEnabled(isReceiptByScheduleEnabled());

    api.express.get("/settings/general")
      .then((res) => {
        if (res && res.data && typeof res.data.enable_receipt_by_schedule !== "undefined") {
          const serverVal = Boolean(res.data.enable_receipt_by_schedule);
          setReceiptByScheduleEnabled(serverVal);
          setEnabled(serverVal);
        }
      })
      .catch(() => {});

    const handleConfigChange = () => {
      setEnabled(isReceiptByScheduleEnabled());
    };

    window.addEventListener("receipt_by_schedule_config_changed", handleConfigChange);
    window.addEventListener("storage", handleConfigChange);

    return () => {
      window.removeEventListener("receipt_by_schedule_config_changed", handleConfigChange);
      window.removeEventListener("storage", handleConfigChange);
    };
  }, []);

  return enabled;
}

// --- Show MRP Safety Stock Config ---
export function isShowMRPSafetyStockEnabled(): boolean {
  if (typeof window === "undefined") return true; // default enabled
  const stored = localStorage.getItem(SHOW_MRP_SAFETY_STOCK_KEY);
  return stored === null ? true : stored === "true";
}

export function setShowMRPSafetyStockEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  const current = localStorage.getItem(SHOW_MRP_SAFETY_STOCK_KEY);
  const newVal = enabled ? "true" : "false";
  if (current !== newVal) {
    localStorage.setItem(SHOW_MRP_SAFETY_STOCK_KEY, newVal);
    window.dispatchEvent(new Event("show_mrp_safety_stock_config_changed"));
  }
}

export function useShowMRPSafetyStockEnabled() {
  const [enabled, setEnabled] = useState<boolean>(isShowMRPSafetyStockEnabled());

  useEffect(() => {
    setEnabled(isShowMRPSafetyStockEnabled());

    api.express.get("/settings/general")
      .then((res) => {
        if (res && res.data && typeof res.data.show_mrp_safety_stock !== "undefined") {
          const serverVal = Boolean(res.data.show_mrp_safety_stock);
          setShowMRPSafetyStockEnabled(serverVal);
          setEnabled(serverVal);
        }
      })
      .catch(() => {});

    const handleConfigChange = () => {
      setEnabled(isShowMRPSafetyStockEnabled());
    };

    window.addEventListener("show_mrp_safety_stock_config_changed", handleConfigChange);
    window.addEventListener("storage", handleConfigChange);

    return () => {
      window.removeEventListener("show_mrp_safety_stock_config_changed", handleConfigChange);
      window.removeEventListener("storage", handleConfigChange);
    };
  }, []);

  return enabled;
}

// --- Show MRP Scrap Loss Config ---
export function isShowMRPScrapLossEnabled(): boolean {
  if (typeof window === "undefined") return true; // default enabled
  const stored = localStorage.getItem(SHOW_MRP_SCRAP_LOSS_KEY);
  return stored === null ? true : stored === "true";
}

export function setShowMRPScrapLossEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  const current = localStorage.getItem(SHOW_MRP_SCRAP_LOSS_KEY);
  const newVal = enabled ? "true" : "false";
  if (current !== newVal) {
    localStorage.setItem(SHOW_MRP_SCRAP_LOSS_KEY, newVal);
    window.dispatchEvent(new Event("show_mrp_scrap_loss_config_changed"));
  }
}

export function useShowMRPScrapLossEnabled() {
  const [enabled, setEnabled] = useState<boolean>(isShowMRPScrapLossEnabled());

  useEffect(() => {
    setEnabled(isShowMRPScrapLossEnabled());

    api.express.get("/settings/general")
      .then((res) => {
        if (res && res.data && typeof res.data.show_mrp_scrap_loss !== "undefined") {
          const serverVal = Boolean(res.data.show_mrp_scrap_loss);
          setShowMRPScrapLossEnabled(serverVal);
          setEnabled(serverVal);
        }
      })
      .catch(() => {});

    const handleConfigChange = () => {
      setEnabled(isShowMRPScrapLossEnabled());
    };

    window.addEventListener("show_mrp_scrap_loss_config_changed", handleConfigChange);
    window.addEventListener("storage", handleConfigChange);

    return () => {
      window.removeEventListener("show_mrp_scrap_loss_config_changed", handleConfigChange);
      window.removeEventListener("storage", handleConfigChange);
    };
  }, []);

  return enabled;
}
