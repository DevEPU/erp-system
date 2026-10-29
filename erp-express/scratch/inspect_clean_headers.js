const xlsx = require('xlsx');

const workbook = xlsx.readFile('c:/laragon/www/erp-epu-main/Schedule_Delivery_Template_Clean.xlsx');
const ws = workbook.Sheets['GINSA'];
const rawData = xlsx.utils.sheet_to_json(ws, { header: 1 });

const headerRowIdx = rawData.findIndex(row => row && row.includes && (row.includes('Name Part') || row.includes('Part name')));
if (headerRowIdx !== -1) {
    const headers = rawData[headerRowIdx];
    console.log("=== Headers in Clean Template ===");
    headers.forEach((val, idx) => {
        console.log(`Col ${idx}: val=${val}, type=${typeof val}`);
    });
} else {
    console.log("Header row not found!");
}
