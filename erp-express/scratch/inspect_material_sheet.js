const xlsx = require('xlsx');

const workbook = xlsx.readFile('c:/laragon/www/erp-epu-main/Schedule Delivery Agustus 2026.xlsx');
const sheet = workbook.Sheets['MATERIAL'];
const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

const headerRowIdx = rawData.findIndex(row => row && row.includes && (row.includes('Name Part') || row.includes('Part name')));
console.log("Header Row Index:", headerRowIdx);

const headers = rawData[headerRowIdx];
const namePartIdx = headers.indexOf('Name Part') !== -1 ? headers.indexOf('Name Part') : headers.indexOf('Part name');

console.log("=== Rows in MATERIAL sheet ===");
for (let r = headerRowIdx + 1; r < rawData.length; r++) {
    const row = rawData[r];
    if (!row || row.length === 0) continue;

    const partName = row[namePartIdx] ? String(row[namePartIdx]).trim() : '';
    const rowLabel = row[7] ? String(row[7]).trim() : '';

    if (partName) {
        console.log(`Row ${r}: label="${rowLabel}" | partName="${partName}"`);
        // If it's a schedule row, skip 2
        if (rowLabel === 'Schedule' || !rowLabel) {
            r += 2;
        }
    }
}
