const db = require('../config/db');

// Utility for BigInt serialization
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

// Helper: get days in month
function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

// Helper: format date as YYYY-MM-DD
function fmtDate(y, m, d) {
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Rekap Plan Prod — Matrix target plan per part per day (1-31)
// ═══════════════════════════════════════════════════════════════════════════════
exports.getRekapPlanProd = async (req, res) => {
    try {
        const { year, month } = req.query;
        const y = parseInt(year) || new Date().getFullYear();
        const m = parseInt(month) || (new Date().getMonth() + 1);
        const days = getDaysInMonth(y, m);
        const startDate = fmtDate(y, m, 1);
        const endDate = fmtDate(y, m, days);

        const [rows] = await db.query(`
            SELECT 
                p.product_name as part_name,
                p.product_code as part_code,
                pro.product_id,
                DAY(pro.start_date) as day_num,
                SUM(pro.target_qty) as target_qty
            FROM planning_produksi pro
            JOIN products p ON pro.product_id = p.id
            WHERE pro.start_date >= ? AND pro.start_date <= ?
            GROUP BY pro.product_id, p.product_name, p.product_code, DAY(pro.start_date)
            ORDER BY p.product_name, DAY(pro.start_date)
        `, [startDate, endDate]);

        // Pivot into matrix
        const partMap = {};
        rows.forEach(r => {
            const key = r.product_id || r.part_name;
            if (!partMap[key]) {
                partMap[key] = { part_name: r.part_name, part_code: r.part_code, product_id: r.product_id, days: {} };
            }
            partMap[key].days[r.day_num] = Number(r.target_qty);
        });

        const matrix = Object.values(partMap).map(item => {
            let total = 0;
            const dayData = {};
            for (let d = 1; d <= days; d++) {
                dayData[`d${d}`] = item.days[d] || 0;
                total += item.days[d] || 0;
            }
            return { part_name: item.part_name, part_code: item.part_code, product_id: item.product_id, ...dayData, total };
        });

        return res.json({ success: true, data: serialize(matrix), meta: { year: y, month: m, days } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Rekap Actual Prod — Matrix actual production per part per day
// ═══════════════════════════════════════════════════════════════════════════════
exports.getRekapActualProd = async (req, res) => {
    try {
        const { year, month } = req.query;
        const y = parseInt(year) || new Date().getFullYear();
        const m = parseInt(month) || (new Date().getMonth() + 1);
        const days = getDaysInMonth(y, m);
        const startDate = fmtDate(y, m, 1);
        const endDate = fmtDate(y, m, days);

        const [rows] = await db.query(`
            SELECT 
                p.product_name as part_name,
                p.product_code as part_code,
                pro.product_id,
                DAY(po.created_at) as day_num,
                SUM(po.qty_ok) as actual_ok,
                SUM(po.qty_ng) as actual_ng
            FROM production_outputs po
            JOIN planning_produksi pro ON po.pro_id = pro.id
            JOIN products p ON pro.product_id = p.id
            WHERE po.created_at >= ? AND po.created_at < DATE_ADD(?, INTERVAL 1 DAY)
            GROUP BY pro.product_id, p.product_name, p.product_code, DAY(po.created_at)
            ORDER BY p.product_name, DAY(po.created_at)
        `, [startDate, endDate]);

        const partMap = {};
        rows.forEach(r => {
            const key = r.product_id || r.part_name;
            if (!partMap[key]) {
                partMap[key] = { part_name: r.part_name, part_code: r.part_code, product_id: r.product_id, days: {} };
            }
            partMap[key].days[r.day_num] = Number(r.actual_ok);
        });

        const matrix = Object.values(partMap).map(item => {
            let total = 0;
            const dayData = {};
            for (let d = 1; d <= days; d++) {
                dayData[`d${d}`] = item.days[d] || 0;
                total += item.days[d] || 0;
            }
            return { part_name: item.part_name, part_code: item.part_code, product_id: item.product_id, ...dayData, total };
        });

        return res.json({ success: true, data: serialize(matrix), meta: { year: y, month: m, days } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Rekap NG — Matrix reject/defect per part per day
// ═══════════════════════════════════════════════════════════════════════════════
exports.getRekapNG = async (req, res) => {
    try {
        const { year, month } = req.query;
        const y = parseInt(year) || new Date().getFullYear();
        const m = parseInt(month) || (new Date().getMonth() + 1);
        const days = getDaysInMonth(y, m);
        const startDate = fmtDate(y, m, 1);
        const endDate = fmtDate(y, m, days);

        const [rows] = await db.query(`
            SELECT 
                p.product_name as part_name,
                p.product_code as part_code,
                pro.product_id,
                DAY(po.created_at) as day_num,
                SUM(po.qty_ng) as total_ng
            FROM production_outputs po
            JOIN planning_produksi pro ON po.pro_id = pro.id
            JOIN products p ON pro.product_id = p.id
            WHERE po.created_at >= ? AND po.created_at < DATE_ADD(?, INTERVAL 1 DAY)
              AND po.qty_ng > 0
            GROUP BY pro.product_id, p.product_name, p.product_code, DAY(po.created_at)
            ORDER BY p.product_name, DAY(po.created_at)
        `, [startDate, endDate]);

        const partMap = {};
        rows.forEach(r => {
            const key = r.product_id || r.part_name;
            if (!partMap[key]) {
                partMap[key] = { part_name: r.part_name, part_code: r.part_code, product_id: r.product_id, days: {} };
            }
            partMap[key].days[r.day_num] = Number(r.total_ng);
        });

        const matrix = Object.values(partMap).map(item => {
            let total = 0;
            const dayData = {};
            for (let d = 1; d <= days; d++) {
                dayData[`d${d}`] = item.days[d] || 0;
                total += item.days[d] || 0;
            }
            return { part_name: item.part_name, part_code: item.part_code, product_id: item.product_id, ...dayData, total };
        });

        return res.json({ success: true, data: serialize(matrix), meta: { year: y, month: m, days } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Control Stock WHFG — Daily projected FG stock (inflow from prod, outflow from delivery)
// ═══════════════════════════════════════════════════════════════════════════════
exports.getControlStockWHFG = async (req, res) => {
    try {
        const { year, month } = req.query;
        const y = parseInt(year) || new Date().getFullYear();
        const m = parseInt(month) || (new Date().getMonth() + 1);
        const days = getDaysInMonth(y, m);
        const startDate = fmtDate(y, m, 1);
        const endDate = fmtDate(y, m, days);

        // Get FG warehouse ID (Gudang Finished Goods = id 3)
        const FG_WAREHOUSE_ID = 3;

        // Current stock per product in FG warehouse
        const [stockRows] = await db.query(`
            SELECT pl.product_id, p.product_name, p.product_code,
                   COALESCE(pl.stock, 0) as current_stock,
                   COALESCE(pl.min_qty, 0) as min_qty,
                   COALESCE(pl.max_qty, 0) as max_qty
            FROM product_locations pl
            JOIN products p ON pl.product_id = p.id
            WHERE pl.warehouse_id = ?
            ORDER BY p.product_name
        `, [FG_WAREHOUSE_ID]);

        // Daily production inflow (Received_FG status)
        const [inflowRows] = await db.query(`
            SELECT pro.product_id, DAY(po.updated_at) as day_num, SUM(po.qty_ok) as qty_in
            FROM production_outputs po
            JOIN planning_produksi pro ON po.pro_id = pro.id
            WHERE po.status = 'Received_FG'
              AND po.updated_at >= ? AND po.updated_at < DATE_ADD(?, INTERVAL 1 DAY)
            GROUP BY pro.product_id, DAY(po.updated_at)
        `, [startDate, endDate]);

        // Daily delivery outflow
        const [outflowRows] = await db.query(`
            SELECT sjd.product_id, DAY(sj.delivery_date) as day_num, SUM(sjd.qty_delivered) as qty_out
            FROM surat_jalan_details sjd
            JOIN surat_jalan sj ON sjd.sj_id = sj.id
            WHERE sj.delivery_date >= ? AND sj.delivery_date <= ?
            GROUP BY sjd.product_id, DAY(sj.delivery_date)
        `, [startDate, endDate]);

        // Build lookup maps
        const inflowMap = {};
        inflowRows.forEach(r => {
            const key = `${r.product_id}_${r.day_num}`;
            inflowMap[key] = Number(r.qty_in);
        });

        const outflowMap = {};
        outflowRows.forEach(r => {
            const key = `${r.product_id}_${r.day_num}`;
            outflowMap[key] = Number(r.qty_out);
        });

        // Calculate daily stock projection
        const result = stockRows.map(item => {
            let runningStock = Number(item.current_stock);
            const dayData = {};
            for (let d = days; d >= 1; d--) {
                dayData[`d${d}`] = runningStock;
                const inflow = inflowMap[`${item.product_id}_${d}`] || 0;
                const outflow = outflowMap[`${item.product_id}_${d}`] || 0;
                // Reverse: to get stock at start of day d, we undo today's changes
                // But for projection we go forward: stock_d = stock_{d-1} + inflow - outflow
                // We already have current stock as of today; let's just show it forward
            }

            // Recalculate forward from beginning of month
            // Estimate beginning stock: current - total_inflow_so_far + total_outflow_so_far
            let totalInflowMonth = 0, totalOutflowMonth = 0;
            for (let d = 1; d <= days; d++) {
                totalInflowMonth += inflowMap[`${item.product_id}_${d}`] || 0;
                totalOutflowMonth += outflowMap[`${item.product_id}_${d}`] || 0;
            }
            let beginningStock = Number(item.current_stock) - totalInflowMonth + totalOutflowMonth;
            if (beginningStock < 0) beginningStock = 0;

            let balance = beginningStock;
            const dayDataForward = {};
            for (let d = 1; d <= days; d++) {
                const inflow = inflowMap[`${item.product_id}_${d}`] || 0;
                const outflow = outflowMap[`${item.product_id}_${d}`] || 0;
                balance = balance + inflow - outflow;
                dayDataForward[`d${d}`] = balance;
            }

            return {
                product_id: item.product_id,
                product_name: item.product_name,
                product_code: item.product_code,
                current_stock: Number(item.current_stock),
                min_qty: Number(item.min_qty),
                max_qty: Number(item.max_qty),
                ...dayDataForward
            };
        });

        return res.json({ success: true, data: serialize(result), meta: { year: y, month: m, days } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Achievement Rate — PO vs Plan vs Actual vs Delivery per part
// ═══════════════════════════════════════════════════════════════════════════════
exports.getAchRate = async (req, res) => {
    try {
        const { year, month } = req.query;
        const y = parseInt(year) || new Date().getFullYear();
        const m = parseInt(month) || (new Date().getMonth() + 1);
        const days = getDaysInMonth(y, m);
        const startDate = fmtDate(y, m, 1);
        const endDate = fmtDate(y, m, days);

        // PO Customer qty per product this month
        const [poRows] = await db.query(`
            SELECT cpd.product_id, p.product_name, p.product_code,
                   c.customer_name,
                   SUM(cpd.po_qty) as po_qty
            FROM customer_po_details cpd
            JOIN customer_po cp ON cpd.po_id = cp.id
            JOIN products p ON cpd.product_id = p.id
            LEFT JOIN customers c ON cp.customer_id = c.id
            WHERE cp.tanggal_po >= ? AND cp.tanggal_po <= ?
            GROUP BY cpd.product_id, p.product_name, p.product_code, c.customer_name
            ORDER BY c.customer_name, p.product_name
        `, [startDate, endDate]);

        // Plan qty per product this month
        const [planRows] = await db.query(`
            SELECT pro.product_id, p.product_name, p.product_code, SUM(pro.target_qty) as plan_qty
            FROM planning_produksi pro
            JOIN products p ON pro.product_id = p.id
            WHERE pro.start_date >= ? AND pro.start_date <= ?
            GROUP BY pro.product_id, p.product_name, p.product_code
        `, [startDate, endDate]);

        // Actual production qty per product this month
        const [actualRows] = await db.query(`
            SELECT pro.product_id, p.product_name, p.product_code, SUM(po.qty_ok) as actual_prod, SUM(po.qty_ng) as actual_ng
            FROM production_outputs po
            JOIN planning_produksi pro ON po.pro_id = pro.id
            JOIN products p ON pro.product_id = p.id
            WHERE po.created_at >= ? AND po.created_at < DATE_ADD(?, INTERVAL 1 DAY)
            GROUP BY pro.product_id, p.product_name, p.product_code
        `, [startDate, endDate]);

        // Delivery qty per product this month
        const [deliveryRows] = await db.query(`
            SELECT sjd.product_id, SUM(sjd.qty_delivered) as delivery_qty
            FROM surat_jalan_details sjd
            JOIN surat_jalan sj ON sjd.sj_id = sj.id
            WHERE sj.delivery_date >= ? AND sj.delivery_date <= ?
            GROUP BY sjd.product_id
        `, [startDate, endDate]);

        // Build lookup maps
        const planMap = {};
        planRows.forEach(r => { planMap[r.product_id] = Number(r.plan_qty); });
        const actualMap = {};
        actualRows.forEach(r => { actualMap[r.product_id] = { ok: Number(r.actual_prod), ng: Number(r.actual_ng) }; });
        const deliveryMap = {};
        deliveryRows.forEach(r => { deliveryMap[r.product_id] = Number(r.delivery_qty); });

        // Combine
        const allProductIds = new Set();
        poRows.forEach(r => allProductIds.add(r.product_id));
        planRows.forEach(r => allProductIds.add(r.product_id));
        actualRows.forEach(r => allProductIds.add(r.product_id));

        // Group PO data by product
        const poMap = {};
        poRows.forEach(r => {
            if (!poMap[r.product_id]) {
                poMap[r.product_id] = { product_name: r.product_name, product_code: r.product_code, customer: r.customer_name, po_qty: 0 };
            }
            poMap[r.product_id].po_qty += Number(r.po_qty);
        });

        // Resolve product metadata safely
        const productMetadataMap = {};
        poRows.forEach(r => {
            productMetadataMap[r.product_id] = { name: r.product_name, code: r.product_code, customer: r.customer_name };
        });
        planRows.forEach(r => {
            if (!productMetadataMap[r.product_id]) {
                productMetadataMap[r.product_id] = { name: r.product_name, code: r.product_code, customer: '' };
            }
        });
        actualRows.forEach(r => {
            if (!productMetadataMap[r.product_id]) {
                productMetadataMap[r.product_id] = { name: r.product_name, code: r.product_code, customer: '' };
            }
        });

        const result = Array.from(allProductIds).map(pid => {
            const meta = productMetadataMap[pid];
            if (!meta || !meta.name) return null; // Skip if the product doesn't exist anymore or is invalid

            const po = poMap[pid] || {};
            const plan = planMap[pid] || 0;
            const actual = actualMap[pid] || { ok: 0, ng: 0 };
            const delivery = deliveryMap[pid] || 0;

            const actVsPlan = plan > 0 ? (actual.ok / plan) : 0;
            const actVsPO = po.po_qty > 0 ? (actual.ok / po.po_qty) : 0;
            const deviasi = actual.ok - plan;

            return {
                product_id: pid,
                product_name: meta.name,
                product_code: meta.code || '',
                customer: meta.customer || '',
                po_qty: po.po_qty || 0,
                plan_qty: plan,
                actual_prod: actual.ok,
                actual_ng: actual.ng,
                delivery_qty: delivery,
                deviasi,
                ach_vs_plan: Math.round(actVsPlan * 10000) / 100,
                ach_vs_po: Math.round(actVsPO * 10000) / 100
            };
        }).filter(Boolean);

        return res.json({ success: true, data: serialize(result), meta: { year: y, month: m } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Achievement per Leader Group
// ═══════════════════════════════════════════════════════════════════════════════
exports.getAchLeader = async (req, res) => {
    try {
        const { year, month } = req.query;
        const y = parseInt(year) || new Date().getFullYear();
        const m = parseInt(month) || (new Date().getMonth() + 1);
        const days = getDaysInMonth(y, m);
        const startDate = fmtDate(y, m, 1);
        const endDate = fmtDate(y, m, days);

        // Get plan and actual grouped by leader_group
        const [rows] = await db.query(`
            SELECT 
                COALESCE(mac.leader_group, 'Unassigned') as leader_group,
                DAY(pro.start_date) as day_num,
                SUM(pro.target_qty) as target_qty,
                COALESCE(SUM(po_agg.actual_ok), 0) as actual_ok,
                COALESCE(SUM(po_agg.actual_ng), 0) as actual_ng
            FROM planning_produksi pro
            JOIN products p ON pro.product_id = p.id
            LEFT JOIN machines mac ON pro.machine_id = mac.code
            LEFT JOIN (
                SELECT pro_id, SUM(qty_ok) as actual_ok, SUM(qty_ng) as actual_ng
                FROM production_outputs
                GROUP BY pro_id
            ) po_agg ON po_agg.pro_id = pro.id
            WHERE pro.start_date >= ? AND pro.start_date <= ?
            GROUP BY mac.leader_group, DAY(pro.start_date)
            ORDER BY mac.leader_group, DAY(pro.start_date)
        `, [startDate, endDate]);

        // Pivot by leader_group
        const leaderMap = {};
        rows.forEach(r => {
            if (!leaderMap[r.leader_group]) {
                leaderMap[r.leader_group] = { leader_group: r.leader_group, days: {}, total_target: 0, total_actual: 0, total_ng: 0 };
            }
            const lg = leaderMap[r.leader_group];
            lg.days[r.day_num] = {
                target: Number(r.target_qty),
                actual: Number(r.actual_ok),
                ng: Number(r.actual_ng),
                ach: Number(r.target_qty) > 0 ? Math.round((Number(r.actual_ok) / Number(r.target_qty)) * 10000) / 100 : 0
            };
            lg.total_target += Number(r.target_qty);
            lg.total_actual += Number(r.actual_ok);
            lg.total_ng += Number(r.actual_ng);
        });

        const result = Object.values(leaderMap).map(lg => ({
            ...lg,
            ach_rate_mtd: lg.total_target > 0 ? Math.round((lg.total_actual / lg.total_target) * 10000) / 100 : 0
        }));

        return res.json({ success: true, data: serialize(result), meta: { year: y, month: m, days } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 7. OS vs Delivery Matrix — Order Sheet requirement vs actual delivery per day
// ═══════════════════════════════════════════════════════════════════════════════
exports.getOsDeliveryMatrix = async (req, res) => {
    try {
        const { year, month } = req.query;
        const y = parseInt(year) || new Date().getFullYear();
        const m = parseInt(month) || (new Date().getMonth() + 1);
        const days = getDaysInMonth(y, m);
        const startDate = fmtDate(y, m, 1);
        const endDate = fmtDate(y, m, days);

        // Order sheets with daily breakdown (based on delivery_date)
        const [osRows] = await db.query(`
            SELECT osd.product_id, p.product_name, p.product_code,
                   c.customer_name,
                   DAY(os.delivery_date) as day_num,
                   SUM(osd.os_qty) as os_qty
            FROM order_sheet_details osd
            JOIN order_sheets os ON osd.os_id = os.id
            JOIN products p ON osd.product_id = p.id
            LEFT JOIN customers c ON os.customer_id = c.id
            WHERE os.delivery_date >= ? AND os.delivery_date <= ?
            GROUP BY osd.product_id, p.product_name, p.product_code, c.customer_name, DAY(os.delivery_date)
            ORDER BY c.customer_name, p.product_name
        `, [startDate, endDate]);

        // Delivery per day
        const [delRows] = await db.query(`
            SELECT sjd.product_id, p.product_name, p.product_code, DAY(sj.delivery_date) as day_num, SUM(sjd.qty_delivered) as del_qty
            FROM surat_jalan_details sjd
            JOIN surat_jalan sj ON sjd.sj_id = sj.id
            JOIN products p ON sjd.product_id = p.id
            WHERE sj.delivery_date >= ? AND sj.delivery_date <= ?
            GROUP BY sjd.product_id, p.product_name, p.product_code, DAY(sj.delivery_date)
        `, [startDate, endDate]);

        // Build maps
        const osMap = {};
        osRows.forEach(r => {
            const key = r.product_id;
            if (!osMap[key]) {
                osMap[key] = { product_id: r.product_id, product_name: r.product_name, product_code: r.product_code, customer: r.customer_name, os_days: {}, del_days: {} };
            }
            osMap[key].os_days[r.day_num] = (osMap[key].os_days[r.day_num] || 0) + Number(r.os_qty);
        });

        const delMap = {};
        delRows.forEach(r => {
            if (!delMap[r.product_id]) delMap[r.product_id] = {};
            delMap[r.product_id][r.day_num] = Number(r.del_qty);
        });

        // Resolve product metadata safely
        const metadataMap = {};
        osRows.forEach(r => {
            metadataMap[r.product_id] = { name: r.product_name, code: r.product_code, customer: r.customer_name };
        });
        delRows.forEach(r => {
            if (!metadataMap[r.product_id]) {
                metadataMap[r.product_id] = { name: r.product_name, code: r.product_code, customer: '' };
            }
        });

        // Merge OS and delivery
        const allKeys = new Set([...Object.keys(osMap), ...Object.keys(delMap)]);
        
        const result = Array.from(allKeys).map(pid => {
            const meta = metadataMap[pid];
            if (!meta || !meta.name) return null; // Skip if the product doesn't exist anymore or is invalid

            const os = osMap[pid] || { product_id: pid, product_name: meta.name, product_code: meta.code, customer: meta.customer, os_days: {}, del_days: {} };
            const del = delMap[pid] || {};
            
            let totalOs = 0, totalDel = 0;
            const dayData = {};
            for (let d = 1; d <= days; d++) {
                const osQty = os.os_days[d] || 0;
                const delQty = del[d] || 0;
                dayData[`os_d${d}`] = osQty;
                dayData[`del_d${d}`] = delQty;
                totalOs += osQty;
                totalDel += delQty;
            }
            
            return {
                product_id: os.product_id,
                product_name: os.product_name,
                product_code: os.product_code,
                customer: os.customer,
                total_os: totalOs,
                total_del: totalDel,
                pending: totalOs - totalDel,
                ...dayData
            };
        }).filter(Boolean);

        return res.json({ success: true, data: serialize(result), meta: { year: y, month: m, days } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Daily Production Board — All machines status for a specific date
// ═══════════════════════════════════════════════════════════════════════════════
exports.getDailyBoard = async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        // All active machines
        const [machines] = await db.query(`
            SELECT m.id, m.code, m.name, m.type, m.line, m.capacity, m.status, 
                   m.leader_group, m.standard_mp
            FROM machines m
            WHERE m.is_active = 1
            ORDER BY m.code ASC
        `);

        // All PrO for this date
        const [plans] = await db.query(`
            SELECT pro.id, pro.pro_code, pro.machine_id, pro.shift, pro.shift_hours, pro.uph_used,
                   pro.target_qty, pro.actual_qty, pro.downtime_reason, pro.operator_name,
                   COALESCE(p.product_name, '') as product_name,
                   COALESCE(p.product_code, '') as product_code,
                   COALESCE(ml.name, '') as mold_name,
                   COALESCE(po_agg.total_ok, 0) as actual_ok,
                   COALESCE(po_agg.total_ng, 0) as actual_ng
            FROM planning_produksi pro
            JOIN products p ON pro.product_id = p.id
            LEFT JOIN molds ml ON pro.mold_id = ml.id
            LEFT JOIN (
                SELECT pro_id, SUM(qty_ok) as total_ok, SUM(qty_ng) as total_ng
                FROM production_outputs
                GROUP BY pro_id
            ) po_agg ON po_agg.pro_id = pro.id
            WHERE pro.start_date <= ? AND pro.end_date >= ?
            ORDER BY pro.machine_id, pro.shift
        `, [targetDate, targetDate]);

        // Map plans to machines
        const plansByMachine = {};
        plans.forEach(p => {
            if (!plansByMachine[p.machine_id]) plansByMachine[p.machine_id] = [];
            plansByMachine[p.machine_id].push(p);
        });

        const board = machines.map(m => {
            const machinePlans = plansByMachine[m.code] || [];
            const totalTarget = machinePlans.reduce((sum, p) => sum + Number(p.target_qty), 0);
            const totalActual = machinePlans.reduce((sum, p) => sum + Number(p.actual_ok), 0);
            const totalNG = machinePlans.reduce((sum, p) => sum + Number(p.actual_ng), 0);
            const ach = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 10000) / 100 : 0;

            return {
                machine_id: m.id,
                machine_code: m.code,
                machine_name: m.name,
                machine_type: m.type,
                line: m.line,
                capacity: m.capacity,
                leader_group: m.leader_group,
                standard_mp: m.standard_mp,
                plans: machinePlans,
                total_target: totalTarget,
                total_actual: totalActual,
                total_ng: totalNG,
                ach_rate: ach,
                has_plans: machinePlans.length > 0
            };
        });

        return res.json({ success: true, data: serialize(board), meta: { date: targetDate } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
