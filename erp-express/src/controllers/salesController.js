const db = require('../config/db');
const approvalService = require('../services/approvalService');

// ─── Utility ────────────────────────────────────────────────────────────────
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

const genRef = async (prefix) => {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = String(now.getMonth()+1).padStart(2,'0');
    const tableMap = {
        'FCT': 'customer_forecasts',
        'CPO': 'customer_po',
        'OS':  'order_sheets',
    };
    const table = tableMap[prefix] || 'customer_forecasts';
    const like = `${prefix}/${yy}/${mm}/%`;
    const [rows] = await db.query(`SELECT reference FROM ${table} WHERE reference LIKE ? ORDER BY id DESC LIMIT 1`, [like]);
    let seq = 1;
    if (rows.length > 0) {
        const parts = rows[0].reference.split('/');
        seq = parseInt(parts[parts.length-1]) + 1;
    }
    return `${prefix}/${yy}/${mm}/${String(seq).padStart(4,'0')}`;
};

// ═══════════════════════════════════════════════════════════════════════════
// FORECAST (customer_forecasts)
// ═══════════════════════════════════════════════════════════════════════════

exports.getForecasts = async (req, res) => {
    try {
        const { search, page = 1, limit = 999, month, year, status, customer_id } = req.query;
        const offset = (parseInt(page)-1) * parseInt(limit);
        let q = `
            SELECT f.*, c.customer_name, s.name as salesman_name, w.name as warehouse_name, cur.code as currency_code,
            COALESCE((
                SELECT SUM(pod.sub_total) 
                FROM customer_po_details pod 
                JOIN customer_forecast_details fd ON pod.forecast_detail_id = fd.id 
                WHERE fd.forecast_id = f.id
            ), 0) as fulfilled_amount,
            COALESCE((
                SELECT SUM(pod.po_qty) 
                FROM customer_po_details pod 
                JOIN customer_forecast_details fd ON pod.forecast_detail_id = fd.id 
                WHERE fd.forecast_id = f.id
            ), 0) as fulfilled_qty
            FROM customer_forecasts f
            LEFT JOIN customers c ON f.customer_id = c.id
            LEFT JOIN salesman s ON f.salesman_id = s.id
            LEFT JOIN warehouses w ON f.warehouse_id = w.id
            LEFT JOIN currencies cur ON f.currency_id = cur.id
            WHERE 1=1
        `;
        const p = [];
        if (search) { q += ' AND (f.reference LIKE ? OR c.customer_name LIKE ?)'; p.push(`%${search}%`, `%${search}%`); }
        if (month)  { q += ' AND (f.month = ? OR MONTH(f.start_date) = ?)'; p.push(month, month); }
        if (year)   { q += ' AND (f.year = ? OR YEAR(f.start_date) = ?)';  p.push(year, year); }
        if (status) { q += ' AND f.status = ?'; p.push(status); }
        if (customer_id) { q += ' AND f.customer_id = ?'; p.push(customer_id); }
        
        const countQuery = `SELECT COUNT(*) as cnt FROM customer_forecasts f LEFT JOIN customers c ON f.customer_id = c.id WHERE 1=1` +
            (search ? ' AND (f.reference LIKE ? OR c.customer_name LIKE ?)' : '') +
            (month ? ' AND (f.month = ? OR MONTH(f.start_date) = ?)' : '') +
            (year ? ' AND (f.year = ? OR YEAR(f.start_date) = ?)' : '') +
            (status ? ' AND f.status = ?' : '') +
            (customer_id ? ' AND f.customer_id = ?' : '');
            
        const [count] = await db.query(countQuery, p);
        q += ` ORDER BY f.id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
        const [rows] = await db.query(q, p);
        res.json({ success: true, data: serialize(rows), total: count[0].cnt, current_page: parseInt(page), last_page: Math.ceil(count[0].cnt / parseInt(limit)) });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getForecastById = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT f.*, c.customer_name, s.name as salesman_name, w.name as warehouse_name, cur.code as currency_code
            FROM customer_forecasts f
            LEFT JOIN customers c ON f.customer_id = c.id
            LEFT JOIN salesman s ON f.salesman_id = s.id
            LEFT JOIN warehouses w ON f.warehouse_id = w.id
            LEFT JOIN currencies cur ON f.currency_id = cur.id
            WHERE f.id = ?`, [req.params.id]);
        if (!rows.length) return res.status(404).json({ message: 'Not found' });
        const [details] = await db.execute(`
            SELECT
                fd.id, fd.forecast_id, fd.product_id,
                COALESCE(NULLIF(p.product_name,''), fd.product_name) as product_name,
                COALESCE(NULLIF(p.product_code,''), fd.product_code) as product_code,
                COALESCE(NULLIF(p.product_unit,''), fd.product_unit) as product_unit,
                fd.forecast_qty, fd.price, fd.sub_total, fd.target_date, fd.confidence_level, fd.weighted_amount, fd.min_qty, fd.max_qty, fd.remark,
                fd.created_at, fd.updated_at
            FROM customer_forecast_details fd
            LEFT JOIN products p ON fd.product_id = p.id
            WHERE fd.forecast_id = ?`, [req.params.id]);
        res.json({ success: true, data: { ...serialize(rows[0]), details: serialize(details) } });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// Hitung total qty & nilai forecast dari daftar item
const calcForecastTotals = (items = []) => {
    let total_qty = 0, total_amount = 0, weighted_amount = 0;
    for (const it of items) {
        const qty = Number(it.forecast_qty || 0);
        const price = Number(it.price || 0);
        const confidence = Number(it.confidence_level ?? 100);
        const subtotal = qty * price;
        const weighted = (subtotal * confidence) / 100;
        total_qty += qty;
        total_amount += subtotal;
        weighted_amount += weighted;
    }
    return { total_qty, total_amount, weighted_amount };
};

const insertForecastDetails = async (conn, forecastId, items) => {
    for (const it of items) {
        const qty = Number(it.forecast_qty || 0);
        const price = Number(it.price || 0);
        const subtotal = qty * price;
        const confidence = Number(it.confidence_level ?? 100);
        const weighted = Number(it.weighted_amount ?? ((subtotal * confidence) / 100));
        const targetDate = it.target_date ? String(it.target_date).split('T')[0] : null;
        const minQty = Number(it.min_qty || 0);
        const maxQty = Number(it.max_qty || 0);
        console.log(`[FORECAST DETAIL INSERT] fid=${forecastId} product=${it.product_code||''} qty=${qty} price=${price} remark=${it.remark||''}`);
        await conn.query(`INSERT INTO customer_forecast_details 
            (forecast_id, product_id, product_name, product_code, product_unit, forecast_qty, price, sub_total, target_date, confidence_level, weighted_amount, min_qty, max_qty, remark, created_at, updated_at) 
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
            [forecastId, it.product_id||null, it.product_name, it.product_code||null, it.product_unit||null, qty, price, subtotal, targetDate, confidence, weighted, minQty, maxQty, it.remark||null]);
    }
};

exports.createForecast = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const userId = req.user?.id || 1;
        const {
            customer_id, doc_date, start_date, end_date, salesman_id, warehouse_id, currency_id, exchange_rate,
            month, year, forecast_type, period_type, confidence_level, revision_number, valid_until, note, items
        } = req.body;
        console.log(`[CREATE FORECAST] customer_id=${customer_id} doc_date=${doc_date} start_date=${start_date} end_date=${end_date} items=${items?.length||0}`);
        
        const reference = req.body.reference || await genRef('FCT');
        const { total_qty, total_amount, weighted_amount: calcWeighted } = calcForecastTotals(items);
        const headerConfidence = Number(confidence_level ?? 100);
        const headerWeighted = req.body.weighted_amount != null ? Number(req.body.weighted_amount) : calcWeighted;

        const dateForMY = start_date || doc_date || new Date().toISOString().split('T')[0];
        const computedMonth = month || (new Date(dateForMY).getMonth() + 1);
        const computedYear = year || new Date(dateForMY).getFullYear();

        const [h] = await conn.query(`
            INSERT INTO customer_forecasts (
                reference, forecast_type, period_type, customer_id, doc_date, start_date, end_date,
                salesman_id, warehouse_id, currency_id, exchange_rate, total_qty, total_amount,
                confidence_level, weighted_amount, revision_number, valid_until, month, year, note, status, created_at, updated_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'None',NOW(),NOW())`,
            [
                reference, forecast_type || 'Sales Forecast', period_type || 'Monthly', customer_id || null,
                doc_date ? doc_date.split('T')[0] : null, start_date ? start_date.split('T')[0] : null, end_date ? end_date.split('T')[0] : null,
                salesman_id || null, warehouse_id || null, currency_id || null, exchange_rate || 1, total_qty, total_amount,
                headerConfidence, headerWeighted, revision_number || 'V1.0', valid_until ? valid_until.split('T')[0] : null, computedMonth, computedYear, note || null
            ]
        );
        const fid = h.insertId;
        if (items?.length) await insertForecastDetails(conn, fid, items);

        // Check Approval System
        const [types] = await conn.execute('SELECT id FROM approval_types WHERE approval_name IN ("Customer Forecast", "Forecast") LIMIT 1');
        let finalStatus = 'None';
        if (types.length > 0) {
            const approval = await approvalService.createRequest(
                'Customer Forecast', fid, types[0].id, total_amount, userId, conn
            );
            if (approval.status === 'pending') {
                finalStatus = 'Waiting for Approval';
            } else if (approval.status === 'approved') {
                finalStatus = 'Approved';
            } else {
                finalStatus = 'None';
            }
        }
        await conn.execute('UPDATE customer_forecasts SET status = ? WHERE id = ?', [finalStatus, fid]);

        await conn.commit();
        console.log(`[CREATE FORECAST OK] id=${fid} ref=${reference} status=${finalStatus}`);
        res.status(201).json({ success: true, id: fid, reference, status: finalStatus });
    } catch (e) { await conn.rollback(); console.error('[CREATE FORECAST ERROR]', e); res.status(500).json({ message: e.message }); }
    finally { conn.release(); }
};

exports.updateForecast = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;
        const {
            customer_id, doc_date, start_date, end_date, salesman_id, warehouse_id, currency_id, exchange_rate,
            month, year, forecast_type, period_type, confidence_level, revision_number, valid_until, note, items
        } = req.body;
        console.log(`[UPDATE FORECAST #${id}] start_date=${start_date} end_date=${end_date} items=${items?.length||0}`);
        
        const { total_qty, total_amount, weighted_amount: calcWeighted } = calcForecastTotals(items);
        const headerConfidence = Number(confidence_level ?? 100);
        const headerWeighted = req.body.weighted_amount != null ? Number(req.body.weighted_amount) : calcWeighted;

        const dateForMY = start_date || doc_date || new Date().toISOString().split('T')[0];
        const computedMonth = month || (new Date(dateForMY).getMonth() + 1);
        const computedYear = year || new Date(dateForMY).getFullYear();

        const [existing] = await conn.execute('SELECT status FROM customer_forecasts WHERE id = ?', [id]);
        const currentStatus = (existing.length > 0 && existing[0].status) ? existing[0].status : 'None';

        await conn.query(`
            UPDATE customer_forecasts SET
                customer_id=?, doc_date=?, start_date=?, end_date=?, salesman_id=?, warehouse_id=?, currency_id=?, exchange_rate=?,
                total_qty=?, total_amount=?, forecast_type=?, period_type=?, confidence_level=?, weighted_amount=?,
                revision_number=?, valid_until=?, month=?, year=?, note=?, status=?, updated_at=NOW()
            WHERE id=?`,
            [
                customer_id || null, doc_date ? doc_date.split('T')[0] : null, start_date ? start_date.split('T')[0] : null, end_date ? end_date.split('T')[0] : null,
                salesman_id || null, warehouse_id || null, currency_id || null, exchange_rate || 1,
                total_qty, total_amount, forecast_type || 'Sales Forecast', period_type || 'Monthly', headerConfidence, headerWeighted,
                revision_number || 'V1.0', valid_until ? valid_until.split('T')[0] : null, computedMonth, computedYear, note || null, currentStatus, id
            ]
        );
        if (items) {
            await conn.execute(`DELETE FROM customer_forecast_details WHERE forecast_id=?`, [id]);
            await insertForecastDetails(conn, id, items);
        }
        await conn.commit();
        console.log(`[UPDATE FORECAST #${id} OK]`);
        res.json({ success: true });
    } catch (e) { await conn.rollback(); console.error('[UPDATE FORECAST ERROR]', e); res.status(500).json({ message: e.message }); }
    finally { conn.release(); }
};

exports.deleteForecast = async (req, res) => {
    try {
        const [used] = await db.execute(`SELECT id FROM customer_po_details WHERE forecast_detail_id IN (SELECT id FROM customer_forecast_details WHERE forecast_id=?) LIMIT 1`, [req.params.id]);
        if (used.length) return res.status(400).json({ message: 'Forecast sudah dipakai di Customer PO, tidak dapat dihapus.' });
        await db.execute(`DELETE FROM customer_forecasts WHERE id=?`, [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMER PO (customer_po)
// ═══════════════════════════════════════════════════════════════════════════

exports.getCustomerPOs = async (req, res) => {
    try {
        const { search, page = 1, limit = 9999, status, customer_id } = req.query;
        const offset = (parseInt(page)-1) * parseInt(limit);
        let q = `SELECT p.*, c.customer_name, s.name as salesman_name, cur.code as currency_code,
                 COALESCE((
                     SELECT SUM(osd.sub_total)
                     FROM order_sheet_details osd
                     JOIN customer_po_details pod ON osd.po_detail_id = pod.id
                     WHERE pod.po_id = p.id
                 ), 0) as fulfilled_amount
                 FROM customer_po p
                 LEFT JOIN customers c ON p.customer_id = c.id
                 LEFT JOIN salesman s ON p.salesman_id = s.id
                 LEFT JOIN currencies cur ON p.currency_id = cur.id
                 WHERE 1=1`;
        const params = [];
        if (search) { q += ' AND (p.reference LIKE ? OR p.no_po_customer LIKE ? OR c.customer_name LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
        if (status) { q += ' AND p.status = ?'; params.push(status); }
        if (customer_id) { q += ' AND p.customer_id = ?'; params.push(customer_id); }
        
        const countQuery = `SELECT COUNT(*) as cnt FROM customer_po p LEFT JOIN customers c ON p.customer_id = c.id WHERE 1=1` +
            (search ? ' AND (p.reference LIKE ? OR p.no_po_customer LIKE ? OR c.customer_name LIKE ?)' : '') +
            (status ? ' AND p.status = ?' : '') +
            (customer_id ? ' AND p.customer_id = ?' : '');

        const [cnt] = await db.query(countQuery, params);
        q += ` ORDER BY p.id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
        const [rows] = await db.query(q, params);
        res.json({ success: true, data: serialize(rows), total: cnt[0].cnt, current_page: parseInt(page), last_page: Math.ceil(cnt[0].cnt / parseInt(limit)) });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getCustomerPOById = async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT p.*, c.customer_name, s.name as salesman_name, cur.code as currency_code
            FROM customer_po p
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN salesman s ON p.salesman_id = s.id
            LEFT JOIN currencies cur ON p.currency_id = cur.id
            WHERE p.id=?`, [req.params.id]);
        if (!rows.length) return res.status(404).json({ message: 'Not found' });
        const [details] = await db.execute(`
            SELECT
                d.id, d.po_id, d.forecast_detail_id, d.product_id,
                COALESCE(NULLIF(p.product_name,''), d.product_name) as product_name,
                COALESCE(NULLIF(p.product_code,''), d.product_code) as product_code,
                COALESCE(NULLIF(p.product_unit,''), d.product_unit) as product_unit,
                d.po_qty, d.price, d.discount_percent, d.discount_amount, d.sub_total, d.remark,
                fd.product_name as forecast_product_name, fd.forecast_qty,
                d.created_at, d.updated_at
            FROM customer_po_details d
            LEFT JOIN products p ON d.product_id = p.id
            LEFT JOIN customer_forecast_details fd ON d.forecast_detail_id = fd.id
            WHERE d.po_id=?`, [req.params.id]);
        res.json({ success: true, data: { ...serialize(rows[0]), details: serialize(details) } });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// Pull forecast items untuk Customer PO
exports.getForecastItemsForPO = async (req, res) => {
    try {
        const { customer_id } = req.query;
        let q = `
            SELECT fd.*, f.reference as forecast_ref, f.month, f.year, c.customer_name,
                   f.salesman_id, s.name as salesman_name, f.currency_id, f.exchange_rate, f.note as forecast_note,
                   f.start_date as forecast_start_date, f.end_date as forecast_end_date,
                   fd.forecast_qty - COALESCE(used.used_qty,0) as remaining_qty
            FROM customer_forecast_details fd
            JOIN customer_forecasts f ON fd.forecast_id = f.id
            LEFT JOIN customers c ON f.customer_id = c.id
            LEFT JOIN salesman s ON f.salesman_id = s.id
            LEFT JOIN (
                SELECT forecast_detail_id, SUM(po_qty) as used_qty FROM customer_po_details GROUP BY forecast_detail_id
            ) used ON fd.id = used.forecast_detail_id
            WHERE (f.status = 'Approved' OR f.status = 'None' OR f.status = 'Completed' OR f.status IS NULL)
            AND (fd.forecast_qty - COALESCE(used.used_qty,0)) > 0
        `;
        const p = [];
        if (customer_id) { q += ' AND f.customer_id = ?'; p.push(customer_id); }
        q += ' ORDER BY f.id DESC, fd.id ASC';
        const [rows] = await db.query(q, p);
        res.json({ success: true, data: serialize(rows) });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// Hitung subtotal per item, diskon header, PPN, biaya kirim, dan grand total PO
const calcPOTotals = (items = [], discount_percent = 0, tax_percent = 0, shipping_cost = 0) => {
    let total_qty = 0, sub_total = 0;
    const lines = items.map(it => {
        const qty = Number(it.po_qty || 0);
        const price = Number(it.price || 0);
        const gross = qty * price;
        const discPct = Number(it.discount_percent || 0);
        const discAmt = discPct > 0 ? (gross * discPct / 100) : Number(it.discount_amount || 0);
        const line_total = gross - discAmt;
        total_qty += qty;
        sub_total += line_total;
        return { ...it, po_qty: qty, price, discount_percent: discPct, discount_amount: discAmt, sub_total: line_total };
    });
    const discount_amount = sub_total * Number(discount_percent || 0) / 100;
    const dpp = sub_total - discount_amount;
    const tax_amount = dpp * Number(tax_percent || 0) / 100;
    const shipFee = Number(shipping_cost || 0);
    return { lines, total_qty, sub_total, discount_amount, tax_amount, shipping_cost: shipFee, grand_total: dpp + tax_amount + shipFee };
};

const insertPODetails = async (conn, poId, lines) => {
    for (const it of lines) {
        if (!it.po_qty || Number(it.po_qty) <= 0) continue;
        await conn.query(`INSERT INTO customer_po_details (po_id, forecast_detail_id, product_id, product_name, product_code, product_unit, po_qty, price, discount_percent, discount_amount, sub_total, remark, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
            [poId, it.forecast_detail_id||null, it.product_id||null, it.product_name, it.product_code||null, it.product_unit||null, it.po_qty, it.price, it.discount_percent, it.discount_amount, it.sub_total, it.remark||null]);
    }
};

exports.createCustomerPO = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const userId = req.user?.id || 1;
        const {
            customer_id, salesman_id, no_po_customer, po_type, tanggal_po, delivery_date,
            ship_to_address, shipping_method, bill_to_address, contact_person, contact_phone,
            top_days, due_date, currency_id, exchange_rate, payment_method,
            discount_percent, tax_percent, shipping_cost, note, items
        } = req.body;
        const reference = req.body.reference || await genRef('CPO');
        const t = calcPOTotals(items, discount_percent, tax_percent, shipping_cost);
        const [h] = await conn.query(`INSERT INTO customer_po (
            reference, customer_id, salesman_id, no_po_customer, po_type, tanggal_po, delivery_date,
            ship_to_address, shipping_method, bill_to_address, contact_person, contact_phone,
            top_days, due_date, currency_id, exchange_rate, payment_method,
            sub_total, discount_percent, discount_amount, tax_percent, tax_amount, shipping_cost, grand_total, total_qty, note, status, created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'None',NOW(),NOW())`,
        [
            reference, customer_id||null, salesman_id||null, no_po_customer||null, po_type||'Regular Order', tanggal_po||null, delivery_date||null,
            ship_to_address||null, shipping_method||'Franco', bill_to_address||null, contact_person||null, contact_phone||null,
            top_days||0, due_date||null, currency_id||null, exchange_rate||1, payment_method||'Transfer Bank',
            t.sub_total, discount_percent||0, t.discount_amount, tax_percent||0, t.tax_amount, t.shipping_cost, t.grand_total, t.total_qty, note||null
        ]);
        const pid = h.insertId;
        if (t.lines.length) await insertPODetails(conn, pid, t.lines);

        // Check Approval System
        const [types] = await conn.execute('SELECT id FROM approval_types WHERE approval_name IN ("Customer PO", "Purchase Order") ORDER BY (approval_name = "Customer PO") DESC LIMIT 1');
        let finalStatus = 'None';
        if (types.length > 0) {
            const approval = await approvalService.createRequest(
                'Customer PO', pid, types[0].id, t.grand_total, userId, conn
            );
            if (approval.status === 'pending') {
                finalStatus = 'Waiting for Approval';
            } else if (approval.status === 'approved') {
                finalStatus = 'Approved';
            } else {
                finalStatus = 'None';
            }
        }
        await conn.execute('UPDATE customer_po SET status = ? WHERE id = ?', [finalStatus, pid]);

        await conn.commit();
        res.status(201).json({ success: true, id: pid, reference, status: finalStatus });
    } catch (e) { await conn.rollback(); res.status(500).json({ message: e.message }); }
    finally { conn.release(); }
};

exports.updateCustomerPO = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;
        const {
            customer_id, salesman_id, no_po_customer, po_type, tanggal_po, delivery_date,
            ship_to_address, shipping_method, bill_to_address, contact_person, contact_phone,
            top_days, due_date, currency_id, exchange_rate, payment_method,
            discount_percent, tax_percent, shipping_cost, note, items
        } = req.body;
        const t = calcPOTotals(items, discount_percent, tax_percent, shipping_cost);

        const [existing] = await conn.execute('SELECT status FROM customer_po WHERE id = ?', [id]);
        const currentStatus = (existing.length > 0 && existing[0].status) ? existing[0].status : 'None';

        await conn.query(`UPDATE customer_po SET
            customer_id=?, salesman_id=?, no_po_customer=?, po_type=?, tanggal_po=?, delivery_date=?,
            ship_to_address=?, shipping_method=?, bill_to_address=?, contact_person=?, contact_phone=?,
            top_days=?, due_date=?, currency_id=?, exchange_rate=?, payment_method=?,
            sub_total=?, discount_percent=?, discount_amount=?, tax_percent=?, tax_amount=?, shipping_cost=?, grand_total=?, total_qty=?, note=?, status=?, updated_at=NOW()
            WHERE id=?`,
        [
            customer_id||null, salesman_id||null, no_po_customer||null, po_type||'Regular Order', tanggal_po||null, delivery_date||null,
            ship_to_address||null, shipping_method||'Franco', bill_to_address||null, contact_person||null, contact_phone||null,
            top_days||0, due_date||null, currency_id||null, exchange_rate||1, payment_method||'Transfer Bank',
            t.sub_total, discount_percent||0, t.discount_amount, tax_percent||0, t.tax_amount, t.shipping_cost, t.grand_total, t.total_qty, note||null, currentStatus, id
        ]);
        if (items) {
            await conn.execute(`DELETE FROM customer_po_details WHERE po_id=?`, [id]);
            await insertPODetails(conn, id, t.lines);
        }
        await conn.commit();
        res.json({ success: true });
    } catch (e) { await conn.rollback(); res.status(500).json({ message: e.message }); }
    finally { conn.release(); }
};

exports.deleteCustomerPO = async (req, res) => {
    try {
        const [used] = await db.execute(`SELECT id FROM order_sheet_details WHERE po_detail_id IN (SELECT id FROM customer_po_details WHERE po_id=?) LIMIT 1`, [req.params.id]);
        if (used.length) return res.status(400).json({ message: 'Customer PO sudah ditarik ke Order Sheet.' });
        await db.execute(`DELETE FROM customer_po WHERE id=?`, [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// ═══════════════════════════════════════════════════════════════════════════
// ORDER SHEET (order_sheets)
// ═══════════════════════════════════════════════════════════════════════════

exports.getOrderSheets = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page)-1) * parseInt(limit);
        let q = `SELECT os.*, c.customer_name FROM order_sheets os LEFT JOIN customers c ON os.customer_id = c.id WHERE 1=1`;
        const p = [];
        if (search) { q += ' AND (os.reference LIKE ? OR c.customer_name LIKE ?)'; p.push(`%${search}%`,`%${search}%`); }
        const [cnt] = await db.query(q.replace('os.*, c.customer_name','COUNT(*) as cnt'), p);
        q += ` ORDER BY os.id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
        const [rows] = await db.query(q, p);
        res.json({ success: true, data: serialize(rows), total: cnt[0].cnt, current_page: parseInt(page), last_page: Math.ceil(cnt[0].cnt / parseInt(limit)) });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getOrderSheetById = async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT os.*, c.customer_name FROM order_sheets os LEFT JOIN customers c ON os.customer_id = c.id WHERE os.id=?`, [req.params.id]);
        if (!rows.length) return res.status(404).json({ message: 'Not found' });
        const [details] = await db.execute(`
            SELECT d.*, pod.product_name as po_product_name, pod.po_qty
            FROM order_sheet_details d
            LEFT JOIN customer_po_details pod ON d.po_detail_id = pod.id
            WHERE d.os_id=?`, [req.params.id]);
        res.json({ success: true, data: { ...serialize(rows[0]), details: serialize(details) } });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// Pull Customer PO items untuk Order Sheet
exports.getPOItemsForOrderSheet = async (req, res) => {
    try {
        const { customer_id } = req.query;
        let q = `
            SELECT pod.*, p.reference as po_ref, p.no_po_customer, p.tanggal_po, p.delivery_date, c.customer_name,
                   pod.po_qty - COALESCE(used.used_qty,0) as remaining_qty
            FROM customer_po_details pod
            JOIN customer_po p ON pod.po_id = p.id
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN (
                SELECT po_detail_id, SUM(os_qty) as used_qty FROM order_sheet_details GROUP BY po_detail_id
            ) used ON pod.id = used.po_detail_id
            WHERE p.status = 'Approved'
            AND (pod.po_qty - COALESCE(used.used_qty,0)) > 0
        `;
        const params = [];
        if (customer_id) { q += ' AND p.customer_id = ?'; params.push(customer_id); }
        q += ' ORDER BY p.id DESC, pod.id ASC';
        const [rows] = await db.query(q, params);
        res.json({ success: true, data: serialize(rows) });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.createOrderSheet = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { customer_id, period_month, period_year, delivery_date, note, items } = req.body;
        const reference = req.body.reference || await genRef('OS');
        const total_qty = (items||[]).reduce((s,i)=>s+Number(i.os_qty||0),0);
        const [h] = await conn.query(`INSERT INTO order_sheets (reference, customer_id, period_month, period_year, delivery_date, total_qty, note, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,'Draft',NOW(),NOW())`,
            [reference, customer_id||null, period_month||null, period_year||null, delivery_date||null, total_qty, note||null]);
        const osid = h.insertId;
        if (items?.length) {
            for (const it of items) {
                await conn.query(`INSERT INTO order_sheet_details (os_id, po_detail_id, product_id, product_name, product_code, product_unit, os_qty, price, sub_total, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
                    [osid, it.po_detail_id||null, it.product_id||null, it.product_name, it.product_code||null, it.product_unit||null, it.os_qty||0, it.price||0, (it.os_qty||0)*(it.price||0)]);
            }
        }
        await conn.commit();
        res.status(201).json({ success: true, id: osid, reference });
    } catch (e) { await conn.rollback(); res.status(500).json({ message: e.message }); }
    finally { conn.release(); }
};

exports.updateOrderSheet = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;
        const { customer_id, period_month, period_year, delivery_date, note, status, items } = req.body;
        const total_qty = (items||[]).reduce((s,i)=>s+Number(i.os_qty||0),0);
        await conn.query(`UPDATE order_sheets SET customer_id=?, period_month=?, period_year=?, delivery_date=?, total_qty=?, note=?, status=?, updated_at=NOW() WHERE id=?`,
            [customer_id||null, period_month||null, period_year||null, delivery_date||null, total_qty, note||null, status||'Draft', id]);
        if (items) {
            await conn.execute(`DELETE FROM order_sheet_details WHERE os_id=?`, [id]);
            for (const it of items) {
                await conn.query(`INSERT INTO order_sheet_details (os_id, po_detail_id, product_id, product_name, product_code, product_unit, os_qty, price, sub_total, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
                    [id, it.po_detail_id||null, it.product_id||null, it.product_name, it.product_code||null, it.product_unit||null, it.os_qty||0, it.price||0, (it.os_qty||0)*(it.price||0)]);
            }
        }
        await conn.commit();
        res.json({ success: true });
    } catch (e) { await conn.rollback(); res.status(500).json({ message: e.message }); }
    finally { conn.release(); }
};

exports.deleteOrderSheet = async (req, res) => {
    try {
        await db.execute(`DELETE FROM order_sheets WHERE id=?`, [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMERS (CRUD & Dropdowns)
// ═══════════════════════════════════════════════════════════════════════════
exports.getCustomerList = async (req, res) => {
    try {
        const { search } = req.query;
        let q = `SELECT id, customer_name, customer_email, customer_phone, city, address, top_days FROM customers WHERE 1=1`;
        const p = [];
        if (search) { q += ' AND customer_name LIKE ?'; p.push(`%${search}%`); }
        q += ' ORDER BY customer_name ASC LIMIT 100';
        const [rows] = await db.query(q, p);
        res.json({ success: true, data: serialize(rows) });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getCustomers = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page)-1) * parseInt(limit);
        let q = `SELECT * FROM customers WHERE 1=1`;
        const params = [];
        if (search) { q += ' AND (customer_name LIKE ? OR customer_phone LIKE ? OR city LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
        const [cnt] = await db.query(q.replace('*','COUNT(*) as cnt'), params);
        q += ` ORDER BY id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
        const [rows] = await db.query(q, params);
        res.json({ success: true, data: serialize(rows), total: cnt[0].cnt, current_page: parseInt(page), last_page: Math.ceil(cnt[0].cnt / parseInt(limit)) });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getCustomerById = async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT * FROM customers WHERE id=?`, [req.params.id]);
        if (!rows.length) return res.status(404).json({ message: 'Customer not found' });
        res.json({ success: true, data: serialize(rows[0]) });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.createCustomer = async (req, res) => {
    try {
        const { customer_name, customer_email, customer_phone, city, country, address, top_days } = req.body;
        const [result] = await db.query(
            `INSERT INTO customers (customer_name, customer_email, customer_phone, city, country, address, top_days, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [customer_name, customer_email||null, customer_phone||null, city||null, country||null, address||null, parseInt(top_days)||30]
        );
        res.status(201).json({ success: true, id: result.insertId, message: 'Customer created successfully' });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.updateCustomer = async (req, res) => {
    try {
        const { customer_name, customer_email, customer_phone, city, country, address, top_days } = req.body;
        await db.query(
            `UPDATE customers SET customer_name=?, customer_email=?, customer_phone=?, city=?, country=?, address=?, top_days=?, updated_at=NOW() WHERE id=?`,
            [customer_name, customer_email||null, customer_phone||null, city||null, country||null, address||null, parseInt(top_days)||30, req.params.id]
        );
        res.json({ success: true, message: 'Customer updated successfully' });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.deleteCustomer = async (req, res) => {
    try {
        await db.query(`DELETE FROM customers WHERE id=?`, [req.params.id]);
        res.json({ success: true, message: 'Customer deleted' });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// ═══════════════════════════════════════════════════════════════════════════
// 1. TUTUP PENDING SO
// ═══════════════════════════════════════════════════════════════════════════
exports.getTutupPendingSo = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page)-1) * parseInt(limit);
        let q = `SELECT t.*, c.customer_name FROM tutup_pending_so t LEFT JOIN customers c ON t.customer_id = c.id WHERE 1=1`;
        const params = [];
        if (search) { q += ' AND (t.reference LIKE ? OR t.so_reference LIKE ? OR c.customer_name LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
        const [cnt] = await db.query(q.replace('t.*, c.customer_name','COUNT(*) as cnt'), params);
        q += ` ORDER BY t.id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
        const [rows] = await db.query(q, params);
        res.json({ success: true, data: serialize(rows), total: cnt[0].cnt, current_page: parseInt(page), last_page: Math.ceil(cnt[0].cnt / parseInt(limit)) });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getTutupPendingSoById = async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT t.*, c.customer_name FROM tutup_pending_so t LEFT JOIN customers c ON t.customer_id = c.id WHERE t.id=?`, [req.params.id]);
        if (!rows.length) return res.status(404).json({ message: 'Not found' });
        res.json({ success: true, data: serialize(rows[0]) });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.createTutupPendingSo = async (req, res) => {
    try {
        const { customer_id, so_reference, reason, date } = req.body;
        const reference = req.body.reference || await genRef('TPS');
        const [result] = await db.query(
            `INSERT INTO tutup_pending_so (reference, customer_id, so_reference, reason, date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'Approved', NOW(), NOW())`,
            [reference, customer_id || null, so_reference || null, reason || null, date || new Date().toISOString().split('T')[0]]
        );
        res.status(201).json({ success: true, id: result.insertId, reference });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.updateTutupPendingSo = async (req, res) => {
    try {
        const { customer_id, so_reference, reason, date, status } = req.body;
        await db.query(
            `UPDATE tutup_pending_so SET customer_id=?, so_reference=?, reason=?, date=?, status=?, updated_at=NOW() WHERE id=?`,
            [customer_id || null, so_reference || null, reason || null, date || null, status || 'Approved', req.params.id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.deleteTutupPendingSo = async (req, res) => {
    try {
        await db.execute('DELETE FROM tutup_pending_so WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. TRANSAKSI A.R.
// ═══════════════════════════════════════════════════════════════════════════
exports.getTransaksiAr = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page)-1) * parseInt(limit);
        let q = `SELECT t.*, c.customer_name FROM transaksi_ar t LEFT JOIN customers c ON t.customer_id = c.id WHERE 1=1`;
        const params = [];
        if (search) { q += ' AND (t.reference LIKE ? OR t.invoice_reference LIKE ? OR c.customer_name LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
        const [cnt] = await db.query(q.replace('t.*, c.customer_name','COUNT(*) as cnt'), params);
        q += ` ORDER BY t.id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
        const [rows] = await db.query(q, params);
        res.json({ success: true, data: serialize(rows), total: cnt[0].cnt, current_page: parseInt(page), last_page: Math.ceil(cnt[0].cnt / parseInt(limit)) });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getTransaksiArById = async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT t.*, c.customer_name FROM transaksi_ar t LEFT JOIN customers c ON t.customer_id = c.id WHERE t.id=?`, [req.params.id]);
        if (!rows.length) return res.status(404).json({ message: 'Not found' });
        res.json({ success: true, data: serialize(rows[0]) });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.createTransaksiAr = async (req, res) => {
    try {
        const { customer_id, invoice_reference, amount, payment_method, date, note, status } = req.body;
        const reference = req.body.reference || await genRef('TAR');
        const [result] = await db.query(
            `INSERT INTO transaksi_ar (reference, customer_id, invoice_reference, amount, payment_method, date, note, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [reference, customer_id || null, invoice_reference || null, amount || 0, payment_method || null, date || null, note || null, status || 'Draft']
        );
        res.status(201).json({ success: true, id: result.insertId, reference });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.updateTransaksiAr = async (req, res) => {
    try {
        const { customer_id, invoice_reference, amount, payment_method, date, note, status } = req.body;
        await db.query(
            `UPDATE transaksi_ar SET customer_id=?, invoice_reference=?, amount=?, payment_method=?, date=?, note=?, status=?, updated_at=NOW() WHERE id=?`,
            [customer_id || null, invoice_reference || null, amount || 0, payment_method || null, date || null, note || null, status || 'Draft', req.params.id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.deleteTransaksiAr = async (req, res) => {
    try {
        await db.execute('DELETE FROM transaksi_ar WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// Helper for generating standard CRUD on tables with details (SJ, Retur SJ, Penjualan Via SJ, Penjualan Via SO, Penjualan Langsung)
const getGenericWithDetails = (table, detailsTable, parentIdCol) => {
    return async (req, res) => {
        try {
            const { search, page = 1, limit = 10 } = req.query;
            const offset = (parseInt(page)-1) * parseInt(limit);
            let q = `SELECT t.*, c.customer_name FROM ${table} t LEFT JOIN customers c ON t.customer_id = c.id WHERE 1=1`;
            const params = [];
            if (search) { q += ' AND (t.reference LIKE ? OR c.customer_name LIKE ?)'; params.push(`%${search}%`,`%${search}%`); }
            const [cnt] = await db.query(q.replace('t.*, c.customer_name','COUNT(*) as cnt'), params);
            q += ` ORDER BY t.id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
            const [rows] = await db.query(q, params);
            res.json({ success: true, data: serialize(rows), total: cnt[0].cnt, current_page: parseInt(page), last_page: Math.ceil(cnt[0].cnt / parseInt(limit)) });
        } catch (e) { res.status(500).json({ message: e.message }); }
    };
};

const getGenericWithDetailsById = (table, detailsTable, parentIdCol) => {
    return async (req, res) => {
        try {
            const [rows] = await db.execute(`SELECT t.*, c.customer_name FROM ${table} t LEFT JOIN customers c ON t.customer_id = c.id WHERE t.id=?`, [req.params.id]);
            if (!rows.length) return res.status(404).json({ message: 'Not found' });
            const [details] = await db.execute(`SELECT d.*, p.product_code, p.product_unit FROM ${detailsTable} d LEFT JOIN products p ON d.product_id = p.id WHERE d.${parentIdCol}=?`, [req.params.id]);
            res.json({ success: true, data: { ...serialize(rows[0]), details: serialize(details) } });
        } catch (e) { res.status(500).json({ message: e.message }); }
    };
};

const deleteGenericWithDetails = (table) => {
    return async (req, res) => {
        try {
            await db.execute(`DELETE FROM ${table} WHERE id=?`, [req.params.id]);
            res.json({ success: true });
        } catch (e) { res.status(500).json({ message: e.message }); }
    };
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. SURAT JALAN
// ═══════════════════════════════════════════════════════════════════════════
exports.getSuratJalan = async (req, res) => {
    try {
        const { search, page = 1, limit = 10, customer_id, status } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let q = `
            SELECT sj.*, c.customer_name, po.reference as po_reference, po.no_po_customer as po_cust_no
            FROM surat_jalan sj
            LEFT JOIN customers c ON sj.customer_id = c.id
            LEFT JOIN customer_po po ON sj.customer_po_id = po.id
            WHERE 1=1
        `;
        const params = [];
        if (search) {
            q += ' AND (sj.reference LIKE ? OR c.customer_name LIKE ? OR sj.order_sheet_ref LIKE ? OR sj.no_po_customer LIKE ? OR po.no_po_customer LIKE ? OR sj.driver_name LIKE ? OR sj.vehicle_no LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (customer_id) {
            q += ' AND sj.customer_id = ?';
            params.push(customer_id);
        }
        if (status && status !== 'all') {
            q += ' AND sj.status = ?';
            params.push(status);
        }

        const countQuery = `SELECT COUNT(*) as cnt FROM (` + q + `) as count_table`;
        const [cnt] = await db.query(countQuery, params);

        q += ` ORDER BY sj.id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
        const [rows] = await db.query(q, params);

        res.json({
            success: true,
            data: serialize(rows),
            total: cnt[0].cnt,
            current_page: parseInt(page),
            last_page: Math.ceil(cnt[0].cnt / parseInt(limit))
        });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

exports.getSuratJalanById = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT sj.*, c.customer_name, po.reference as po_reference, po.no_po_customer as po_cust_no
            FROM surat_jalan sj
            LEFT JOIN customers c ON sj.customer_id = c.id
            LEFT JOIN customer_po po ON sj.customer_po_id = po.id
            WHERE sj.id = ?
        `, [req.params.id]);
        if (!rows.length) return res.status(404).json({ message: 'Surat Jalan tidak ditemukan' });

        const [details] = await db.execute(`
            SELECT d.*, p.product_code as live_product_code, p.product_unit as live_product_unit
            FROM surat_jalan_details d
            LEFT JOIN products p ON d.product_id = p.id
            WHERE d.sj_id = ?
        `, [req.params.id]);

        res.json({
            success: true,
            data: {
                ...serialize(rows[0]),
                details: serialize(details)
            }
        });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

exports.deleteSuratJalan = deleteGenericWithDetails('surat_jalan');

exports.createSuratJalan = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const {
            customer_id,
            source_type,
            source_ref,
            customer_po_id,
            no_po_customer,
            order_sheet_ref,
            driver_name,
            vehicle_no,
            delivery_date,
            returned_date,
            received_by_customer,
            return_notes,
            note,
            status,
            items,
            details
        } = req.body;
        const finalItems = items || details || [];
        const reference = req.body.reference || await genRef('DO');

        const [h] = await conn.query(
            `INSERT INTO surat_jalan (
                reference, customer_id, source_type, source_ref, customer_po_id, no_po_customer, order_sheet_ref,
                driver_name, vehicle_no, delivery_date, returned_date, received_by_customer,
                return_notes, note, status, created_at, updated_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
            [
                reference,
                customer_id || null,
                source_type || 'PO_CUSTOMER',
                source_ref || null,
                customer_po_id || null,
                no_po_customer || null,
                order_sheet_ref || null,
                driver_name || null,
                vehicle_no || null,
                delivery_date || null,
                returned_date || null,
                received_by_customer || null,
                return_notes || null,
                note || null,
                status || (returned_date ? 'Returned' : 'Draft')
            ]
        );
        const sjid = h.insertId;
        if (finalItems?.length) {
            for (const it of finalItems) {
                await conn.query(
                    `INSERT INTO surat_jalan_details (
                        sj_id, product_id, product_name, product_code, product_unit, qty_delivered, created_at, updated_at
                    ) VALUES (?,?,?,?,?,?,NOW(),NOW())`,
                    [
                        sjid,
                        it.product_id || null,
                        it.product_name,
                        it.product_code || null,
                        it.product_unit || null,
                        it.qty_delivered || 0
                    ]
                );
            }
        }
        await conn.commit();
        res.status(201).json({ success: true, id: sjid, reference });
    } catch (e) {
        await conn.rollback();
        res.status(500).json({ message: e.message });
    } finally {
        conn.release();
    }
};

exports.updateSuratJalan = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;
        const {
            customer_id,
            source_type,
            source_ref,
            customer_po_id,
            no_po_customer,
            order_sheet_ref,
            driver_name,
            vehicle_no,
            delivery_date,
            returned_date,
            received_by_customer,
            return_notes,
            note,
            status,
            items,
            details
        } = req.body;
        const finalItems = items || details;

        await conn.query(
            `UPDATE surat_jalan SET 
                customer_id=?, source_type=?, source_ref=?, customer_po_id=?, no_po_customer=?, order_sheet_ref=?,
                driver_name=?, vehicle_no=?, delivery_date=?, returned_date=?, received_by_customer=?,
                return_notes=?, note=?, status=?, updated_at=NOW()
            WHERE id=?`,
            [
                customer_id || null,
                source_type || 'PO_CUSTOMER',
                source_ref || null,
                customer_po_id || null,
                no_po_customer || null,
                order_sheet_ref || null,
                driver_name || null,
                vehicle_no || null,
                delivery_date || null,
                returned_date || null,
                received_by_customer || null,
                return_notes || null,
                note || null,
                status || (returned_date ? 'Returned' : 'Draft'),
                id
            ]
        );
        if (finalItems) {
            await conn.execute(`DELETE FROM surat_jalan_details WHERE sj_id=?`, [id]);
            for (const it of finalItems) {
                await conn.query(
                    `INSERT INTO surat_jalan_details (
                        sj_id, product_id, product_name, product_code, product_unit, qty_delivered, created_at, updated_at
                    ) VALUES (?,?,?,?,?,?,NOW(),NOW())`,
                    [
                        id,
                        it.product_id || null,
                        it.product_name,
                        it.product_code || null,
                        it.product_unit || null,
                        it.qty_delivered || 0
                    ]
                );
            }
        }
        await conn.commit();
        res.json({ success: true });
    } catch (e) {
        await conn.rollback();
        res.status(500).json({ message: e.message });
    } finally {
        conn.release();
    }
};

exports.updateSuratJalanReturn = async (req, res) => {
    try {
        const { id } = req.params;
        const { returned_date, received_by_customer, return_notes, status } = req.body;
        await db.query(
            `UPDATE surat_jalan SET 
                returned_date = ?,
                received_by_customer = ?,
                return_notes = ?,
                status = COALESCE(?, status, 'Returned'),
                updated_at = NOW()
            WHERE id = ?`,
            [
                returned_date || null,
                received_by_customer || null,
                return_notes || null,
                status || (returned_date ? 'Returned' : null),
                id
            ]
        );
        res.json({ success: true, message: 'Tanggal kembali Surat Jalan berhasil disimpan.' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// 4. RETUR SURAT JALAN
// ═══════════════════════════════════════════════════════════════════════════
exports.getReturSuratJalan = getGenericWithDetails('retur_surat_jalan', 'retur_surat_jalan_details', 'retur_id');
exports.getReturSuratJalanById = getGenericWithDetailsById('retur_surat_jalan', 'retur_surat_jalan_details', 'retur_id');
exports.deleteReturSuratJalan = deleteGenericWithDetails('retur_surat_jalan');

exports.createReturSuratJalan = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { customer_id, sj_reference, return_date, reason, items } = req.body;
        const reference = req.body.reference || await genRef('RDO');
        const [h] = await conn.query(
            `INSERT INTO retur_surat_jalan (reference, customer_id, sj_reference, return_date, reason, status, created_at, updated_at) VALUES (?,?,?,?,?, 'Draft', NOW(), NOW())`,
            [reference, customer_id||null, sj_reference||null, return_date||null, reason||null]
        );
        const retid = h.insertId;
        if (items?.length) {
            for (const it of items) {
                await conn.query(
                    `INSERT INTO retur_surat_jalan_details (retur_id, product_id, product_name, product_code, product_unit, qty_returned, created_at, updated_at) VALUES (?,?,?,?,?,?,NOW(),NOW())`,
                    [retid, it.product_id||null, it.product_name, it.product_code||null, it.product_unit||null, it.qty_returned||0]
                );
            }
        }
        await conn.commit();
        res.status(201).json({ success: true, id: retid, reference });
    } catch (e) { await conn.rollback(); res.status(500).json({ message: e.message }); }
    finally { conn.release(); }
};

exports.updateReturSuratJalan = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;
        const { customer_id, sj_reference, return_date, reason, status, items } = req.body;
        await conn.query(
            `UPDATE retur_surat_jalan SET customer_id=?, sj_reference=?, return_date=?, reason=?, status=?, updated_at=NOW() WHERE id=?`,
            [customer_id||null, sj_reference||null, return_date||null, reason||null, status||'Draft', id]
        );
        if (items) {
            await conn.execute(`DELETE FROM retur_surat_jalan_details WHERE retur_id=?`, [id]);
            for (const it of items) {
                await conn.query(
                    `INSERT INTO retur_surat_jalan_details (retur_id, product_id, product_name, product_code, product_unit, qty_returned, created_at, updated_at) VALUES (?,?,?,?,?,?,NOW(),NOW())`,
                    [id, it.product_id||null, it.product_name, it.product_code||null, it.product_unit||null, it.qty_returned||0]
                );
            }
        }
        await conn.commit();
        res.json({ success: true });
    } catch (e) { await conn.rollback(); res.status(500).json({ message: e.message }); }
    finally { conn.release(); }
};

// ═══════════════════════════════════════════════════════════════════════════
// 5. PENJUALAN VIA S.J.
// ═══════════════════════════════════════════════════════════════════════════
exports.getPenjualanViaSj = getGenericWithDetails('penjualan_via_sj', 'penjualan_via_sj_details', 'sales_id');
exports.getPenjualanViaSjById = getGenericWithDetailsById('penjualan_via_sj', 'penjualan_via_sj_details', 'sales_id');
exports.deletePenjualanViaSj = deleteGenericWithDetails('penjualan_via_sj');

exports.createPenjualanViaSj = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { customer_id, sj_reference, date, note, items } = req.body;
        const reference = req.body.reference || await genRef('VSJ');
        const [h] = await conn.query(
            `INSERT INTO penjualan_via_sj (reference, customer_id, sj_reference, date, note, status, created_at, updated_at) VALUES (?,?,?,?,?, 'Draft', NOW(), NOW())`,
            [reference, customer_id||null, sj_reference||null, date||null, note||null]
        );
        const salesId = h.insertId;
        if (items?.length) {
            for (const it of items) {
                await conn.query(
                    `INSERT INTO penjualan_via_sj_details (sales_id, product_id, product_name, product_code, product_unit, qty, price, sub_total, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())`,
                    [salesId, it.product_id||null, it.product_name, it.product_code||null, it.product_unit||null, it.qty||0, it.price||0, (it.qty||0)*(it.price||0)]
                );
            }
        }
        await conn.commit();
        res.status(201).json({ success: true, id: salesId, reference });
    } catch (e) { await conn.rollback(); res.status(500).json({ message: e.message }); }
    finally { conn.release(); }
};

exports.updatePenjualanViaSj = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;
        const { customer_id, sj_reference, date, note, status, items } = req.body;
        await conn.query(
            `UPDATE penjualan_via_sj SET customer_id=?, sj_reference=?, date=?, note=?, status=?, updated_at=NOW() WHERE id=?`,
            [customer_id||null, sj_reference||null, date||null, note||null, status||'Draft', id]
        );
        if (items) {
            await conn.execute(`DELETE FROM penjualan_via_sj_details WHERE sales_id=?`, [id]);
            for (const it of items) {
                await conn.query(
                    `INSERT INTO penjualan_via_sj_details (sales_id, product_id, product_name, product_code, product_unit, qty, price, sub_total, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())`,
                    [id, it.product_id||null, it.product_name, it.product_code||null, it.product_unit||null, it.qty||0, it.price||0, (it.qty||0)*(it.price||0)]
                );
            }
        }
        await conn.commit();
        res.json({ success: true });
    } catch (e) { await conn.rollback(); res.status(500).json({ message: e.message }); }
    finally { conn.release(); }
};

// ═══════════════════════════════════════════════════════════════════════════
// 6. PENJUALAN VIA S.O.
// ═══════════════════════════════════════════════════════════════════════════
exports.getPenjualanViaSo = getGenericWithDetails('penjualan_via_so', 'penjualan_via_so_details', 'sales_id');
exports.getPenjualanViaSoById = getGenericWithDetailsById('penjualan_via_so', 'penjualan_via_so_details', 'sales_id');
exports.deletePenjualanViaSo = deleteGenericWithDetails('penjualan_via_so');

exports.createPenjualanViaSo = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { customer_id, order_sheet_ref, date, note, items } = req.body;
        const reference = req.body.reference || await genRef('VSO');
        const [h] = await conn.query(
            `INSERT INTO penjualan_via_so (reference, customer_id, order_sheet_ref, date, note, status, created_at, updated_at) VALUES (?,?,?,?,?, 'Draft', NOW(), NOW())`,
            [reference, customer_id||null, order_sheet_ref||null, date||null, note||null]
        );
        const salesId = h.insertId;
        if (items?.length) {
            for (const it of items) {
                await conn.query(
                    `INSERT INTO penjualan_via_so_details (sales_id, product_id, product_name, product_code, product_unit, qty, price, sub_total, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())`,
                    [salesId, it.product_id||null, it.product_name, it.product_code||null, it.product_unit||null, it.qty||0, it.price||0, (it.qty||0)*(it.price||0)]
                );
            }
        }
        await conn.commit();
        res.status(201).json({ success: true, id: salesId, reference });
    } catch (e) { await conn.rollback(); res.status(500).json({ message: e.message }); }
    finally { conn.release(); }
};

exports.updatePenjualanViaSo = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;
        const { customer_id, order_sheet_ref, date, note, status, items } = req.body;
        await conn.query(
            `UPDATE penjualan_via_so SET customer_id=?, order_sheet_ref=?, date=?, note=?, status=?, updated_at=NOW() WHERE id=?`,
            [customer_id||null, order_sheet_ref||null, date||null, note||null, status||'Draft', id]
        );
        if (items) {
            await conn.execute(`DELETE FROM penjualan_via_so_details WHERE sales_id=?`, [id]);
            for (const it of items) {
                await conn.query(
                    `INSERT INTO penjualan_via_so_details (sales_id, product_id, product_name, product_code, product_unit, qty, price, sub_total, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())`,
                    [id, it.product_id||null, it.product_name, it.product_code||null, it.product_unit||null, it.qty||0, it.price||0, (it.qty||0)*(it.price||0)]
                );
            }
        }
        await conn.commit();
        res.json({ success: true });
    } catch (e) { await conn.rollback(); res.status(500).json({ message: e.message }); }
    finally { conn.release(); }
};

// ═══════════════════════════════════════════════════════════════════════════
// 7. PENJUALAN LANGSUNG
// ═══════════════════════════════════════════════════════════════════════════
exports.getPenjualanLangsung = getGenericWithDetails('penjualan_langsung', 'penjualan_langsung_details', 'sales_id');
exports.getPenjualanLangsungById = getGenericWithDetailsById('penjualan_langsung', 'penjualan_langsung_details', 'sales_id');
exports.deletePenjualanLangsung = deleteGenericWithDetails('penjualan_langsung');

exports.createPenjualanLangsung = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { customer_id, date, note, items } = req.body;
        const reference = req.body.reference || await genRef('DIR');
        const [h] = await conn.query(
            `INSERT INTO penjualan_langsung (reference, customer_id, date, note, status, created_at, updated_at) VALUES (?,?,?,?,'Draft',NOW(),NOW())`,
            [reference, customer_id||null, date||null, note||null]
        );
        const salesId = h.insertId;
        if (items?.length) {
            for (const it of items) {
                await conn.query(
                    `INSERT INTO penjualan_langsung_details (sales_id, product_id, product_name, product_code, product_unit, qty, price, sub_total, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())`,
                    [salesId, it.product_id||null, it.product_name, it.product_code||null, it.product_unit||null, it.qty||0, it.price||0, (it.qty||0)*(it.price||0)]
                );
            }
        }
        await conn.commit();
        res.status(201).json({ success: true, id: salesId, reference });
    } catch (e) { await conn.rollback(); res.status(500).json({ message: e.message }); }
    finally { conn.release(); }
};

exports.updatePenjualanLangsung = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;
        const { customer_id, date, note, status, items } = req.body;
        await conn.query(
            `UPDATE penjualan_langsung SET customer_id=?, date=?, note=?, status=?, updated_at=NOW() WHERE id=?`,
            [customer_id||null, date||null, note||null, status||'Draft', id]
        );
        if (items) {
            await conn.execute(`DELETE FROM penjualan_langsung_details WHERE sales_id=?`, [id]);
            for (const it of items) {
                await conn.query(
                    `INSERT INTO penjualan_langsung_details (sales_id, product_id, product_name, product_code, product_unit, qty, price, sub_total, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())`,
                    [id, it.product_id||null, it.product_name, it.product_code||null, it.product_unit||null, it.qty||0, it.price||0, (it.qty||0)*(it.price||0)]
                );
            }
        }
        await conn.commit();
        res.json({ success: true });
    } catch (e) { await conn.rollback(); res.status(500).json({ message: e.message }); }
    finally { conn.release(); }
};

