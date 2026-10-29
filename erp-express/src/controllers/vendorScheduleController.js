const db = require('../config/db');

// Utility for BigInt serialization
const serialize = (data) => {
    if (!data) return data;
    const transform = (obj) => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(transform);
        const newObj = {};
        for (const [k, v] of Object.entries(obj)) {
            if (typeof v === 'bigint') newObj[k] = v.toString();
            else if (v instanceof Date) {
                const Y = v.getFullYear(), M = String(v.getMonth()+1).padStart(2,'0'), D = String(v.getDate()).padStart(2,'0');
                newObj[k] = `${Y}-${M}-${D}`;
            } else if (typeof v === 'object') newObj[k] = transform(v);
            else newObj[k] = v;
        }
        return newObj;
    };
    return transform(data);
};

// Generate reference code for Vendor Delivery Schedule
async function generateVDSReference(connection) {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth()+1).padStart(2,'0');
    const prefix = `VDS/EPU/${year}/${month}/`;
    const globalYearPrefix = `VDS/EPU/${year}/%`;

    const [latest] = await connection.execute(
        'SELECT reference_code FROM vendor_delivery_schedules WHERE reference_code LIKE ? ORDER BY id DESC LIMIT 1',
        [globalYearPrefix]
    );

    let sequence = 1;
    if (latest.length > 0) {
        const lastRef = latest[0].reference_code;
        const parts = lastRef.split('/');
        const lastSeqStr = parts[parts.length - 1];
        if (lastSeqStr && !isNaN(parseInt(lastSeqStr))) {
            sequence = parseInt(lastSeqStr) + 1;
        }
    }
    return `${prefix}${String(sequence).padStart(4, '0')}`;
}

exports.getVendorSchedules = async (req, res) => {
    try {
        const { search, status } = req.query;
        let query = `
            SELECT vs.*, po.reference as po_reference, s.supplier_name, s.supplier_code
            FROM vendor_delivery_schedules vs
            JOIN purchase_orders po ON vs.purchase_order_id = po.id
            JOIN suppliers s ON po.supplier_id = s.id
        `;
        let params = [];
        let conditions = [];

        if (status && status !== 'all') {
            conditions.push('vs.status = ?');
            params.push(status);
        }
        if (search) {
            conditions.push('(vs.reference_code LIKE ? OR po.reference LIKE ? OR s.supplier_name LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY vs.id DESC';
        const [rows] = await db.query(query, params);
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createVendorSchedule = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { purchase_order_id, estimated_delivery_date, notes } = req.body;

        if (!purchase_order_id || !estimated_delivery_date) {
            return res.status(400).json({ message: 'Purchase Order ID and Estimated Delivery Date are required' });
        }

        // Validate PO exists
        const [poRows] = await connection.execute('SELECT id FROM purchase_orders WHERE id = ?', [purchase_order_id]);
        if (poRows.length === 0) {
            return res.status(404).json({ message: 'Purchase Order not found' });
        }

        const referenceCode = await generateVDSReference(connection);

        await connection.execute(
            `INSERT INTO vendor_delivery_schedules 
                (purchase_order_id, reference_code, estimated_delivery_date, status, notes, created_at, updated_at)
             VALUES (?, ?, ?, 'Pending', ?, NOW(), NOW())`,
            [purchase_order_id, referenceCode, estimated_delivery_date, notes || '']
        );

        await connection.commit();
        return res.status(201).json({
            success: true,
            message: 'Vendor delivery schedule created successfully',
            reference_code: referenceCode
        });

    } catch (error) {
        await connection.rollback();
        console.error('createVendorSchedule Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.updateVendorScheduleStatus = async (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
        return res.status(400).json({ message: 'Status is required' });
    }

    try {
        const [rows] = await db.execute('SELECT * FROM vendor_delivery_schedules WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Schedule not found' });
        }

        let actualDeliveryDateUpdate = '';
        let params = [status];

        if (status === 'Arrived') {
            actualDeliveryDateUpdate = ', actual_delivery_date = CURDATE()';
        } else {
            actualDeliveryDateUpdate = ', actual_delivery_date = NULL';
        }

        let query = `UPDATE vendor_delivery_schedules SET status = ? ${actualDeliveryDateUpdate}`;
        
        if (notes !== undefined) {
            query += ', notes = ?';
            params.push(notes);
        }

        query += ', updated_at = NOW() WHERE id = ?';
        params.push(id);

        await db.execute(query, params);
        return res.json({ success: true, message: 'Vendor delivery schedule status updated successfully' });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getExcelScheduleAgustus2026 = async (req, res) => {
    try {
        const xlsx = require('xlsx');
        const filePath = 'c:/laragon/www/erp-epu-main/Schedule Delivery Agustus 2026.xlsx';
        const workbook = xlsx.readFile(filePath);
        const result = [];
        const validSheets = workbook.SheetNames.filter(name => name.toUpperCase() !== 'LIST');

        const excelSerialToDateStr = (serial) => {
            if (typeof serial !== 'number') return String(serial);
            const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
            const Y = date.getUTCFullYear();
            const M = String(date.getUTCMonth() + 1).padStart(2, '0');
            const D = String(date.getUTCDate()).padStart(2, '0');
            return `${Y}-${M}-${D}`;
        };

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
            for (let c = 0; c < headers.length; c++) {
                const val = headers[c];
                if (typeof val === 'number' && val > 40000) {
                    dateCols.push({
                        colIdx: c,
                        dateStr: excelSerialToDateStr(val),
                        serial: val
                    });
                }
            }

            const items = [];
            for (let r = headerRowIdx + 1; r < rawData.length; r++) {
                const row = rawData[r];
                if (!row || row.length === 0) continue;

                const partName = row[namePartIdx] ? String(row[namePartIdx]).trim() : '';
                const rowLabel = row[7] ? String(row[7]).trim() : '';

                if (partName && (rowLabel === 'Schedule' || !rowLabel)) {
                    const rowSched = rawData[r] || [];
                    const rowAct = rawData[r + 1] || [];
                    const rowDev = rawData[r + 2] || [];

                    const itemNo = rowSched[0] ? Number(rowSched[0]) : items.length + 1;
                    const po2Val = Number(rowSched[po2Idx]) || 0;
                    const po1Val = Number(rowSched[po1Idx]) || 0;
                    const totalVal = Number(rowSched[totalIdx]) || 0;
                    const schedTotal = Number(rowSched[scheduleIdx]) || 0;
                    const devTotal = Number(rowSched[deviasiIdx]) || 0;

                    const daily = {};
                    for (const dCol of dateCols) {
                        daily[dCol.dateStr] = {
                            schedule: Number(rowSched[dCol.colIdx]) || 0,
                            actIn: Number(rowAct[dCol.colIdx]) || 0,
                            dev: Number(rowDev[dCol.colIdx]) || 0
                        };
                    }

                    items.push({
                        no: itemNo,
                        partName,
                        po2: po2Val,
                        po1: po1Val,
                        total: totalVal,
                        scheduleTotal: schedTotal,
                        devTotal: devTotal,
                        daily
                    });

                    r += 2;
                }
            }

            result.push({
                sheetName,
                vendorName,
                dates: dateCols.map(d => d.dateStr),
                items
            });
        }

        return res.json({ success: true, data: result });
    } catch (error) {
        console.error("getExcelScheduleAgustus2026 Error:", error);
        return res.status(500).json({ message: error.message });
    }
};

// 1. Get daily grid with Goods Receipt synchronization
exports.getDailyGrid = async (req, res) => {
    try {
        const now = new Date();
        const month = Number(req.query.month || (now.getMonth() + 1));
        const year = Number(req.query.year || now.getFullYear());

        // Fetch all daily schedules from DB
        const [schedules] = await db.query(`
            SELECT vds.*, p.product_name, p.product_code, s.supplier_name, s.supplier_code
            FROM vendor_daily_schedules vds
            JOIN products p ON vds.product_id = p.id
            JOIN suppliers s ON vds.supplier_id = s.id
            WHERE MONTH(vds.schedule_date) = ? AND YEAR(vds.schedule_date) = ?
            ORDER BY s.supplier_name ASC, p.product_name ASC, vds.schedule_date ASC
        `, [month, year]);

        // Fetch automatic Goods Receipt quantities for that month & year
        const [grs] = await db.query(`
            SELECT grd.product_id, gr.supplier_id, DATE(gr.received_date) as received_date, SUM(grd.qty_received) as total_received
            FROM goods_receipt_details grd
            JOIN goods_receipts gr ON grd.gr_id = gr.id
            WHERE MONTH(gr.received_date) = ? AND YEAR(gr.received_date) = ? AND gr.status = 'Approved'
            GROUP BY grd.product_id, gr.supplier_id, DATE(gr.received_date)
        `, [month, year]);

        // Map Goods Receipt for fast lookup: "supplier_id-product_id-YYYY-MM-DD" -> quantity
        const grMap = new Map();
        for (const gr of grs) {
            const dateObj = new Date(gr.received_date);
            const Y = dateObj.getFullYear();
            const M = String(dateObj.getMonth() + 1).padStart(2, '0');
            const D = String(dateObj.getDate()).padStart(2, '0');
            const dateStr = `${Y}-${M}-${D}`;
            const key = `${gr.supplier_id}-${gr.product_id}-${dateStr}`;
            grMap.set(key, Number(gr.total_received || 0));
        }

        // Generate list of dates in the selected month
        const daysInMonth = new Date(year, month, 0).getDate();
        const dates = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            dates.push(dateStr);
        }

        // Group schedules by supplier
        const vendorGroups = new Map();

        for (const s of schedules) {
            const supId = Number(s.supplier_id);
            if (!vendorGroups.has(supId)) {
                vendorGroups.set(supId, {
                    supplierId: supId,
                    vendorName: s.supplier_name,
                    dates: dates,
                    itemsMap: new Map() // product_id -> item grid details
                });
            }

            const vendorGroup = vendorGroups.get(supId);
            const prodId = Number(s.product_id);

            if (!vendorGroup.itemsMap.has(prodId)) {
                vendorGroup.itemsMap.set(prodId, {
                    productId: prodId,
                    partName: s.product_name,
                    productCode: s.product_code,
                    po2: Number(s.po_qty_2 || 0),
                    po1: Number(s.po_qty_1 || 0),
                    total: Number(s.po_qty_1 || 0) + Number(s.po_qty_2 || 0),
                    scheduleTotal: 0,
                    devTotal: 0,
                    daily: {}
                });
            }

            const item = vendorGroup.itemsMap.get(prodId);
            const dateObj = new Date(s.schedule_date);
            const Y = dateObj.getFullYear();
            const M = String(dateObj.getMonth() + 1).padStart(2, '0');
            const D = String(dateObj.getDate()).padStart(2, '0');
            const dateStr = `${Y}-${M}-${D}`;

            // Resolve Actual received quantity (either manual override or automatic GR query)
            const grKey = `${supId}-${prodId}-${dateStr}`;
            const autoQty = grMap.get(grKey) || 0;
            const actIn = s.manual_actual_qty !== null ? Number(s.manual_actual_qty) : autoQty;
            const sched = Number(s.schedule_qty || 0);

            item.daily[dateStr] = {
                schedule: sched,
                actIn: actIn,
                dev: actIn - sched
            };

            item.scheduleTotal += sched;
            item.devTotal += (actIn - sched);
        }

        // Build final list of groups
        const result = Array.from(vendorGroups.values()).map(v => {
            const items = Array.from(v.itemsMap.values()).map((it, idx) => ({
                no: idx + 1,
                ...it
            }));
            return {
                supplierId: v.supplierId,
                vendorName: v.vendorName,
                dates: v.dates,
                items: items
            };
        });

        return res.json({ success: true, data: result });
    } catch (e) {
        console.error("getDailyGrid Error:", e);
        return res.status(500).json({ message: e.message });
    }
};

// 2. Save manual cell editing
exports.saveCell = async (req, res) => {
    try {
        const { supplier_id, product_id, dateStr, type, val } = req.body;

        if (!supplier_id || !product_id || !dateStr || !type) {
            return res.status(400).json({ message: "Parameters supplier_id, product_id, dateStr, and type are required" });
        }

        const value = Number(val || 0);

        // Fetch PO quantities from other dates of this product-supplier to keep them consistent
        const [poRows] = await db.query(
            "SELECT po_qty_1, po_qty_2 FROM vendor_daily_schedules WHERE supplier_id = ? AND product_id = ? LIMIT 1",
            [supplier_id, product_id]
        );
        const poQty1 = poRows.length > 0 ? Number(poRows[0].po_qty_1) : 0;
        const poQty2 = poRows.length > 0 ? Number(poRows[0].po_qty_2) : 0;

        if (type === 'schedule') {
            await db.query(`
                INSERT INTO vendor_daily_schedules 
                  (supplier_id, product_id, po_qty_1, po_qty_2, schedule_date, schedule_qty, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                  schedule_qty = VALUES(schedule_qty),
                  updated_at = NOW()
            `, [supplier_id, product_id, poQty1, poQty2, dateStr, value]);
        } else if (type === 'actual') {
            await db.query(`
                INSERT INTO vendor_daily_schedules 
                  (supplier_id, product_id, po_qty_1, po_qty_2, schedule_date, manual_actual_qty, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                  manual_actual_qty = VALUES(manual_actual_qty),
                  updated_at = NOW()
            `, [supplier_id, product_id, poQty1, poQty2, dateStr, value]);
        } else if (type === 'po1') {
            await db.query(`
                INSERT INTO vendor_daily_schedules 
                  (supplier_id, product_id, po_qty_1, po_qty_2, schedule_date, schedule_qty, updated_at)
                VALUES (?, ?, ?, ?, ?, 0, NOW())
                ON DUPLICATE KEY UPDATE
                  po_qty_1 = VALUES(po_qty_1),
                  updated_at = NOW()
            `, [supplier_id, product_id, value, poQty2, dateStr]);

            await db.query(`
                UPDATE vendor_daily_schedules 
                SET po_qty_1 = ?, updated_at = NOW() 
                WHERE supplier_id = ? AND product_id = ?
            `, [value, supplier_id, product_id]);
        } else if (type === 'po2') {
            await db.query(`
                INSERT INTO vendor_daily_schedules 
                  (supplier_id, product_id, po_qty_1, po_qty_2, schedule_date, schedule_qty, updated_at)
                VALUES (?, ?, ?, ?, ?, 0, NOW())
                ON DUPLICATE KEY UPDATE
                  po_qty_2 = VALUES(po_qty_2),
                  updated_at = NOW()
            `, [supplier_id, product_id, poQty1, value, dateStr]);

            await db.query(`
                UPDATE vendor_daily_schedules 
                SET po_qty_2 = ?, updated_at = NOW() 
                WHERE supplier_id = ? AND product_id = ?
            `, [value, supplier_id, product_id]);
        } else {
            return res.status(400).json({ message: "Invalid type. Must be 'schedule', 'actual', 'po1', or 'po2'" });
        }

        return res.json({ success: true, message: "Sel berhasil disimpan!" });
    } catch (e) {
        console.error("saveCell Error:", e);
        return res.status(500).json({ message: e.message });
    }
};

// 2b. Delete whole supplier-product schedule item
exports.deleteItem = async (req, res) => {
    try {
        const { supplier_id, product_id } = req.body;
        if (!supplier_id || !product_id) {
            return res.status(400).json({ message: "Parameters supplier_id and product_id are required" });
        }

        await db.query(
            "DELETE FROM vendor_daily_schedules WHERE supplier_id = ? AND product_id = ?",
            [supplier_id, product_id]
        );

        return res.json({ success: true, message: "Item schedule vendor berhasil dihapus!" });
    } catch (e) {
        console.error("deleteItem Error:", e);
        return res.status(500).json({ message: e.message });
    }
};

// 3. Import Excel file
exports.importExcel = async (req, res) => {
    try {
        const fs = require('fs');
        const xlsx = require('xlsx');
        if (!req.file) {
            return res.status(400).json({ message: "File upload required" });
        }

        const workbook = xlsx.readFile(req.file.path);
        const validSheets = workbook.SheetNames.filter(name => name.toUpperCase() !== 'LIST');

        const [dbSuppliers] = await db.query('SELECT id, supplier_code, supplier_name FROM suppliers');
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

            let currentSupplier = findSupplier(vendorName);

            const headerRowIdx = rawData.findIndex(row => row && row.includes && (row.includes('Name Part') || row.includes('Part name')));
            if (headerRowIdx === -1) continue;

            const headers = rawData[headerRowIdx];
            const namePartIdx = headers.indexOf('Name Part') !== -1 ? headers.indexOf('Name Part') : headers.indexOf('Part name');
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

                if (partName) {
                    // Check if this is a 3-row product block (i.e. the next row label is 'Act In')
                    const isProductRow = rawData[r + 1] && rawData[r + 1][7] && String(rawData[r + 1][7]).trim() === 'Act In';

                    if (isProductRow) {
                        const product = findProduct(partName);
                        if (!product) {
                            console.log(`Product matching part ${partName} not found in DB`);
                            r += 2;
                            continue;
                        }

                        if (!currentSupplier) {
                            console.log(`Skipped part ${partName} because no active supplier matches`);
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
                            `, [currentSupplier.id, product.id, po1Val, po2Val, dCol.dateStr, schedVal]);

                            importCount++;
                        }

                        r += 2;
                    } else {
                        // Not a product block, check if it defines a new supplier for the following rows
                        const matchedSupplier = findSupplier(partName);
                        if (matchedSupplier) {
                            currentSupplier = matchedSupplier;
                            console.log(`Changed Current Supplier dynamically to: ${currentSupplier.supplier_name}`);
                        }
                    }
                }
            }
        }

        // Clean up temp file
        fs.unlinkSync(req.file.path);

        return res.json({ success: true, message: `Berhasil mengimpor ${importCount} baris rencana pengiriman dari Excel!` });
    } catch (e) {
        console.error("importExcel Error:", e);
        return res.status(500).json({ message: e.message });
    }
};

exports.exportExcel = async (req, res) => {
    try {
        const Excel = require('exceljs');
        const now = new Date();
        const month = Number(req.query.month || (now.getMonth() + 1));
        const year = Number(req.query.year || now.getFullYear());

        // Load the original template file to preserve 100% of formatting, colors, formulas, and column widths
        const templatePath = 'c:/laragon/www/erp-epu-main/Schedule Delivery Agustus 2026.xlsx';
        const workbook = new Excel.Workbook();
        await workbook.xlsx.readFile(templatePath);

        const validSheets = [];
        workbook.eachSheet((sheet) => {
            if (sheet.name.toUpperCase() !== 'LIST') {
                validSheets.push(sheet.name);
            }
        });

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

        // Fetch all daily schedules for this month/year from DB
        const [schedules] = await db.query(`
            SELECT vds.*
            FROM vendor_daily_schedules vds
            WHERE MONTH(vds.schedule_date) = ? AND YEAR(vds.schedule_date) = ?
        `, [month, year]);

        // Fetch Goods Receipt quantities
        const [grs] = await db.query(`
            SELECT grd.product_id, gr.supplier_id, DATE(gr.received_date) as received_date, SUM(grd.qty_received) as total_received
            FROM goods_receipt_details grd
            JOIN goods_receipts gr ON grd.gr_id = gr.id
            WHERE MONTH(gr.received_date) = ? AND YEAR(gr.received_date) = ? AND gr.status = 'Approved'
            GROUP BY grd.product_id, gr.supplier_id, DATE(gr.received_date)
        `, [month, year]);

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
            if (!supplier) continue;

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

                        // Write values
                        const cellSched = rSched.getCell(dCol.colIdx);
                        const cellAct = rAct.getCell(dCol.colIdx);
                        const cellDev = rDev.getCell(dCol.colIdx);

                        cellSched.value = schedQty;
                        cellAct.value = actQty;
                        cellDev.value = devQty;

                        // Style Deviation cell based on value
                        if (devQty < 0) {
                            cellDev.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFFFC7CE' } // Light red background
                            };
                            cellDev.font = {
                                color: { argb: 'FF9C0006' }, // Dark red text
                                bold: true,
                                size: 9
                            };
                        } else if (devQty > 0) {
                            cellDev.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFC6EFCE' } // Light green background
                            };
                            cellDev.font = {
                                color: { argb: 'FF006100' }, // Dark green text
                                bold: true,
                                size: 9
                            };
                        } else {
                            cellDev.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFFFFFFF' } // White background
                            };
                            cellDev.font = {
                                color: { argb: 'FF808080' }, // Gray text
                                size: 9
                            };
                        }

                        scheduleTotal += schedQty;
                        devTotal += devQty;
                    }

                    // Update totals columns
                    if (scheduleIdx !== -1) rSched.getCell(scheduleIdx).value = scheduleTotal;
                    if (deviasiIdx !== -1) {
                        const cellTotalDev = rSched.getCell(deviasiIdx);
                        cellTotalDev.value = devTotal;
                        if (devTotal < 0) {
                            cellTotalDev.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFFFC7CE' }
                            };
                            cellTotalDev.font = {
                                color: { argb: 'FF9C0006' },
                                bold: true
                            };
                        } else if (devTotal > 0) {
                            cellTotalDev.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFC6EFCE' }
                            };
                            cellTotalDev.font = {
                                color: { argb: 'FF006100' },
                                bold: true
                            };
                        }
                    }

                    rSched.commit();
                    rAct.commit();
                    rDev.commit();
                }
            });

            // Convert remaining formula cells to values to avoid exceljs error on write
            ws.eachRow({ includeEmpty: true }, (row) => {
                row.eachCell({ includeEmpty: true }, (cell) => {
                    if (cell.value && typeof cell.value === 'object' && (cell.value.formula || cell.value.sharedFormula)) {
                        cell.value = cell.value.result !== undefined ? cell.value.result : 0;
                    }
                });
            });
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Schedule_Delivery_${month}_${year}.xlsx`);

        await workbook.xlsx.write(res);
        return res.end();

    } catch (e) {
        console.error("exportExcel Error:", e);
        return res.status(500).json({ message: e.message });
    }
};

exports.downloadTemplate = async (req, res) => {
    try {
        const Excel = require('exceljs');
        const templatePath = 'c:/laragon/www/erp-epu-main/Schedule Delivery Agustus 2026.xlsx';
        const workbook = new Excel.Workbook();
        await workbook.xlsx.readFile(templatePath);

        const validSheets = [];
        workbook.eachSheet((sheet) => {
            if (sheet.name.toUpperCase() !== 'LIST') {
                validSheets.push(sheet.name);
            }
        });

        for (const sheetName of validSheets) {
            const ws = workbook.getWorksheet(sheetName);
            if (!ws) continue;

            const rawData = [];
            ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
                rawData[rowNumber] = row.values;
            });

            const headerRowIdx = rawData.findIndex(row => row && row.includes && (row.includes('Name Part') || row.includes('Part name')));
            if (headerRowIdx === -1) continue;

            const headers = rawData[headerRowIdx];
            const namePartIdx = headers.indexOf('Name Part') !== -1 ? headers.indexOf('Name Part') : headers.indexOf('Part name');
            const po2Idx = headers.indexOf('PO-2');
            const po1Idx = headers.indexOf('PO-1');
            const totalIdx = headers.indexOf('Total');
            const scheduleIdx = headers.indexOf('Schedule');
            const deviasiIdx = headers.indexOf('Deviasi');

            const dateCols = [];
            for (let c = 1; c < headers.length; c++) {
                const val = headers[c];
                if (typeof val === 'number' && val > 40000) {
                    dateCols.push(c);
                }
            }

            // Iterate over items and clear quantities
            ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                if (rowNumber <= headerRowIdx) return;

                const partNameVal = row.getCell(namePartIdx).value;
                const partName = partNameVal ? String(partNameVal).trim() : '';

                if (partName) {
                    const rSched = ws.getRow(rowNumber);
                    const rAct = ws.getRow(rowNumber + 1);
                    const rDev = ws.getRow(rowNumber + 2);

                    // Clear PO columns
                    if (po2Idx !== -1) {
                        rSched.getCell(po2Idx).value = null;
                        rAct.getCell(po2Idx).value = null;
                        rDev.getCell(po2Idx).value = null;
                    }
                    if (po1Idx !== -1) {
                        rSched.getCell(po1Idx).value = null;
                        rAct.getCell(po1Idx).value = null;
                        rDev.getCell(po1Idx).value = null;
                    }
                    if (totalIdx !== -1) {
                        rSched.getCell(totalIdx).value = null;
                        rAct.getCell(totalIdx).value = null;
                        rDev.getCell(totalIdx).value = null;
                    }

                    // Clear daily date cells
                    for (const colIdx of dateCols) {
                        rSched.getCell(colIdx).value = null;
                        rAct.getCell(colIdx).value = null;
                        rDev.getCell(colIdx).value = null;
                    }

                    // Clear totals
                    if (scheduleIdx !== -1) {
                        rSched.getCell(scheduleIdx).value = null;
                        rAct.getCell(scheduleIdx).value = null;
                        rDev.getCell(scheduleIdx).value = null;
                    }
                    if (deviasiIdx !== -1) {
                        rSched.getCell(deviasiIdx).value = null;
                        rAct.getCell(deviasiIdx).value = null;
                        rDev.getCell(deviasiIdx).value = null;
                    }

                    rSched.commit();
                    rAct.commit();
                    rDev.commit();
                }
            });

            // Convert remaining formula cells to values to avoid exceljs error on write
            ws.eachRow({ includeEmpty: true }, (row) => {
                row.eachCell({ includeEmpty: true }, (cell) => {
                    if (cell.value && typeof cell.value === 'object' && (cell.value.formula || cell.value.sharedFormula)) {
                        cell.value = cell.value.result !== undefined ? cell.value.result : null;
                    }
                });
            });
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Template_Schedule_Delivery_Agustus_2026.xlsx');
        
        await workbook.xlsx.write(res);
        return res.end();

    } catch (e) {
        console.error("downloadTemplate Error:", e);
        return res.status(500).json({ message: e.message });
    }
};
