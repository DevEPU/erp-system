const db = require('../config/db');
const approvalService = require('../services/approvalService');

// Utility function for BigInt serialization
const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
));

exports.getRequests = async (req, res) => {
    try {
        const { search, status, is_verify, is_input, sort = 'newest', page = 1 } = req.query;
        const limit = 10;
        const offset = (parseInt(page) - 1) * limit;

        let query = `
            SELECT pr.*, 
                   c.category_name, 
                   s.supplier_name, 
                   u.name as creator_name
            FROM product_requests pr
            LEFT JOIN categories c ON pr.category_id = c.id
            LEFT JOIN suppliers s ON pr.supplier_id = s.id
            LEFT JOIN users u ON pr.created_by = u.id
        `;
        let params = [];
        let conditions = [];

        if (search && search !== 'undefined') {
            conditions.push('(pr.product_name LIKE ? OR pr.product_code LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }

        if (status && status !== 'all') {
            conditions.push('pr.status = ?');
            params.push(status);
        }

        if (is_verify && is_verify !== 'all') {
            conditions.push('pr.is_verify = ?');
            params.push(is_verify === '1' ? 1 : 0);
        }

        if (is_input && is_input !== 'all') {
            if (is_input === '1') {
                conditions.push('pr.product_id IS NOT NULL');
            } else {
                conditions.push('pr.product_id IS NULL');
            }
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Sorting
        let orderBy = 'pr.created_at DESC';
        if (sort === 'oldest') orderBy = 'pr.created_at ASC';
        else if (sort === 'name_asc') orderBy = 'pr.product_name ASC';
        else if (sort === 'name_desc') orderBy = 'pr.product_name DESC';

        query += ` ORDER BY ${orderBy} LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
        const [rows] = await db.query(query, params.slice(0, -2));

        // Count query
        let countQuery = 'SELECT COUNT(*) as count FROM product_requests pr';
        if (conditions.length > 0) {
            countQuery += ' WHERE ' + conditions.join(' AND ');
        }
        const [[{ count }]] = await db.query(countQuery, params.slice(0, -2));

        const rowsWithNesting = await Promise.all(rows.map(async (r) => {
            // Fetch current approvers if pending
            let currentApprovers = [];
            if (r.status.toLowerCase() === 'pending') {
                const [approverLogs] = await db.query(`
                    SELECT u.name 
                    FROM approval_request_logs al
                    JOIN approval_requests ar ON al.approval_request_id = ar.id
                    JOIN users u ON al.user_id = u.id
                    WHERE ar.requestable_type = 'Product Request' 
                    AND ar.requestable_id = ? 
                    AND al.level = ar.current_level 
                    AND al.action = 'assigned'
                `, [r.id]);
                currentApprovers = approverLogs.map(log => log.name);
            }

            return {
                ...r,
                category: r.category_id ? {
                    id: r.category_id,
                    category_name: r.category_name
                } : null,
                supplier: r.supplier_id ? {
                    id: r.supplier_id,
                    supplier_name: r.supplier_name
                } : null,
                creator: {
                    name: r.creator_name
                },
                current_approvers: [...new Set(currentApprovers)]
            };
        }));

        return res.json({
            data: serialize(rowsWithNesting),
            current_page: parseInt(page),
            last_page: Math.ceil(count / limit),
            total: count
        });
    } catch (error) {
        console.error('getRequests Error:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        const [total] = await db.execute('SELECT COUNT(*) as count FROM product_requests');
        const [pending] = await db.execute("SELECT COUNT(*) as count FROM product_requests WHERE status IN ('Pending', 'pending')");
        const [approved] = await db.execute("SELECT COUNT(*) as count FROM product_requests WHERE status IN ('Approved', 'approved')");
        const [rejected] = await db.execute("SELECT COUNT(*) as count FROM product_requests WHERE status IN ('Rejected', 'rejected')");
        const [verified] = await db.execute('SELECT COUNT(*) as count FROM product_requests WHERE is_verify = 1');
        const [unverified] = await db.execute('SELECT COUNT(*) as count FROM product_requests WHERE is_verify = 0 OR is_verify IS NULL');
        const [inputted] = await db.execute('SELECT COUNT(*) as count FROM product_requests WHERE product_id IS NOT NULL');
        const [notInputted] = await db.execute('SELECT COUNT(*) as count FROM product_requests WHERE product_id IS NULL');

        return res.json({
            total_requests: total[0].count,
            total_pending: pending[0].count,
            total_approved: approved[0].count,
            total_rejected: rejected[0].count,
            total_verified: verified[0].count,
            total_unverified: unverified[0].count,
            total_input: inputted[0].count,
            total_not_input: notInputted[0].count
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getFormData = async (req, res) => {
    try {
        const [categories] = await db.execute('SELECT id, category_name FROM categories');
        const [suppliers] = await db.execute('SELECT id, supplier_name, supplier_code FROM suppliers');
        const [units] = await db.execute('SELECT id, name, short_name FROM units');

        return res.json({
            categories: serialize(categories),
            suppliers: serialize(suppliers),
            units: serialize(units)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.store = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { product_name, product_unit, category_id, supplier_id, product_price, is_mandatory, user_id } = req.body;
        
        // 1. Create Product Request
        const [result] = await connection.execute(
            `INSERT INTO product_requests (product_name, product_unit, category_id, supplier_id, product_price, is_mandatory, status, created_by, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [product_name, product_unit, category_id || null, supplier_id || null, product_price || 0, is_mandatory ? 1 : 0, 'Pending', user_id]
        );
        const productRequestId = result.insertId;

        // 2. Create Approval Request (Type 21 = Product Request)
        // Uses the approvalService which handles rule finding and log creation
        const approvalResponse = await approvalService.createRequest(
            'Product Request',
            productRequestId,
            21, 
            0, 
            user_id,
            connection
        );

        // 3. Sync status back if it was auto-approved or changed
        if (approvalResponse.status !== 'pending') {
            await connection.execute(
                'UPDATE product_requests SET status = ?, updated_at = NOW() WHERE id = ?',
                [approvalResponse.status.charAt(0).toUpperCase() + approvalResponse.status.slice(1), productRequestId]
            );
        }

        await connection.commit();

        return res.json({
            message: 'Product Request created successfully',
            data: { id: productRequestId, status: approvalResponse.status }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Store Request Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { product_name, product_unit, category_id, supplier_id, product_price, is_mandatory } = req.body;

        await db.execute(
            `UPDATE product_requests 
             SET product_name = ?, product_unit = ?, category_id = ?, supplier_id = ?, product_price = ?, is_mandatory = ?, updated_at = NOW()
             WHERE id = ?`,
            [product_name, product_unit, category_id || null, supplier_id || null, product_price || 0, is_mandatory ? 1 : 0, id]
        );

        return res.json({ message: 'Product Request updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteRequest = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        // Delete associated approval requests and logs
        const [approvals] = await connection.execute(
            'SELECT id FROM approval_requests WHERE requestable_type = "Product Request" AND requestable_id = ?',
            [id]
        );

        for (const app of approvals) {
            await connection.execute('DELETE FROM approval_request_logs WHERE approval_request_id = ?', [app.id]);
            await connection.execute('DELETE FROM approval_requests WHERE id = ?', [app.id]);
        }

        await connection.execute('DELETE FROM product_requests WHERE id = ?', [id]);

        await connection.commit();
        return res.json({ message: 'Product Request deleted successfully' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.verifyRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { product_code, product_price, category_id, supplier_id, product_unit, is_asset, is_mandatory, is_verify } = req.body;

        await db.execute(
            `UPDATE product_requests 
             SET product_code = ?, product_price = ?, category_id = ?, supplier_id = ?, product_unit = ?, is_asset = ?, is_mandatory = ?, is_verify = ?, updated_at = NOW()
             WHERE id = ?`,
            [product_code, product_price || 0, category_id || null, supplier_id || null, product_unit, is_asset ? 1 : 0, is_mandatory ? 1 : 0, is_verify ? 1 : 0, id]
        );

        return res.json({ message: 'Product Request verified successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.inputToProduct = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        // Fetch request
        const [requests] = await connection.execute('SELECT * FROM product_requests WHERE id = ?', [id]);
        if (requests.length === 0) throw new Error('Request not found');
        const reqData = requests[0];

        if (!reqData.is_verify) throw new Error('Request must be verified first');
        if (reqData.product_id) throw new Error('Product already input');

        // Create Product
        const [prodResult] = await connection.execute(
            `INSERT INTO products (product_name, product_code, category_id, product_unit, is_asset, is_mandatory, product_price, supplier_id, product_quantity, product_stock_alert, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NOW(), NOW())`,
            [reqData.product_name, reqData.product_code, reqData.category_id, reqData.product_unit, reqData.is_asset, reqData.is_mandatory, reqData.product_price, reqData.supplier_id]
        );

        // Update Request
        await connection.execute('UPDATE product_requests SET product_id = ?, updated_at = NOW() WHERE id = ?', [prodResult.insertId, id]);

        await connection.commit();
        return res.json({ message: 'Product successfully added to Master Data', product_id: prodResult.insertId });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};
