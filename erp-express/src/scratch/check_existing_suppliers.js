const db = require('../config/db');
const XLSX = require('xlsx');

async function match() {
    try {
        // 1. Load Excel vendors
        const filePath = "C:\\laragon\\www\\erp-epu-main\\06. Jun MD Vendor 1.xlsx";
        const workbook = XLSX.readFile(filePath);
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        
        const excelVendors = new Set();
        data.forEach(row => {
            const vendor = row['__EMPTY_5'];
            if (vendor && vendor !== 'Vendor' && vendor !== 'VENDOR') {
                excelVendors.add(vendor.trim());
            }
        });
        const excelList = Array.from(excelVendors);

        // 2. Load DB suppliers
        const [dbRows] = await db.query('SELECT id, supplier_code, supplier_name FROM suppliers');
        const dbNames = dbRows.map(r => r.supplier_name.trim().toLowerCase());
        const dbNameMap = new Map(dbRows.map(r => [r.supplier_name.trim().toLowerCase(), r]));

        const existing = [];
        const missing = [];

        excelList.forEach(v => {
            const cleanV = v.toLowerCase();
            if (dbNameMap.has(cleanV)) {
                existing.push({ excel: v, db: dbNameMap.get(cleanV) });
            } else {
                missing.push(v);
            }
        });

        console.log('--- Matching Summary ---');
        console.log('Total Unique Excel Vendors:', excelList.length);
        console.log('Already Existing in DB:', existing.length);
        console.log('Missing (Need to Import):', missing.length);
        
        console.log('\n--- Sample of Existing in DB ---');
        existing.slice(0, 5).forEach(e => {
            console.log(`- Excel: "${e.excel}" matches DB: [${e.db.supplier_code}] "${e.db.supplier_name}"`);
        });

        console.log('\n--- Complete List of Missing Vendors ---');
        missing.forEach((m, idx) => {
            console.log(`${idx + 1}. "${m}"`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

match();
