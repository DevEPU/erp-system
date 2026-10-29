const db = require('../config/db');

async function checkNutSpringQuotas() {
    try {
        console.log("=== CHECKING PRODUCT_SUPPLIERS FOR PRODUCT EPNS-KNSP4MKWW (ID 5004) ===");
        const [psRows] = await db.execute(`
            SELECT ps.id, ps.product_id, ps.supplier_id, ps.allocation_percent, ps.is_primary, ps.purchase_price, s.supplier_code, s.supplier_name
            FROM product_suppliers ps
            JOIN suppliers s ON ps.supplier_id = s.id
            WHERE ps.product_id = 5004
            ORDER BY ps.id ASC
        `);
        console.log("product_suppliers rows for Nut Spring:", psRows);

        console.log("\n=== CHECKING MRP_DETAILS FOR MRP ID 40 (MRP/EPU/26/08/0002) NUT SPRING ROWS ===");
        const [mrpRows] = await db.execute(`
            SELECT md.id, md.mrp_id, md.product_id, md.supplier_id, md.allocation_percent, md.net_qty, md.ord_qty, md.mrp_qty, md.unit_price, md.amount, s.supplier_code, s.supplier_name
            FROM mrp_details md
            LEFT JOIN suppliers s ON md.supplier_id = s.id
            WHERE md.mrp_id = 40 AND md.product_id = 5004
        `);
        console.log("mrp_details rows for Nut Spring in MRP 40:", mrpRows);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkNutSpringQuotas();
