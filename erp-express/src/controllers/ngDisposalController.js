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

// Generate NG Disposal Reference
async function generateDisposalReference(connection, typeCode) {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `NG/${typeCode}/${year}/${month}/`;
    const searchPrefix = `NG/${typeCode}/${year}/%`;

    const [latest] = await connection.execute(
        'SELECT reference_no FROM ng_disposals WHERE reference_no LIKE ? ORDER BY id DESC LIMIT 1',
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
}

// Helper: Adjust Stock in warehouse_stocks and product_locations with condition
async function adjustWarehouseStockWithCondition(connection, productId, warehouseId, qty, condition = 'OK', supplierId = null) {
    const qtyVal = Number(qty);
    if (qtyVal === 0) return;

    // 1. Update or Insert warehouse_stocks with condition
    let wsQuery = 'SELECT id, qty_stock FROM warehouse_stocks WHERE product_id = ? AND warehouse_id = ? AND stock_condition = ?';
    let wsParams = [productId, warehouseId, condition];
    if (supplierId !== null) {
        wsQuery += ' AND supplier_id = ?';
        wsParams.push(supplierId);
    } else {
        wsQuery += ' AND (supplier_id IS NULL OR supplier_id = 0)';
    }

    const [wsRows] = await connection.execute(wsQuery, wsParams);
    if (wsRows.length > 0) {
        await connection.execute(
            'UPDATE warehouse_stocks SET qty_stock = GREATEST(0, qty_stock + ?), updated_at = NOW() WHERE id = ?',
            [qtyVal, wsRows[0].id]
        );
    } else if (qtyVal > 0) {
        await connection.execute(
            'INSERT INTO warehouse_stocks (product_id, warehouse_id, supplier_id, qty_stock, stock_condition, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
            [productId, warehouseId, supplierId, Math.max(0, qtyVal), condition]
        );
    }

    // 2. Update product_locations
    const [locRows] = await connection.execute(
        'SELECT id, stock FROM product_locations WHERE product_id = ? AND warehouse_id = ?',
        [productId, warehouseId]
    );
    if (locRows.length > 0) {
        await connection.execute(
            'UPDATE product_locations SET stock = GREATEST(0, stock + ?), updated_at = NOW() WHERE id = ?',
            [qtyVal, locRows[0].id]
        );
    } else if (qtyVal > 0) {
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

// ============================================
// GET /api/ng-disposals — List semua NG Disposals
// ============================================
exports.getDisposals = async (req, res) => {
    try {
        const { disposal_type, status, source_type, action_taken, search, limit = 50, page = 1 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT d.*, 
                   p.product_name, p.product_code, p.product_unit, p.product_type,
                   wo.reference as wo_reference,
                   rp.product_name as regrind_product_name, rp.product_code as regrind_product_code
            FROM ng_disposals d
            JOIN products p ON d.product_id = p.id
            LEFT JOIN work_orders wo ON d.work_order_id = wo.id
            LEFT JOIN products rp ON d.regrind_product_id = rp.id
            WHERE 1=1
        `;
        const params = [];

        if (disposal_type && disposal_type !== 'all') {
            query += ' AND d.disposal_type = ?';
            params.push(disposal_type);
        }
        if (status && status !== 'all') {
            query += ' AND d.status = ?';
            params.push(status);
        }
        if (source_type && source_type !== 'all') {
            query += ' AND d.source_type = ?';
            params.push(source_type);
        }
        if (action_taken && action_taken !== 'all') {
            query += ' AND d.action_taken = ?';
            params.push(action_taken);
        }
        if (search) {
            query += ' AND (d.reference_no LIKE ? OR p.product_name LIKE ? OR wo.reference LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY d.id DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [rows] = await db.query(query, params);

        // Count total
        let countQuery = 'SELECT COUNT(*) as total FROM ng_disposals d JOIN products p ON d.product_id = p.id LEFT JOIN work_orders wo ON d.work_order_id = wo.id WHERE 1=1';
        const countParams = [];
        if (disposal_type && disposal_type !== 'all') {
            countQuery += ' AND d.disposal_type = ?';
            countParams.push(disposal_type);
        }
        if (status && status !== 'all') {
            countQuery += ' AND d.status = ?';
            countParams.push(status);
        }
        if (source_type && source_type !== 'all') {
            countQuery += ' AND d.source_type = ?';
            countParams.push(source_type);
        }
        if (action_taken && action_taken !== 'all') {
            countQuery += ' AND d.action_taken = ?';
            countParams.push(action_taken);
        }
        if (search) {
            countQuery += ' AND (d.reference_no LIKE ? OR p.product_name LIKE ? OR wo.reference LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        const [[{ total }]] = await db.query(countQuery, countParams);

        return res.json({ success: true, data: serialize(rows), total });
    } catch (err) {
        console.error('getDisposals error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// ============================================
// GET /api/ng-disposals/:id — Detail Disposal
// ============================================
exports.getDisposalById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute(`
            SELECT d.*, 
                   p.product_name, p.product_code, p.product_unit, p.product_type,
                   wo.reference as wo_reference, wo.target_qty as wo_target_qty,
                   wo.parent_product_id as wo_product_id,
                   wp.product_name as wo_product_name,
                   rp.product_name as regrind_product_name, rp.product_code as regrind_product_code,
                   po.qty_ok as production_qty_ok, po.qty_ng as production_qty_ng, po.ng_type as production_ng_type
            FROM ng_disposals d
            JOIN products p ON d.product_id = p.id
            LEFT JOIN work_orders wo ON d.work_order_id = wo.id
            LEFT JOIN products wp ON wo.parent_product_id = wp.id
            LEFT JOIN products rp ON d.regrind_product_id = rp.id
            LEFT JOIN production_outputs po ON d.source_id = po.id AND d.source_type = 'Production'
            WHERE d.id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Data NG disposal tidak ditemukan.' });
        }

        return res.json({ success: true, data: serialize(rows[0]) });
    } catch (err) {
        console.error('getDisposalById error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// ============================================
// POST /api/ng-disposals/from-production — Buat Disposal dari Produksi NG
// ============================================
exports.createFromProduction = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { production_output_id, work_order_id, product_id, qty, reason, action_taken, notes } = req.body;

        if (!production_output_id || !product_id || !qty || !action_taken) {
            return res.status(400).json({ message: 'Harap isi semua field yang diperlukan.' });
        }

        // Validate production output exists
        const [poRows] = await connection.execute(
            'SELECT po.*, pro.wo_id FROM production_outputs po LEFT JOIN planning_produksi pro ON po.pro_id = pro.id WHERE po.id = ?',
            [production_output_id]
        );
        const resolvedWoId = work_order_id || poRows[0]?.wo_id || null;

        // Determine disposal type based on product type
        const [prodType] = await connection.execute('SELECT product_type FROM products WHERE id = ?', [product_id]);
        let disposalType = 'WIP_Crusher';
        if (action_taken === 'Disposed') {
            disposalType = prodType[0]?.product_type === 'Work in Progress' ? 'WIP_Disposal' : 'Material_Disposal';
        } else if (action_taken === 'Sent_To_Crusher') {
            disposalType = 'WIP_Crusher';
        } else if (action_taken === 'Returned_To_Vendor') {
            disposalType = 'Material_Disposal';
        }

        // Type code for reference
        const typeCodeMap = {
            'Sent_To_Crusher': 'CRS',
            'Disposed': 'DIS',
            'Returned_To_Vendor': 'VCL',
            'Rework': 'RWK',
            'Released_OK': 'REL'
        };
        const typeCode = typeCodeMap[action_taken] || 'DIS';
        const referenceNo = await generateDisposalReference(connection, typeCode);

        const [result] = await connection.execute(`
            INSERT INTO ng_disposals 
            (reference_no, disposal_type, source_type, source_id, work_order_id, product_id, qty, reason, action_taken, processed_by, processed_date, status, notes, created_at, updated_at)
            VALUES (?, ?, 'Production', ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'Pending', ?, NOW(), NOW())
        `, [
            referenceNo, disposalType, production_output_id, resolvedWoId,
            product_id, qty, reason || null, action_taken,
            req.user?.name || req.user?.username || 'System', notes || null
        ]);

        const disposalId = result.insertId;

        // If action is Sent_To_Crusher, auto-create an internal transfer
        if (action_taken === 'Sent_To_Crusher') {
            const internalTransferCtrl = require('./internalTransferController');
            const transferRef = await internalTransferCtrl.generateTransferReference(connection, 'PRC');

            const [transferResult] = await connection.execute(`
                INSERT INTO internal_transfers 
                (reference_no, transfer_type, from_warehouse_id, to_warehouse_id, source_document_id, source_reference, status, transferred_by, transfer_date, notes, created_at, updated_at)
                VALUES (?, 'PROD_TO_CRUSHER_NG', 2, 5, ?, ?, 'In_Transit', ?, CURDATE(), ?, NOW(), NOW())
            `, [
                transferRef, disposalId, referenceNo,
                req.user?.name || req.user?.username || 'System',
                `Transfer NG dari Produksi ke Crusher — ${reason || 'NG Product'}`
            ]);

            const transferId = transferResult.insertId;

            await connection.execute(`
                INSERT INTO internal_transfer_details 
                (transfer_id, product_id, qty_sent, unit, notes, created_at, updated_at)
                VALUES (?, ?, ?, 'Pcs', ?, NOW(), NOW())
            `, [transferId, product_id, qty, `NG dari WO: ${work_order_id || '-'}`]);

            // Update disposal with crusher transfer link
            await connection.execute(
                'UPDATE ng_disposals SET crusher_transfer_id = ?, status = "In_Progress" WHERE id = ?',
                [transferId, disposalId]
            );

            // Deduct stock from production warehouse (id=2)
            await adjustWarehouseStockWithCondition(connection, product_id, 2, -qty, 'NG');
        }

        // If action is Disposed, deduct stock and mark completed
        if (action_taken === 'Disposed') {
            await adjustWarehouseStockWithCondition(connection, product_id, 2, -qty, 'NG');
            await connection.execute(
                'UPDATE ng_disposals SET status = "Completed" WHERE id = ?',
                [disposalId]
            );
        }

        await connection.commit();
        return res.json({ success: true, message: 'Catatan NG disposal berhasil dibuat.', data: { id: disposalId, reference_no: referenceNo } });
    } catch (err) {
        await connection.rollback();
        console.error('createFromProduction error:', err);
        return res.status(500).json({ message: err.message });
    } finally {
        connection.release();
    }
};

// ============================================
// POST /api/ng-disposals/from-claim — Buat Disposal dari Customer Claim
// ============================================
exports.createFromClaim = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { customer_claim_id, product_id, item_type, qty, reason, action_taken, notes } = req.body;

        if (!customer_claim_id || !product_id || !qty || !action_taken) {
            return res.status(400).json({ message: 'Harap isi semua field yang diperlukan.' });
        }

        // Determine disposal type
        let disposalType;
        if (item_type === 'WIP' && action_taken === 'Sent_To_Crusher') disposalType = 'WIP_Crusher';
        else if (item_type === 'WIP' && action_taken === 'Disposed') disposalType = 'WIP_Disposal';
        else if (item_type === 'Component') disposalType = 'Component_Disposal';
        else disposalType = 'Material_Disposal';

        const typeCodeMap = {
            'Sent_To_Crusher': 'CLC',
            'Disposed': 'CLD',
            'Returned_To_Vendor': 'CLV',
            'Rework': 'CLR',
            'Released_OK': 'CLO'
        };
        const typeCode = typeCodeMap[action_taken] || 'CLD';
        const referenceNo = await generateDisposalReference(connection, typeCode);

        // Get WO link from claim if available
        const [claimRows] = await connection.execute('SELECT * FROM customer_claims WHERE id = ?', [customer_claim_id]);

        const [result] = await connection.execute(`
            INSERT INTO ng_disposals 
            (reference_no, disposal_type, source_type, source_id, work_order_id, product_id, qty, reason, action_taken, processed_by, processed_date, status, notes, created_at, updated_at)
            VALUES (?, ?, 'Customer_Claim', ?, NULL, ?, ?, ?, ?, ?, CURDATE(), 'Pending', ?, NOW(), NOW())
        `, [
            referenceNo, disposalType, customer_claim_id,
            product_id, qty, reason || null, action_taken,
            req.user?.name || req.user?.username || 'System', notes || null
        ]);

        const disposalId = result.insertId;

        // If action is Sent_To_Crusher, auto-create internal transfer
        if (action_taken === 'Sent_To_Crusher') {
            const internalTransferCtrl = require('./internalTransferController');
            const transferRef = await internalTransferCtrl.generateTransferReference(connection, 'CLC');

            const [transferResult] = await connection.execute(`
                INSERT INTO internal_transfers 
                (reference_no, transfer_type, from_warehouse_id, to_warehouse_id, source_document_id, source_reference, status, transferred_by, transfer_date, notes, created_at, updated_at)
                VALUES (?, 'CLAIM_WIP_TO_CRUSHER', 3, 5, ?, ?, 'In_Transit', ?, CURDATE(), ?, NOW(), NOW())
            `, [
                transferRef, disposalId, referenceNo,
                req.user?.name || req.user?.username || 'System',
                `Transfer WIP NG dari Claim ${claimRows[0]?.claim_code || '-'} ke Crusher`
            ]);

            const transferId = transferResult.insertId;

            await connection.execute(`
                INSERT INTO internal_transfer_details 
                (transfer_id, product_id, qty_sent, unit, notes, created_at, updated_at)
                VALUES (?, ?, ?, 'Pcs', ?, NOW(), NOW())
            `, [transferId, product_id, qty, `NG dari Claim: ${claimRows[0]?.claim_code || '-'}`]);

            await connection.execute(
                'UPDATE ng_disposals SET crusher_transfer_id = ?, status = "In_Progress" WHERE id = ?',
                [transferId, disposalId]
            );

            // Deduct quarantine stock from FG warehouse (id=3)
            await adjustWarehouseStockWithCondition(connection, product_id, 3, -qty, 'Quarantine');
        }

        if (action_taken === 'Disposed') {
            await adjustWarehouseStockWithCondition(connection, product_id, 3, -qty, 'Quarantine');
            await connection.execute(
                'UPDATE ng_disposals SET status = "Completed" WHERE id = ?',
                [disposalId]
            );
        }

        await connection.commit();
        return res.json({ success: true, message: 'Catatan NG disposal dari claim berhasil dibuat.', data: { id: disposalId, reference_no: referenceNo } });
    } catch (err) {
        await connection.rollback();
        console.error('createFromClaim error:', err);
        return res.status(500).json({ message: err.message });
    } finally {
        connection.release();
    }
};

// ============================================
// POST /api/ng-disposals/:id/process — Proses NG (Crusher selesai / Disposal confirm)
// ============================================
exports.processDisposal = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { regrind_product_id, qty_regrind_resin, notes } = req.body;

        const [rows] = await connection.execute('SELECT * FROM ng_disposals WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Data disposal tidak ditemukan.' });
        }
        const disposal = rows[0];

        if (disposal.status === 'Completed') {
            return res.status(400).json({ message: 'Disposal ini sudah selesai diproses.' });
        }

        // If it was sent to crusher, now the crusher result comes back
        if (disposal.action_taken === 'Sent_To_Crusher' && regrind_product_id) {
            // Create crusher log
            await connection.execute(`
                INSERT INTO crusher_logs 
                (production_output_id, component_product_id, qty_ng_component, action, qty_regrind_resin, work_order_id, disposal_id, source_type, regrind_product_id, created_at, updated_at)
                VALUES (?, ?, ?, 'Crushed and Returned to Matkom', ?, ?, ?, ?, ?, NOW(), NOW())
            `, [
                disposal.source_type === 'Production' ? disposal.source_id : null,
                disposal.product_id,
                disposal.qty,
                qty_regrind_resin || 0,
                disposal.work_order_id || null,
                disposal.id,
                disposal.source_type === 'Production' ? 'Production_NG' : 'Customer_Claim',
                regrind_product_id
            ]);

            // Add regrind resin to MATKOM stock (warehouse_id=1)
            if (qty_regrind_resin && qty_regrind_resin > 0) {
                await adjustWarehouseStockWithCondition(connection, regrind_product_id, 1, qty_regrind_resin, 'OK');
            }

            // Deduct from crusher warehouse (id=5) if transfer was received there
            if (disposal.crusher_transfer_id) {
                await connection.execute(
                    'UPDATE internal_transfers SET status = "Received", received_by = ?, received_date = CURDATE(), updated_at = NOW() WHERE id = ?',
                    [req.user?.name || req.user?.username || 'System', disposal.crusher_transfer_id]
                );
            }

            // Update disposal
            await connection.execute(
                'UPDATE ng_disposals SET regrind_product_id = ?, status = "Completed", notes = CONCAT(COALESCE(notes, ""), ?, ""), updated_at = NOW() WHERE id = ?',
                [regrind_product_id, notes ? `\n${notes}` : '', disposal.id]
            );
        } else {
            // Just mark as completed (for disposal / vendor claim etc)
            await connection.execute(
                'UPDATE ng_disposals SET status = "Completed", notes = CONCAT(COALESCE(notes, ""), ?, ""), updated_at = NOW() WHERE id = ?',
                [notes ? `\n${notes}` : '', disposal.id]
            );
        }

        await connection.commit();
        return res.json({ success: true, message: 'Proses NG disposal berhasil diselesaikan.' });
    } catch (err) {
        await connection.rollback();
        console.error('processDisposal error:', err);
        return res.status(500).json({ message: err.message });
    } finally {
        connection.release();
    }
};

// ============================================
// GET /api/ng-disposals/pending-crusher — List NG yang menunggu proses crusher
// ============================================
exports.getPendingCrusher = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT d.*, 
                   p.product_name, p.product_code, p.product_unit, p.product_type,
                   wo.reference as wo_reference,
                   t.reference_no as transfer_reference, t.status as transfer_status
            FROM ng_disposals d
            JOIN products p ON d.product_id = p.id
            LEFT JOIN work_orders wo ON d.work_order_id = wo.id
            LEFT JOIN internal_transfers t ON d.crusher_transfer_id = t.id
            WHERE d.action_taken = 'Sent_To_Crusher' AND d.status IN ('Pending', 'In_Progress')
            ORDER BY d.created_at DESC
        `);

        return res.json({ success: true, data: serialize(rows) });
    } catch (err) {
        console.error('getPendingCrusher error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// ============================================
// GET /api/ng-disposals/summary — Summary statistics
// ============================================
exports.getSummary = async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'In_Progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN action_taken = 'Sent_To_Crusher' THEN 1 ELSE 0 END) as crusher_count,
                SUM(CASE WHEN action_taken = 'Disposed' THEN 1 ELSE 0 END) as disposed_count,
                SUM(CASE WHEN action_taken = 'Returned_To_Vendor' THEN 1 ELSE 0 END) as vendor_claim_count,
                SUM(CASE WHEN source_type = 'Production' THEN 1 ELSE 0 END) as from_production,
                SUM(CASE WHEN source_type = 'Customer_Claim' THEN 1 ELSE 0 END) as from_claim
            FROM ng_disposals
        `);

        return res.json({ success: true, data: stats[0] });
    } catch (err) {
        console.error('getSummary error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// ============================================
// GET /api/ng-disposals/regrind-products — List available regrind products
// ============================================
exports.getRegrindProducts = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT id, product_name, product_code, product_unit, product_type
            FROM products 
            WHERE product_type = 'Crusher'
            ORDER BY product_name ASC
        `);

        return res.json({ success: true, data: serialize(rows) });
    } catch (err) {
        console.error('getRegrindProducts error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// ============================================
// GET /api/ng-disposals/available-production-ng — List production outputs with pending NG
// ============================================
exports.getAvailableProductionNg = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT po.id as production_output_id,
                   po.qty_ok, po.qty_ng, po.ng_type, po.ng_category, po.status as output_status, po.created_at,
                   pro.id as pro_id, pro.wo_id,
                   wo.reference as wo_reference,
                   COALESCE(p.id, wo_p.id) as product_id,
                   COALESCE(p.product_name, wo_p.product_name) as product_name,
                   COALESCE(p.product_code, wo_p.product_code) as product_code,
                   COALESCE(p.product_unit, wo_p.product_unit, 'Pcs') as product_unit,
                   COALESCE(p.product_type, wo_p.product_type) as product_type,
                   COALESCE(d.total_disposed, 0) as total_disposed,
                   (po.qty_ng - COALESCE(d.total_disposed, 0)) as remaining_ng
            FROM production_outputs po
            JOIN planning_produksi pro ON po.pro_id = pro.id
            LEFT JOIN products p ON pro.product_id = p.id
            LEFT JOIN work_orders wo ON pro.wo_id = wo.id
            LEFT JOIN products wo_p ON wo.parent_product_id = wo_p.id
            LEFT JOIN (
                SELECT source_id, SUM(qty) as total_disposed 
                FROM ng_disposals 
                WHERE source_type = 'Production'
                GROUP BY source_id
            ) d ON po.id = d.source_id
            WHERE po.qty_ng > 0
              AND (po.qty_ng - COALESCE(d.total_disposed, 0)) > 0
            ORDER BY po.id DESC
        `);
        return res.json({ success: true, data: serialize(rows) });
    } catch (err) {
        console.error('getAvailableProductionNg error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// ============================================
// GET /api/ng-disposals/crusher-logs — List crusher logs
// ============================================
exports.getCrusherLogs = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT cl.*,
                   p.product_name as original_product_name, p.product_code as original_product_code,
                   rp.product_name as regrind_product_name, rp.product_code as regrind_product_code,
                   wo.reference as wo_reference,
                   d.reference_no as disposal_reference
            FROM crusher_logs cl
            LEFT JOIN products p ON cl.component_product_id = p.id
            LEFT JOIN products rp ON cl.regrind_product_id = rp.id
            LEFT JOIN work_orders wo ON cl.work_order_id = wo.id
            LEFT JOIN ng_disposals d ON cl.disposal_id = d.id
            ORDER BY cl.id DESC
            LIMIT 100
        `);
        return res.json({ success: true, data: serialize(rows) });
    } catch (err) {
        console.error('getCrusherLogs error:', err);
        return res.status(500).json({ message: err.message });
    }
};

