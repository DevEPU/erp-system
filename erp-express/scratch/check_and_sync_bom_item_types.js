const mysql = require('mysql2/promise');

async function checkAndSyncItemTypes() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        console.log("=== SYNCING bom_items.item_type WITH MASTER DATA PRODUCTS ===");

        const [products] = await connection.query("SELECT id, product_code, product_name, product_type, category_id FROM products");
        const [categories] = await connection.query("SELECT id, category_name FROM categories");
        const [bomItems] = await connection.query("SELECT id, product_code, product_name, item_type FROM bom_items");

        const catMap = new Map(categories.map(c => [c.id, c.category_name]));

        const findProdType = (item) => {
            const code = item.product_code ? item.product_code.trim().toUpperCase() : '';
            const name = item.product_name ? item.product_name.trim().toUpperCase() : '';

            let p = products.find(prod => prod.product_code && prod.product_code.trim().toUpperCase() === code);
            if (!p && name) {
                p = products.find(prod => prod.product_name && prod.product_name.trim().toUpperCase() === name);
            }
            if (!p && name) {
                const cleanName = name.replace(/\s*\([^)]+\)\s*$/, '').trim().toUpperCase();
                p = products.find(prod => {
                    const cleanDbName = prod.product_name ? prod.product_name.replace(/\s*\([^)]+\)\s*$/, '').trim().toUpperCase() : '';
                    return cleanDbName === cleanName;
                });
            }

            if (p) {
                return p.product_type || catMap.get(p.category_id) || 'Raw Material';
            }

            return 'Raw Material';
        };

        let updated = 0;
        for (const item of bomItems) {
            const masterType = findProdType(item);
            if (masterType !== item.item_type) {
                await connection.query("UPDATE bom_items SET item_type = ? WHERE id = ?", [masterType, item.id]);
                updated++;
            }
        }

        console.log(`Successfully updated ${updated} bom_items rows to match Master Data product_type.`);

        const [types] = await connection.query("SELECT DISTINCT item_type FROM bom_items ORDER BY item_type");
        console.log("Unique item_types in bom_items table now:", types.map(t => t.item_type));

    } catch (err) {
        console.error("Error syncing item types:", err);
    } finally {
        await connection.end();
    }
}

checkAndSyncItemTypes();
