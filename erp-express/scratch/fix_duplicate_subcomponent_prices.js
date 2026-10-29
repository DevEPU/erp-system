const mysql = require('mysql2/promise');

async function fixDuplicateSubcomponentPrices() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        console.log("=== FIXING DUPLICATE SUB-COMPONENT PRICES IN DATABASE ===");

        // Fetch all BOM items
        const [items] = await connection.query("SELECT id, bom_id, parent_item_id, product_code, product_name, price, qty FROM bom_items");

        const itemMap = new Map();
        items.forEach(i => itemMap.set(i.id, i));

        let fixedCount = 0;

        for (const item of items) {
            if (item.parent_item_id) {
                const parent = itemMap.get(item.parent_item_id);
                if (parent && Number(parent.price) > 0 && Number(item.price) > 0) {
                    // Parent already carries the sub-assembly cost (e.g. STAY ASKI RH = 2594)
                    // Sub-component (e.g. CAPLOCK NUT = 2594) should be set to 0.00 to avoid double counting
                    console.log(`[FIX PRICE DUPLICATION] Item ID: ${item.id} | Product: ${item.product_code} ("${item.product_name}") under Parent: ${parent.product_code} ("${parent.product_name}") | Child Price: Rp ${Number(item.price).toLocaleString('id-ID')} -> Rp 0.00`);

                    await connection.query("UPDATE bom_items SET price = 0 WHERE id = ?", [item.id]);
                    fixedCount++;
                }
            }
        }

        console.log(`\nTotal duplicate sub-component price rows fixed: ${fixedCount}`);

        // Recalculate BOM total_cost for all 66 BOMs
        console.log("\n=== RECALCULATING BOM TOTAL HPP COSTS ===");
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
            console.log(`[BOM HPP COST RECALCULATED] BOM: ${b.bom_code} ("${b.finished_good_name}") | Mat Cost: Rp ${matCostTotal.toLocaleString('id-ID')} | Total HPP: Rp ${totalCost.toLocaleString('id-ID')}`);
        }

        console.log("\n=== DUPLICATE SUB-COMPONENT PRICE FIX COMPLETED ===");

    } catch (err) {
        console.error("Error fixing duplicate sub-component prices:", err);
    } finally {
        await connection.end();
    }
}

fixDuplicateSubcomponentPrices();
