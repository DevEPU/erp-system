const db = require('../config/db');
const xlsx = require('xlsx');
const path = require('path');

(async () => {
    try {
        const filePath = path.join('c:', 'laragon', 'www', 'erp-epu-main', 'Customer & Part FG.xlsx');
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet);

        let matches = 0;
        let missing = [];
        for (const row of rows) {
            const compCode = row['Component'] ? String(row['Component']).trim() : '';
            if (!compCode) continue;

            const [pRows] = await db.query('SELECT id, product_name, product_code FROM products WHERE product_code = ?', [compCode]);
            if (pRows.length > 0) {
                matches++;
            } else {
                missing.push(compCode);
            }
        }
        console.log('Total Excel rows:', rows.length);
        console.log('Matched in products table:', matches);
        console.log('Missing component codes count:', missing.length);
        console.log('Missing component codes:', missing.slice(0, 10));

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();
