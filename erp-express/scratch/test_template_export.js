const db = require('../src/config/db');
const Excel = require('exceljs');
const fs = require('fs');

(async () => {
    try {
        console.log("=== TESTING TEMPLATE-BASED EXCEL EXPORT ===");

        const templatePath = 'c:/laragon/www/erp-epu-main/Schedule Delivery Agustus 2026.xlsx';
        const outputPath = 'c:/laragon/www/erp-epu-main/Schedule_Delivery_Exported_Test.xlsx';

        const workbook = new Excel.Workbook();
        await workbook.xlsx.readFile(templatePath);

        const validSheets = ['GINSA', 'TATA, GRAF', 'FSCM', 'HYMAN', 'SASA', 'MATERIAL'];

        const [dbProducts] = await db.query('SELECT id, product_code, product_name FROM products');
        const [dbSuppliers] = await db.query('SELECT id, supplier_code, supplier_name FROM suppliers');

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

        // Fetch all schedules for August 2026 from DB
        const [schedules] = await db.query(`
            SELECT vds.*
            FROM vendor_daily_schedules vds
            WHERE MONTH(vds.schedule_date) = 8 AND YEAR(vds.schedule_date) = 2026
        `);

        // Fetch Goods Receipt actuals
        const [grs] = await db.query(`
            SELECT grd.product_id, gr.supplier_id, DATE(gr.received_date) as received_date, SUM(grd.qty_received) as total_received
            FROM goods_receipt_details grd
            JOIN goods_receipts gr ON grd.gr_id = gr.id
            WHERE MONTH(gr.received_date) = 8 AND YEAR(gr.received_date) = 2026 AND gr.status = 'Approved'
            GROUP BY grd.product_id, gr.supplier_id, DATE(gr.received_date)
        `);

        const grMap = new Map();
        for (const gr of grs) {
            const dateObj = new Date(gr.received_date);
            const Y = dateObj.getFullYear();
            const M = String(dateObj.getMonth() + 1).padStart(2, '0');
            const D = String(dateObj.getDate()).padStart(2, '0');
            const dateStr = `${Y}-${M}-${D}`;
            grMap.set(`${gr.supplier_id}-${gr.product_id}-${dateStr}`, Number(gr.total_received || 0));
        }

        const scheduleMap = new Map();
        for (const s of schedules) {
            const dateObj = new Date(s.schedule_date);
            const Y = dateObj.getFullYear();
            const M = String(dateObj.getMonth() + 1).padStart(2, '0');
            const D = String(dateObj.getDate()).padStart(2, '0');
            const dateStr = `${Y}-${M}-${D}`;
            scheduleMap.set(`${s.supplier_id}-${s.product_id}-${dateStr}`, s);
        }

        for (const sheetName of validSheets) {
            const ws = workbook.getWorksheet(sheetName);
            if (!ws) continue;

            // Get all raw values to find headers
            const rawData = [];
            ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
                rawData[rowNumber] = row.values;
            });

            let vendorName = '';
            for (let r = 1; r < 6; r++) {
                const rowVals = rawData[r];
                if (rowVals) {
                    const found = rowVals.find(val => val && typeof val === 'string' && (val.includes('PT') || val.includes('Silverplas')));
                    if (found) {
                        vendorName = found.trim();
                        break;
                    }
                }
            }
            if (!vendorName) vendorName = sheetName;

            const supplier = findSupplier(vendorName);
            if (!supplier) {
                console.log(`Supplier matching vendor ${vendorName} not found in DB`);
                continue;
            }

            const headerRowIdx = rawData.findIndex(row => row && row.includes && (row.includes('Name Part') || row.includes('Part name')));
            if (headerRowIdx === -1) continue;

            const headers = rawData[headerRowIdx];
            const namePartIdx = headers.indexOf('Name Part');
            const po2Idx = headers.indexOf('PO-2');
            const po1Idx = headers.indexOf('PO-1');
            const totalIdx = headers.indexOf('Total');
            const scheduleIdx = headers.indexOf('Schedule');
            const deviasiIdx = headers.indexOf('Deviasi');

            const dateCols = [];
            for (let c = 1; c < headers.length; c++) {
                const val = headers[c];
                if (typeof val === 'number' && val > 40000) {
                    dateCols.push({
                        colIdx: c,
                        dateStr: excelSerialToDateStr(val)
                    });
                }
            }

            // Iterate over items
            ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                if (rowNumber <= headerRowIdx) return;

                const partNameVal = row.getCell(namePartIdx).value;
                const partName = partNameVal ? String(partNameVal).trim() : '';
                const rowLabelVal = row.getCell(8).value;
                const rowLabel = rowLabelVal ? String(rowLabelVal).trim() : '';

                if (partName && (rowLabel === 'Schedule' || !rowLabel)) {
                    const product = findProduct(partName);
                    if (!product) {
                        return;
                    }

                    // Schedule row is rowNumber, Act In is rowNumber+1, Dev is rowNumber+2
                    const rSched = ws.getRow(rowNumber);
                    const rAct = ws.getRow(rowNumber + 1);
                    const rDev = ws.getRow(rowNumber + 2);

                    let scheduleTotal = 0;
                    let devTotal = 0;

                    for (const dCol of dateCols) {
                        const sKey = `${supplier.id}-${product.id}-${dCol.dateStr}`;
                        const dbSched = scheduleMap.get(sKey);
                        const autoQty = grMap.get(sKey) || 0;

                        const schedQty = dbSched ? Number(dbSched.schedule_qty || 0) : 0;
                        const actQty = dbSched && dbSched.manual_actual_qty !== null ? Number(dbSched.manual_actual_qty) : autoQty;
                        const devQty = actQty - schedQty;

                        rSched.getCell(dCol.colIdx).value = schedQty;
                        rAct.getCell(dCol.colIdx).value = actQty;
                        rDev.getCell(dCol.colIdx).value = devQty;

                        scheduleTotal += schedQty;
                        devTotal += devQty;
                    }

                    // Update totals columns
                    if (scheduleIdx !== -1) rSched.getCell(scheduleIdx).value = scheduleTotal;
                    if (deviasiIdx !== -1) rSched.getCell(deviasiIdx).value = devTotal;

                    // Write changes
                    rSched.commit();
                    rAct.commit();
                    rDev.commit();
                }
            });
        }

        await workbook.xlsx.writeFile(outputPath);
        console.log("SUCCESS: Exported file template with live data to:", outputPath);

    } catch (e) {
        console.error("Template export test failed:", e);
    }
    process.exit(0);
})();
