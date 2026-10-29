const xlsx = require('xlsx');
const db = require('../src/config/db');

const filePath = 'c:/laragon/www/erp-epu-main/08. Master Data Karyawan PT EPU 2026 - Agustus.xlsx';

function excelDateToSqlDate(serial) {
  if (!serial) return null;
  if (typeof serial === 'string') {
    const trimmed = serial.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parts = trimmed.split(/[/.-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return null;
  }
  if (typeof serial === 'number') {
    if (serial <= 0) return null;
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    if (isNaN(dateInfo.getTime())) return null;
    const year = dateInfo.getFullYear();
    const month = String(dateInfo.getMonth() + 1).padStart(2, '0');
    const day = String(dateInfo.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return null;
}

function cleanString(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

async function importKaryawan() {
  console.log('Reading Excel file...');
  const wb = xlsx.readFile(filePath);
  const sheet = wb.Sheets['MP EPU - AUG 26'];
  if (!sheet) {
    throw new Error('Sheet "MP EPU - AUG 26" not found in ' + filePath);
  }

  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`Total rows in sheet: ${rows.length}`);

  const employees = [];
  for (let i = 7; i < rows.length; i++) {
    const r = rows[i];
    const no = cleanString(r[1]);
    const rawNik = cleanString(r[2]);
    const nama = cleanString(r[4]);

    if (!rawNik && !nama) continue;

    // If NIK is blank, use EPU-NO-XXXX
    const nik = rawNik || (no ? `EPU-NO-${String(no).padStart(4, '0')}` : `EPU-ROW-${i + 1}`);
    const statusKerja = cleanString(r[3]) || 'Aktif';
    const isActive = statusKerja.toLowerCase().includes('non') ? 0 : 1;

    employees.push({
      nik: nik,
      full_name: nama,
      status_kerja: statusKerja,
      status_kontrak: cleanString(r[5]) || 'Kontrak',
      jabatan: cleanString(r[6]),
      department: cleanString(r[7]),
      section: cleanString(r[8]),
      bagian: cleanString(r[9]),
      no_ktp: cleanString(r[10]),
      tempat_lahir: cleanString(r[11]),
      tanggal_lahir: excelDateToSqlDate(r[12]),
      jenis_kelamin: cleanString(r[13]),
      nama_ibu: cleanString(r[14]),
      alamat: cleanString(r[15]),
      tanggal_bergabung: excelDateToSqlDate(r[16]),
      phone: cleanString(r[17]),
      no_rek_mandiri: cleanString(r[18]),
      npwp: cleanString(r[19]),
      email: cleanString(r[20]),
      no_kpj: cleanString(r[21]),
      no_jkn: cleanString(r[22]),
      lokasi_faskes: cleanString(r[23]),
      tanggal_resign: excelDateToSqlDate(r[24]),
      tipe_resign: cleanString(r[25]),
      status_resign: cleanString(r[26]),
      pendidikan: cleanString(r[27]),
      no_fingerprint: cleanString(r[28]),
      kontak_darurat_nama: cleanString(r[29]),
      kontak_darurat_hubungan: cleanString(r[30]),
      kontak_darurat_telp: cleanString(r[31]),
      notes: cleanString(r[34]),
      is_active: isActive
    });
  }

  console.log(`Found ${employees.length} employees to import.`);

  // Truncate to ensure clean import
  await db.query('TRUNCATE TABLE employees');

  let inserted = 0;
  for (const emp of employees) {
    await db.query('INSERT INTO employees SET ?', [emp]);
    inserted++;
  }

  console.log(`\nImport Summary:`);
  console.log(`- Inserted: ${inserted}`);

  const [countRows] = await db.query('SELECT COUNT(*) as total, SUM(is_active) as active FROM employees');
  console.log(`Verification from DB: Total = ${countRows[0].total}, Active = ${countRows[0].active}`);

  process.exit(0);
}

importKaryawan().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
