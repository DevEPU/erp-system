const ExcelJS = require('exceljs');
const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

const artifactDir = 'C:\\Users\\IT Staff\\.gemini\\antigravity-ide\\brain\\f83ab715-21b7-40e6-b757-6bf8ceaa747d';
const publicDir = path.resolve(__dirname, '..', 'erp-next', 'public');

// Ensure directories exist
if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const excelArtifactPath = path.join(artifactDir, 'Presentasi_ERP_EPU_Forecast_to_MRP.xlsx');
const excelPublicPath = path.join(publicDir, 'Presentasi_ERP_EPU_Forecast_to_MRP.xlsx');

const pptxArtifactPath = path.join(artifactDir, 'Presentasi_ERP_EPU_Forecast_to_MRP.pptx');
const pptxPublicPath = path.join(publicDir, 'Presentasi_ERP_EPU_Forecast_to_MRP.pptx');

// ─── 1. GENERATE EXCEL WORKBOOK ──────────────────────────────────────────────
async function generateExcel() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ERP PT Eran Plastindo Utama';
  workbook.lastModifiedBy = 'ERP System';
  workbook.created = new Date();

  const primaryColor = '059669'; // Emerald-600
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
  const subHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
  const lightFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEECFBFD' } }; // Light emerald
  const fontHeader = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  const fontTitle = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF0F172A' } };
  const borderThin = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  };

  // --- SHEET 1: Executive Summary ---
  const wsSummary = workbook.addWorksheet('1. Ringkasan Eksekutif');
  wsSummary.views = [{ showGridLines: true }];

  wsSummary.mergeCells('B2:H2');
  const titleCell = wsSummary.getCell('B2');
  titleCell.value = 'ALUR INTEGRASI MANUFAKTUR: FORECAST ➔ PO CUSTOMER ➔ MRP';
  titleCell.font = fontTitle;

  wsSummary.mergeCells('B3:H3');
  wsSummary.getCell('B3').value = 'PT Eran Plastindo Utama - Sistem ERP Manufaktur & Procurement';
  wsSummary.getCell('B3').font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF64748B' } };

  // KPI Summary Cards
  const kpis = [
    { cellTitle: 'B5:C5', cellVal: 'B6:C6', title: 'Total Forecast Demand', val: '12,500 Pcs', note: 'Periode September 2026' },
    { cellTitle: 'D5:E5', cellVal: 'D6:E6', title: 'Total PO Customer Binding', val: '14,000 Pcs', note: 'Konfirmasi Resmi Customer' },
    { cellTitle: 'F5:G5', cellVal: 'F6:G6', title: 'Total Kebutuhan PR Material', val: 'Rp 485,500,000', note: 'Estimasi Pengadaan Vendor' }
  ];

  kpis.forEach(k => {
    wsSummary.mergeCells(k.cellTitle);
    wsSummary.mergeCells(k.cellVal);
    const tCell = wsSummary.getCell(k.cellTitle.split(':')[0]);
    tCell.value = k.title;
    tCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF64748B' } };
    tCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    tCell.alignment = { horizontal: 'center', vertical: 'middle' };

    const vCell = wsSummary.getCell(k.cellVal.split(':')[0]);
    vCell.value = k.val;
    vCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF059669' } };
    vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    vCell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Table Flow Explanation
  wsSummary.mergeCells('B9:H9');
  wsSummary.getCell('B9').value = 'LANGKAH-LANGKAH ALUR PROSES DALAM WORKBOOK';
  wsSummary.getCell('B9').font = fontHeader;
  wsSummary.getCell('B9').fill = headerFill;

  const flowSteps = [
    ['Langkah', 'Sheet / Menu', 'Deskripsi Proses', 'Fungsi Utama'],
    ['1', '2. Sales Forecast', 'Proyeksi permintaan pelanggan untuk periode M+1', 'Perencanaan awal & stok long lead-time'],
    ['2', '3. PO Customer', 'Konfirmasi pesanan binding dari pelanggan resmi', 'Mengunci target produksi & komitmen pengiriman'],
    ['3', '4. Bill of Materials (BOM)', 'Daftar ledakan komponen bahan baku per item FG', 'Menentukan rasio kebutuhan material per Pcs FG'],
    ['4', '5. Balance Inventori', 'Posisi stok fisik di gudang saat ini (On-Hand)', 'Mencegah pembelian berlebih (Excess Stock)'],
    ['5', '6. Perhitungan MRP & PR', 'Kalkulasi kebutuhan bersih & rilis PR per Vendor', 'Menghasilkan Purchase Request otomatis per Supplier']
  ];

  flowSteps.forEach((row, idx) => {
    const rIdx = 10 + idx;
    row.forEach((val, cIdx) => {
      const colLetter = String.fromCharCode(66 + cIdx); // B, C, D, E
      const cell = wsSummary.getCell(`${colLetter}${rIdx}`);
      cell.value = val;
      cell.border = borderThin;
      if (idx === 0) {
        cell.font = fontHeader;
        cell.fill = subHeaderFill;
      } else {
        cell.font = { name: 'Calibri', size: 10 };
      }
    });
  });

  wsSummary.getColumn('B').width = 12;
  wsSummary.getColumn('C').width = 25;
  wsSummary.getColumn('D').width = 50;
  wsSummary.getColumn('E').width = 45;

  // --- SHEET 2: Sales Forecast ---
  const wsForecast = workbook.addWorksheet('2. Sales Forecast');
  wsForecast.views = [{ showGridLines: true }];

  wsForecast.mergeCells('A1:G1');
  wsForecast.getCell('A1').value = 'DATA PROYEKSI SALES FORECAST (PERENCANAAN PERMINTAAN)';
  wsForecast.getCell('A1').font = fontTitle;

  const forecastHeaders = ['No Forecast', 'Nama Customer', 'Kode Item FG', 'Nama Item Barang Jadi', 'Target Qty (Pcs)', 'Bulan/Tahun', 'Status Appr.'];
  wsForecast.addRow([]);
  const fRow = wsForecast.addRow(forecastHeaders);
  fRow.eachCell(cell => {
    cell.font = fontHeader;
    cell.fill = headerFill;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const forecastData = [
    ['FC-2026-08-001', 'PT Honda Precision Parts', 'FG-MIRROR-RH', 'Holder Mirror RH 29702', 5000, 'Sep 2026', 'Approved'],
    ['FC-2026-08-002', 'PT Toyota Motor Manufacturing', 'FG-BRKT-LH', 'Mirror Bracket LH 29701', 4500, 'Sep 2026', 'Approved'],
    ['FC-2026-08-003', 'PT Suzuki Indomobil', 'FG-HSG-OUT', 'Housing Mirror Out LH', 3000, 'Sep 2026', 'Approved']
  ];

  forecastData.forEach(row => {
    const r = wsForecast.addRow(row);
    r.getCell(5).numberFormat = '#,##0';
    r.eachCell(cell => cell.border = borderThin);
  });

  wsForecast.columns = [
    { width: 18 }, { width: 30 }, { width: 18 }, { width: 30 }, { width: 18 }, { width: 15 }, { width: 15 }
  ];

  // --- SHEET 3: PO Customer ---
  const wsPO = workbook.addWorksheet('3. PO Customer');
  wsPO.views = [{ showGridLines: true }];

  wsPO.mergeCells('A1:H1');
  wsPO.getCell('A1').value = 'DATA PURCHASE ORDER CUSTOMER (ORDER RESMI BINDING)';
  wsPO.getCell('A1').font = fontTitle;

  const poHeaders = ['No PO Customer', 'Nama Pelanggan', 'No Ref SO', 'Kode FG', 'Nama Barang Jadi', 'PO Qty (Pcs)', 'Harga Satuan (Rp)', 'Total Nilai (Rp)'];
  wsPO.addRow([]);
  const poHeadRow = wsPO.addRow(poHeaders);
  poHeadRow.eachCell(cell => {
    cell.font = fontHeader;
    cell.fill = headerFill;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const poData = [
    ['PO-HPM-2026-089', 'PT Honda Precision Parts', 'SO-2026-08-012', 'FG-MIRROR-RH', 'Holder Mirror RH 29702', 6000, 45000, 270000000],
    ['PO-TMMIN-2026-104', 'PT Toyota Motor Manufacturing', 'SO-2026-08-015', 'FG-BRKT-LH', 'Mirror Bracket LH 29701', 5000, 38000, 190000000],
    ['PO-SIM-2026-055', 'PT Suzuki Indomobil', 'SO-2026-08-018', 'FG-HSG-OUT', 'Housing Mirror Out LH', 3000, 52000, 156000000]
  ];

  poData.forEach(row => {
    const r = wsPO.addRow(row);
    r.getCell(6).numberFormat = '#,##0';
    r.getCell(7).numberFormat = 'Rp #,##0';
    r.getCell(8).numberFormat = 'Rp #,##0';
    r.eachCell(cell => cell.border = borderThin);
  });

  wsPO.columns = [
    { width: 22 }, { width: 30 }, { width: 18 }, { width: 18 }, { width: 30 }, { width: 15 }, { width: 18 }, { width: 20 }
  ];

  // --- SHEET 4: Bill of Materials (BOM) ---
  const wsBOM = workbook.addWorksheet('4. Bill of Materials (BOM)');
  wsBOM.views = [{ showGridLines: true }];

  wsBOM.mergeCells('A1:H1');
  wsBOM.getCell('A1').value = 'STRUKTUR BILL OF MATERIALS (BOM EXPLOSION)';
  wsBOM.getCell('A1').font = fontTitle;

  const bomHeaders = ['Kode FG', 'Nama Barang Jadi', 'Kode Material Raw', 'Nama Bahan Baku / Penolong', 'Kebutuhan / Pcs FG', 'Satuan', 'Kode Vendor', 'Nama Vendor Supplier'];
  wsBOM.addRow([]);
  const bomHeadRow = wsBOM.addRow(bomHeaders);
  bomHeadRow.eachCell(cell => {
    cell.font = fontHeader;
    cell.fill = headerFill;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const bomData = [
    ['FG-MIRROR-RH', 'Holder Mirror RH 29702', 'RM-PP-BLACK', 'Resin PP Block Copolymer Black', 0.120, 'Kg', 'VND-001', 'PT Polychem Indonesia'],
    ['FG-MIRROR-RH', 'Holder Mirror RH 29702', 'MB-BLACK-01', 'Masterbatch Black Premium 2%', 0.005, 'Kg', 'VND-002', 'PT Clariant Masterbatch'],
    ['FG-MIRROR-RH', 'Holder Mirror RH 29702', 'PKG-BOX-MIR', 'Master Carton Box Holder Mirror', 0.040, 'Pcs', 'VND-003', 'PT Surindo Utama Box'],
    ['FG-BRKT-LH', 'Mirror Bracket LH 29701', 'RM-ABS-NATIVE', 'Resin ABS Natural High Impact', 0.180, 'Kg', 'VND-001', 'PT Polychem Indonesia'],
    ['FG-BRKT-LH', 'Mirror Bracket LH 29701', 'MB-BLACK-01', 'Masterbatch Black Premium 2%', 0.006, 'Kg', 'VND-002', 'PT Clariant Masterbatch'],
    ['FG-HSG-OUT', 'Housing Mirror Out LH', 'RM-PP-BLACK', 'Resin PP Block Copolymer Black', 0.250, 'Kg', 'VND-001', 'PT Polychem Indonesia']
  ];

  bomData.forEach(row => {
    const r = wsBOM.addRow(row);
    r.getCell(5).numberFormat = '0.000';
    r.eachCell(cell => cell.border = borderThin);
  });

  wsBOM.columns = [
    { width: 18 }, { width: 28 }, { width: 18 }, { width: 32 }, { width: 18 }, { width: 10 }, { width: 15 }, { width: 28 }
  ];

  // --- SHEET 5: Balance Inventori ---
  const wsInv = workbook.addWorksheet('5. Balance Inventori');
  wsInv.views = [{ showGridLines: true }];

  wsInv.mergeCells('A1:G1');
  wsInv.getCell('A1').value = 'POSISI SALDO STOK BAHAN BAKU (INVENTORY BALANCE)';
  wsInv.getCell('A1').font = fontTitle;

  const invHeaders = ['Kode Material', 'Nama Bahan Baku', 'Gudang Lokasi', 'Stok On-Hand', 'Safety Stock', 'Reserved Prod', 'Stok Available'];
  wsInv.addRow([]);
  const invHeadRow = wsInv.addRow(invHeaders);
  invHeadRow.eachCell(cell => {
    cell.font = fontHeader;
    cell.fill = headerFill;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const invData = [
    ['RM-PP-BLACK', 'Resin PP Block Copolymer Black', 'Gudang Bahan Baku Utama', 500.0, 100.0, 50.0, '=D4-E4-F4'],
    ['MB-BLACK-01', 'Masterbatch Black Premium 2%', 'Gudang Bahan Baku Utama', 20.0, 5.0, 2.0, '=D5-E5-F5'],
    ['PKG-BOX-MIR', 'Master Carton Box Holder Mirror', 80.0, 20.0, 10.0, '=D6-E6-F6'],
    ['RM-ABS-NATIVE', 'Resin ABS Natural High Impact', 200.0, 50.0, 0.0, '=D7-E7-F7']
  ];

  invData.forEach(row => {
    const r = wsInv.addRow(row);
    r.getCell(4).numberFormat = '#,##0.00';
    r.getCell(5).numberFormat = '#,##0.00';
    r.getCell(6).numberFormat = '#,##0.00';
    r.getCell(7).numberFormat = '#,##0.00';
    r.eachCell(cell => cell.border = borderThin);
  });

  wsInv.columns = [
    { width: 18 }, { width: 32 }, { width: 28 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
  ];

  // --- SHEET 6: Perhitungan MRP & PR ---
  const wsMRP = workbook.addWorksheet('6. Perhitungan MRP & PR');
  wsMRP.views = [{ showGridLines: true }];

  wsMRP.mergeCells('A1:J1');
  wsMRP.getCell('A1').value = 'KALKULASI MRP & AUTOMATIC RELEASE TO PURCHASE REQUEST (PR)';
  wsMRP.getCell('A1').font = fontTitle;

  const mrpHeaders = ['Kode MRP', 'Sumber Demand', 'Kode Material', 'Nama Bahan Baku', 'Kebutuhan Kotor (Gross)', 'Stok Available', 'Kebutuhan Bersih (Net PR)', 'Harga Satuan (Rp)', 'Total Cost (Rp)', 'Vendor Supplier'];
  wsMRP.addRow([]);
  const mrpHeadRow = wsMRP.addRow(mrpHeaders);
  mrpHeadRow.eachCell(cell => {
    cell.font = fontHeader;
    cell.fill = headerFill;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const mrpData = [
    ['MRP-202608-01', 'PO-HPM + PO-SIM', 'RM-PP-BLACK', 'Resin PP Block Copolymer Black', 1470.0, 350.0, '=E4-F4', 28000, '=G4*H4', 'PT Polychem Indonesia'],
    ['MRP-202608-02', 'PO-TMMIN', 'RM-ABS-NATIVE', 'Resin ABS Natural High Impact', 900.0, 150.0, '=E5-F5', 34000, '=G5*H5', 'PT Polychem Indonesia'],
    ['MRP-202608-03', 'PO-HPM + PO-TMMIN', 'MB-BLACK-01', 'Masterbatch Black Premium 2%', 60.0, 13.0, '=E6-F6', 85000, '=G6*H6', 'PT Clariant Masterbatch'],
    ['MRP-202608-04', 'PO-HPM', 'PKG-BOX-MIR', 'Master Carton Box Holder Mirror', 240.0, 50.0, '=E7-F7', 12500, '=G7*H7', 'PT Surindo Utama Box']
  ];

  mrpData.forEach(row => {
    const r = wsMRP.addRow(row);
    r.getCell(5).numberFormat = '#,##0.00';
    r.getCell(6).numberFormat = '#,##0.00';
    r.getCell(7).numberFormat = '#,##0.00';
    r.getCell(8).numberFormat = 'Rp #,##0';
    r.getCell(9).numberFormat = 'Rp #,##0';
    r.eachCell(cell => cell.border = borderThin);
  });

  wsMRP.columns = [
    { width: 16 }, { width: 20 }, { width: 18 }, { width: 32 }, { width: 22 }, { width: 16 }, { width: 22 }, { width: 18 }, { width: 22 }, { width: 28 }
  ];

  // Save Workbook
  await workbook.xlsx.writeFile(excelArtifactPath);
  await workbook.xlsx.writeFile(excelPublicPath);
  console.log('✅ Excel file successfully created at:', excelArtifactPath);
}

// ─── 2. GENERATE POWERPOINT PRESENTATION ────────────────────────────────────
async function generatePPTX() {
  const pptx = new pptxgen();

  pptx.layout = 'LAYOUT_16x9';
  pptx.title = 'Presentasi Integrasi Forecast to MRP';
  pptx.company = 'PT Eran Plastindo Utama';

  const emerald = '059669';
  const darkNavy = '0F172A';
  const lightBg = 'F8FAFC';
  const borderGray = 'E2E8F0';

  // --- SLIDE 1: Title Slide ---
  const slide1 = pptx.addSlide();
  slide1.background = { color: darkNavy };

  // Decorative Top Accent Line
  slide1.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.2, fill: { color: emerald } });

  slide1.addText('PT ERAN PLASTINDO UTAMA', {
    x: 0.8, y: 1.5, w: 8.4, h: 0.5,
    fontFace: 'Calibri', fontSize: 14, bold: true, color: '10B981', tracking: 3
  });

  slide1.addText('INTEGRASI ALUR DEMAND TO SUPPLY:\nSALES FORECAST ➔ PO CUSTOMER ➔ MRP', {
    x: 0.8, y: 2.2, w: 8.8, h: 1.8,
    fontFace: 'Calibri', fontSize: 26, bold: true, color: 'FFFFFF', lineSpacing: 34
  });

  slide1.addText('Otomatisasi Perencanaan Bahan Baku & Pengadaan Supplier Berbasis ERP', {
    x: 0.8, y: 4.2, w: 8.4, h: 0.6,
    fontFace: 'Calibri', fontSize: 15, italic: true, color: '94A3B8'
  });

  slide1.addText('Sistem ERP Manufaktur | Agustus 2026', {
    x: 0.8, y: 5.0, w: 8.4, h: 0.4,
    fontFace: 'Calibri', fontSize: 12, bold: true, color: 'CBD5E1'
  });

  // --- SLIDE 2: Executive Summary ---
  const slide2 = pptx.addSlide();
  slide2.background = { color: lightBg };

  // Header
  slide2.addText('RINGKASAN EKSEKUTIF & TUJUAN INTEGRASI', {
    x: 0.8, y: 0.5, w: 8.4, h: 0.5,
    fontFace: 'Calibri', fontSize: 20, bold: true, color: darkNavy
  });

  // Cards
  const cards = [
    { title: '🎯 Zero Stockout', desc: 'Menjamin ketersediaan bahan baku sesuai jadwal produksi tanpa terhambat lead-time vendor.' },
    { title: '💰 Efisiensi Modal Kerja', desc: 'Mencegah penumpukan stok berlebih (Excess Stock) dengan perhitungan Kebutuhan Bersih (Net Requirement).' },
    { title: '⚡ Otomatisasi PR Vendor', desc: 'Mengubah hasil MRP menjadi Purchase Request (PR) otomatis yang terkelompok berdasarkan Supplier.' }
  ];

  cards.forEach((c, idx) => {
    const xPos = 0.8 + idx * 2.9;
    // Card Box
    slide2.addShape(pptx.shapes.RECTANGLE, {
      x: xPos, y: 1.5, w: 2.7, h: 3.5,
      fill: { color: 'FFFFFF' }, line: { color: borderGray, width: 1.5 }
    });
    // Header line inside card
    slide2.addShape(pptx.shapes.RECTANGLE, {
      x: xPos, y: 1.5, w: 2.7, h: 0.1,
      fill: { color: emerald }
    });
    // Card Title
    slide2.addText(c.title, {
      x: xPos + 0.2, y: 1.8, w: 2.3, h: 0.6,
      fontFace: 'Calibri', fontSize: 14, bold: true, color: darkNavy
    });
    // Card Description
    slide2.addText(c.desc, {
      x: xPos + 0.2, y: 2.5, w: 2.3, h: 2.2,
      fontFace: 'Calibri', fontSize: 11, color: '475569', lineSpacing: 18
    });
  });

  // Footer Note
  slide2.addText('*Integrasi sistem menghubungkan Sales, Production Control, Warehouse, dan Procurement dalam satu workflow terpadu.', {
    x: 0.8, y: 5.2, w: 8.4, h: 0.4,
    fontFace: 'Calibri', fontSize: 10, italic: true, color: '64748B'
  });

  // --- SLIDE 3: Visual Workflow Diagram ---
  const slide3 = pptx.addSlide();
  slide3.background = { color: lightBg };

  slide3.addText('END-TO-END WORKFLOW: DEMAND TO PROCUREMENT', {
    x: 0.8, y: 0.5, w: 8.4, h: 0.5,
    fontFace: 'Calibri', fontSize: 20, bold: true, color: darkNavy
  });

  const steps = [
    { num: '01', title: 'Sales Forecast', sub: 'Proyeksi Permintaan (M+1)' },
    { num: '02', title: 'PO Customer', sub: 'Konfirmasi Pesanan Binding' },
    { num: '03', title: 'MRP Engine', sub: 'BOM Explosion & Netting' },
    { num: '04', title: 'Auto Release PR', sub: 'Grouping per Vendor' }
  ];

  steps.forEach((s, idx) => {
    const xPos = 0.8 + idx * 2.2;
    // Step Box
    slide3.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: xPos, y: 2.0, w: 1.9, h: 2.6,
      fill: { color: 'FFFFFF' }, line: { color: emerald, width: 2 }
    });
    // Step Num
    slide3.addText(s.num, {
      x: xPos + 0.1, y: 2.2, w: 1.7, h: 0.5,
      fontFace: 'Calibri', fontSize: 22, bold: true, color: emerald, align: 'center'
    });
    // Step Title
    slide3.addText(s.title, {
      x: xPos + 0.1, y: 2.8, w: 1.7, h: 0.6,
      fontFace: 'Calibri', fontSize: 13, bold: true, color: darkNavy, align: 'center'
    });
    // Step Subtitle
    slide3.addText(s.sub, {
      x: xPos + 0.1, y: 3.5, w: 1.7, h: 0.9,
      fontFace: 'Calibri', fontSize: 10, color: '64748B', align: 'center'
    });

    // Arrow Connector
    if (idx < 3) {
      slide3.addText('➔', {
        x: xPos + 1.85, y: 3.0, w: 0.4, h: 0.4,
        fontFace: 'Calibri', fontSize: 18, color: '94A3B8', align: 'center'
      });
    }
  });

  // --- SLIDE 4: Tahap 1 - Sales Forecast ---
  const slide4 = pptx.addSlide();
  slide4.background = { color: lightBg };

  slide4.addText('TAHAP 1: SALES FORECAST (PERENCANAAN PERMINTAAN)', {
    x: 0.8, y: 0.5, w: 8.4, h: 0.5,
    fontFace: 'Calibri', fontSize: 20, bold: true, color: darkNavy
  });

  slide4.addText('Fungsi Utama:', {
    x: 0.8, y: 1.3, w: 4.0, h: 0.4,
    fontFace: 'Calibri', fontSize: 13, bold: true, color: emerald
  });

  slide4.addText('• Proyeksi perkiraan penjualan per pelanggan untuk periode M+1 dan M+2.\n• Memberikan kepastian jadwal produksi bagi item ber-lead time panjang.\n• Menjadi input acuan awal dalam penyusunan Master Production Schedule (MPP).', {
    x: 0.8, y: 1.7, w: 4.2, h: 3.2,
    fontFace: 'Calibri', fontSize: 11, color: '334155', lineSpacing: 20
  });

  // Sample Table Box
  slide4.addShape(pptx.shapes.RECTANGLE, { x: 5.2, y: 1.3, w: 4.0, h: 3.8, fill: { color: 'FFFFFF' }, line: { color: borderGray } });
  slide4.addText('Contoh Data Forecast (Sep 2026):', { x: 5.4, y: 1.5, w: 3.6, h: 0.4, fontFace: 'Calibri', fontSize: 11, bold: true, color: darkNavy });

  const fcTableData = [
    [{ text: 'Customer', options: { bold: true, fill: '059669', color: 'FFFFFF' } }, { text: 'Item FG', options: { bold: true, fill: '059669', color: 'FFFFFF' } }, { text: 'Qty (Pcs)', options: { bold: true, fill: '059669', color: 'FFFFFF' } }],
    [{ text: 'PT Honda Precision' }, { text: 'Holder Mirror RH' }, { text: '5,000' }],
    [{ text: 'PT Toyota Motor' }, { text: 'Mirror Bracket LH' }, { text: '4,500' }],
    [{ text: 'PT Suzuki Indomobil' }, { text: 'Housing Mirror Out' }, { text: '3,000' }]
  ];
  slide4.addTable(fcTableData, { x: 5.4, y: 2.0, w: 3.6, colW: [1.4, 1.3, 0.9], fontSize: 9, fontFace: 'Calibri' });

  // --- SLIDE 5: Tahap 2 - PO Customer ---
  const slide5 = pptx.addSlide();
  slide5.background = { color: lightBg };

  slide5.addText('TAHAP 2: PO CUSTOMER (PESANAN RESMI BINDING)', {
    x: 0.8, y: 0.5, w: 8.4, h: 0.5,
    fontFace: 'Calibri', fontSize: 20, bold: true, color: darkNavy
  });

  slide5.addText('Fungsi Utama:', {
    x: 0.8, y: 1.3, w: 4.0, h: 0.4,
    fontFace: 'Calibri', fontSize: 13, bold: true, color: emerald
  });

  slide5.addText('• Mengonfirmasi order riil dari pelanggan berdasarkan Surat Pesanan (PO).\n• Mengunci (Lock) komitmen kuantitas dan harga kesepakatan.\n• Menggantikan/menyesuaikan proyeksi forecast agar tidak terjadi double demand.', {
    x: 0.8, y: 1.7, w: 4.2, h: 3.2,
    fontFace: 'Calibri', fontSize: 11, color: '334155', lineSpacing: 20
  });

  // Table Box
  slide5.addShape(pptx.shapes.RECTANGLE, { x: 5.2, y: 1.3, w: 4.0, h: 3.8, fill: { color: 'FFFFFF' }, line: { color: borderGray } });
  slide5.addText('Contoh Data PO Customer Official:', { x: 5.4, y: 1.5, w: 3.6, h: 0.4, fontFace: 'Calibri', fontSize: 11, bold: true, color: darkNavy });

  const poTableData = [
    [{ text: 'No PO Customer', options: { bold: true, fill: '059669', color: 'FFFFFF' } }, { text: 'Item FG', options: { bold: true, fill: '059669', color: 'FFFFFF' } }, { text: 'PO Qty', options: { bold: true, fill: '059669', color: 'FFFFFF' } }],
    [{ text: 'PO-HPM-2026-089' }, { text: 'Holder Mirror RH' }, { text: '6,000' }],
    [{ text: 'PO-TMMIN-2026-104' }, { text: 'Mirror Bracket LH' }, { text: '5,000' }],
    [{ text: 'PO-SIM-2026-055' }, { text: 'Housing Mirror Out' }, { text: '3,000' }]
  ];
  slide5.addTable(poTableData, { x: 5.4, y: 2.0, w: 3.6, colW: [1.4, 1.3, 0.9], fontSize: 9, fontFace: 'Calibri' });

  // --- SLIDE 6: Tahap 3 - BOM Explosion ---
  const slide6 = pptx.addSlide();
  slide6.background = { color: lightBg };

  slide6.addText('TAHAP 3: BILL OF MATERIALS (BOM) & LEDAKAN KOMPONEN', {
    x: 0.8, y: 0.5, w: 8.4, h: 0.5,
    fontFace: 'Calibri', fontSize: 20, bold: true, color: darkNavy
  });

  slide6.addText('Penguraian Kebutuhan Material (BOM Explosion):', {
    x: 0.8, y: 1.3, w: 8.4, h: 0.4,
    fontFace: 'Calibri', fontSize: 13, bold: true, color: emerald
  });

  const bomTableData = [
    [{ text: 'Item FG', options: { bold: true, fill: '059669', color: 'FFFFFF' } }, { text: 'Komponen Material Raw', options: { bold: true, fill: '059669', color: 'FFFFFF' } }, { text: 'Rasio / Pcs', options: { bold: true, fill: '059669', color: 'FFFFFF' } }, { text: 'Supplier Assigned', options: { bold: true, fill: '059669', color: 'FFFFFF' } }],
    [{ text: 'Holder Mirror RH' }, { text: 'Resin PP Block Copolymer' }, { text: '0.120 Kg' }, { text: 'PT Polychem Indonesia' }],
    [{ text: 'Holder Mirror RH' }, { text: 'Masterbatch Black 2%' }, { text: '0.005 Kg' }, { text: 'PT Clariant Masterbatch' }],
    [{ text: 'Holder Mirror RH' }, { text: 'Master Carton Box' }, { text: '0.040 Pcs' }, { text: 'PT Surindo Utama Box' }],
    [{ text: 'Mirror Bracket LH' }, { text: 'Resin ABS Natural High Impact' }, { text: '0.180 Kg' }, { text: 'PT Polychem Indonesia' }]
  ];
  slide6.addTable(bomTableData, { x: 0.8, y: 1.8, w: 8.4, colW: [2.0, 3.2, 1.2, 2.0], fontSize: 10, fontFace: 'Calibri' });

  // --- SLIDE 7: Tahap 4 - MRP Calculation Engine ---
  const slide7 = pptx.addSlide();
  slide7.background = { color: lightBg };

  slide7.addText('TAHAP 4: PERHITUNGAN LOGIKA MRP ENGINE', {
    x: 0.8, y: 0.5, w: 8.4, h: 0.5,
    fontFace: 'Calibri', fontSize: 20, bold: true, color: darkNavy
  });

  // Formula Box
  slide7.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 1.2, w: 8.4, h: 0.8, fill: { color: '065F46' } });
  slide7.addText('RUMUS UTAMA MRP: Net Requirement = Gross Requirement - Available Stock - Safety Stock', {
    x: 0.8, y: 1.2, w: 8.4, h: 0.8,
    fontFace: 'Calibri', fontSize: 13, bold: true, color: 'FFFFFF', align: 'center'
  });

  const mrpTableData = [
    [{ text: 'Material Item', options: { bold: true, fill: '059669', color: 'FFFFFF' } }, { text: 'Gross Req.', options: { bold: true, fill: '059669', color: 'FFFFFF' } }, { text: 'On-Hand Stock', options: { bold: true, fill: '059669', color: 'FFFFFF' } }, { text: 'Net Requirement PR', options: { bold: true, fill: '059669', color: 'FFFFFF' } }, { text: 'Supplier Assigned', options: { bold: true, fill: '059669', color: 'FFFFFF' } }],
    [{ text: 'Resin PP Block Black' }, { text: '1,470.0 Kg' }, { text: '350.0 Kg' }, { text: '1,120.0 Kg' }, { text: 'PT Polychem Indonesia' }],
    [{ text: 'Resin ABS Natural' }, { text: '900.0 Kg' }, { text: '150.0 Kg' }, { text: '750.0 Kg' }, { text: 'PT Polychem Indonesia' }],
    [{ text: 'Masterbatch Black 2%' }, { text: '60.0 Kg' }, { text: '13.0 Kg' }, { text: '47.0 Kg' }, { text: 'PT Clariant Masterbatch' }],
    [{ text: 'Master Carton Box' }, { text: '240.0 Pcs' }, { text: '50.0 Pcs' }, { text: '190.0 Pcs' }, { text: 'PT Surindo Utama Box' }]
  ];
  slide7.addTable(mrpTableData, { x: 0.8, y: 2.2, w: 8.4, colW: [2.5, 1.4, 1.4, 1.6, 1.5], fontSize: 10, fontFace: 'Calibri' });

  // --- SLIDE 8: Tahap 5 - Auto Release PR per Vendor ---
  const slide8 = pptx.addSlide();
  slide8.background = { color: lightBg };

  slide8.addText('TAHAP 5: AUTO RELEASE TO PURCHASE REQUEST (PR)', {
    x: 0.8, y: 0.5, w: 8.4, h: 0.5,
    fontFace: 'Calibri', fontSize: 20, bold: true, color: darkNavy
  });

  slide8.addText('Pengelompokan Otomatis PR per Vendor Supplier:', {
    x: 0.8, y: 1.2, w: 8.4, h: 0.4,
    fontFace: 'Calibri', fontSize: 13, bold: true, color: emerald
  });

  const prVendorData = [
    [{ text: 'No PR Rilis', options: { bold: true, fill: '059669', color: 'FFFFFF' } }, { text: 'Vendor Supplier', options: { bold: true, fill: '059669', color: 'FFFFFF' } }, { text: 'Item Material Dalam PR', options: { bold: true, fill: '059669', color: 'FFFFFF' } }, { text: 'Total Qty PR', options: { bold: true, fill: '059669', color: 'FFFFFF' } }, { text: 'Estimasi Nilai PR (Rp)', options: { bold: true, fill: '059669', color: 'FFFFFF' } }],
    [{ text: 'PR-VND-2026-001' }, { text: 'PT Polychem Indonesia' }, { text: 'Resin PP Black + Resin ABS Natural' }, { text: '1,870 Kg' }, { text: 'Rp 56,860,000' }],
    [{ text: 'PR-VND-2026-002' }, { text: 'PT Clariant Masterbatch' }, { text: 'Masterbatch Black Premium 2%' }, { text: '47 Kg' }, { text: 'Rp 3,995,000' }],
    [{ text: 'PR-VND-2026-003' }, { text: 'PT Surindo Utama Box' }, { text: 'Master Carton Box Holder Mirror' }, { text: '190 Pcs' }, { text: 'Rp 2,375,000' }]
  ];
  slide8.addTable(prVendorData, { x: 0.8, y: 1.7, w: 8.4, colW: [1.6, 2.2, 2.6, 1.0, 1.0], fontSize: 9.5, fontFace: 'Calibri' });

  // --- SLIDE 9: Business Benefits & Impact ---
  const slide9 = pptx.addSlide();
  slide9.background = { color: lightBg };

  slide9.addText('MANFAAT BISNIS & IMPACT IMPLEMENTASI', {
    x: 0.8, y: 0.5, w: 8.4, h: 0.5,
    fontFace: 'Calibri', fontSize: 20, bold: true, color: darkNavy
  });

  const impacts = [
    { title: '⚡ Waktu Operasional', stat: '85%', note: 'Lebih Cepat', desc: 'Pemrosesan dari Planning hingga terbit PR Supplier berkurang dari 3 hari menjadi 15 menit.' },
    { title: '🎯 Akurasi Pembelian', stat: '99.8%', note: 'Tepat Pesan', desc: 'Tidak ada lagi kesalahan pembelian ukuran atau jenis resin akibat perbedaan spesifikasi BOM.' },
    { title: '💰 Efisiensi Stok', stat: '-30%', note: 'Holding Cost', desc: 'Pengurangan stok idle/berlebih di gudang sehingga arus kas (Cashflow) lebih sehat.' }
  ];

  impacts.forEach((imp, idx) => {
    const xPos = 0.8 + idx * 2.9;
    slide9.addShape(pptx.shapes.RECTANGLE, { x: xPos, y: 1.5, w: 2.7, h: 3.5, fill: { color: 'FFFFFF' }, line: { color: borderGray } });
    slide9.addText(imp.title, { x: xPos + 0.1, y: 1.7, w: 2.5, h: 0.4, fontFace: 'Calibri', fontSize: 12, bold: true, color: darkNavy, align: 'center' });
    slide9.addText(imp.stat, { x: xPos + 0.1, y: 2.2, w: 2.5, h: 0.8, fontFace: 'Calibri', fontSize: 32, bold: true, color: emerald, align: 'center' });
    slide9.addText(imp.note, { x: xPos + 0.1, y: 3.0, w: 2.5, h: 0.3, fontFace: 'Calibri', fontSize: 11, bold: true, color: '64748B', align: 'center' });
    slide9.addText(imp.desc, { x: xPos + 0.2, y: 3.4, w: 2.3, h: 1.4, fontFace: 'Calibri', fontSize: 10, color: '475569', align: 'center', lineSpacing: 15 });
  });

  // --- SLIDE 10: Closing & Q&A ---
  const slide10 = pptx.addSlide();
  slide10.background = { color: darkNavy };

  slide10.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.2, fill: { color: emerald } });

  slide10.addText('TERIMA KASIH', {
    x: 0.8, y: 2.0, w: 8.4, h: 0.8,
    fontFace: 'Calibri', fontSize: 36, bold: true, color: 'FFFFFF', align: 'center'
  });

  slide10.addText('Sesi Tanya Jawab & Demo Fitur Live ERP', {
    x: 0.8, y: 3.0, w: 8.4, h: 0.5,
    fontFace: 'Calibri', fontSize: 16, italic: true, color: '10B981', align: 'center'
  });

  slide10.addText('PT Eran Plastindo Utama\nSistem ERP Manufaktur & Budgeting', {
    x: 0.8, y: 4.2, w: 8.4, h: 0.8,
    fontFace: 'Calibri', fontSize: 12, color: '94A3B8', align: 'center', lineSpacing: 20
  });

  // Save Presentation
  await pptx.writeFile({ fileName: pptxArtifactPath });
  await pptx.writeFile({ fileName: pptxPublicPath });
  console.log('✅ PowerPoint file successfully created at:', pptxArtifactPath);
}

async function main() {
  await generateExcel();
  await generatePPTX();
  console.log('🚀 ALL PRESENTATION FILES GENERATED SUCCESSFULLY!');
}

main().catch(console.error);
