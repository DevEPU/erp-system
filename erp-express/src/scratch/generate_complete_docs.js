/**
 * Generator for ERP EPU Documentation:
 * 1. Word Document (.docx)
 * 2. PowerPoint Presentation (.pptx)
 * 3. PDF Document (.pdf)
 * 4. Interactive & Printable HTML Manual (.html)
 */

const fs = require('fs');
const path = require('path');
const docx = require('docx');
const PptxGenJS = require('pptxgenjs');
const PDFDocument = require('pdfkit');

const OUT_DIR = path.resolve('c:/laragon/www/erp-epu-main/documentation');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

console.log('Starting Documentation Generation for ERP EPU...');
console.log('Output Directory:', OUT_DIR);

// ============================================================================
// DATA DEFINITIONS: MODULES & ACTUAL 16 ALURS
// ============================================================================

const ALUR_LIST = [
  {
    no: 1,
    code: "ALUR-01",
    name: "Penerimaan Barang Pembelian (Supplier ke Gudang MATKOM)",
    type: "IN",
    origin: "Supplier / Vendor Eksternal",
    destination: "Gudang Bahan Baku / MATKOM / Store",
    doc: "Surat Jalan Supplier & PO (Purchase Order)",
    desc: "Penerimaan fisik material resin plastik, pewarna/pigment, packaging, dan insert komponen dari vendor eksternal. Petugas gudang memverifikasi kesesuaian fisik dengan PO dan Surat Jalan Supplier, mencatat nomor batch/lot, dan memasukkan barang ke stok gudang bahan baku."
  },
  {
    no: 2,
    code: "ALUR-02",
    name: "Realisasi Bahan Baku (Gudang MATKOM ke Lantai Produksi)",
    type: "OUT",
    origin: "Gudang MATKOM / Store",
    destination: "Lantai Produksi / Area Mesin Injeksi",
    doc: "Work Order (SPK) & Formulir Realisasi Bahan Baku",
    desc: "Pengeluaran bahan baku (resin murni, masterbatch, komponen insert) dari Gudang MATKOM yang diserahterimakan kepada operator mesin berdasarkan Work Order (WO). Mengurangi stok bahan baku di gudang MATKOM dan membebankan material ke WIP proses produksi."
  },
  {
    no: 3,
    code: "ALUR-03",
    name: "Crusher ke MATKOM (Hasil Gilingan Plastik ke Gudang Bahan Baku)",
    type: "IN",
    origin: "Area Mesin Crusher / Daur Ulang",
    destination: "Gudang Bahan Baku / MATKOM",
    doc: "Bukti Penerimaan Material Crusher / Regrind Slip",
    desc: "Penerimaan biji plastik daur ulang (regrind resin) hasil penghancuran runner, sprue, dan part reject di mesin crusher. Material ditimbang, dilabeli jenis resinnya, dan dimasukkan kembali ke persediaan bahan baku MATKOM untuk dicampur (blending) sesuai proporsi BOM standar."
  },
  {
    no: 4,
    code: "ALUR-04",
    name: "Produksi ke MATKOM (Retur Sisa Bahan Baku dari Produksi)",
    type: "IN",
    origin: "Lantai Produksi (Mesin Injeksi / Line)",
    destination: "Gudang MATKOM / Store",
    doc: "Formulir Retur Material Produksi ke Gudang",
    desc: "Pengembalian sisa bahan baku, pigment, atau komponen yang tidak terpakai setelah suatu Work Order selesai diproduksi. Gudang menimbang sisa resin, mencatat pengembalian, dan mengoreksi biaya material aktual pada Work Order terkait."
  },
  {
    no: 5,
    code: "ALUR-05",
    name: "Store ke Produksi IN (Verifikasi Checksheet Penerimaan Material di Line)",
    type: "IN",
    origin: "Store / Gudang Material",
    destination: "Lantai Produksi (Operator Mesin / Leader)",
    doc: "Checksheet Penerimaan Material Produksi (Alur 5)",
    desc: "Verifikasi formal penerimaan material di stasiun kerja produksi. Operator/Leader memeriksa kesesuaian kemasan (packaging), label lot nomor, kuantitas aktual, dan spesifikasi material sebelum dimasukkan ke dalam hopper mesin/dryer."
  },
  {
    no: 6,
    code: "ALUR-06",
    name: "Produksi ke QC OUT (Serah-Terima Output Mesin ke Pos Quality Gate)",
    type: "OUT",
    origin: "Lantai Produksi / Mesin Injeksi",
    destination: "Pos Quality Gate (QC Inspection Area)",
    doc: "Bukti Transfer Output Produksi (Alur 6) & Kartu Identifikasi Part",
    desc: "Penyerahan hasil cetak (molded parts) atau hasil perakitan dari operator produksi ke Quality Control Gate untuk menjalani inspeksi kualitas visual, dimensi, dan pengujian kelayakan sebelum dinyatakan sebagai Finished Good."
  },
  {
    no: 7,
    code: "ALUR-07",
    name: "Terima Rework QC IN (Produksi Menerima Part Rework dari QC)",
    type: "IN",
    origin: "Pos Quality Gate (QC)",
    destination: "Lantai Produksi / Stasiun Kerja Rework",
    doc: "Surat Perintah Kerja Rework & Tagging Kuning/Merah",
    desc: "Penyerahan produk yang dinyatakan mengalami cacat minor yang dapat diperbaiki (misal: flash/burr berlebih, gate trimming tidak rapi, pembersihan debu). Lantai produksi menerima kembali part untuk dilakukan tindakan perbaikan/rework sesuai instruksi QC."
  },
  {
    no: 8,
    code: "ALUR-08",
    name: "Retur Sisa MATKOM OUT (Pencatatan Sisa Material Produksi untuk Dikembalikan)",
    type: "OUT",
    origin: "Lantai Produksi (Line)",
    destination: "Gudang MATKOM",
    doc: "Bukti Pengeluaran Retur Material Lantai Produksi",
    desc: "Pencatatan dari sisi lantai produksi ketika membersihkan area mesin (cleaning/purging) dan mendokumentasikan jumlah material yang dikembalikan ke gudang penyimpanan."
  },
  {
    no: 9,
    code: "ALUR-09",
    name: "Kirim Crusher OUT (Penyerahan Runner & Reject ke Area Crusher)",
    type: "OUT",
    origin: "Lantai Produksi (Mesin Injeksi)",
    destination: "Area Mesin Crusher",
    doc: "Formulir Penyerahan Limbah Plastik / Runner & Sprue",
    desc: "Penyerahan sisa runner, sprue hasil injeksi, dan part cacat (short shot, sinking, silver streak) yang tidak dapat dirework ke mesin crusher untuk dihancurkan menjadi biji gilingan daur ulang."
  },
  {
    no: 10,
    code: "ALUR-10",
    name: "Quality Control & QC Gate Inspection (Inspeksi Mutu & Keputusan)",
    type: "INSPECTION",
    origin: "Pos Quality Gate",
    destination: "Gudang FG (Lolos) / Rework (Alur 7) / NG Disposal (Alur 12)",
    doc: "Inspection Log Sheet & QC Pass Sticker",
    desc: "Pemeriksaan ketat oleh QC Inspector terhadap setiap lot/batch produk: pengecekan dimensi (caliper/micrometer), berat per shot, warna, kekuatan struktur, serta ada/tidaknya cacat cetak. Keputusan: Lolos (Release ke FG), Rework (Kembali ke Produksi), atau Reject (Karantina)."
  },
  {
    no: 11,
    code: "ALUR-11",
    name: "Investigasi Customer Claim di QC Gate",
    type: "INVESTIGATION",
    origin: "Karantina Gudang FG (Alur 14)",
    destination: "Tim QC, R&D, dan Engineering",
    doc: "Berita Acara Klaim Pelanggan & Laporan 8D / Korektif",
    desc: "Investigasi menyeluruh terhadap barang komplain/retur yang diterima dari customer. Tim QC melakukan penelusuran akar masalah (5-Why, Fishbone Diagram) dari lot produksi terkait dan menentukan status barang: diperbaiki, diganti, atau di-scrap."
  },
  {
    no: 12,
    code: "ALUR-12",
    name: "Penanganan NG & Disposal (Disposisi Produk Cacat & Scrap)",
    type: "DISPOSITION",
    origin: "Area Karantina QC",
    destination: "Mesin Crusher / Pemusnahan (Disposal) / Vendor Claim",
    doc: "Berita Acara Pemusnahan / Disposisi Non-Conforming Products",
    desc: "Tindakan resmi terhadap barang cacat yang tidak dapat digunakan lagi. Disposisi mencakup: Sent to Crusher (dihancurkan untuk regrind), Disposed/Scrap (dimusnahkan/dijual sebagai limbah afval), atau Vendor Claim (dikembalikan ke supplier material)."
  },
  {
    no: 13,
    code: "ALUR-13",
    name: "QC Gate ke FG IN (Penerimaan Barang Jadi Lolos QC di Gudang FG)",
    type: "IN",
    origin: "Pos Quality Gate (Lolos Inspeksi)",
    destination: "Gudang Finished Goods (FG)",
    doc: "Bukti Penyerahan Barang Jadi ke Gudang FG & QC Pass Tag",
    desc: "Penerimaan fisik barang jadi yang telah lulus uji QC ke rak Gudang Finished Goods (FG). Menambah saldo kuantitas stok barang jadi siap kirim dan mengonversi biaya WIP menjadi Nilai Persediaan Barang Jadi."
  },
  {
    no: 14,
    code: "ALUR-14",
    name: "Customer Claim ke FG IN (Penerimaan Part Klaim Pelanggan ke Gudang Karantina)",
    type: "IN",
    origin: "Customer Eksternal",
    destination: "Area Karantina Gudang FG",
    doc: "Surat Retur Customer / Nota Klaim Kualitas",
    desc: "Penerimaan fisik barang yang dikembalikan oleh pelanggan karena komplain kualitas atau salah kirim. Barang diisolasi di area karantina gudang FG agar tidak bercampur dengan stok bagus, sebelum diteruskan ke QC Gate (Alur 11)."
  },
  {
    no: 15,
    code: "ALUR-15",
    name: "Surat Jalan Balikan IN (Penerimaan Kembali Barang Pengiriman yang Tertolak/Tertunda)",
    type: "IN",
    origin: "Ekspedisi / Pengiriman Driver",
    destination: "Gudang Finished Goods (FG)",
    doc: "Surat Jalan Asli dengan Catatan Penolakan / Dokumen Balikan",
    desc: "Penerimaan kembali barang jadi yang tidak dapat diterima oleh pelanggan saat proses pengiriman (misal: gudang customer tutup, kelebihan kirim, atau selisih kuantitas armada pengangkut). Barang diverifikasi ulang dan dikembalikan ke stok gudang FG."
  },
  {
    no: 16,
    code: "ALUR-16",
    name: "Surat Jalan Pengiriman ke Customer (Alur 16 OUT)",
    type: "OUT",
    origin: "Gudang Finished Goods (FG)",
    destination: "Customer / Pabrik Perakitan Pelanggan",
    doc: "Surat Jalan Resmi (Delivery Note) & Order Sheet",
    desc: "Pengeluaran fisik barang jadi dari gudang FG ke armada pengiriman ekspedisi untuk dikirimkan ke pelanggan sesuai Order Sheet / Jadwal Delivery. Mengurangi stok barang jadi di gudang FG dan menjadi dasar terbitnya Faktur Penjualan (Sales Invoice)."
  }
];

const MODULE_DETAILS = [
  {
    code: "MOD-00",
    name: "Dashboard Utama",
    icon: "LayoutDashboard",
    path: "/dashboard",
    summary: "Pusat informasi eksekutif yang menampilkan metrik performa bisnis utama, grafik tren penjualan harian, status realisasi produksi, ringkasan nilai persediaan, posisi kas/bank, dan monitoring anggaran (budget vs actual).",
    menus: [
      {
        name: "Dashboard Overview",
        path: "/dashboard",
        desc: "Monitoring indikator kunci: total PO pending, Work Order aktif, stok kritis di bawah minimum, tagihan jatuh tempo (AP & AR), dan pencapaian sales mingguan/bulanan."
      }
    ]
  },
  {
    code: "MOD-01",
    name: "Supplier & Pembelian",
    icon: "ShoppingCart",
    path: "/supplier-pembelian",
    summary: "Mengelola seluruh siklus pengadaan (Procure-to-Pay), mulai dari master data vendor, pengajuan pembelian (PR), penerbitan PO, penerimaan barang fisik di gudang (Alur 1), faktur tagihan supplier (3-way match), pengajuan pembayaran, hingga pelunasan hutang dagang dan retur.",
    menus: [
      {
        name: "Supplier",
        path: "/supplier-pembelian/suppliers",
        desc: "Master data pemasok: nama perusahaan, kontak PIC, alamat, NPWP, termin pembayaran (TOP: 30, 60 hari), rekening bank vendor, dan mata uang default."
      },
      {
        name: "Supplier Group",
        path: "/supplier-pembelian/supplier-group",
        desc: "Klasifikasi vendor berdasarkan komoditas (misal: Bahan Baku Resin, Pigmen/Masterbatch, Kemasan/Karton, Sparepart Mesin, Subkontraktor Jasa)."
      },
      {
        name: "Jurnal Pembelian",
        path: "/supplier-pembelian/jurnal-pembelian",
        desc: "Konfigurasi akun GL otomatis untuk membukukan transaksi pembelian (Debit: Persediaan / Beban, Kredit: Hutang Usaha / Hutang Belum Difakturkan)."
      },
      {
        name: "Jurnal A.P. (Accounts Payable)",
        path: "/supplier-pembelian/jurnal-ap",
        desc: "Pengaturan akun buku pembantu hutang dagang, potongan diskon pembelian, dan selisih kurs pembelian valuta asing."
      },
      {
        name: "Jurnal Biaya Impor V.2",
        path: "/supplier-pembelian/jurnal-biaya-impor-v2",
        desc: "Pemetaan akun akuntansi untuk kapitalisasi biaya freight forwarding, bea masuk, pajak impor (PPh 22 & PPN Impor), dan handling fee ke dalam nilai HPP barang impor."
      },
      {
        name: "Tutup Pending PO",
        path: "/supplier-pembelian/tutup-pending-po",
        desc: "Menutup sisa kuantitas PO yang tidak akan dikirim lagi oleh vendor agar tidak menggantung di outstanding order dan tidak mengacaukan perhitungan MRP."
      },
      {
        name: "Transaksi A.P.",
        path: "/supplier-pembelian/transaksi-ap",
        desc: "Laporan buku pembantu hutang per supplier, analisis umur hutang (Aging AP: 0-30, 31-60, 61-90, >90 hari), dan monitoring jadwal jatuh tempo pembayaran."
      },
      {
        name: "Permintaan Pembelian (Purchase Request)",
        path: "/budgeting/purchase-request",
        desc: "Pengajuan permohonan kebutuhan barang dari departemen user, dilengkapi validasi sisa anggaran departemen (budget availability) dan alur persetujuan bertingkat."
      },
      {
        name: "Tutup PR",
        path: "/supplier-pembelian/tutup-pr",
        desc: "Menutup dokumen PR yang tidak disetujui atau kuantitas sisa yang tidak akan diproses menjadi Purchase Order."
      },
      {
        name: "Purchase Order (PO)",
        path: "/supplier-pembelian/purchase-order",
        desc: "Penerbitan surat pesanan resmi kepada vendor terpilih berdasarkan PR yang disetujui, mencantumkan harga netto, PPN/PPH, jadwal pengiriman, dan ketentuan garansi."
      },
      {
        name: "Terima Barang / Penerimaan Barang",
        path: "/supplier-pembelian/penerimaan-barang",
        desc: "Pencatatan penerimaan fisik barang di dermaga gudang (Alur 1), pencocokan kuantitas dengan PO dan Surat Jalan vendor, input nomor lot/batch, dan cetak Bukti Penerimaan Barang (BPB)."
      },
      {
        name: "Retur PB (Penerimaan Barang)",
        path: "/supplier-pembelian/retur-pb",
        desc: "Pengembalian barang langsung di pintu gudang saat proses inspeksi penerimaan sebelum faktur tagihan diterbitkan (karena reject, salah spesifikasi, atau kemasan rusak)."
      },
      {
        name: "Pembelian dari PO / Faktur Pembelian",
        path: "/supplier-pembelian/faktur",
        desc: "Pencatatan faktur tagihan resmi supplier dengan sistem 3-Way Matching (PO vs Surat Jalan Penerimaan vs Invoice Supplier), menghasilkan pengakuan Hutang Usaha dan Jurnal Otomatis."
      },
      {
        name: "Pembelian Langsung",
        path: "/supplier-pembelian/pembelian-langsung",
        desc: "Pencatatan transaksi pembelian tunai/operasional cepat tanpa alur PO formal untuk kebutuhan mendesak bernilai kecil."
      },
      {
        name: "Biaya Impor V.2",
        path: "/supplier-pembelian/biaya-impor",
        desc: "Perhitungan landed cost untuk mendistribusikan biaya impor (ongkos kapal, custom clearance, asuransi) ke harga satuan unit barang yang diimpor."
      },
      {
        name: "Pengajuan Pembayaran",
        path: "/supplier-pembelian/pengajuan-pembayaran",
        desc: "Daftar pengajuan rencana pembayaran tagihan vendor yang jatuh tempo untuk mendapatkan persetujuan dari Manager Finance dan Direksi sebelum pencairan kas."
      },
      {
        name: "Pelunasan Utang",
        path: "/supplier-pembelian/pelunasan-hutang",
        desc: "Eksekusi pembayaran hutang melalui Kas atau Rekening Bank perusahaan, mencatat potongan pph pasal 23, diskon pelunasan, dan memotong saldo hutang vendor."
      },
      {
        name: "Retur Pembelian",
        path: "/supplier-pembelian/retur-pembelian",
        desc: "Penerbitan Nota Retur Pembelian atas barang yang telah difakturkan, menghasilkan Debit Note yang memotong saldo hutang atau tagihan berikutnya."
      }
    ]
  },
  {
    code: "MOD-02",
    name: "Customer & Penjualan",
    icon: "Users",
    path: "/customer-penjualan",
    summary: "Mengelola siklus pendapatan (Order-to-Cash), mulai dari master customer, perkiraan kebutuhan (Forecast), penerimaan PO Pelanggan, Order Sheet, Surat Jalan pengiriman (Alur 16), pembuatan Faktur Penjualan, Tanda Terima Tagihan, hingga Penerimaan Pembayaran Piutang dan Retur Penjualan.",
    menus: [
      {
        name: "Customer",
        path: "/customer-penjualan/customers",
        desc: "Master data pelanggan: legalitas perusahaan, NPWP, alamat kantor & alamat pabrik (delivery point), plafon kredit (credit limit), termin pembayaran, dan PIC pembelian."
      },
      {
        name: "Grup Customer",
        path: "/customer-penjualan/grup-customer",
        desc: "Segmentasi pelanggan (misal: Tier 1 Otomotif, Industri Elektronik, Peralatan Rumah Tangga, Konsumen Retail)."
      },
      {
        name: "Tipe Customer",
        path: "/customer-penjualan/tipe-customer",
        desc: "Kategorisasi perpajakan dan bisnis (Pelanggan Lokal Ber-NPWP, Kawasan Berikat / Non-PPN, Ekspor, Afiliasi)."
      },
      {
        name: "Jurnal Penjualan",
        path: "/customer-penjualan/jurnal-penjualan",
        desc: "Pengaturan akun GL otomatis untuk membukukan penjualan (Debit: Piutang Dagang / Kas, Kredit: Pendapatan Penjualan & PPN Keluaran)."
      },
      {
        name: "Jurnal A.R. (Accounts Receivable)",
        path: "/customer-penjualan/jurnal-ar",
        desc: "Pemetaan akun buku pembantu piutang dagang, retur penjualan, cadangan kerugian piutang, dan selisih kurs piutang valas."
      },
      {
        name: "Salesman",
        path: "/customer-penjualan/salesman",
        desc: "Data tenaga penjual (marketing representative), target omzet tahunan, dan asosiasi wilayah kerja pelanggan."
      },
      {
        name: "Weekday",
        path: "/customer-penjualan/weekday",
        desc: "Pengaturan jadwal rutin hari penerimaan barang per pelanggan untuk memandu tim logistik dan ekspedisi dalam menyusun rute truk mingguan."
      },
      {
        name: "Komisi Per Item",
        path: "/customer-penjualan/komisi-per-item",
        desc: "Skema persentase atau nominal insentif komisi sales per item produk yang berhasil terjual dan tertagih."
      },
      {
        name: "Scan Product",
        path: "/customer-penjualan/scan-product",
        desc: "Fitur pemindaian barcode/QR box produk di area staging sebelum dinaikkan ke truk pengiriman untuk mencegah salah muat part."
      },
      {
        name: "Tutup Pending SO",
        path: "/customer-penjualan/tutup-pending-so",
        desc: "Menutup pesanan penjualan (Sales Order) yang dibatalkan oleh customer atau tidak dilanjutkan pengirimannya."
      },
      {
        name: "Transaksi A.R.",
        path: "/customer-penjualan/transaksi-ar",
        desc: "Buku pembantu piutang pelanggan, pemantauan saldo tagihan outstanding, analisis umur piutang (Aging AR), dan evaluasi batas kredit."
      },
      {
        name: "Forecast (Penawaran Penjualan)",
        path: "/customer-penjualan/penawaran-penjualan",
        desc: "Pencatatan estimasi volume pesanan masa depan dari pelanggan bulanan (M, M+1, M+2) sebagai acuan utama perencanaan material MRP dan kapasitas mesin MPP."
      },
      {
        name: "PO Customer",
        path: "/customer-penjualan/customer-po",
        desc: "Pendaftaran Purchase Order resmi yang diterbitkan oleh pelanggan, mencakup nomor PO pelanggan, daftar part, harga kontrak, dan tanggal batas kirim."
      },
      {
        name: "Order Sheet (Sales Order)",
        path: "/customer-penjualan/sales-order",
        desc: "Instruksi penjualan internal yang merinci jadwal pengiriman bertahap (delivery schedule), alokasi stok gudang FG, atau perintah otomatis untuk membuat Work Order."
      },
      {
        name: "Surat Jalan (Alur 16 OUT)",
        path: "/customer-penjualan/surat-jalan",
        desc: "Dokumen resmi pengantar pengiriman barang dari Gudang FG ke pabrik pelanggan. Mengurangi stok fisik barang jadi, mencatat nomor kendaraan dan nama sopir."
      },
      {
        name: "Retur Surat Jalan",
        path: "/customer-penjualan/retur-surat-jalan",
        desc: "Penyesuaian kuantitas surat jalan apabila customer hanya menerima sebagian barang karena keterbatasan tempat atau adanya kemasan yang rusak saat perjalanan."
      },
      {
        name: "Penjualan Via S.J.",
        path: "/customer-penjualan/penjualan-via-sj",
        desc: "Penerbitan Faktur Penjualan (Sales Invoice) otomatis berdasarkan Surat Jalan yang telah ditandatangani dan dicap oleh pihak gudang pelanggan."
      },
      {
        name: "Penjualan Via S.O.",
        path: "/customer-penjualan/penjualan-via-so",
        desc: "Penerbitan faktur uang muka (Down Payment) atau invoice berbasis pesanan sebelum pengiriman fisik dilakukan."
      },
      {
        name: "Penjualan Langsung",
        path: "/customer-penjualan/penjualan-langsung",
        desc: "Faktur penjualan tunai di tempat untuk penjualan afval/scrap, produk sampel, atau transaksi retail spontan."
      },
      {
        name: "Tanda Terima",
        path: "/customer-penjualan/tanda-terima",
        desc: "Manajemen tanda terima penyerahan berkas penagihan (Invoice + Faktur Pajak + Surat Jalan Asli) ke loket Finance pelanggan sebagai syarat perhitungan jatuh tempo TOP."
      },
      {
        name: "Penagihan Piutang",
        path: "/customer-penjualan/penagihan-piutang",
        desc: "Pencetakan surat peringatan tagihan / statement of account (SOA) kepada pelanggan yang invoice-nya telah mendekati atau melewati jatuh tempo."
      },
      {
        name: "Penerimaan Piutang",
        path: "/customer-penjualan/penerimaan-piutang",
        desc: "Pencatatan pelunasan tagihan dari pelanggan melalui transfer bank atau giro, memperhitungkan bukti potong PPh 23, diskon pembayaran cepat, dan penutupan piutang."
      },
      {
        name: "Retur Penjualan",
        path: "/customer-penjualan/retur-penjualan",
        desc: "Pengakuan retur barang dari customer yang disetujui, menerbitkan Nota Retur / Credit Note yang mengurangi nilai piutang pelanggan atau mengganti dengan produk baru."
      }
    ]
  },
  {
    code: "MOD-03",
    name: "Persediaan Barang (Inventory)",
    icon: "Package",
    path: "/persediaan-barang",
    summary: "Pusat pengelolaan dan valuasi seluruh aset persediaan fisik perusahaan pada berbagai fasilitas gudang (Gudang Bahan Baku MATKOM, Gudang Barang Jadi FG, Gudang WIP, Area Karantina QC, Area Crusher). Mengontrol kartu stok, mutasi gudang, stok opname, dan alur pergerakan material 16 Alur.",
    menus: [
      {
        name: "Stok Gudang",
        path: "/persediaan-barang/stok-gudang",
        desc: "Monitoring kuantitas stok real-time per lokasi gudang, nilai persediaan rupiah, safety stock level, status reorder point, dan histori kartu stok keluar-masuk."
      },
      {
        name: "Inventory (Master Produk)",
        path: "/master-data/products",
        desc: "Katalog master barang: kode barang, nama part, nomor part customer (OEM Part No), tipe barang (Raw Material, WIP, Finished Good), satuan, berat netto, dan harga standar."
      },
      {
        name: "Gudang",
        path: "/persediaan-barang/gudang",
        desc: "Master lokasi penyimpanan fisik (Gudang MATKOM, Gudang Lantai Produksi, Gudang FG, Area Karantina QC, Gudang Crusher, Gudang Sparepart)."
      },
      {
        name: "Kategori Barang",
        path: "/master-data/product-categories",
        desc: "Pengelompokan barang untuk pelaporan dan pemetaan integrasi akun buku besar persediaan akuntansi."
      },
      {
        name: "Merek",
        path: "/persediaan-barang/merek",
        desc: "Data brand/merek dagang produk atau produsen bahan baku plastik (misal: Toray, LG Chem, ExxonMobil, Polychem)."
      },
      {
        name: "Jurnal Persediaan",
        path: "/persediaan-barang/jurnal-persediaan",
        desc: "Konfigurasi akun GL untuk mutasi persediaan, selisih stok opname, persediaan dalam perjalanan (transit), dan biaya pemakaian material."
      },
      {
        name: "Duplikat Barang",
        path: "/persediaan-barang/duplikat-barang",
        desc: "Alat utilitas untuk menduplikasi master produk dengan parameter serupa guna mempercepat registrasi part baru yang mirip."
      },
      {
        name: "Jurnal Produksi",
        path: "/persediaan-barang/jurnal-produksi",
        desc: "Pemetaan akun GL untuk persediaan dalam proses (WIP), alokasi biaya overhead pabrik (BOP), dan selisih variansi standar produksi."
      },
      {
        name: "Biaya",
        path: "/persediaan-barang/biaya",
        desc: "Master tarif elemen biaya produksi: tarif mesin per jam kerja, tarif listrik pabrik per kWh, tarif tenaga kerja langsung per menit."
      },
      {
        name: "Bill of Materials (BOM)",
        path: "/manufacturing/bom",
        desc: "Formula teknis manufaktur: kebutuhan resin murni (gram/shot), persentase campuran regrind, pigmen pewarna, cycle time (detik), cavity mold, dan komponen sub-assembly."
      },
      {
        name: "Penyesuaian Stok",
        path: "/persediaan-barang/penyesuaian",
        desc: "Koreksi manual kuantitas atau nilai persediaan akibat susut alami, sampel uji laboratorium, atau kerusakan material tak terduga."
      },
      {
        name: "Tutup Pending SR",
        path: "/persediaan-barang/tutup-pending-sr",
        desc: "Menutup dokumen Stock Request internal yang tidak lagi diperlukan agar alokasi kuantitas stok dapat dirilis kembali."
      },
      {
        name: "Stock Request (SR)",
        path: "/persediaan-barang/stock-request",
        desc: "Formulir permohonan permintaan barang atau material dari bagian operasional/departemen ke gudang penyimpan."
      },
      {
        name: "Transaksi Persediaan",
        path: "/persediaan-barang/transaksi-persediaan",
        desc: "Proses transfer mutasi barang antar gudang internal (misal: transfer resin dari Gudang Pusat ke Gudang Satelit)."
      },
      {
        name: "Penyesuaian HPP V.2",
        path: "/persediaan-barang/penyesuaian-hpp-v2",
        desc: "Rekalkulasi dan sinkronisasi harga pokok persediaan menggunakan metode rata-rata tertimbang (Weighted Average Costing)."
      },
      {
        name: "Stok Opname",
        path: "/persediaan-barang/stok-opname",
        desc: "Pencatatan hasil perhitungan fisik berkala, sistem freeze saldo, analisis variansi selisih fisik vs sistem, dan persetujuan posting jurnal penyesuaian."
      },
      {
        name: "Adjust Harga Jual",
        path: "/persediaan-barang/adjust-harga-jual",
        desc: "Modul pembaruan daftar harga jual produk massal berdasarkan formula kenaikan harga bahan baku plastik internasional (ICIS)."
      },
      {
        name: "Produksi Langsung",
        path: "/persediaan-barang/produksi-langsung",
        desc: "Konversi cepat pemakaian bahan baku menjadi produk jadi secara simultan tanpa melalui tahapan penjadwalan Work Order untuk perakitan sederhana."
      },
      {
        name: "Schedule Pengiriman Vendor",
        path: "/persediaan-barang/schedule-vendor",
        desc: "Monitoring dan manajemen jadwal kedatangan truk supplier di pabrik agar tidak terjadi penumpukan armada di dermaga bongkar."
      },
      {
        name: "Penerimaan by Schedule",
        path: "/persediaan-barang/penerimaan-by-schedule",
        desc: "Fitur penerimaan barang terintegrasi dengan pemindaian barcode jadwal supplier untuk percepatan verifikasi dan cetak label lot otomatis."
      },
      {
        name: "Realisasi Bahan Baku (Alur 2 OUT)",
        path: "/persediaan-barang/realisasi-bahan-baku",
        desc: "Pengeluaran resmi material dari Gudang MATKOM ke Lantai Produksi sesuai kebutuhan nomor Work Order."
      },
      {
        name: "Crusher ke MATKOM (Alur 3 IN)",
        path: "/persediaan-barang/penerimaan-crusher",
        desc: "Pencatatan penerimaan material biji plastik daur ulang (regrind resin) dari area crusher kembali ke persediaan bahan baku MATKOM."
      },
      {
        name: "Produksi ke MATKOM (Alur 4 IN)",
        path: "/persediaan-barang/penerimaan-retur-produksi",
        desc: "Penerimaan pengembalian kelebihan resin dan komponen yang tidak terpakai dari lantai kerja ke Gudang MATKOM."
      },
      {
        name: "QC Gate ke FG (Alur 13 IN)",
        path: "/persediaan-barang/penerimaan-fg",
        desc: "Penerimaan fisik barang jadi yang telah dinyatakan lolos uji inspeksi Quality Control Gate masuk ke persediaan Gudang Finished Goods."
      },
      {
        name: "Customer Claim ke FG (Alur 14 IN)",
        path: "/persediaan-barang/customer-claim-fg",
        desc: "Penerimaan barang klaim/retur dari pelanggan ke area karantina gudang FG sebelum dilakukan analisis investigasi di QC Gate (Alur 11)."
      },
      {
        name: "Surat Jalan Balikan (Alur 15 IN)",
        path: "/persediaan-barang/sj-balikan",
        desc: "Penerimaan kembali barang pengiriman ekspedisi yang tertunda atau tidak berhasil diserahkan ke pelanggan."
      }
    ]
  },
  {
    code: "MOD-04",
    name: "Manufacturing & Produksi",
    icon: "Factory",
    path: "/manufacturing",
    summary: "Tulang punggung operasional pabrik manufaktur (Plastic Injection & Assembly), mencakup Engineering Master (BOM, Mesin, Mold, Work Center), Perencanaan Produksi (MRP & MPP Penjadwalan Mesin), Penerbitan Perintah Kerja (Work Order), Eksekusi Lantai Kerja, Serah-Terima Antar Unit (Alur 5, 6, 7, 8, 9), Penanganan Produk Cacat (NG & Disposal), dan Pos Inspeksi Quality Control Gate.",
    menus: [
      {
        name: "Bill of Materials (BOM)",
        path: "/manufacturing/bom",
        desc: "Master formula dan struktur pohon produk (Multi-Level BOM), mencakup data gramatur shot weight, runner weight, jumlah cavity, waktu siklus injeksi (cycle time), dan instruksi kerja."
      },
      {
        name: "Daftar Mesin",
        path: "/manufacturing/daftar-mesin",
        desc: "Inventaris mesin produksi pabrik (Mesin Injeksi Plastik 50T - 850T, Robot Arm, Auto Loader, Mold Temperature Controller / MTC), kapasitas tonase, dan catatan histori pemeliharaan."
      },
      {
        name: "Kategori Mesin",
        path: "/manufacturing/kategori-mesin",
        desc: "Klasifikasi pengelompokan jenis mesin (Mesin Injeksi Horisontal, Mesin Injeksi Vertikal, Mesin Crusher Limbah, Lini Pad Printing, Lini Perakitan Manual)."
      },
      {
        name: "Daftar Mold",
        path: "/manufacturing/daftar-mold",
        desc: "Manajemen cetakan cetak (mould/dies): nomor mold, jumlah cavity aktif, kepemilikan aset (milik customer / milik internal), shot counter digital, dan jadwal preventive maintenance mold."
      },
      {
        name: "Work Center",
        path: "/manufacturing/work-center",
        desc: "Pusat stasiun kerja lantai pabrik (Stasiun Injeksi Plastik, Stasiun Trimming, Stasiun Assembly, Pos QC Gate, Area Crusher, Stasiun Packaging)."
      },
      {
        name: "MRP (Material Requirement Planning)",
        path: "/manufacturing/mrp",
        desc: "Simulasi perhitungan kebutuhan bersih material: membandingkan permintaan Customer PO/Forecast dengan stok on-hand dan stok on-order, menghasilkan rekomendasi jadwal pengadaan material (PR)."
      },
      {
        name: "MPP (Master Production Planning / Jadwal Mesin)",
        path: "/manufacturing/mpp",
        desc: "Penjadwalan urutan mesin produksi (Machine Scheduling) dengan diagram Gantt visual, memperhitungkan waktu pasang-bongkar mold (changeover mold), ketersediaan jam shift, dan efisiensi kapasitas."
      },
      {
        name: "Work Order (Surat Perintah Kerja)",
        path: "/manufacturing/work-order",
        desc: "Dokumen perintah kerja resmi bagi operator lini produksi: mencantumkan target kuantitas part, mesin yang dialokasikan, nomor mold, resep material BOM, dan target jam selesai."
      },
      {
        name: "Dashboard Transaksi Produksi",
        path: "/manufacturing/dashboard-transaksi",
        desc: "Papan kendali visual real-time di lantai produksi: status mesin (Running, Setup, Idle, Breakdown), rasio pencapaian target harian, persentase reject rate, dan efisiensi OEE (Overall Equipment Effectiveness)."
      },
      {
        name: "Realisasi Bahan Baku",
        path: "/persediaan-barang/realisasi-bahan-baku",
        desc: "Dokumentasi serah-terima material dari Gudang MATKOM ke mesin produksi sesuai alokasi Work Order."
      },
      {
        name: "Realisasi Hasil Produksi",
        path: "/manufacturing/realisasi-produksi",
        desc: "Pencatatan hasil output operator per shift kerja: total shot mesin, jumlah part OK, jumlah part NG beserta kategori cacat (short mold, flash, bubble, burr), dan jam henti mesin (downtime)."
      },
      {
        name: "Serah-Terima Produksi (Alur 5,6,7,8,9)",
        path: "/manufacturing/transfer-produksi",
        desc: "Modul sentral perpindahan fisik lantai produksi yang terdiri atas 5 tab utama:\n- Tab Alur 5: Store ke Produksi IN (Checksheet verifikasi material masuk line)\n- Tab Alur 6: Produksi ke QC OUT (Serah-terima output part ke QC Gate)\n- Tab Alur 7: Terima Rework QC IN (Penerimaan part cacat minor untuk diperbaiki)\n- Tab Alur 8: Retur Sisa MATKOM OUT (Pencatatan sisa resin kembali ke gudang)\n- Tab Alur 9: Kirim Crusher OUT (Penyerahan runner dan reject ke area mesin crusher)."
      },
      {
        name: "Penanganan NG & Disposal",
        path: "/manufacturing/ng-disposal",
        desc: "Proses disposisi produk cacat (Non-Conforming Material): keputusan resmi apakah part dikirim ke crusher (Sent to Crusher), dimusnahkan/scrap (Disposed), dirework, atau dikembalikan ke vendor."
      },
      {
        name: "Quality Control & QC Gate",
        path: "/manufacturing/qc-gate",
        desc: "Pusat penjaminan mutu pabrik yang terbagi atas tab:\n- Realisasi: Verifikasi output mesin langsung\n- Alur 10: QC Gate Inspection (Pemeriksaan dimensi, visual, go/no-go gauge, approval rilis ke FG)\n- Alur 11 & Claims: Penanganan investigasi customer claim dan vendor claim\n- Alur 12: Pengawasan karantina part reject."
      }
    ]
  },
  {
    code: "MOD-05",
    name: "Kas & Bank",
    icon: "Landmark",
    path: "/kas-bank",
    summary: "Mengelola likuiditas keuangan perusahaan, saldo kas operasional, rekening giro bank, mutasi transfer antar rekening, pengeluaran kas operasional, rekonsiliasi berkala dengan rekening koran bank, dan transaksi multi-currency.",
    menus: [
      {
        name: "Daftar Kas & Bank",
        path: "/kas-bank/daftar",
        desc: "Master rekening kas kecil (Petty Cash), kas operasional kantor, dan seluruh rekening bank perusahaan (IDR, USD, JPY) beserta saldo buku saat ini."
      },
      {
        name: "Transaksi Kas",
        path: "/kas-bank/transaksi",
        desc: "Pencatatan penerimaan dan pengeluaran kas/bank non-faktur (misal: pembayaran biaya perizinan, biaya operasional kantor, biaya konsumsi, penerimaan bunga bank)."
      },
      {
        name: "Transfer Kas",
        path: "/kas-bank/transfer",
        desc: "Pemindahan dana antar rekening kas/bank internal perusahaan (misal: penarikan dana dari rekening giro BCA ke kas operasional tunai)."
      },
      {
        name: "Rekonsiliasi Bank",
        path: "/kas-bank/rekonsiliasi",
        desc: "Pencocokan mutasi transaksi pada buku bank sistem dengan mutasi rekening koran bank riil, mengidentifikasi biaya administrasi, bunga, atau transaksi gantung (outstanding check)."
      },
      {
        name: "Currencies",
        path: "/master-data/currencies",
        desc: "Master mata uang asing dan pembaruan kurs valuta asing (kurs transaksi dan kurs pajak BI) untuk pembukuan selisih kurs otomatis."
      }
    ]
  },
  {
    code: "MOD-06",
    name: "General Ledger (Buku Besar & Akuntansi)",
    icon: "BookOpen",
    path: "/general-ledger",
    summary: "Pusat akuntansi keuangan perusahaan yang menghimpun seluruh jurnal transaksi operasional secara real-time. Mengelola Bagan Akun Standar (COA), Departemen, Cost Center, Anggaran Belanja (Budgeting), Template Jurnal Memorial, Transaksi GL, serta Menghasilkan Laporan Keuangan Neraca dan Laba Rugi.",
    menus: [
      {
        name: "Akun GL (Chart of Accounts / COA)",
        path: "/general-ledger/akun-gl",
        desc: "Struktur bagan akun standar akuntansi bertingkat: Aktiva Lancar, Aktiva Tetap, Kewajiban Jangka Pendek/Panjang, Ekuitas Modal, Pendapatan, HPP Manufaktur, Beban Operasional, dan Pendapatan/Beban Lain."
      },
      {
        name: "GL Kategori",
        path: "/general-ledger/gl-kategori",
        desc: "Pengelompokan akun untuk penyusunan struktur format Laporan Posisi Keuangan (Neraca) dan Laporan Laba Rugi Komprehensif."
      },
      {
        name: "Departemen",
        path: "/general-ledger/departemen",
        desc: "Master unit organisasi perusahaan (Produksi, Maintenance, QC, PPIC, Purchasing, Marketing, Keuangan & Akuntansi, HRGA, IT)."
      },
      {
        name: "Cost Center",
        path: "/general-ledger/cost-center",
        desc: "Pusat pertanggungjawaban pembebanan biaya untuk mengukur efisiensi biaya per lini mesin atau per fungsi kerja spesifik."
      },
      {
        name: "Budgeting",
        path: "/general-ledger/budgeting",
        desc: "Penetapan pagu anggaran tahunan per akun beban operasional untuk mencegah pemborosan dan over-spending."
      },
      {
        name: "Budgeting CC (Cost Center)",
        path: "/general-ledger/budgeting-cc",
        desc: "Penetapan limit alokasi anggaran spesifik per unit Cost Center dalam satu departemen."
      },
      {
        name: "Rumus Rasio Keuangan",
        path: "/general-ledger/rumus-rasio-keuangan",
        desc: "Konfigurasi formula analisis kinerja keuangan korporasi (Current Ratio, Quick Ratio, Debt to Equity, Gross Margin, Net Profit Margin, ROA, ROE)."
      },
      {
        name: "GL Template",
        path: "/general-ledger/gl-template",
        desc: "Pola template jurnal berulang untuk mempercepat input pencatatan memorial rutin (penyusutan aktiva tetap bulanan, amortisasi asuransi, akrual beban gaji)."
      },
      {
        name: "Transaksi GL (Jurnal Memorial & Log Jurnal)",
        path: "/general-ledger/transaksi-gl",
        desc: "Pencatatan jurnal umum manual dan pengawasan seluruh jurnal otomatis yang dibentuk oleh transaksi purchasing, sales, inventory, kas/bank, dan penyelesaian Work Order."
      }
    ]
  },
  {
    code: "MOD-07",
    name: "Master Data & Lain-lain",
    icon: "MoreHorizontal",
    path: "#",
    summary: "Pengaturan master data pendukung seluruh operasional sistem: regulasi perpajakan (PPh & PPN), syarat termin pembayaran bisnis, konversi satuan ukuran barang, permohonan registrasi part baru, tipe klasifikasi barang, serta pengaturan shift kerja pabrik.",
    menus: [
      {
        name: "Daftar PPH",
        path: "/lain-lain/daftar-pph",
        desc: "Pengaturan tarif pajak penghasilan sesuai peraturan perundangan perpajakan (PPh 21 tenaga ahli, PPh 22 impor, PPh 23 jasa teknik, PPh 4 ayat 2 final)."
      },
      {
        name: "Daftar Tipe PPN",
        path: "/lain-lain/daftar-ppn",
        desc: "Konfigurasi tarif Pajak Pertambahan Nilai (PPN Standar 11%/12%, PPN Dibebaskan Kawasan Berikat, Non-PPN)."
      },
      {
        name: "Syarat Bayar (Terms of Payment)",
        path: "/lain-lain/syarat-bayar",
        desc: "Master termin pembayaran transaksi (Cash On Delivery/COD, Net 14 Hari, Net 30 Hari, Net 60 Hari, End of Month/EOM, DP 50% Balance Before Delivery)."
      },
      {
        name: "Units (Satuan Ukuran)",
        path: "/master-data/units",
        desc: "Master satuan ukuran kuantitas fisik (PCS, KG, GRAM, MTR, ROLL, BOX, PACK, CAN, SET) beserta tabel faktor konversi antar satuan."
      },
      {
        name: "Product Requests",
        path: "/master-data/product-requests",
        desc: "Alur permohonan pendaftaran kode part baru dari tim Sales/Engineering kepada tim Master Data Administrator dengan verifikasi gambar teknis dan spesifikasi."
      },
      {
        name: "Tipe Barang Jadi",
        path: "/lain-lain/tipe-barang-jadi",
        desc: "Sub-kategori produk jadi (Otomotif Interior, Otomotif Exterior, Komponen Kelistrikan, Kemasan Medis, Wadah Makanan)."
      },
      {
        name: "Tipe Barang",
        path: "/lain-lain/tipe-barang",
        desc: "Klasifikasi material persediaan (Resin Murni, Masterbatch/Pewarna, Regrind/Gilingan, Sub-Part Komponen, Insert Logam, Karton Box, Kantong Plastik, Thinner/Solvent)."
      },
      {
        name: "Daftar Shift",
        path: "/lain-lain/daftar-shift",
        desc: "Pengaturan jam kerja regu operasional pabrik (Shift 1 Pagi: 07.00-15.00, Shift 2 Siang: 15.00-23.00, Shift 3 Malam: 23.00-07.00) dan alokasi jam istirahat."
      },
      {
        name: "Master Budgeting & Approval Request",
        path: "/budgeting/master-budget",
        desc: "Penyusunan anggaran belanja korporat dan alur verifikasi approval limit anggaran sebelum transaksi dapat diproses."
      },
      {
        name: "Update Actual",
        path: "/budgeting/update-actual",
        desc: "Proses pembaruan nilai realisasi transaksi pengeluaran aktual terhadap saldo pagu anggaran tahunan berjalan."
      }
    ]
  },
  {
    code: "MOD-08",
    name: "Pengaturan Sistem (Settings)",
    icon: "Settings",
    path: "#",
    summary: "Konfigurasi parameter global aplikasi dan aturan tata kelola approval alur dokumen kerja perusahaan.",
    menus: [
      {
        name: "Konfigurasi Umum",
        path: "/settings/general",
        desc: "Pengaturan parameter inti: format otomatis penomoran dokumen (Nomor PO, WO, SJ, Inv), aktivasi modul penerimaan by schedule, integrasi sistem, dan logo korporat."
      },
      {
        name: "Approval Rules",
        path: "/settings/approval",
        desc: "Konfigurasi matriks kewenangan persetujuan berjenjang: penentuan approver (Supervisor, Manager, Direktur) berdasarkan kategori transaksi dan batas nominal rupiah."
      }
    ]
  },
  {
    code: "MOD-09",
    name: "User Security & Keamanan",
    icon: "ShieldCheck",
    path: "#",
    summary: "Pengendalian hak akses, keamanan data, dan audit trail operasional pengguna sistem.",
    menus: [
      {
        name: "Data Karyawan",
        path: "/settings/karyawan",
        desc: "Basis data personil karyawan pabrik: NIK, Nama Lengkap, Departemen, Jabatan, Tanggal Bergabung, dan Status Kerja."
      },
      {
        name: "Users & Department",
        path: "/settings/users",
        desc: "Manajemen akun login sistem, penugasan username, email kantor, password terenkripsi bcrypt, dan penugasan departemen."
      },
      {
        name: "Roles Management",
        path: "/settings/roles",
        desc: "Pengelolaan peran hak akses (Role-Based Access Control / RBAC) seperti: Super Admin, Produksi Admin, Operator Injeksi, QC Supervisor, Gudang Logistik, Sales Marketing, Finance & Accounting."
      },
      {
        name: "Permissions",
        path: "/settings/permissions",
        desc: "Matriks izin akses detail per menu: Create (tambah data), Read (lihat data), Update (edit), Delete (hapus), Approve (setujui), Export Excel, dan Print Dokumen."
      },
      {
        name: "Activity Log",
        path: "/settings/activity-log",
        desc: "Jejak audit digital (Audit Trail) yang mencatat seluruh riwayat aksi pengguna secara otomatis: siapa pengguna, waktu kejadian, IP address, jenis aksi, dan rekaman perubahan nilai data lama vs data baru."
      },
      {
        name: "Error Logs",
        path: "/settings/error-logs",
        desc: "Pencatatan riwayat galat/exception sistem backend untuk kebutuhan diagnostik dan pemeliharaan tim teknologi informasi (IT)."
      }
    ]
  },
  {
    code: "MOD-10",
    name: "Daftar Laporan (Reports)",
    icon: "FileBarChart",
    path: "#",
    summary: "Laporan analitis dan rekapitulasi operasional komprehensif untuk mendukung pengambilan keputusan manajemen eksekutif.",
    menus: [
      {
        name: "Purchase Request Report",
        path: "/reports/purchase-request",
        desc: "Laporan analisis siklus pengadaan: status realisasi PR, outstanding PR yang belum menjadi PO, dan evaluasi lead time pengadaan barang per departemen."
      },
      {
        name: "Master Budget Report",
        path: "/reports/master-budget",
        desc: "Laporan perbandingan pagu anggaran terhadap realisasi aktual belanja (Budget vs Actual) per departemen beserta persentase sisa kuota anggaran."
      },
      {
        name: "Laporan Penjualan",
        path: "/reports/penjualan",
        desc: "Analisis performa penjualan: omzet per periode, ranking customer terbesar, volume penjualan per part, kinerja sales, dan kontribusi laba kotor produk."
      },
      {
        name: "Laporan Stok",
        path: "/reports/stok",
        desc: "Laporan komprehensif persediaan: valuasi stok gudang, mutasi masuk/keluar, kartu stok, serta analisis aging stok (stok lambat bergerak / slow moving)."
      },
      {
        name: "Laporan Keuangan",
        path: "/reports/keuangan",
        desc: "Paket laporan keuangan standar akuntansi: Laporan Laba Rugi (Profit & Loss), Laporan Posisi Keuangan (Neraca / Balance Sheet), Laporan Arus Kas, dan Buku Besar Pembantu."
      }
    ]
  },
  {
    code: "MOD-11",
    name: "Profil Perusahaan (Company Profile)",
    icon: "Building2",
    path: "/settings/company",
    summary: "Pengaturan identitas resmi entitas perusahaan yang menjadi rujukan legalitas seluruh kop surat formulir cetakan sistem (PO, Faktur, Surat Jalan, Work Order, dan Slip Kas).",
    menus: [
      {
        name: "Profil Perusahaan",
        path: "/settings/company",
        desc: "Pengisian nama legal perseroan (PT), alamat kantor pusat, alamat fasilitas pabrik manufaktur, nomor telepon/faksimili, email resmi, NPWP perusahaan, Nomor Induk Berusaha (NIB), dan nomor rekening resmi bank."
      }
    ]
  }
];

// ============================================================================
// GENERATOR 1: WORD DOCUMENT (.DOCX)
// ============================================================================

async function generateWordDocument() {
  console.log('Generating Word Document (.docx)...');
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    AlignmentType,
    ShadingType
  } = docx;

  const docChildren = [];

  // Title Section
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: "BUKU PANDUAN LENGKAP & SPESIFIKASI SISTEM",
          bold: true,
          size: 36,
          color: "1E3A8A",
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "ERP ENTERPRISE SYSTEM - PT. EPU",
          bold: true,
          size: 28,
          color: "0284C7",
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: "Dokumentasi Arsitektur, Alur Operasional 16 Alur Manufaktur, dan Penjelasan Menyeluruh Seluruh Menu",
          italics: true,
          size: 22,
          color: "475569",
          font: "Arial"
        })
      ]
    })
  );

  // Divider
  docChildren.push(
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: "------------------------------------------------------------------------------------------------------------------------",
          color: "CBD5E1"
        })
      ]
    })
  );

  // Chapter 1: Ringkasan Eksekutif & Arsitektur
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 150 },
      children: [
        new TextRun({
          text: "BAB 1: ARSITEKTUR SISTEM & GAMBARAN UMUM",
          bold: true,
          size: 28,
          color: "1E3A8A",
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 150 },
      children: [
        new TextRun({
          text: "Sistem ERP EPU merupakan sistem perencanaan sumber daya perusahaan (Enterprise Resource Planning) berbasis web modern yang dirancang khusus untuk industri manufaktur plastic injection, assembling, dan supply chain engineering. Sistem mengintegrasikan seluruh fungsi bisnis inti perusahaan mulai dari perencanaan kebutuhan material (MRP), operasional mesin pabrik, penjaminan mutu (Quality Gate), pengelolaan multi-gudang, logistik pengiriman, hingga akuntansi pembukuan otomatis dan audit kepatuhan.",
          size: 22,
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Teknologi Fondasi: Frontend dibangun dengan Next.js / TypeScript modern yang responsif dan cepat, didukung oleh Backend Node.js Express API berkinerja tinggi, basis data relasional MySQL dengan Prisma ORM, serta sistem keamanan berbasis peran (Role-Based Access Control).",
          size: 22,
          font: "Arial",
          italics: true
        })
      ]
    })
  );

  // Chapter 2: The 16 Actual Operational Alurs
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 150 },
      children: [
        new TextRun({
          text: "BAB 2: FLOWCHART & PENJELASAN 16 ALUR MATERIAL DAN PRODUKSI (ACTUAL FLOW)",
          bold: true,
          size: 28,
          color: "1E3A8A",
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 150 },
      children: [
        new TextRun({
          text: "Sistem ERP EPU memiliki rancangan alur standar fisik dan dokumen yang presisi sebanyak 16 Alur (Alur 1 s/d 16). Alur ini menjamin ketertelusuran penuh (full traceability) mulai dari bahan baku datang hingga produk jadi dikirim ke pelanggan, termasuk penanganan sisa limbah dan klaim mutu.",
          size: 22,
          font: "Arial"
        })
      ]
    })
  );

  // Diagram Flowchart Macro in Text
  docChildren.push(
    new Paragraph({
      spacing: { before: 150, after: 100 },
      children: [
        new TextRun({
          text: "DIAGRAM ALIR HUBUNGAN 16 ALUR OPERASIONAL:",
          bold: true,
          size: 22,
          color: "0369A1",
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 250 },
      children: [
        new TextRun({
          text: 
`[SUPPLIER] 
   │  (Alur 1 IN: Penerimaan Barang PO)
   ▼
[GUDANG MATKOM / BAHAN BAKU] ◄────────────── [ALUR 3 IN: Crusher Regrind]
   │                                              ▲
   │ (Alur 2 OUT: Realisasi WO)                   │ (Alur 9 OUT: Runner/Reject)
   ▼                                              │
[LANTAI PRODUKSI / MESIN] ─────────────► [MESIN CRUSHER]
   │  ▲ (Alur 4 IN / 8 OUT: Retur Sisa)
   │  │
   │  └──────── [ALUR 7 IN: Terima Rework] ◄──────────┐
   │                                                   │ (Reject Rework)
   │ (Alur 6 OUT: Hasil Cetak)                         │
   ▼                                                   │
[QUALITY CONTROL / QC GATE] ───────────────────────────┴──────────┐
   │                                                               │ (Reject Scrap)
   │ (Alur 10: Inspeksi Lolos)                                     ▼
   │                                                    [ALUR 12: NG & DISPOSAL]
   ▼                                                               │
[GUDANG FINISHED GOODS (FG)] ◄────── [ALUR 14 IN: Retur Klaim] ────┤
   │                                 [ALUR 15 IN: SJ Balikan]      │ (Investigasi)
   │ (Alur 16 OUT: Surat Jalan Kirim)                              ▼
   ▼                                                    [ALUR 11: CLAIM INVESTIGATION]
[CUSTOMER / PELANGGAN]`,
          font: "Courier New",
          size: 18,
          color: "0F172A"
        })
      ]
    })
  );

  // Table of 16 Alurs
  const alurRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 1200, type: WidthType.DXA },
          shading: { fill: "1E3A8A", type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: "Alur", bold: true, color: "FFFFFF", font: "Arial", size: 20 })] })]
        }),
        new TableCell({
          width: { size: 2800, type: WidthType.DXA },
          shading: { fill: "1E3A8A", type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: "Nama & Alur Fisik", bold: true, color: "FFFFFF", font: "Arial", size: 20 })] })]
        }),
        new TableCell({
          width: { size: 1800, type: WidthType.DXA },
          shading: { fill: "1E3A8A", type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: "Dokumen / Form", bold: true, color: "FFFFFF", font: "Arial", size: 20 })] })]
        }),
        new TableCell({
          width: { size: 3600, type: WidthType.DXA },
          shading: { fill: "1E3A8A", type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: "Fungsi & Dampak Sistem", bold: true, color: "FFFFFF", font: "Arial", size: 20 })] })]
        })
      ]
    })
  ];

  ALUR_LIST.forEach((a, idx) => {
    alurRows.push(
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: idx % 2 === 0 ? "F8FAFC" : "FFFFFF", type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: a.code, bold: true, size: 20, color: "0284C7", font: "Arial" }),
                  new TextRun({ text: `\n(${a.type})`, size: 18, color: "64748B", font: "Arial" })
                ]
              })
            ]
          }),
          new TableCell({
            shading: { fill: idx % 2 === 0 ? "F8FAFC" : "FFFFFF", type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: a.name, bold: true, size: 20, font: "Arial" }),
                  new TextRun({ text: `\nDari: ${a.origin}`, size: 18, color: "475569", font: "Arial" }),
                  new TextRun({ text: `\nKe: ${a.destination}`, size: 18, color: "475569", font: "Arial" })
                ]
              })
            ]
          }),
          new TableCell({
            shading: { fill: idx % 2 === 0 ? "F8FAFC" : "FFFFFF", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: a.doc, size: 19, font: "Arial" })] })]
          }),
          new TableCell({
            shading: { fill: idx % 2 === 0 ? "F8FAFC" : "FFFFFF", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: a.desc, size: 19, font: "Arial" })] })]
          })
        ]
      })
    );
  });

  docChildren.push(
    new Table({
      width: { size: 9400, type: WidthType.DXA },
      rows: alurRows
    })
  );

  // Chapter 3: End-to-End Business Workflows
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 150 },
      children: [
        new TextRun({
          text: "BAB 3: SIKLUS PROSES BISNIS END-TO-END",
          bold: true,
          size: 28,
          color: "1E3A8A",
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: "3.1 Siklus Procure-to-Pay (Pengadaan s/d Pelunasan Hutang)",
          bold: true,
          size: 24,
          color: "0369A1",
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 150 },
      children: [
        new TextRun({
          text: 
`1. User Department mengajukan Purchase Request (PR) sesuai kebutuhan material / operasional.
2. Sistem mengecek ketersediaan anggaran (Budget Check) dan meminta approval berjenjang via Approval Rules.
3. Purchasing menerbitkan Purchase Order (PO) ke vendor berdasarkan PR yang telah approved.
4. Vendor mengirim barang -> Diterima oleh Gudang di menu Penerimaan Barang (Alur 1) dan dicatat nomor batch.
5. Vendor mengirim tagihan -> Bagian Finance mencatat Faktur Pembelian (3-Way Matching: PO vs BPB vs Invoice).
   - Jurnal Otomatis terbentuk: [Debit: Persediaan Bahan Baku / Beban, Kredit: Hutang Usaha].
6. Finance membuat Pengajuan Pembayaran -> Disetujui Manager Finance & Direksi.
7. Kasir membukukan Pelunasan Hutang via Kas/Bank -> [Debit: Hutang Usaha, Kredit: Kas/Bank & PPh 23].`,
          size: 21,
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: "3.2 Siklus Order-to-Cash (Pesanan Pelanggan s/d Penerimaan Pembayaran)",
          bold: true,
          size: 24,
          color: "0369A1",
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 150 },
      children: [
        new TextRun({
          text: 
`1. Marketing menginput Forecast Pelanggan dan mendaftarkan PO Customer resmi yang diterima.
2. Sales Order / Order Sheet dibuat untuk merencanakan alokasi kuantitas pengiriman per tanggal.
3. PPIC mengecek ketersediaan stok FG di Gudang. Jika kurang, memicu penerbitan Work Order (SPK Produksi).
4. Ketika barang siap di Gudang FG, Logistik menerbitkan Surat Jalan (Alur 16 OUT) dan truk berangkat.
   - Stok FG otomatis terpotong saat Surat Jalan diterbitkan.
5. Setelah Surat Jalan ditandatangani dan dicap oleh Customer, dibuatkan Faktur Penjualan (Sales Invoice).
   - Jurnal Otomatis terbentuk: [Debit: Piutang Usaha, Kredit: Pendapatan Penjualan & PPN Keluaran].
   - Jurnal HPP terbentuk: [Debit: HPP Penjualan, Kredit: Persediaan Barang Jadi].
6. Bagian Penagihan menyerahkan berkas tagihan disertai Tanda Terima Faktur.
7. Pelanggan melunasi via transfer bank -> Diinput di Penerimaan Piutang -> [Debit: Bank, Kredit: Piutang Usaha].`,
          size: 21,
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: "3.3 Siklus Perencanaan & Eksekusi Manufaktur (Manufacturing Cycle)",
          bold: true,
          size: 24,
          color: "0369A1",
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 150 },
      children: [
        new TextRun({
          text: 
`1. Engineering menyusun Bill of Materials (BOM) multi-level: shot weight, runner, pigmen, cycle time, mold.
2. PPIC menjalankan simulasi MRP untuk menghitung Net Requirement material dan memicu Purchase Request jika kurang.
3. PPIC menyusun jadwal mesin di Master Production Planning (MPP) mempertimbangkan ketersediaan mold & shift.
4. Work Order diterbitkan ke lantai produksi.
5. Gudang mengeluarkan material via Realisasi Bahan Baku (Alur 2 OUT) ke operator mesin.
6. Operator memverifikasi material di menu Store ke Produksi (Alur 5 IN).
7. Mesin injeksi beroperasi -> Operator menginput Realisasi Hasil Produksi harian per shift (OK, NG, Downtime).
8. Part diserahkan ke QC Gate via Produksi ke QC (Alur 6 OUT).
9. QC melakukan inspeksi di QC Gate (Alur 10):
   - Jika Lolos: Diserahkan ke Gudang FG via QC Gate ke FG (Alur 13 IN).
   - Jika Butuh Perbaikan: Dikembalikan via Rework (Alur 7 IN).
   - Jika Reject Limbah: Runner & part reject dikirim ke Crusher (Alur 9 OUT) atau NG Disposal (Alur 12).
10. Material crusher yang telah digiling dikembalikan ke gudang via Crusher ke MATKOM (Alur 3 IN).`,
          size: 21,
          font: "Arial"
        })
      ]
    })
  );

  // Chapter 4: Detailed Explanation of Every Single Menu in the System
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 150 },
      children: [
        new TextRun({
          text: "BAB 4: PENJELASAN MENDALAM SETIAP MODUL DAN MENU SISTEM",
          bold: true,
          size: 28,
          color: "1E3A8A",
          font: "Arial"
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Berikut adalah katalog lengkap seluruh modul dan submenu yang terdapat dalam sistem ERP EPU beserta fungsi operasional, data input, validasi logika bisnis, dan integrasi antar modul.",
          size: 22,
          font: "Arial"
        })
      ]
    })
  );

  MODULE_DETAILS.forEach((mod) => {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
        children: [
          new TextRun({
            text: `${mod.code}: Modul ${mod.name}`,
            bold: true,
            size: 24,
            color: "0369A1",
            font: "Arial"
          })
        ]
      }),
      new Paragraph({
        spacing: { after: 150 },
        children: [
          new TextRun({
            text: `Ringkasan Fungsi: ${mod.summary}`,
            italics: true,
            size: 20,
            color: "334155",
            font: "Arial"
          })
        ]
      })
    );

    // Table of Submenus for this Module
    const menuRows = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 2600, type: WidthType.DXA },
            shading: { fill: "0284C7", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "Nama Menu & Path", bold: true, color: "FFFFFF", font: "Arial", size: 19 })] })]
          }),
          new TableCell({
            width: { size: 6800, type: WidthType.DXA },
            shading: { fill: "0284C7", type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: "Penjelasan Rinci, Alur Kerja & Integrasi", bold: true, color: "FFFFFF", font: "Arial", size: 19 })] })]
          })
        ]
      })
    ];

    mod.menus.forEach((m, mIdx) => {
      menuRows.push(
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: mIdx % 2 === 0 ? "F0F9FF" : "FFFFFF", type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: m.name, bold: true, size: 20, color: "0F172A", font: "Arial" }),
                    new TextRun({ text: `\n${m.path}`, size: 17, color: "64748B", font: "Courier New" })
                  ]
                })
              ]
            }),
            new TableCell({
              shading: { fill: mIdx % 2 === 0 ? "F0F9FF" : "FFFFFF", type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: m.desc, size: 19, color: "1E293B", font: "Arial" })
                  ]
                })
              ]
            })
          ]
        })
      );
    });

    docChildren.push(
      new Table({
        width: { size: 9400, type: WidthType.DXA },
        rows: menuRows
      }),
      new Paragraph({ spacing: { after: 200 }, children: [] })
    );
  });

  const wordDoc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 }
          }
        },
        children: docChildren
      }
    ]
  });

  const wordPath = path.join(OUT_DIR, 'ERP_EPU_Buku_Panduan_Lengkap_Sistem.docx');
  const buffer = await Packer.toBuffer(wordDoc);
  fs.writeFileSync(wordPath, buffer);
  console.log('Successfully saved Word Document:', wordPath);
}

// ============================================================================
// GENERATOR 2: POWERPOINT PRESENTATION (.PPTX)
// ============================================================================

async function generatePowerPoint() {
  console.log('Generating PowerPoint Presentation (.pptx)...');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';

  // Define Theme Colors
  const NAVY = '1E3A8A';
  const BLUE = '0284C7';
  const DARK = '0F172A';
  const GRAY = '64748B';
  const LIGHT_BG = 'F8FAFC';
  const WHITE = 'FFFFFF';
  const EMERALD = '059669';

  // SLIDE 1: Title Slide
  let slide = pptx.addSlide();
  slide.background = { color: NAVY };
  slide.addText('SISTEM ERP ENTERPRISE', {
    x: 0.8,
    y: 1.8,
    w: 11.5,
    h: 0.8,
    fontSize: 40,
    fontFace: 'Arial',
    color: WHITE,
    bold: true
  });
  slide.addText('PT. EPU - Arsitektur, Alur Operasional 16 Alur & Penjelasan Menyeluruh', {
    x: 0.8,
    y: 2.7,
    w: 11.5,
    h: 0.6,
    fontSize: 22,
    fontFace: 'Arial',
    color: '38BDF8'
  });
  slide.addText('Buku Panduan Komprehensif Seluruh Modul: Purchasing, Sales, Inventory, Manufacturing, Finance & Accounting', {
    x: 0.8,
    y: 3.6,
    w: 11.0,
    h: 0.8,
    fontSize: 16,
    fontFace: 'Arial',
    color: 'E2E8F0'
  });
  slide.addShape(pptx.ShapeType.line, { x: 0.8, y: 4.7, w: 4.0, h: 0, line: { color: '38BDF8', width: 3 } });
  slide.addText('Versi Dokumen: 2.0 (Actual Production System) | Tanggal Pembaruan: September 2026', {
    x: 0.8,
    y: 5.5,
    w: 11.5,
    h: 0.5,
    fontSize: 14,
    fontFace: 'Arial',
    color: '94A3B8'
  });

  // SLIDE 2: Executive Summary & System Blueprint
  slide = pptx.addSlide();
  slide.background = { color: LIGHT_BG };
  slide.addText('GAMBARAN UMUM & BLUEPRINT ERP EPU', { x: 0.8, y: 0.5, w: 11.5, h: 0.5, fontSize: 26, bold: true, color: NAVY });
  slide.addText('Arsitektur modular end-to-end terintegrasi dengan validasi real-time', { x: 0.8, y: 1.0, w: 11.5, h: 0.4, fontSize: 14, color: GRAY });

  // 4 Blueprint Cards
  const cards = [
    { title: 'Procure-to-Pay (P2P)', desc: 'Pengadaan bahan baku terhubung MRP, validasi pagu anggaran (Budget Check), penerimaan barang (Alur 1), dan 3-way matching faktur.', col: '1E3A8A' },
    { title: 'Order-to-Cash (O2C)', desc: 'Sinkronisasi Forecast & PO Customer, penjadwalan Order Sheet, Surat Jalan (Alur 16 OUT), invoicing otomatis, dan penagihan piutang.', col: '0284C7' },
    { title: '16 Alur Manufaktur', desc: 'Siklus material tertutup (closed-loop) antara Store, Lantai Injeksi, QC Gate, Mesin Crusher, Karantina NG, hingga Gudang Barang Jadi (FG).', col: '059669' },
    { title: 'Financial & Accounting', desc: 'Buku Besar terotomatisasi (Auto-Journaling), Rekonsiliasi Bank, Kontrol Budgeting per Cost Center, serta Neraca & Laba Rugi real-time.', col: '7C3AED' }
  ];

  cards.forEach((c, i) => {
    const xPos = 0.8 + (i * 2.85);
    slide.addShape(pptx.ShapeType.roundRect, { x: xPos, y: 1.7, w: 2.7, h: 4.8, fill: { color: WHITE }, line: { color: 'E2E8F0', width: 1 } });
    slide.addShape(pptx.ShapeType.rect, { x: xPos, y: 1.7, w: 2.7, h: 0.1, fill: { color: c.col } });
    slide.addText(c.title, { x: xPos + 0.2, y: 2.0, w: 2.3, h: 0.8, fontSize: 18, bold: true, color: NAVY, wrap: true });
    slide.addText(c.desc, { x: xPos + 0.2, y: 2.9, w: 2.3, h: 3.2, fontSize: 14, color: DARK, lineSpacing: 20 });
  });

  // SLIDE 3: The 16 Alur - Flowchart Diagram
  slide = pptx.addSlide();
  slide.background = { color: LIGHT_BG };
  slide.addText('FLOWCHART 16 ALUR MATERIAL & PRODUKSI (ACTUAL)', { x: 0.8, y: 0.5, w: 11.5, h: 0.5, fontSize: 24, bold: true, color: NAVY });
  slide.addText('Siklus fisik material & verifikasi kualitas di lantai produksi PT. EPU', { x: 0.8, y: 1.0, w: 11.5, h: 0.4, fontSize: 14, color: GRAY });

  // Draw 16 alurs in organized blocks
  const alurDiagram = [
    { num: 'Alur 1', title: 'Penerimaan PO', sub: 'Vendor -> Gudang MATKOM', color: '0284C7', x: 0.8, y: 1.8 },
    { num: 'Alur 2', title: 'Realisasi Bahan Baku', sub: 'MATKOM -> Lini Produksi', color: '0284C7', x: 3.8, y: 1.8 },
    { num: 'Alur 5', title: 'Store ke Produksi IN', sub: 'Checksheet verifikasi di mesin', color: '0284C7', x: 6.8, y: 1.8 },
    { num: 'Alur 6', title: 'Produksi ke QC OUT', sub: 'Penyerahan hasil cetak ke QC', color: '0284C7', x: 9.8, y: 1.8 },

    { num: 'Alur 10', title: 'QC Gate Inspection', sub: 'Pemeriksaan Mutu Part (OK / NG)', color: '059669', x: 9.8, y: 3.4 },
    { num: 'Alur 7', title: 'Terima Rework IN', sub: 'Part cacat minor diperbaiki', color: 'D97706', x: 6.8, y: 3.4 },
    { num: 'Alur 9', title: 'Kirim Crusher OUT', sub: 'Runner & reject ke Crusher', color: '7C3AED', x: 3.8, y: 3.4 },
    { num: 'Alur 3', title: 'Crusher ke MATKOM', sub: 'Biji gilingan daur ulang masuk', color: '0284C7', x: 0.8, y: 3.4 },

    { num: 'Alur 13', title: 'QC Gate ke FG IN', sub: 'Barang OK masuk Gudang FG', color: '059669', x: 9.8, y: 5.0 },
    { num: 'Alur 16', title: 'Surat Jalan OUT', sub: 'Gudang FG -> Kirim Customer', color: '1E3A8A', x: 6.8, y: 5.0 },
    { num: 'Alur 14', title: 'Customer Claim IN', sub: 'Part retur masuk karantina FG', color: 'DC2626', x: 3.8, y: 5.0 },
    { num: 'Alur 11/12', title: 'Investigasi & Disposal', sub: 'Analisa 5-Why & Disposisi NG', color: 'DC2626', x: 0.8, y: 5.0 }
  ];

  alurDiagram.forEach((b) => {
    slide.addShape(pptx.ShapeType.roundRect, { x: b.x, y: b.y, w: 2.7, h: 1.3, fill: { color: WHITE }, line: { color: b.color, width: 2 } });
    slide.addShape(pptx.ShapeType.rect, { x: b.x, y: b.y, w: 0.8, h: 0.35, fill: { color: b.color } });
    slide.addText(b.num, { x: b.x, y: b.y, w: 0.8, h: 0.35, fontSize: 11, bold: true, color: WHITE, align: 'center' });
    slide.addText(b.title, { x: b.x + 0.1, y: b.y + 0.4, w: 2.5, h: 0.45, fontSize: 13, bold: true, color: NAVY });
    slide.addText(b.sub, { x: b.x + 0.1, y: b.y + 0.8, w: 2.5, h: 0.45, fontSize: 11, color: GRAY });
  });

  // SLIDE 4: Detail Table 16 Alur (Part 1: Alur 1 - 8)
  slide = pptx.addSlide();
  slide.background = { color: LIGHT_BG };
  slide.addText('SPESIFIKASI 16 ALUR OPERASIONAL (BAGIAN 1: ALUR 1 - 8)', { x: 0.8, y: 0.5, w: 11.5, h: 0.5, fontSize: 22, bold: true, color: NAVY });

  const tableAlur1 = [
    [
      { text: 'Kode', options: { bold: true, fill: NAVY, color: WHITE, fontSize: 11 } },
      { text: 'Nama Alur & Gerakan Fisik', options: { bold: true, fill: NAVY, color: WHITE, fontSize: 11 } },
      { text: 'Dokumen', options: { bold: true, fill: NAVY, color: WHITE, fontSize: 11 } },
      { text: 'Dampak Terhadap Sistem & Stok', options: { bold: true, fill: NAVY, color: WHITE, fontSize: 11 } }
    ]
  ];

  ALUR_LIST.slice(0, 8).forEach((a) => {
    tableAlur1.push([
      { text: `${a.code}\n(${a.type})`, options: { fontSize: 10, bold: true, color: BLUE } },
      { text: `${a.name}\n${a.origin} -> ${a.destination}`, options: { fontSize: 10, color: DARK } },
      { text: a.doc, options: { fontSize: 10, color: GRAY } },
      { text: a.desc.substring(0, 110) + '...', options: { fontSize: 9.5, color: DARK } }
    ]);
  });

  slide.addTable(tableAlur1, { x: 0.8, y: 1.2, w: 11.5, h: 5.3, colW: [1.2, 3.4, 2.4, 4.5] });

  // SLIDE 5: Detail Table 16 Alur (Part 2: Alur 9 - 16)
  slide = pptx.addSlide();
  slide.background = { color: LIGHT_BG };
  slide.addText('SPESIFIKASI 16 ALUR OPERASIONAL (BAGIAN 2: ALUR 9 - 16)', { x: 0.8, y: 0.5, w: 11.5, h: 0.5, fontSize: 22, bold: true, color: NAVY });

  const tableAlur2 = [
    [
      { text: 'Kode', options: { bold: true, fill: NAVY, color: WHITE, fontSize: 11 } },
      { text: 'Nama Alur & Gerakan Fisik', options: { bold: true, fill: NAVY, color: WHITE, fontSize: 11 } },
      { text: 'Dokumen', options: { bold: true, fill: NAVY, color: WHITE, fontSize: 11 } },
      { text: 'Dampak Terhadap Sistem & Stok', options: { bold: true, fill: NAVY, color: WHITE, fontSize: 11 } }
    ]
  ];

  ALUR_LIST.slice(8, 16).forEach((a) => {
    tableAlur2.push([
      { text: `${a.code}\n(${a.type})`, options: { fontSize: 10, bold: true, color: BLUE } },
      { text: `${a.name}\n${a.origin} -> ${a.destination}`, options: { fontSize: 10, color: DARK } },
      { text: a.doc, options: { fontSize: 10, color: GRAY } },
      { text: a.desc.substring(0, 110) + '...', options: { fontSize: 9.5, color: DARK } }
    ]);
  });

  slide.addTable(tableAlur2, { x: 0.8, y: 1.2, w: 11.5, h: 5.3, colW: [1.2, 3.4, 2.4, 4.5] });

  // SLIDES FOR ALL MAJOR MODULES (Module 1 to 10)
  MODULE_DETAILS.forEach((m) => {
    slide = pptx.addSlide();
    slide.background = { color: LIGHT_BG };
    slide.addText(`${m.code}: ${m.name.toUpperCase()}`, { x: 0.8, y: 0.4, w: 11.5, h: 0.5, fontSize: 22, bold: true, color: NAVY });
    slide.addText(m.summary, { x: 0.8, y: 0.9, w: 11.5, h: 0.6, fontSize: 12, color: GRAY, wrap: true });

    // Table of menus
    const menuTable = [
      [
        { text: 'Submenu', options: { bold: true, fill: BLUE, color: WHITE, fontSize: 11 } },
        { text: 'Path Sistem', options: { bold: true, fill: BLUE, color: WHITE, fontSize: 11 } },
        { text: 'Fungsi Utama & Logika Alur Bisnis', options: { bold: true, fill: BLUE, color: WHITE, fontSize: 11 } }
      ]
    ];

    // take top 7 menus if many to fit nicely
    const shownMenus = m.menus.slice(0, 8);
    shownMenus.forEach((sm) => {
      menuTable.push([
        { text: sm.name, options: { fontSize: 10.5, bold: true, color: DARK } },
        { text: sm.path, options: { fontSize: 9.5, color: GRAY } },
        { text: sm.desc.substring(0, 160) + (sm.desc.length > 160 ? '...' : ''), options: { fontSize: 10, color: DARK } }
      ]);
    });

    slide.addTable(menuTable, { x: 0.8, y: 1.6, w: 11.5, h: 5.0, colW: [2.8, 2.7, 6.0] });
  });

  // FINAL SLIDE: Security, Audit & Integration Summary
  slide = pptx.addSlide();
  slide.background = { color: NAVY };
  slide.addText('TATA KELOLA, KEAMANAN & INTEGRASI SISTEM', { x: 0.8, y: 0.8, w: 11.5, h: 0.5, fontSize: 26, bold: true, color: WHITE });
  slide.addShape(pptx.ShapeType.line, { x: 0.8, y: 1.4, w: 3.5, h: 0, line: { color: '38BDF8', width: 2 } });

  const finalPoints = [
    { title: 'Approval Rules Multi-Tingkat', desc: 'Persetujuan berjenjang berdasarkan threshold nominal transaksi (PR, PO, Pembayaran, SO).' },
    { title: 'Audit Trail Digital Otomatis', desc: 'Activity Log merekam setiap aksi Create, Update, Delete lengkap dengan timestamp, user_id, dan IP address.' },
    { title: 'Sistem Ketertelusuran Part (Traceability)', desc: 'Setiap lot Finished Good dapat dilacak balik ke nomor Work Order, operator shift, nomor lot resin supplier, dan checksheet QC.' },
    { title: 'Ketahanan & Integritas Finansial', desc: 'Seluruh pergerakan fisik barang terkoneksi langsung ke pembukuan jurnal akuntansi otomatis tanpa perlu input ganda.' }
  ];

  finalPoints.forEach((fp, i) => {
    const yPos = 1.8 + (i * 1.25);
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.8, y: yPos, w: 11.5, h: 1.05, fill: { color: '1E293B' }, line: { color: '334155', width: 1 } });
    slide.addText(fp.title, { x: 1.1, y: yPos + 0.15, w: 10.8, h: 0.35, fontSize: 16, bold: true, color: '38BDF8' });
    slide.addText(fp.desc, { x: 1.1, y: yPos + 0.5, w: 10.8, h: 0.45, fontSize: 13, color: 'E2E8F0' });
  });

  const pptxPath = path.join(OUT_DIR, 'ERP_EPU_Presentasi_Arsitektur_dan_Alur_Sistem.pptx');
  await pptx.writeFile({ fileName: pptxPath });
  console.log('Successfully saved PowerPoint Presentation:', pptxPath);
}

// ============================================================================
// GENERATOR 3: PDF DOCUMENT (.PDF)
// ============================================================================

async function generatePDF() {
  console.log('Generating PDF Document (.pdf)...');
  return new Promise((resolve, reject) => {
    try {
      const pdfPath = path.join(OUT_DIR, 'ERP_EPU_Dokumentasi_Sistem_dan_Flowchart.pdf');
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // Colors
      const NAVY = '#1E3A8A';
      const BLUE = '#0284C7';
      const DARK = '#0F172A';
      const GRAY = '#475569';
      const LINE_GRAY = '#CBD5E1';

      // Cover Page
      doc.rect(0, 0, 595.28, 20).fill(NAVY);
      doc.moveDown(4);

      doc.fontSize(24).font('Helvetica-Bold').fillColor(NAVY).text('DOKUMENTASI LENGKAP SISTEM ERP', { align: 'center' });
      doc.fontSize(18).font('Helvetica-Bold').fillColor(BLUE).text('PT. EPU (ENTERPRISE SYSTEM)', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').fillColor(GRAY).text('Panduan Operasional Komprehensif Seluruh Menu & Flowchart 16 Alur Manufaktur', { align: 'center' });
      doc.moveDown(2);

      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor(LINE_GRAY).stroke();
      doc.moveDown(2);

      // Section 1: Executive Overview
      doc.fontSize(16).font('Helvetica-Bold').fillColor(NAVY).text('1. PENDAHULUAN & ARSITEKTUR BISNIS');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor(DARK).text(
        'Sistem ERP EPU merupakan aplikasi enterprise terpadu yang dirancang untuk mengintegrasikan proses rantai pasok manufaktur plastic injection dan assembling secara real-time. Modul-modul utama mencakup Supplier & Pembelian, Customer & Penjualan, Persediaan Barang, Eksekusi Manufaktur 16 Alur, Kas & Bank, General Ledger, serta Tata Kelola User Security & Approval.',
        { lineGap: 3, align: 'justify' }
      );
      doc.moveDown(1.5);

      // Section 2: Flowchart Diagram Text
      doc.fontSize(16).font('Helvetica-Bold').fillColor(NAVY).text('2. FLOWCHART 16 ALUR MATERIAL & PRODUKSI');
      doc.moveDown(0.5);
      doc.fontSize(8.5).font('Courier').fillColor(DARK).text(
`[SUPPLIER] ──────────► [ALUR 1 IN: Penerimaan Barang PO]
                             │
                             ▼
                 [GUDANG MATKOM / BAHAN BAKU] ◄────── [ALUR 3 IN: Crusher Regrind]
                             │                            ▲
                             │ (ALUR 2 OUT: Realisasi WO) │ (ALUR 9 OUT: Runner/Reject)
                             ▼                            │
                 [LANTAI PRODUKSI / MESIN] ───────────────┴─► [MESIN CRUSHER]
                             │  ▲ (ALUR 4 IN / ALUR 8 OUT: Retur Sisa)
                             │  │
                             │  └──── [ALUR 7 IN: Rework] ◄────────┐
                             │                                     │ (Reject Rework)
                             │ (ALUR 6 OUT: Hasil Cetak)           │
                             ▼                                     │
                 [QUALITY CONTROL / QC GATE] ──────────────────────┴───────┐
                             │                                             │
                             │ (ALUR 10: QC Pass)                          ▼
                             ▼                                  [ALUR 12: NG DISPOSAL]
                 [GUDANG FINISHED GOODS (FG)] ◄── [ALUR 14/15]             │
                             │                                             ▼
                             │ (ALUR 16 OUT: Surat Jalan)       [ALUR 11: CLAIM INVESTIGATION]
                             ▼
                     [CUSTOMER / PELANGGAN]`,
        { lineGap: 1.5 }
      );
      doc.moveDown(1.5);

      // Section 3: 16 Alur Breakdown
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').fillColor(NAVY).text('3. DAFTAR LENGKAP 16 ALUR OPERASIONAL');
      doc.moveDown(0.8);

      ALUR_LIST.forEach((a) => {
        if (doc.y > 720) {
          doc.addPage();
        }
        doc.fontSize(11).font('Helvetica-Bold').fillColor(BLUE).text(`${a.code}: ${a.name} [${a.type}]`);
        doc.fontSize(9).font('Helvetica-Bold').fillColor(GRAY).text(`Rute Fisik: ${a.origin}  ->  ${a.destination} | Dokumen: ${a.doc}`);
        doc.fontSize(9).font('Helvetica').fillColor(DARK).text(a.desc, { lineGap: 2 });
        doc.moveDown(0.6);
      });

      // Section 4: Breakdown of Modules and Menus
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').fillColor(NAVY).text('4. PENJELASAN MENYELURUH SELURUH MENU SISTEM');
      doc.moveDown(0.8);

      MODULE_DETAILS.forEach((m) => {
        if (doc.y > 680) {
          doc.addPage();
        }
        doc.fontSize(13).font('Helvetica-Bold').fillColor(NAVY).text(`${m.code}: Modul ${m.name}`);
        doc.fontSize(9.5).font('Helvetica-Oblique').fillColor(GRAY).text(m.summary, { lineGap: 2 });
        doc.moveDown(0.5);

        m.menus.forEach((menu) => {
          if (doc.y > 730) {
            doc.addPage();
          }
          doc.fontSize(10).font('Helvetica-Bold').fillColor(BLUE).text(`- ${menu.name} (${menu.path})`);
          doc.fontSize(9).font('Helvetica').fillColor(DARK).text(menu.desc, { lineGap: 2 });
          doc.moveDown(0.4);
        });
        doc.moveDown(0.8);
      });

      doc.end();
      stream.on('finish', () => {
        console.log('Successfully saved PDF Document:', pdfPath);
        resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
}

// ============================================================================
// GENERATOR 4: INTERACTIVE & PRINTABLE HTML MANUAL (.HTML)
// ============================================================================

function generateHTML() {
  console.log('Generating Interactive & Printable HTML Manual (.html)...');
  const htmlPath = path.join(OUT_DIR, 'ERP_EPU_Dokumentasi_Interaktif_dan_Cetak.html');

  const alurCardsHtml = ALUR_LIST.map((a) => `
    <div class="alur-card ${a.type.toLowerCase()}">
      <div class="alur-badge">${a.code} • ${a.type}</div>
      <h3 class="alur-title">${a.name}</h3>
      <div class="alur-route">
        <span class="route-origin">${a.origin}</span>
        <span class="route-arrow">➔</span>
        <span class="route-dest">${a.destination}</span>
      </div>
      <p class="alur-doc"><strong>Dokumen Terkait:</strong> ${a.doc}</p>
      <p class="alur-desc">${a.desc}</p>
    </div>
  `).join('');

  const modulesHtml = MODULE_DETAILS.map((m) => `
    <section class="module-section" id="${m.code}">
      <div class="module-header">
        <span class="module-code">${m.code}</span>
        <h2>Modul ${m.name}</h2>
      </div>
      <p class="module-summary">${m.summary}</p>
      <div class="menu-grid">
        ${m.menus.map((menu) => `
          <div class="menu-card">
            <h4 class="menu-name">${menu.name}</h4>
            <div class="menu-path"><code>${menu.path}</code></div>
            <p class="menu-desc">${menu.desc}</p>
          </div>
        `).join('')}
      </div>
    </section>
  `).join('');

  const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Buku Panduan & Dokumentasi Lengkap ERP EPU</title>
  <style>
    :root {
      --primary: #1e3a8a;
      --primary-light: #0284c7;
      --primary-dark: #0f172a;
      --slate: #64748b;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --border: #e2e8f0;
      --emerald: #059669;
      --amber: #d97706;
      --rose: #e11d48;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--bg);
      color: var(--primary-dark);
      line-height: 1.6;
      padding: 0;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #0369a1 100%);
      color: white;
      padding: 3rem 2rem;
      text-align: center;
    }
    .header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; font-weight: 800; }
    .header p { font-size: 1.15rem; opacity: 0.9; max-width: 850px; margin: 0 auto 1.5rem; }
    .btn-print {
      display: inline-block;
      background: #38bdf8;
      color: #0f172a;
      padding: 0.6rem 1.4rem;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .btn-print:hover { background: #7dd3fc; }
    .container {
      max-width: 1200px;
      margin: 2rem auto;
      padding: 0 1.5rem;
    }
    .diagram-box {
      background: white;
      border-radius: 12px;
      border: 1px solid var(--border);
      padding: 2rem;
      margin-bottom: 2.5rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    }
    .diagram-box h2 {
      font-size: 1.6rem;
      color: var(--primary);
      margin-bottom: 1rem;
      border-bottom: 2px solid var(--primary-light);
      padding-bottom: 0.5rem;
    }
    .macro-flow {
      background: #0f172a;
      color: #38bdf8;
      font-family: "Fira Code", monospace;
      padding: 1.5rem;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.95rem;
      line-height: 1.45;
      white-space: pre;
    }
    .alur-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
      margin-top: 1.5rem;
    }
    .alur-card {
      background: white;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.25rem;
      position: relative;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
      transition: transform 0.15s ease;
    }
    .alur-card:hover { transform: translateY(-2px); }
    .alur-badge {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
      background: #e0f2fe;
      color: #0369a1;
      margin-bottom: 0.5rem;
    }
    .alur-card.in .alur-badge { background: #dcfce7; color: #15803d; }
    .alur-card.out .alur-badge { background: #fee2e2; color: #b91c1c; }
    .alur-card.inspection .alur-badge { background: #fef3c7; color: #b45309; }
    .alur-title { font-size: 1.1rem; color: var(--primary); margin-bottom: 0.5rem; }
    .alur-route {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      background: #f1f5f9;
      padding: 0.4rem 0.6rem;
      border-radius: 6px;
      margin-bottom: 0.6rem;
    }
    .route-arrow { color: var(--primary-light); font-weight: bold; }
    .alur-doc { font-size: 0.85rem; color: var(--slate); margin-bottom: 0.5rem; }
    .alur-desc { font-size: 0.9rem; color: #334155; }
    
    .module-section {
      background: white;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2.5rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    }
    .module-header {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      margin-bottom: 0.5rem;
    }
    .module-code {
      background: var(--primary);
      color: white;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.3rem 0.6rem;
      border-radius: 6px;
    }
    .module-header h2 { font-size: 1.5rem; color: var(--primary); }
    .module-summary { font-size: 1rem; color: var(--slate); margin-bottom: 1.5rem; }
    .menu-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.25rem;
    }
    .menu-card {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
    }
    .menu-name { font-size: 1.05rem; color: var(--primary); margin-bottom: 0.2rem; }
    .menu-path code {
      font-size: 0.75rem;
      background: #e2e8f0;
      color: #334155;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
    }
    .menu-desc { font-size: 0.88rem; color: #475569; margin-top: 0.6rem; }

    @media print {
      body { background: white; }
      .btn-print { display: none; }
      .header { padding: 1.5rem; background: var(--primary); }
      .container { max-width: 100%; margin: 0; padding: 0; }
      .module-section, .diagram-box { box-shadow: none; border: 1px solid #ccc; page-break-inside: avoid; }
      .alur-grid, .menu-grid { display: block; }
      .alur-card, .menu-card { margin-bottom: 1rem; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <header class="header">
    <h1>BUKU PANDUAN & DOKUMENTASI SISTEM ERP</h1>
    <p>PT. EPU - Dokumentasi Komprehensif Arsitektur Sistem, Flowchart 16 Alur Manufaktur, dan Penjelasan Menyeluruh Seluruh Menu</p>
    <button class="btn-print" onclick="window.print()">🖨️ Cetak atau Simpan sebagai PDF</button>
  </header>

  <div class="container">
    <div class="diagram-box">
      <h2>1. DIAGRAM ALIR MAKRO 16 ALUR OPERASIONAL (ACTUAL FLOW)</h2>
      <div class="macro-flow">
[SUPPLIER] 
   │  (Alur 1 IN: Penerimaan Barang PO)
   ▼
[GUDANG MATKOM / BAHAN BAKU] ◄────────────── [ALUR 3 IN: Crusher Regrind]
   │                                              ▲
   │ (Alur 2 OUT: Realisasi WO)                   │ (Alur 9 OUT: Runner/Reject)
   ▼                                              │
[LANTAI PRODUKSI / MESIN] ─────────────► [MESIN CRUSHER]
   │  ▲ (Alur 4 IN / 8 OUT: Retur Sisa)
   │  │
   │  └──────── [ALUR 7 IN: Terima Rework] ◄──────────┐
   │                                                   │ (Reject Rework)
   │ (Alur 6 OUT: Hasil Cetak)                         │
   ▼                                                   │
[QUALITY CONTROL / QC GATE] ───────────────────────────┴──────────┐
   │                                                               │ (Reject Scrap)
   │ (Alur 10: Inspeksi Lolos)                                     ▼
   │                                                    [ALUR 12: NG & DISPOSAL]
   ▼                                                               │
[GUDANG FINISHED GOODS (FG)] ◄────── [ALUR 14 IN: Retur Klaim] ────┤
   │                                 [ALUR 15 IN: SJ Balikan]      │ (Investigasi)
   │ (Alur 16 OUT: Surat Jalan Kirim)                              ▼
   ▼                                                    [ALUR 11: CLAIM INVESTIGATION]
[CUSTOMER / PELANGGAN]
      </div>

      <h2 style="margin-top: 2rem;">2. RINCIAN SPESIFIKASI 16 ALUR MATERIAL & PRODUKSI</h2>
      <div class="alur-grid">
        ${alurCardsHtml}
      </div>
    </div>

    <div class="diagram-box">
      <h2>3. ALUR BISNIS END-TO-END</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <div style="background: #f8fafc; padding: 1.2rem; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h3 style="color: var(--primary); margin-bottom: 0.5rem;">A. Procure-to-Pay (Pengadaan)</h3>
          <ol style="padding-left: 1.2rem; font-size: 0.9rem; color: #334155; line-height: 1.6;">
            <li><strong>Purchase Request (PR):</strong> Pengajuan kebutuhan barang dengan pengecekan pagu anggaran.</li>
            <li><strong>Approval Rules:</strong> Persetujuan bertingkat berdasarkan nominal rupiah.</li>
            <li><strong>Purchase Order (PO):</strong> Surat pesanan resmi ke vendor.</li>
            <li><strong>Penerimaan Barang (Alur 1):</strong> Penerimaan fisik di gudang & pencatatan nomor lot.</li>
            <li><strong>Faktur Pembelian:</strong> 3-way matching, terbentuk pengakuan hutang dagang.</li>
            <li><strong>Pelunasan Hutang:</strong> Pembayaran kas/bank & pemotongan bukti PPh 23.</li>
          </ol>
        </div>
        <div style="background: #f8fafc; padding: 1.2rem; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h3 style="color: var(--primary); margin-bottom: 0.5rem;">B. Order-to-Cash (Penjualan)</h3>
          <ol style="padding-left: 1.2rem; font-size: 0.9rem; color: #334155; line-height: 1.6;">
            <li><strong>Forecast & PO Customer:</strong> Registrasi demand kontrak pelanggan.</li>
            <li><strong>Order Sheet (SO):</strong> Jadwal alokasi pengiriman bertahap & trigger WO.</li>
            <li><strong>Surat Jalan (Alur 16 OUT):</strong> Pengeluaran fisik FG & potong stok otomatis.</li>
            <li><strong>Faktur Penjualan:</strong> Terbit invoice penjualan, terbentuk jurnal piutang & HPP.</li>
            <li><strong>Tanda Terima Faktur:</strong> Serah terima dokumen tagihan ke customer.</li>
            <li><strong>Penerimaan Piutang:</strong> Pencatatan pelunasan via transfer bank.</li>
          </ol>
        </div>
      </div>
    </div>

    ${modulesHtml}
  </div>
</body>
</html>`;

  fs.writeFileSync(htmlPath, fullHtml, 'utf8');
  console.log('Successfully saved HTML Manual:', htmlPath);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    await generateWordDocument();
    await generatePowerPoint();
    await generatePDF();
    generateHTML();
    console.log('\n======================================================');
    console.log('ALL 4 DOCUMENTATION FILES GENERATED SUCCESSFULLY IN:');
    console.log(OUT_DIR);
    console.log('1. ERP_EPU_Buku_Panduan_Lengkap_Sistem.docx (Microsoft Word)');
    console.log('2. ERP_EPU_Presentasi_Arsitektur_dan_Alur_Sistem.pptx (PowerPoint)');
    console.log('3. ERP_EPU_Dokumentasi_Sistem_dan_Flowchart.pdf (PDF)');
    console.log('4. ERP_EPU_Dokumentasi_Interaktif_dan_Cetak.html (Web Manual)');
    console.log('======================================================\n');
  } catch (error) {
    console.error('Error generating documentation:', error);
  }
}

main();
