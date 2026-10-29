const db = require('../config/db');

const cleanBody = (body) => {
    const data = { ...body };
    delete data.id;
    delete data.created_at;
    delete data.updated_at;
    delete data.salesman_name;
    for (const k in data) {
        if (data[k] === "" || data[k] === undefined) {
            data[k] = null;
        } else if (typeof data[k] === 'string' && data[k].length > 10 && data[k].includes('T') && data[k].endsWith('Z')) {
            const d = new Date(data[k]);
            if (!isNaN(d.getTime())) {
                data[k] = d.toISOString().slice(0, 19).replace('T', ' ');
            }
        }
    }
    return data;
};

// Utility to generate standard controllers for single-table entities without details
const createStandardCrud = (table, searchCols = ['name', 'reference']) => {
    return {
        getAll: async (req, res) => {
            try {
                const { search, page = 1, limit = 10 } = req.query;
                const offset = (parseInt(page)-1) * parseInt(limit);
                let q = `SELECT * FROM ${table} WHERE 1=1`;
                const params = [];
                if (search) {
                    const conditions = searchCols.map(c => `${c} LIKE ?`).join(' OR ');
                    q += ` AND (${conditions})`;
                    for (let i=0; i<searchCols.length; i++) params.push(`%${search}%`);
                }
                const [cnt] = await db.query(q.replace('*', 'COUNT(*) as cnt'), params);
                q += ` ORDER BY id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
                const [rows] = await db.query(q, params);
                res.json({ success: true, data: rows, total: cnt[0].cnt, current_page: parseInt(page), last_page: Math.ceil(cnt[0].cnt / parseInt(limit)) });
            } catch (e) { res.status(500).json({ message: e.message }); }
        },
        getById: async (req, res) => {
            try {
                const [rows] = await db.execute(`SELECT * FROM ${table} WHERE id=?`, [req.params.id]);
                if (!rows.length) return res.status(404).json({ message: 'Not found' });
                res.json({ success: true, data: rows[0] });
            } catch (e) { res.status(500).json({ message: e.message }); }
        },
        create: async (req, res) => {
            try {
                const body = cleanBody(req.body);
                const keys = Object.keys(body);
                const values = Object.values(body);
                const placeholders = keys.map(() => '?').join(',');
                const q = `INSERT INTO ${table} (${keys.join(',')}, created_at, updated_at) VALUES (${placeholders}, NOW(), NOW())`;
                const [result] = await db.query(q, values);
                res.status(201).json({ success: true, id: result.insertId });
            } catch (e) { res.status(500).json({ message: e.message }); }
        },
        update: async (req, res) => {
            try {
                const body = cleanBody(req.body);
                const keys = Object.keys(body);
                const values = Object.values(body);
                const setString = keys.map(k => `${k}=?`).join(',');
                const q = `UPDATE ${table} SET ${setString}, updated_at=NOW() WHERE id=?`;
                await db.query(q, [...values, req.params.id]);
                res.json({ success: true });
            } catch (e) { res.status(500).json({ message: e.message }); }
        },
        delete: async (req, res) => {
            try {
                await db.execute(`DELETE FROM ${table} WHERE id=?`, [req.params.id]);
                res.json({ success: true });
            } catch (e) { res.status(500).json({ message: e.message }); }
        }
    };
};

const salesman = createStandardCrud('salesman', ['name', 'code', 'sales_team', 'area', 'nik_employee']);
const tipe_customer = createStandardCrud('tipe_customer', ['name']);
const grup_customer = createStandardCrud('grup_customer', ['name']);
const penagihan_piutang = createStandardCrud('penagihan_piutang', ['reference', 'invoice_reference']);
const penerimaan_piutang = createStandardCrud('penerimaan_piutang', ['reference', 'penagihan_reference']);
const tanda_terima = createStandardCrud('tanda_terima', ['reference', 'invoice_reference']);
const jurnal_ar = createStandardCrud('jurnal_ar', ['reference', 'transaction_reference']);
const jurnal_penjualan = createStandardCrud('jurnal_penjualan', ['reference', 'invoice_reference']);
const rumus_komisi = createStandardCrud('rumus_komisi', ['name']);
const komisi_per_item = {
    getAll: async (req, res) => {
        try {
            const { search, page = 1, limit = 10 } = req.query;
            const offset = (parseInt(page)-1) * parseInt(limit);
            let q = `SELECT k.*, s.name as salesman_name FROM komisi_per_item k LEFT JOIN salesman s ON k.salesman_id = s.id WHERE 1=1`;
            const params = [];
            if (search) {
                q += ' AND (k.product_name LIKE ? OR k.product_code LIKE ? OR s.name LIKE ?)';
                params.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }
            const [cnt] = await db.query(q.replace('k.*, s.name as salesman_name', 'COUNT(*) as cnt'), params);
            q += ` ORDER BY k.id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
            const [rows] = await db.query(q, params);
            res.json({ success: true, data: rows, total: cnt[0].cnt, current_page: parseInt(page), last_page: Math.ceil(cnt[0].cnt / parseInt(limit)) });
        } catch (e) { res.status(500).json({ message: e.message }); }
    },
    getById: async (req, res) => {
        try {
            const [rows] = await db.execute(`SELECT k.*, s.name as salesman_name FROM komisi_per_item k LEFT JOIN salesman s ON k.salesman_id = s.id WHERE k.id=?`, [req.params.id]);
            if (!rows.length) return res.status(404).json({ message: 'Not found' });
            res.json({ success: true, data: rows[0] });
        } catch (e) { res.status(500).json({ message: e.message }); }
    },
    create: createStandardCrud('komisi_per_item').create,
    update: createStandardCrud('komisi_per_item').update,
    delete: createStandardCrud('komisi_per_item').delete,
};
const weekday_settings = createStandardCrud('weekday_settings', ['day_name']);
const scan_product_log = createStandardCrud('scan_product_log', ['product_name', 'product_code']);

// Retur Penjualan (Has details)
const retur_penjualan = {
    getAll: async (req, res) => {
        try {
            const { search, page = 1, limit = 10 } = req.query;
            const offset = (parseInt(page)-1) * parseInt(limit);
            let q = `SELECT t.*, c.customer_name FROM retur_penjualan t LEFT JOIN customers c ON t.customer_id = c.id WHERE 1=1`;
            const params = [];
            if (search) { q += ' AND (t.reference LIKE ? OR c.customer_name LIKE ?)'; params.push(`%${search}%`,`%${search}%`); }
            const [cnt] = await db.query(q.replace('t.*, c.customer_name','COUNT(*) as cnt'), params);
            q += ` ORDER BY t.id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
            const [rows] = await db.query(q, params);
            res.json({ success: true, data: rows, total: cnt[0].cnt, current_page: parseInt(page), last_page: Math.ceil(cnt[0].cnt / parseInt(limit)) });
        } catch (e) { res.status(500).json({ message: e.message }); }
    },
    getById: async (req, res) => {
        try {
            const [rows] = await db.execute(`SELECT t.*, c.customer_name FROM retur_penjualan t LEFT JOIN customers c ON t.customer_id = c.id WHERE t.id=?`, [req.params.id]);
            if (!rows.length) return res.status(404).json({ message: 'Not found' });
            const [details] = await db.execute(`SELECT * FROM retur_penjualan_details WHERE retur_id=?`, [req.params.id]);
            res.json({ success: true, data: { ...rows[0], details } });
        } catch (e) { res.status(500).json({ message: e.message }); }
    },
    create: async (req, res) => {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            const { customer_id, invoice_reference, return_date, reason, items } = req.body;
            const reference = req.body.reference || 'RET-' + Date.now();
            const [h] = await conn.query(
                `INSERT INTO retur_penjualan (reference, customer_id, invoice_reference, return_date, reason, status, created_at, updated_at) VALUES (?,?,?,?,?,'Draft',NOW(),NOW())`,
                [reference, customer_id||null, invoice_reference||null, return_date||null, reason||null]
            );
            const retid = h.insertId;
            if (items?.length) {
                for (const it of items) {
                    await conn.query(
                        `INSERT INTO retur_penjualan_details (retur_id, product_id, product_name, product_code, product_unit, qty_returned, price, sub_total, created_at) VALUES (?,?,?,?,?,?,?,?,NOW())`,
                        [retid, it.product_id||null, it.product_name, it.product_code||null, it.product_unit||null, it.qty_returned||0, it.price||0, (it.qty_returned||0)*(it.price||0)]
                    );
                }
            }
            await conn.commit();
            res.status(201).json({ success: true, id: retid, reference });
        } catch (e) { await conn.rollback(); res.status(500).json({ message: e.message }); }
        finally { conn.release(); }
    },
    update: async (req, res) => {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            const { id } = req.params;
            const { customer_id, invoice_reference, return_date, reason, status, items } = req.body;
            await conn.query(
                `UPDATE retur_penjualan SET customer_id=?, invoice_reference=?, return_date=?, reason=?, status=?, updated_at=NOW() WHERE id=?`,
                [customer_id||null, invoice_reference||null, return_date||null, reason||null, status||'Draft', id]
            );
            if (items) {
                await conn.execute(`DELETE FROM retur_penjualan_details WHERE retur_id=?`, [id]);
                for (const it of items) {
                    await conn.query(
                        `INSERT INTO retur_penjualan_details (retur_id, product_id, product_name, product_code, product_unit, qty_returned, price, sub_total, created_at) VALUES (?,?,?,?,?,?,?,?,NOW())`,
                        [id, it.product_id||null, it.product_name, it.product_code||null, it.product_unit||null, it.qty_returned||0, it.price||0, (it.qty_returned||0)*(it.price||0)]
                    );
                }
            }
            await conn.commit();
            res.json({ success: true });
        } catch (e) { await conn.rollback(); res.status(500).json({ message: e.message }); }
        finally { conn.release(); }
    },
    delete: async (req, res) => {
        try {
            await db.execute(`DELETE FROM retur_penjualan WHERE id=?`, [req.params.id]);
            res.json({ success: true });
        } catch (e) { res.status(500).json({ message: e.message }); }
    }
};

module.exports = {
    salesman,
    tipe_customer,
    grup_customer,
    penagihan_piutang,
    penerimaan_piutang,
    retur_penjualan,
    tanda_terima,
    jurnal_ar,
    jurnal_penjualan,
    rumus_komisi,
    komisi_per_item,
    weekday_settings,
    scan_product_log
};
