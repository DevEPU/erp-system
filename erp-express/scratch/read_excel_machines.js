const xlsx = require('xlsx');

const workbook = xlsx.readFile('c:/laragon/www/erp-epu-main/Dataset/Production Planning Ach Rate Control Agustus 2026 Rev01.xlsx');
console.log('Sheet Names:', workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n--- Sheet: ${sheetName} (Rows: ${data.length}) ---`);
  // Print first 15 rows
  for (let i = 0; i < Math.min(15, data.length); i++) {
    if (data[i] && data[i].length > 0) {
      console.log(`Row ${i}:`, JSON.stringify(data[i].slice(0, 10)));
    }
  }
}
