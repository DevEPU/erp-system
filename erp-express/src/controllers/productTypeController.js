const db = require('../config/db');

// Utility function for BigInt serialization
const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
));

exports.getProductTypes = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM product_types ORDER BY name ASC');
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createProductType = async (req, res) => {
    const { name, description, is_active } = req.body;
    try {
        if (!name) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }
        await db.execute(
            'INSERT INTO product_types (name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
            [name.trim(), description || null, is_active !== undefined ? (is_active ? 1 : 0) : 1]
        );
        return res.status(201).json({ success: true, message: 'Product type created successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateProductType = async (req, res) => {
    const { id } = req.params;
    const { name, description, is_active } = req.body;
    try {
        if (!name) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }
        await db.execute(
            'UPDATE product_types SET name = ?, description = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
            [name.trim(), description || null, is_active ? 1 : 0, id]
        );
        return res.json({ success: true, message: 'Product type updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteProductType = async (req, res) => {
    const { id } = req.params;
    try {
        // Optional: Check if any product is using this type before deleting
        const [existing] = await db.execute('SELECT name FROM product_types WHERE id = ?', [id]);
        if (existing.length > 0) {
            const typeName = existing[0].name;
            const [products] = await db.execute('SELECT id FROM products WHERE product_type = ? LIMIT 1', [typeName]);
            if (products.length > 0) {
                return res.status(400).json({ success: false, message: 'Cannot delete product type that is currently used by products' });
            }
        }
        
        await db.execute('DELETE FROM product_types WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Product type deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
