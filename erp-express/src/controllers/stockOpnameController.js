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

exports.generateSTOReference = async function (connection, departmentId) {
    let deptCode = 'MAT';
    if (departmentId) {
        const [depts] = await connection.execute('SELECT department_code FROM departments WHERE id = ?', [departmentId]);
        if (depts.length > 0 && depts[0].department_code) deptCode = depts[0].department_code;
    }
    const now = new Date();
    const year  = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth()+1).padStart(2,'0');
    const prefix = `STO/${deptCode}-EPU/${year}/${month}/`;
    const globalYearPrefix = `STO/${deptCode}-EPU/${year}/%`;
    
    const [latest] = await connection.execute(
        'SELECT reference FROM stock_opnames WHERE reference LIKE ? ORDER BY id DESC LIMIT 1',
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

exports.getStockOpnames = async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT sto.*, COALESCE(w.name, 'Semua Gudang') as warehouse_name, COALESCE(w.short_name, 'ALL') as warehouse_short_name,
                   d.department_name, d.department_code,
                   cat.category_name, cat.category_code,
                   coa.name as coa_name, coa.code as coa_code
            FROM stock_opnames sto
            LEFT JOIN warehouses w ON sto.warehouse_id = w.id
            LEFT JOIN departments d ON sto.department_id = d.id
            LEFT JOIN categories cat ON sto.category_id = cat.id
            LEFT JOIN chart_of_accounts coa ON sto.coa_id = coa.id
        `;
        let params = [];
        if (search) {
            query += ' WHERE sto.reference LIKE ? OR w.name LIKE ? OR d.department_name LIKE ?';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        query += ' ORDER BY sto.id DESC';
        const [rows] = await db.query(query, params);
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getStockOpnameDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const [stoRows] = await db.execute(`
            SELECT sto.*, COALESCE(w.name, 'Semua Gudang') as warehouse_name, COALESCE(w.short_name, 'ALL') as warehouse_short_name,
                   d.department_name, d.department_code,
                   cat.category_name, cat.category_code,
                   coa.name as coa_name, coa.code as coa_code
            FROM stock_opnames sto
            LEFT JOIN warehouses w ON sto.warehouse_id = w.id
            LEFT JOIN departments d ON sto.department_id = d.id
            LEFT JOIN categories cat ON sto.category_id = cat.id
            LEFT JOIN chart_of_accounts coa ON sto.coa_id = coa.id
            WHERE sto.id = ?`, [id]);
        
        if (stoRows.length === 0) return res.status(404).json({ message: 'Stock Opname not found' });
        
        const sto = stoRows[0];

        // Fetch detail items
        const [details] = await db.execute(`
            SELECT sod.*, p.product_name, p.product_code, p.product_unit, p.product_price, s.supplier_name
            FROM stock_opname_details sod
            JOIN products p ON sod.product_id = p.id
            LEFT JOIN suppliers s ON sod.supplier_id = s.id
            WHERE sod.opname_id = ?
            ORDER BY p.product_name ASC`, [id]);

        return res.json({
            success: true,
            data: serialize({
                ...sto,
                details
            })
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Auto-generate system stock items based on warehouse configuration
// If warehouse or category is not specified, returns all products across system
exports.loadSystemStockForOpname = async (req, res) => {
    try {
        const { warehouse_id, category_id } = req.query;

        // Fetch products (filtered by category if specified, otherwise all)
        let productQuery = 'SELECT id, product_name, product_code, product_unit, product_quantity, is_mandatory, is_asset FROM products';
        const queryParams = [];
        if (category_id && category_id !== '' && category_id !== 'all') {
            productQuery += ' WHERE category_id = ?';
            queryParams.push(Number(category_id));
        }
        productQuery += ' ORDER BY product_name ASC';
        const [products] = await db.query(productQuery, queryParams);

        // Fetch product_suppliers
        const [productSuppliers] = await db.query(`
            SELECT ps.*, s.supplier_name 
            FROM product_suppliers ps
            JOIN suppliers s ON ps.supplier_id = s.id
        `);

        const items = [];

        if (warehouse_id && warehouse_id !== '' && warehouse_id !== 'all') {
            // Fetch stocks for this specific warehouse
            const [warehouseStocks] = await db.query(`
                SELECT * FROM warehouse_stocks WHERE warehouse_id = ?
            `, [Number(warehouse_id)]);

            for (const p of products) {
                const suppliersForProduct = productSuppliers.filter(ps => String(ps.product_id) === String(p.id));

                // Gudang MATKOM (ID 1) - Per-vendor if mapped, otherwise Parent-only
                if (Number(warehouse_id) === 1 && suppliersForProduct.length > 0) {
                    for (const ps of suppliersForProduct) {
                        const ws = warehouseStocks.find(ws => String(ws.product_id) === String(p.id) && String(ws.supplier_id) === String(ps.supplier_id));
                        const currentStock = ws ? Number(ws.qty_stock) : 0;
                        items.push({
                            product_id: p.id,
                            product_name: `${p.product_name} (${ps.supplier_name})`,
                            product_code: ps.supplier_part_number || p.product_code,
                            product_unit: p.product_unit,
                            supplier_id: ps.supplier_id,
                            supplier_name: ps.supplier_name,
                            qty_system: currentStock,
                            qty_physical: currentStock
                        });
                    }
                } else {
                    const ws = warehouseStocks.find(ws => String(ws.product_id) === String(p.id) && ws.supplier_id === null);
                    const currentStock = ws ? Number(ws.qty_stock) : 0;
                    items.push({
                        product_id: p.id,
                        product_name: p.product_name,
                        product_code: p.product_code,
                        product_unit: p.product_unit,
                        supplier_id: null,
                        supplier_name: null,
                        qty_system: currentStock,
                        qty_physical: currentStock
                    });
                }
            }
        } else {
            // No warehouse selected (All Warehouses):
            // Return all products, using product_quantity from products as total system qty
            for (const p of products) {
                const currentStock = Number(p.product_quantity || 0);
                items.push({
                    product_id: p.id,
                    product_name: p.product_name,
                    product_code: p.product_code,
                    product_unit: p.product_unit,
                    supplier_id: null,
                    supplier_name: null,
                    qty_system: currentStock,
                    qty_physical: currentStock
                });
            }
        }

        return res.json({ success: true, data: serialize(items) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createStockOpname = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { date, warehouse_id, note, items, department_id, category_id, coa_id } = req.body;

        const reference = req.body.reference && req.body.reference !== ''
            ? req.body.reference
            : await exports.generateSTOReference(connection, department_id);

        const [stoResult] = await connection.execute(
            `INSERT INTO stock_opnames (reference, date, warehouse_id, status, note, department_id, category_id, coa_id, created_at, updated_at)
             VALUES (?, ?, ?, 'Draft', ?, ?, ?, ?, NOW(), NOW())`,
            [
                reference, 
                date || new Date(), 
                warehouse_id ? Number(warehouse_id) : null, 
                note || '',
                department_id ? Number(department_id) : null,
                category_id ? Number(category_id) : null,
                coa_id ? Number(coa_id) : null
            ]
        );
        const opnameId = stoResult.insertId;

        if (items && items.length > 0) {
            for (const item of items) {
                const diff = Number(item.qty_physical) - Number(item.qty_system);
                await connection.execute(
                    `INSERT INTO stock_opname_details (opname_id, product_id, supplier_id, qty_system, qty_physical, qty_difference, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                    [opnameId, item.product_id, item.supplier_id || null, item.qty_system, item.qty_physical, diff]
                );
            }
        }

        await connection.commit();
        return res.status(201).json({ success: true, message: 'Stock Opname created successfully', id: opnameId, reference });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.updateStockOpname = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { date, warehouse_id, note, items, department_id, category_id, coa_id, reference } = req.body;

        // Fetch STO header
        const [stoRows] = await connection.execute('SELECT * FROM stock_opnames WHERE id = ?', [id]);
        if (stoRows.length === 0) throw new Error('Stock Opname tidak ditemukan');
        const sto = stoRows[0];

        if (sto.status === 'Adjusted') {
            throw new Error('Stock Opname sudah direkonsiliasi (Adjusted) dan tidak dapat diedit kembali.');
        }

        // Update header
        await connection.execute(
            `UPDATE stock_opnames 
             SET reference = ?, date = ?, warehouse_id = ?, note = ?, 
                 department_id = ?, category_id = ?, coa_id = ?, updated_at = NOW()
             WHERE id = ?`,
            [
                reference || sto.reference,
                date || sto.date,
                warehouse_id ? Number(warehouse_id) : null,
                note || '',
                department_id ? Number(department_id) : null,
                category_id ? Number(category_id) : null,
                coa_id ? Number(coa_id) : null,
                id
            ]
        );

        // Delete old details
        await connection.execute('DELETE FROM stock_opname_details WHERE opname_id = ?', [id]);

        // Insert updated details
        if (items && items.length > 0) {
            for (const item of items) {
                const diff = Number(item.qty_physical) - Number(item.qty_system);
                await connection.execute(
                    `INSERT INTO stock_opname_details (opname_id, product_id, supplier_id, qty_system, qty_physical, qty_difference, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                    [id, item.product_id, item.supplier_id || null, item.qty_system, item.qty_physical, diff]
                );
            }
        }

        await connection.commit();
        return res.json({ success: true, message: 'Draft Stock Opname berhasil diperbarui!' });
    } catch (error) {
        await connection.rollback();
        console.error('Update STO Error:', error);
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.deleteStockOpname = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        const [stoRows] = await connection.execute('SELECT * FROM stock_opnames WHERE id = ?', [id]);
        if (stoRows.length === 0) throw new Error('Stock Opname tidak ditemukan');
        const sto = stoRows[0];

        if (sto.status === 'Adjusted') {
            throw new Error('Stock Opname sudah direkonsiliasi dan tidak dapat dihapus.');
        }

        await connection.execute('DELETE FROM stock_opname_details WHERE opname_id = ?', [id]);
        await connection.execute('DELETE FROM stock_opnames WHERE id = ?', [id]);

        await connection.commit();
        return res.json({ success: true, message: 'Draft Stock Opname berhasil dihapus!' });
    } catch (error) {
        await connection.rollback();
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.adjustStockOpname = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        // Fetch STO header & details
        const [stoRows] = await connection.execute('SELECT * FROM stock_opnames WHERE id = ?', [id]);
        if (stoRows.length === 0) throw new Error('Stock Opname not found');
        const sto = stoRows[0];

        if (sto.status === 'Adjusted') throw new Error('Stock Opname is already adjusted');

        const [details] = await connection.execute('SELECT * FROM stock_opname_details WHERE opname_id = ?', [id]);
        if (details.length === 0) throw new Error('Stock Opname has no details/items');

        // Apply physical count to warehouse_stocks directly (if warehouse_id is specified)
        for (const item of details) {
            const finalSupplierId = item.supplier_id || null;

            if (sto.warehouse_id) {
                // Check if stock row exists for this warehouse & product & supplier
                const [stockRows] = await connection.execute(
                    `SELECT id, qty_stock FROM warehouse_stocks 
                     WHERE product_id = ? AND warehouse_id = ? 
                     AND (supplier_id = ? OR (supplier_id IS NULL AND ? IS NULL))`,
                    [item.product_id, sto.warehouse_id, finalSupplierId, finalSupplierId]
                );

                if (stockRows.length > 0) {
                    await connection.execute(
                        `UPDATE warehouse_stocks SET qty_stock = ?, updated_at = NOW() WHERE id = ?`,
                        [item.qty_physical, stockRows[0].id]
                    );
                } else {
                    await connection.execute(
                        `INSERT INTO warehouse_stocks (product_id, warehouse_id, supplier_id, qty_stock, created_at, updated_at)
                         VALUES (?, ?, ?, ?, NOW(), NOW())`,
                        [item.product_id, sto.warehouse_id, finalSupplierId, item.qty_physical]
                    );
                }
            }

            // Adjust global products.product_quantity using the calculated difference
            const difference = Number(item.qty_difference);
            await connection.execute(
                `UPDATE products SET product_quantity = GREATEST(0, product_quantity + ?) WHERE id = ?`,
                [difference, item.product_id]
            );
        }

        // Mark STO as Adjusted
        await connection.execute(
            `UPDATE stock_opnames SET status = 'Adjusted', updated_at = NOW() WHERE id = ?`,
            [id]
        );

        await connection.commit();
        return res.json({ success: true, message: 'Stock Opname adjusted successfully. System inventory reconciled!' });
    } catch (error) {
        await connection.rollback();
        console.error('Adjust STO Error:', error);
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
};
