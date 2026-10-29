const db = require('../config/db');

// Utility for BigInt serialization
const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
));

exports.getMolds = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT m.*, 
                   GROUP_CONCAT(p.product_name SEPARATOR ', ') as product_names,
                   GROUP_CONCAT(p.id SEPARATOR ',') as product_ids
            FROM molds m
            LEFT JOIN mold_products mp ON m.id = mp.mold_id
            LEFT JOIN products p ON mp.product_id = p.id
            GROUP BY m.id
            ORDER BY m.name ASC
        `);
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMoldProducts = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute(
            `SELECT p.id, p.product_code, p.product_name, p.product_type 
             FROM mold_products mp
             JOIN products p ON mp.product_id = p.id
             WHERE mp.mold_id = ?`,
            [id]
        );
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.addMoldProduct = async (req, res) => {
    const { id } = req.params; // mold_id
    const { product_id } = req.body;
    try {
        if (!product_id) {
            return res.status(400).json({ success: false, message: 'product_id is required' });
        }
        await db.execute(
            'INSERT IGNORE INTO mold_products (mold_id, product_id) VALUES (?, ?)',
            [id, product_id]
        );
        return res.json({ success: true, message: 'Product linked to mold successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteMoldProduct = async (req, res) => {
    const { id, productId } = req.params; // mold_id, product_id
    try {
        await db.execute(
            'DELETE FROM mold_products WHERE mold_id = ? AND product_id = ?',
            [id, productId]
        );
        return res.json({ success: true, message: 'Product unlinked from mold successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createMold = async (req, res) => {
    const { code, name, description, is_active, product_ids } = req.body;
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
        if (!code || !name) {
            return res.status(400).json({ success: false, message: 'Code and name are required' });
        }
        const [result] = await conn.execute(
            'INSERT INTO molds (code, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
            [
                code.toUpperCase().trim(),
                name.trim(),
                description || null,
                is_active !== undefined ? (is_active ? 1 : 0) : 1
            ]
        );
        
        const newMoldId = result.insertId;
        
        if (product_ids && Array.isArray(product_ids) && product_ids.length > 0) {
            for (const pid of product_ids) {
                await conn.execute(
                    'INSERT IGNORE INTO mold_products (mold_id, product_id) VALUES (?, ?)',
                    [newMoldId, pid]
                );
            }
        }
        
        await conn.commit();
        return res.status(201).json({ success: true, message: 'Mold created successfully', id: newMoldId });
    } catch (error) {
        await conn.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        conn.release();
    }
};

exports.updateMold = async (req, res) => {
    const { id } = req.params;
    const { code, name, description, is_active, product_ids } = req.body;
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
        if (!code || !name) {
            return res.status(400).json({ success: false, message: 'Code and name are required' });
        }
        await conn.execute(
            'UPDATE molds SET code = ?, name = ?, description = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
            [
                code.toUpperCase().trim(),
                name.trim(),
                description || null,
                is_active !== undefined ? (is_active ? 1 : 0) : 1,
                id
            ]
        );

        if (product_ids && Array.isArray(product_ids)) {
            await conn.execute('DELETE FROM mold_products WHERE mold_id = ?', [id]);
            for (const pid of product_ids) {
                await conn.execute(
                    'INSERT IGNORE INTO mold_products (mold_id, product_id) VALUES (?, ?)',
                    [id, pid]
                );
            }
        }

        await conn.commit();
        return res.json({ success: true, message: 'Mold updated successfully' });
    } catch (error) {
        await conn.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        conn.release();
    }
};

exports.deleteMold = async (req, res) => {
    const { id } = req.params;
    try {
        // Optional check: is mold used in active production plans?
        const [existing] = await db.execute('SELECT id FROM planning_produksi WHERE mold_id = ? LIMIT 1', [id]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Cannot delete mold that is currently assigned to a production plan.' });
        }
        
        await db.execute('DELETE FROM molds WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Mold deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
