const xlsx = require('xlsx');

const workbook = xlsx.readFile('c:/laragon/www/erp-epu-main/Schedule_Delivery_Template_Clean.xlsx');
const ws = workbook.Sheets['GINSA'];
const rawData = xlsx.utils.sheet_to_json(ws, { header: 1 });

const headerRowIdx = rawData.findIndex(row => row && row.includes && (row.includes('Name Part') || row.includes('Part name')));
if (headerRowIdx !== -1) {
    console.log("=== Row Samples ===");
    for (let r = headerRowIdx + 1; r < headerRowIdx + 10; r++) {
        console.log(`Row ${r}:`, JSON.stringify(rawData[r]));
    }
} else {
    console.log("Header row not found!");
}
