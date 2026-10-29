const xlsx = require('xlsx');

function inspectColumnsLS() {
    const filePath = 'c:/laragon/www/erp-epu-main/MD BOM.xlsx';
    console.log("Reading file:", filePath);
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    const headers = rawData[1];
    console.log("\n--- HEADERS IN MD BOM.xlsx (Row 1) ---");
    headers.forEach((h, idx) => {
        const colLetter = String.fromCharCode(65 + idx);
        console.log(`Column ${colLetter} (index ${idx}): "${h}"`);
    });

    console.log("\n--- SAMPLE ROWS FOR COLUMNS L AND S ---");
    for (let i = 2; i < Math.min(20, rawData.length); i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;

        const fgCode = row[3] || '';
        const c2Code = row[6] || '';
        const c2Qty = row[8];
        const colL = row[11]; // Column L (Need / Qty total calculation)

        const c3Code = row[13] || '';
        const c3Qty = row[15];
        const colS = row[18]; // Column S (Need / Qty total calculation)

        console.log(`Row ${i} | FG: ${fgCode} | L2: ${c2Code} (Qty: ${c2Qty}) | Col L: ${colL} | L3: ${c3Code} (Qty: ${c3Qty}) | Col S: ${colS}`);
    }
}

inspectColumnsLS();
