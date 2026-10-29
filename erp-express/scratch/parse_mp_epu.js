const xlsx = require('xlsx');

const filePath = 'c:/laragon/www/erp-epu-main/08. Master Data Karyawan PT EPU 2026 - Agustus.xlsx';
const wb = xlsx.readFile(filePath);
const sheet = wb.Sheets['MP EPU - AUG 26'];

const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

// Row index 6 (0-indexed) is row 7 (headers)
const headerRow = rows[6];
console.log('Header Row (Row 7):');
headerRow.forEach((h, idx) => {
  if (h) console.log(`Col ${idx}: ${h}`);
});

console.log('\nScanning employee rows starting from Row 8 (index 7)...');

// Helper to convert Excel serial date to YYYY-MM-DD
function excelDateToDateString(serial) {
  if (!serial) return '';
  if (typeof serial === 'string') return serial.trim();
  if (typeof serial === 'number') {
    // Excel base date: Dec 30 1899
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    const year = dateInfo.getFullYear();
    const month = String(dateInfo.getMonth() + 1).padStart(2, '0');
    const day = String(dateInfo.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return '';
}

const employees = [];
for (let i = 7; i < rows.length; i++) {
  const r = rows[i];
  const no = r[1];
  const nik = r[2] ? String(r[2]).trim() : '';
  const nama = r[4] ? String(r[4]).trim() : '';

  // If no NIK and no Nama, skip
  if (!nik && !nama) continue;

  const emp = {
    excelRow: i + 1,
    no: no,
    nik: nik,
    statusKerja: r[3] ? String(r[3]).trim() : 'Aktif',
    nama: nama,
    statusKontrak: r[5] ? String(r[5]).trim() : '', // Kontrak / PKWTT
    jabatan: r[6] ? String(r[6]).trim() : '',
    departemen: r[7] ? String(r[7]).trim() : '',
    section: r[8] ? String(r[8]).trim() : '',
    bagian: r[9] ? String(r[9]).trim() : '',
    noKtp: r[10] ? String(r[10]).trim() : '',
    tempatLahir: r[11] ? String(r[11]).trim() : '',
    tanggalLahir: excelDateToDateString(r[12]),
    jenisKelamin: r[13] ? String(r[13]).trim() : '',
    namaIbu: r[14] ? String(r[14]).trim() : '',
    alamat: r[15] ? String(r[15]).trim() : '',
    tanggalBergabung: excelDateToDateString(r[16]),
    noHp: r[17] ? String(r[17]).trim() : '',
    noRekMandiri: r[18] ? String(r[18]).trim() : '',
    npwp: r[19] ? String(r[19]).trim() : '',
    email: r[20] ? String(r[20]).trim() : '',
    noKpj: r[21] ? String(r[21]).trim() : '',
    noJkn: r[22] ? String(r[22]).trim() : '',
    lokasiFaskes: r[23] ? String(r[23]).trim() : '',
    tanggalResign: excelDateToDateString(r[24]),
    tipeResign: r[25] ? String(r[25]).trim() : '',
    statusResign: r[26] ? String(r[26]).trim() : '',
    pendidikan: r[27] ? String(r[27]).trim() : '',
    noFingerprint: r[28] ? String(r[28]).trim() : '',
    kontakDaruratNama: r[29] ? String(r[29]).trim() : '',
    kontakDaruratHubungan: r[30] ? String(r[30]).trim() : '',
    kontakDaruratTelp: r[31] ? String(r[31]).trim() : '',
    notes: r[34] ? String(r[34]).trim() : ''
  };

  employees.push(emp);
}

console.log(`Total valid employees parsed: ${employees.length}`);
console.log('Status Kerja distribution:');
const statusCounts = {};
employees.forEach(e => {
  statusCounts[e.statusKerja] = (statusCounts[e.statusKerja] || 0) + 1;
});
console.log(statusCounts);

console.log('Departemen distribution:');
const deptCounts = {};
employees.forEach(e => {
  deptCounts[e.departemen] = (deptCounts[e.departemen] || 0) + 1;
});
console.log(deptCounts);

console.log('Sample 3 employees:');
console.log(JSON.stringify(employees.slice(0, 3), null, 2));
