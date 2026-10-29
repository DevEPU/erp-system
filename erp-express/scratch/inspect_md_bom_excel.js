const xlsx = require('xlsx');

function inspectMDBOM() {
    const filePath = 'c:/laragon/www/erp-epu-main/MD BOM.xlsx';
    console.log("Reading file:", filePath);
    const workbook = xlsx.readFile(filePath);
    console.log("Sheet names:", workbook.SheetNames);

    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`\n--- Sheet: ${sheetName} (Rows: ${data.length}) ---`);
        for (let i = 0; i < Math.min(25, data.length); i++) {
            console.log(`Row ${i}:`, data[i]);
        }
    }
}

inspectMDBOM();
