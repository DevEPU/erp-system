const xlsx = require('xlsx');
const filePath = 'c:/laragon/www/erp-epu-main/08. Master Data Karyawan PT EPU 2026 - Agustus.xlsx';
const wb = xlsx.readFile(filePath);

console.log('Available Sheets:', wb.SheetNames);
const targetSheetName = wb.SheetNames.find(s => s.trim().toLowerCase() === 'mp epu - aug 26'.toLowerCase()) || 'MP EPU - AUG 26';
console.log('Target Sheet Name:', targetSheetName);

const sheet = wb.Sheets[targetSheetName];
if (!sheet) {
  console.log('Sheet not found! Please check sheet names.');
  process.exit(1);
}

const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
console.log('Total Rows:', rows.length);

for (let i = 0; i < Math.min(25, rows.length); i++) {
  if (rows[i].some(c => c !== '')) {
    console.log(`Row ${i + 1}:`, JSON.stringify(rows[i]));
  }
}
