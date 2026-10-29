const db = require('../config/db');

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

// Ensure migration columns exist
async function ensureColumnsExist(connection) {
    try {
        await connection.query('ALTER TABLE goods_receipt_details ADD COLUMN qty_ok INT DEFAULT 0');
    } catch (e) {}
    try {
        await connection.query('ALTER TABLE goods_receipt_details ADD COLUMN qty_ng INT DEFAULT 0');
    } catch (e) {}
    try {
        await connection.query('ALTER TABLE goods_receipt_details ADD COLUMN ng_category VARCHAR(255) DEFAULT NULL');
    } catch (e) {}
    try {
        await connection.query('ALTER TABLE goods_receipt_details ADD COLUMN ng_note TEXT DEFAULT NULL');
    } catch (e) {}
}

// Generate reference code for BPB by Schedule
async function generateScheduleGRReference(connection) {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `BPB/SCH-EPU/${year}/${month}/`;
    const globalPrefix = `BPB/SCH-EPU/${year}/%`;

    const [latest] = await connection.execute(
        'SELECT reference FROM goods_receipts WHERE reference LIKE ? ORDER BY id DESC LIMIT 1',
        [globalPrefix]
    );

    let sequence = 1;
    if (latest.length > 0) {
        const lastRef = latest[0].reference;
        const parts = lastRef.split('/');
        const lastSeqStr = parts[parts.length - 1];
        if (lastSeqStr && lastSeqStr.length === 4 && !isNaN(parseInt(lastSeqStr))) {
            sequence = parseInt(lastSeqStr) + 1;
        }
    }
    return `${prefix}${String(sequence).padStart(4, '0')}`;
}

// 1. POST /api/receipt-by-schedule (From Schedule Vendor Page -> Creates Pending Goods Receipt, DOES NOT update stock yet)
exports.createReceiptFromSchedule = async (req, res) => {
    const connection = await db.getConnection();
    const userId = req.user?.id || 1;
    try {
        await connection.beginTransaction();
        await ensureColumnsExist(connection);

        const {
            supplier_id,
            schedule_date,
            note,
            items
        } = req.body;

        if (!supplier_id) {
            await connection.rollback();
            return res.status(400).json({ message: 'Supplier wajib dipilih.' });
        }

        if (!Array.isArray(items) || items.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Tidak ada item barang yang diterima.' });
        }

        const validItems = items.filter(i => Number(i.qty_received || 0) > 0);
        if (validItems.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Minimal 1 barang harus memiliki kuantitas estimasi kedatangan.' });
        }

        const reference = await generateScheduleGRReference(connection);
        const receiptDate = schedule_date || new Date();

        let supplierName = null;
        const [supRows] = await connection.execute('SELECT supplier_name FROM suppliers WHERE id = ? LIMIT 1', [supplier_id]);
        if (supRows.length > 0) supplierName = supRows[0].supplier_name;

        // Status is 'Pending' -> Waiting for warehouse receipt confirmation
        const [grResult] = await connection.query(
            `INSERT INTO goods_receipts (
                reference, bpb_number, date, supplier_id, status, note, users_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'Pending', ?, ?, NOW(), NOW())`,
            [
                reference,
                `SCH-${Date.now().toString().slice(-6)}`,
                receiptDate,
                supplier_id,
                note || `Draft Penerimaan dari Schedule Pengiriman (${supplierName || 'Vendor'})`,
                userId
            ]
        );

        const grId = grResult.insertId;

        for (const item of validItems) {
            const qtyReceived = Number(item.qty_received || 0);
            const qtyOrdered = Number(item.qty_ordered || 0);

            await connection.query(
                `INSERT INTO goods_receipt_details (
                    gr_id, product_id, product_name, product_code, qty_ordered, qty_received, qty_ok, qty_ng, product_unit, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, NOW(), NOW())`,
                [
                    grId,
                    item.product_id || null,
                    item.product_name || 'Item Part',
                    item.product_code || '-',
                    qtyOrdered,
                    qtyReceived,
                    item.product_unit || 'PCS'
                ]
            );
        }

        await connection.commit();
        return res.status(201).json({
            success: true,
            message: `Data pengiriman barang berhasil dikirim ke Penerimaan Barang by Schedule (Status: Pending Verification). No BPB: ${reference}`,
            id: grId,
            reference
        });
    } catch (error) {
        await connection.rollback();
        console.error('createReceiptFromSchedule Error:', error);
        return res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

// 2. POST /api/receipt-by-schedule/:id/confirm (Process Receiving at Warehouse -> Input Qty OK, Qty NG, Category NG -> Updates Stock with QTY OK)
exports.confirmReceiptFromSchedule = async (req, res) => {
    const { id } = req.params;
    const { items, note } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Rincian barang yang diterima wajib diisi.' });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        await ensureColumnsExist(connection);

        const [grRows] = await connection.execute(
            'SELECT * FROM goods_receipts WHERE id = ? LIMIT 1',
            [id]
        );

        if (grRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Dokumen penerimaan tidak ditemukan.' });
        }

        const gr = grRows[0];
        if (gr.status === 'Completed') {
            await connection.rollback();
            return res.status(400).json({ message: 'Dokumen penerimaan barang ini sudah dikonfirmasi sebelumnya.' });
        }

        let totalQtyOkAll = 0;

        for (const item of items) {
            const detailId = item.detail_id || item.id;
            const qtyReceived = Number(item.qty_received || 0);
            const qtyNg = Number(item.qty_ng || 0);
            const qtyOk = Math.max(0, qtyReceived - qtyNg);
            const ngCategory = item.ng_category || null;
            const ngNote = item.ng_note || null;

            totalQtyOkAll += qtyOk;

            // Fetch existing detail to get product_id
            const [dRows] = await connection.execute(
                'SELECT product_id, product_name, product_code FROM goods_receipt_details WHERE id = ? AND gr_id = ?',
                [detailId, id]
            );

            if (dRows.length === 0) continue;
            const dItem = dRows[0];

            // Update details
            await connection.execute(
                `UPDATE goods_receipt_details 
                 SET qty_received = ?, qty_ok = ?, qty_ng = ?, ng_category = ?, ng_note = ?, updated_at = NOW() 
                 WHERE id = ? AND gr_id = ?`,
                [qtyReceived, qtyOk, qtyNg, ngCategory, ngNote, detailId, id]
            );

            // Update warehouse stock ONLY using qtyOk if product_id is available
            if (dItem.product_id && qtyOk > 0) {
                const productId = dItem.product_id;
                const supplierId = gr.supplier_id;

                // Check supplier mapping
                const [suppliersForProduct] = await connection.execute(
                    'SELECT id FROM product_suppliers WHERE product_id = ? LIMIT 1',
                    [productId]
                );
                const finalSupplierId = suppliersForProduct.length > 0 ? supplierId : null;

                // Determine unit price / HPP
                let unitPrice = 0;
                const [prodUnitRows] = await connection.execute(
                    'SELECT buy_price FROM product_units WHERE product_id = ? AND level = 1 LIMIT 1',
                    [productId]
                );
                if (prodUnitRows.length > 0) {
                    unitPrice = Number(prodUnitRows[0].buy_price || 0);
                } else {
                    const [prodRows] = await connection.execute(
                        'SELECT product_price FROM products WHERE id = ? LIMIT 1',
                        [productId]
                    );
                    unitPrice = prodRows.length > 0 ? Number(prodRows[0].product_price || 0) : 0;
                }

                // Update warehouse_stocks (MATKOM warehouse_id = 1)
                const [wsRows] = await connection.execute(
                    'SELECT id, qty_stock, hpp FROM warehouse_stocks WHERE product_id = ? AND warehouse_id = 1 AND (supplier_id = ? OR (supplier_id IS NULL AND ? IS NULL))',
                    [productId, finalSupplierId, finalSupplierId]
                );

                if (wsRows.length > 0) {
                    const qtyOld = Number(wsRows[0].qty_stock || 0);
                    const hppOld = Number(wsRows[0].hpp || 0);
                    let hppNew = hppOld;
                    if (qtyOld + qtyOk > 0) {
                        hppNew = (qtyOld * hppOld + qtyOk * unitPrice) / (qtyOld + qtyOk);
                    }
                    await connection.execute(
                        'UPDATE warehouse_stocks SET qty_stock = qty_stock + ?, hpp = ?, updated_at = NOW() WHERE id = ?',
                        [qtyOk, hppNew, wsRows[0].id]
                    );
                } else {
                    await connection.execute(
                        'INSERT INTO warehouse_stocks (product_id, warehouse_id, supplier_id, qty_stock, hpp, created_at, updated_at) VALUES (?, 1, ?, ?, ?, NOW(), NOW())',
                        [productId, finalSupplierId, qtyOk, unitPrice]
                    );
                }

                // Update global product stock
                await connection.execute(
                    'UPDATE products SET product_quantity = product_quantity + ?, updated_at = NOW() WHERE id = ?',
                    [qtyOk, productId]
                );

                // Update schedule actual_qty in vendor_daily_schedules
                if (gr.date) {
                    const dateStr = new Date(gr.date).toISOString().split('T')[0];
                    await connection.execute(
                        `UPDATE vendor_daily_schedules 
                         SET manual_actual_qty = ?, updated_at = NOW() 
                         WHERE supplier_id = ? AND product_id = ? AND schedule_date = ?`,
                        [qtyReceived, supplierId, productId, dateStr]
                    );
                }
            }
        }

        // Update BPB status to Completed
        await connection.execute(
            `UPDATE goods_receipts SET status = 'Completed', received_date = NOW(), note = COALESCE(?, note), updated_at = NOW() WHERE id = ?`,
            [note || null, id]
        );

        await connection.commit();
        return res.json({
            success: true,
            message: `Penerimaan barang berhasil dikonfirmasi (${totalQtyOkAll} PCS QTY OK bertambah ke Stok Gudang).`
        });

    } catch (error) {
        await connection.rollback();
        console.error('confirmReceiptFromSchedule Error:', error);
        return res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

// 2b. POST /api/receipt-by-schedule/bulk-send (Kirim Semua Schedule Vendor ke Penerimaan Barang by Schedule)
exports.bulkCreateReceiptsFromSchedule = async (req, res) => {
    const connection = await db.getConnection();
    const userId = req.user?.id || 1;
    try {
        await connection.beginTransaction();
        await ensureColumnsExist(connection);

        const {
            schedule_date,
            sheets
        } = req.body;

        if (!Array.isArray(sheets) || sheets.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Tidak ada data schedule vendor yang dikirim.' });
        }

        const receiptDate = schedule_date || new Date().toISOString().split('T')[0];
        const createdReceipts = [];

        for (const sheet of sheets) {
            const supId = sheet.supplier_id || sheet.supplierId;
            if (!supId) continue;

            const items = sheet.items || [];
            const validItems = items.filter(i => Number(i.qty_to_receive || i.qtyToReceive || i.qty_received || 0) > 0);
            if (validItems.length === 0) continue;

            const reference = await generateScheduleGRReference(connection);
            const supName = sheet.vendor_name || sheet.supplierName || 'Vendor';

            const [grResult] = await connection.query(
                `INSERT INTO goods_receipts (
                    reference, bpb_number, date, supplier_id, status, note, users_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, 'Pending', ?, ?, NOW(), NOW())`,
                [
                    reference,
                    `SCH-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`,
                    receiptDate,
                    supId,
                    `Penerimaan dari Schedule Pengiriman (${supName}) - Tgl ${receiptDate}`,
                    userId
                ]
            );

            const grId = grResult.insertId;

            for (const item of validItems) {
                const qtyReceived = Number(item.qty_to_receive || item.qtyToReceive || item.qty_received || 0);
                const qtyOrdered = Number(item.total || item.qty_ordered || 0);

                await connection.query(
                    `INSERT INTO goods_receipt_details (
                        gr_id, product_id, product_name, product_code, qty_ordered, qty_received, qty_ok, qty_ng, product_unit, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, NOW(), NOW())`,
                    [
                        grId,
                        item.product_id || item.productId || null,
                        item.product_name || item.partName || 'Item Part',
                        item.product_code || item.productCode || '-',
                        qtyOrdered,
                        qtyReceived,
                        item.product_unit || item.productUnit || 'PCS'
                    ]
                );
            }

            createdReceipts.push({
                id: grId,
                reference,
                supplierName: supName,
                itemCount: validItems.length
            });
        }

        if (createdReceipts.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Tidak ada item dengan kuantitas kedatangan (Actual In > 0) pada seluruh vendor.' });
        }

        await connection.commit();
        return res.status(201).json({
            success: true,
            message: `Berhasil membuat ${createdReceipts.length} dokumen Penerimaan Barang by Schedule (Status: Pending Verification).`,
            receipts: createdReceipts
        });
    } catch (error) {
        await connection.rollback();
        console.error('bulkCreateReceiptsFromSchedule Error:', error);
        return res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

// 3. GET /api/receipt-by-schedule
exports.getReceiptsFromSchedule = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.max(1, parseInt(limit) || 10);
        const offsetNum = (pageNum - 1) * limitNum;

        let whereClause = "WHERE gr.reference LIKE 'BPB/SCH-%'";
        const params = [];

        if (search) {
            whereClause += " AND (gr.reference LIKE ? OR s.supplier_name LIKE ? OR gr.note LIKE ?)";
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const countQuery = `
            SELECT COUNT(*) as count 
            FROM goods_receipts gr
            LEFT JOIN suppliers s ON gr.supplier_id = s.id
            ${whereClause}
        `;
        const [[{ count }]] = await db.query(countQuery, params);

        const dataQuery = `
            SELECT gr.*, s.supplier_name, s.supplier_code,
                   (SELECT COUNT(*) FROM goods_receipt_details WHERE gr_id = gr.id) as item_count,
                   (SELECT COALESCE(SUM(qty_received), 0) FROM goods_receipt_details WHERE gr_id = gr.id) as total_qty,
                   (SELECT COALESCE(SUM(qty_ok), 0) FROM goods_receipt_details WHERE gr_id = gr.id) as total_qty_ok,
                   (SELECT COALESCE(SUM(qty_ng), 0) FROM goods_receipt_details WHERE gr_id = gr.id) as total_qty_ng
            FROM goods_receipts gr
            LEFT JOIN suppliers s ON gr.supplier_id = s.id
            ${whereClause}
            ORDER BY gr.id DESC
            LIMIT ${limitNum} OFFSET ${offsetNum}
        `;

        const [rows] = await db.query(dataQuery, params);

        return res.json(serialize({
            data: rows,
            totalItems: count,
            totalPages: Math.ceil(count / limitNum),
            currentPage: pageNum
        }));
    } catch (error) {
        console.error('getReceiptsFromSchedule Error:', error);
        return res.status(500).json({ message: error.message });
    }
};

// 4. GET /api/receipt-by-schedule/:id
exports.getReceiptFromScheduleDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const [grRows] = await db.query(
            `SELECT gr.*, s.supplier_name, s.supplier_code
             FROM goods_receipts gr
             LEFT JOIN suppliers s ON gr.supplier_id = s.id
             WHERE gr.id = ? LIMIT 1`,
            [id]
        );

        if (grRows.length === 0) {
            return res.status(404).json({ message: 'Dokumen penerimaan tidak ditemukan.' });
        }

        const [details] = await db.query(
            `SELECT grd.*, p.product_code, p.product_name
             FROM goods_receipt_details grd
             LEFT JOIN products p ON grd.product_id = p.id
             WHERE grd.gr_id = ?`,
            [id]
        );

        return res.json(serialize({
            ...grRows[0],
            items: details
        }));
    } catch (error) {
        console.error('getReceiptFromScheduleDetail Error:', error);
        return res.status(500).json({ message: error.message });
    }
};
