const xlsx = require('xlsx');
const path = require('path');

const filePath = 'c:/laragon/www/erp-epu-main/08. Master Data Karyawan PT EPU 2026 - Agustus.xlsx';
const wb = xlsx.readFile(filePath);

console.log('Sheet Names:', wb.SheetNames);

wb.SheetNames.forEach(name => {
  const sheet = wb.Sheets[name];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`\n==================================================`);
  console.log(`Sheet: "${name}" (Total Rows: ${rows.length})`);
  console.log(`==================================================`);
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    // Only show non-empty rows or partial
    if (rows[i].some(cell => cell !== '')) {
      console.log(`Row ${i + 1}:`, rows[i].slice(0, 15));
    }
  }
});
