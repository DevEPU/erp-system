const db = require('../config/db');

(async () => {
  try {
    const roleId = 1; // Admin role

    // 1. Fetch current permissions of Admin
    const [currentRows] = await db.query(`
      SELECT p.id, p.name 
      FROM permissions p 
      JOIN role_has_permissions rhp ON p.id = rhp.permission_id 
      WHERE rhp.role_id = ?
    `, [roleId]);
    const currentPermNames = new Set(currentRows.map(r => r.name));

    // 2. Fetch all permissions from DB
    const [allPerms] = await db.query('SELECT id, name FROM permissions');
    const permByName = new Map(allPerms.map(p => [p.name, p.id]));

    // ==========================================
    // EXPLICIT REVOCATIONS ACCORDING TO USER REQ
    // ==========================================
    const revokePatterns = [
      // * Kas & Bank (All revoked)
      'access_daftar_kas_bank',
      'access_transaksi_kas',
      'access_transfer_kas',
      'access_rekonsiliasi_bank',
      'create_kas_bank', 'edit_kas_bank', 'delete_kas_bank',
      'create_transaksi_kas', 'edit_transaksi_kas', 'delete_transaksi_kas',
      'create_transfer_kas', 'edit_transfer_kas', 'delete_transfer_kas',
      'create_rekonsiliasi_bank', 'edit_rekonsiliasi_bank', 'delete_rekonsiliasi_bank',

      // * General Ledger (All revoked)
      'access_akun_gl', 'create_akun_gl', 'edit_akun_gl', 'delete_akun_gl',
      'access_gl_kategori', 'create_gl_kategori', 'edit_gl_kategori', 'delete_gl_kategori',
      'access_departments', 'create_departments', 'edit_departments', 'delete_departments', 'show_departments',
      'access_cost_center', 'create_cost_center', 'edit_cost_center', 'delete_cost_center',
      'access_budget_cc', 'create_budget_cc', 'edit_budget_cc', 'delete_budget_cc',
      'access_rumus_rasio_keuangan', 'create_rumus_rasio_keuangan', 'edit_rumus_rasio_keuangan', 'delete_rumus_rasio_keuangan',
      'access_gl_template', 'create_gl_template', 'edit_gl_template', 'delete_gl_template',
      'access_transaksi_gl', 'create_transaksi_gl', 'edit_transaksi_gl', 'delete_transaksi_gl',

      // * Customer & Penjualan (Revoke all EXCEPT the 12 specified)
      'access_jurnal_penjualan', 'create_jurnal_penjualan', 'edit_jurnal_penjualan', 'delete_jurnal_penjualan',
      'access_jurnal_ar', 'create_jurnal_ar', 'edit_jurnal_ar', 'delete_jurnal_ar',
      'access_tutup_pending_so', 'edit_tutup_pending_so',
      'access_transaksi_ar', 'create_transaksi_ar', 'edit_transaksi_ar', 'delete_transaksi_ar',
      'access_penjualan_via_sj', 'create_penjualan_via_sj', 'edit_penjualan_via_sj', 'delete_penjualan_via_sj',
      'access_penjualan_via_so', 'create_penjualan_via_so', 'edit_penjualan_via_so', 'delete_penjualan_via_so',
      'access_penjualan_langsung', 'create_penjualan_langsung', 'edit_penjualan_langsung', 'delete_penjualan_langsung',
      'access_penerimaan_piutang', 'create_penerimaan_piutang', 'edit_penerimaan_piutang', 'delete_penerimaan_piutang',
      'access_retur_penjualan', 'create_retur_penjualan', 'edit_retur_penjualan', 'delete_retur_penjualan',
      'access_tanda_terima', 'create_tanda_terima', 'edit_tanda_terima', 'delete_tanda_terima',
      'access_penagihan_piutang', 'create_penagihan_piutang', 'edit_penagihan_piutang', 'delete_penagihan_piutang',
      'create_sales', 'edit_sales', 'delete_sales', 'show_sales',
      'create_pos_sales', 'create_quotation_sales', 'create_quotations', 'edit_quotations', 'delete_quotations', 'show_quotations', 'access_quotations', 'send_quotation_mails',
      'access_sale_payments', 'access_sale_return_payments', 'access_sale_returns', 'create_sale_returns', 'edit_sale_returns', 'delete_sale_returns', 'show_sale_returns',

      // * Supplier & Pembelian (Revoke all EXCEPT Supplier & Supplier Group)
      'access_jurnal_pembelian', 'create_jurnal_pembelian', 'edit_jurnal_pembelian', 'delete_jurnal_pembelian',
      'access_jurnal_ap', 'create_jurnal_ap', 'edit_jurnal_ap', 'delete_jurnal_ap',
      'access_jurnal_biaya_impor', 'create_jurnal_biaya_impor', 'edit_jurnal_biaya_impor', 'delete_jurnal_biaya_impor',
      'access_tutup_pending_po', 'edit_tutup_pending_po',
      'access_transaksi_ap', 'create_transaksi_ap', 'edit_transaksi_ap', 'delete_transaksi_ap',
      'access_purchases', 'create_purchases', 'edit_purchases', 'delete_purchases', 'show_purchases', 'approve_purchases', 'print_purchases', 'export_purchases',
      'access_tutup_pr', 'edit_tutup_pr',
      'access_purchase_orders', 'create_purchase_orders', 'edit_purchase_orders', 'delete_purchase_orders', 'show_purchase_orders', 'approve_purchase_orders',
      'access_penerimaan_barang', 'create_penerimaan_barang', 'edit_penerimaan_barang', 'delete_penerimaan_barang',
      'access_retur_pb', 'create_retur_pb', 'edit_retur_pb', 'delete_retur_pb',
      'access_faktur_pembelian', 'create_faktur_pembelian', 'edit_faktur_pembelian', 'delete_faktur_pembelian',
      'access_pembelian_langsung', 'create_pembelian_langsung', 'edit_pembelian_langsung', 'delete_pembelian_langsung',
      'access_biaya_impor', 'create_biaya_impor', 'edit_biaya_impor', 'delete_biaya_impor',
      'access_pelunasan_utang', 'create_pelunasan_utang', 'edit_pelunasan_utang', 'delete_pelunasan_utang',
      'access_retur_pembelian', 'create_purchase_returns', 'edit_purchase_returns', 'delete_purchase_returns', 'show_purchase_returns',
      'access_pengajuan_pembayaran', 'create_pengajuan_pembayaran', 'edit_pengajuan_pembayaran', 'delete_pengajuan_pembayaran',
      'access_purchase_payments', 'access_purchase_return_payments', 'access_purchase_returns',

      // * Role Management & Permission (All revoked)
      'access_role_management', 'create_roles', 'edit_roles', 'delete_roles',
      'access_permissions', 'create_permissions', 'edit_permissions', 'delete_permissions',

      // * Menu Lain Lain (Revoke all EXCEPT Product Request & Tipe Barang Jadi)
      'access_daftar_pph', 'create_daftar_pph', 'edit_daftar_pph', 'delete_daftar_pph',
      'access_daftar_ppn', 'create_daftar_ppn', 'edit_daftar_ppn', 'delete_daftar_ppn',
      'access_syarat_bayar', 'create_syarat_bayar', 'edit_syarat_bayar', 'delete_syarat_bayar',
      'access_prices_actual', 'update_prices_actual',
      'access_tipe_barang', 'create_tipe_barang', 'edit_tipe_barang', 'delete_tipe_barang',

      // * Menu Pengaturan (Revoke all EXCEPT Pengaturan Cetakan, Currencies, Unit)
      'access_konfigurasi_umum', 'edit_konfigurasi_umum',
      'access_budget', 'create_budget', 'edit_budget', 'delete_budget', 'show_budget', 'print_budget', 'export_budget', 'approve_budget', 'remaining_budget',

      // * Menu User Security (Revoke Activity Log & Error Logs, keep Data Karyawan, Daftar Shift, User&Dept, Approval Rules, Approval Request)
      'access_activity_logs', 'export_activity_logs',
      'access_error_logs', 'delete_error_logs',

      // * Menu Daftar Laporan (Revoke Purchase Request Report, Master Budget Report, Laporan Keuangan)
      'access_pr_reports', 'print_pr_reports',
      'access_mb_reports', 'export_mb_reports', 'print_mb_reports',
      'access_laporan_keuangan', 'print_laporan_keuangan'
    ];

    // ==========================================
    // EXPLICIT GRANTS ACCORDING TO USER REQ
    // ==========================================
    const grantList = [
      // Customer & Penjualan (12 allowed submenus)
      'access_customers', 'create_customers', 'edit_customers', 'delete_customers', 'show_customers',
      'access_grup_customer', 'create_grup_customer', 'edit_grup_customer', 'delete_grup_customer',
      'access_tipe_customer', 'create_tipe_customer', 'edit_tipe_customer', 'delete_tipe_customer',
      'access_salesman', 'create_salesman', 'edit_salesman', 'delete_salesman',
      'access_weekday', 'create_weekday', 'edit_weekday', 'delete_weekday',
      'access_komisi_per_item', 'create_komisi_per_item', 'edit_komisi_per_item', 'delete_komisi_per_item', 'access_rumus_komisi',
      'access_scan_product',
      'access_forecast', 'create_forecast', 'edit_forecast', 'delete_forecast',
      'access_customer_po', 'create_customer_po', 'edit_customer_po', 'delete_customer_po',
      'access_order_sheet', 'create_order_sheet', 'edit_order_sheet', 'delete_order_sheet',
      'access_surat_jalan', 'create_surat_jalan', 'edit_surat_jalan', 'delete_surat_jalan', 'print_surat_jalan',
      'access_retur_surat_jalan', 'create_retur_surat_jalan', 'edit_retur_surat_jalan', 'delete_retur_surat_jalan',
      'access_sales', // Module parent

      // Supplier & Pembelian (2 allowed submenus)
      'access_suppliers', 'create_suppliers', 'edit_suppliers', 'delete_suppliers', 'show_suppliers',
      'access_supplier_groups', 'create_supplier_groups', 'edit_supplier_groups', 'delete_supplier_groups',

      // Lain-lain (2 allowed submenus)
      'access_request_products', 'create_request_products', 'edit_request_products', 'delete_request_products', 'input_request_products', 'verify_request_products',
      'access_tipe_barang_jadi', 'create_tipe_barang_jadi', 'edit_tipe_barang_jadi', 'delete_tipe_barang_jadi',

      // Pengaturan (3 allowed submenus)
      'access_settings_print', 'create_settings_print', 'edit_settings_print', 'delete_settings_print', 'preview_settings_print',
      'access_currencies', 'create_currencies', 'edit_currencies', 'delete_currencies',
      'access_units', 'create_units', 'edit_units', 'delete_units',

      // User Security (5 allowed submenus)
      'access_karyawan', 'create_karyawan', 'edit_karyawan', 'delete_karyawan', 'export_karyawan', 'import_karyawan',
      'access_daftar_shift', 'create_daftar_shift', 'edit_daftar_shift', 'delete_daftar_shift',
      'access_user_management', 'create_users', 'edit_users', 'delete_users',
      'access_approval_management', 'access_approval_rules', 'create_approval_rules', 'edit_approval_rules', 'delete_approval_rules', 'show_approval_rules',
      'access_approval_requests', 'create_approval_requests', 'approve_approval_requests', 'reject_approval_requests', 'show_approval_requests', 'create_approval_request_logs',

      // Daftar Laporan (Allowed: Penjualan & Stok)
      'access_reports',
      'access_laporan_penjualan', 'print_laporan_penjualan',
      'access_laporan_stok', 'print_laporan_stok'
    ];

    // Compute final set
    const finalPermNames = new Set(currentPermNames);

    // Remove all revoked
    const actuallyRevoked = [];
    for (const name of revokePatterns) {
      if (finalPermNames.has(name)) {
        finalPermNames.delete(name);
        actuallyRevoked.push(name);
      }
    }

    // Add all granted
    const actuallyGranted = [];
    for (const name of grantList) {
      if (permByName.has(name) && !finalPermNames.has(name)) {
        finalPermNames.add(name);
        actuallyGranted.push(name);
      }
    }

    console.log(`\n=== DRY RUN SUMMARY FOR ROLE ADMIN (ID: 1) ===`);
    console.log(`Current permissions count: ${currentPermNames.size}`);
    console.log(`Permissions to Revoke (${actuallyRevoked.length}):`, actuallyRevoked.join(', '));
    console.log(`\nPermissions to Grant (${actuallyGranted.length}):`, actuallyGranted.join(', '));
    console.log(`\nNew total permissions count: ${finalPermNames.size}`);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
