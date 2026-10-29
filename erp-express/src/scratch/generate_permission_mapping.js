const fs = require('fs');
const path = require('path');

const catalog = require('./all_permissions_catalog.json');
const targetPath = path.resolve('..', 'erp-next', 'src', 'lib', 'permissionMapping.ts');

const PERMISSION_GROUPS = [
  { id: "PURCHASING", name: "PURCHASING & PEMBELIAN" },
  { id: "ACCOUNTPAYABLE", name: "ACCOUNT PAYABLE (UTANG)" },
  { id: "SALES", name: "SALES & PENJUALAN" },
  { id: "ACCOUNTRECEIVABLE", name: "ACCOUNT RECEIVABLE (PIUTANG)" },
  { id: "INVENTORY", name: "INVENTORY & PERSEDIAAN" },
  { id: "MANUFACTURING", name: "MANUFACTURING & PRODUKSI" },
  { id: "CASHHANDBANK", name: "CASH & BANK" },
  { id: "GENERALLEDGER", name: "GENERAL LEDGER" },
  { id: "PENGATURAN", name: "PENGATURAN & SISTEM" },
  { id: "USER_SECURITY", name: "USER SECURITY & AUDIT" },
  { id: "REPORTS", name: "DAFTAR LAPORAN (REPORTS)" },
  { id: "CETAKANTRANSAKSI", name: "CETAKAN & BARCODE" },
  { id: "LAIN_LAIN", name: "LAIN-LAIN & MASTER DATA" }
];

// Build mapping dictionary
const mappings = {};
for (const item of catalog) {
  mappings[item.name] = {
    group: item.group,
    label: item.label
  };
}

let fileContent = `export const PERMISSION_GROUPS = ${JSON.stringify(PERMISSION_GROUPS, null, 2)};\n\n`;
fileContent += `const CUSTOM_MAPPINGS: Record<string, { group: string; label: string }> = ${JSON.stringify(mappings, null, 2)};\n\n`;

fileContent += `export function getPermissionMapping(name: string): { group: string; label: string } {
  // Check manual mappings first
  if (CUSTOM_MAPPINGS[name]) {
    return CUSTOM_MAPPINGS[name];
  }

  // Fallbacks by prefixes/keywords to automatically categorize dynamically created permissions
  const lowerName = name.toLowerCase();

  // 1. Reports
  if (lowerName.includes("report") || lowerName.includes("laporan")) {
    return { group: "REPORTS", label: formatFallbackLabel(name) };
  }

  // 2. User Security
  if (
    lowerName.includes("user") ||
    lowerName.includes("role") ||
    lowerName.includes("permission") ||
    lowerName.includes("karyawan") ||
    lowerName.includes("activity_log") ||
    lowerName.includes("error_log") ||
    lowerName.includes("approval_rule") ||
    lowerName.includes("approval_management") ||
    lowerName.includes("approval_request") ||
    lowerName.includes("daftar_shift")
  ) {
    return { group: "USER_SECURITY", label: formatFallbackLabel(name) };
  }

  // 3. Settings / Pengaturan
  if (
    lowerName.includes("setting") ||
    lowerName.includes("konfigurasi") ||
    lowerName.includes("company") ||
    lowerName.includes("currency") ||
    lowerName.includes("unit")
  ) {
    return { group: "PENGATURAN", label: formatFallbackLabel(name) };
  }

  // 4. Sales & AR
  if (lowerName.includes("sales") || lowerName.includes("customer") || lowerName.includes("komisi") || lowerName.includes("order_sheet") || lowerName.includes("forecast") || lowerName.includes("surat_jalan")) {
    return { group: "SALES", label: formatFallbackLabel(name) };
  }
  if (lowerName.includes("ar_") || lowerName.includes("piutang") || lowerName.includes("tanda_terima")) {
    return { group: "ACCOUNTRECEIVABLE", label: formatFallbackLabel(name) };
  }

  // 5. Purchases & AP
  if (lowerName.includes("purchase") || lowerName.includes("supplier") || lowerName.includes("pr_") || lowerName.includes("faktur") || lowerName.includes("penerimaan_barang")) {
    return { group: "PURCHASING", label: formatFallbackLabel(name) };
  }
  if (lowerName.includes("ap_") || lowerName.includes("utang") || lowerName.includes("payment") || lowerName.includes("pengajuan_pembayaran")) {
    return { group: "ACCOUNTPAYABLE", label: formatFallbackLabel(name) };
  }

  // 6. Inventory / Stock
  if (lowerName.includes("product") || lowerName.includes("stok") || lowerName.includes("gudang") || lowerName.includes("bom") || lowerName.includes("merek") || lowerName.includes("hpp")) {
    return { group: "INVENTORY", label: formatFallbackLabel(name) };
  }

  // 7. Manufacturing
  if (lowerName.includes("manufacturing") || lowerName.includes("mold") || lowerName.includes("machine") || lowerName.includes("work_order") || lowerName.includes("routing") || lowerName.includes("work_center") || lowerName.includes("produksi") || lowerName.includes("quality") || lowerName.includes("mrp") || lowerName.includes("mpp")) {
    return { group: "MANUFACTURING", label: formatFallbackLabel(name) };
  }

  // 8. Kas / Bank
  if (lowerName.includes("kas") || lowerName.includes("bank") || lowerName.includes("currency")) {
    return { group: "CASHHANDBANK", label: formatFallbackLabel(name) };
  }

  // 9. GL & Budget
  if (lowerName.includes("gl_") || lowerName.includes("budget") || lowerName.includes("department") || lowerName.includes("cost_center") || lowerName.includes("target")) {
    return { group: "GENERALLEDGER", label: formatFallbackLabel(name) };
  }

  // 10. Cetakan & Barcode
  if (lowerName.includes("print") || lowerName.includes("barcode")) {
    return { group: "CETAKANTRANSAKSI", label: formatFallbackLabel(name) };
  }

  // Default fallback for anything else
  return { group: "LAIN_LAIN", label: formatFallbackLabel(name) };
}

function formatFallbackLabel(name: string): string {
  return name
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
`;

fs.writeFileSync(targetPath, fileContent, 'utf8');
console.log('Successfully updated permissionMapping.ts at:', targetPath);
