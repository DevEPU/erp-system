const mysql = require('mysql2/promise');

async function syncBomItemPricesFromProducts() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        console.log("=== SYNCING BOM ITEM PRICES FROM MASTER DATA PRODUCTS ===");

        // Fetch products mapping
        const [products] = await connection.query(`
            SELECT p.id, p.product_code, p.product_name, p.product_price, pu.buy_price as buy_price_l1
            FROM products p
            LEFT JOIN product_units pu ON p.id = pu.product_id AND pu.level = 1
        `);

        const prodMapByCode = new Map();
        const prodMapByName = new Map();

        products.forEach(p => {
            const price = Number(p.buy_price_l1 || p.product_price || 0);
            if (p.product_code) prodMapByCode.set(p.product_code.trim().toUpperCase(), price);
            if (p.product_name) prodMapByName.set(p.product_name.trim().toUpperCase(), price);
        });

        // Fetch all BOM items
        const [items] = await connection.query("SELECT id, bom_id, parent_item_id, product_code, product_name, price, qty, gross_qty FROM bom_items");

        let updatedPriceCount = 0;

        for (const item of items) {
            const codeKey = item.product_code ? item.product_code.trim().toUpperCase() : '';
            const nameKey = item.product_name ? item.product_name.trim().toUpperCase() : '';

            let masterPrice = prodMapByCode.get(codeKey);
            if (masterPrice === undefined && nameKey) {
                masterPrice = prodMapByName.get(nameKey);
            }
            if (masterPrice === undefined && nameKey) {
                const cleanName = nameKey.replace(/\s*\([^)]+\)\s*$/, '').trim();
                masterPrice = prodMapByName.get(cleanName);
            }

            if (masterPrice !== undefined && masterPrice > 0) {
                await connection.query("UPDATE bom_items SET price = ? WHERE id = ?", [masterPrice, item.id]);
                item.price = masterPrice;
                updatedPriceCount++;
            }
        }

        console.log(`Updated ${updatedPriceCount} BOM items with Master Data prices.`);

        // Apply Deduplication: If parent has price > 0, set child price to 0
        const [refreshedItems] = await connection.query("SELECT id, bom_id, parent_item_id, product_code, product_name, price FROM bom_items");
        const itemMap = new Map();
        refreshedItems.forEach(i => itemMap.set(i.id, i));

        let zeroedChildCount = 0;
        for (const item of refreshedItems) {
            if (item.parent_item_id) {
                const parent = itemMap.get(item.parent_item_id);
                if (parent && Number(parent.price) > 0 && Number(item.price) > 0) {
                    console.log(`[EXCLUDING DUPLICATE CHILD PRICE] Parent: ${parent.product_code} ("${parent.product_name}") = Rp ${Number(parent.price).toLocaleString('id-ID')} | Child: ${item.product_code} ("${item.product_name}") price set to Rp 0.00`);
                    await connection.query("UPDATE bom_items SET price = 0 WHERE id = ?", [item.id]);
                    zeroedChildCount++;
                }
            }
        }

        console.log(`Set ${zeroedChildCount} sub-component child prices to Rp 0.00 to prevent double-counting.`);

        // Recalculate BOM total_cost for all 66 BOMs
        console.log("\n=== RECALCULATING ALL 66 BOM HPP TOTAL COSTS ===");
        const [boms] = await connection.query("SELECT id, bom_code, finished_good_code, finished_good_name, labor_cost, overhead_cost FROM boms");

        for (const b of boms) {
            const [bItems] = await connection.query("SELECT id, parent_item_id, price, qty, gross_qty FROM bom_items WHERE bom_id = ?", [b.id]);

            let matCostTotal = 0;
            for (const bi of bItems) {
                const q = Number(bi.gross_qty || bi.qty || 0);
                const p = Number(bi.price || 0);
                matCostTotal += (q * p);
            }

            const labor = Number(b.labor_cost || 0);
            const overhead = Number(b.overhead_cost || 0);
            const totalCost = matCostTotal + labor + overhead;

            await connection.query("UPDATE boms SET total_cost = ? WHERE id = ?", [totalCost, b.id]);
            console.log(`[BOM HPP RECALCULATED] BOM: ${b.bom_code} ("${b.finished_good_name}") | Mat Cost: Rp ${matCostTotal.toLocaleString('id-ID')} | Total HPP: Rp ${totalCost.toLocaleString('id-ID')}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

syncBomItemPricesFromProducts();
