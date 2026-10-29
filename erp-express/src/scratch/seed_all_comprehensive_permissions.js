const pool = require('../config/db');

// Complete catalog of permissions grouped by module
const ALL_PERMISSIONS = [
  // =========================================================================
  // 1. PURCHASING & PEMBELIAN
  // =========================================================================
  { name: 'access_purchases', group: 'PURCHASING', label: 'Permintaan Pembelian (PR) - Akses Menu' },
  { name: 'create_purchases', group: 'PURCHASING', label: 'Permintaan Pembelian (PR) - Tambah Data' },
  { name: 'edit_purchases', group: 'PURCHASING', label: 'Permintaan Pembelian (PR) - Edit Data' },
  { name: 'delete_purchases', group: 'PURCHASING', label: 'Permintaan Pembelian (PR) - Hapus Data' },
  { name: 'show_purchases', group: 'PURCHASING', label: 'Permintaan Pembelian (PR) - Lihat Detail' },
  { name: 'print_purchases', group: 'PURCHASING', label: 'Permintaan Pembelian (PR) - Cetak Dokumen' },
  { name: 'export_purchases', group: 'PURCHASING', label: 'Permintaan Pembelian (PR) - Ekspor Excel' },
  { name: 'approve_purchases', group: 'PURCHASING', label: 'Permintaan Pembelian (PR) - Persetujuan (Approval)' },
  
  { name: 'access_tutup_pr', group: 'PURCHASING', label: 'Tutup PR - Akses Menu' },
  { name: 'edit_tutup_pr', group: 'PURCHASING', label: 'Tutup PR - Eksekusi Tutup PR' },

  { name: 'access_purchase_orders', group: 'PURCHASING', label: 'Purchase Order (PO) - Akses Menu' },
  { name: 'create_purchase_orders', group: 'PURCHASING', label: 'Purchase Order (PO) - Tambah Data' },
  { name: 'edit_purchase_orders', group: 'PURCHASING', label: 'Purchase Order (PO) - Edit Data' },
  { name: 'delete_purchase_orders', group: 'PURCHASING', label: 'Purchase Order (PO) - Hapus Data' },
  { name: 'show_purchase_orders', group: 'PURCHASING', label: 'Purchase Order (PO) - Lihat Detail' },
  { name: 'print_purchase_orders', group: 'PURCHASING', label: 'Purchase Order (PO) - Cetak PO' },
  { name: 'export_purchase_orders', group: 'PURCHASING', label: 'Purchase Order (PO) - Ekspor Excel' },
  { name: 'approve_purchase_orders', group: 'PURCHASING', label: 'Purchase Order (PO) - Persetujuan (Approval)' },

  { name: 'access_tutup_pending_po', group: 'PURCHASING', label: 'Tutup Pending PO - Akses Menu' },
  { name: 'edit_tutup_pending_po', group: 'PURCHASING', label: 'Tutup Pending PO - Eksekusi Tutup PO' },

  { name: 'access_suppliers', group: 'PURCHASING', label: 'Supplier - Akses Menu' },
  { name: 'create_suppliers', group: 'PURCHASING', label: 'Supplier - Tambah Supplier' },
  { name: 'edit_suppliers', group: 'PURCHASING', label: 'Supplier - Edit Supplier' },
  { name: 'delete_suppliers', group: 'PURCHASING', label: 'Supplier - Hapus Supplier' },
  { name: 'show_suppliers', group: 'PURCHASING', label: 'Supplier - Lihat Detail' },
  { name: 'print_suppliers', group: 'PURCHASING', label: 'Supplier - Cetak Data' },
  { name: 'export_suppliers', group: 'PURCHASING', label: 'Supplier - Ekspor Excel' },

  { name: 'access_supplier_groups', group: 'PURCHASING', label: 'Supplier Group - Akses Menu' },
  { name: 'create_supplier_groups', group: 'PURCHASING', label: 'Supplier Group - Tambah Data' },
  { name: 'edit_supplier_groups', group: 'PURCHASING', label: 'Supplier Group - Edit Data' },
  { name: 'delete_supplier_groups', group: 'PURCHASING', label: 'Supplier Group - Hapus Data' },

  { name: 'access_penerimaan_barang', group: 'PURCHASING', label: 'Terima Barang (BPB) - Akses Menu' },
  { name: 'create_penerimaan_barang', group: 'PURCHASING', label: 'Terima Barang (BPB) - Tambah Data' },
  { name: 'edit_penerimaan_barang', group: 'PURCHASING', label: 'Terima Barang (BPB) - Edit Data' },
  { name: 'delete_penerimaan_barang', group: 'PURCHASING', label: 'Terima Barang (BPB) - Hapus Data' },
  { name: 'print_penerimaan_barang', group: 'PURCHASING', label: 'Terima Barang (BPB) - Cetak Bukti' },
  { name: 'export_penerimaan_barang', group: 'PURCHASING', label: 'Terima Barang (BPB) - Ekspor Excel' },

  { name: 'access_retur_pb', group: 'PURCHASING', label: 'Retur PB - Akses Menu' },
  { name: 'create_retur_pb', group: 'PURCHASING', label: 'Retur PB - Tambah Data' },
  { name: 'edit_retur_pb', group: 'PURCHASING', label: 'Retur PB - Edit Data' },
  { name: 'delete_retur_pb', group: 'PURCHASING', label: 'Retur PB - Hapus Data' },
  { name: 'print_retur_pb', group: 'PURCHASING', label: 'Retur PB - Cetak Bukti' },

  { name: 'access_faktur_pembelian', group: 'PURCHASING', label: 'Pembelian dari PO (Faktur) - Akses Menu' },
  { name: 'create_faktur_pembelian', group: 'PURCHASING', label: 'Pembelian dari PO (Faktur) - Tambah Data' },
  { name: 'edit_faktur_pembelian', group: 'PURCHASING', label: 'Pembelian dari PO (Faktur) - Edit Data' },
  { name: 'delete_faktur_pembelian', group: 'PURCHASING', label: 'Pembelian dari PO (Faktur) - Hapus Data' },
  { name: 'print_faktur_pembelian', group: 'PURCHASING', label: 'Pembelian dari PO (Faktur) - Cetak Faktur' },
  { name: 'export_faktur_pembelian', group: 'PURCHASING', label: 'Pembelian dari PO (Faktur) - Ekspor Excel' },

  { name: 'access_pembelian_langsung', group: 'PURCHASING', label: 'Pembelian Langsung - Akses Menu' },
  { name: 'create_pembelian_langsung', group: 'PURCHASING', label: 'Pembelian Langsung - Tambah Data' },
  { name: 'edit_pembelian_langsung', group: 'PURCHASING', label: 'Pembelian Langsung - Edit Data' },
  { name: 'delete_pembelian_langsung', group: 'PURCHASING', label: 'Pembelian Langsung - Hapus Data' },
  { name: 'print_pembelian_langsung', group: 'PURCHASING', label: 'Pembelian Langsung - Cetak Dokumen' },

  { name: 'access_biaya_impor', group: 'PURCHASING', label: 'Biaya Impor V.2 - Akses Menu' },
  { name: 'create_biaya_impor', group: 'PURCHASING', label: 'Biaya Impor V.2 - Tambah Data' },
  { name: 'edit_biaya_impor', group: 'PURCHASING', label: 'Biaya Impor V.2 - Edit Data' },
  { name: 'delete_biaya_impor', group: 'PURCHASING', label: 'Biaya Impor V.2 - Hapus Data' },
  { name: 'print_biaya_impor', group: 'PURCHASING', label: 'Biaya Impor V.2 - Cetak Dokumen' },

  { name: 'access_retur_pembelian', group: 'PURCHASING', label: 'Retur Pembelian - Akses Menu' },
  { name: 'create_retur_pembelian', group: 'PURCHASING', label: 'Retur Pembelian - Tambah Data' },
  { name: 'edit_retur_pembelian', group: 'PURCHASING', label: 'Retur Pembelian - Edit Data' },
  { name: 'delete_retur_pembelian', group: 'PURCHASING', label: 'Retur Pembelian - Hapus Data' },
  { name: 'print_retur_pembelian', group: 'PURCHASING', label: 'Retur Pembelian - Cetak Dokumen' },

  { name: 'access_jurnal_pembelian', group: 'PURCHASING', label: 'Jurnal Pembelian - Akses Menu' },
  { name: 'print_jurnal_pembelian', group: 'PURCHASING', label: 'Jurnal Pembelian - Cetak Laporan' },
  { name: 'export_jurnal_pembelian', group: 'PURCHASING', label: 'Jurnal Pembelian - Ekspor Excel' },

  { name: 'access_jurnal_biaya_impor', group: 'PURCHASING', label: 'Jurnal Biaya Impor V.2 - Akses Menu' },
  { name: 'print_jurnal_biaya_impor', group: 'PURCHASING', label: 'Jurnal Biaya Impor V.2 - Cetak' },

  // =========================================================================
  // 2. ACCOUNT PAYABLE (UTANG USAHA)
  // =========================================================================
  { name: 'access_jurnal_ap', group: 'ACCOUNTPAYABLE', label: 'Jurnal A.P. - Akses Menu' },
  { name: 'print_jurnal_ap', group: 'ACCOUNTPAYABLE', label: 'Jurnal A.P. - Cetak' },
  { name: 'export_jurnal_ap', group: 'ACCOUNTPAYABLE', label: 'Jurnal A.P. - Ekspor Excel' },

  { name: 'access_transaksi_ap', group: 'ACCOUNTPAYABLE', label: 'Transaksi Kartu Utang (A.P.) - Akses Menu' },
  { name: 'create_transaksi_ap', group: 'ACCOUNTPAYABLE', label: 'Transaksi Kartu Utang (A.P.) - Tambah Data' },
  { name: 'edit_transaksi_ap', group: 'ACCOUNTPAYABLE', label: 'Transaksi Kartu Utang (A.P.) - Edit Data' },
  { name: 'delete_transaksi_ap', group: 'ACCOUNTPAYABLE', label: 'Transaksi Kartu Utang (A.P.) - Hapus Data' },

  { name: 'access_pelunasan_utang', group: 'ACCOUNTPAYABLE', label: 'Pelunasan Utang Usaha - Akses Menu' },
  { name: 'create_pelunasan_utang', group: 'ACCOUNTPAYABLE', label: 'Pelunasan Utang Usaha - Tambah Data' },
  { name: 'edit_pelunasan_utang', group: 'ACCOUNTPAYABLE', label: 'Pelunasan Utang Usaha - Edit Data' },
  { name: 'delete_pelunasan_utang', group: 'ACCOUNTPAYABLE', label: 'Pelunasan Utang Usaha - Hapus Data' },
  { name: 'print_pelunasan_utang', group: 'ACCOUNTPAYABLE', label: 'Pelunasan Utang Usaha - Cetak Bukti' },
  { name: 'approve_pelunasan_utang', group: 'ACCOUNTPAYABLE', label: 'Pelunasan Utang Usaha - Persetujuan' },

  { name: 'access_pengajuan_pembayaran', group: 'ACCOUNTPAYABLE', label: 'Pengajuan Pembayaran - Akses Menu' },
  { name: 'create_pengajuan_pembayaran', group: 'ACCOUNTPAYABLE', label: 'Pengajuan Pembayaran - Tambah Data' },
  { name: 'edit_pengajuan_pembayaran', group: 'ACCOUNTPAYABLE', label: 'Pengajuan Pembayaran - Edit Data' },
  { name: 'delete_pengajuan_pembayaran', group: 'ACCOUNTPAYABLE', label: 'Pengajuan Pembayaran - Hapus Data' },
  { name: 'print_pengajuan_pembayaran', group: 'ACCOUNTPAYABLE', label: 'Pengajuan Pembayaran - Cetak Form' },
  { name: 'approve_pengajuan_pembayaran', group: 'ACCOUNTPAYABLE', label: 'Pengajuan Pembayaran - Persetujuan' },

  // =========================================================================
  // 3. SALES & PENJUALAN
  // =========================================================================
  { name: 'access_sales', group: 'SALES', label: 'Akses Utama Menu Sales' },
  { name: 'create_sales', group: 'SALES', label: 'Sales Order - Tambah Data' },
  { name: 'edit_sales', group: 'SALES', label: 'Sales Order - Edit Data' },
  { name: 'delete_sales', group: 'SALES', label: 'Sales Order - Hapus Data' },
  { name: 'show_sales', group: 'SALES', label: 'Sales Order - Lihat Detail' },

  { name: 'access_customers', group: 'SALES', label: 'Customer - Akses Menu' },
  { name: 'create_customers', group: 'SALES', label: 'Customer - Tambah Customer' },
  { name: 'edit_customers', group: 'SALES', label: 'Customer - Edit Customer' },
  { name: 'delete_customers', group: 'SALES', label: 'Customer - Hapus Customer' },
  { name: 'show_customers', group: 'SALES', label: 'Customer - Lihat Detail' },
  { name: 'print_customers', group: 'SALES', label: 'Customer - Cetak Data' },
  { name: 'export_customers', group: 'SALES', label: 'Customer - Ekspor Excel' },

  { name: 'access_grup_customer', group: 'SALES', label: 'Grup Customer - Akses Menu' },
  { name: 'create_grup_customer', group: 'SALES', label: 'Grup Customer - Tambah Data' },
  { name: 'edit_grup_customer', group: 'SALES', label: 'Grup Customer - Edit Data' },
  { name: 'delete_grup_customer', group: 'SALES', label: 'Grup Customer - Hapus Data' },

  { name: 'access_tipe_customer', group: 'SALES', label: 'Tipe Customer - Akses Menu' },
  { name: 'create_tipe_customer', group: 'SALES', label: 'Tipe Customer - Tambah Data' },
  { name: 'edit_tipe_customer', group: 'SALES', label: 'Tipe Customer - Edit Data' },
  { name: 'delete_tipe_customer', group: 'SALES', label: 'Tipe Customer - Hapus Data' },

  { name: 'access_salesman', group: 'SALES', label: 'Salesman - Akses Menu' },
  { name: 'create_salesman', group: 'SALES', label: 'Salesman - Tambah Data' },
  { name: 'edit_salesman', group: 'SALES', label: 'Salesman - Edit Data' },
  { name: 'delete_salesman', group: 'SALES', label: 'Salesman - Hapus Data' },

  { name: 'access_weekday', group: 'SALES', label: 'Weekday - Akses Menu' },
  { name: 'create_weekday', group: 'SALES', label: 'Weekday - Tambah Setting' },
  { name: 'edit_weekday', group: 'SALES', label: 'Weekday - Edit Setting' },
  { name: 'delete_weekday', group: 'SALES', label: 'Weekday - Hapus Setting' },

  { name: 'access_komisi_per_item', group: 'SALES', label: 'Komisi Per Item - Akses Menu' },
  { name: 'create_komisi_per_item', group: 'SALES', label: 'Komisi Per Item - Tambah Setting' },
  { name: 'edit_komisi_per_item', group: 'SALES', label: 'Komisi Per Item - Edit Setting' },
  { name: 'delete_komisi_per_item', group: 'SALES', label: 'Komisi Per Item - Hapus Setting' },

  { name: 'access_scan_product', group: 'SALES', label: 'Scan Product Penjualan - Akses Menu' },

  { name: 'access_tutup_pending_so', group: 'SALES', label: 'Tutup Pending SO - Akses Menu' },
  { name: 'edit_tutup_pending_so', group: 'SALES', label: 'Tutup Pending SO - Eksekusi Tutup SO' },

  { name: 'access_forecast', group: 'SALES', label: 'Forecast / Penawaran Penjualan - Akses Menu' },
  { name: 'create_forecast', group: 'SALES', label: 'Forecast / Penawaran Penjualan - Tambah Data' },
  { name: 'edit_forecast', group: 'SALES', label: 'Forecast / Penawaran Penjualan - Edit Data' },
  { name: 'delete_forecast', group: 'SALES', label: 'Forecast / Penawaran Penjualan - Hapus Data' },
  { name: 'print_forecast', group: 'SALES', label: 'Forecast / Penawaran Penjualan - Cetak' },
  { name: 'export_forecast', group: 'SALES', label: 'Forecast / Penawaran Penjualan - Ekspor Excel' },

  { name: 'access_customer_po', group: 'SALES', label: 'PO Customer - Akses Menu' },
  { name: 'create_customer_po', group: 'SALES', label: 'PO Customer - Tambah PO Customer' },
  { name: 'edit_customer_po', group: 'SALES', label: 'PO Customer - Edit Data' },
  { name: 'delete_customer_po', group: 'SALES', label: 'PO Customer - Hapus Data' },
  { name: 'print_customer_po', group: 'SALES', label: 'PO Customer - Cetak Dokumen' },
  { name: 'export_customer_po', group: 'SALES', label: 'PO Customer - Ekspor Excel' },
  { name: 'approve_customer_po', group: 'SALES', label: 'PO Customer - Persetujuan' },

  { name: 'access_order_sheet', group: 'SALES', label: 'Order Sheet (Sales Order) - Akses Menu' },
  { name: 'create_order_sheet', group: 'SALES', label: 'Order Sheet (Sales Order) - Tambah Data' },
  { name: 'edit_order_sheet', group: 'SALES', label: 'Order Sheet (Sales Order) - Edit Data' },
  { name: 'delete_order_sheet', group: 'SALES', label: 'Order Sheet (Sales Order) - Hapus Data' },
  { name: 'show_order_sheet', group: 'SALES', label: 'Order Sheet (Sales Order) - Lihat Detail' },
  { name: 'print_order_sheet', group: 'SALES', label: 'Order Sheet (Sales Order) - Cetak SO' },
  { name: 'export_order_sheet', group: 'SALES', label: 'Order Sheet (Sales Order) - Ekspor Excel' },
  { name: 'approve_order_sheet', group: 'SALES', label: 'Order Sheet (Sales Order) - Persetujuan' },

  { name: 'access_surat_jalan', group: 'SALES', label: 'Surat Jalan (DO) - Akses Menu' },
  { name: 'create_surat_jalan', group: 'SALES', label: 'Surat Jalan (DO) - Tambah Surat Jalan' },
  { name: 'edit_surat_jalan', group: 'SALES', label: 'Surat Jalan (DO) - Edit Surat Jalan' },
  { name: 'delete_surat_jalan', group: 'SALES', label: 'Surat Jalan (DO) - Hapus Surat Jalan' },
  { name: 'print_surat_jalan', group: 'SALES', label: 'Surat Jalan (DO) - Cetak Surat Jalan' },
  { name: 'export_surat_jalan', group: 'SALES', label: 'Surat Jalan (DO) - Ekspor Excel' },
  { name: 'approve_surat_jalan', group: 'SALES', label: 'Surat Jalan (DO) - Persetujuan' },

  { name: 'access_retur_surat_jalan', group: 'SALES', label: 'Retur Surat Jalan - Akses Menu' },
  { name: 'create_retur_surat_jalan', group: 'SALES', label: 'Retur Surat Jalan - Tambah Data' },
  { name: 'edit_retur_surat_jalan', group: 'SALES', label: 'Retur Surat Jalan - Edit Data' },
  { name: 'delete_retur_surat_jalan', group: 'SALES', label: 'Retur Surat Jalan - Hapus Data' },
  { name: 'print_retur_surat_jalan', group: 'SALES', label: 'Retur Surat Jalan - Cetak Bukti' },

  { name: 'access_penjualan_via_sj', group: 'SALES', label: 'Penjualan Via S.J. - Akses Menu' },
  { name: 'create_penjualan_via_sj', group: 'SALES', label: 'Penjualan Via S.J. - Tambah Data' },
  { name: 'edit_penjualan_via_sj', group: 'SALES', label: 'Penjualan Via S.J. - Edit Data' },
  { name: 'delete_penjualan_via_sj', group: 'SALES', label: 'Penjualan Via S.J. - Hapus Data' },
  { name: 'print_penjualan_via_sj', group: 'SALES', label: 'Penjualan Via S.J. - Cetak Faktur' },

  { name: 'access_penjualan_via_so', group: 'SALES', label: 'Penjualan Via S.O. - Akses Menu' },
  { name: 'create_penjualan_via_so', group: 'SALES', label: 'Penjualan Via S.O. - Tambah Data' },
  { name: 'edit_penjualan_via_so', group: 'SALES', label: 'Penjualan Via S.O. - Edit Data' },
  { name: 'delete_penjualan_via_so', group: 'SALES', label: 'Penjualan Via S.O. - Hapus Data' },
  { name: 'print_penjualan_via_so', group: 'SALES', label: 'Penjualan Via S.O. - Cetak Faktur' },

  { name: 'access_penjualan_langsung', group: 'SALES', label: 'Penjualan Langsung - Akses Menu' },
  { name: 'create_penjualan_langsung', group: 'SALES', label: 'Penjualan Langsung - Tambah Data' },
  { name: 'edit_penjualan_langsung', group: 'SALES', label: 'Penjualan Langsung - Edit Data' },
  { name: 'delete_penjualan_langsung', group: 'SALES', label: 'Penjualan Langsung - Hapus Data' },
  { name: 'print_penjualan_langsung', group: 'SALES', label: 'Penjualan Langsung - Cetak Dokumen' },

  { name: 'access_retur_penjualan', group: 'SALES', label: 'Retur Penjualan - Akses Menu' },
  { name: 'create_retur_penjualan', group: 'SALES', label: 'Retur Penjualan - Tambah Data' },
  { name: 'edit_retur_penjualan', group: 'SALES', label: 'Retur Penjualan - Edit Data' },
  { name: 'delete_retur_penjualan', group: 'SALES', label: 'Retur Penjualan - Hapus Data' },
  { name: 'print_retur_penjualan', group: 'SALES', label: 'Retur Penjualan - Cetak Dokumen' },

  { name: 'access_jurnal_penjualan', group: 'SALES', label: 'Jurnal Penjualan - Akses Menu' },
  { name: 'print_jurnal_penjualan', group: 'SALES', label: 'Jurnal Penjualan - Cetak' },
  { name: 'export_jurnal_penjualan', group: 'SALES', label: 'Jurnal Penjualan - Ekspor Excel' },

  // =========================================================================
  // 4. ACCOUNT RECEIVABLE (PIUTANG USAHA)
  // =========================================================================
  { name: 'access_jurnal_ar', group: 'ACCOUNTRECEIVABLE', label: 'Jurnal A.R. - Akses Menu' },
  { name: 'print_jurnal_ar', group: 'ACCOUNTRECEIVABLE', label: 'Jurnal A.R. - Cetak Laporan' },
  { name: 'export_jurnal_ar', group: 'ACCOUNTRECEIVABLE', label: 'Jurnal A.R. - Ekspor Excel' },

  { name: 'access_transaksi_ar', group: 'ACCOUNTRECEIVABLE', label: 'Transaksi Kartu Piutang (A.R.) - Akses Menu' },
  { name: 'create_transaksi_ar', group: 'ACCOUNTRECEIVABLE', label: 'Transaksi Kartu Piutang (A.R.) - Tambah Data' },
  { name: 'edit_transaksi_ar', group: 'ACCOUNTRECEIVABLE', label: 'Transaksi Kartu Piutang (A.R.) - Edit Data' },
  { name: 'delete_transaksi_ar', group: 'ACCOUNTRECEIVABLE', label: 'Transaksi Kartu Piutang (A.R.) - Hapus Data' },

  { name: 'access_penerimaan_piutang', group: 'ACCOUNTRECEIVABLE', label: 'Penerimaan Piutang Customer - Akses Menu' },
  { name: 'create_penerimaan_piutang', group: 'ACCOUNTRECEIVABLE', label: 'Penerimaan Piutang Customer - Tambah Data' },
  { name: 'edit_penerimaan_piutang', group: 'ACCOUNTRECEIVABLE', label: 'Penerimaan Piutang Customer - Edit Data' },
  { name: 'delete_penerimaan_piutang', group: 'ACCOUNTRECEIVABLE', label: 'Penerimaan Piutang Customer - Hapus Data' },
  { name: 'print_penerimaan_piutang', group: 'ACCOUNTRECEIVABLE', label: 'Penerimaan Piutang Customer - Cetak Kuitansi' },
  { name: 'approve_penerimaan_piutang', group: 'ACCOUNTRECEIVABLE', label: 'Penerimaan Piutang Customer - Persetujuan' },

  { name: 'access_tanda_terima', group: 'ACCOUNTRECEIVABLE', label: 'Tanda Terima Pembayaran - Akses Menu' },
  { name: 'create_tanda_terima', group: 'ACCOUNTRECEIVABLE', label: 'Tanda Terima Pembayaran - Tambah Data' },
  { name: 'edit_tanda_terima', group: 'ACCOUNTRECEIVABLE', label: 'Tanda Terima Pembayaran - Edit Data' },
  { name: 'delete_tanda_terima', group: 'ACCOUNTRECEIVABLE', label: 'Tanda Terima Pembayaran - Hapus Data' },
  { name: 'print_tanda_terima', group: 'ACCOUNTRECEIVABLE', label: 'Tanda Terima Pembayaran - Cetak Bukti' },

  { name: 'access_penagihan_piutang', group: 'ACCOUNTRECEIVABLE', label: 'Penagihan Piutang - Akses Menu' },
  { name: 'create_penagihan_piutang', group: 'ACCOUNTRECEIVABLE', label: 'Penagihan Piutang - Tambah Jadwal' },
  { name: 'edit_penagihan_piutang', group: 'ACCOUNTRECEIVABLE', label: 'Penagihan Piutang - Edit Data' },
  { name: 'delete_penagihan_piutang', group: 'ACCOUNTRECEIVABLE', label: 'Penagihan Piutang - Hapus Data' },
  { name: 'print_penagihan_piutang', group: 'ACCOUNTRECEIVABLE', label: 'Penagihan Piutang - Cetak Daftar Tagihan' },

  // =========================================================================
  // 5. INVENTORY & PERSEDIAAN BARANG
  // =========================================================================
  { name: 'access_products', group: 'INVENTORY', label: 'Master Barang (Products) - Akses Menu' },
  { name: 'create_products', group: 'INVENTORY', label: 'Master Barang (Products) - Tambah Barang' },
  { name: 'edit_products', group: 'INVENTORY', label: 'Master Barang (Products) - Edit Barang' },
  { name: 'delete_products', group: 'INVENTORY', label: 'Master Barang (Products) - Hapus Barang' },
  { name: 'show_products', group: 'INVENTORY', label: 'Master Barang (Products) - Lihat Detail' },
  { name: 'print_products', group: 'INVENTORY', label: 'Master Barang (Products) - Cetak Data' },
  { name: 'export_products', group: 'INVENTORY', label: 'Master Barang (Products) - Ekspor Excel' },
  { name: 'print_barcodes', group: 'INVENTORY', label: 'Master Barang (Products) - Cetak Barcode' },

  { name: 'access_stok_gudang', group: 'INVENTORY', label: 'Laporan Stok Gudang - Akses Menu' },
  { name: 'print_stok_gudang', group: 'INVENTORY', label: 'Laporan Stok Gudang - Cetak' },
  { name: 'export_stok_gudang', group: 'INVENTORY', label: 'Laporan Stok Gudang - Ekspor Excel' },

  { name: 'access_gudang', group: 'INVENTORY', label: 'Master Gudang - Akses Menu' },
  { name: 'create_gudang', group: 'INVENTORY', label: 'Master Gudang - Tambah Gudang' },
  { name: 'edit_gudang', group: 'INVENTORY', label: 'Master Gudang - Edit Gudang' },
  { name: 'delete_gudang', group: 'INVENTORY', label: 'Master Gudang - Hapus Gudang' },

  { name: 'access_product_categories', group: 'INVENTORY', label: 'Kategori Barang - Akses Menu' },
  { name: 'create_product_categories', group: 'INVENTORY', label: 'Kategori Barang - Tambah Kategori' },
  { name: 'edit_product_categories', group: 'INVENTORY', label: 'Kategori Barang - Edit Kategori' },
  { name: 'delete_product_categories', group: 'INVENTORY', label: 'Kategori Barang - Hapus Kategori' },

  { name: 'access_merek', group: 'INVENTORY', label: 'Merek / Brand - Akses Menu' },
  { name: 'create_merek', group: 'INVENTORY', label: 'Merek / Brand - Tambah Merek' },
  { name: 'edit_merek', group: 'INVENTORY', label: 'Merek / Brand - Edit Merek' },
  { name: 'delete_merek', group: 'INVENTORY', label: 'Merek / Brand - Hapus Merek' },

  { name: 'access_jurnal_persediaan', group: 'INVENTORY', label: 'Jurnal Persediaan - Akses Menu' },
  { name: 'print_jurnal_persediaan', group: 'INVENTORY', label: 'Jurnal Persediaan - Cetak' },
  { name: 'export_jurnal_persediaan', group: 'INVENTORY', label: 'Jurnal Persediaan - Ekspor Excel' },

  { name: 'access_duplikat_barang', group: 'INVENTORY', label: 'Duplikat Barang - Akses Menu' },
  { name: 'create_duplikat_barang', group: 'INVENTORY', label: 'Duplikat Barang - Eksekusi Duplikasi' },

  { name: 'access_jurnal_produksi', group: 'INVENTORY', label: 'Jurnal Produksi - Akses Menu' },
  { name: 'print_jurnal_produksi', group: 'INVENTORY', label: 'Jurnal Produksi - Cetak' },
  { name: 'export_jurnal_produksi', group: 'INVENTORY', label: 'Jurnal Produksi - Ekspor Excel' },

  { name: 'access_biaya', group: 'INVENTORY', label: 'Biaya Persediaan - Akses Menu' },
  { name: 'create_biaya', group: 'INVENTORY', label: 'Biaya Persediaan - Tambah Data' },
  { name: 'edit_biaya', group: 'INVENTORY', label: 'Biaya Persediaan - Edit Data' },
  { name: 'delete_biaya', group: 'INVENTORY', label: 'Biaya Persediaan - Hapus Data' },

  { name: 'access_boms', group: 'INVENTORY', label: 'Bill of Materials (BOM) - Akses Menu' },
  { name: 'create_boms', group: 'INVENTORY', label: 'Bill of Materials (BOM) - Tambah BOM' },
  { name: 'edit_boms', group: 'INVENTORY', label: 'Bill of Materials (BOM) - Edit BOM' },
  { name: 'delete_boms', group: 'INVENTORY', label: 'Bill of Materials (BOM) - Hapus BOM' },
  { name: 'print_boms', group: 'INVENTORY', label: 'Bill of Materials (BOM) - Cetak BOM' },
  { name: 'export_boms', group: 'INVENTORY', label: 'Bill of Materials (BOM) - Ekspor Excel' },
  { name: 'approve_boms', group: 'INVENTORY', label: 'Bill of Materials (BOM) - Persetujuan' },

  { name: 'access_stok_masuk', group: 'INVENTORY', label: 'Stok Masuk - Akses Menu' },
  { name: 'create_stok_masuk', group: 'INVENTORY', label: 'Stok Masuk - Tambah Data' },
  { name: 'edit_stok_masuk', group: 'INVENTORY', label: 'Stok Masuk - Edit Data' },
  { name: 'delete_stok_masuk', group: 'INVENTORY', label: 'Stok Masuk - Hapus Data' },
  { name: 'print_stok_masuk', group: 'INVENTORY', label: 'Stok Masuk - Cetak Bukti' },

  { name: 'access_stok_keluar', group: 'INVENTORY', label: 'Stok Keluar - Akses Menu' },
  { name: 'create_stok_keluar', group: 'INVENTORY', label: 'Stok Keluar - Tambah Data' },
  { name: 'edit_stok_keluar', group: 'INVENTORY', label: 'Stok Keluar - Edit Data' },
  { name: 'delete_stok_keluar', group: 'INVENTORY', label: 'Stok Keluar - Hapus Data' },
  { name: 'print_stok_keluar', group: 'INVENTORY', label: 'Stok Keluar - Cetak Bukti' },

  { name: 'access_penyesuaian_stok', group: 'INVENTORY', label: 'Penyesuaian Stok - Akses Menu' },
  { name: 'create_penyesuaian_stok', group: 'INVENTORY', label: 'Penyesuaian Stok - Tambah Data' },
  { name: 'edit_penyesuaian_stok', group: 'INVENTORY', label: 'Penyesuaian Stok - Edit Data' },
  { name: 'delete_penyesuaian_stok', group: 'INVENTORY', label: 'Penyesuaian Stok - Hapus Data' },
  { name: 'print_penyesuaian_stok', group: 'INVENTORY', label: 'Penyesuaian Stok - Cetak Form' },
  { name: 'approve_penyesuaian_stok', group: 'INVENTORY', label: 'Penyesuaian Stok - Persetujuan' },

  { name: 'access_tutup_pending_sr', group: 'INVENTORY', label: 'Tutup Pending SR - Akses Menu' },
  { name: 'edit_tutup_pending_sr', group: 'INVENTORY', label: 'Tutup Pending SR - Eksekusi Tutup SR' },

  { name: 'access_stock_request', group: 'INVENTORY', label: 'Stock Request (SR) - Akses Menu' },
  { name: 'create_stock_request', group: 'INVENTORY', label: 'Stock Request (SR) - Tambah Data' },
  { name: 'edit_stock_request', group: 'INVENTORY', label: 'Stock Request (SR) - Edit Data' },
  { name: 'delete_stock_request', group: 'INVENTORY', label: 'Stock Request (SR) - Hapus Data' },
  { name: 'print_stock_request', group: 'INVENTORY', label: 'Stock Request (SR) - Cetak Form' },
  { name: 'approve_stock_request', group: 'INVENTORY', label: 'Stock Request (SR) - Persetujuan' },

  { name: 'access_transaksi_persediaan', group: 'INVENTORY', label: 'Transaksi Mutasi Gudang - Akses Menu' },
  { name: 'create_transaksi_persediaan', group: 'INVENTORY', label: 'Transaksi Mutasi Gudang - Tambah Mutasi' },
  { name: 'edit_transaksi_persediaan', group: 'INVENTORY', label: 'Transaksi Mutasi Gudang - Edit Mutasi' },
  { name: 'delete_transaksi_persediaan', group: 'INVENTORY', label: 'Transaksi Mutasi Gudang - Hapus Mutasi' },
  { name: 'print_transaksi_persediaan', group: 'INVENTORY', label: 'Transaksi Mutasi Gudang - Cetak Bukti' },

  { name: 'access_penyesuaian_hpp', group: 'INVENTORY', label: 'Penyesuaian HPP V.2 - Akses Menu' },
  { name: 'create_penyesuaian_hpp', group: 'INVENTORY', label: 'Penyesuaian HPP V.2 - Eksekusi Penyesuaian' },
  { name: 'approve_penyesuaian_hpp', group: 'INVENTORY', label: 'Penyesuaian HPP V.2 - Persetujuan' },

  { name: 'access_stok_opname', group: 'INVENTORY', label: 'Stok Opname - Akses Menu' },
  { name: 'create_stok_opname', group: 'INVENTORY', label: 'Stok Opname - Tambah Jadwal / Input Fisik' },
  { name: 'edit_stok_opname', group: 'INVENTORY', label: 'Stok Opname - Edit Data' },
  { name: 'delete_stok_opname', group: 'INVENTORY', label: 'Stok Opname - Hapus Data' },
  { name: 'print_stok_opname', group: 'INVENTORY', label: 'Stok Opname - Cetak Lembar Hitung' },
  { name: 'approve_stok_opname', group: 'INVENTORY', label: 'Stok Opname - Persetujuan Posting' },

  { name: 'access_adjust_harga_jual', group: 'INVENTORY', label: 'Adjust Harga Jual - Akses Menu' },
  { name: 'create_adjust_harga_jual', group: 'INVENTORY', label: 'Adjust Harga Jual - Proses Penyesuaian' },
  { name: 'approve_adjust_harga_jual', group: 'INVENTORY', label: 'Adjust Harga Jual - Persetujuan' },

  { name: 'access_produksi_langsung', group: 'INVENTORY', label: 'Produksi Langsung - Akses Menu' },
  { name: 'create_produksi_langsung', group: 'INVENTORY', label: 'Produksi Langsung - Eksekusi Produksi' },
  { name: 'print_produksi_langsung', group: 'INVENTORY', label: 'Produksi Langsung - Cetak Bukti' },

  { name: 'access_schedule_vendor', group: 'INVENTORY', label: 'Schedule Pengiriman Vendor - Akses Menu' },
  { name: 'create_schedule_vendor', group: 'INVENTORY', label: 'Schedule Pengiriman Vendor - Tambah Data' },
  { name: 'edit_schedule_vendor', group: 'INVENTORY', label: 'Schedule Pengiriman Vendor - Edit Data' },
  { name: 'delete_schedule_vendor', group: 'INVENTORY', label: 'Schedule Pengiriman Vendor - Hapus Data' },
  { name: 'print_schedule_vendor', group: 'INVENTORY', label: 'Schedule Pengiriman Vendor - Cetak Jadwal' },

  { name: 'access_penerimaan_by_schedule', group: 'INVENTORY', label: 'Penerimaan by Schedule - Akses Menu' },
  { name: 'create_penerimaan_by_schedule', group: 'INVENTORY', label: 'Penerimaan by Schedule - Proses Barcode' },

  { name: 'access_realisasi_bahan_baku', group: 'INVENTORY', label: 'Alur 2 Realisasi Bahan Baku - Akses Menu' },
  { name: 'create_realisasi_bahan_baku', group: 'INVENTORY', label: 'Alur 2 Realisasi Bahan Baku - Tambah Pengeluaran' },
  { name: 'print_realisasi_bahan_baku', group: 'INVENTORY', label: 'Alur 2 Realisasi Bahan Baku - Cetak Form' },

  { name: 'access_penerimaan_crusher', group: 'INVENTORY', label: 'Alur 3 Crusher ke MATKOM - Akses Menu' },
  { name: 'create_penerimaan_crusher', group: 'INVENTORY', label: 'Alur 3 Crusher ke MATKOM - Catat Regrind' },

  { name: 'access_penerimaan_retur_produksi', group: 'INVENTORY', label: 'Alur 4 Produksi ke MATKOM - Akses Menu' },
  { name: 'create_penerimaan_retur_produksi', group: 'INVENTORY', label: 'Alur 4 Produksi ke MATKOM - Catat Retur Sisa' },

  { name: 'access_penerimaan_fg', group: 'INVENTORY', label: 'Alur 13 QC Gate ke FG - Akses Menu' },
  { name: 'create_penerimaan_fg', group: 'INVENTORY', label: 'Alur 13 QC Gate ke FG - Penerimaan FG' },

  { name: 'access_customer_claim_fg', group: 'INVENTORY', label: 'Alur 14 Customer Claim ke FG - Akses Menu' },
  { name: 'create_customer_claim_fg', group: 'INVENTORY', label: 'Alur 14 Customer Claim ke FG - Catat Klaim' },

  { name: 'access_sj_balikan', group: 'INVENTORY', label: 'Alur 15 Surat Jalan Balikan - Akses Menu' },
  { name: 'create_sj_balikan', group: 'INVENTORY', label: 'Alur 15 Surat Jalan Balikan - Catat SJ Balikan' },

  // =========================================================================
  // 6. CASH & BANK
  // =========================================================================
  { name: 'access_daftar_kas_bank', group: 'CASHHANDBANK', label: 'Daftar Kas & Bank - Akses Menu' },
  { name: 'create_daftar_kas_bank', group: 'CASHHANDBANK', label: 'Daftar Kas & Bank - Tambah Akun' },
  { name: 'edit_daftar_kas_bank', group: 'CASHHANDBANK', label: 'Daftar Kas & Bank - Edit Akun' },
  { name: 'delete_daftar_kas_bank', group: 'CASHHANDBANK', label: 'Daftar Kas & Bank - Hapus Akun' },

  { name: 'access_transaksi_kas', group: 'CASHHANDBANK', label: 'Transaksi Kas - Akses Menu' },
  { name: 'create_transaksi_kas', group: 'CASHHANDBANK', label: 'Transaksi Kas - Tambah Transaksi' },
  { name: 'edit_transaksi_kas', group: 'CASHHANDBANK', label: 'Transaksi Kas - Edit Transaksi' },
  { name: 'delete_transaksi_kas', group: 'CASHHANDBANK', label: 'Transaksi Kas - Hapus Transaksi' },
  { name: 'print_transaksi_kas', group: 'CASHHANDBANK', label: 'Transaksi Kas - Cetak Bukti Kas' },
  { name: 'approve_transaksi_kas', group: 'CASHHANDBANK', label: 'Transaksi Kas - Persetujuan' },

  { name: 'access_transfer_kas', group: 'CASHHANDBANK', label: 'Transfer Kas - Akses Menu' },
  { name: 'create_transfer_kas', group: 'CASHHANDBANK', label: 'Transfer Kas - Tambah Transfer' },
  { name: 'edit_transfer_kas', group: 'CASHHANDBANK', label: 'Transfer Kas - Edit Transfer' },
  { name: 'delete_transfer_kas', group: 'CASHHANDBANK', label: 'Transfer Kas - Hapus Transfer' },
  { name: 'print_transfer_kas', group: 'CASHHANDBANK', label: 'Transfer Kas - Cetak Bukti Transfer' },

  { name: 'access_rekonsiliasi_bank', group: 'CASHHANDBANK', label: 'Rekonsiliasi Bank - Akses Menu' },
  { name: 'create_rekonsiliasi_bank', group: 'CASHHANDBANK', label: 'Rekonsiliasi Bank - Proses Rekonsiliasi' },
  { name: 'print_rekonsiliasi_bank', group: 'CASHHANDBANK', label: 'Rekonsiliasi Bank - Cetak' },
  { name: 'export_rekonsiliasi_bank', group: 'CASHHANDBANK', label: 'Rekonsiliasi Bank - Ekspor Excel' },

  { name: 'access_currencies', group: 'CASHHANDBANK', label: 'Currencies (Valas) - Akses Menu' },
  { name: 'create_currencies', group: 'CASHHANDBANK', label: 'Currencies (Valas) - Tambah Mata Uang' },
  { name: 'edit_currencies', group: 'CASHHANDBANK', label: 'Currencies (Valas) - Edit Kurs' },
  { name: 'delete_currencies', group: 'CASHHANDBANK', label: 'Currencies (Valas) - Hapus Mata Uang' },

  // =========================================================================
  // 7. GENERAL LEDGER & BUDGETING
  // =========================================================================
  { name: 'access_akun_gl', group: 'GENERALLEDGER', label: 'Daftar Akun GL (COA) - Akses Menu' },
  { name: 'create_akun_gl', group: 'GENERALLEDGER', label: 'Daftar Akun GL (COA) - Tambah Akun' },
  { name: 'edit_akun_gl', group: 'GENERALLEDGER', label: 'Daftar Akun GL (COA) - Edit Akun' },
  { name: 'delete_akun_gl', group: 'GENERALLEDGER', label: 'Daftar Akun GL (COA) - Hapus Akun' },
  { name: 'print_akun_gl', group: 'GENERALLEDGER', label: 'Daftar Akun GL (COA) - Cetak COA' },
  { name: 'export_akun_gl', group: 'GENERALLEDGER', label: 'Daftar Akun GL (COA) - Ekspor Excel' },

  { name: 'access_gl_kategori', group: 'GENERALLEDGER', label: 'GL Kategori - Akses Menu' },
  { name: 'create_gl_kategori', group: 'GENERALLEDGER', label: 'GL Kategori - Tambah Kategori' },
  { name: 'edit_gl_kategori', group: 'GENERALLEDGER', label: 'GL Kategori - Edit Kategori' },
  { name: 'delete_gl_kategori', group: 'GENERALLEDGER', label: 'GL Kategori - Hapus Kategori' },

  { name: 'access_departments', group: 'GENERALLEDGER', label: 'Departemen - Akses Menu' },
  { name: 'create_departments', group: 'GENERALLEDGER', label: 'Departemen - Tambah Departemen' },
  { name: 'edit_departments', group: 'GENERALLEDGER', label: 'Departemen - Edit Departemen' },
  { name: 'delete_departments', group: 'GENERALLEDGER', label: 'Departemen - Hapus Departemen' },

  { name: 'access_cost_center', group: 'GENERALLEDGER', label: 'Cost Center - Akses Menu' },
  { name: 'create_cost_center', group: 'GENERALLEDGER', label: 'Cost Center - Tambah Cost Center' },
  { name: 'edit_cost_center', group: 'GENERALLEDGER', label: 'Cost Center - Edit Cost Center' },
  { name: 'delete_cost_center', group: 'GENERALLEDGER', label: 'Cost Center - Hapus Cost Center' },

  { name: 'access_budget', group: 'GENERALLEDGER', label: 'Budgeting Tahunan - Akses Menu' },
  { name: 'create_budget', group: 'GENERALLEDGER', label: 'Budgeting Tahunan - Tambah Budget' },
  { name: 'edit_budget', group: 'GENERALLEDGER', label: 'Budgeting Tahunan - Edit Budget' },
  { name: 'delete_budget', group: 'GENERALLEDGER', label: 'Budgeting Tahunan - Hapus Budget' },
  { name: 'show_budget', group: 'GENERALLEDGER', label: 'Budgeting Tahunan - Lihat Detail' },
  { name: 'print_budget', group: 'GENERALLEDGER', label: 'Budgeting Tahunan - Cetak Budget' },
  { name: 'export_budget', group: 'GENERALLEDGER', label: 'Budgeting Tahunan - Ekspor Excel' },
  { name: 'approve_budget', group: 'GENERALLEDGER', label: 'Budgeting Tahunan - Persetujuan' },

  { name: 'access_budget_cc', group: 'GENERALLEDGER', label: 'Budgeting Cost Center - Akses Menu' },
  { name: 'create_budget_cc', group: 'GENERALLEDGER', label: 'Budgeting Cost Center - Tambah Data' },
  { name: 'edit_budget_cc', group: 'GENERALLEDGER', label: 'Budgeting Cost Center - Edit Data' },
  { name: 'delete_budget_cc', group: 'GENERALLEDGER', label: 'Budgeting Cost Center - Hapus Data' },

  { name: 'access_rumus_rasio_keuangan', group: 'GENERALLEDGER', label: 'Rumus Rasio Keuangan - Akses Menu' },
  { name: 'create_rumus_rasio_keuangan', group: 'GENERALLEDGER', label: 'Rumus Rasio Keuangan - Tambah Rumus' },
  { name: 'edit_rumus_rasio_keuangan', group: 'GENERALLEDGER', label: 'Rumus Rasio Keuangan - Edit Rumus' },
  { name: 'delete_rumus_rasio_keuangan', group: 'GENERALLEDGER', label: 'Rumus Rasio Keuangan - Hapus Rumus' },

  { name: 'access_gl_template', group: 'GENERALLEDGER', label: 'G.L. Template - Akses Menu' },
  { name: 'create_gl_template', group: 'GENERALLEDGER', label: 'G.L. Template - Tambah Template' },
  { name: 'edit_gl_template', group: 'GENERALLEDGER', label: 'G.L. Template - Edit Template' },
  { name: 'delete_gl_template', group: 'GENERALLEDGER', label: 'G.L. Template - Hapus Template' },

  { name: 'access_transaksi_gl', group: 'GENERALLEDGER', label: 'Transaksi G.L. (Jurnal Umum) - Akses Menu' },
  { name: 'create_transaksi_gl', group: 'GENERALLEDGER', label: 'Transaksi G.L. (Jurnal Umum) - Tambah Jurnal' },
  { name: 'edit_transaksi_gl', group: 'GENERALLEDGER', label: 'Transaksi G.L. (Jurnal Umum) - Edit Jurnal' },
  { name: 'delete_transaksi_gl', group: 'GENERALLEDGER', label: 'Transaksi G.L. (Jurnal Umum) - Hapus Jurnal' },
  { name: 'print_transaksi_gl', group: 'GENERALLEDGER', label: 'Transaksi G.L. (Jurnal Umum) - Cetak Voucher' },
  { name: 'approve_transaksi_gl', group: 'GENERALLEDGER', label: 'Transaksi G.L. (Jurnal Umum) - Persetujuan Posting' },

  { name: 'access_target', group: 'GENERALLEDGER', label: 'Target Sales - Akses Menu' },
  { name: 'create_target_sales', group: 'GENERALLEDGER', label: 'Target Sales - Tambah Target' },
  { name: 'edit_target_sales', group: 'GENERALLEDGER', label: 'Target Sales - Edit Target' },
  { name: 'delete_target_sales', group: 'GENERALLEDGER', label: 'Target Sales - Hapus Target' },

  // =========================================================================
  // 8. MANUFACTURING & PRODUKSI
  // =========================================================================
  { name: 'access_manufacturing', group: 'MANUFACTURING', label: 'Akses Utama Menu Manufacturing' },
  { name: 'access_machines', group: 'MANUFACTURING', label: 'Daftar Mesin - Akses Menu' },
  { name: 'create_machines', group: 'MANUFACTURING', label: 'Daftar Mesin - Tambah Mesin' },
  { name: 'edit_machines', group: 'MANUFACTURING', label: 'Daftar Mesin - Edit Mesin' },
  { name: 'delete_machines', group: 'MANUFACTURING', label: 'Daftar Mesin - Hapus Mesin' },
  { name: 'print_machines', group: 'MANUFACTURING', label: 'Daftar Mesin - Cetak Data' },

  { name: 'access_kategori_mesin', group: 'MANUFACTURING', label: 'Kategori Mesin - Akses Menu' },
  { name: 'create_kategori_mesin', group: 'MANUFACTURING', label: 'Kategori Mesin - Tambah Kategori' },
  { name: 'edit_kategori_mesin', group: 'MANUFACTURING', label: 'Kategori Mesin - Edit Kategori' },
  { name: 'delete_kategori_mesin', group: 'MANUFACTURING', label: 'Kategori Mesin - Hapus Kategori' },

  { name: 'access_molds', group: 'MANUFACTURING', label: 'Daftar Mold - Akses Menu' },
  { name: 'create_molds', group: 'MANUFACTURING', label: 'Daftar Mold - Tambah Mold' },
  { name: 'edit_molds', group: 'MANUFACTURING', label: 'Daftar Mold - Edit Mold' },
  { name: 'delete_molds', group: 'MANUFACTURING', label: 'Daftar Mold - Hapus Mold' },
  { name: 'print_molds', group: 'MANUFACTURING', label: 'Daftar Mold - Cetak Riwayat Mold' },

  { name: 'access_work_centers', group: 'MANUFACTURING', label: 'Work Center - Akses Menu' },
  { name: 'create_work_centers', group: 'MANUFACTURING', label: 'Work Center - Tambah Work Center' },
  { name: 'edit_work_centers', group: 'MANUFACTURING', label: 'Work Center - Edit Work Center' },
  { name: 'delete_work_centers', group: 'MANUFACTURING', label: 'Work Center - Hapus Work Center' },

  { name: 'access_routings', group: 'MANUFACTURING', label: 'Routing Kerja - Akses Menu' },
  { name: 'create_routings', group: 'MANUFACTURING', label: 'Routing Kerja - Tambah Routing' },
  { name: 'edit_routings', group: 'MANUFACTURING', label: 'Routing Kerja - Edit Routing' },
  { name: 'delete_routings', group: 'MANUFACTURING', label: 'Routing Kerja - Hapus Routing' },

  { name: 'access_mrp', group: 'MANUFACTURING', label: 'MRP (Material Planning) - Akses Menu' },
  { name: 'create_mrp', group: 'MANUFACTURING', label: 'MRP (Material Planning) - Simulasi MRP' },
  { name: 'export_mrp', group: 'MANUFACTURING', label: 'MRP (Material Planning) - Ekspor Excel' },

  { name: 'access_planning_produksi', group: 'MANUFACTURING', label: 'MPP (Jadwal Mesin) - Akses Menu' },
  { name: 'create_planning_produksi', group: 'MANUFACTURING', label: 'MPP (Jadwal Mesin) - Tambah Jadwal' },
  { name: 'edit_planning_produksi', group: 'MANUFACTURING', label: 'MPP (Jadwal Mesin) - Edit Jadwal' },
  { name: 'delete_planning_produksi', group: 'MANUFACTURING', label: 'MPP (Jadwal Mesin) - Hapus Jadwal' },
  { name: 'print_planning_produksi', group: 'MANUFACTURING', label: 'MPP (Jadwal Mesin) - Cetak Jadwal' },
  { name: 'approve_planning_produksi', group: 'MANUFACTURING', label: 'MPP (Jadwal Mesin) - Persetujuan' },

  { name: 'access_work_orders', group: 'MANUFACTURING', label: 'Work Order (SPK) - Akses Menu' },
  { name: 'create_work_orders', group: 'MANUFACTURING', label: 'Work Order (SPK) - Tambah WO' },
  { name: 'edit_work_orders', group: 'MANUFACTURING', label: 'Work Order (SPK) - Edit WO' },
  { name: 'delete_work_orders', group: 'MANUFACTURING', label: 'Work Order (SPK) - Hapus / Batalkan WO' },
  { name: 'print_work_orders', group: 'MANUFACTURING', label: 'Work Order (SPK) - Cetak Lembar SPK' },
  { name: 'export_work_orders', group: 'MANUFACTURING', label: 'Work Order (SPK) - Ekspor Excel' },
  { name: 'approve_work_orders', group: 'MANUFACTURING', label: 'Work Order (SPK) - Persetujuan Release' },

  { name: 'access_dashboard_transaksi', group: 'MANUFACTURING', label: 'Dashboard Transaksi Manufaktur - Akses Menu' },

  { name: 'access_realisasi_produksi', group: 'MANUFACTURING', label: 'Realisasi Hasil Produksi - Akses Menu' },
  { name: 'create_realisasi_produksi', group: 'MANUFACTURING', label: 'Realisasi Hasil Produksi - Input Hasil Produksi' },
  { name: 'print_realisasi_produksi', group: 'MANUFACTURING', label: 'Realisasi Hasil Produksi - Cetak Laporan' },

  { name: 'access_transfer_produksi', group: 'MANUFACTURING', label: 'Serah-Terima Produksi - Akses Menu' },
  { name: 'create_transfer_produksi', group: 'MANUFACTURING', label: 'Serah-Terima Produksi - Catat Transfer' },
  { name: 'print_transfer_produksi', group: 'MANUFACTURING', label: 'Serah-Terima Produksi - Cetak Bukti' },

  { name: 'access_ng_disposal', group: 'MANUFACTURING', label: 'Penanganan NG & Disposal - Akses Menu' },
  { name: 'create_ng_disposal', group: 'MANUFACTURING', label: 'Penanganan NG & Disposal - Catat NG' },
  { name: 'approve_ng_disposal', group: 'MANUFACTURING', label: 'Penanganan NG & Disposal - Persetujuan Scrap' },

  { name: 'access_quality_control', group: 'MANUFACTURING', label: 'Quality Control & QC Gate - Akses Menu' },
  { name: 'create_quality_control', group: 'MANUFACTURING', label: 'Quality Control & QC Gate - Input Inspeksi' },
  { name: 'approve_quality_control', group: 'MANUFACTURING', label: 'Quality Control & QC Gate - Persetujuan Lolos/Reject' },
  { name: 'print_quality_control', group: 'MANUFACTURING', label: 'Quality Control & QC Gate - Cetak Lembar QC' },

  { name: 'access_daily_board', group: 'MANUFACTURING', label: 'Daily Production Board - Akses Menu' },

  // =========================================================================
  // 9. PENGATURAN & SISTEM
  // =========================================================================
  { name: 'access_settings', group: 'PENGATURAN', label: 'Pengaturan Sistem - Akses Menu' },

  { name: 'access_konfigurasi_umum', group: 'PENGATURAN', label: 'Konfigurasi Umum - Akses Menu' },
  { name: 'edit_konfigurasi_umum', group: 'PENGATURAN', label: 'Konfigurasi Umum - Simpan Perubahan' },

  { name: 'access_approval_management', group: 'PENGATURAN', label: 'Approval Rules - Akses Menu' },
  { name: 'create_approval_rules', group: 'PENGATURAN', label: 'Approval Rules - Tambah Aturan' },
  { name: 'edit_approval_rules', group: 'PENGATURAN', label: 'Approval Rules - Edit Aturan' },
  { name: 'delete_approval_rules', group: 'PENGATURAN', label: 'Approval Rules - Hapus Aturan' },

  { name: 'access_settings_print', group: 'PENGATURAN', label: 'Pengaturan Cetakan - Akses Menu' },
  { name: 'edit_settings_print', group: 'PENGATURAN', label: 'Pengaturan Cetakan - Simpan Layout' },

  { name: 'access_profil_perusahaan', group: 'PENGATURAN', label: 'Profil Perusahaan - Akses Menu' },
  { name: 'edit_profil_perusahaan', group: 'PENGATURAN', label: 'Profil Perusahaan - Ubah Profil & Logo' },

  // =========================================================================
  // 10. USER SECURITY & AUDIT
  // =========================================================================
  { name: 'access_karyawan', group: 'USER_SECURITY', label: 'Data Karyawan - Akses Menu' },
  { name: 'create_karyawan', group: 'USER_SECURITY', label: 'Data Karyawan - Tambah Karyawan' },
  { name: 'edit_karyawan', group: 'USER_SECURITY', label: 'Data Karyawan - Edit Biodata' },
  { name: 'delete_karyawan', group: 'USER_SECURITY', label: 'Data Karyawan - Hapus Data' },
  { name: 'export_karyawan', group: 'USER_SECURITY', label: 'Data Karyawan - Ekspor Excel' },

  { name: 'access_user_management', group: 'USER_SECURITY', label: 'Users & Department - Akses Menu' },
  { name: 'create_users', group: 'USER_SECURITY', label: 'Users & Department - Tambah User Baru' },
  { name: 'edit_users', group: 'USER_SECURITY', label: 'Users & Department - Edit User / Password' },
  { name: 'delete_users', group: 'USER_SECURITY', label: 'Users & Department - Hapus User' },

  { name: 'access_role_management', group: 'USER_SECURITY', label: 'Roles Management - Akses Menu' },
  { name: 'create_roles', group: 'USER_SECURITY', label: 'Roles Management - Tambah Role' },
  { name: 'edit_roles', group: 'USER_SECURITY', label: 'Roles Management - Edit Role / Matriks Akses' },
  { name: 'delete_roles', group: 'USER_SECURITY', label: 'Roles Management - Hapus Role' },

  { name: 'access_permissions', group: 'USER_SECURITY', label: 'Permissions - Akses Menu' },
  { name: 'create_permissions', group: 'USER_SECURITY', label: 'Permissions - Tambah Permission' },
  { name: 'edit_permissions', group: 'USER_SECURITY', label: 'Permissions - Edit Permission' },
  { name: 'delete_permissions', group: 'USER_SECURITY', label: 'Permissions - Hapus Permission' },

  { name: 'access_activity_logs', group: 'USER_SECURITY', label: 'Activity Log (Audit Trail) - Akses Menu' },
  { name: 'export_activity_logs', group: 'USER_SECURITY', label: 'Activity Log (Audit Trail) - Ekspor Excel' },

  { name: 'access_error_logs', group: 'USER_SECURITY', label: 'Error Logs - Akses Menu' },
  { name: 'delete_error_logs', group: 'USER_SECURITY', label: 'Error Logs - Bersihkan Log' },

  // =========================================================================
  // 11. DAFTAR LAPORAN (REPORTS)
  // =========================================================================
  { name: 'access_reports', group: 'REPORTS', label: 'Akses Utama Menu Laporan' },

  { name: 'access_pr_reports', group: 'REPORTS', label: 'Laporan Purchase Request - Akses Menu' },
  { name: 'export_pr_reports', group: 'REPORTS', label: 'Laporan Purchase Request - Ekspor Excel' },

  { name: 'access_mb_reports', group: 'REPORTS', label: 'Laporan Master Budget - Akses Menu' },
  { name: 'export_mb_reports', group: 'REPORTS', label: 'Laporan Master Budget - Ekspor Excel' },

  { name: 'access_laporan_penjualan', group: 'REPORTS', label: 'Laporan Penjualan - Akses Menu' },
  { name: 'export_laporan_penjualan', group: 'REPORTS', label: 'Laporan Penjualan - Ekspor Excel' },

  { name: 'access_laporan_stok', group: 'REPORTS', label: 'Laporan Stok Gudang - Akses Menu' },
  { name: 'export_laporan_stok', group: 'REPORTS', label: 'Laporan Stok Gudang - Ekspor Excel' },

  { name: 'access_laporan_keuangan', group: 'REPORTS', label: 'Laporan Keuangan - Akses Menu' },
  { name: 'export_laporan_keuangan', group: 'REPORTS', label: 'Laporan Keuangan - Ekspor Excel' },

  { name: 'access_laporan_rekap_plan_prod', group: 'REPORTS', label: 'Laporan Rekap Rencana & Aktual - Akses Menu' },
  { name: 'export_laporan_rekap_plan_prod', group: 'REPORTS', label: 'Laporan Rekap Rencana & Aktual - Ekspor Excel' },

  { name: 'access_laporan_rekap_ng', group: 'REPORTS', label: 'Laporan Rekap NG / Reject - Akses Menu' },
  { name: 'export_laporan_rekap_ng', group: 'REPORTS', label: 'Laporan Rekap NG / Reject - Ekspor Excel' },

  { name: 'access_laporan_control_stock_whfg', group: 'REPORTS', label: 'Laporan Control Stock WHFG - Akses Menu' },
  { name: 'access_laporan_ach_rate', group: 'REPORTS', label: 'Laporan Achievement Rate (KPI) - Akses Menu' },
  { name: 'access_laporan_ach_leader', group: 'REPORTS', label: 'Laporan KPI Leader Group - Akses Menu' },
  { name: 'access_laporan_os_delivery', group: 'REPORTS', label: 'Laporan OS vs Delivery Matrix - Akses Menu' },

  // =========================================================================
  // 12. LAIN-LAIN & MASTER DATA
  // =========================================================================
  { name: 'access_daftar_pph', group: 'LAIN_LAIN', label: 'Daftar PPH - Akses Menu' },
  { name: 'create_daftar_pph', group: 'LAIN_LAIN', label: 'Daftar PPH - Tambah Data' },
  { name: 'edit_daftar_pph', group: 'LAIN_LAIN', label: 'Daftar PPH - Edit Data' },
  { name: 'delete_daftar_pph', group: 'LAIN_LAIN', label: 'Daftar PPH - Hapus Data' },

  { name: 'access_daftar_ppn', group: 'LAIN_LAIN', label: 'Daftar Tipe PPN - Akses Menu' },
  { name: 'create_daftar_ppn', group: 'LAIN_LAIN', label: 'Daftar Tipe PPN - Tambah Data' },
  { name: 'edit_daftar_ppn', group: 'LAIN_LAIN', label: 'Daftar Tipe PPN - Edit Data' },
  { name: 'delete_daftar_ppn', group: 'LAIN_LAIN', label: 'Daftar Tipe PPN - Hapus Data' },

  { name: 'access_syarat_bayar', group: 'LAIN_LAIN', label: 'Syarat Bayar (TOP) - Akses Menu' },
  { name: 'create_syarat_bayar', group: 'LAIN_LAIN', label: 'Syarat Bayar (TOP) - Tambah Data' },
  { name: 'edit_syarat_bayar', group: 'LAIN_LAIN', label: 'Syarat Bayar (TOP) - Edit Data' },
  { name: 'delete_syarat_bayar', group: 'LAIN_LAIN', label: 'Syarat Bayar (TOP) - Hapus Data' },

  { name: 'access_units', group: 'LAIN_LAIN', label: 'Satuan Unit (Units) - Akses Menu' },
  { name: 'create_units', group: 'LAIN_LAIN', label: 'Satuan Unit (Units) - Tambah Satuan' },
  { name: 'edit_units', group: 'LAIN_LAIN', label: 'Satuan Unit (Units) - Edit Satuan' },
  { name: 'delete_units', group: 'LAIN_LAIN', label: 'Satuan Unit (Units) - Hapus Satuan' },

  { name: 'access_request_products', group: 'LAIN_LAIN', label: 'Product Requests - Akses Menu' },
  { name: 'create_request_products', group: 'LAIN_LAIN', label: 'Product Requests - Tambah Request' },
  { name: 'edit_request_products', group: 'LAIN_LAIN', label: 'Product Requests - Edit Request' },
  { name: 'delete_request_products', group: 'LAIN_LAIN', label: 'Product Requests - Hapus Request' },
  { name: 'verify_request_products', group: 'LAIN_LAIN', label: 'Product Requests - Verifikasi Permintaan' },

  { name: 'access_tipe_barang_jadi', group: 'LAIN_LAIN', label: 'Tipe Barang Jadi - Akses Menu' },
  { name: 'create_tipe_barang_jadi', group: 'LAIN_LAIN', label: 'Tipe Barang Jadi - Tambah Data' },
  { name: 'edit_tipe_barang_jadi', group: 'LAIN_LAIN', label: 'Tipe Barang Jadi - Edit Data' },
  { name: 'delete_tipe_barang_jadi', group: 'LAIN_LAIN', label: 'Tipe Barang Jadi - Hapus Data' },

  { name: 'access_tipe_barang', group: 'LAIN_LAIN', label: 'Tipe Barang - Akses Menu' },
  { name: 'create_tipe_barang', group: 'LAIN_LAIN', label: 'Tipe Barang - Tambah Data' },
  { name: 'edit_tipe_barang', group: 'LAIN_LAIN', label: 'Tipe Barang - Edit Data' },
  { name: 'delete_tipe_barang', group: 'LAIN_LAIN', label: 'Tipe Barang - Hapus Data' },

  { name: 'access_daftar_shift', group: 'LAIN_LAIN', label: 'Daftar Shift Kerja - Akses Menu' },
  { name: 'create_daftar_shift', group: 'LAIN_LAIN', label: 'Daftar Shift Kerja - Tambah Shift' },
  { name: 'edit_daftar_shift', group: 'LAIN_LAIN', label: 'Daftar Shift Kerja - Edit Shift' },
  { name: 'delete_daftar_shift', group: 'LAIN_LAIN', label: 'Daftar Shift Kerja - Hapus Shift' },

  { name: 'access_approval_requests', group: 'LAIN_LAIN', label: 'Approval Request - Akses Menu' },
  { name: 'create_approval_requests', group: 'LAIN_LAIN', label: 'Approval Request - Buat Permintaan Approval' },
  { name: 'approve_approval_requests', group: 'LAIN_LAIN', label: 'Approval Request - Eksekusi Persetujuan' },

  { name: 'access_prices_actual', group: 'LAIN_LAIN', label: 'Update Actual Price - Akses Menu' },
  { name: 'update_prices_actual', group: 'LAIN_LAIN', label: 'Update Actual Price - Simpan Harga Aktual' }
];

async function seed() {
  console.log(`Starting seeding of ${ALL_PERMISSIONS.length} permissions...`);
  
  // 1. Get existing permissions
  const [existingRows] = await pool.query('SELECT id, name FROM permissions');
  const existingMap = new Map();
  existingRows.forEach(r => existingMap.set(r.name, r.id));
  console.log(`Currently ${existingRows.length} permissions exist in database.`);

  let insertedCount = 0;
  for (const perm of ALL_PERMISSIONS) {
    if (!existingMap.has(perm.name)) {
      const [result] = await pool.execute(
        'INSERT INTO permissions (name, guard_name, created_at, updated_at) VALUES (?, "web", NOW(), NOW())',
        [perm.name]
      );
      existingMap.set(perm.name, result.insertId);
      insertedCount++;
    }
  }
  console.log(`✅ Successfully inserted ${insertedCount} new permissions into database!`);

  // 2. Fetch all permission IDs again
  const [allPerms] = await pool.query('SELECT id, name FROM permissions');
  console.log(`Total permissions in database now: ${allPerms.length}`);

  // 3. Ensure Super Admin (id: 2) has ALL permissions
  const [roles] = await pool.query('SELECT id, name FROM roles WHERE name = "Super Admin"');
  if (roles.length > 0) {
    const superAdminId = roles[0].id;
    console.log(`Syncing all permissions to Super Admin (ID: ${superAdminId})...`);
    
    // Get existing super admin permissions
    const [existingSuperPerms] = await pool.query(
      'SELECT permission_id FROM role_has_permissions WHERE role_id = ?',
      [superAdminId]
    );
    const existingSet = new Set(existingSuperPerms.map(r => r.permission_id));

    const missingPerms = allPerms.filter(p => !existingSet.has(p.id));
    if (missingPerms.length > 0) {
      const values = missingPerms.map(p => [p.id, superAdminId]);
      await pool.query('INSERT INTO role_has_permissions (permission_id, role_id) VALUES ?', [values]);
      console.log(`✅ Added ${missingPerms.length} permissions to Super Admin!`);
    } else {
      console.log(`Super Admin already has all permissions.`);
    }
  }

  // 4. Save metadata JSON for frontend to use in permissionMapping.ts
  const fs = require('fs');
  fs.writeFileSync('src/scratch/all_permissions_catalog.json', JSON.stringify(ALL_PERMISSIONS, null, 2));
  console.log('Saved catalog to src/scratch/all_permissions_catalog.json');

  process.exit();
}

seed().catch(err => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
