const db = require('../config/db');

async function investigateNutSpring() {
    try {
        console.log("=== CHECKING NUT SPRING PRODUCTS ===");
        const [prods] = await db.execute("SELECT id, product_code, product_name, min_qty, product_stock_alert FROM products WHERE product_code LIKE '%KNSP4MKWW%' OR product_name LIKE '%NUT SPRING%'");
        console.log("Products found:", prods);

        for (const p of prods) {
            console.log(`\n--- Product ID ${p.id} (${p.product_code} - ${p.product_name}) ---`);
            const [stocks] = await db.execute("SELECT warehouse_id, qty_stock FROM warehouse_stocks WHERE product_id = ?", [p.id]);
            console.log("Warehouse stocks:", stocks);

            const [onOrders] = await db.execute(`
                SELECT pd.quantity, p.status
                FROM purchase_details pd
                JOIN purchases p ON pd.purchase_id = p.id
                WHERE pd.product_id = ? AND p.status IN ('Pending', 'Approved')
            `, [p.id]);
            console.log("On Order Qty (Pending/Approved POs):", onOrders);
        }

        console.log("\n=== CHECKING MRP ID 40 DETAILS FOR NUT SPRING ===");
        const [mrp2Details] = await db.execute(`
            SELECT md.*, p.product_code, p.product_name
            FROM mrp_details md
            JOIN products p ON md.product_id = p.id
            WHERE md.mrp_id = 40 AND (p.product_code LIKE '%KNSP4MKWW%' OR p.product_name LIKE '%NUT SPRING%')
        `);
        console.log("MRP ID 40 Nut Spring Details:", mrp2Details);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

investigateNutSpring();
