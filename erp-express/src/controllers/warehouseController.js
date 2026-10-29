const db = require('../config/db');

// Utility function for BigInt serialization
const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
));

exports.getWarehouses = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = 'SELECT w.*, d.department_name FROM warehouses w LEFT JOIN departments d ON w.department_id = d.id';
        let params = [];
        let conditions = [];

        if (search) {
            conditions.push('(w.name LIKE ? OR w.code LIKE ? OR w.short_name LIKE ? OR w.description LIKE ?)');
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }

        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
        
        const countParams = [...params];
        query += ` ORDER BY w.id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
        
        const [rows] = await db.query(query, params);
        
        let countQuery = 'SELECT COUNT(*) as count FROM warehouses w';
        if (conditions.length > 0) countQuery += ' WHERE ' + conditions.join(' AND ');
        const [[{ count }]] = await db.query(countQuery, countParams);

        return res.json({
            success: true,
            data: serialize(rows),
            current_page: parseInt(page),
            per_page: parseInt(limit),
            last_page: Math.ceil(count / parseInt(limit)),
            total: count
        });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getWarehouseDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute('SELECT * FROM warehouses WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Warehouse not found' });
        return res.json({ success: true, data: serialize(rows[0]) });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createWarehouse = async (req, res) => {
    try {
        const { 
            code, name, short_name, description, department_id, is_transit, is_active,
            warehouse_type, address, city, pic_name, pic_phone, capacity_m3, allow_negative_stock
        } = req.body;
        
        const [result] = await db.execute(
            `INSERT INTO warehouses (
                code, name, short_name, description, department_id, is_transit, is_active,
                warehouse_type, address, city, pic_name, pic_phone, capacity_m3, allow_negative_stock,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                code, 
                name, 
                short_name || null, 
                description || null, 
                department_id ? Number(department_id) : null, 
                is_transit ? 1 : 0, 
                is_active === undefined ? 1 : (is_active ? 1 : 0),
                warehouse_type || 'INTERNAL',
                address || null,
                city || null,
                pic_name || null,
                pic_phone || null,
                capacity_m3 ? Number(capacity_m3) : 0,
                allow_negative_stock ? 1 : 0
            ]
        );
        
        return res.status(201).json({ success: true, message: 'Warehouse created successfully', id: result.insertId });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateWarehouse = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            code, name, short_name, description, department_id, is_transit, is_active,
            warehouse_type, address, city, pic_name, pic_phone, capacity_m3, allow_negative_stock
        } = req.body;
        
        await db.execute(
            `UPDATE warehouses SET 
                code = ?, name = ?, short_name = ?, description = ?, department_id = ?, is_transit = ?, is_active = ?,
                warehouse_type = ?, address = ?, city = ?, pic_name = ?, pic_phone = ?, capacity_m3 = ?, allow_negative_stock = ?,
                updated_at = NOW() 
            WHERE id = ?`,
            [
                code, 
                name, 
                short_name || null, 
                description || null, 
                department_id ? Number(department_id) : null, 
                is_transit ? 1 : 0, 
                is_active ? 1 : 0,
                warehouse_type || 'INTERNAL',
                address || null,
                city || null,
                pic_name || null,
                pic_phone || null,
                capacity_m3 ? Number(capacity_m3) : 0,
                allow_negative_stock ? 1 : 0,
                id
            ]
        );
        
        return res.json({ success: true, message: 'Warehouse updated successfully' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteWarehouse = async (req, res) => {
    try {
        const { id } = req.params;
        // Optional: Check for dependencies before deleting
        // For example, if there are stocks in this warehouse
        
        await db.execute('DELETE FROM warehouses WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Warehouse deleted successfully' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getWarehouseFormData = async (req, res) => {
    try {
        const [departments] = await db.execute('SELECT id, department_name FROM departments ORDER BY department_name ASC');
        
        return res.json({ 
            departments: serialize(departments)
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};
