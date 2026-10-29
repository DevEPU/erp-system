const db = require('../config/db');

async function main() {
    try {
        console.log("=== ADDING HPP COLUMN TO WAREHOUSE_STOCKS ===");

        // 1. Check if column exists
        const [columns] = await db.query("SHOW COLUMNS FROM warehouse_stocks LIKE 'hpp'");
        
        if (columns.length === 0) {
            // Add column
            await db.query("ALTER TABLE warehouse_stocks ADD COLUMN hpp DECIMAL(15,2) DEFAULT 0.00");
            console.log("- Column 'hpp' added successfully to table 'warehouse_stocks'.");

            // 2. Initialize column values from products/product_suppliers
            console.log("- Initializing 'hpp' values from product prices...");
            await db.query(`
                UPDATE warehouse_stocks ws 
                JOIN products p ON ws.product_id = p.id 
                SET ws.hpp = COALESCE(
                    (SELECT purchase_price FROM product_suppliers ps WHERE ps.product_id = p.id AND (ps.supplier_id = ws.supplier_id OR ws.supplier_id IS NULL) LIMIT 1), 
                    p.product_price,
                    0.00
                )
            `);
            console.log("- 'hpp' values initialized successfully.");
        } else {
            console.log("- Column 'hpp' already exists in table 'warehouse_stocks'.");
        }

        console.log("=== MIGRATION COMPLETED SUCCESSFULLY ===");
    } catch (err) {
        console.error("Migration Failed:", err);
    } finally {
        process.exit(0);
    }
}

main();
