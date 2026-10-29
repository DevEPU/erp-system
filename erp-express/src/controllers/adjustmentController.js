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

exports.generateADJReference = async function (connection) {
    const now = new Date();
    const year  = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth()+1).padStart(2,'0');
    const prefix = `ADJ/MAT-EPU/${year}/${month}/`;
    const globalYearPrefix = `ADJ/MAT-EPU/${year}/%`;
    
    const [latest] = await connection.execute(
        'SELECT reference FROM adjustments WHERE reference LIKE ? ORDER BY id DESC LIMIT 1',
        [globalYearPrefix]
    );
    
    let sequence = 1;
    if (latest.length > 0) {
        const lastRef = latest[0].reference;
        const parts = lastRef.split('/');
        const lastSeqStr = parts[parts.length - 1];
        if (lastSeqStr.length === 4 && !isNaN(parseInt(lastSeqStr))) {
            sequence = parseInt(lastSeqStr) + 1;
        } else {
            sequence = 1;
        }
    }
    return `${prefix}${String(sequence).padStart(4, '0')}`;
};

exports.getAdjustments = async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT adj.* 
            FROM adjustments adj
        `;
        let params = [];
        if (search) {
            query += ' WHERE adj.reference LIKE ? OR adj.note LIKE ?';
            params.push(`%${search}%`, `%${search}%`);
        }
        query += ' ORDER BY adj.id DESC';
        const [rows] = await db.query(query, params);
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAdjustmentDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const [adjRows] = await db.execute(`
            SELECT adj.* 
            FROM adjustments adj
            WHERE adj.id = ?`, [id]);
        
        if (adjRows.length === 0) return res.status(404).json({ message: 'Adjustment not found' });
        
        const adj = adjRows[0];

        // Fetch detail items
        const [details] = await db.execute(`
            SELECT ap.*, p.product_name, p.product_code, p.product_unit
            FROM adjusted_products ap
            JOIN products p ON ap.product_id = p.id
            WHERE ap.adjustment_id = ?`, [id]);

        return res.json({
            success: true,
            data: serialize({
                ...adj,
                details
            })
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createAdjustment = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { date, note, items, warehouse_id } = req.body;
        const defaultWhId = Number(warehouse_id || 1);

        const reference = await exports.generateADJReference(connection);

        const [adjResult] = await connection.execute(
            `INSERT INTO adjustments (reference, date, note, created_at, updated_at)
             VALUES (?, ?, ?, NOW(), NOW())`,
            [reference, date || new Date(), note || '']
        );
        const adjustmentId = adjResult.insertId;

        if (items && items.length > 0) {
            for (const item of items) {
                const targetWhId = Number(item.warehouse_id || defaultWhId);

                await connection.execute(
                    `INSERT INTO adjusted_products (adjustment_id, product_id, quantity, type, created_at, updated_at)
                     VALUES (?, ?, ?, ?, NOW(), NOW())`,
                    [adjustmentId, item.product_id, item.quantity, item.type]
                );

                // Fetch product information (supplier, category, price)
                const [prodRows] = await connection.execute(
                    `SELECT p.id, p.supplier_id, p.category_id, p.product_price, ps.supplier_id as ps_supplier_id 
                     FROM products p 
                     LEFT JOIN product_suppliers ps ON p.id = ps.product_id 
                     WHERE p.id = ? LIMIT 1`,
                    [item.product_id]
                );

                const productInfo = prodRows[0] || {};
                const targetSupplierId = item.supplier_id !== undefined
                    ? item.supplier_id
                    : (productInfo.supplier_id || productInfo.ps_supplier_id || null);

                const qtyVal = Number(item.quantity);
                const difference = item.type === 'addition' ? qtyVal : -qtyVal;
                const unitPrice = Number(productInfo.product_price || 0);

                // 1. Update or Insert warehouse_stocks for target warehouse
                let wsQuery = 'SELECT id, qty_stock, hpp FROM warehouse_stocks WHERE product_id = ? AND warehouse_id = ?';
                let wsParams = [item.product_id, targetWhId];
                if (targetSupplierId !== null) {
                    wsQuery += ' AND (supplier_id = ? OR supplier_id IS NULL)';
                    wsParams.push(targetSupplierId);
                } else {
                    wsQuery += ' AND supplier_id IS NULL';
                }

                const [stockRows] = await connection.execute(wsQuery, wsParams);

                if (stockRows.length > 0) {
                    // Update the existing row (prefer matching supplier row if found)
                    const exactRow = stockRows.find(r => targetSupplierId !== null ? String(r.supplier_id) === String(targetSupplierId) : r.supplier_id === null) || stockRows[0];
                    await connection.execute(
                        `UPDATE warehouse_stocks 
                         SET qty_stock = GREATEST(0, qty_stock + ?), 
                             supplier_id = COALESCE(supplier_id, ?),
                             hpp = CASE WHEN hpp = 0 THEN ? ELSE hpp END,
                             updated_at = NOW() 
                         WHERE id = ?`,
                        [difference, targetSupplierId, unitPrice, exactRow.id]
                    );
                } else {
                    await connection.execute(
                        `INSERT INTO warehouse_stocks (product_id, warehouse_id, supplier_id, qty_stock, hpp, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
                        [item.product_id, targetWhId, targetSupplierId, Math.max(0, difference), unitPrice]
                    );
                }

                // 2. Update or Insert product_locations for target warehouse
                const [locRows] = await connection.execute(
                    `SELECT id, stock FROM product_locations WHERE product_id = ? AND warehouse_id = ?`,
                    [item.product_id, targetWhId]
                );

                if (locRows.length > 0) {
                    await connection.execute(
                        `UPDATE product_locations SET stock = GREATEST(0, stock + ?), updated_at = NOW() WHERE id = ?`,
                        [difference, locRows[0].id]
                    );
                } else {
                    await connection.execute(
                        `INSERT INTO product_locations (product_id, warehouse_id, aisle, stock, created_at, updated_at)
                         VALUES (?, ?, 'A1', ?, NOW(), NOW())`,
                        [item.product_id, targetWhId, Math.max(0, difference)]
                    );
                }

                // 3. Update products global stock synchronized to the sum of all warehouse_stocks
                await connection.execute(
                    `UPDATE products 
                     SET product_quantity = (SELECT COALESCE(SUM(qty_stock), 0) FROM warehouse_stocks WHERE product_id = ?),
                         updated_at = NOW() 
                     WHERE id = ?`,
                    [item.product_id, item.product_id]
                );
            }
        }

        await connection.commit();
        return res.status(201).json({ success: true, message: 'Stock adjustment created successfully', id: adjustmentId, reference });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};
