const db = require('../src/config/db');
const xlsx = require('xlsx');
const fs = require('fs');

(async () => {
    try {
        console.log("=== TESTING XLSX TEMPLATE-BASED EXPORT ===");

        const templatePath = 'c:/laragon/www/erp-epu-main/Schedule Delivery Agustus 2026.xlsx';
        const outputPath = 'c:/laragon/www/erp-epu-main/Schedule_Delivery_Exported_Xlsx_Actual.xlsx';

        const workbook = xlsx.readFile(templatePath, { cellStyles: true });
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
            const ws = workbook.Sheets[sheetName];
            if (!ws) continue;

            const range = xlsx.utils.decode_range(ws['!ref']);
            
            let vendorName = '';
            for (let r = range.s.r; r < range.s.r + 5; r++) {
                for (let c = range.s.c; c <= range.e.c; c++) {
                    const cellVal = ws[xlsx.utils.encode_cell({ r, c })]?.v;
                    if (cellVal && typeof cellVal === 'string' && (cellVal.includes('PT') || cellVal.includes('Silverplas'))) {
                        vendorName = cellVal.trim();
                        break;
                    }
                }
                if (vendorName) break;
            }
            if (!vendorName) vendorName = sheetName;

            const supplier = findSupplier(vendorName);
            if (!supplier) {
                console.log(`Supplier matching vendor ${vendorName} not found in DB`);
                continue;
            }
            
            let headerRowIdx = -1;
            let namePartColIdx = -1;
            let po2ColIdx = -1;
            let po1ColIdx = -1;
            let totalColIdx = -1;
            let scheduleColIdx = -1;
            let deviasiColIdx = -1;
            let labelColIdx = 7; // column H

            for (let r = range.s.r; r <= range.e.r; r++) {
                const cellVal = ws[xlsx.utils.encode_cell({ r, c: 1 })]?.v;
                if (cellVal === 'Name Part' || cellVal === 'Part name') {
                    headerRowIdx = r;
                    break;
                }
            }

            if (headerRowIdx === -1) continue;

            for (let c = range.s.c; c <= range.e.c; c++) {
                const cellVal = ws[xlsx.utils.encode_cell({ r: headerRowIdx, c })]?.v;
                if (cellVal === 'Name Part' || cellVal === 'Part name') namePartColIdx = c;
                if (cellVal === 'PO-2') po2ColIdx = c;
                if (cellVal === 'PO-1') po1ColIdx = c;
                if (cellVal === 'Total') totalColIdx = c;
                if (cellVal === 'Schedule') scheduleColIdx = c;
                if (cellVal === 'Deviasi') deviasiColIdx = c;
            }

            const dateCols = [];
            for (let c = range.s.c; c <= range.e.c; c++) {
                const cellVal = ws[xlsx.utils.encode_cell({ r: headerRowIdx, c })]?.v;
                if (typeof cellVal === 'number' && cellVal > 40000) {
                    dateCols.push({
                        colIdx: c,
                        dateStr: excelSerialToDateStr(cellVal)
                    });
                }
            }

            // Update cell values
            for (let r = headerRowIdx + 1; r <= range.e.r; r++) {
                const partNameVal = ws[xlsx.utils.encode_cell({ r, c: namePartColIdx })]?.v;
                const partName = partNameVal ? String(partNameVal).trim() : '';
                const rowLabelVal = ws[xlsx.utils.encode_cell({ r, c: labelColIdx })]?.v;
                const rowLabel = rowLabelVal ? String(rowLabelVal).trim() : '';

                if (partName && (rowLabel === 'Schedule' || !rowLabel)) {
                    const product = findProduct(partName);
                    if (!product) {
                        r += 2;
                        continue;
                    }

                    let scheduleTotal = 0;
                    let devTotal = 0;

                    for (const dCol of dateCols) {
                        const sKey = `${supplier.id}-${product.id}-${dCol.dateStr}`;
                        const dbSched = scheduleMap.get(sKey);
                        const autoQty = grMap.get(sKey) || 0;

                        const schedQty = dbSched ? Number(dbSched.schedule_qty || 0) : 0;
                        const actQty = dbSched && dbSched.manual_actual_qty !== null ? Number(dbSched.manual_actual_qty) : autoQty;
                        const devQty = actQty - schedQty;

                        const schedCellRef = xlsx.utils.encode_cell({ r, c: dCol.colIdx });
                        const actCellRef = xlsx.utils.encode_cell({ r: r + 1, c: dCol.colIdx });
                        const devCellRef = xlsx.utils.encode_cell({ r: r + 2, c: dCol.colIdx });

                        if (!ws[schedCellRef]) ws[schedCellRef] = { t: 'n' };
                        ws[schedCellRef].v = schedQty;
                        ws[schedCellRef].t = 'n';

                        if (!ws[actCellRef]) ws[actCellRef] = { t: 'n' };
                        ws[actCellRef].v = actQty;
                        ws[actCellRef].t = 'n';

                        if (!ws[devCellRef]) ws[devCellRef] = { t: 'n' };
                        ws[devCellRef].v = devQty;
                        ws[devCellRef].t = 'n';

                        scheduleTotal += schedQty;
                        devTotal += devQty;
                    }

                    if (scheduleColIdx !== -1) {
                        const cellRef = xlsx.utils.encode_cell({ r, c: scheduleColIdx });
                        if (!ws[cellRef]) ws[cellRef] = { t: 'n' };
                        ws[cellRef].v = scheduleTotal;
                        ws[cellRef].t = 'n';
                    }
                    if (deviasiColIdx !== -1) {
                        const cellRef = xlsx.utils.encode_cell({ r, c: deviasiColIdx });
                        if (!ws[cellRef]) ws[cellRef] = { t: 'n' };
                        ws[cellRef].v = devTotal;
                        ws[cellRef].t = 'n';
                    }

                    r += 2;
                }
            }
        }

        xlsx.writeFile(workbook, outputPath);
        console.log("SUCCESS: Exported template with sheetjs to:", outputPath);

    } catch (e) {
        console.error("XLSX template export test failed:", e);
    }
    process.exit(0);
})();
