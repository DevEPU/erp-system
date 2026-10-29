const db = require('../config/db');
const approvalService = require('../services/approvalService');

// Utility function for BigInt serialization and Date formatting
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

exports.generatePOReference = async function (connection, departmentId) {
    let deptCode = 'GEN';
    if (departmentId) {
        const [depts] = await connection.execute('SELECT department_code FROM departments WHERE id = ?', [departmentId]);
        if (depts.length > 0 && depts[0].department_code) deptCode = depts[0].department_code;
    }
    const now = new Date();
    const year  = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth()+1).padStart(2,'0');
    const prefix = `PO/${deptCode}-EPU/${year}/${month}/`;
    const globalYearPrefix = `PO/%/${year}/%`;
    
    const [latest] = await connection.execute(
        'SELECT reference FROM purchase_orders WHERE reference LIKE ? ORDER BY id DESC LIMIT 1',
        [globalYearPrefix]
    );
    let sequence = 1;
    if (latest.length > 0) {
        const lastRef = latest[0].reference;
        const parts = lastRef.split('/');
        const lastSeqStr = parts[parts.length - 1];
        // If the last sequence was more than 4 digits, it's the old format (DDXXX).
        // Reset to 1 for the new monthly format.
        if (lastSeqStr.length === 4 && !isNaN(parseInt(lastSeqStr))) {
            sequence = parseInt(lastSeqStr) + 1;
        } else {
            sequence = 1;
        }
    }
    return `${prefix}${String(sequence).padStart(4, '0')}`;
}

exports.getPurchaseOrders = async (req, res) => {
    try {
        const { search, page = 1, limit = 10, department_id, all } = req.query;
        console.log('[DEBUG] getPurchaseOrders params:', { search, page, limit, department_id, all });
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT 
                po.*, 
                s.supplier_name, 
                d.department_name,
                COALESCE(q.total_qty, 0) as total_qty,
                COALESCE(r.received_qty, 0) as received_qty,
                CASE 
                    WHEN COALESCE(q.total_qty, 0) <= 0 THEN 'Pending'
                    WHEN COALESCE(r.received_qty, 0) <= 0 THEN 'Pending'
                    WHEN COALESCE(r.received_qty, 0) >= COALESCE(q.total_qty, 0) THEN 'Full'
                    ELSE 'Partial'
                END as received_status,
                (
                    SELECT COUNT(*)
                    FROM goods_receipts gr2
                    WHERE gr2.po_id = po.id
                    AND NOT EXISTS (
                        SELECT 1 FROM purchase_invoices pi2
                        WHERE pi2.po_id = po.id
                        AND (
                            pi2.gr_id = gr2.id
                            OR JSON_CONTAINS(pi2.gr_ids, CAST(gr2.id AS CHAR), '$')
                        )
                    )
                ) as uninvoiced_gr_count
            FROM purchase_orders po 
            LEFT JOIN suppliers s ON po.supplier_id = s.id 
            LEFT JOIN departments d ON po.department_id = d.id
            LEFT JOIN (
                SELECT po_id, SUM(quantity) as total_qty FROM purchase_order_details GROUP BY po_id
            ) q ON po.id = q.po_id
            LEFT JOIN (
                SELECT gr.po_id, SUM(grd.qty_received) as received_qty
                FROM goods_receipt_details grd
                JOIN goods_receipts gr ON grd.gr_id = gr.id
                GROUP BY gr.po_id
            ) r ON po.id = r.po_id
            WHERE 1=1
        `;
        let params = [];
        
        if (search) {
            query += ' AND (po.reference LIKE ? OR s.supplier_name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        if (department_id && department_id !== 'undefined' && department_id !== 'null' && department_id !== '') {
            query += ' AND po.department_id = ?';
            params.push(department_id);
        }

        if (all === 'true') {
            query += ' ORDER BY po.id DESC';
        } else {
            query += ` ORDER BY po.id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
        }

        const [rows] = await db.query(query, params);
        console.log(`[DEBUG] getPurchaseOrders found ${rows.length} rows`);
        
        let totalCount = rows.length;
        if (all !== 'true') {
            let countQuery = 'SELECT COUNT(*) as count FROM purchase_orders WHERE 1=1';
            let countParams = [];
            if (department_id && department_id !== 'undefined' && department_id !== 'null' && department_id !== '') {
                countQuery += ' AND department_id = ?';
                countParams.push(department_id);
            }
            const [totalRows] = await db.query(countQuery, countParams);
            totalCount = totalRows[0].count;
        }

        return res.json({
            success: true,
            data: serialize(rows),
            total: totalCount,
            current_page: all === 'true' ? 1 : parseInt(page),
            last_page: all === 'true' ? 1 : Math.ceil(totalCount / parseInt(limit))
        });
    } catch (error) { 
        console.error('[ERROR] getPurchaseOrders:', error);
        res.status(500).json({ message: error.message }); 
    }
};

exports.getApprovedPrItems = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT 
                pd.*, 
                p.reference as pr_reference,
                p.date as pr_date,
                p.department_id,
                dept.department_name,
                prod.product_name,
                prod.product_code,
                prod.product_unit,
                (pd.quantity - COALESCE(ordered.total_ordered, 0)) as remaining_quantity
            FROM purchase_details pd
            JOIN purchases p ON pd.purchase_id = p.id
            JOIN departments dept ON p.department_id = dept.id
            JOIN products prod ON pd.product_id = prod.id
            LEFT JOIN (
                SELECT pr_detail_id, SUM(quantity) as total_ordered
                FROM purchase_order_details
                GROUP BY pr_detail_id
            ) ordered ON pd.id = ordered.pr_detail_id
            WHERE LOWER(p.status) = 'approved'
            AND (pd.quantity - COALESCE(ordered.total_ordered, 0)) > 0
            ORDER BY p.id DESC, pd.id ASC
        `);

        return res.json({ success: true, data: serialize(rows) });
    } catch (error) { 
        console.error("fetch approved items error:", error);
        res.status(500).json({ message: error.message }); 
    }
};

exports.getPurchaseOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute(`
            SELECT po.*, s.supplier_name, s.address as supplier_address, s.supplier_phone, d.department_name,
                   ppn.name as ppn_name, pph.name as pph_name
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.id
            LEFT JOIN departments d ON po.department_id = d.id
            LEFT JOIN ppns ppn ON po.ppn_id = ppn.id
            LEFT JOIN pphs pph ON po.pph_id = pph.id
            WHERE po.id = ?`, [id]);
        
        if (rows.length === 0) return res.status(404).json({ message: 'Purchase Order not found' });

        const [details] = await db.execute(`
            SELECT 
                pod.*,
                CAST(COALESCE(rec.total_received, 0) AS UNSIGNED) as qty_received,
                CAST((pod.quantity - COALESCE(rec.total_received, 0)) AS SIGNED) as qty_remaining
            FROM purchase_order_details pod
            LEFT JOIN (
                SELECT 
                    grd.product_id,
                    grd.product_name,
                    SUM(grd.qty_received) as total_received
                FROM goods_receipt_details grd
                JOIN goods_receipts gr ON grd.gr_id = gr.id
                WHERE gr.po_id = ?
                GROUP BY grd.product_id, grd.product_name
            ) rec ON (
                  (pod.product_id IS NOT NULL AND pod.product_id = rec.product_id) OR 
                  (pod.product_id IS NULL AND pod.product_name = rec.product_name)
              )
            WHERE pod.po_id = ?
        `, [id, id]);
        
        return res.json({
            success: true,
            data: {
                ...serialize(rows[0]),
                details: serialize(details)
            }
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.createPurchaseOrder = async (req, res) => {
    const connection = await db.getConnection();
    const userId = req.user?.id || 1;
    try {
        await connection.beginTransaction();
        const { 
            date, supplier_id, pr_id, department_id, 
            tax_percentage, tax_amount, discount_percentage, discount_amount, 
            shipping_amount, total_amount, payment_term_id, note, items,
            etd, shipping_address, ppn_id, pph_id
        } = req.body;
        
        const reference = req.body.reference && req.body.reference !== '' 
            ? req.body.reference 
            : await exports.generatePOReference(connection, department_id);

        // Header Insert
        const headerSql = `
            INSERT INTO \`purchase_orders\` (
                \`reference\`, \`date\`, \`supplier_id\`, \`pr_id\`, \`department_id\`, \`users_id\`, 
                \`tax_percentage\`, \`tax_amount\`, \`discount_percentage\`, \`discount_amount\`, 
                \`shipping_amount\`, \`total_amount\`, \`payment_term_id\`, \`note\`, 
                \`etd\`, \`shipping_address\`, \`dpp_amount\`, \`ppn_id\`, \`pph_id\`,
                \`created_at\`, \`updated_at\`
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        const headerParams = [
            String(reference),
            date ? new Date(date) : new Date(),
            supplier_id ? Number(supplier_id) : null,
            pr_id ? Number(pr_id) : null,
            department_id ? Number(department_id) : null,
            Number(userId),
            Number(tax_percentage || 0),
            Number(tax_amount || 0),
            Number(discount_percentage || 0),
            Number(discount_amount || 0),
            Number(shipping_amount || 0),
            Number(total_amount || 0),
            payment_term_id ? Number(payment_term_id) : null,
            note ? String(note) : null,
            etd ? new Date(etd) : null,
            shipping_address ? String(shipping_address) : null,
            Number(req.body.dpp_amount || 0),
            ppn_id ? Number(ppn_id) : null,
            pph_id ? Number(pph_id) : null
        ];

        const [headerResult] = await connection.query(headerSql, headerParams);
        const poId = headerResult.insertId;

        // Details Insert
        if (items && items.length > 0) {
            for (const item of items) {
                const detailSql = `
                    INSERT INTO \`purchase_order_details\` (
                        \`po_id\`, \`product_id\`, \`pr_detail_id\`, \`product_name\`, \`product_code\`, \`quantity\`, 
                        \`price\`, \`unit_price\`, \`product_unit\`, \`sub_total\`, \`is_asset\`, 
                        \`product_discount_amount\`, \`product_discount_type\`, \`product_tax_amount\`, 
                        \`created_at\`, \`updated_at\`
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                `;
                const detailParams = [
                    poId,
                    item.product_id ? Number(item.product_id) : null,
                    item.pr_detail_id ? Number(item.pr_detail_id) : null,
                    String(item.product_name),
                    item.product_code ? String(item.product_code) : null,
                    Number(item.quantity || 0),
                    Number(item.price || 0),
                    Number(item.unit_price || 0),
                    String(item.product_unit),
                    Number(item.sub_total || 0),
                    item.is_asset ? 1 : 0,
                    Number(item.product_discount_amount || 0),
                    String(item.product_discount_type || 'fixed'),
                    Number(item.product_tax_amount || 0)
                ];
                await connection.query(detailSql, detailParams);
            }
        }

        // Link PR
        if (pr_id) {
            await connection.query('UPDATE \`purchases\` SET \`po_id\` = ? WHERE \`id\` = ?', [poId, pr_id]);
        }

        // Finalize
        await connection.commit();
        
        // Post-Commit: Try Approval (Don't fail PO if this fails)
        let finalStatus = 'Pending';
        try {
            const approvalName = 'Purchase Order';
            const modelClass = 'Modules\\PurchaseOrder\\Entities\\PurchaseOrder';
            const [types] = await connection.query('SELECT id FROM approval_types WHERE approval_name = ? LIMIT 1', [approvalName]);
            if (types.length > 0) {
                const approval = await approvalService.createRequest(modelClass, poId, types[0].id, total_amount, userId);
                finalStatus = approval.status.charAt(0).toUpperCase() + approval.status.slice(1);
                await db.query('UPDATE \`purchase_orders\` SET \`status\` = ? WHERE \`id\` = ?', [finalStatus, poId]);
            }
        } catch (appErr) { console.warn("Approval Error (Non-Critical):", appErr.message); }

        return res.status(201).json({ success: true, id: poId, reference, status: finalStatus });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("CRITICAL ERROR IN PO CREATE:", error);
        res.status(500).json({ message: error.message });
    } finally {
        if (connection) connection.release();
    }
};
exports.updatePurchaseOrder = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { 
            date, supplier_id, tax_percentage, tax_amount, discount_percentage, 
            discount_amount, shipping_amount, total_amount, payment_term_id, note, items,
            etd, shipping_address, ppn_id, pph_id
        } = req.body;

        console.log(`[DIAGNOSTIC] updatePurchaseOrder called for ID: ${id}`);
        
        const updateData = {
            date: date || new Date(),
            supplier_id: supplier_id || null,
            tax_percentage: tax_percentage || 0,
            tax_amount: tax_amount || 0,
            discount_percentage: discount_percentage || 0,
            discount_amount: discount_amount || 0,
            shipping_amount: shipping_amount || 0,
            total_amount: total_amount || 0,
            payment_term_id: payment_term_id || null,
            note: note || null,
            dpp_amount: req.body.dpp_amount || 0,
            etd: etd || null,
            shipping_address: shipping_address || null,
            ppn_id: ppn_id || null,
            pph_id: pph_id || null,
            updated_at: new Date()
        };

        if (req.body.reference) updateData.reference = req.body.reference;

        await connection.query('UPDATE purchase_orders SET ? WHERE id = ?', [updateData, id]);

        if (items) {
            await connection.execute('DELETE FROM purchase_order_details WHERE po_id = ?', [id]);
            for (const item of items) {
                const podDetail = {
                    po_id: id,
                    product_id: item.product_id || null,
                    pr_detail_id: item.pr_detail_id || null,
                    product_name: item.product_name,
                    product_code: item.product_code,
                    quantity: item.quantity || 0,
                    price: item.price || 0,
                    unit_price: item.unit_price || 0,
                    product_unit: item.product_unit,
                    sub_total: item.sub_total || 0,
                    is_asset: item.is_asset || 0,
                    product_discount_amount: item.product_discount_amount || 0,
                    product_discount_type: item.product_discount_type || 'fixed',
                    product_tax_amount: item.product_tax_amount || 0,
                    created_at: new Date(),
                    updated_at: new Date()
                };
                await connection.query('INSERT INTO purchase_order_details SET ?', [podDetail]);
            }
        }

        await connection.commit();
        return res.json({ success: true, message: 'Purchase Order updated' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.deletePurchaseOrder = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if referenced by Goods Receipt
        const [grs] = await db.execute('SELECT id FROM goods_receipts WHERE po_id = ? LIMIT 1', [id]);
        if (grs.length > 0) return res.status(400).json({ message: 'Cannot delete PO that has Goods Receipt' });

        await db.execute('DELETE FROM purchase_orders WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Purchase Order deleted' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.closePurchaseOrder = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id || 1;
    try {
        await db.execute('UPDATE purchase_orders SET is_closed = 1, closed_at = NOW(), closed_by = ? WHERE id = ?', [userId, id]);
        return res.json({ success: true, message: 'Purchase Order closed' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};
exports.reopenPurchaseOrder = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('UPDATE purchase_orders SET is_closed = 0, closed_at = NULL, closed_by = NULL WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Purchase Order reopened' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};
