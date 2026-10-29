const db = require('../config/db');

async function countAllDatabaseProducts() {
    try {
        const [prodCount] = await db.execute("SELECT COUNT(*) as total FROM products");
        console.log("Total Products in MySQL Database:", prodCount[0].total);

        const [vCount] = await db.execute("SELECT COUNT(*) as total FROM suppliers");
        console.log("Total Suppliers in MySQL Database:", vCount[0].total);

        const [cCount] = await db.execute("SELECT COUNT(*) as total FROM customers");
        console.log("Total Customers in MySQL Database:", cCount[0].total);

        const [bCount] = await db.execute("SELECT COUNT(*) as total FROM boms");
        console.log("Total BOMs in MySQL Database:", bCount[0].total);

        const [psCount] = await db.execute("SELECT COUNT(*) as total FROM product_suppliers");
        console.log("Total Product Suppliers mappings in MySQL Database:", psCount[0].total);

        // Fetch sample products to see categories and types
        const [sampleProds] = await db.execute(`
            SELECT p.id, p.product_code, p.part_number, p.product_name, p.product_type, p.product_quantity, p.min_qty, p.product_stock_alert, p.product_price, p.product_unit,
                   cat.category_name, s.supplier_code, s.supplier_name
            FROM products p
            LEFT JOIN categories cat ON p.category_id = cat.id
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            LIMIT 20
        `);
        console.log("Sample 20 products:", JSON.stringify(sampleProds, null, 2));

        process.exit(0);
    } catch (e) {
        console.error("Error counting DB records:", e);
        process.exit(1);
    }
}

countAllDatabaseProducts();
