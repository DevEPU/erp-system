const xlsx = require('xlsx');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: 'budgeting'
    });

    const [dbProducts] = await connection.query('SELECT id, product_code, product_name FROM products');
    const [dbSuppliers] = await connection.query('SELECT id, supplier_code, supplier_name FROM suppliers');

    const cleanStr = (s) => String(s || '').replace(/[\.\s\(\)-]/g, '').toUpperCase();
    const cleanPartName = (name) => String(name || '').replace(/\s*\([^)]+\)\s*$/, '').trim().toUpperCase();

    const findProduct = (partName) => {
        const clean = cleanPartName(partName);
        let p = dbProducts.find(prod => cleanPartName(prod.product_name) === clean);
        if (!p) {
            p = dbProducts.find(prod => prod.product_code.toUpperCase() === partName.toUpperCase());
        }
        return p;
    };

    console.log("=== CHECKING UNMATCHED PARTS IN SCHEDULE DELIVERY EXCEL ===");
    const workbook = xlsx.readFile('c:/laragon/www/erp-epu-main/Schedule Delivery Agustus 2026.xlsx');
    const validSheets = ['GINSA', 'TATA, GRAF', 'FSCM', 'HYMAN', 'SASA', 'MATERIAL'];

    for (const sheetName of validSheets) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;
        const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        const headerRowIdx = rawData.findIndex(row => row && row.includes && (row.includes('Name Part') || row.includes('Part name')));
        if (headerRowIdx === -1) {
            console.log(`[${sheetName}] Header row not found`);
            continue;
        }

        const headers = rawData[headerRowIdx];
        const namePartIdx = headers.indexOf('Name Part') !== -1 ? headers.indexOf('Name Part') : headers.indexOf('Part name');

        console.log(`\nSheet: ${sheetName}`);
        let unmatchedCount = 0;
        let matchedCount = 0;

        for (let r = headerRowIdx + 1; r < rawData.length; r++) {
            const row = rawData[r];
            if (!row || row.length === 0) continue;

            const partName = row[namePartIdx] ? String(row[namePartIdx]).trim() : '';
            const rowLabel = row[7] ? String(row[7]).trim() : '';

            if (partName && (rowLabel === 'Schedule' || !rowLabel)) {
                const product = findProduct(partName);
                if (!product) {
                    console.log(`  - UNMATCHED: "${partName}"`);
                    unmatchedCount++;
                } else {
                    matchedCount++;
                }
                r += 2; // skip Act In & Dev rows
            }
        }
        console.log(`  Summary: Matched=${matchedCount}, Unmatched=${unmatchedCount}`);
    }

    await connection.end();
    process.exit(0);
})();
