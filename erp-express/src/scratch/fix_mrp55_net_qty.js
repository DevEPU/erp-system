const db = require('../config/db');

(async () => {
    try {
        console.log("=== FIXING MRP_DETAILS NET_QTY FOR MRP ID 55 ===");

        // Fetch details
        const [rows] = await db.query('SELECT id, need_all_qty, stock_std_qty, sto_qty, allocation_percent, net_qty FROM mrp_details WHERE mrp_id = 55');
        
        for (const row of rows) {
            const needAll = Number(row.need_all_qty || 0);
            const stockStd = Number(row.stock_std_qty || 0);
            const sto = Number(row.sto_qty || 0);
            const pct = Number(row.allocation_percent || 100);
            
            const physicalNet = Math.max(0, needAll + stockStd - sto);
            const correctNet = Math.round(physicalNet * (pct / 100));
            
            console.log(`Row ID ${row.id}: needAll=${needAll}, stockStd=${stockStd}, sto=${sto}, pct=${pct}% | Old net_qty=${row.net_qty} => New net_qty=${correctNet}`);
            
            await db.query('UPDATE mrp_details SET net_qty = ?, qty_required = ? WHERE id = ?', [correctNet, correctNet, row.id]);
        }

        console.log("SUCCESS: Finished updating MRP 55 details!");
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();
