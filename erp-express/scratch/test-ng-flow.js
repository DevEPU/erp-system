const db = require('../src/config/db');

async function test() {
    try {
        console.log("=== 1. Checking Database Tables ===");
        const [tables] = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
              AND table_name IN ('ng_disposals', 'claim_investigation_items', 'customer_claims', 'crusher_logs', 'warehouse_stocks')
        `);
        console.log("Tables found:", tables.map(t => t.TABLE_NAME || t.table_name));

        console.log("\n=== 2. Testing Available Production NG Query ===");
        const [ngOutputs] = await db.query(`
            SELECT po.id as production_output_id,
                   po.qty_ok, po.qty_ng, po.ng_type, po.ng_category, po.status as output_status,
                   wo.reference as wo_reference,
                   COALESCE(p.product_name, wo_p.product_name) as product_name,
                   (po.qty_ng - COALESCE(d.total_disposed, 0)) as remaining_ng
            FROM production_outputs po
            JOIN planning_produksi pro ON po.pro_id = pro.id
            LEFT JOIN products p ON pro.product_id = p.id
            LEFT JOIN work_orders wo ON pro.wo_id = wo.id
            LEFT JOIN products wo_p ON wo.parent_product_id = wo_p.id
            LEFT JOIN (
                SELECT source_id, SUM(qty) as total_disposed 
                FROM ng_disposals 
                WHERE source_type = 'Production'
                GROUP BY source_id
            ) d ON po.id = d.source_id
            WHERE po.qty_ng > 0
            LIMIT 5
        `);
        console.log(`Found ${ngOutputs.length} production outputs with NG:`, ngOutputs);

        console.log("\n=== 3. Testing NG Disposals Summary ===");
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'In_Progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN action_taken = 'Sent_To_Crusher' THEN 1 ELSE 0 END) as crusher_count,
                SUM(CASE WHEN action_taken = 'Disposed' THEN 1 ELSE 0 END) as disposed_count
            FROM ng_disposals
        `);
        console.log("Disposal stats:", stats[0]);

        console.log("\n=== 4. Testing Crusher Logs Query ===");
        const [logs] = await db.query(`
            SELECT cl.id, cl.qty_ng_component, cl.qty_regrind_resin, cl.action,
                   p.product_name as original_product_name,
                   rp.product_name as regrind_product_name,
                   wo.reference as wo_reference
            FROM crusher_logs cl
            LEFT JOIN products p ON cl.component_product_id = p.id
            LEFT JOIN products rp ON cl.regrind_product_id = rp.id
            LEFT JOIN work_orders wo ON cl.work_order_id = wo.id
            ORDER BY cl.id DESC
            LIMIT 5
        `);
        console.log(`Found ${logs.length} crusher logs:`, logs);

        console.log("\n=== 5. Testing Regrind Products List ===");
        const [regrindProds] = await db.query(`
            SELECT id, product_name, product_code, product_unit, product_type
            FROM products 
            WHERE product_type = 'Crusher'
            LIMIT 5
        `);
        console.log(`Found ${regrindProds.length} regrind products:`, regrindProds);

        console.log("\n=== ALL DATABASE QUERIES PASSED SUCCESSFULLY! ===");
        process.exit(0);
    } catch (err) {
        console.error("Test error:", err);
        process.exit(1);
    }
}

test();
