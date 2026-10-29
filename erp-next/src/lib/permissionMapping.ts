export const PERMISSION_GROUPS = [
  {
    "id": "PURCHASING",
    "name": "PURCHASING & PEMBELIAN"
  },
  {
    "id": "ACCOUNTPAYABLE",
    "name": "ACCOUNT PAYABLE (UTANG)"
  },
  {
    "id": "SALES",
    "name": "SALES & PENJUALAN"
  },
  {
    "id": "ACCOUNTRECEIVABLE",
    "name": "ACCOUNT RECEIVABLE (PIUTANG)"
  },
  {
    "id": "INVENTORY",
    "name": "INVENTORY & PERSEDIAAN"
  },
  {
    "id": "MANUFACTURING",
    "name": "MANUFACTURING & PRODUKSI"
  },
  {
    "id": "CASHHANDBANK",
    "name": "CASH & BANK"
  },
  {
    "id": "GENERALLEDGER",
    "name": "GENERAL LEDGER"
  },
  {
    "id": "PENGATURAN",
    "name": "PENGATURAN & SISTEM"
  },
  {
    "id": "USER_SECURITY",
    "name": "USER SECURITY & AUDIT"
  },
  {
    "id": "REPORTS",
    "name": "DAFTAR LAPORAN (REPORTS)"
  },
  {
    "id": "CETAKANTRANSAKSI",
    "name": "CETAKAN & BARCODE"
  },
  {
    "id": "LAIN_LAIN",
    "name": "LAIN-LAIN & MASTER DATA"
  }
];

const CUSTOM_MAPPINGS: Record<string, { group: string; label: string }> = {
  "access_purchases": {
    "group": "PURCHASING",
    "label": "Permintaan Pembelian (PR) - Akses Menu"
  },
  "create_purchases": {
    "group": "PURCHASING",
    "label": "Permintaan Pembelian (PR) - Tambah Data"
  },
  "edit_purchases": {
    "group": "PURCHASING",
    "label": "Permintaan Pembelian (PR) - Edit Data"
  },
  "delete_purchases": {
    "group": "PURCHASING",
    "label": "Permintaan Pembelian (PR) - Hapus Data"
  },
  "show_purchases": {
    "group": "PURCHASING",
    "label": "Permintaan Pembelian (PR) - Lihat Detail"
  },
  "print_purchases": {
    "group": "PURCHASING",
    "label": "Permintaan Pembelian (PR) - Cetak Dokumen"
  },
  "export_purchases": {
    "group": "PURCHASING",
    "label": "Permintaan Pembelian (PR) - Ekspor Excel"
  },
  "approve_purchases": {
    "group": "PURCHASING",
    "label": "Permintaan Pembelian (PR) - Persetujuan (Approval)"
  },
  "access_tutup_pr": {
    "group": "PURCHASING",
    "label": "Tutup PR - Akses Menu"
  },
  "edit_tutup_pr": {
    "group": "PURCHASING",
    "label": "Tutup PR - Eksekusi Tutup PR"
  },
  "access_purchase_orders": {
    "group": "PURCHASING",
    "label": "Purchase Order (PO) - Akses Menu"
  },
  "create_purchase_orders": {
    "group": "PURCHASING",
    "label": "Purchase Order (PO) - Tambah Data"
  },
  "edit_purchase_orders": {
    "group": "PURCHASING",
    "label": "Purchase Order (PO) - Edit Data"
  },
  "delete_purchase_orders": {
    "group": "PURCHASING",
    "label": "Purchase Order (PO) - Hapus Data"
  },
  "show_purchase_orders": {
    "group": "PURCHASING",
    "label": "Purchase Order (PO) - Lihat Detail"
  },
  "print_purchase_orders": {
    "group": "PURCHASING",
    "label": "Purchase Order (PO) - Cetak PO"
  },
  "export_purchase_orders": {
    "group": "PURCHASING",
    "label": "Purchase Order (PO) - Ekspor Excel"
  },
  "approve_purchase_orders": {
    "group": "PURCHASING",
    "label": "Purchase Order (PO) - Persetujuan (Approval)"
  },
  "access_tutup_pending_po": {
    "group": "PURCHASING",
    "label": "Tutup Pending PO - Akses Menu"
  },
  "edit_tutup_pending_po": {
    "group": "PURCHASING",
    "label": "Tutup Pending PO - Eksekusi Tutup PO"
  },
  "access_suppliers": {
    "group": "PURCHASING",
    "label": "Supplier - Akses Menu"
  },
  "create_suppliers": {
    "group": "PURCHASING",
    "label": "Supplier - Tambah Supplier"
  },
  "edit_suppliers": {
    "group": "PURCHASING",
    "label": "Supplier - Edit Supplier"
  },
  "delete_suppliers": {
    "group": "PURCHASING",
    "label": "Supplier - Hapus Supplier"
  },
  "show_suppliers": {
    "group": "PURCHASING",
    "label": "Supplier - Lihat Detail"
  },
  "print_suppliers": {
    "group": "PURCHASING",
    "label": "Supplier - Cetak Data"
  },
  "export_suppliers": {
    "group": "PURCHASING",
    "label": "Supplier - Ekspor Excel"
  },
  "access_supplier_groups": {
    "group": "PURCHASING",
    "label": "Supplier Group - Akses Menu"
  },
  "create_supplier_groups": {
    "group": "PURCHASING",
    "label": "Supplier Group - Tambah Data"
  },
  "edit_supplier_groups": {
    "group": "PURCHASING",
    "label": "Supplier Group - Edit Data"
  },
  "delete_supplier_groups": {
    "group": "PURCHASING",
    "label": "Supplier Group - Hapus Data"
  },
  "access_penerimaan_barang": {
    "group": "PURCHASING",
    "label": "Terima Barang (BPB) - Akses Menu"
  },
  "create_penerimaan_barang": {
    "group": "PURCHASING",
    "label": "Terima Barang (BPB) - Tambah Data"
  },
  "edit_penerimaan_barang": {
    "group": "PURCHASING",
    "label": "Terima Barang (BPB) - Edit Data"
  },
  "delete_penerimaan_barang": {
    "group": "PURCHASING",
    "label": "Terima Barang (BPB) - Hapus Data"
  },
  "print_penerimaan_barang": {
    "group": "PURCHASING",
    "label": "Terima Barang (BPB) - Cetak Bukti"
  },
  "export_penerimaan_barang": {
    "group": "PURCHASING",
    "label": "Terima Barang (BPB) - Ekspor Excel"
  },
  "access_retur_pb": {
    "group": "PURCHASING",
    "label": "Retur PB - Akses Menu"
  },
  "create_retur_pb": {
    "group": "PURCHASING",
    "label": "Retur PB - Tambah Data"
  },
  "edit_retur_pb": {
    "group": "PURCHASING",
    "label": "Retur PB - Edit Data"
  },
  "delete_retur_pb": {
    "group": "PURCHASING",
    "label": "Retur PB - Hapus Data"
  },
  "print_retur_pb": {
    "group": "PURCHASING",
    "label": "Retur PB - Cetak Bukti"
  },
  "access_faktur_pembelian": {
    "group": "PURCHASING",
    "label": "Pembelian dari PO (Faktur) - Akses Menu"
  },
  "create_faktur_pembelian": {
    "group": "PURCHASING",
    "label": "Pembelian dari PO (Faktur) - Tambah Data"
  },
  "edit_faktur_pembelian": {
    "group": "PURCHASING",
    "label": "Pembelian dari PO (Faktur) - Edit Data"
  },
  "delete_faktur_pembelian": {
    "group": "PURCHASING",
    "label": "Pembelian dari PO (Faktur) - Hapus Data"
  },
  "print_faktur_pembelian": {
    "group": "PURCHASING",
    "label": "Pembelian dari PO (Faktur) - Cetak Faktur"
  },
  "export_faktur_pembelian": {
    "group": "PURCHASING",
    "label": "Pembelian dari PO (Faktur) - Ekspor Excel"
  },
  "access_pembelian_langsung": {
    "group": "PURCHASING",
    "label": "Pembelian Langsung - Akses Menu"
  },
  "create_pembelian_langsung": {
    "group": "PURCHASING",
    "label": "Pembelian Langsung - Tambah Data"
  },
  "edit_pembelian_langsung": {
    "group": "PURCHASING",
    "label": "Pembelian Langsung - Edit Data"
  },
  "delete_pembelian_langsung": {
    "group": "PURCHASING",
    "label": "Pembelian Langsung - Hapus Data"
  },
  "print_pembelian_langsung": {
    "group": "PURCHASING",
    "label": "Pembelian Langsung - Cetak Dokumen"
  },
  "access_biaya_impor": {
    "group": "PURCHASING",
    "label": "Biaya Impor V.2 - Akses Menu"
  },
  "create_biaya_impor": {
    "group": "PURCHASING",
    "label": "Biaya Impor V.2 - Tambah Data"
  },
  "edit_biaya_impor": {
    "group": "PURCHASING",
    "label": "Biaya Impor V.2 - Edit Data"
  },
  "delete_biaya_impor": {
    "group": "PURCHASING",
    "label": "Biaya Impor V.2 - Hapus Data"
  },
  "print_biaya_impor": {
    "group": "PURCHASING",
    "label": "Biaya Impor V.2 - Cetak Dokumen"
  },
  "access_retur_pembelian": {
    "group": "PURCHASING",
    "label": "Retur Pembelian - Akses Menu"
  },
  "create_retur_pembelian": {
    "group": "PURCHASING",
    "label": "Retur Pembelian - Tambah Data"
  },
  "edit_retur_pembelian": {
    "group": "PURCHASING",
    "label": "Retur Pembelian - Edit Data"
  },
  "delete_retur_pembelian": {
    "group": "PURCHASING",
    "label": "Retur Pembelian - Hapus Data"
  },
  "print_retur_pembelian": {
    "group": "PURCHASING",
    "label": "Retur Pembelian - Cetak Dokumen"
  },
  "access_jurnal_pembelian": {
    "group": "PURCHASING",
    "label": "Jurnal Pembelian - Akses Menu"
  },
  "print_jurnal_pembelian": {
    "group": "PURCHASING",
    "label": "Jurnal Pembelian - Cetak Laporan"
  },
  "export_jurnal_pembelian": {
    "group": "PURCHASING",
    "label": "Jurnal Pembelian - Ekspor Excel"
  },
  "access_jurnal_biaya_impor": {
    "group": "PURCHASING",
    "label": "Jurnal Biaya Impor V.2 - Akses Menu"
  },
  "print_jurnal_biaya_impor": {
    "group": "PURCHASING",
    "label": "Jurnal Biaya Impor V.2 - Cetak"
  },
  "access_jurnal_ap": {
    "group": "ACCOUNTPAYABLE",
    "label": "Jurnal A.P. - Akses Menu"
  },
  "print_jurnal_ap": {
    "group": "ACCOUNTPAYABLE",
    "label": "Jurnal A.P. - Cetak"
  },
  "export_jurnal_ap": {
    "group": "ACCOUNTPAYABLE",
    "label": "Jurnal A.P. - Ekspor Excel"
  },
  "access_transaksi_ap": {
    "group": "ACCOUNTPAYABLE",
    "label": "Transaksi Kartu Utang (A.P.) - Akses Menu"
  },
  "create_transaksi_ap": {
    "group": "ACCOUNTPAYABLE",
    "label": "Transaksi Kartu Utang (A.P.) - Tambah Data"
  },
  "edit_transaksi_ap": {
    "group": "ACCOUNTPAYABLE",
    "label": "Transaksi Kartu Utang (A.P.) - Edit Data"
  },
  "delete_transaksi_ap": {
    "group": "ACCOUNTPAYABLE",
    "label": "Transaksi Kartu Utang (A.P.) - Hapus Data"
  },
  "access_pelunasan_utang": {
    "group": "ACCOUNTPAYABLE",
    "label": "Pelunasan Utang Usaha - Akses Menu"
  },
  "create_pelunasan_utang": {
    "group": "ACCOUNTPAYABLE",
    "label": "Pelunasan Utang Usaha - Tambah Data"
  },
  "edit_pelunasan_utang": {
    "group": "ACCOUNTPAYABLE",
    "label": "Pelunasan Utang Usaha - Edit Data"
  },
  "delete_pelunasan_utang": {
    "group": "ACCOUNTPAYABLE",
    "label": "Pelunasan Utang Usaha - Hapus Data"
  },
  "print_pelunasan_utang": {
    "group": "ACCOUNTPAYABLE",
    "label": "Pelunasan Utang Usaha - Cetak Bukti"
  },
  "approve_pelunasan_utang": {
    "group": "ACCOUNTPAYABLE",
    "label": "Pelunasan Utang Usaha - Persetujuan"
  },
  "access_pengajuan_pembayaran": {
    "group": "ACCOUNTPAYABLE",
    "label": "Pengajuan Pembayaran - Akses Menu"
  },
  "create_pengajuan_pembayaran": {
    "group": "ACCOUNTPAYABLE",
    "label": "Pengajuan Pembayaran - Tambah Data"
  },
  "edit_pengajuan_pembayaran": {
    "group": "ACCOUNTPAYABLE",
    "label": "Pengajuan Pembayaran - Edit Data"
  },
  "delete_pengajuan_pembayaran": {
    "group": "ACCOUNTPAYABLE",
    "label": "Pengajuan Pembayaran - Hapus Data"
  },
  "print_pengajuan_pembayaran": {
    "group": "ACCOUNTPAYABLE",
    "label": "Pengajuan Pembayaran - Cetak Form"
  },
  "approve_pengajuan_pembayaran": {
    "group": "ACCOUNTPAYABLE",
    "label": "Pengajuan Pembayaran - Persetujuan"
  },
  "access_sales": {
    "group": "SALES",
    "label": "Akses Utama Menu Sales"
  },
  "create_sales": {
    "group": "SALES",
    "label": "Sales Order - Tambah Data"
  },
  "edit_sales": {
    "group": "SALES",
    "label": "Sales Order - Edit Data"
  },
  "delete_sales": {
    "group": "SALES",
    "label": "Sales Order - Hapus Data"
  },
  "show_sales": {
    "group": "SALES",
    "label": "Sales Order - Lihat Detail"
  },
  "access_customers": {
    "group": "SALES",
    "label": "Customer - Akses Menu"
  },
  "create_customers": {
    "group": "SALES",
    "label": "Customer - Tambah Customer"
  },
  "edit_customers": {
    "group": "SALES",
    "label": "Customer - Edit Customer"
  },
  "delete_customers": {
    "group": "SALES",
    "label": "Customer - Hapus Customer"
  },
  "show_customers": {
    "group": "SALES",
    "label": "Customer - Lihat Detail"
  },
  "print_customers": {
    "group": "SALES",
    "label": "Customer - Cetak Data"
  },
  "export_customers": {
    "group": "SALES",
    "label": "Customer - Ekspor Excel"
  },
  "access_grup_customer": {
    "group": "SALES",
    "label": "Grup Customer - Akses Menu"
  },
  "create_grup_customer": {
    "group": "SALES",
    "label": "Grup Customer - Tambah Data"
  },
  "edit_grup_customer": {
    "group": "SALES",
    "label": "Grup Customer - Edit Data"
  },
  "delete_grup_customer": {
    "group": "SALES",
    "label": "Grup Customer - Hapus Data"
  },
  "access_tipe_customer": {
    "group": "SALES",
    "label": "Tipe Customer - Akses Menu"
  },
  "create_tipe_customer": {
    "group": "SALES",
    "label": "Tipe Customer - Tambah Data"
  },
  "edit_tipe_customer": {
    "group": "SALES",
    "label": "Tipe Customer - Edit Data"
  },
  "delete_tipe_customer": {
    "group": "SALES",
    "label": "Tipe Customer - Hapus Data"
  },
  "access_salesman": {
    "group": "SALES",
    "label": "Salesman - Akses Menu"
  },
  "create_salesman": {
    "group": "SALES",
    "label": "Salesman - Tambah Data"
  },
  "edit_salesman": {
    "group": "SALES",
    "label": "Salesman - Edit Data"
  },
  "delete_salesman": {
    "group": "SALES",
    "label": "Salesman - Hapus Data"
  },
  "access_weekday": {
    "group": "SALES",
    "label": "Weekday - Akses Menu"
  },
  "create_weekday": {
    "group": "SALES",
    "label": "Weekday - Tambah Setting"
  },
  "edit_weekday": {
    "group": "SALES",
    "label": "Weekday - Edit Setting"
  },
  "delete_weekday": {
    "group": "SALES",
    "label": "Weekday - Hapus Setting"
  },
  "access_komisi_per_item": {
    "group": "SALES",
    "label": "Komisi Per Item - Akses Menu"
  },
  "create_komisi_per_item": {
    "group": "SALES",
    "label": "Komisi Per Item - Tambah Setting"
  },
  "edit_komisi_per_item": {
    "group": "SALES",
    "label": "Komisi Per Item - Edit Setting"
  },
  "delete_komisi_per_item": {
    "group": "SALES",
    "label": "Komisi Per Item - Hapus Setting"
  },
  "access_scan_product": {
    "group": "SALES",
    "label": "Scan Product Penjualan - Akses Menu"
  },
  "access_tutup_pending_so": {
    "group": "SALES",
    "label": "Tutup Pending SO - Akses Menu"
  },
  "edit_tutup_pending_so": {
    "group": "SALES",
    "label": "Tutup Pending SO - Eksekusi Tutup SO"
  },
  "access_forecast": {
    "group": "SALES",
    "label": "Forecast / Penawaran Penjualan - Akses Menu"
  },
  "create_forecast": {
    "group": "SALES",
    "label": "Forecast / Penawaran Penjualan - Tambah Data"
  },
  "edit_forecast": {
    "group": "SALES",
    "label": "Forecast / Penawaran Penjualan - Edit Data"
  },
  "delete_forecast": {
    "group": "SALES",
    "label": "Forecast / Penawaran Penjualan - Hapus Data"
  },
  "print_forecast": {
    "group": "SALES",
    "label": "Forecast / Penawaran Penjualan - Cetak"
  },
  "export_forecast": {
    "group": "SALES",
    "label": "Forecast / Penawaran Penjualan - Ekspor Excel"
  },
  "access_customer_po": {
    "group": "SALES",
    "label": "PO Customer - Akses Menu"
  },
  "create_customer_po": {
    "group": "SALES",
    "label": "PO Customer - Tambah PO Customer"
  },
  "edit_customer_po": {
    "group": "SALES",
    "label": "PO Customer - Edit Data"
  },
  "delete_customer_po": {
    "group": "SALES",
    "label": "PO Customer - Hapus Data"
  },
  "print_customer_po": {
    "group": "SALES",
    "label": "PO Customer - Cetak Dokumen"
  },
  "export_customer_po": {
    "group": "SALES",
    "label": "PO Customer - Ekspor Excel"
  },
  "approve_customer_po": {
    "group": "SALES",
    "label": "PO Customer - Persetujuan"
  },
  "access_order_sheet": {
    "group": "SALES",
    "label": "Order Sheet (Sales Order) - Akses Menu"
  },
  "create_order_sheet": {
    "group": "SALES",
    "label": "Order Sheet (Sales Order) - Tambah Data"
  },
  "edit_order_sheet": {
    "group": "SALES",
    "label": "Order Sheet (Sales Order) - Edit Data"
  },
  "delete_order_sheet": {
    "group": "SALES",
    "label": "Order Sheet (Sales Order) - Hapus Data"
  },
  "show_order_sheet": {
    "group": "SALES",
    "label": "Order Sheet (Sales Order) - Lihat Detail"
  },
  "print_order_sheet": {
    "group": "SALES",
    "label": "Order Sheet (Sales Order) - Cetak SO"
  },
  "export_order_sheet": {
    "group": "SALES",
    "label": "Order Sheet (Sales Order) - Ekspor Excel"
  },
  "approve_order_sheet": {
    "group": "SALES",
    "label": "Order Sheet (Sales Order) - Persetujuan"
  },
  "access_surat_jalan": {
    "group": "SALES",
    "label": "Surat Jalan (DO) - Akses Menu"
  },
  "create_surat_jalan": {
    "group": "SALES",
    "label": "Surat Jalan (DO) - Tambah Surat Jalan"
  },
  "edit_surat_jalan": {
    "group": "SALES",
    "label": "Surat Jalan (DO) - Edit Surat Jalan"
  },
  "delete_surat_jalan": {
    "group": "SALES",
    "label": "Surat Jalan (DO) - Hapus Surat Jalan"
  },
  "print_surat_jalan": {
    "group": "SALES",
    "label": "Surat Jalan (DO) - Cetak Surat Jalan"
  },
  "export_surat_jalan": {
    "group": "SALES",
    "label": "Surat Jalan (DO) - Ekspor Excel"
  },
  "approve_surat_jalan": {
    "group": "SALES",
    "label": "Surat Jalan (DO) - Persetujuan"
  },
  "access_retur_surat_jalan": {
    "group": "SALES",
    "label": "Retur Surat Jalan - Akses Menu"
  },
  "create_retur_surat_jalan": {
    "group": "SALES",
    "label": "Retur Surat Jalan - Tambah Data"
  },
  "edit_retur_surat_jalan": {
    "group": "SALES",
    "label": "Retur Surat Jalan - Edit Data"
  },
  "delete_retur_surat_jalan": {
    "group": "SALES",
    "label": "Retur Surat Jalan - Hapus Data"
  },
  "print_retur_surat_jalan": {
    "group": "SALES",
    "label": "Retur Surat Jalan - Cetak Bukti"
  },
  "access_penjualan_via_sj": {
    "group": "SALES",
    "label": "Penjualan Via S.J. - Akses Menu"
  },
  "create_penjualan_via_sj": {
    "group": "SALES",
    "label": "Penjualan Via S.J. - Tambah Data"
  },
  "edit_penjualan_via_sj": {
    "group": "SALES",
    "label": "Penjualan Via S.J. - Edit Data"
  },
  "delete_penjualan_via_sj": {
    "group": "SALES",
    "label": "Penjualan Via S.J. - Hapus Data"
  },
  "print_penjualan_via_sj": {
    "group": "SALES",
    "label": "Penjualan Via S.J. - Cetak Faktur"
  },
  "access_penjualan_via_so": {
    "group": "SALES",
    "label": "Penjualan Via S.O. - Akses Menu"
  },
  "create_penjualan_via_so": {
    "group": "SALES",
    "label": "Penjualan Via S.O. - Tambah Data"
  },
  "edit_penjualan_via_so": {
    "group": "SALES",
    "label": "Penjualan Via S.O. - Edit Data"
  },
  "delete_penjualan_via_so": {
    "group": "SALES",
    "label": "Penjualan Via S.O. - Hapus Data"
  },
  "print_penjualan_via_so": {
    "group": "SALES",
    "label": "Penjualan Via S.O. - Cetak Faktur"
  },
  "access_penjualan_langsung": {
    "group": "SALES",
    "label": "Penjualan Langsung - Akses Menu"
  },
  "create_penjualan_langsung": {
    "group": "SALES",
    "label": "Penjualan Langsung - Tambah Data"
  },
  "edit_penjualan_langsung": {
    "group": "SALES",
    "label": "Penjualan Langsung - Edit Data"
  },
  "delete_penjualan_langsung": {
    "group": "SALES",
    "label": "Penjualan Langsung - Hapus Data"
  },
  "print_penjualan_langsung": {
    "group": "SALES",
    "label": "Penjualan Langsung - Cetak Dokumen"
  },
  "access_retur_penjualan": {
    "group": "SALES",
    "label": "Retur Penjualan - Akses Menu"
  },
  "create_retur_penjualan": {
    "group": "SALES",
    "label": "Retur Penjualan - Tambah Data"
  },
  "edit_retur_penjualan": {
    "group": "SALES",
    "label": "Retur Penjualan - Edit Data"
  },
  "delete_retur_penjualan": {
    "group": "SALES",
    "label": "Retur Penjualan - Hapus Data"
  },
  "print_retur_penjualan": {
    "group": "SALES",
    "label": "Retur Penjualan - Cetak Dokumen"
  },
  "access_jurnal_penjualan": {
    "group": "SALES",
    "label": "Jurnal Penjualan - Akses Menu"
  },
  "print_jurnal_penjualan": {
    "group": "SALES",
    "label": "Jurnal Penjualan - Cetak"
  },
  "export_jurnal_penjualan": {
    "group": "SALES",
    "label": "Jurnal Penjualan - Ekspor Excel"
  },
  "access_jurnal_ar": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Jurnal A.R. - Akses Menu"
  },
  "print_jurnal_ar": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Jurnal A.R. - Cetak Laporan"
  },
  "export_jurnal_ar": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Jurnal A.R. - Ekspor Excel"
  },
  "access_transaksi_ar": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Transaksi Kartu Piutang (A.R.) - Akses Menu"
  },
  "create_transaksi_ar": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Transaksi Kartu Piutang (A.R.) - Tambah Data"
  },
  "edit_transaksi_ar": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Transaksi Kartu Piutang (A.R.) - Edit Data"
  },
  "delete_transaksi_ar": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Transaksi Kartu Piutang (A.R.) - Hapus Data"
  },
  "access_penerimaan_piutang": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Penerimaan Piutang Customer - Akses Menu"
  },
  "create_penerimaan_piutang": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Penerimaan Piutang Customer - Tambah Data"
  },
  "edit_penerimaan_piutang": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Penerimaan Piutang Customer - Edit Data"
  },
  "delete_penerimaan_piutang": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Penerimaan Piutang Customer - Hapus Data"
  },
  "print_penerimaan_piutang": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Penerimaan Piutang Customer - Cetak Kuitansi"
  },
  "approve_penerimaan_piutang": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Penerimaan Piutang Customer - Persetujuan"
  },
  "access_tanda_terima": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Tanda Terima Pembayaran - Akses Menu"
  },
  "create_tanda_terima": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Tanda Terima Pembayaran - Tambah Data"
  },
  "edit_tanda_terima": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Tanda Terima Pembayaran - Edit Data"
  },
  "delete_tanda_terima": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Tanda Terima Pembayaran - Hapus Data"
  },
  "print_tanda_terima": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Tanda Terima Pembayaran - Cetak Bukti"
  },
  "access_penagihan_piutang": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Penagihan Piutang - Akses Menu"
  },
  "create_penagihan_piutang": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Penagihan Piutang - Tambah Jadwal"
  },
  "edit_penagihan_piutang": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Penagihan Piutang - Edit Data"
  },
  "delete_penagihan_piutang": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Penagihan Piutang - Hapus Data"
  },
  "print_penagihan_piutang": {
    "group": "ACCOUNTRECEIVABLE",
    "label": "Penagihan Piutang - Cetak Daftar Tagihan"
  },
  "access_products": {
    "group": "INVENTORY",
    "label": "Master Barang (Products) - Akses Menu"
  },
  "create_products": {
    "group": "INVENTORY",
    "label": "Master Barang (Products) - Tambah Barang"
  },
  "edit_products": {
    "group": "INVENTORY",
    "label": "Master Barang (Products) - Edit Barang"
  },
  "delete_products": {
    "group": "INVENTORY",
    "label": "Master Barang (Products) - Hapus Barang"
  },
  "show_products": {
    "group": "INVENTORY",
    "label": "Master Barang (Products) - Lihat Detail"
  },
  "print_products": {
    "group": "INVENTORY",
    "label": "Master Barang (Products) - Cetak Data"
  },
  "export_products": {
    "group": "INVENTORY",
    "label": "Master Barang (Products) - Ekspor Excel"
  },
  "print_barcodes": {
    "group": "INVENTORY",
    "label": "Master Barang (Products) - Cetak Barcode"
  },
  "access_stok_gudang": {
    "group": "INVENTORY",
    "label": "Laporan Stok Gudang - Akses Menu"
  },
  "print_stok_gudang": {
    "group": "INVENTORY",
    "label": "Laporan Stok Gudang - Cetak"
  },
  "export_stok_gudang": {
    "group": "INVENTORY",
    "label": "Laporan Stok Gudang - Ekspor Excel"
  },
  "access_gudang": {
    "group": "INVENTORY",
    "label": "Master Gudang - Akses Menu"
  },
  "create_gudang": {
    "group": "INVENTORY",
    "label": "Master Gudang - Tambah Gudang"
  },
  "edit_gudang": {
    "group": "INVENTORY",
    "label": "Master Gudang - Edit Gudang"
  },
  "delete_gudang": {
    "group": "INVENTORY",
    "label": "Master Gudang - Hapus Gudang"
  },
  "access_product_categories": {
    "group": "INVENTORY",
    "label": "Kategori Barang - Akses Menu"
  },
  "create_product_categories": {
    "group": "INVENTORY",
    "label": "Kategori Barang - Tambah Kategori"
  },
  "edit_product_categories": {
    "group": "INVENTORY",
    "label": "Kategori Barang - Edit Kategori"
  },
  "delete_product_categories": {
    "group": "INVENTORY",
    "label": "Kategori Barang - Hapus Kategori"
  },
  "access_merek": {
    "group": "INVENTORY",
    "label": "Merek / Brand - Akses Menu"
  },
  "create_merek": {
    "group": "INVENTORY",
    "label": "Merek / Brand - Tambah Merek"
  },
  "edit_merek": {
    "group": "INVENTORY",
    "label": "Merek / Brand - Edit Merek"
  },
  "delete_merek": {
    "group": "INVENTORY",
    "label": "Merek / Brand - Hapus Merek"
  },
  "access_jurnal_persediaan": {
    "group": "INVENTORY",
    "label": "Jurnal Persediaan - Akses Menu"
  },
  "print_jurnal_persediaan": {
    "group": "INVENTORY",
    "label": "Jurnal Persediaan - Cetak"
  },
  "export_jurnal_persediaan": {
    "group": "INVENTORY",
    "label": "Jurnal Persediaan - Ekspor Excel"
  },
  "access_duplikat_barang": {
    "group": "INVENTORY",
    "label": "Duplikat Barang - Akses Menu"
  },
  "create_duplikat_barang": {
    "group": "INVENTORY",
    "label": "Duplikat Barang - Eksekusi Duplikasi"
  },
  "access_jurnal_produksi": {
    "group": "INVENTORY",
    "label": "Jurnal Produksi - Akses Menu"
  },
  "print_jurnal_produksi": {
    "group": "INVENTORY",
    "label": "Jurnal Produksi - Cetak"
  },
  "export_jurnal_produksi": {
    "group": "INVENTORY",
    "label": "Jurnal Produksi - Ekspor Excel"
  },
  "access_biaya": {
    "group": "INVENTORY",
    "label": "Biaya Persediaan - Akses Menu"
  },
  "create_biaya": {
    "group": "INVENTORY",
    "label": "Biaya Persediaan - Tambah Data"
  },
  "edit_biaya": {
    "group": "INVENTORY",
    "label": "Biaya Persediaan - Edit Data"
  },
  "delete_biaya": {
    "group": "INVENTORY",
    "label": "Biaya Persediaan - Hapus Data"
  },
  "access_boms": {
    "group": "INVENTORY",
    "label": "Bill of Materials (BOM) - Akses Menu"
  },
  "create_boms": {
    "group": "INVENTORY",
    "label": "Bill of Materials (BOM) - Tambah BOM"
  },
  "edit_boms": {
    "group": "INVENTORY",
    "label": "Bill of Materials (BOM) - Edit BOM"
  },
  "delete_boms": {
    "group": "INVENTORY",
    "label": "Bill of Materials (BOM) - Hapus BOM"
  },
  "print_boms": {
    "group": "INVENTORY",
    "label": "Bill of Materials (BOM) - Cetak BOM"
  },
  "export_boms": {
    "group": "INVENTORY",
    "label": "Bill of Materials (BOM) - Ekspor Excel"
  },
  "approve_boms": {
    "group": "INVENTORY",
    "label": "Bill of Materials (BOM) - Persetujuan"
  },
  "access_stok_masuk": {
    "group": "INVENTORY",
    "label": "Stok Masuk - Akses Menu"
  },
  "create_stok_masuk": {
    "group": "INVENTORY",
    "label": "Stok Masuk - Tambah Data"
  },
  "edit_stok_masuk": {
    "group": "INVENTORY",
    "label": "Stok Masuk - Edit Data"
  },
  "delete_stok_masuk": {
    "group": "INVENTORY",
    "label": "Stok Masuk - Hapus Data"
  },
  "print_stok_masuk": {
    "group": "INVENTORY",
    "label": "Stok Masuk - Cetak Bukti"
  },
  "access_stok_keluar": {
    "group": "INVENTORY",
    "label": "Stok Keluar - Akses Menu"
  },
  "create_stok_keluar": {
    "group": "INVENTORY",
    "label": "Stok Keluar - Tambah Data"
  },
  "edit_stok_keluar": {
    "group": "INVENTORY",
    "label": "Stok Keluar - Edit Data"
  },
  "delete_stok_keluar": {
    "group": "INVENTORY",
    "label": "Stok Keluar - Hapus Data"
  },
  "print_stok_keluar": {
    "group": "INVENTORY",
    "label": "Stok Keluar - Cetak Bukti"
  },
  "access_penyesuaian_stok": {
    "group": "INVENTORY",
    "label": "Penyesuaian Stok - Akses Menu"
  },
  "create_penyesuaian_stok": {
    "group": "INVENTORY",
    "label": "Penyesuaian Stok - Tambah Data"
  },
  "edit_penyesuaian_stok": {
    "group": "INVENTORY",
    "label": "Penyesuaian Stok - Edit Data"
  },
  "delete_penyesuaian_stok": {
    "group": "INVENTORY",
    "label": "Penyesuaian Stok - Hapus Data"
  },
  "print_penyesuaian_stok": {
    "group": "INVENTORY",
    "label": "Penyesuaian Stok - Cetak Form"
  },
  "approve_penyesuaian_stok": {
    "group": "INVENTORY",
    "label": "Penyesuaian Stok - Persetujuan"
  },
  "access_tutup_pending_sr": {
    "group": "INVENTORY",
    "label": "Tutup Pending SR - Akses Menu"
  },
  "edit_tutup_pending_sr": {
    "group": "INVENTORY",
    "label": "Tutup Pending SR - Eksekusi Tutup SR"
  },
  "access_stock_request": {
    "group": "INVENTORY",
    "label": "Stock Request (SR) - Akses Menu"
  },
  "create_stock_request": {
    "group": "INVENTORY",
    "label": "Stock Request (SR) - Tambah Data"
  },
  "edit_stock_request": {
    "group": "INVENTORY",
    "label": "Stock Request (SR) - Edit Data"
  },
  "delete_stock_request": {
    "group": "INVENTORY",
    "label": "Stock Request (SR) - Hapus Data"
  },
  "print_stock_request": {
    "group": "INVENTORY",
    "label": "Stock Request (SR) - Cetak Form"
  },
  "approve_stock_request": {
    "group": "INVENTORY",
    "label": "Stock Request (SR) - Persetujuan"
  },
  "access_transaksi_persediaan": {
    "group": "INVENTORY",
    "label": "Transaksi Mutasi Gudang - Akses Menu"
  },
  "create_transaksi_persediaan": {
    "group": "INVENTORY",
    "label": "Transaksi Mutasi Gudang - Tambah Mutasi"
  },
  "edit_transaksi_persediaan": {
    "group": "INVENTORY",
    "label": "Transaksi Mutasi Gudang - Edit Mutasi"
  },
  "delete_transaksi_persediaan": {
    "group": "INVENTORY",
    "label": "Transaksi Mutasi Gudang - Hapus Mutasi"
  },
  "print_transaksi_persediaan": {
    "group": "INVENTORY",
    "label": "Transaksi Mutasi Gudang - Cetak Bukti"
  },
  "access_penyesuaian_hpp": {
    "group": "INVENTORY",
    "label": "Penyesuaian HPP V.2 - Akses Menu"
  },
  "create_penyesuaian_hpp": {
    "group": "INVENTORY",
    "label": "Penyesuaian HPP V.2 - Eksekusi Penyesuaian"
  },
  "approve_penyesuaian_hpp": {
    "group": "INVENTORY",
    "label": "Penyesuaian HPP V.2 - Persetujuan"
  },
  "access_stok_opname": {
    "group": "INVENTORY",
    "label": "Stok Opname - Akses Menu"
  },
  "create_stok_opname": {
    "group": "INVENTORY",
    "label": "Stok Opname - Tambah Jadwal / Input Fisik"
  },
  "edit_stok_opname": {
    "group": "INVENTORY",
    "label": "Stok Opname - Edit Data"
  },
  "delete_stok_opname": {
    "group": "INVENTORY",
    "label": "Stok Opname - Hapus Data"
  },
  "print_stok_opname": {
    "group": "INVENTORY",
    "label": "Stok Opname - Cetak Lembar Hitung"
  },
  "approve_stok_opname": {
    "group": "INVENTORY",
    "label": "Stok Opname - Persetujuan Posting"
  },
  "access_adjust_harga_jual": {
    "group": "INVENTORY",
    "label": "Adjust Harga Jual - Akses Menu"
  },
  "create_adjust_harga_jual": {
    "group": "INVENTORY",
    "label": "Adjust Harga Jual - Proses Penyesuaian"
  },
  "approve_adjust_harga_jual": {
    "group": "INVENTORY",
    "label": "Adjust Harga Jual - Persetujuan"
  },
  "access_produksi_langsung": {
    "group": "INVENTORY",
    "label": "Produksi Langsung - Akses Menu"
  },
  "create_produksi_langsung": {
    "group": "INVENTORY",
    "label": "Produksi Langsung - Eksekusi Produksi"
  },
  "print_produksi_langsung": {
    "group": "INVENTORY",
    "label": "Produksi Langsung - Cetak Bukti"
  },
  "access_schedule_vendor": {
    "group": "INVENTORY",
    "label": "Schedule Pengiriman Vendor - Akses Menu"
  },
  "create_schedule_vendor": {
    "group": "INVENTORY",
    "label": "Schedule Pengiriman Vendor - Tambah Data"
  },
  "edit_schedule_vendor": {
    "group": "INVENTORY",
    "label": "Schedule Pengiriman Vendor - Edit Data"
  },
  "delete_schedule_vendor": {
    "group": "INVENTORY",
    "label": "Schedule Pengiriman Vendor - Hapus Data"
  },
  "print_schedule_vendor": {
    "group": "INVENTORY",
    "label": "Schedule Pengiriman Vendor - Cetak Jadwal"
  },
  "access_penerimaan_by_schedule": {
    "group": "INVENTORY",
    "label": "Penerimaan by Schedule - Akses Menu"
  },
  "create_penerimaan_by_schedule": {
    "group": "INVENTORY",
    "label": "Penerimaan by Schedule - Proses Barcode"
  },
  "access_realisasi_bahan_baku": {
    "group": "INVENTORY",
    "label": "Alur 2 Realisasi Bahan Baku - Akses Menu"
  },
  "create_realisasi_bahan_baku": {
    "group": "INVENTORY",
    "label": "Alur 2 Realisasi Bahan Baku - Tambah Pengeluaran"
  },
  "print_realisasi_bahan_baku": {
    "group": "INVENTORY",
    "label": "Alur 2 Realisasi Bahan Baku - Cetak Form"
  },
  "access_penerimaan_crusher": {
    "group": "INVENTORY",
    "label": "Alur 3 Crusher ke MATKOM - Akses Menu"
  },
  "create_penerimaan_crusher": {
    "group": "INVENTORY",
    "label": "Alur 3 Crusher ke MATKOM - Catat Regrind"
  },
  "access_penerimaan_retur_produksi": {
    "group": "INVENTORY",
    "label": "Alur 4 Produksi ke MATKOM - Akses Menu"
  },
  "create_penerimaan_retur_produksi": {
    "group": "INVENTORY",
    "label": "Alur 4 Produksi ke MATKOM - Catat Retur Sisa"
  },
  "access_penerimaan_fg": {
    "group": "INVENTORY",
    "label": "Alur 13 QC Gate ke FG - Akses Menu"
  },
  "create_penerimaan_fg": {
    "group": "INVENTORY",
    "label": "Alur 13 QC Gate ke FG - Penerimaan FG"
  },
  "access_customer_claim_fg": {
    "group": "INVENTORY",
    "label": "Alur 14 Customer Claim ke FG - Akses Menu"
  },
  "create_customer_claim_fg": {
    "group": "INVENTORY",
    "label": "Alur 14 Customer Claim ke FG - Catat Klaim"
  },
  "access_sj_balikan": {
    "group": "INVENTORY",
    "label": "Alur 15 Surat Jalan Balikan - Akses Menu"
  },
  "create_sj_balikan": {
    "group": "INVENTORY",
    "label": "Alur 15 Surat Jalan Balikan - Catat SJ Balikan"
  },
  "access_daftar_kas_bank": {
    "group": "CASHHANDBANK",
    "label": "Daftar Kas & Bank - Akses Menu"
  },
  "create_daftar_kas_bank": {
    "group": "CASHHANDBANK",
    "label": "Daftar Kas & Bank - Tambah Akun"
  },
  "edit_daftar_kas_bank": {
    "group": "CASHHANDBANK",
    "label": "Daftar Kas & Bank - Edit Akun"
  },
  "delete_daftar_kas_bank": {
    "group": "CASHHANDBANK",
    "label": "Daftar Kas & Bank - Hapus Akun"
  },
  "access_transaksi_kas": {
    "group": "CASHHANDBANK",
    "label": "Transaksi Kas - Akses Menu"
  },
  "create_transaksi_kas": {
    "group": "CASHHANDBANK",
    "label": "Transaksi Kas - Tambah Transaksi"
  },
  "edit_transaksi_kas": {
    "group": "CASHHANDBANK",
    "label": "Transaksi Kas - Edit Transaksi"
  },
  "delete_transaksi_kas": {
    "group": "CASHHANDBANK",
    "label": "Transaksi Kas - Hapus Transaksi"
  },
  "print_transaksi_kas": {
    "group": "CASHHANDBANK",
    "label": "Transaksi Kas - Cetak Bukti Kas"
  },
  "approve_transaksi_kas": {
    "group": "CASHHANDBANK",
    "label": "Transaksi Kas - Persetujuan"
  },
  "access_transfer_kas": {
    "group": "CASHHANDBANK",
    "label": "Transfer Kas - Akses Menu"
  },
  "create_transfer_kas": {
    "group": "CASHHANDBANK",
    "label": "Transfer Kas - Tambah Transfer"
  },
  "edit_transfer_kas": {
    "group": "CASHHANDBANK",
    "label": "Transfer Kas - Edit Transfer"
  },
  "delete_transfer_kas": {
    "group": "CASHHANDBANK",
    "label": "Transfer Kas - Hapus Transfer"
  },
  "print_transfer_kas": {
    "group": "CASHHANDBANK",
    "label": "Transfer Kas - Cetak Bukti Transfer"
  },
  "access_rekonsiliasi_bank": {
    "group": "CASHHANDBANK",
    "label": "Rekonsiliasi Bank - Akses Menu"
  },
  "create_rekonsiliasi_bank": {
    "group": "CASHHANDBANK",
    "label": "Rekonsiliasi Bank - Proses Rekonsiliasi"
  },
  "print_rekonsiliasi_bank": {
    "group": "CASHHANDBANK",
    "label": "Rekonsiliasi Bank - Cetak"
  },
  "export_rekonsiliasi_bank": {
    "group": "CASHHANDBANK",
    "label": "Rekonsiliasi Bank - Ekspor Excel"
  },
  "access_currencies": {
    "group": "PENGATURAN",
    "label": "Currencies (Valas) - Akses Menu"
  },
  "create_currencies": {
    "group": "PENGATURAN",
    "label": "Currencies (Valas) - Tambah Mata Uang"
  },
  "edit_currencies": {
    "group": "PENGATURAN",
    "label": "Currencies (Valas) - Edit Kurs"
  },
  "delete_currencies": {
    "group": "PENGATURAN",
    "label": "Currencies (Valas) - Hapus Mata Uang"
  },
  "access_akun_gl": {
    "group": "GENERALLEDGER",
    "label": "Daftar Akun GL (COA) - Akses Menu"
  },
  "create_akun_gl": {
    "group": "GENERALLEDGER",
    "label": "Daftar Akun GL (COA) - Tambah Akun"
  },
  "edit_akun_gl": {
    "group": "GENERALLEDGER",
    "label": "Daftar Akun GL (COA) - Edit Akun"
  },
  "delete_akun_gl": {
    "group": "GENERALLEDGER",
    "label": "Daftar Akun GL (COA) - Hapus Akun"
  },
  "print_akun_gl": {
    "group": "GENERALLEDGER",
    "label": "Daftar Akun GL (COA) - Cetak COA"
  },
  "export_akun_gl": {
    "group": "GENERALLEDGER",
    "label": "Daftar Akun GL (COA) - Ekspor Excel"
  },
  "access_gl_kategori": {
    "group": "GENERALLEDGER",
    "label": "GL Kategori - Akses Menu"
  },
  "create_gl_kategori": {
    "group": "GENERALLEDGER",
    "label": "GL Kategori - Tambah Kategori"
  },
  "edit_gl_kategori": {
    "group": "GENERALLEDGER",
    "label": "GL Kategori - Edit Kategori"
  },
  "delete_gl_kategori": {
    "group": "GENERALLEDGER",
    "label": "GL Kategori - Hapus Kategori"
  },
  "access_departments": {
    "group": "GENERALLEDGER",
    "label": "Departemen - Akses Menu"
  },
  "create_departments": {
    "group": "GENERALLEDGER",
    "label": "Departemen - Tambah Departemen"
  },
  "edit_departments": {
    "group": "GENERALLEDGER",
    "label": "Departemen - Edit Departemen"
  },
  "delete_departments": {
    "group": "GENERALLEDGER",
    "label": "Departemen - Hapus Departemen"
  },
  "access_cost_center": {
    "group": "GENERALLEDGER",
    "label": "Cost Center - Akses Menu"
  },
  "create_cost_center": {
    "group": "GENERALLEDGER",
    "label": "Cost Center - Tambah Cost Center"
  },
  "edit_cost_center": {
    "group": "GENERALLEDGER",
    "label": "Cost Center - Edit Cost Center"
  },
  "delete_cost_center": {
    "group": "GENERALLEDGER",
    "label": "Cost Center - Hapus Cost Center"
  },
  "access_budget": {
    "group": "PENGATURAN",
    "label": "Budgeting Tahunan - Akses Menu"
  },
  "create_budget": {
    "group": "PENGATURAN",
    "label": "Budgeting Tahunan - Tambah Budget"
  },
  "edit_budget": {
    "group": "PENGATURAN",
    "label": "Budgeting Tahunan - Edit Budget"
  },
  "delete_budget": {
    "group": "PENGATURAN",
    "label": "Budgeting Tahunan - Hapus Budget"
  },
  "show_budget": {
    "group": "PENGATURAN",
    "label": "Budgeting Tahunan - Lihat Detail"
  },
  "print_budget": {
    "group": "PENGATURAN",
    "label": "Budgeting Tahunan - Cetak Budget"
  },
  "export_budget": {
    "group": "PENGATURAN",
    "label": "Budgeting Tahunan - Ekspor Excel"
  },
  "approve_budget": {
    "group": "PENGATURAN",
    "label": "Budgeting Tahunan - Persetujuan"
  },
  "access_budget_cc": {
    "group": "GENERALLEDGER",
    "label": "Budgeting Cost Center - Akses Menu"
  },
  "create_budget_cc": {
    "group": "GENERALLEDGER",
    "label": "Budgeting Cost Center - Tambah Data"
  },
  "edit_budget_cc": {
    "group": "GENERALLEDGER",
    "label": "Budgeting Cost Center - Edit Data"
  },
  "delete_budget_cc": {
    "group": "GENERALLEDGER",
    "label": "Budgeting Cost Center - Hapus Data"
  },
  "access_rumus_rasio_keuangan": {
    "group": "GENERALLEDGER",
    "label": "Rumus Rasio Keuangan - Akses Menu"
  },
  "create_rumus_rasio_keuangan": {
    "group": "GENERALLEDGER",
    "label": "Rumus Rasio Keuangan - Tambah Rumus"
  },
  "edit_rumus_rasio_keuangan": {
    "group": "GENERALLEDGER",
    "label": "Rumus Rasio Keuangan - Edit Rumus"
  },
  "delete_rumus_rasio_keuangan": {
    "group": "GENERALLEDGER",
    "label": "Rumus Rasio Keuangan - Hapus Rumus"
  },
  "access_gl_template": {
    "group": "GENERALLEDGER",
    "label": "G.L. Template - Akses Menu"
  },
  "create_gl_template": {
    "group": "GENERALLEDGER",
    "label": "G.L. Template - Tambah Template"
  },
  "edit_gl_template": {
    "group": "GENERALLEDGER",
    "label": "G.L. Template - Edit Template"
  },
  "delete_gl_template": {
    "group": "GENERALLEDGER",
    "label": "G.L. Template - Hapus Template"
  },
  "access_transaksi_gl": {
    "group": "GENERALLEDGER",
    "label": "Transaksi G.L. (Jurnal Umum) - Akses Menu"
  },
  "create_transaksi_gl": {
    "group": "GENERALLEDGER",
    "label": "Transaksi G.L. (Jurnal Umum) - Tambah Jurnal"
  },
  "edit_transaksi_gl": {
    "group": "GENERALLEDGER",
    "label": "Transaksi G.L. (Jurnal Umum) - Edit Jurnal"
  },
  "delete_transaksi_gl": {
    "group": "GENERALLEDGER",
    "label": "Transaksi G.L. (Jurnal Umum) - Hapus Jurnal"
  },
  "print_transaksi_gl": {
    "group": "GENERALLEDGER",
    "label": "Transaksi G.L. (Jurnal Umum) - Cetak Voucher"
  },
  "approve_transaksi_gl": {
    "group": "GENERALLEDGER",
    "label": "Transaksi G.L. (Jurnal Umum) - Persetujuan Posting"
  },
  "access_target": {
    "group": "GENERALLEDGER",
    "label": "Target Sales - Akses Menu"
  },
  "create_target_sales": {
    "group": "GENERALLEDGER",
    "label": "Target Sales - Tambah Target"
  },
  "edit_target_sales": {
    "group": "GENERALLEDGER",
    "label": "Target Sales - Edit Target"
  },
  "delete_target_sales": {
    "group": "GENERALLEDGER",
    "label": "Target Sales - Hapus Target"
  },
  "access_manufacturing": {
    "group": "MANUFACTURING",
    "label": "Akses Utama Menu Manufacturing"
  },
  "access_machines": {
    "group": "MANUFACTURING",
    "label": "Daftar Mesin - Akses Menu"
  },
  "create_machines": {
    "group": "MANUFACTURING",
    "label": "Daftar Mesin - Tambah Mesin"
  },
  "edit_machines": {
    "group": "MANUFACTURING",
    "label": "Daftar Mesin - Edit Mesin"
  },
  "delete_machines": {
    "group": "MANUFACTURING",
    "label": "Daftar Mesin - Hapus Mesin"
  },
  "print_machines": {
    "group": "MANUFACTURING",
    "label": "Daftar Mesin - Cetak Data"
  },
  "access_kategori_mesin": {
    "group": "MANUFACTURING",
    "label": "Kategori Mesin - Akses Menu"
  },
  "create_kategori_mesin": {
    "group": "MANUFACTURING",
    "label": "Kategori Mesin - Tambah Kategori"
  },
  "edit_kategori_mesin": {
    "group": "MANUFACTURING",
    "label": "Kategori Mesin - Edit Kategori"
  },
  "delete_kategori_mesin": {
    "group": "MANUFACTURING",
    "label": "Kategori Mesin - Hapus Kategori"
  },
  "access_molds": {
    "group": "MANUFACTURING",
    "label": "Daftar Mold - Akses Menu"
  },
  "create_molds": {
    "group": "MANUFACTURING",
    "label": "Daftar Mold - Tambah Mold"
  },
  "edit_molds": {
    "group": "MANUFACTURING",
    "label": "Daftar Mold - Edit Mold"
  },
  "delete_molds": {
    "group": "MANUFACTURING",
    "label": "Daftar Mold - Hapus Mold"
  },
  "print_molds": {
    "group": "MANUFACTURING",
    "label": "Daftar Mold - Cetak Riwayat Mold"
  },
  "access_work_centers": {
    "group": "MANUFACTURING",
    "label": "Work Center - Akses Menu"
  },
  "create_work_centers": {
    "group": "MANUFACTURING",
    "label": "Work Center - Tambah Work Center"
  },
  "edit_work_centers": {
    "group": "MANUFACTURING",
    "label": "Work Center - Edit Work Center"
  },
  "delete_work_centers": {
    "group": "MANUFACTURING",
    "label": "Work Center - Hapus Work Center"
  },
  "access_routings": {
    "group": "MANUFACTURING",
    "label": "Routing Kerja - Akses Menu"
  },
  "create_routings": {
    "group": "MANUFACTURING",
    "label": "Routing Kerja - Tambah Routing"
  },
  "edit_routings": {
    "group": "MANUFACTURING",
    "label": "Routing Kerja - Edit Routing"
  },
  "delete_routings": {
    "group": "MANUFACTURING",
    "label": "Routing Kerja - Hapus Routing"
  },
  "access_mrp": {
    "group": "MANUFACTURING",
    "label": "MRP (Material Planning) - Akses Menu"
  },
  "create_mrp": {
    "group": "MANUFACTURING",
    "label": "MRP (Material Planning) - Simulasi MRP"
  },
  "export_mrp": {
    "group": "MANUFACTURING",
    "label": "MRP (Material Planning) - Ekspor Excel"
  },
  "access_planning_produksi": {
    "group": "MANUFACTURING",
    "label": "MPP (Jadwal Mesin) - Akses Menu"
  },
  "create_planning_produksi": {
    "group": "MANUFACTURING",
    "label": "MPP (Jadwal Mesin) - Tambah Jadwal"
  },
  "edit_planning_produksi": {
    "group": "MANUFACTURING",
    "label": "MPP (Jadwal Mesin) - Edit Jadwal"
  },
  "delete_planning_produksi": {
    "group": "MANUFACTURING",
    "label": "MPP (Jadwal Mesin) - Hapus Jadwal"
  },
  "print_planning_produksi": {
    "group": "MANUFACTURING",
    "label": "MPP (Jadwal Mesin) - Cetak Jadwal"
  },
  "approve_planning_produksi": {
    "group": "MANUFACTURING",
    "label": "MPP (Jadwal Mesin) - Persetujuan"
  },
  "access_work_orders": {
    "group": "MANUFACTURING",
    "label": "Work Order (SPK) - Akses Menu"
  },
  "create_work_orders": {
    "group": "MANUFACTURING",
    "label": "Work Order (SPK) - Tambah WO"
  },
  "edit_work_orders": {
    "group": "MANUFACTURING",
    "label": "Work Order (SPK) - Edit WO"
  },
  "delete_work_orders": {
    "group": "MANUFACTURING",
    "label": "Work Order (SPK) - Hapus / Batalkan WO"
  },
  "print_work_orders": {
    "group": "MANUFACTURING",
    "label": "Work Order (SPK) - Cetak Lembar SPK"
  },
  "export_work_orders": {
    "group": "MANUFACTURING",
    "label": "Work Order (SPK) - Ekspor Excel"
  },
  "approve_work_orders": {
    "group": "MANUFACTURING",
    "label": "Work Order (SPK) - Persetujuan Release"
  },
  "access_dashboard_transaksi": {
    "group": "MANUFACTURING",
    "label": "Dashboard Transaksi Manufaktur - Akses Menu"
  },
  "access_realisasi_produksi": {
    "group": "MANUFACTURING",
    "label": "Realisasi Hasil Produksi - Akses Menu"
  },
  "create_realisasi_produksi": {
    "group": "MANUFACTURING",
    "label": "Realisasi Hasil Produksi - Input Hasil Produksi"
  },
  "print_realisasi_produksi": {
    "group": "MANUFACTURING",
    "label": "Realisasi Hasil Produksi - Cetak Laporan"
  },
  "access_transfer_produksi": {
    "group": "MANUFACTURING",
    "label": "Serah-Terima Produksi - Akses Menu"
  },
  "create_transfer_produksi": {
    "group": "MANUFACTURING",
    "label": "Serah-Terima Produksi - Catat Transfer"
  },
  "print_transfer_produksi": {
    "group": "MANUFACTURING",
    "label": "Serah-Terima Produksi - Cetak Bukti"
  },
  "access_ng_disposal": {
    "group": "MANUFACTURING",
    "label": "Penanganan NG & Disposal - Akses Menu"
  },
  "create_ng_disposal": {
    "group": "MANUFACTURING",
    "label": "Penanganan NG & Disposal - Catat NG"
  },
  "approve_ng_disposal": {
    "group": "MANUFACTURING",
    "label": "Penanganan NG & Disposal - Persetujuan Scrap"
  },
  "access_quality_control": {
    "group": "MANUFACTURING",
    "label": "Quality Control & QC Gate - Akses Menu"
  },
  "create_quality_control": {
    "group": "MANUFACTURING",
    "label": "Quality Control & QC Gate - Input Inspeksi"
  },
  "approve_quality_control": {
    "group": "MANUFACTURING",
    "label": "Quality Control & QC Gate - Persetujuan Lolos/Reject"
  },
  "print_quality_control": {
    "group": "MANUFACTURING",
    "label": "Quality Control & QC Gate - Cetak Lembar QC"
  },
  "access_daily_board": {
    "group": "MANUFACTURING",
    "label": "Daily Production Board - Akses Menu"
  },
  "access_settings": {
    "group": "PENGATURAN",
    "label": "Pengaturan Sistem - Akses Menu"
  },
  "access_konfigurasi_umum": {
    "group": "PENGATURAN",
    "label": "Konfigurasi Umum - Akses Menu"
  },
  "edit_konfigurasi_umum": {
    "group": "PENGATURAN",
    "label": "Konfigurasi Umum - Simpan Perubahan"
  },
  "access_approval_management": {
    "group": "USER_SECURITY",
    "label": "Approval Rules - Akses Menu"
  },
  "create_approval_rules": {
    "group": "USER_SECURITY",
    "label": "Approval Rules - Tambah Aturan"
  },
  "edit_approval_rules": {
    "group": "USER_SECURITY",
    "label": "Approval Rules - Edit Aturan"
  },
  "delete_approval_rules": {
    "group": "USER_SECURITY",
    "label": "Approval Rules - Hapus Aturan"
  },
  "access_settings_print": {
    "group": "PENGATURAN",
    "label": "Pengaturan Cetakan - Akses Menu"
  },
  "edit_settings_print": {
    "group": "PENGATURAN",
    "label": "Pengaturan Cetakan - Simpan Layout"
  },
  "access_profil_perusahaan": {
    "group": "PENGATURAN",
    "label": "Profil Perusahaan - Akses Menu"
  },
  "edit_profil_perusahaan": {
    "group": "PENGATURAN",
    "label": "Profil Perusahaan - Ubah Profil & Logo"
  },
  "access_karyawan": {
    "group": "USER_SECURITY",
    "label": "Data Karyawan - Akses Menu"
  },
  "create_karyawan": {
    "group": "USER_SECURITY",
    "label": "Data Karyawan - Tambah Karyawan"
  },
  "edit_karyawan": {
    "group": "USER_SECURITY",
    "label": "Data Karyawan - Edit Biodata"
  },
  "delete_karyawan": {
    "group": "USER_SECURITY",
    "label": "Data Karyawan - Hapus Data"
  },
  "export_karyawan": {
    "group": "USER_SECURITY",
    "label": "Data Karyawan - Ekspor Excel"
  },
  "access_user_management": {
    "group": "USER_SECURITY",
    "label": "Users & Department - Akses Menu"
  },
  "create_users": {
    "group": "USER_SECURITY",
    "label": "Users & Department - Tambah User Baru"
  },
  "edit_users": {
    "group": "USER_SECURITY",
    "label": "Users & Department - Edit User / Password"
  },
  "delete_users": {
    "group": "USER_SECURITY",
    "label": "Users & Department - Hapus User"
  },
  "access_role_management": {
    "group": "USER_SECURITY",
    "label": "Roles Management - Akses Menu"
  },
  "create_roles": {
    "group": "USER_SECURITY",
    "label": "Roles Management - Tambah Role"
  },
  "edit_roles": {
    "group": "USER_SECURITY",
    "label": "Roles Management - Edit Role / Matriks Akses"
  },
  "delete_roles": {
    "group": "USER_SECURITY",
    "label": "Roles Management - Hapus Role"
  },
  "access_permissions": {
    "group": "USER_SECURITY",
    "label": "Permissions - Akses Menu"
  },
  "create_permissions": {
    "group": "USER_SECURITY",
    "label": "Permissions - Tambah Permission"
  },
  "edit_permissions": {
    "group": "USER_SECURITY",
    "label": "Permissions - Edit Permission"
  },
  "delete_permissions": {
    "group": "USER_SECURITY",
    "label": "Permissions - Hapus Permission"
  },
  "access_activity_logs": {
    "group": "USER_SECURITY",
    "label": "Activity Log (Audit Trail) - Akses Menu"
  },
  "export_activity_logs": {
    "group": "USER_SECURITY",
    "label": "Activity Log (Audit Trail) - Ekspor Excel"
  },
  "access_error_logs": {
    "group": "USER_SECURITY",
    "label": "Error Logs - Akses Menu"
  },
  "delete_error_logs": {
    "group": "USER_SECURITY",
    "label": "Error Logs - Bersihkan Log"
  },
  "access_reports": {
    "group": "REPORTS",
    "label": "Akses Utama Menu Laporan"
  },
  "access_pr_reports": {
    "group": "REPORTS",
    "label": "Laporan Purchase Request - Akses Menu"
  },
  "export_pr_reports": {
    "group": "REPORTS",
    "label": "Laporan Purchase Request - Ekspor Excel"
  },
  "access_mb_reports": {
    "group": "REPORTS",
    "label": "Laporan Master Budget - Akses Menu"
  },
  "export_mb_reports": {
    "group": "REPORTS",
    "label": "Laporan Master Budget - Ekspor Excel"
  },
  "access_laporan_penjualan": {
    "group": "REPORTS",
    "label": "Laporan Penjualan - Akses Menu"
  },
  "export_laporan_penjualan": {
    "group": "REPORTS",
    "label": "Laporan Penjualan - Ekspor Excel"
  },
  "access_laporan_stok": {
    "group": "REPORTS",
    "label": "Laporan Stok Gudang - Akses Menu"
  },
  "export_laporan_stok": {
    "group": "REPORTS",
    "label": "Laporan Stok Gudang - Ekspor Excel"
  },
  "access_laporan_keuangan": {
    "group": "REPORTS",
    "label": "Laporan Keuangan - Akses Menu"
  },
  "export_laporan_keuangan": {
    "group": "REPORTS",
    "label": "Laporan Keuangan - Ekspor Excel"
  },
  "access_laporan_rekap_plan_prod": {
    "group": "REPORTS",
    "label": "Laporan Rekap Rencana & Aktual - Akses Menu"
  },
  "export_laporan_rekap_plan_prod": {
    "group": "REPORTS",
    "label": "Laporan Rekap Rencana & Aktual - Ekspor Excel"
  },
  "access_laporan_rekap_ng": {
    "group": "REPORTS",
    "label": "Laporan Rekap NG / Reject - Akses Menu"
  },
  "export_laporan_rekap_ng": {
    "group": "REPORTS",
    "label": "Laporan Rekap NG / Reject - Ekspor Excel"
  },
  "access_laporan_control_stock_whfg": {
    "group": "REPORTS",
    "label": "Laporan Control Stock WHFG - Akses Menu"
  },
  "access_laporan_ach_rate": {
    "group": "REPORTS",
    "label": "Laporan Achievement Rate (KPI) - Akses Menu"
  },
  "access_laporan_ach_leader": {
    "group": "REPORTS",
    "label": "Laporan KPI Leader Group - Akses Menu"
  },
  "access_laporan_os_delivery": {
    "group": "REPORTS",
    "label": "Laporan OS vs Delivery Matrix - Akses Menu"
  },
  "access_daftar_pph": {
    "group": "LAIN_LAIN",
    "label": "Daftar PPH - Akses Menu"
  },
  "create_daftar_pph": {
    "group": "LAIN_LAIN",
    "label": "Daftar PPH - Tambah Data"
  },
  "edit_daftar_pph": {
    "group": "LAIN_LAIN",
    "label": "Daftar PPH - Edit Data"
  },
  "delete_daftar_pph": {
    "group": "LAIN_LAIN",
    "label": "Daftar PPH - Hapus Data"
  },
  "access_daftar_ppn": {
    "group": "LAIN_LAIN",
    "label": "Daftar Tipe PPN - Akses Menu"
  },
  "create_daftar_ppn": {
    "group": "LAIN_LAIN",
    "label": "Daftar Tipe PPN - Tambah Data"
  },
  "edit_daftar_ppn": {
    "group": "LAIN_LAIN",
    "label": "Daftar Tipe PPN - Edit Data"
  },
  "delete_daftar_ppn": {
    "group": "LAIN_LAIN",
    "label": "Daftar Tipe PPN - Hapus Data"
  },
  "access_syarat_bayar": {
    "group": "LAIN_LAIN",
    "label": "Syarat Bayar (TOP) - Akses Menu"
  },
  "create_syarat_bayar": {
    "group": "LAIN_LAIN",
    "label": "Syarat Bayar (TOP) - Tambah Data"
  },
  "edit_syarat_bayar": {
    "group": "LAIN_LAIN",
    "label": "Syarat Bayar (TOP) - Edit Data"
  },
  "delete_syarat_bayar": {
    "group": "LAIN_LAIN",
    "label": "Syarat Bayar (TOP) - Hapus Data"
  },
  "access_units": {
    "group": "PENGATURAN",
    "label": "Satuan Unit (Units) - Akses Menu"
  },
  "create_units": {
    "group": "PENGATURAN",
    "label": "Satuan Unit (Units) - Tambah Satuan"
  },
  "edit_units": {
    "group": "PENGATURAN",
    "label": "Satuan Unit (Units) - Edit Satuan"
  },
  "delete_units": {
    "group": "PENGATURAN",
    "label": "Satuan Unit (Units) - Hapus Satuan"
  },
  "access_request_products": {
    "group": "LAIN_LAIN",
    "label": "Product Requests - Akses Menu"
  },
  "create_request_products": {
    "group": "LAIN_LAIN",
    "label": "Product Requests - Tambah Request"
  },
  "edit_request_products": {
    "group": "LAIN_LAIN",
    "label": "Product Requests - Edit Request"
  },
  "delete_request_products": {
    "group": "LAIN_LAIN",
    "label": "Product Requests - Hapus Request"
  },
  "verify_request_products": {
    "group": "LAIN_LAIN",
    "label": "Product Requests - Verifikasi Permintaan"
  },
  "access_tipe_barang_jadi": {
    "group": "LAIN_LAIN",
    "label": "Tipe Barang Jadi - Akses Menu"
  },
  "create_tipe_barang_jadi": {
    "group": "LAIN_LAIN",
    "label": "Tipe Barang Jadi - Tambah Data"
  },
  "edit_tipe_barang_jadi": {
    "group": "LAIN_LAIN",
    "label": "Tipe Barang Jadi - Edit Data"
  },
  "delete_tipe_barang_jadi": {
    "group": "LAIN_LAIN",
    "label": "Tipe Barang Jadi - Hapus Data"
  },
  "access_tipe_barang": {
    "group": "LAIN_LAIN",
    "label": "Tipe Barang - Akses Menu"
  },
  "create_tipe_barang": {
    "group": "LAIN_LAIN",
    "label": "Tipe Barang - Tambah Data"
  },
  "edit_tipe_barang": {
    "group": "LAIN_LAIN",
    "label": "Tipe Barang - Edit Data"
  },
  "delete_tipe_barang": {
    "group": "LAIN_LAIN",
    "label": "Tipe Barang - Hapus Data"
  },
  "access_daftar_shift": {
    "group": "USER_SECURITY",
    "label": "Daftar Shift Kerja - Akses Menu"
  },
  "create_daftar_shift": {
    "group": "USER_SECURITY",
    "label": "Daftar Shift Kerja - Tambah Shift"
  },
  "edit_daftar_shift": {
    "group": "USER_SECURITY",
    "label": "Daftar Shift Kerja - Edit Shift"
  },
  "delete_daftar_shift": {
    "group": "USER_SECURITY",
    "label": "Daftar Shift Kerja - Hapus Shift"
  },
  "access_approval_requests": {
    "group": "USER_SECURITY",
    "label": "Approval Request - Akses Menu"
  },
  "create_approval_requests": {
    "group": "USER_SECURITY",
    "label": "Approval Request - Buat Permintaan Approval"
  },
  "approve_approval_requests": {
    "group": "USER_SECURITY",
    "label": "Approval Request - Eksekusi Persetujuan"
  },
  "access_prices_actual": {
    "group": "LAIN_LAIN",
    "label": "Update Actual Price - Akses Menu"
  },
  "update_prices_actual": {
    "group": "LAIN_LAIN",
    "label": "Update Actual Price - Simpan Harga Aktual"
  },
  "print_laporan_penjualan": {
    "group": "REPORTS",
    "label": "Laporan Penjualan - Cetak Laporan"
  },
  "print_laporan_stok": {
    "group": "REPORTS",
    "label": "Laporan Stok Gudang - Cetak Laporan"
  },
  "print_laporan_keuangan": {
    "group": "REPORTS",
    "label": "Laporan Keuangan - Cetak Laporan"
  },
  "print_pr_reports": {
    "group": "REPORTS",
    "label": "Laporan Purchase Request - Cetak"
  },
  "print_mb_reports": {
    "group": "REPORTS",
    "label": "Laporan Master Budget - Cetak"
  },
  "import_karyawan": {
    "group": "USER_SECURITY",
    "label": "Data Karyawan - Impor Data Excel"
  },
  "preview_settings_print": {
    "group": "PENGATURAN",
    "label": "Pengaturan Cetakan - Preview Template"
  },
  "access_approval_rules": {
    "group": "USER_SECURITY",
    "label": "Approval Rules - Akses Menu"
  },
  "show_approval_rules": {
    "group": "USER_SECURITY",
    "label": "Approval Rules - Lihat Detail Aturan"
  },
  "reject_approval_requests": {
    "group": "USER_SECURITY",
    "label": "Approval Request - Tolak Permintaan (Reject)"
  },
  "show_approval_requests": {
    "group": "USER_SECURITY",
    "label": "Approval Request - Lihat Detail Permintaan"
  },
  "create_approval_request_logs": {
    "group": "USER_SECURITY",
    "label": "Approval Request - Log Aktivitas Approval"
  },
  "remaining_budget": {
    "group": "PENGATURAN",
    "label": "Budgeting - Sisa Budget (Remaining Budget)"
  }
};

export function getPermissionMapping(name: string): { group: string; label: string } {
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
