const db = require('../config/db');

(async () => {
    try {
        console.log("=== SYNCING MRP 55 DETAILS WITH NEW STO STOCK VALUES ===");

        // Fetch all details for MRP 55
        const [details] = await db.query(`
            SELECT md.id, md.product_id, md.need_all_qty, md.stock_std_qty, md.allocation_percent, md.unit_price, md.remark,
                   p.product_quantity, ps.pcs_per_pack
            FROM mrp_details md
            JOIN products p ON md.product_id = p.id
            LEFT JOIN product_suppliers ps ON md.product_id = ps.product_id AND md.supplier_id = ps.supplier_id
            WHERE md.mrp_id = 55
        `);

        let totalGross = 0;
        let totalNet = 0;
        let totalCost = 0;

        for (const row of details) {
            const needAll = Number(row.need_all_qty || 0);
            const stockStd = Number(row.stock_std_qty || 0);
            const newSto = Number(row.product_quantity || 0);
            const pct = Number(row.allocation_percent || 100);
            const unitPrice = Number(row.unit_price || 0);
            const pack = Math.max(1, Math.round(Number(row.pcs_per_pack || 1)));

            // Recalculate Net Requirement
            const physicalNet = Math.max(0, needAll + stockStd - newSto);
            const correctNet = Math.round(physicalNet * (pct / 100));

            // Recalculate ORD and MRP Qty
            const ordQty = correctNet;
            const mrpQty = ordQty === 0 ? 0 : (pack <= 1 ? Math.ceil(ordQty) : Math.ceil(ordQty / pack) * pack);
            const amount = mrpQty * unitPrice;

            totalGross += needAll;
            totalNet += mrpQty;
            totalCost += amount;

            console.log(`Row ID ${row.id} (Prod ${row.product_id}): STO=${newSto} | Correct Net=${correctNet} | ORD=${ordQty} | MRP Qty=${mrpQty} | Amount=${amount}`);

            // Update row in DB
            await db.query(`
                UPDATE mrp_details
                SET sto_qty = ?, current_stock = ?, net_qty = ?, qty_required = ?, ord_qty = ?, mrp_qty = ?, amount = ?, subtotal_cost = ?, updated_at = NOW()
                WHERE id = ?
            `, [newSto, newSto, correctNet, correctNet, ordQty, mrpQty, amount, amount, row.id]);
        }

        // Update MRP 55 Header totals
        await db.query(`
            UPDATE mrps
            SET total_gross_qty = ?, total_net_qty = ?, total_est_cost = ?, updated_at = NOW()
            WHERE id = 55
        `, [totalGross, totalNet, totalCost]);

        console.log(`\n=== MRP 55 HEADER UPDATED ===`);
        console.log(`Total Gross: ${totalGross}`);
        console.log(`Total Net (MRP Qty): ${totalNet}`);
        console.log(`Total Cost: Rp ${totalCost.toLocaleString()}`);

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();
