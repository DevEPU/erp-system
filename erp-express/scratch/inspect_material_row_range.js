const xlsx = require('xlsx');

const workbook = xlsx.readFile('c:/laragon/www/erp-epu-main/Schedule Delivery Agustus 2026.xlsx');
const sheet = workbook.Sheets['MATERIAL'];
const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log("=== Rows 20 to 36 ===");
for (let r = 20; r <= 36; r++) {
    console.log(`Row ${r}:`, JSON.stringify(rawData[r]));
}
