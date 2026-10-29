const db = require('../src/config/db');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

(async () => {
    try {
        console.log("=== STARTING VERIFICATION FOR SCHEDULE DELIVERY SYSTEM ===");

        // 1. Check if table exists
        const [showTables] = await db.query("SHOW TABLES LIKE 'vendor_daily_schedules'");
        if (showTables.length === 0) {
            throw new Error("Table vendor_daily_schedules does not exist!");
        }
        console.log("✔ Database table exists.");

        // 2. Perform Excel parse & DB import simulation
        const filePath = 'c:/laragon/www/erp-epu-main/Schedule Delivery Agustus 2026.xlsx';
        if (!fs.existsSync(filePath)) {
            throw new Error(`File ${filePath} does not exist for import simulation!`);
        }

        console.log("Simulating Excel import...");
        const workbook = xlsx.readFile(filePath);
        const validSheets = ['GINSA', 'TATA, GRAF', 'FSCM', 'HYMAN', 'SASA', 'MATERIAL'];

        const [dbSuppliers] = await db.query('SELECT id, supplier_name FROM suppliers');
        const [dbProducts] = await db.query('SELECT id, product_code, product_name FROM products');

        const cleanStr = (s) => String(s || '').replace(/[\.\s\(\)-]/g, '').toUpperCase();
        const findSupplier = (name) => {
            const cName = cleanStr(name);
            return dbSuppliers.find(s => {
                const cs = cleanStr(s.supplier_name);
                return cs.includes(cName) || cName.includes(cs);
            });
        };

        const cleanPartName = (name) => {
            return String(name || '').replace(/\s*\([^)]+\)\s*$/, '').trim().toUpperCase();
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

        let importCount = 0;

        for (const sheetName of validSheets) {
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) continue;
            const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

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

            const supplier = findSupplier(vendorName);
            if (!supplier) continue;

            const headerRowIdx = rawData.findIndex(row => row && row.includes && (row.includes('Name Part') || row.includes('Part name')));
            if (headerRowIdx === -1) continue;

            const headers = rawData[headerRowIdx];
            const namePartIdx = headers.indexOf('Name Part');
            const po2Idx = headers.indexOf('PO-2');
            const po1Idx = headers.indexOf('PO-1');

            const dateCols = [];
            for (let c = 0; c < headers.length; c++) {
                const val = headers[c];
                if (typeof val === 'number' && val > 40000) {
                    dateCols.push({
                        colIdx: c,
                        dateStr: excelSerialToDateStr(val)
                    });
                }
            }

            for (let r = headerRowIdx + 1; r < rawData.length; r++) {
                const row = rawData[r];
                if (!row || row.length === 0) continue;

                const partName = row[namePartIdx] ? String(row[namePartIdx]).trim() : '';
                const rowLabel = row[7] ? String(row[7]).trim() : '';

                if (partName && (rowLabel === 'Schedule' || !rowLabel)) {
                    const product = findProduct(partName);
                    if (!product) {
                        r += 2;
                        continue;
                    }

                    const rowSched = rawData[r] || [];
                    const po2Val = Number(rowSched[po2Idx]) || 0;
                    const po1Val = Number(rowSched[po1Idx]) || 0;

                    for (const dCol of dateCols) {
                        const schedVal = Number(rowSched[dCol.colIdx]) || 0;

                        await db.query(`
                            INSERT INTO vendor_daily_schedules 
                              (supplier_id, product_id, po_qty_1, po_qty_2, schedule_date, schedule_qty, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, NOW())
                            ON DUPLICATE KEY UPDATE
                              po_qty_1 = VALUES(po_qty_1),
                              po_qty_2 = VALUES(po_qty_2),
                              schedule_qty = VALUES(schedule_qty),
                              updated_at = NOW()
                        `, [supplier.id, product.id, po1Val, po2Val, dCol.dateStr, schedVal]);

                        importCount++;
                    }

                    r += 2;
                }
            }
        }

        console.log(`✔ Excel Simulation Import succeeded. Imported/updated ${importCount} daily schedule cells.`);

        // 3. Test inline cell override
        console.log("Simulating cell override...");
        // Select one imported row to override
        const [sampleRows] = await db.query("SELECT * FROM vendor_daily_schedules LIMIT 1");
        if (sampleRows.length > 0) {
            const row = sampleRows[0];
            const dateObj = new Date(row.schedule_date);
            const Y = dateObj.getFullYear();
            const M = String(dateObj.getMonth() + 1).padStart(2, '0');
            const D = String(dateObj.getDate()).padStart(2, '0');
            const dateStr = `${Y}-${M}-${D}`;

            await db.query(`
                INSERT INTO vendor_daily_schedules 
                  (supplier_id, product_id, schedule_date, manual_actual_qty, updated_at)
                VALUES (?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                  manual_actual_qty = VALUES(manual_actual_qty),
                  updated_at = NOW()
            `, [row.supplier_id, row.product_id, dateStr, 5000]);

            // Verify
            const [check] = await db.query(
                "SELECT manual_actual_qty FROM vendor_daily_schedules WHERE id = ?",
                [row.id]
            );
            if (Number(check[0].manual_actual_qty) !== 5000) {
                throw new Error("Manual actual quantity override was not saved!");
            }
            console.log(`✔ Cell override validation passed (Set manual_actual_qty to 5000 for Row ID ${row.id}).`);
        }

        console.log("=== ALL SYSTEM VERIFICATION TASKS COMPLETED SUCCESSFULLY! ===");

    } catch (e) {
        console.error("Verification failed:", e);
    }
    process.exit(0);
})();
