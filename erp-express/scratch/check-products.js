const db = require('../src/config/db');

async function check() {
    try {
        const [rows] = await db.query(`
            SELECT p.id, p.product_code, p.product_name, p.category_id, c.category_name,
                   (SELECT GROUP_CONCAT(warehouse_id) FROM product_locations WHERE product_id = p.id) as wh_ids
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LIMIT 50
        `);
        console.log('PRODUCTS INFO (SAMPLE):');
        rows.forEach(r => {
            console.log(`- [${r.product_code}] ${r.product_name} | Cat: ${r.category_name} (${r.category_id}) | WHs: ${r.wh_ids}`);
        });

        const [wh3Count] = await db.query(`
            SELECT COUNT(*) as count FROM products p
            WHERE EXISTS (SELECT 1 FROM product_locations WHERE product_id = p.id AND warehouse_id = 3)
        `);
        console.log('Total Products in Warehouse 3 (Finished Goods):', wh3Count[0].count);

        const [allCount] = await db.query("SELECT COUNT(*) as count FROM products");
        console.log('Total Products in Database:', allCount[0].count);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

check();
