const mysql = require('mysql2/promise');

async function cleanBomParentNames() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        console.log("=== CLEANING PARENT PRODUCT NAMES IN BOMS & BOM_ITEMS ===");

        // Fetch all boms
        const [boms] = await connection.query("SELECT id, bom_name, finished_good_name FROM boms");
        let bomsCleaned = 0;

        for (const b of boms) {
            const cleanBomName = (b.bom_name || '').replace(/\s*\([^)]+\)\s*$/, '').trim();
            const cleanFgName = (b.finished_good_name || '').replace(/\s*\([^)]+\)\s*$/, '').trim();

            if (cleanBomName !== b.bom_name || cleanFgName !== b.finished_good_name) {
                await connection.query("UPDATE boms SET bom_name = ?, finished_good_name = ? WHERE id = ?", [cleanBomName, cleanFgName, b.id]);
                bomsCleaned++;
            }
        }

        console.log(`Cleaned parent names for ${bomsCleaned} BOM headers.`);

        // Fetch all bom_items
        const [bomItems] = await connection.query("SELECT id, product_name FROM bom_items");
        let itemsCleaned = 0;

        for (const item of bomItems) {
            const cleanName = (item.product_name || '').replace(/\s*\([^)]+\)\s*$/, '').trim();
            if (cleanName !== item.product_name) {
                await connection.query("UPDATE bom_items SET product_name = ? WHERE id = ?", [cleanName, item.id]);
                itemsCleaned++;
            }
        }

        console.log(`Cleaned parent names for ${itemsCleaned} BOM component items.`);

    } catch (err) {
        console.error("Error cleaning parent product names:", err);
    } finally {
        await connection.end();
    }
}

cleanBomParentNames();
