const db = require('../config/db');

async function checkDetails() {
    try {
        console.log("=== CHECKING CUSTOMER ===");
        const [customers] = await db.execute("SELECT * FROM customers WHERE id = 1");
        console.log("Customer:", JSON.stringify(customers, null, 2));

        console.log("\n=== CHECKING FG PRODUCT ===");
        const [products] = await db.execute("SELECT * FROM products WHERE id = 5181 OR product_code = 'EPBL-FBXLUGK1Z'");
        console.log("FG Product:", JSON.stringify(products, null, 2));

        console.log("\n=== CHECKING BOM FOR FG ===");
        const [boms] = await db.execute(
            "SELECT * FROM boms WHERE finished_good_code = 'EPBL-FBXLUGK1Z' OR bom_code LIKE '%K1Z%' OR id IN (SELECT bom_id FROM bom_items WHERE product_code = 'EPBL-FBXLUGK1Z')"
        );
        console.log("BOMs found:", JSON.stringify(boms, null, 2));

        if (boms.length > 0) {
            const bomIds = boms.map(b => b.id);
            const [bomItems] = await db.execute(
                `SELECT * FROM bom_items WHERE bom_id IN (${bomIds.join(',')})`
            );
            console.log("BOM Items:", JSON.stringify(bomItems, null, 2));
        } else {
            console.log("No BOM found for EPBL-FBXLUGK1Z! Let's check sample BOMs in db...");
            const [allBoms] = await db.execute("SELECT * FROM boms LIMIT 5");
            console.log("Sample BOMs:", JSON.stringify(allBoms, null, 2));
            const [allBomItems] = await db.execute("SELECT * FROM bom_items LIMIT 10");
            console.log("Sample BOM Items:", JSON.stringify(allBomItems, null, 2));
        }

        console.log("\n=== CHECKING MRP TABLES IN DB ===");
        const [tables] = await db.execute("SHOW TABLES LIKE '%mrp%'");
        console.log("MRP Tables:", JSON.stringify(tables, null, 2));

        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

checkDetails();
