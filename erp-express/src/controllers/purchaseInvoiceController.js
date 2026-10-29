const db = require('../config/db');

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

exports.generatePIReference = async function (connection, departmentId) {
    let deptCode = 'GEN';
    if (departmentId) {
        const [depts] = await connection.execute('SELECT department_code FROM departments WHERE id = ?', [departmentId]);
        if (depts.length > 0 && depts[0].department_code) deptCode = depts[0].department_code;
    }
    const now = new Date();
    const year  = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth()+1).padStart(2,'0');
    
    const prefix = `INV/${deptCode}-EPU/${year}/${month}/`;
    const yearPrefix = `INV/${deptCode}-EPU/${year}/`;
    
    const [latest] = await connection.execute(
        'SELECT reference FROM purchase_invoices WHERE reference LIKE ? ORDER BY id DESC LIMIT 1',
        [`${yearPrefix}%`]
    );
    
    let sequence = 1;
    if (latest.length > 0) {
        const lastRef = latest[0].reference;
        const parts = lastRef.split('/');
        const lastSeqStr = parts[parts.length - 1];
        // Reset to 1 if coming from old DDXXXX format
        if (lastSeqStr.length === 4 && !isNaN(parseInt(lastSeqStr))) {
            sequence = parseInt(lastSeqStr) + 1;
        } else {
            sequence = 1;
        }
    }
    return `${prefix}${String(sequence).padStart(4, '0')}`;
}

async function getAccountByName(connection, name) {
    const [rows] = await connection.execute('SELECT id FROM chart_of_accounts WHERE name LIKE ? LIMIT 1', [`%${name}%`]);
    return rows.length > 0 ? rows[0].id : null;
}

exports.getPurchaseInvoices = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT pi.*, s.supplier_name, po.reference as po_reference, gr.reference as gr_reference
            FROM purchase_invoices pi 
            LEFT JOIN suppliers s ON pi.supplier_id = s.id 
            LEFT JOIN purchase_orders po ON pi.po_id = po.id
            LEFT JOIN goods_receipts gr ON pi.gr_id = gr.id
        `;
        let params = [];
        if (search) {
            query += ' WHERE pi.reference LIKE ? OR s.supplier_name LIKE ?';
            params.push(`%${search}%`, `%${search}%`);
        }
        query += ` ORDER BY pi.id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [rows] = await db.query(query, params);
        const [totalRows] = await db.query('SELECT COUNT(*) as count FROM purchase_invoices');

        return res.json({
            success: true,
            data: serialize(rows),
            total: totalRows[0].count,
            current_page: parseInt(page),
            last_page: Math.ceil(totalRows[0].count / parseInt(limit))
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getPurchaseInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute(`
            SELECT pi.*, s.supplier_name, po.reference as po_reference, gr.reference as gr_reference, pt.name as payment_term_name
            FROM purchase_invoices pi
            LEFT JOIN suppliers s ON pi.supplier_id = s.id
            LEFT JOIN purchase_orders po ON pi.po_id = po.id
            LEFT JOIN goods_receipts gr ON pi.gr_id = gr.id
            LEFT JOIN payment_terms pt ON pi.payment_term_id = pt.id
            WHERE pi.id = ?`, [id]);
        
        if (rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });

        const [details] = await db.execute('SELECT * FROM purchase_invoice_details WHERE invoice_id = ?', [id]);
        
        return res.json({
            success: true,
            data: {
                ...serialize(rows[0]),
                details: serialize(details)
            }
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.createPurchaseInvoice = async (req, res) => {
    const connection = await db.getConnection();
    const userId = req.user?.id || 1;
    try {
        await connection.beginTransaction();
        const { 
            date, invoice_date, invoice_reference, department_id, shipping_address, supplier_id, po_id, gr_ids, payment_term_id, due_date,
            tax_percentage, tax_amount, discount_percentage, discount_amount, 
            shipping_amount, total_amount, due_amount, note, items 
        } = req.body;

        const reference = await exports.generatePIReference(connection, department_id);

        const [result] = await connection.execute(
            `INSERT INTO purchase_invoices (
                reference, date, invoice_date, invoice_reference, department_id, shipping_address, supplier_id, po_id, gr_ids, payment_term_id, due_date,
                status, tax_percentage, tax_amount, discount_percentage, discount_amount, 
                shipping_amount, total_amount, paid_amount, due_amount, note, users_id, 
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NOW(), NOW())`,
            [
                reference, date || new Date(), invoice_date || null, invoice_reference || null, department_id || null, shipping_address || null, supplier_id, po_id, Array.isArray(gr_ids) ? JSON.stringify(gr_ids) : null, payment_term_id, due_date,
                'Unpaid', tax_percentage || 0, tax_amount || 0, discount_percentage || 0, discount_amount || 0,
                shipping_amount || 0, total_amount, due_amount, note, userId
            ]
        );

        const invoiceId = result.insertId;

        if (items && items.length > 0) {
            for (const item of items) {
                await connection.execute(
                    `INSERT INTO purchase_invoice_details (
                        invoice_id, product_id, product_name, product_code, quantity, 
                        price, unit_price, product_unit, sub_total, 
                        ppn_id, pph_id, product_tax_amount, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                    [
                        invoiceId, item.product_id, item.product_name, item.product_code, item.quantity,
                        item.price, item.unit_price, item.product_unit, item.sub_total,
                        item.ppn_id, item.pph_id, item.product_tax_amount || 0
                    ]
                );
            }
        }

        // GL INTEGRATION: Posting Journal Entry
        // 1. Create Header
        const [journalHeader] = await connection.execute(
            'INSERT INTO journal_entries (reference, date, description, source_type, source_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
            [`JV/${reference}`, date || new Date(), `Purchase Invoice ${reference}`, 'purchase_invoices', invoiceId]
        );
        const journalId = journalHeader.insertId;

        // 2. Identify Accounts (Defaulting to some fallbacks for demo purposes)
        let apAccountId = await getAccountByName(connection, 'Hutang Dagang'); // AP
        let expenseAccountId = await getAccountByName(connection, 'Persediaan') || await getAccountByName(connection, 'Beban Pembelian'); // Inventory or Expense

        // FALLBACKS if COA is empty (Seeding if missing during testing)
        if (!apAccountId || !expenseAccountId) {
            // Check if COA is empty
            const [totalCoa] = await connection.execute('SELECT COUNT(*) as count FROM chart_of_accounts');
            if (totalCoa[0].count === 0) {
                 await connection.execute('INSERT INTO chart_of_accounts (code, name, type, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())', ['21100', 'Hutang Dagang', 'Liability', 1]);
                 await connection.execute('INSERT INTO chart_of_accounts (code, name, type, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())', ['11200', 'Persediaan Barang', 'Asset', 1]);
                 apAccountId = await getAccountByName(connection, 'Hutang Dagang');
                 expenseAccountId = await getAccountByName(connection, 'Persediaan');
            }
        }

        // 3. Create Lines
        // DEBIT: Expense/Inventory
        await connection.execute(
            'INSERT INTO journal_entry_lines (journal_id, account_id, debit, credit, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
            [journalId, expenseAccountId || 1, total_amount, 0, `Purchase Invoice ${reference} - Items`]
        );
        // CREDIT: Accounts Payable
        await connection.execute(
            'INSERT INTO journal_entry_lines (journal_id, account_id, debit, credit, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
            [journalId, apAccountId || 1, 0, total_amount, `Purchase Invoice ${reference} - AP`]
        );

        await connection.commit();
        return res.status(201).json({ success: true, message: 'Invoice and Journal Entry created', id: invoiceId, reference });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.deletePurchaseInvoice = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        // Delete Journal Entries first
        await connection.execute('DELETE FROM journal_entries WHERE source_type = "purchase_invoices" AND source_id = ?', [id]);
        
        await connection.execute('DELETE FROM purchase_invoices WHERE id = ?', [id]);
        
        await connection.commit();
        return res.json({ success: true, message: 'Invoice and its Journal Entry deleted' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};
