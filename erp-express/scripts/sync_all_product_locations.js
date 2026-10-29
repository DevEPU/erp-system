const db = require('../src/config/db');

async function migrate() {
    try {
        console.log("Fetching all products and warehouses...");
        const [products] = await db.execute("SELECT id FROM products");
        const [warehouses] = await db.execute("SELECT id FROM warehouses");

        if (products.length === 0) {
            console.log("No products found. Skipping.");
            process.exit(0);
        }
        if (warehouses.length === 0) {
            console.log("No warehouses found. Skipping.");
            process.exit(0);
        }

        console.log(`Found ${products.length} products and ${warehouses.length} warehouses.`);
        console.log("Processing combinations...");

        let insertedCount = 0;
        let skippedCount = 0;

        for (const product of products) {
            for (const warehouse of warehouses) {
                // Check if already exists
                const [existing] = await db.execute(
                    "SELECT id FROM product_locations WHERE product_id = ? AND warehouse_id = ?",
                    [product.id, warehouse.id]
                );

                if (existing.length === 0) {
                    await db.execute(
                        "INSERT INTO product_locations (product_id, warehouse_id, aisle, min_qty, max_qty) VALUES (?, ?, ?, ?, ?)",
                        [product.id, warehouse.id, '', 0, 0]
                    );
                    insertedCount++;
                } else {
                    skippedCount++;
                }
            }
        }

        console.log(`Migration completed.`);
        console.log(`- Inserted: ${insertedCount} locations`);
        console.log(`- Skipped (already existed): ${skippedCount} locations`);
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
