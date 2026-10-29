const xlsx = require('xlsx');

function inspectAllSheets() {
    const filePath = 'c:/laragon/www/erp-epu-main/MD BOM.xlsx';
    console.log("Reading file:", filePath);
    const workbook = xlsx.readFile(filePath);
    console.log("Sheet Names:", workbook.SheetNames);

    for (const sName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sName];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`\n--- Sheet: "${sName}" (Rows: ${data.length}) ---`);
        for (let i = 0; i < Math.min(10, data.length); i++) {
            console.log(`Row ${i}:`, data[i]);
        }
    }
}

inspectAllSheets();
