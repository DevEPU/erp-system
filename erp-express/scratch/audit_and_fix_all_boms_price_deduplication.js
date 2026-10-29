const mysql = require('mysql2/promise');

async function auditAndFixAllBomsPriceDeduplication() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        console.log("=== UNIVERSAL AUDIT & PRICE DEDUPLICATION FOR ALL BOMS & PRODUCTS ===");

        // Fetch all BOMs
        const [boms] = await connection.query("SELECT id, bom_code, finished_good_code, finished_good_name, labor_cost, overhead_cost FROM boms");
        console.log(`Auditing ${boms.length} BOMs...`);

        let totalSubcomponentsZeroed = 0;
        const fixLog = [];

        for (const b of boms) {
            const [items] = await connection.query(`
                SELECT id, parent_item_id, product_code, product_name, price, qty, gross_qty
                FROM bom_items
                WHERE bom_id = ?
            `, [b.id]);

            const itemMap = new Map();
            items.forEach(i => itemMap.set(i.id, i));

            for (const item of items) {
                // Check if item is a sub-component (has parent)
                if (item.parent_item_id) {
                    const parent = itemMap.get(item.parent_item_id);
                    if (parent && Number(parent.price) > 0 && Number(item.price) > 0) {
                        // Parent already carries sub-assembly price (e.g. 2594)
                        // Sub-component price must be set to 0.00 to avoid double counting
                        await connection.query("UPDATE bom_items SET price = 0 WHERE id = ?", [item.id]);
                        totalSubcomponentsZeroed++;
                        fixLog.push({
                            bom: b.bom_code,
                            parentCode: parent.product_code,
                            parentName: parent.product_name,
                            parentPrice: Number(parent.price),
                            childCode: item.product_code,
                            childName: item.product_name,
                            oldChildPrice: Number(item.price)
                        });
                        // Update in-memory item price
                        item.price = 0;
                    }
                }
            }

            // Recalculate BOM total cost
            let matCostTotal = 0;
            for (const bi of items) {
                const q = Number(bi.gross_qty || bi.qty || 0);
                const p = Number(bi.price || 0);
                matCostTotal += (q * p);
            }

            const labor = Number(b.labor_cost || 0);
            const overhead = Number(b.overhead_cost || 0);
            const totalCost = matCostTotal + labor + overhead;

            await connection.query("UPDATE boms SET total_cost = ? WHERE id = ?", [totalCost, b.id]);
        }

        console.log(`\n=== AUDIT & DEDUPLICATION RESULTS ===`);
        console.log(`Total sub-component prices set to Rp 0.00 across all BOMs: ${totalSubcomponentsZeroed}`);

        if (fixLog.length > 0) {
            console.log("\nDetailed Fix Log:");
            console.table(fixLog);
        } else {
            console.log("\n✅ ALL BOMS ARE CLEAN: No duplicate parent/child prices found anywhere!");
        }

    } catch (err) {
        console.error("Error during universal BOM price audit:", err);
    } finally {
        await connection.end();
    }
}

auditAndFixAllBomsPriceDeduplication();
