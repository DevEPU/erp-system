const db = require('../config/db');

async function findMultiVendorProducts() {
    try {
        const [multiProds] = await db.execute(`
            SELECT ps.product_id, p.product_code as internal_code, p.product_name as internal_name, COUNT(ps.supplier_id) as vendor_count
            FROM product_suppliers ps
            JOIN products p ON ps.product_id = p.id
            GROUP BY ps.product_id, p.product_code, p.product_name
            HAVING vendor_count > 1
            LIMIT 10
        `);
        console.log("Multi-Vendor Products count in DB:", multiProds.length);
        console.log("Multi-Vendor Products:", JSON.stringify(multiProds, null, 2));

        if (multiProds.length > 0) {
            const pIds = multiProds.map(m => m.product_id);
            const [details] = await db.execute(`
                SELECT ps.product_id, ps.supplier_id, ps.supplier_part_number, ps.purchase_price, ps.allocation_percent, ps.is_primary, s.supplier_code, s.supplier_name
                FROM product_suppliers ps
                JOIN suppliers s ON ps.supplier_id = s.id
                WHERE ps.product_id IN (${pIds.join(',')})
                ORDER BY ps.product_id, ps.is_primary DESC
            `);
            console.log("Multi-Vendor Product Details:", JSON.stringify(details, null, 2));
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

findMultiVendorProducts();
