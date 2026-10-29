const db = require('../config/db');

// Utility function for BigInt serialization
const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
));

exports.getSuppliers = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = 'SELECT s.*, c.currency_name, c.code as currency_code, p1.name as ppn_name, p2.name as pph_name, sg.name as group_name, pt.name as payment_term_name FROM suppliers s LEFT JOIN currencies c ON s.currency_id = c.id LEFT JOIN ppns p1 ON s.ppn_id = p1.id LEFT JOIN pphs p2 ON s.pph_id = p2.id LEFT JOIN supplier_groups sg ON s.group_id = sg.id LEFT JOIN payment_terms pt ON s.payment_term_id = pt.id';
        let params = [];
        let conditions = [];

        if (search) {
            conditions.push('(s.supplier_name LIKE ? OR s.supplier_code LIKE ? OR s.supplier_email LIKE ? OR s.supplier_phone LIKE ?)');
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }

        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
        
        const countParams = [...params];
        query += ` ORDER BY s.id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
        
        const [rows] = await db.query(query, params);
        
        let countQuery = 'SELECT COUNT(*) as count FROM suppliers s';
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

exports.getSupplierDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute('SELECT * FROM suppliers WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Supplier not found' });
        return res.json({ success: true, data: serialize(rows[0]) });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createSupplier = async (req, res) => {
    try {
        const { 
            supplier_code, supplier_name, supplier_email, supplier_phone, 
            address, city, country, region, npwp, 
            currency_id, ppn_id, pph_id, is_active,
            fax, contact_person, group_id, payment_term_id
        } = req.body;
        
        const [result] = await db.execute(
            'INSERT INTO suppliers (supplier_code, supplier_name, supplier_email, supplier_phone, address, city, country, region, npwp, currency_id, ppn_id, pph_id, group_id, payment_term_id, is_active, fax, contact_person, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
            [supplier_code, supplier_name, supplier_email, supplier_phone, address, city, country || 'Indonesia', region, npwp, currency_id, ppn_id, pph_id, group_id, payment_term_id, is_active || 1, fax, contact_person]
        );
        
        return res.status(201).json({ success: true, message: 'Supplier created successfully', id: result.insertId });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            supplier_code, supplier_name, supplier_email, supplier_phone, 
            address, city, country, region, npwp, 
            currency_id, ppn_id, pph_id, is_active,
            fax, contact_person, group_id, payment_term_id
        } = req.body;
        
        await db.execute(
            'UPDATE suppliers SET supplier_code = ?, supplier_name = ?, supplier_email = ?, supplier_phone = ?, address = ?, city = ?, country = ?, region = ?, npwp = ?, currency_id = ?, ppn_id = ?, pph_id = ?, group_id = ?, payment_term_id = ?, is_active = ?, fax = ?, contact_person = ?, updated_at = NOW() WHERE id = ?',
            [supplier_code, supplier_name, supplier_email, supplier_phone, address, city, country, region, npwp, currency_id, ppn_id, pph_id, group_id, payment_term_id, is_active, fax, contact_person, id]
        );
        
        return res.json({ success: true, message: 'Supplier updated successfully' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const [products] = await db.execute('SELECT id FROM products WHERE supplier_id = ? LIMIT 1', [id]);
        if (products.length > 0) return res.status(400).json({ success: false, message: 'Cannot delete supplier with associated products' });
        
        await db.execute('DELETE FROM suppliers WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Supplier deleted successfully' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getSupplierFormData = async (req, res) => {
    try {
        const [ppns] = await db.execute('SELECT id, name, rate FROM ppns');
        const [pphs] = await db.execute('SELECT id, name, rate FROM pphs');
        const [currencies] = await db.execute('SELECT id, code, currency_name, symbol FROM currencies');
        const [groups] = await db.execute('SELECT id, name FROM supplier_groups ORDER BY name ASC');
        const [payment_terms] = await db.execute('SELECT id, name, days FROM payment_terms ORDER BY name ASC');
        
        return res.json({ 
            ppns: serialize(ppns), 
            pphs: serialize(pphs), 
            currencies: serialize(currencies),
            groups: serialize(groups),
            payment_terms: serialize(payment_terms)
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};
