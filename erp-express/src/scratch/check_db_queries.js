const db = require('../config/db');

(async () => {
    try {
        const startDate = '2026-08-01';
        const endDate = '2026-08-31';

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

        const [planRows] = await db.query(`
            SELECT pro.product_id, p.product_name, p.product_code, SUM(pro.target_qty) as plan_qty
            FROM planning_produksi pro
            JOIN products p ON pro.product_id = p.id
            WHERE pro.start_date >= ? AND pro.start_date <= ?
            GROUP BY pro.product_id, p.product_name, p.product_code
        `, [startDate, endDate]);

        const [actualRows] = await db.query(`
            SELECT pro.product_id, p.product_name, p.product_code, SUM(po.qty_ok) as actual_prod, SUM(po.qty_ng) as actual_ng
            FROM production_outputs po
            JOIN planning_produksi pro ON po.pro_id = pro.id
            JOIN products p ON pro.product_id = p.id
            WHERE po.created_at >= ? AND po.created_at < DATE_ADD(?, INTERVAL 1 DAY)
            GROUP BY pro.product_id, p.product_name, p.product_code
        `, [startDate, endDate]);

        const allProductIds = new Set();
        poRows.forEach(r => allProductIds.add(r.product_id));
        planRows.forEach(r => allProductIds.add(r.product_id));
        actualRows.forEach(r => allProductIds.add(r.product_id));

        console.log('PO rows length:', poRows.length);
        console.log('Plan rows length:', planRows.length);
        console.log('Actual rows length:', actualRows.length);
        console.log('All unique product IDs count:', allProductIds.size);
        console.log('All product IDs:', Array.from(allProductIds));

        const poMap = {};
        poRows.forEach(r => {
            if (!poMap[r.product_id]) {
                poMap[r.product_id] = { product_name: r.product_name, product_code: r.product_code, customer: r.customer_name, po_qty: 0 };
            }
            poMap[r.product_id].po_qty += Number(r.po_qty);
        });

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
            if (!meta || !meta.name) return null; // Skip if product doesn't exist or is invalid

            const po = poMap[pid] || {};
            const plan = planRows.find(pr => pr.product_id === pid)?.plan_qty || 0;
            const actual = actualRows.find(ar => ar.product_id === pid) || { actual_prod: 0, actual_ng: 0 };

            return {
                product_id: pid,
                product_name: meta.name,
                product_code: meta.code || '',
                customer: meta.customer || '',
                po_qty: po.po_qty || 0,
                plan_qty: plan,
                actual_prod: actual.actual_prod || 0,
                actual_ng: actual.actual_ng || 0,
            };
        }).filter(Boolean);

        console.log('RESULT:', JSON.stringify(result, null, 2));

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();
