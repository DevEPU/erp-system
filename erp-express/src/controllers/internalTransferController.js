const db = require('../config/db');

// Utility for BigInt & Date serialization
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

// Generate Reference code
exports.generateTransferReference = async function (connection, typeCode) {
    const now = new Date();
    const year  = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth()+1).padStart(2,'0');
    const prefix = `TRF/${typeCode}/${year}/${month}/`;
    const searchPrefix = `TRF/${typeCode}/${year}/%`;
    
    const [latest] = await connection.execute(
        'SELECT reference_no FROM internal_transfers WHERE reference_no LIKE ? ORDER BY id DESC LIMIT 1',
        [searchPrefix]
    );
    
    let sequence = 1;
    if (latest.length > 0) {
        const parts = latest[0].reference_no.split('/');
        const lastSeqStr = parts[parts.length - 1];
        if (!isNaN(parseInt(lastSeqStr))) {
            sequence = parseInt(lastSeqStr) + 1;
        }
    }
    return `${prefix}${String(sequence).padStart(4, '0')}`;
};

// Helper: Adjust Stock in warehouse_stocks and product_locations
async function adjustWarehouseStock(connection, productId, warehouseId, qty, supplierId = null) {
    const qtyVal = Number(qty);
    if (qtyVal === 0) return;

    // 1. Update or Insert warehouse_stocks
    let wsQuery = 'SELECT id, qty_stock FROM warehouse_stocks WHERE product_id = ? AND warehouse_id = ?';
    let wsParams = [productId, warehouseId];
    if (supplierId !== null) {
        wsQuery += ' AND supplier_id = ?';
        wsParams.push(supplierId);
    } else {
        wsQuery += ' AND supplier_id IS NULL';
    }

    const [wsRows] = await connection.execute(wsQuery, wsParams);
    if (wsRows.length > 0) {
        await connection.execute(
            'UPDATE warehouse_stocks SET qty_stock = GREATEST(0, qty_stock + ?), updated_at = NOW() WHERE id = ?',
            [qtyVal, wsRows[0].id]
        );
    } else {
        await connection.execute(
            'INSERT INTO warehouse_stocks (product_id, warehouse_id, supplier_id, qty_stock, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
            [productId, warehouseId, supplierId, Math.max(0, qtyVal)]
        );
    }

    // 2. Update or Insert product_locations
    const [locRows] = await connection.execute(
        'SELECT id, stock FROM product_locations WHERE product_id = ? AND warehouse_id = ?',
        [productId, warehouseId]
    );
    if (locRows.length > 0) {
        await connection.execute(
            'UPDATE product_locations SET stock = GREATEST(0, stock + ?), updated_at = NOW() WHERE id = ?',
            [qtyVal, locRows[0].id]
        );
    } else {
        await connection.execute(
            'INSERT INTO product_locations (product_id, warehouse_id, aisle, stock, created_at, updated_at) VALUES (?, ?, "A1", ?, NOW(), NOW())',
            [productId, warehouseId, Math.max(0, qtyVal)]
        );
    }

    // 3. Sync products total quantity
    await connection.execute(
        'UPDATE products SET product_quantity = (SELECT COALESCE(SUM(qty_stock), 0) FROM warehouse_stocks WHERE product_id = ?), updated_at = NOW() WHERE id = ?',
        [productId, productId]
    );
}

// GET /api/internal-transfers
exports.getTransfers = async (req, res) => {
    try {
        const { transfer_type, status, search, from_warehouse_id, to_warehouse_id, limit = 50, page = 1 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT t.*, 
                   fw.name as from_warehouse_name, fw.short_name as from_warehouse_short,
                   tw.name as to_warehouse_name, tw.short_name as to_warehouse_short
            FROM internal_transfers t
            LEFT JOIN warehouses fw ON t.from_warehouse_id = fw.id
            LEFT JOIN warehouses tw ON t.to_warehouse_id = tw.id
            WHERE 1=1
        `;
        const params = [];

        if (transfer_type && transfer_type !== 'all') {
            query += ' AND t.transfer_type = ?';
            params.push(transfer_type);
        }
        if (status && status !== 'all') {
            query += ' AND t.status = ?';
            params.push(status);
        }
        if (from_warehouse_id) {
            query += ' AND t.from_warehouse_id = ?';
            params.push(from_warehouse_id);
        }
        if (to_warehouse_id) {
            query += ' AND t.to_warehouse_id = ?';
            params.push(to_warehouse_id);
        }
        if (search) {
            query += ' AND (t.reference_no LIKE ? OR t.notes LIKE ? OR t.source_reference LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY t.id DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [rows] = await db.query(query, params);

        // Fetch detail items for each transfer
        if (rows.length > 0) {
            const transferIds = rows.map(r => r.id);
            const [detailRows] = await db.query(`
                SELECT d.*, p.product_name, p.product_code, p.product_unit, p.std_packaging_qty, p.std_packaging_unit,
                       s.supplier_name
                FROM internal_transfer_details d
                JOIN products p ON d.product_id = p.id
                LEFT JOIN suppliers s ON d.supplier_id = s.id
                WHERE d.transfer_id IN (${transferIds.join(',')})
            `);

            for (const r of rows) {
                r.items = detailRows.filter(d => d.transfer_id === r.id);
            }
        }

        return res.json({ success: true, data: serialize(rows) });
    } catch (err) {
        console.error('getTransfers error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// GET /api/internal-transfers/:id
exports.getTransferById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute(`
            SELECT t.*, 
                   fw.name as from_warehouse_name, fw.short_name as from_warehouse_short,
                   tw.name as to_warehouse_name, tw.short_name as to_warehouse_short
            FROM internal_transfers t
            LEFT JOIN warehouses fw ON t.from_warehouse_id = fw.id
            LEFT JOIN warehouses tw ON t.to_warehouse_id = tw.id
            WHERE t.id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Data transfer internal tidak ditemukan.' });
        }

        const transfer = rows[0];
        const [items] = await db.execute(`
            SELECT d.*, p.product_name, p.product_code, p.product_unit, p.std_packaging_qty, p.std_packaging_unit,
                   s.supplier_name
            FROM internal_transfer_details d
            JOIN products p ON d.product_id = p.id
            LEFT JOIN suppliers s ON d.supplier_id = s.id
            WHERE d.transfer_id = ?
        `, [id]);

        transfer.items = items;
        return res.json({ success: true, data: serialize(transfer) });
    } catch (err) {
        console.error('getTransferById error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// POST /api/internal-transfers
// Create Outbound Transfer Slip (e.g. Produksi ke QC Gate, Store ke Produksi, Produksi ke Crusher, Produksi ke MATKOM)
exports.createTransfer = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const {
            transfer_type,
            type_code = 'TRF',
            from_warehouse_id,
            to_warehouse_id,
            source_document_id = null,
            source_reference = null,
            transferred_by = 'Operator',
            transfer_date = new Date().toISOString().split('T')[0],
            notes = '',
            items = []
        } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'Minimal harus menyertakan 1 item produk.' });
        }

        const reference_no = await exports.generateTransferReference(connection, type_code);

        const [insertHeader] = await connection.execute(`
            INSERT INTO internal_transfers 
            (reference_no, transfer_type, from_warehouse_id, to_warehouse_id, source_document_id, source_reference,
             status, transferred_by, transfer_date, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, NOW(), NOW())
        `, [
            reference_no,
            transfer_type,
            from_warehouse_id || null,
            to_warehouse_id || null,
            source_document_id,
            source_reference,
            transferred_by,
            transfer_date,
            notes
        ]);

        const transferId = insertHeader.insertId;

        for (const item of items) {
            const qtySent = Number(item.qty_sent || item.quantity || 0);
            const packageType = item.package_type || 'Standard';
            const packageCount = Number(item.package_count || 1);
            const unit = item.unit || 'PCS';

            await connection.execute(`
                INSERT INTO internal_transfer_details
                (transfer_id, product_id, supplier_id, qty_sent, package_type, package_count, unit, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [
                transferId,
                item.product_id,
                item.supplier_id || null,
                qtySent,
                packageType,
                packageCount,
                unit,
                item.notes || ''
            ]);

            // Deduct stock from origin warehouse if from_warehouse_id is specified
            if (from_warehouse_id) {
                await adjustWarehouseStock(connection, item.product_id, from_warehouse_id, -qtySent, item.supplier_id || null);
            }
        }

        await connection.commit();
        return res.status(201).json({
            success: true,
            message: `Slip serah-terima (${reference_no}) berhasil dibuat dan siap diverifikasi penerima.`,
            id: transferId,
            reference_no
        });
    } catch (err) {
        await connection.rollback();
        console.error('createTransfer error:', err);
        return res.status(500).json({ message: err.message });
    } finally {
        connection.release();
    }
};

// POST /api/internal-transfers/:id/receive
// Confirm Checksheet Receipt & Increment Target Warehouse Stock
exports.receiveTransfer = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const {
            received_by = 'Staff Gudang / QC',
            received_date = new Date().toISOString().split('T')[0],
            checksheet_data = {},
            notes = '',
            items = [] // array of { id: detailId, qty_received, qty_rejected }
        } = req.body;

        const [tRows] = await connection.execute('SELECT * FROM internal_transfers WHERE id = ?', [id]);
        if (tRows.length === 0) {
            return res.status(404).json({ message: 'Data transfer internal tidak ditemukan.' });
        }
        const transfer = tRows[0];

        if (transfer.status === 'Received') {
            return res.status(400).json({ message: 'Transfer ini sudah dikonfirmasi penerimaannya sebelumnya.' });
        }

        // Fetch detail items
        const [details] = await connection.execute('SELECT * FROM internal_transfer_details WHERE transfer_id = ?', [id]);

        for (const detail of details) {
            const inputItem = items.find(it => String(it.id) === String(detail.id));
            const qtyReceived = inputItem !== undefined ? Number(inputItem.qty_received) : Number(detail.qty_sent);
            const qtyRejected = inputItem !== undefined ? Number(inputItem.qty_rejected || 0) : 0;

            await connection.execute(`
                UPDATE internal_transfer_details 
                SET qty_received = ?, qty_rejected = ?, updated_at = NOW() 
                WHERE id = ?
            `, [qtyReceived, qtyRejected, detail.id]);

            // Increment stock in target warehouse for qtyReceived
            if (transfer.to_warehouse_id && qtyReceived > 0) {
                await adjustWarehouseStock(connection, detail.product_id, transfer.to_warehouse_id, qtyReceived, detail.supplier_id || null);
            }
        }

        // Update transfer header status to Received
        await connection.execute(`
            UPDATE internal_transfers
            SET status = 'Received',
                received_by = ?,
                received_date = ?,
                checksheet_data = ?,
                notes = CONCAT(COALESCE(notes, ''), ' | Receipt Note: ', ?),
                updated_at = NOW()
            WHERE id = ?
        `, [
            received_by,
            received_date,
            JSON.stringify(checksheet_data),
            notes || '-',
            id
        ]);

        await connection.commit();
        return res.json({
            success: true,
            message: `Konfirmasi serah-terima ${transfer.reference_no} berhasil dicatat, dan stok gudang tujuan telah bertambah!`
        });
    } catch (err) {
        await connection.rollback();
        console.error('receiveTransfer error:', err);
        return res.status(500).json({ message: err.message });
    } finally {
        connection.release();
    }
};

// GET /api/internal-transfers/sj-balikan
exports.getSuratJalanBalikan = async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT sjb.*, sj.reference as sj_reference, c.name as customer_name
            FROM sj_balikan_logs sjb
            LEFT JOIN surat_jalan sj ON sjb.surat_jalan_id = sj.id
            LEFT JOIN customers c ON sjb.customer_id = c.id
            WHERE 1=1
        `;
        const params = [];
        if (search) {
            query += ' AND (sjb.reference_no LIKE ? OR sjb.surat_jalan_ref LIKE ? OR sjb.driver_name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        query += ' ORDER BY sjb.id DESC LIMIT 100';
        const [rows] = await db.query(query, params);
        return res.json({ success: true, data: serialize(rows) });
    } catch (err) {
        console.error('getSuratJalanBalikan error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// POST /api/internal-transfers/sj-balikan
exports.createSuratJalanBalikan = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const {
            surat_jalan_id,
            surat_jalan_ref,
            customer_id,
            driver_name,
            vehicle_no,
            return_date = new Date().toISOString().split('T')[0],
            status = 'Received_Full',
            received_by = 'Staff Delivery',
            checksheet_notes = '',
            return_items = [] // items that were rejected/returned back to FG
        } = req.body;

        const now = new Date();
        const year   = now.getFullYear().toString().slice(-2);
        const month = String(now.getMonth()+1).padStart(2,'0');
        const [latest] = await connection.execute(
            'SELECT reference_no FROM sj_balikan_logs WHERE reference_no LIKE ? ORDER BY id DESC LIMIT 1',
            [`SJB/WFG-DEL/${year}/%`]
        );
        let seq = 1;
        if (latest.length > 0) {
            const parts = latest[0].reference_no.split('/');
            const num = parseInt(parts[parts.length - 1]);
            if (!isNaN(num)) seq = num + 1;
        }
        const reference_no = `SJB/WFG-DEL/${year}/${month}/${String(seq).padStart(4, '0')}`;

        await connection.execute(`
            INSERT INTO sj_balikan_logs
            (reference_no, surat_jalan_id, surat_jalan_ref, customer_id, driver_name, vehicle_no, return_date, status, received_by, checksheet_notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            reference_no,
            surat_jalan_id || null,
            surat_jalan_ref || reference_no,
            customer_id || null,
            driver_name || '-',
            vehicle_no || '-',
            return_date,
            status,
            received_by,
            checksheet_notes
        ]);

        // If there are return items that came back to warehouse FG (warehouse_id = 3)
        for (const item of return_items) {
            const qtyReturned = Number(item.qty || 0);
            if (qtyReturned > 0) {
                await adjustWarehouseStock(connection, item.product_id, 3, qtyReturned, null);
            }
        }

        await connection.commit();
        return res.status(201).json({
            success: true,
            message: `Penerimaan Surat Jalan Balikan (${reference_no}) berhasil dicatat!`,
            reference_no
        });
    } catch (err) {
        await connection.rollback();
        console.error('createSuratJalanBalikan error:', err);
        return res.status(500).json({ message: err.message });
    } finally {
        connection.release();
    }
};

// =============================================
// GET /internal-transfers/regrind-products
// Returns all Raw Material (category_id=18) products for crusher/regrind usage
// without userScope restriction - accessible to any authenticated user
// =============================================
exports.getRegrindProducts = async (req, res) => {
    try {
        const { search } = req.query;
        let conditions = ["(p.category_id = 18 OR p.product_type = 'Crusher')"];
        const params = [];

        if (search && search !== 'undefined') {
            conditions.push('(p.product_name LIKE ? OR p.product_code LIKE ?)');
            const s = `%${search}%`;
            params.push(s, s);
        }

        const [rows] = await db.execute(`
            SELECT p.id, p.product_code, p.product_name, p.product_type, p.product_unit,
                   p.category_id, c.category_name,
                   COALESCE(
                     (SELECT SUM(ws.qty_stock) FROM warehouse_stocks ws WHERE ws.product_id = p.id),
                     0
                   ) as total_stock
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE ${conditions.join(' AND ')}
            ORDER BY (CASE WHEN p.product_type = 'Crusher' THEN 0 ELSE 1 END), p.product_name ASC
        `, params);

        return res.json({
            success: true,
            data: rows,
            total: rows.length
        });
    } catch (err) {
        console.error('getRegrindProducts error:', err);
        return res.status(500).json({ message: err.message });
    }
};

