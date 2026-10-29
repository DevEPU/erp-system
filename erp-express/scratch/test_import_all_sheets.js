const xlsx = require('xlsx');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
    try {
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

        const findSupplier = (name) => {
            const cName = cleanStr(name);
            return dbSuppliers.find(s => {
                const cs = cleanStr(s.supplier_name);
                return cs.includes(cName) || cName.includes(cs);
            });
        };

        const findProduct = (partName) => {
            const clean = cleanPartName(partName);
            let p = dbProducts.find(prod => cleanPartName(prod.product_name) === clean);
            if (!p) {
                p = dbProducts.find(prod => prod.product_code.toUpperCase() === partName.toUpperCase());
            }
            return p;
        };

        const excelSerialToDateStr = (serial) => {
            if (typeof serial !== 'number') return String(serial);
            const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
            const Y = date.getUTCFullYear();
            const M = String(date.getUTCMonth() + 1).padStart(2, '0');
            const D = String(date.getUTCDate()).padStart(2, '0');
            return `${Y}-${M}-${D}`;
        };

        console.log("=== SIMULATING IMPORT ALL SHEETS ===");
        const workbook = xlsx.readFile('c:/laragon/www/erp-epu-main/Schedule Delivery Agustus 2026.xlsx');
        
        // Dynamically get sheets except LIST
        const validSheets = workbook.SheetNames.filter(name => name.toUpperCase() !== 'LIST');
        console.log("Valid Sheets discovered in Excel:", validSheets);

        let totalMatched = 0;
        let totalUnmatched = 0;

        for (const sheetName of validSheets) {
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) continue;
            const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

            // 1. Initial Supplier detection
            let vendorName = '';
            for (let r = 0; r < 5; r++) {
                if (rawData[r]) {
                    const found = rawData[r].find(val => val && typeof val === 'string' && (val.includes('PT') || val.includes('Silverplas')));
                    if (found) {
                        vendorName = found.trim();
                        break;
                    }
                }
            }
            if (!vendorName) vendorName = sheetName;

            let currentSupplier = findSupplier(vendorName);
            let matchedCount = 0;
            let unmatchedCount = 0;

            const headerRowIdx = rawData.findIndex(row => row && row.includes && (row.includes('Name Part') || row.includes('Part name')));
            if (headerRowIdx === -1) {
                console.log(`[${sheetName}] Header row not found`);
                continue;
            }

            const headers = rawData[headerRowIdx];
            const namePartIdx = headers.indexOf('Name Part') !== -1 ? headers.indexOf('Name Part') : headers.indexOf('Part name');

            for (let r = headerRowIdx + 1; r < rawData.length; r++) {
                const row = rawData[r];
                if (!row || row.length === 0) continue;

                const partName = row[namePartIdx] ? String(row[namePartIdx]).trim() : '';

                if (partName) {
                    const isProductRow = rawData[r + 1] && rawData[r + 1][7] && String(rawData[r + 1][7]).trim() === 'Act In';

                    if (isProductRow) {
                        const product = findProduct(partName);
                        if (!product) {
                            unmatchedCount++;
                        } else {
                            matchedCount++;
                        }
                        r += 2;
                    } else {
                        const matchedSupplier = findSupplier(partName);
                        if (matchedSupplier) {
                            currentSupplier = matchedSupplier;
                        }
                    }
                }
            }
            console.log(`Sheet: ${sheetName} (Supplier: ${currentSupplier ? currentSupplier.supplier_name : 'NOT FOUND'}) - Matched: ${matchedCount}, Unmatched: ${unmatchedCount}`);
            totalMatched += matchedCount;
            totalUnmatched += unmatchedCount;
        }

        console.log(`\n=== GRAND TOTAL: Matched=${totalMatched}, Unmatched=${totalUnmatched} ===`);
        await connection.end();
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
