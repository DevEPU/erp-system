const xlsx = require('xlsx');

function analyzeMdBomExcel() {
    const filePath = 'c:/laragon/www/erp-epu-main/MD BOM.xlsx';
    console.log("Analyzing file:", filePath);
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    const totalRows = rawData.length;
    const headerRow = rawData[1];

    const fgSet = new Set();
    const l2Set = new Set();
    const l3Set = new Set();
    const l4Set = new Set();
    const customerSet = new Set();

    for (let i = 2; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;

        if (row[1]) customerSet.add(row[1]); // Customer
        if (row[3]) fgSet.add(row[3]); // Component (FG Code)
        if (row[6]) l2Set.add(row[6]); // Component2
        if (row[13]) l3Set.add(row[13]); // Component3
        if (row[20]) l4Set.add(row[20]); // Component 4
    }

    console.log("\n=== HIGH LEVEL METRICS ===");
    console.log(`Sheet Name: ${workbook.SheetNames[0]}`);
    console.log(`Total Data Rows: ${totalRows - 2}`);
    console.log(`Total Unique Customers: ${customerSet.size} (${Array.from(customerSet).join(', ')})`);
    console.log(`Total Unique Finished Goods (BOMs): ${fgSet.size}`);
    console.log(`Total Unique Layer 2 Components: ${l2Set.size}`);
    console.log(`Total Unique Layer 3 Sub-components: ${l3Set.size}`);
    console.log(`Total Unique Layer 4 Raw Materials: ${l4Set.size}`);

    console.log("\n=== COLUMN SCHEMA ===");
    headerRow.forEach((h, idx) => {
        const colLetter = String.fromCharCode(65 + idx);
        console.log(`Column ${colLetter} (index ${idx}): "${h}"`);
    });
}

analyzeMdBomExcel();
