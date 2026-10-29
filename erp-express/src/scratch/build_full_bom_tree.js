const db = require('../config/db');

async function testFullBOMTree() {
    try {
        // Fetch all BOMs
        const [boms] = await db.execute(`
            SELECT id, bom_code, bom_name, finished_good_code, finished_good_name, finished_good_unit, finished_good_qty
            FROM boms
            ORDER BY id ASC
        `);
        console.log("Total BOMs:", boms.length);

        // Fetch all BOM items
        const [items] = await db.execute(`
            SELECT id, bom_id, parent_item_id, item_type, product_code, part_number, product_name, qty, unit, price, operation_seq
            FROM bom_items
            ORDER BY bom_id ASC, id ASC
        `);
        console.log("Total BOM Items:", items.length);

        const treeRows = [];

        // Build hierarchy for each BOM
        for (const bom of boms) {
            const bomItems = items.filter(i => i.bom_id === bom.id);
            if (bomItems.length === 0) continue;

            // Level 0: Top Level FG
            treeRows.push({
                bom_code: bom.bom_code,
                bom_level: 'Level 0 (Top FG)',
                parent_code: '-',
                item_code: bom.finished_good_code,
                item_name: bom.finished_good_name,
                item_type: 'Finished Goods',
                qty_per_parent: Number(bom.finished_good_qty || 1),
                unit: bom.finished_good_unit || 'PCS',
                unit_cost: 0,
                ext_cost: 0,
                operation_seq: '-'
            });

            // Map items by id
            const itemMap = {};
            bomItems.forEach(i => { itemMap[i.id] = i; });

            // Root items (parent_item_id is null or 0 or invalid)
            const rootItems = bomItems.filter(i => !i.parent_item_id || !itemMap[i.parent_item_id]);

            // Helper recursive function to push children
            function pushChildTree(item, level, parentCode) {
                const isParent = bomItems.some(child => child.parent_item_id === item.id);
                const displayType = isParent ? 'WIP / Sub-Assembly' : (item.item_type || 'RAW');
                const unitCost = Number(item.price || 0);
                const qty = Number(item.qty || 0);

                treeRows.push({
                    bom_code: bom.bom_code,
                    bom_level: `Level ${level}`,
                    parent_code: parentCode,
                    item_code: item.product_code,
                    item_name: item.product_name,
                    item_type: displayType,
                    qty_per_parent: qty,
                    unit: item.unit || 'PCS',
                    unit_cost: unitCost,
                    ext_cost: qty * unitCost,
                    operation_seq: item.operation_seq || '-'
                });

                // Find children
                const children = bomItems.filter(child => child.parent_item_id === item.id);
                children.forEach(child => {
                    pushChildTree(child, level + 1, item.product_code);
                });
            }

            rootItems.forEach(root => {
                pushChildTree(root, 1, bom.finished_good_code);
            });
        }

        console.log("\nTotal Expanded BOM Tree Rows:", treeRows.length);
        console.log("Sample 20 Expanded Tree Rows:");
        console.log(JSON.stringify(treeRows.slice(0, 20), null, 2));

        process.exit(0);
    } catch (e) {
        console.error("Error building BOM tree:", e);
        process.exit(1);
    }
}

testFullBOMTree();
