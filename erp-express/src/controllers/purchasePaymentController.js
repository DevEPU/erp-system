const db = require('../config/db');

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

exports.generatePaymentReference = async function (connection, departmentId) {
    console.log(`[DEBUG] Generating Ref for PYM - Dept ID: ${departmentId}`);
    let deptCode = 'GEN';
    if (departmentId) {
        const [depts] = await connection.execute('SELECT department_code FROM departments WHERE id = ?', [departmentId]);
        if (depts.length > 0 && depts[0].department_code) deptCode = depts[0].department_code;
    }
    const now = new Date();
    const year  = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth()+1).padStart(2,'0');
    
    const prefix = `PYM/${deptCode}-EPU/${year}/${month}/`;
    const yearPrefix = `PYM/${deptCode}-EPU/${year}/`;
    
    const [latest] = await connection.execute(
        'SELECT reference FROM ap_payments WHERE reference LIKE ? ORDER BY id DESC LIMIT 1',
        [`${yearPrefix}%`]
    );
    
    let sequence = 1;
    if (latest.length > 0) {
        const lastRef = latest[0].reference;
        const parts = lastRef.split('/');
        const lastSeqStr = parts[parts.length - 1];
        if (!isNaN(parseInt(lastSeqStr))) {
            sequence = parseInt(lastSeqStr) + 1;
        } else {
            sequence = 1;
        }
    }
    return `${prefix}${String(sequence).padStart(4, '0')}`;
}

exports.getPayments = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT p.*, s.supplier_name, d.department_name
            FROM ap_payments p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN departments d ON p.department_id = d.id
        `;
        let params = [];
        if (search) {
            query += ' WHERE p.reference LIKE ? OR s.supplier_name LIKE ?';
            params.push(`%${search}%`, `%${search}%`);
        }
        query += ` ORDER BY p.id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [rows] = await db.query(query, params);
        const [totalRows] = await db.query('SELECT COUNT(*) as count FROM ap_payments');

        return res.json({
            success: true,
            data: serialize(rows),
            total: totalRows[0].count
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getPaymentById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute(`
            SELECT p.*, s.supplier_name, d.department_name
            FROM ap_payments p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN departments d ON p.department_id = d.id
            WHERE p.id = ?
        `, [id]);

        if (rows.length === 0) return res.status(404).json({ message: 'Payment not found' });

        const payment = rows[0];
        
        const [banks] = await db.execute(`
            SELECT pb.*, c.name as account_name, c.code as account_code
            FROM ap_payment_banks pb
            LEFT JOIN chart_of_accounts c ON pb.account_id = c.id
            WHERE pb.payment_id = ?
        `, [id]);
        
        const [invoices] = await db.execute(`
            SELECT pi.*, i.reference as invoice_reference, i.date as invoice_date
            FROM ap_payment_invoices pi
            LEFT JOIN purchase_invoices i ON pi.invoice_id = i.id
            WHERE pi.payment_id = ?
        `, [id]);

        payment.banks = banks;
        payment.invoices = invoices;

        return res.json({ success: true, data: serialize(payment) });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getUnpaidInvoices = async (req, res) => {
    try {
        const { supplier_id } = req.query;
        if (!supplier_id) return res.status(400).json({ message: 'supplier_id is required' });

        const [rows] = await db.execute(`
            SELECT id, reference, date, due_date, total_amount, paid_amount, (total_amount - paid_amount) as balance
            FROM purchase_invoices
            WHERE supplier_id = ? AND (total_amount - paid_amount) > 0
            ORDER BY date ASC
        `, [supplier_id]);

        return res.json({ success: true, data: serialize(rows) });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.createPayment = async (req, res) => {
    const connection = await db.getConnection();
    const userId = req.user?.id || 1;
    try {
        await connection.beginTransaction();
        const { date, supplier_id, department_id, total_amount, note, banks, invoices } = req.body;

        const reference = await exports.generatePaymentReference(connection, department_id);

        const [result] = await connection.execute(
            'INSERT INTO ap_payments (reference, date, supplier_id, department_id, total_amount, note, users_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
            [reference, date || new Date(), supplier_id, department_id, total_amount, note, userId]
        );
        const paymentId = result.insertId;

        // Save Bank Lines
        if (banks && banks.length > 0) {
            for (const b of banks) {
                await connection.execute(
                    `INSERT INTO ap_payment_banks (
                        payment_id, account_id, bank_name, currency_id, rate, amount, 
                        transaction_type, is_liquid, giro_number, due_date, note
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        paymentId, b.account_id, b.bank_name, b.currency_id, b.rate || 1, b.amount,
                        b.transaction_type || 'Keluar Kas', b.is_liquid !== undefined ? b.is_liquid : 1, 
                        b.giro_number, b.due_date, b.note
                    ]
                );
            }
        }

        // Save Invoice Lines & Update Invoices
        if (invoices && invoices.length > 0) {
            for (const inv of invoices) {
                await connection.execute(
                    'INSERT INTO ap_payment_invoices (payment_id, invoice_id, amount_paid) VALUES (?, ?, ?)',
                    [paymentId, inv.invoice_id, inv.amount_paid]
                );

                // Update Invoice status, paid_amount and due_amount
                await connection.execute(
                    `UPDATE purchase_invoices 
                     SET paid_amount = paid_amount + ?, 
                         due_amount = total_amount - (paid_amount + ?),
                         status = CASE WHEN (total_amount - (paid_amount + ?)) <= 0 THEN 'Paid' ELSE 'Partial' END 
                     WHERE id = ?`,
                    [inv.amount_paid, inv.amount_paid, inv.amount_paid, inv.invoice_id]
                );
            }
        }

        // GL INTEGRATION (Simplified)
        // Debit: Account Payable (21100), Credit: Bank/Cash
        const [journalHeader] = await connection.execute(
            'INSERT INTO journal_entries (reference, date, description, source_type, source_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
            [`JV/${reference}`, date || new Date(), `AP Settlement ${reference}`, 'ap_payments', paymentId]
        );
        const journalId = journalHeader.insertId;

        // Fetch AP Account ID
        const [apAccounts] = await connection.execute('SELECT id FROM chart_of_accounts WHERE name LIKE ? LIMIT 1', ['%Hutang Dagang%']);
        const apAccountId = apAccounts.length > 0 ? apAccounts[0].id : null;

        // Line Debit AP
        if (apAccountId) {
            await connection.execute(
                'INSERT INTO journal_entry_lines (journal_id, account_id, debit, credit, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
                [journalId, apAccountId, total_amount, 0, `AP Settlement ${reference} - Debit AP`]
            );
        }

        // Line Credit Bank(s)
        if (banks && banks.length > 0) {
            for (const b of banks) {
                await connection.execute(
                    'INSERT INTO journal_entry_lines (journal_id, account_id, debit, credit, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
                    [journalId, b.account_id, 0, b.amount * (b.rate || 1), `AP Settlement ${reference} - ${b.bank_name}`]
                );
            }
        }

        await connection.commit();
        return res.status(201).json({ success: true, message: 'Payment recorded successfully', reference });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};
