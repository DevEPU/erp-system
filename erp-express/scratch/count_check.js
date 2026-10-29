const db = require('../src/config/db');

async function main() {
    try {
        const [[{ count: normalCount }]] = await db.execute("SELECT COUNT(*) as count FROM products");
        console.log("Normal product count:", normalCount);

        const [[{ count: supplierCount }]] = await db.execute("SELECT COUNT(*) as count FROM product_suppliers");
        console.log("Product suppliers mapping count:", supplierCount);

        const [supProducts] = await db.execute("SELECT DISTINCT product_id FROM product_suppliers");
        console.log("Unique product IDs in product_suppliers:", supProducts.length);

        const query = `
            SELECT 
                (SELECT COUNT(*) FROM product_suppliers) + 
                (SELECT COUNT(*) FROM products p WHERE NOT EXISTS (SELECT 1 FROM product_suppliers ps WHERE ps.product_id = p.id)) 
                AS total_products
        `;
        const [[{ total_products }]] = await db.execute(query);
        console.log("Expanded total products count:", total_products);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

main();
