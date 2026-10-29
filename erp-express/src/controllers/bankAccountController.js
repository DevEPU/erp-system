const db = require('../config/db');

const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
));

exports.getBankAccounts = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT b.*, c.code as currency_code, c.currency_name
            FROM bank_accounts b
            LEFT JOIN currencies c ON b.currency_id = c.id
            ORDER BY b.id DESC
        `);
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createBankAccount = async (req, res) => {
    const { code, name, address, phone, note, account_number, status, currency_id, account_type } = req.body;
    try {
        const [result] = await db.execute(
            'INSERT INTO bank_accounts (code, name, address, phone, note, account_number, status, currency_id, account_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [code, name, address, phone, note, account_number, status || 'Active', currency_id, account_type || 'Bank']
        );
        return res.status(201).json({ success: true, message: 'Bank Account created', id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateBankAccount = async (req, res) => {
    const { id } = req.params;
    const { code, name, address, phone, note, account_number, status, currency_id, account_type } = req.body;
    try {
        await db.execute(
            'UPDATE bank_accounts SET code = ?, name = ?, address = ?, phone = ?, note = ?, account_number = ?, status = ?, currency_id = ?, account_type = ? WHERE id = ?',
            [code, name, address, phone, note, account_number, status, currency_id, account_type, id]
        );
        return res.json({ success: true, message: 'Bank Account updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteBankAccount = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM bank_accounts WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Bank Account deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
