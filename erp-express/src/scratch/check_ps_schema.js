const db = require('../config/db');

async function checkProductSuppliers() {
    try {
        console.log("=== DESCRIBE product_suppliers ===");
        const [cols] = await db.execute("DESCRIBE product_suppliers");
        console.log("Columns:", cols.map(c => `${c.Field} (${c.Type})`));

        console.log("\n=== CHECKING SAMPLE RECORDS IN product_suppliers ===");
        const [rows] = await db.execute(`
            SELECT ps.*, p.product_code as internal_prod_code, p.product_name as internal_prod_name, s.supplier_code, s.supplier_name
            FROM product_suppliers ps
            JOIN products p ON ps.product_id = p.id
            JOIN suppliers s ON ps.supplier_id = s.id
            LIMIT 10
        `);
        console.log("Sample records count:", rows.length);
        console.log("Sample records:", JSON.stringify(rows, null, 2));

        process.exit(0);
    } catch (e) {
        console.error("Error checking product_suppliers:", e);
        process.exit(1);
    }
}

checkProductSuppliers();
