const fs = require('fs');
const path = require('path');

const structuredMenus = require('./structured_menus.json');

// Exact mapping of every single submenu to its specific permission
const MENU_TO_PERMISSION = {
  // --- Supplier & Pembelian ---
  "Supplier & Pembelian": "access_purchases",
  "Supplier": "access_suppliers",
  "Suppliers": "access_suppliers",
  "Supplier Group": "access_supplier_groups",
  "Jurnal Pembelian": "access_jurnal_pembelian",
  "Jurnal A.P.": "access_jurnal_ap",
  "Jurnal Biaya Impor V.2": "access_jurnal_biaya_impor",
  "Tutup Pending PO": "access_tutup_pending_po",
  "Transaksi A.P.": "access_transaksi_ap",
  "Permintaan Pembelian": "access_purchases",
  "Tutup PR": "access_tutup_pr",
  "Purchase Order": "access_purchase_orders",
  "Terima Barang": "access_penerimaan_barang",
  "Retur PB": "access_retur_pb",
  "Pembelian dari PO": "access_faktur_pembelian",
  "Pembelian Langsung": "access_pembelian_langsung",
  "Biaya Impor V.2": "access_biaya_impor",
  "Pelunasan Utang": "access_pelunasan_utang",
  "Retur Pembelian": "access_retur_pembelian",
  "Pengajuan Pembayaran": "access_pengajuan_pembayaran",

  // --- Customer & Penjualan ---
  "Customer & Penjualan": "access_sales",
  "Customer": "access_customers",
  "Grup Customer": "access_grup_customer",
  "Tipe Customer": "access_tipe_customer",
  "Jurnal Penjualan": "access_jurnal_penjualan",
  "Jurnal A.R.": "access_jurnal_ar",
  "Salesman": "access_salesman",
  "Weekday": "access_weekday",
  "Komisi Per Item": "access_komisi_per_item",
  "Scan Product": "access_scan_product",
  "Tutup Pending SO": "access_tutup_pending_so",
  "Transaksi A.R.": "access_transaksi_ar",
  "Forecast": "access_forecast",
  "PO Customer": "access_customer_po",
  "Order Sheet": "access_order_sheet",
  "Surat Jalan": "access_surat_jalan",
  "Retur Surat Jalan": "access_retur_surat_jalan",
  "Penjualan Via S.J.": "access_penjualan_via_sj",
  "Penjualan Via S.O.": "access_penjualan_via_so",
  "Penjualan Langsung": "access_penjualan_langsung",
  "Penerimaan Piutang": "access_penerimaan_piutang",
  "Retur Penjualan": "access_retur_penjualan",
  "Tanda Terima": "access_tanda_terima",
  "Penagihan Piutang": "access_penagihan_piutang",

  // --- Persediaan Barang ---
  "Persediaan Barang": "access_products",
  "Stok Gudang": "access_stok_gudang",
  "Inventory": "access_products",
  "Gudang": "access_gudang",
  "Kategori Barang": "access_product_categories",
  "Merek": "access_merek",
  "Jurnal Persediaan": "access_jurnal_persediaan",
  "Duplikat Barang": "access_duplikat_barang",
  "Jurnal Produksi": "access_jurnal_produksi",
  "Biaya": "access_biaya",
  "Bill of Materials": "access_boms",
  "Penyesuaian Stok": "access_penyesuaian_stok",
  "Tutup Pending SR": "access_tutup_pending_sr",
  "Stock Request": "access_stock_request",
  "Transaksi Persediaan": "access_transaksi_persediaan",
  "Penyesuaian Hpp V2": "access_penyesuaian_hpp",
  "Stok Opname": "access_stok_opname",
  "Adjust Harga Jual": "access_adjust_harga_jual",
  "Produksi Langsung": "access_produksi_langsung",
  "Schedule Pengiriman Vendor": "access_schedule_vendor",
  "Penerimaan by Schedule": "access_penerimaan_by_schedule",
  "Realisasi Bahan Baku": "access_realisasi_bahan_baku",
  "Crusher ke MATKOM": "access_penerimaan_crusher",
  "Produksi ke MATKOM": "access_penerimaan_retur_produksi",
  "QC Gate ke FG": "access_penerimaan_fg",
  "Customer Claim ke FG": "access_customer_claim_fg",
  "Surat Jalan Balikan": "access_sj_balikan",

  // --- Kas / Bank ---
  "Kas/Bank": "access_daftar_kas_bank",
  "Daftar Kas & Bank": "access_daftar_kas_bank",
  "Transaksi Kas": "access_transaksi_kas",
  "Transfer Kas": "access_transfer_kas",
  "Rekonsiliasi Bank": "access_rekonsiliasi_bank",
  "Currencies": "access_currencies",

  // --- General Ledger ---
  "General Ledger": "access_akun_gl",
  "Akun GL": "access_akun_gl",
  "GL Kategori": "access_gl_kategori",
  "Departemen": "access_departments",
  "Cost Center": "access_cost_center",
  "Budgeting": "access_budget",
  "Budgeting Cc.": "access_budget_cc",
  "Rumus Rasio Keuangan": "access_rumus_rasio_keuangan",
  "G.L. Template": "access_gl_template",
  "Transaksi G.L.": "access_transaksi_gl",

  // --- Manufacturing ---
  "Manufacturing": "access_manufacturing",
  "Daftar Mesin": "access_machines",
  "Kategori Mesin": "access_kategori_mesin",
  "Daftar Mold": "access_molds",
  "Work Center": "access_work_centers",
  "MRP (Material Planning)": "access_mrp",
  "MPP (Jadwal Mesin)": "access_planning_produksi",
  "Schedule Pengiriman": "access_schedule_vendor",
  "Penerimaan dari Schedule": "access_penerimaan_by_schedule",
  "Work Order": "access_work_orders",
  "Dashboard Transaksi": "access_dashboard_transaksi",
  "Realisasi Hasil Produksi": "access_realisasi_produksi",
  "Serah-Terima Produksi": "access_transfer_produksi",
  "Penanganan NG & Disposal": "access_ng_disposal",
  "Quality Control & QC Gate": "access_quality_control",
  "Daily Production Board": "access_daily_board",
  "Rekap Rencana & Aktual": "access_laporan_rekap_plan_prod",
  "Rekap NG / Reject": "access_laporan_rekap_ng",
  "Control Stock WHFG": "access_laporan_control_stock_whfg",
  "Achievement Rate (KPI)": "access_laporan_ach_rate",
  "KPI Leader Group": "access_laporan_ach_leader",
  "OS vs Delivery Matrix": "access_laporan_os_delivery",

  // --- Lain-lain ---
  "Lain-lain": "access_daftar_pph",
  "Daftar PPH": "access_daftar_pph",
  "Daftar Tipe PPN": "access_daftar_ppn",
  "Syarat Bayar": "access_syarat_bayar",
  "Approval Request": "access_approval_requests",
  "Update Actual": "access_prices_actual",
  "Units": "access_units",
  "Product Requests": "access_request_products",
  "Tipe Barang Jadi": "access_tipe_barang_jadi",
  "Tipe Barang": "access_tipe_barang",
  "Daftar Shift": "access_daftar_shift",

  // --- Pengaturan ---
  "Pengaturan": "access_konfigurasi_umum",
  "Konfigurasi Umum": "access_konfigurasi_umum",
  "Approval Rules": "access_approval_management",
  "Pengaturan Cetakan": "access_settings_print",

  // --- User Security ---
  "User Security": "access_role_management",
  "Data Karyawan": "access_karyawan",
  "Users & Department": "access_user_management",
  "Roles Managements": "access_role_management",
  "Activity Log": "access_activity_logs",
  "Error Logs": "access_error_logs",
  "Permissions": "access_permissions",

  // --- Laporan ---
  "Daftar Laporan": "access_reports",
  "Purchase Request Report": "access_pr_reports",
  "Master Budget Report": "access_mb_reports",
  "Laporan Penjualan": "access_laporan_penjualan",
  "Laporan Stok": "access_laporan_stok",
  "Laporan Keuangan": "access_laporan_keuangan",

  // --- Profil Perusahaan ---
  "Profil Perusahaan": "access_profil_perusahaan"
};

// Build path to permission mapping
const PATH_TO_PERMISSION = {};
for (const m of structuredMenus) {
  if (m.path && m.path !== '#' && m.path !== '/dashboard') {
    if (MENU_TO_PERMISSION[m.name]) {
      PATH_TO_PERMISSION[m.path] = MENU_TO_PERMISSION[m.name];
    }
  }
  for (const s of m.submenus) {
    if (s.path && s.path !== '#') {
      const perm = MENU_TO_PERMISSION[s.name] || MENU_TO_PERMISSION[m.name];
      if (perm) {
        PATH_TO_PERMISSION[s.path] = perm;
      }
    }
  }
}

// Generate the TypeScript file
const targetFilePath = path.resolve('..', 'erp-next', 'src', 'lib', 'routePermissions.ts');
const fileContent = `/**
 * ERP EPU - Route & Component Permission Map
 * Generated to strictly enforce Role-Based Access Control (RBAC).
 */

export const COMPONENT_PERMISSIONS: Record<string, string> = ${JSON.stringify(MENU_TO_PERMISSION, null, 2)};

export const PATH_PERMISSIONS: Record<string, string> = ${JSON.stringify(PATH_TO_PERMISSION, null, 2)};

/**
 * Helper to get the required permission for a given pathname.
 * Handles exact matches and prefix matches (e.g. /supplier-pembelian/suppliers/create).
 */
export function getRequiredPermissionForPath(pathname: string): string | null {
  if (!pathname || pathname === "/" || pathname === "/dashboard" || pathname === "/profiles" || pathname === "/login") {
    return null; // Public or default authenticated pages
  }

  // Exact match first
  if (PATH_PERMISSIONS[pathname]) {
    return PATH_PERMISSIONS[pathname];
  }

  // Prefix match (longest matching path)
  const matchingPaths = Object.keys(PATH_PERMISSIONS)
    .filter(p => pathname.startsWith(p))
    .sort((a, b) => b.length - a.length);

  if (matchingPaths.length > 0) {
    return PATH_PERMISSIONS[matchingPaths[0]];
  }

  return null;
}
`;

fs.writeFileSync(targetFilePath, fileContent, 'utf8');
console.log('Successfully written routePermissions.ts with', Object.keys(PATH_TO_PERMISSION).length, 'paths mapped!');
